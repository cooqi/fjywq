'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const answerCol = db.collection('answer_book');
const favCol = db.collection('answer_book_fav');

// 启用状态查询条件：兼容 init_data 导入时 is_active 字段缺失的记录（未显式 false 即视为启用）
const ACTIVE_FILTER = { is_active: dbCmd.neq(false) };

// 服务端敏感词校验（与前端 common/js/sensitive-words.js 保持同步，作为兜底防线）
const SENSITIVE_WORDS = [
	'傻逼', '煞笔', '沙比', '妈的', '去死', '滚蛋', '王八蛋', '混蛋', '畜生', '贱人', '婊子',
	'嫖娼', '卖淫', '赌博', '毒品', '吸毒', '枪支', '弹药', '炸药', '恐怖袭击', '暴力',
	'强奸', '轮奸', '猥亵', '色情', '裸聊', '约炮', '一夜情',
	'传销', '诈骗', '洗钱', '受贿', '贪污', '偷税', '漏税',
	'法轮功', '邪教', '反政府', '政变', '暴乱', '动乱',
	'黑客攻击', '木马病毒', '钓鱼网站', '侵犯隐私', '人肉搜索',
	'自杀', '自残', '割腕', '轻生', '纵火', '投毒','青润','宇豹','豹宇'
];

const DEFAULT_QUESTION = '我该如何面对当下';
const MAX_QUESTION_LEN = 50;

exports.main = async (event, context) => {
	const { action } = event;

	try {
		switch (action) {
			case 'draw':
				return await draw(event);
			case 'addFav':
				return await addFav(event);
			case 'removeFav':
				return await removeFav(event);
			case 'getFavList':
				return await getFavList(event);
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (error) {
		console.error('answer-book 错误:', error);
		return { code: -1, msg: error.message || '服务器错误' };
	}
};

// 翻页抽取：敏感词校验 -> 全量拉取启用答案 -> 加权随机
async function draw(event) {
	const rawQuestion = (event.question || '').trim();
	const question = rawQuestion === '' ? DEFAULT_QUESTION : rawQuestion;

	if (question.length > MAX_QUESTION_LEN) {
		return { code: -2, msg: '问题最多' + MAX_QUESTION_LEN + '字' };
	}
	// 服务端兜底敏感词校验（不返回具体命中词，避免提示被利用）
	const normalized = question.replace(/\s+/g, '');
	const hit = SENSITIVE_WORDS.some(word => normalized.indexOf(word) > -1);
	if (hit) {
		return { code: -3, msg: '问题包含不当内容，换个问法吧' };
	}

	// 一次性拉取全部启用答案（避免默认 limit 100 截断）
	const countRes = await answerCol.where(ACTIVE_FILTER).count();
	if (countRes.total === 0) {
		return { code: -1, msg: '答案之书是空的，请确认已在 uniCloud 后台导入 answer_book 表数据' };
	}
	const answerRes = await answerCol
		.where(ACTIVE_FILTER)
		.limit(countRes.total)
		.field({ text: true, interpretation: true, category: true, weight: true })
		.get();
	const answers = answerRes.data;

	// 加权随机：weight 缺省/非法按 1 处理
	const picked = weightedPick(answers);

	return {
		code: 0,
		msg: '抽取成功',
		data: {
			question: question,
			answerId: picked._id,
			answer: picked.text,
			interpretation: picked.interpretation || '',
			category: picked.category || '',
			total: answers.length
		}
	};
}

// 收藏一条答案（存快照，防止答案库变更影响历史收藏）
async function addFav(event) {
	const { userId, answerId } = event;
	if (!userId || !answerId) {
		return { code: -1, msg: '参数不完整' };
	}

	// 去重：同一答案只收藏一次
	const existRes = await favCol.where({ user_id: userId, answer_id: answerId }).count();
	if (existRes.total > 0) {
		return { code: 0, msg: '已收藏过' };
	}

	const answerRes = await answerCol.doc(answerId).get();
	if (!answerRes.data || answerRes.data.length === 0) {
		return { code: -1, msg: '答案不存在' };
	}
	const answer = answerRes.data[0];

	await favCol.add({
		user_id: userId,
		answer_id: answerId,
		question: (event.question || '').slice(0, MAX_QUESTION_LEN),
		answer_text: answer.text,
		category: answer.category || '',
		create_date: Date.now()
	});

	return { code: 0, msg: '收藏成功' };
}

// 取消收藏（校验归属）
async function removeFav(event) {
	const { userId, favId } = event;
	if (!userId || !favId) {
		return { code: -1, msg: '参数不完整' };
	}
	const res = await favCol.where({ _id: favId, user_id: userId }).remove();
	if (res.deleted === 0) {
		return { code: -1, msg: '记录不存在或无权操作' };
	}
	return { code: 0, msg: '已取消收藏' };
}

// 我的收藏列表
async function getFavList(event) {
	const { userId, page, pageSize } = event;
	if (!userId) {
		return { code: -1, msg: '未登录' };
	}
	const p = page || 1;
	const ps = pageSize || 20;

	const countRes = await favCol.where({ user_id: userId }).count();
	const listRes = await favCol
		.where({ user_id: userId })
		.orderBy('create_date', 'desc')
		.skip((p - 1) * ps)
		.limit(ps)
		.get();

	return {
		code: 0,
		data: {
			list: listRes.data,
			total: countRes.total,
			page: p,
			pageSize: ps
		}
	};
}

// 工具：加权随机选取
function weightedPick(items) {
	let totalWeight = 0;
	items.forEach(item => {
		const w = parseInt(item.weight, 10);
		totalWeight += isNaN(w) || w < 1 ? 1 : w;
	});
	let roll = Math.random() * totalWeight;
	for (let i = 0; i < items.length; i++) {
		const w = parseInt(items[i].weight, 10);
		roll -= isNaN(w) || w < 1 ? 1 : w;
		if (roll < 0) {
			return items[i];
		}
	}
	return items[items.length - 1];
}
