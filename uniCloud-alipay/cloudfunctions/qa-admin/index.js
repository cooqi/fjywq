'use strict';

const db = uniCloud.database();
const questionsCol = db.collection('qa_questions');

exports.main = async (event, context) => {
	const { action, userId, userRole } = event;

	// 校验管理员权限
	if (!userId || !userRole || !['s_admin', 'admin'].includes(userRole)) {
		return { code: -1, msg: '无管理员权限' };
	}

	try {
		switch (action) {
			case 'getList':
				return await getList(event);
			case 'add':
				return await add(event);
			case 'edit':
				return await edit(event);
			case 'toggleStatus':
				return await toggleStatus(event);
			case 'delete':
				return await deleteQuestion(event);
			case 'getCategories':
				return await getCategories();
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (error) {
		console.error('qa-admin 错误:', error);
		return { code: -1, msg: error.message || '服务器错误' };
	}
};

// 分页查询题目列表
async function getList(event) {
	const { page = 1, pageSize = 20, type, category, difficulty, status, keyword } = event;
	const where = {};

	if (type) where.type = type;
	if (category) where.category = category;
	if (difficulty) where.difficulty = parseInt(difficulty);
	if (status !== undefined && status !== '' && status !== null) where.status = parseInt(status);
	if (keyword) {
		where.question = new RegExp(keyword, 'i');
	}

	const skip = (page - 1) * pageSize;

	const countRes = await questionsCol.where(where).count();
	const listRes = await questionsCol
		.where(where)
		.orderBy('create_date', 'desc')
		.skip(skip)
		.limit(pageSize)
		.get();

	return {
		code: 0,
		data: {
			list: listRes.data,
			total: countRes.total,
			page: page,
			pageSize: pageSize
		}
	};
}

// 新增题目
async function add(event) {
	const { question, type, category, difficulty, options, answer, analysis, status } = event;

	// 校验
	const validateResult = validateQuestion({ question, type, category, difficulty, options, answer, status });
	if (validateResult) {
		return { code: -1, msg: validateResult };
	}

	const data = {
		question: question.trim(),
		type,
		category: category.trim(),
		difficulty: parseInt(difficulty) || 1,
		options: formatOptions(options),
		answer: answer,
		analysis: (analysis || '').trim(),
		status: status !== undefined ? parseInt(status) : 0,
		create_date: Date.now()
	};

	const result = await questionsCol.add(data);
	return {
		code: 0,
		msg: '添加成功',
		data: { id: result.id }
	};
}

// 编辑题目
async function edit(event) {
	const { id, question, type, category, difficulty, options, answer, analysis, status } = event;

	if (!id) {
		return { code: -1, msg: '缺少题目ID' };
	}

	const validateResult = validateQuestion({ question, type, category, difficulty, options, answer, status });
	if (validateResult) {
		return { code: -1, msg: validateResult };
	}

	const updateData = {
		question: question.trim(),
		type,
		category: category.trim(),
		difficulty: parseInt(difficulty) || 1,
		options: formatOptions(options),
		answer: answer,
		analysis: (analysis || '').trim()
	};
	if (status !== undefined) {
		updateData.status = parseInt(status);
	}

	await questionsCol.doc(id).update(updateData);
	return { code: 0, msg: '修改成功' };
}

// 上架/下架
async function toggleStatus(event) {
	const { id, status } = event;
	if (!id) {
		return { code: -1, msg: '缺少题目ID' };
	}
	await questionsCol.doc(id).update({ status: parseInt(status) });
	return { code: 0, msg: status === 1 ? '已启用' : '已下架' };
}

// 删除题目
async function deleteQuestion(event) {
	const { id } = event;
	if (!id) {
		return { code: -1, msg: '缺少题目ID' };
	}
	await questionsCol.doc(id).remove();
	return { code: 0, msg: '删除成功' };
}

// 获取所有分类
async function getCategories() {
	const res = await questionsCol
		.field({ category: true })
		.get();

	const categorySet = new Set();
	res.data.forEach(item => {
		if (item.category) categorySet.add(item.category);
	});

	return {
		code: 0,
		data: Array.from(categorySet)
	};
}

// 题目校验
function validateQuestion(data) {
	const { question, type, options, answer, status } = data;

	if (!question || !question.trim()) {
		return '题干不能为空';
	}

	if (!['single', 'multiple', 'judge'].includes(type)) {
		return '题型不合法';
	}

	if (!options || !Array.isArray(options) || options.length < 2) {
		return '选项至少需要 2 个';
	}

	// 检查选项 key 唯一
	const keys = options.map(o => o.key);
	if (new Set(keys).size !== keys.length) {
		return '选项 key 重复';
	}

	if (!answer || !Array.isArray(answer) || answer.length === 0) {
		return '正确答案不能为空';
	}

	// 检查正确答案是选项 key 的子集
	const validKeys = new Set(keys);
	for (const a of answer) {
		if (!validKeys.has(a)) {
			return '正确答案包含无效选项: ' + a;
		}
	}

	// 单选题只能有一个答案
	if (type === 'single' && answer.length !== 1) {
		return '单选题只能有一个正确答案';
	}

	// 判断题固定两个选项
	if (type === 'judge') {
		if (options.length !== 2) {
			return '判断题必须固定两个选项';
		}
	}

	// 启用状态必须完整
	if (status === 1) {
		if (!data.category || !data.category.trim()) {
			return '启用题目必须填写分类';
		}
		if (!data.difficulty || data.difficulty < 1 || data.difficulty > 5) {
			return '启用题目必须设置难度(1~5)';
		}
	}

	return null;
}

// 格式化选项：自动按 A/B/C/D 排序
function formatOptions(options) {
	const keyOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
	return options
		.map((opt, idx) => ({
			key: keyOrder[idx] || String.fromCharCode(65 + idx),
			value: (opt.value || '').trim()
		}))
		.sort((a, b) => a.key.localeCompare(b.key));
}
