'use strict';
/**
 * 谁是卧底 wodi 云函数（uniCloud-alipay）
 * 设计参照 exchange：单函数 + action 路由，统一返回 { code, msg, data }，code=0 成功。
 * 无需登录、无需记录用户；游戏码=房间 code（6 位数字）；牌面创建时一次性生成存 cards，领牌只按加入顺序发对应座位的牌。
 * 并发安全：本环境不用 runTransaction，改用「条件原子更新」做 CAS
 *   —— where({_id, joinedCount: c}).update({joinedCount: c+1})，命中 1 条才算领到，未命中则重读重试。
 * 管理员（userRole = s_admin / admin）维护题库 wodi_questions。
 */
const db = uniCloud.database();
const dbCmd = db.command;

const QUESTIONS = 'wodi_questions';
const ROOMS = 'wodi_rooms';

const ST_WAITING = 'waiting';   // 等待加入
const ST_PLAYING = 'playing';   // 人已满，游戏进行中
const ST_ENDED = 'ended';       // 已结束（预留）

const EXPIRE_MS = 2 * 60 * 60 * 1000; // 房间 2 小时过期
const CODE_RETRY = 10;
const CAS_RETRY = 6;

function now() { return Date.now(); }

// 生成 6 位数字游戏码
function genCode() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

exports.main = async (event, context) => {
	const { action } = event;
	try {
		switch (action) {
			case 'createRoom':
				return await createRoom(event);
			case 'joinRoom':
				return await joinRoom(event);
			case 'getRoom':
				return await getRoom(event);
			// ===== 题库管理（管理员） =====
			case 'listQuestions':
			case 'addQuestion':
			case 'updateQuestion':
			case 'deleteQuestion':
				return await adminRouter(action, event);
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (err) {
		console.error('wodi 错误:', err);
		return { code: -1, msg: err.message || '服务器错误' };
	}
};

/* ================= 创建房间 ================= */
async function createRoom(event) {
	const totalPlayers = parseInt(event.totalPlayers);
	const spyCount = parseInt(event.spyCount);

	if (!Number.isInteger(totalPlayers) || totalPlayers < 4 || totalPlayers > 12) {
		return { code: -1, msg: '游戏人数需在 4-12 之间' };
	}
	if (!Number.isInteger(spyCount) || spyCount < 1) {
		return { code: -1, msg: '卧底人数至少 1 人' };
	}
	if (spyCount >= totalPlayers - spyCount) {
		return { code: -1, msg: '卧底人数必须少于好人人数' };
	}

	// 随机抽一套词（优先 useCount 较少的题库，简单做法：随机 skip）
	const qWhere = { enabled: true };
	const countRes = await db.collection(QUESTIONS).where(qWhere).count();
	if (countRes.total === 0) {
		return { code: -1, msg: '题库为空，请联系管理员添加' };
	}
	const skip = Math.floor(Math.random() * countRes.total);
	const qRes = await db.collection(QUESTIONS).where(qWhere).skip(skip).limit(1).get();
	const question = qRes.data && qRes.data[0];
	if (!question) return { code: -1, msg: '题库为空，请联系管理员添加' };

	// 随机指定哪些座位是卧底，生成完整牌面（创建时一次定死，之后不改）
	const spySeats = new Set();
	while (spySeats.size < spyCount) {
		spySeats.add(Math.floor(Math.random() * totalPlayers));
	}
	const cards = [];
	for (let i = 0; i < totalPlayers; i++) {
		const isSpy = spySeats.has(i);
		cards.push({
			seat: i + 1,
			word: isSpy ? question.spy_word : question.civilian_word,
			isSpy
		});
	}

	// 生成唯一游戏码（重试）
	let code = '';
	for (let i = 0; i < CODE_RETRY; i++) {
		const c = genCode();
		const exist = await db.collection(ROOMS).where({ code: c }).count();
		if (exist.total === 0) { code = c; break; }
	}
	if (!code) return { code: -1, msg: '生成游戏码失败，请重试' };

	const t = now();
	await db.collection(ROOMS).add({
		code,
		question_id: question._id,
		civilian_word: question.civilian_word,
		spy_word: question.spy_word,
		total_players: totalPlayers,
		spy_count: spyCount,
		cards,               // [{seat, word, isSpy}]，创建时一次生成
		joined_count: 1,     // 创建者自动占 1 号座位
		status: ST_WAITING,
		create_date: t,
		update_date: t,
		expire_at: t + EXPIRE_MS
	});

	// 题库使用次数 +1（异步失败不影响主流程）
	try {
		await db.collection(QUESTIONS).doc(question._id).update({ use_count: dbCmd.inc(1) });
	} catch (e) {}

	// 返回创建者的牌（座位固定 1）
	return {
		code: 0,
		msg: 'ok',
		data: {
			gameCode: code,
			seat: 1,
			word: cards[0].word,
			joinedCount: 1,
			totalPlayers,
			spyCount
		}
	};
}

/* ================= 加入房间（CAS 原子领牌） ================= */
async function joinRoom(event) {
	const gameCode = String(event.gameCode || '').trim();
	if (!gameCode) return { code: -1, msg: '缺少游戏码' };

	for (let attempt = 0; attempt < CAS_RETRY; attempt++) {
		const res = await db.collection(ROOMS).where({ code: gameCode }).limit(1).get();
		const room = res.data && res.data[0];
		if (!room) return { code: -1, msg: '房间不存在' };

		// 状态与过期校验
		if (room.status !== ST_WAITING) {
			// 已开始：允许已在房间者查看，但新加入者拒绝
			return { code: -1, msg: room.status === ST_ENDED ? '房间已结束' : '房间人数已满，游戏已开始' };
		}
		if (room.expire_at && room.expire_at < now()) {
			return { code: -1, msg: '房间已过期' };
		}

		const c = room.joined_count || 0;
		if (c >= room.total_players) {
			return { code: -1, msg: '房间人数已满' };
		}

		const newCount = c + 1;
		const newStatus = newCount >= room.total_players ? ST_PLAYING : ST_WAITING;

		// CAS：仅当 joined_count 仍为 c 时才 +1，命中 1 条即领到 newCount 号牌
		const upd = await db.collection(ROOMS)
			.where({ _id: room._id, joined_count: c })
			.update({ joined_count: newCount, status: newStatus, update_date: now() });

		if (upd && upd.updated === 1) {
			const card = (room.cards && room.cards[newCount - 1]) || {};
			return {
				code: 0,
				msg: 'ok',
				data: {
					gameCode,
					seat: newCount,
					word: card.word || '',        // 只下发词，不下发 isSpy
					joinedCount: newCount,
					totalPlayers: room.total_players
				}
			};
		}
		// 未命中说明有人抢先加入，重读重试
	}
	return { code: -1, msg: '加入拥挤，请重试' };
}

/* ================= 查询房间（公开信息，不含词） ================= */
async function getRoom(event) {
	const gameCode = String(event.gameCode || '').trim();
	if (!gameCode) return { code: -1, msg: '缺少游戏码' };
	const res = await db.collection(ROOMS).where({ code: gameCode }).limit(1).get();
	const room = res.data && res.data[0];
	if (!room) return { code: -1, msg: '房间不存在' };
	return {
		code: 0,
		msg: 'ok',
		data: {
			gameCode: room.code,
			totalPlayers: room.total_players,
			joinedCount: room.joined_count,
			spyCount: room.spy_count,
			status: room.status,
			expireAt: room.expire_at
		}
	};
}

/* ================= 题库管理（管理员） ================= */
async function adminRouter(action, event) {
	const { userId, userRole } = event;
	if (!userId || !userRole || !['s_admin', 'admin'].includes(userRole)) {
		return { code: -1, msg: '无管理员权限' };
	}
	switch (action) {
		case 'listQuestions':   return await listQuestions(event);
		case 'addQuestion':     return await addQuestion(event);
		case 'updateQuestion':  return await updateQuestion(event);
		case 'deleteQuestion':  return await deleteQuestion(event);
	}
}

async function listQuestions(event) {
	const keyword = String(event.keyword || '').trim();
	let where = {};
	if (keyword) {
		where = dbCmd.or([
			{ civilian_word: new RegExp(keyword, 'i') },
			{ spy_word: new RegExp(keyword, 'i') }
		]);
	}
	const res = await db.collection(QUESTIONS)
		.where(where)
		.orderBy('create_date', 'desc')
		.limit(200)
		.get();
	return { code: 0, msg: 'ok', data: { list: res.data || [] } };
}

async function addQuestion(event) {
	const civilianWord = String(event.civilianWord || '').trim();
	const spyWord = String(event.spyWord || '').trim();
	const category = String(event.category || '').trim();
	const enabled = event.enabled !== false;
	if (!civilianWord || !spyWord) return { code: -1, msg: '两个词都不能为空' };
	if (civilianWord === spyWord) return { code: -1, msg: '两个词不能相同' };
	const t = now();
	const res = await db.collection(QUESTIONS).add({
		civilian_word: civilianWord,
		spy_word: spyWord,
		category,
		enabled,
		use_count: 0,
		create_date: t
	});
	return { code: 0, msg: '已添加', data: { _id: res.id } };
}

async function updateQuestion(event) {
	const id = event.id;
	if (!id) return { code: -1, msg: '缺少 ID' };
	const data = {};
	if (event.civilianWord !== undefined) data.civilian_word = String(event.civilianWord).trim();
	if (event.spyWord !== undefined) data.spy_word = String(event.spyWord).trim();
	if (event.category !== undefined) data.category = String(event.category).trim();
	if (event.enabled !== undefined) data.enabled = !!event.enabled;
	if (data.civilian_word && data.spy_word && data.civilian_word === data.spy_word) {
		return { code: -1, msg: '两个词不能相同' };
	}
	await db.collection(QUESTIONS).doc(id).update(data);
	return { code: 0, msg: '已修改' };
}

async function deleteQuestion(event) {
	const id = event.id;
	if (!id) return { code: -1, msg: '缺少 ID' };
	await db.collection(QUESTIONS).doc(id).remove();
	return { code: 0, msg: '已删除' };
}
