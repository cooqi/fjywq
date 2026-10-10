'use strict';
/**
 * 选座云函数（需登录后选座）
 * action:
 *   - getSeatMap  : 读取座位图（分区含已选统计 + 已占座位含备注 + 我的座位，管理员额外返回 isAdmin 与占座人昵称）
 *   - submit      : 提交选座（应用层先查后写 + 失败回滚，每座位独立备注，整批备注字段仅作旧版兼容）
 *   - releaseMine : 释放自己的已选座位（选座保存后可修改）
 *   - releaseAny  : 管理员释放任意人的座位（服务端二次校验管理员身份）
 *   - updateRemark: 修改已选座位的备注（本人可改自己的，管理员可改任意人的，服务端二次校验）
 * 说明：uniCloud-支付宝云不支持数据库事务，故采用「提交前重新查询已占集合 → 逐条写入 →
 * 任一条失败则删除本次已写入记录」的方式实现整批原子效果。
 */
const db = uniCloud.database();
const dbCmd = db.command;

const AREA_COLLECTION = 'seat_area';
const SELECT_COLLECTION = 'seat_selection';
// 同一用户 1 分钟内的提交次数上限（简易限流）
const RATE_LIMIT_PER_MINUTE = 10;

// 服务端二次校验管理员权限（不信任前端传入的 role）
async function isAdminUser(userId) {
	if (!userId) return false;
	try {
		const res = await db.collection('user-info').doc(userId).get();
		const user = res.data && res.data[0];
		if (!user) return false;
		return ['s_admin', 'admin'].includes(user.role);
	} catch (err) {
		console.error('管理员校验失败:', err);
		return false;
	}
}

function seatKey(areaId, row, col) {
	return `${areaId}-${row}-${col}`;
}

function rowLabel(area, row) {
	if (Number(area && area.rowLabelType) === 2) {
		let n = row - 1;
		let label = '';
		do {
			label = String.fromCharCode(65 + (n % 26)) + label;
			n = Math.floor(n / 26) - 1;
		} while (n >= 0);
		return label;
	}
	return String(row);
}

// 排号/列号：优先取分区自定义编号数组，为空时回退到默认序号
function rowLabelOf(area, row) {
	const arr = (area && area.rowLabels) || [];
	const text = arr[row - 1] == null ? '' : String(arr[row - 1]).trim();
	if (text) return text;
	
	return rowLabel(area, row);
}

function colLabelOf(area, col) {
	const arr = (area && area.colLabels) || [];
	const text = arr[col - 1] == null ? '' : String(arr[col - 1]).trim();
	if (text) return text;
	
	return String(col);
}

function buildSeatLabel(area, row, col) {
	const r = rowLabelOf(area, row);
	const c = colLabelOf(area, col);
	const rText = /[排座]$/.test(r) ? r : `${r}排`;
	const cText = /[号座]$/.test(c) ? c : `${c}号`;
	
	return `${(area && area.name) || ''}${rText}${cText}`;
}

// 由分区包围盒计算画布尺寸（单位：格），与 concert-admin 保持一致
function computeCanvas(areas) {
	let canvasW = 0;
	let canvasH = 0;
	(areas || []).forEach(area => {
		const w = area.isStage ? (Number(area.stageW) || 0) : (Number(area.cols) || 0);
		const h = area.isStage ? (Number(area.stageH) || 0) : (Number(area.rows) || 0);
		canvasW = Math.max(canvasW, (Number(area.gridX) || 0) + w);
		canvasH = Math.max(canvasH, (Number(area.gridY) || 0) + h);
	});
	
	return { canvasW: Math.ceil(canvasW), canvasH: Math.ceil(canvasH) };
}

// 分页取全量（云函数传统 API 的 get() 有默认条数限制）
async function getAllByPage(where, field, pageSize = 500, maxRounds = 40) {
	const out = [];
	let page = 0;
	
	while (page < maxRounds) {
		let query = db.collection(SELECT_COLLECTION).where(where);
		if (field) query = query.field(field);
		const res = await query.skip(page * pageSize).limit(pageSize).get();
		const list = res.data || [];
		out.push(...list);
		if (list.length < pageSize) break;
		page++;
	}
	
	return out;
}

exports.main = async (event, context) => {
	const { action } = event;
	
	switch (action) {
		case 'getSeatMap':
			return await getSeatMap(event);
		case 'submit':
			return await submit(event);
		case 'releaseMine':
			return await releaseMine(event);
		case 'releaseAny':
			return await releaseAny(event);
		case 'updateRemark':
			return await updateRemark(event);
		default:
			return { code: -1, message: '未知的操作类型' };
	}
};

// 读取座位图
async function getSeatMap(event) {
	try {
		const { concertId, userId = '' } = event;
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		const concertRes = await db.collection('Concert').doc(concertId).get();
		const concert = concertRes.data && concertRes.data[0];
		if (!concert) {
			return { code: -1, message: '演唱会不存在' };
		}
		
		if (!concert.seat_enabled) {
			return { code: 0, message: '座位表暂未开放', data: { seatEnabled: false, areas: [], taken: [], mySeats: [] } };
		}
		
		const areasRes = await db.collection(AREA_COLLECTION).where({ concertId }).get();
		const areas = (areasRes.data || []).map(item => {
			const isStage = !!item.isStage;
			const rows = Number(item.rows) || 0;
			const cols = Number(item.cols) || 0;
			
			return {
				_id: item._id,
				name: item.name,
				rows: isStage ? 0 : rows,
				cols: isStage ? 0 : cols,
				rowLabelType: Number(item.rowLabelType) || 1,
				price: Number(item.price) || 0,
				color: item.color || '#4A90D9',
				sort: Number(item.sort) || 0,
				gridX: Number(item.gridX) || 0,
				gridY: Number(item.gridY) || 0,
				isStage,
				stageW: Number(item.stageW) || (isStage ? cols : 0),
				stageH: Number(item.stageH) || (isStage ? rows : 0),
				rowLabels: Array.isArray(item.rowLabels) ? item.rowLabels : [],
				colLabels: Array.isArray(item.colLabels) ? item.colLabels : []
			};
		});
		areas.sort((a, b) => a.sort - b.sort);
		
		const canvas = computeCanvas(areas);
		const capacity = areas.reduce((sum, item) => sum + item.rows * item.cols, 0);
		
		const isAdmin = await isAdminUser(userId);
		const selections = await getAllByPage({ concertId }, { areaId: true, row: true, col: true, userId: true, remark: true, nickname: true });
		
		// 分区/全场已选统计（含所有人），备注为自愿公开内容，他人座位仅返回备注不返回昵称头像
		const selectedByArea = {};
		selections.forEach(item => {
			selectedByArea[item.areaId] = (selectedByArea[item.areaId] || 0) + 1;
		});
		
		// 他人占座默认只返回坐标与备注，避免泄露个人信息；管理员额外返回昵称用于代为释放
		const taken = selections
			.filter(item => item.userId !== userId)
			.map(item => {
				const seat = { areaId: item.areaId, row: item.row, col: item.col, remark: item.remark || '' };
				if (isAdmin) {
					seat.nickname = item.nickname || '';
					seat.ownerId = item.userId || '';
				}
				
				return seat;
			});
		const mySeats = selections
			.filter(item => item.userId === userId)
			.map(item => ({ areaId: item.areaId, row: item.row, col: item.col, seatLabel: item.seatLabel || '', remark: item.remark || '' }));
		
		return {
			code: 0,
			message: '获取成功',
			data: {
				seatEnabled: true,
				concert: {
					_id: concert._id,
					type: concert.type || '',
					title: concert.ychTheme || concert.Session || concert.time || '未命名场次',
					venue: concert.yhcTheme || '',
					session: concert.Session || '',
					time: concert.time || '',
					address: concert.address || ''
				},
				maxSeatsPerUser: Number(concert.max_seats_per_user) || 0,
				seatVersion: Number(concert.seat_version) || 1,
				// 管理员配置的座位状态配色；空对象表示前端用内置默认
				seatColors: concert.seat_colors || {},
				totalSelected: selections.length,
				totalCapacity: capacity,
				canvasW: canvas.canvasW,
				canvasH: canvas.canvasH,
				areas: areas.map(item => Object.assign({}, item, { selected: selectedByArea[item._id] || 0 })),
				taken,
				mySeats,
				isAdmin
			}
		};
	} catch (err) {
		console.error('获取座位图失败:', err);
		return { code: -1, message: '获取座位图失败：' + err.message };
	}
}

// 提交选座
async function submit(event) {
	const insertedIds = [];
	
	// 任一步失败都回滚本次已写入的座位，保证整批原子
	const rollback = async () => {
		for (const id of insertedIds) {
			try {
				await db.collection(SELECT_COLLECTION).doc(id).remove();
			} catch (err) {
				console.error('回滚座位失败:', id, err);
			}
		}
		insertedIds.length = 0;
	};
	
	try {
		const { concertId, seats = [], seatVersion, userId, remark = '' } = event;
		
		if (!userId) {
			return { code: 401, message: '请先登录后再选座' };
		}
		
		// 整批备注仅作旧版客户端兼容回退；新版逐座位携带 seats[i].remark
		const fallbackRemark = String(remark || '').trim().slice(0, 100);
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		if (!Array.isArray(seats) || seats.length === 0) {
			return { code: -1, message: '请先选择座位' };
		}
		if (seats.length > 100) {
			return { code: -1, message: '一次最多提交 100 个座位' };
		}
		
		const concertRes = await db.collection('Concert').doc(concertId).get();
		const concert = concertRes.data && concertRes.data[0];
		if (!concert) {
			return { code: -1, message: '演唱会不存在' };
		}
		if (!concert.seat_enabled) {
			return { code: -1, message: '座位表暂未开放' };
		}
		
		const currentVersion = Number(concert.seat_version) || 1;
		if (seatVersion && Number(seatVersion) !== currentVersion) {
			return {
				code: 409,
				message: '座位表已更新，请刷新后重新选择',
				data: { reason: 'SEAT_MAP_CHANGED', seatVersion: currentVersion }
			};
		}
		
		// 限流：同一用户 1 分钟内提交次数超限直接拒绝
		const since = Date.now() - 60 * 1000;
		const recent = await db.collection(SELECT_COLLECTION)
			.where({ concertId, userId, createTime: db.command.gte(since) })
			.count();
		if ((recent.total || 0) >= RATE_LIMIT_PER_MINUTE) {
			return { code: 429, message: '操作过于频繁，请稍后再试' };
		}
		
		const areasRes = await db.collection(AREA_COLLECTION).where({ concertId }).get();
		const areaMap = {};
		(areasRes.data || []).forEach(item => {
			areaMap[item._id] = {
				_id: item._id,
				name: item.name,
				rows: Number(item.rows) || 0,
				cols: Number(item.cols) || 0,
				rowLabelType: Number(item.rowLabelType) || 1,
				price: Number(item.price) || 0,
				isStage: !!item.isStage,
				rowLabels: Array.isArray(item.rowLabels) ? item.rowLabels : [],
				colLabels: Array.isArray(item.colLabels) ? item.colLabels : []
			};
		});
		if (Object.keys(areaMap).length === 0) {
			return { code: -1, message: '座位表未配置，请联系管理员' };
		}
		
		// 归一化并校验坐标边界、去重
		const seen = {};
		const wanted = [];
		for (const item of seats) {
			const area = areaMap[item.areaId];
			const row = parseInt(item.row);
			const col = parseInt(item.col);
			
			if (!area) {
				return { code: -1, message: '分区不存在或座位表已变更，请刷新后重选' };
			}
			if (area.isStage) {
				return { code: -1, message: '舞台/装饰区不可选座' };
			}
			if (!(row >= 1 && row <= area.rows) || !(col >= 1 && col <= area.cols)) {
				return { code: -1, message: `座位坐标超出「${area.name}」范围（${area.rows}排 ${area.cols}列）` };
			}
			
			const key = seatKey(area._id, row, col);
			if (seen[key]) continue;
			seen[key] = true;
			// 每个座位独立备注（选填，最长 100 字）；旧版客户端不带 item.remark 时回退整批备注
			const seatRemark = (item.remark == null ? fallbackRemark : String(item.remark).trim()).slice(0, 100);
			wanted.push({ areaId: area._id, row, col, area, remark: seatRemark });
		}
		
		// 幂等：属于自己的座位视为已选成功，不重复写入
		const mineRes = await getAllByPage({ concertId, userId }, { areaId: true, row: true, col: true, seatLabel: true, remark: true });
		const mineSet = {};
		const mineMap = {};
		mineRes.forEach(item => {
			const key = seatKey(item.areaId, item.row, item.col);
			mineSet[key] = true;
			mineMap[key] = item;
		});
		const alreadyMine = wanted.filter(item => !!mineSet[seatKey(item.areaId, item.row, item.col)]);
		const fresh = wanted.filter(item => !mineSet[seatKey(item.areaId, item.row, item.col)]);
		
		const maxPerUser = Number(concert.max_seats_per_user) || 0;
		if (maxPerUser > 0 && mineRes.length + fresh.length > maxPerUser) {
			return {
				code: -1,
				message: `最多可选 ${maxPerUser} 个座位，您已选 ${mineRes.length} 个`,
				data: { reason: 'OVER_LIMIT', max: maxPerUser, owned: mineRes.length }
			};
		}
		
		let successSeats = alreadyMine.map(item => {
			const rec = mineMap[seatKey(item.areaId, item.row, item.col)] || {};
			return {
				areaId: item.areaId,
				row: item.row,
				col: item.col,
				seatLabel: rec.seatLabel || buildSeatLabel(item.area, item.row, item.col),
				remark: rec.remark || '',
				price: item.area.price
			};
		});
		
		if (fresh.length > 0) {
			// 先查：提交前重新拉取已占集合，尽量缩小并发窗口
			const takenRes = await getAllByPage({ concertId }, { areaId: true, row: true, col: true });
			const takenSet = {};
			takenRes.forEach(item => { takenSet[seatKey(item.areaId, item.row, item.col)] = true; });
			
			const conflicts = fresh.filter(item => !!takenSet[seatKey(item.areaId, item.row, item.col)]);
			if (conflicts.length > 0) {
				return {
					code: 409,
					message: '部分座位已被他人选择，本次未提交',
					data: {
						reason: 'SEAT_TAKEN',
						failed: conflicts.map(item => ({
							areaId: item.areaId,
							row: item.row,
							col: item.col,
							seatLabel: buildSeatLabel(item.area, item.row, item.col),
							reason: 'TAKEN'
						}))
					}
				};
			}
			
			// 后写：逐条写入，失败即整批回滚
			const userRes = await db.collection('user-info').doc(userId).get();
			const user = (userRes.data && userRes.data[0]) || {};
			const nickname = user.nickName || '';
			const avatar = user.avatarUrl || '';
			const now = Date.now();
			
			for (const item of fresh) {
				const seatLabel = buildSeatLabel(item.area, item.row, item.col);
				const addRes = await db.collection(SELECT_COLLECTION).add({
					concertId,
					areaId: item.areaId,
					row: item.row,
					col: item.col,
					seatLabel,
					remark: item.remark,
					userId,
					nickname,
					avatar,
					source: 1,
					createTime: now
				});
				insertedIds.push(addRes.id);
				successSeats.push({
					areaId: item.areaId,
					row: item.row,
					col: item.col,
					seatLabel,
					remark: item.remark,
					price: item.area.price
				});
			}
		}
		
		if (successSeats.length === 0) {
			return { code: -1, message: '请先选择座位' };
		}
		
		const totalAmount = successSeats.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
		
		return {
			code: 0,
			message: '选座成功',
			data: {
				successSeats,
				addedCount: fresh.length,
				totalAmount: Number(totalAmount.toFixed(2)),
				seatVersion: currentVersion,
				seatLabels: successSeats.map(item => item.seatLabel).join(',')
			}
		};
	} catch (err) {
		console.error('选座提交失败:', err);
		await rollback();
		return { code: -1, message: '选座失败，请重试：' + err.message };
	}
}

// 修改已选座位的备注：本人或管理员可操作（不信任前端角色，服务端二次校验）
async function updateRemark(event) {
	try {
		const { concertId, seat = {}, remark = '', userId } = event;
		
		if (!userId) {
			return { code: 401, message: '请先登录后再操作' };
		}
		if (!concertId || !seat.areaId) {
			return { code: -1, message: '参数不完整' };
		}
		const row = parseInt(seat.row);
		const col = parseInt(seat.col);
		if (!(row >= 1) || !(col >= 1)) {
			return { code: -1, message: '座位参数不正确' };
		}
		const remarkText = String(remark || '').trim().slice(0, 100);
		
		const res = await db.collection(SELECT_COLLECTION)
			.where({ concertId, areaId: seat.areaId, row, col })
			.limit(10)
			.get();
		const docs = res.data || [];
		if (docs.length === 0) {
			return { code: -1, message: '该座位还没有选座记录' };
		}
		
		const isAdmin = await isAdminUser(userId);
		let updated = 0;
		for (const doc of docs) {
			// 普通用户只能改自己的；管理员不带 userId 条件即可改任意人
			if (doc.userId !== userId && !isAdmin) continue;
			await db.collection(SELECT_COLLECTION).doc(doc._id).update({ remark: remarkText });
			updated++;
		}
		if (updated === 0) {
			return { code: 403, message: '只能修改自己的座位备注' };
		}
		
		return { code: 0, message: '备注已更新', data: { updated, remark: remarkText } };
	} catch (err) {
		console.error('修改座位备注失败:', err);
		return { code: -1, message: '备注保存失败，请重试：' + err.message };
	}
}

// 释放自己的已选座位（仅限本人，保存后可修改）
async function releaseMine(event) {
	try {
		const { concertId, seats = [], userId } = event;
		
		if (!userId) {
			return { code: 401, message: '请先登录后再操作' };
		}
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		if (!Array.isArray(seats) || seats.length === 0) {
			return { code: -1, message: '缺少要释放的座位' };
		}
		if (seats.length > 100) {
			return { code: -1, message: '一次最多释放 100 个座位' };
		}
		
		let removed = 0;
		const released = [];
		
		for (const item of seats) {
			const row = parseInt(item.row);
			const col = parseInt(item.col);
			if (!item.areaId || !(row >= 1) || !(col >= 1)) continue;
			
			// 限定 userId，只能释放自己的座位
			const res = await db.collection(SELECT_COLLECTION)
				.where({ concertId, userId, areaId: item.areaId, row, col })
				.get();
			
			for (const doc of (res.data || [])) {
				await db.collection(SELECT_COLLECTION).doc(doc._id).remove();
				removed++;
				released.push({ areaId: item.areaId, row, col });
			}
		}
		
		return {
			code: 0,
			message: `已释放 ${removed} 个座位`,
			data: { removed, released }
		};
	} catch (err) {
		console.error('释放座位失败:', err);
		return { code: -1, message: '释放座位失败，请重试：' + err.message };
	}
}

// 管理员释放任意人的座位（服务端校验管理员身份，不限 userId）
async function releaseAny(event) {
	try {
		const { concertId, seats = [], userId } = event;

		if (!userId) {
			return { code: 401, message: '请先登录后再操作' };
		}
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		if (!Array.isArray(seats) || seats.length === 0) {
			return { code: -1, message: '缺少要释放的座位' };
		}
		if (seats.length > 100) {
			return { code: -1, message: '一次最多释放 100 个座位' };
		}

		// 先取分区名称，拼更明确的确认文案
		const areasRes = await db.collection(AREA_COLLECTION).where({ concertId }).get();
		const areaNameMap = {};
		(areasRes.data || []).forEach(item => { areaNameMap[item._id] = item.name; });

		let removed = 0;
		const released = [];

		for (const item of seats) {
			const row = parseInt(item.row);
			const col = parseInt(item.col);
			if (!item.areaId || !(row >= 1) || !(col >= 1)) continue;

			// 不带 userId 条件，因此可以释放本场次内任何人的座位
			const res = await db.collection(SELECT_COLLECTION)
				.where({ concertId, areaId: item.areaId, row, col })
				.limit(50)
				.get();

			for (const doc of (res.data || [])) {
				await db.collection(SELECT_COLLECTION).doc(doc._id).remove();
				removed++;
				released.push({
					areaId: item.areaId,
					row,
					col,
					key: seatKey(item.areaId, row, col),
					seatLabel: doc.seatLabel || buildSeatLabel({ name: areaNameMap[item.areaId] || '' }, row, col),
					nickname: doc.nickname || '',
					ownerId: doc.userId || ''
				});
			}
		}

		return {
			code: 0,
			message: `已释放 ${removed} 个座位`,
			data: { removed, released }
		};
	} catch (err) {
		console.error('管理员释放座位失败:', err);
		return { code: -1, message: '释放座位失败，请重试：' + err.message };
	}
}
