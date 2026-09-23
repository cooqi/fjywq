'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const questionsCol = db.collection('qa_questions');
const recordsCol = db.collection('qa_exam_records');
const learnedCol = db.collection('qa_learned_questions');

exports.main = async (event, context) => {
	const { action, userId } = event;

	if (!userId) {
		return { code: -1, msg: '未登录' };
	}

	try {
		switch (action) {
			case 'startExam':
				return await startExam(userId);
			case 'submitExam':
				return await submitExam(userId, event);
			case 'getRecord':
				return await getRecord(userId, event.recordId);
			case 'getHistory':
				return await getHistory(userId, event.page, event.pageSize);
			case 'getWrongQuestions':
				return await getWrongQuestions(userId);
			case 'markLearned':
				return await markLearned(userId, event.questionId);
			case 'deleteRecord':
                return await deleteRecord(userId, event.recordId);
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (error) {
		console.error('qa-exam 错误:', error);
		return { code: -1, msg: error.message || '服务器错误' };
	}
};

// 开始考试：随机抽 25 题（优先避开近期已考题目）
async function startExam(userId) {
	// 查询所有启用的题目（先获取总数，再一次性拉取，避免默认 limit 100 截断）
	const countRes = await questionsCol.where({ status: 1 }).count();
	const totalAvailable = countRes.total;
	const allQuestions = await questionsCol
		.where({ status: 1 })
		.limit(totalAvailable)
		.get();

	if (allQuestions.data.length === 0) {
		return { code: -1, msg: '题库为空，暂无可用题目' };
	}

	const total = Math.min(25, allQuestions.data.length);

	// 获取该用户最近 3 次考试的题目 ID，用于去重
	const recentRecords = await recordsCol
		.where({ user_id: userId })
		.orderBy('create_date', 'desc')
		.limit(3)
		.field({ questions: true })
		.get();

	const recentQuestionIds = new Set();
	if (recentRecords.data && recentRecords.data.length > 0) {
		recentRecords.data.forEach(record => {
			if (record.questions) {
				record.questions.forEach(q => {
					if (q.questionId) recentQuestionIds.add(q.questionId);
				});
			}
		});
	}

	// 将题目分为"未考过"和"已考过"两组
	const fresh = [];
	const repeated = [];
	allQuestions.data.forEach(q => {
		if (recentQuestionIds.has(q._id)) {
			repeated.push(q);
		} else {
			fresh.push(q);
		}
	});

	// 优先从未考过的题目中抽取，不足时再从已考过的题目中补充
	let selected;
	if (fresh.length >= total) {
		selected = shuffleArray(fresh).slice(0, total);
	} else {
		const needMore = total - fresh.length;
		const shuffledRepeated = shuffleArray(repeated);
		selected = [...fresh, ...shuffledRepeated.slice(0, needMore)];
		selected = shuffleArray(selected); // 再打乱顺序
	}

	// 构造题目快照（不含答案和解析，前端答题时不展示）
	const questionSnapshots = selected.map((q, idx) => ({
		questionId: q._id,
		index: idx + 1,
		question: q.question,
		type: q.type,
		category: q.category,
		difficulty: q.difficulty,
		options: q.options,
		userAnswer: [],     // 用户作答，初始为空
		isCorrect: null     // 是否正确，初始为 null
	}));

	// 创建考试记录
	const record = await recordsCol.add({
		user_id: userId,
		questions: questionSnapshots,
		score: 0,
		correct_count: 0,
		passed: false,
		create_date: Date.now()
	});

	// 返回记录 ID 和题目（不含答案）
	return {
		code: 0,
		msg: '开始考试',
		data: {
			recordId: record.id,
			questions: questionSnapshots,
			totalQuestions: total,
			timeLimit: total * 20 // 总时限（秒）
		}
	};
}

// 提交考试：判分
async function submitExam(userId, event) {
	const { recordId, answers } = event;

	if (!recordId || !answers || !Array.isArray(answers)) {
		return { code: -1, msg: '参数错误' };
	}

	// 获取考试记录
	const recordRes = await recordsCol.doc(recordId).get();
	if (!recordRes.data || recordRes.data.length === 0) {
		return { code: -1, msg: '考试记录不存在' };
	}

	const record = recordRes.data[0];
	if (record.user_id !== userId) {
		return { code: -1, msg: '无权操作此记录' };
	}

	// 获取正确答案用于判分
	const questionIds = record.questions.map(q => q.questionId);
	const answerRes = await questionsCol
		.where({ _id: db.command.in(questionIds) })
		.field({ _id: true, type: true, answer: true, analysis: true })
		.get();

	// 构造答案映射
	const answerMap = {};
	answerRes.data.forEach(q => {
		answerMap[q._id] = {
			type: q.type,
			answer: Array.isArray(q.answer) ? q.answer : [q.answer],
			analysis: q.analysis || ''
		};
	});

	// 判分
	let correctCount = 0;
	const updatedQuestions = record.questions.map(q => {
		const userAnswer = answers[q.index - 1] || [];
		const mapEntry = answerMap[q.questionId] || {};
		const correctAnswer = mapEntry.answer || [];
		const analysis = mapEntry.analysis || '';
		// 优先用快照 type，兜底用数据库 type
		const qType = q.type || mapEntry.type || 'single';

		// 判分
		let isCorrect = false;
		if (qType === 'fill') {
			// 填空题：用户输入文本与任一可接受答案匹配即得分
			const userInput = Array.isArray(userAnswer) ? (userAnswer[0] || '') : (userAnswer || '');
			const trimmed = userInput.trim().toLowerCase();
			isCorrect = trimmed.length > 0 && correctAnswer.some(a => String(a).trim().toLowerCase() === trimmed);
		} else {
			// 选择题：多选必须完全匹配
			isCorrect =
				Array.isArray(userAnswer) &&
				userAnswer.length === correctAnswer.length &&
				userAnswer.slice().sort().join(',') === correctAnswer.slice().sort().join(',');
		}

		if (isCorrect) correctCount++;

		return {
			...q,
			userAnswer: userAnswer,
			isCorrect: isCorrect,
			correctAnswer: correctAnswer,
			analysis: analysis
		};
	});

	const totalQuestions = updatedQuestions.length;
	const score = correctCount * 4; // 每题 4 分
	const passed = score >= 60;

	// 收集本次答错的题目 ID，用于清除对应的"已学会"标记
	const wrongQuestionIds = updatedQuestions
		.filter(q => q.isCorrect === false && q.questionId)
		.map(q => q.questionId);
	if (wrongQuestionIds.length > 0) {
		await learnedCol.where({
			user_id: userId,
			question_id: dbCmd.in(wrongQuestionIds)
		}).remove();
	}

	// 更新考试记录
	await recordsCol.doc(recordId).update({
		questions: updatedQuestions,
		score: score,
		correct_count: correctCount,
		passed: passed
	});

	return {
		code: 0,
		msg: '提交成功',
		data: {
			recordId: recordId,
			score: score,
			correctCount: correctCount,
			totalQuestions: totalQuestions,
			passed: passed
		}
	};
}

// 获取考试记录详情
async function getRecord(userId, recordId) {
	if (!recordId) {
		return { code: -1, msg: '缺少记录ID' };
	}

	const recordRes = await recordsCol.doc(recordId).get();
	if (!recordRes.data || recordRes.data.length === 0) {
		return { code: -1, msg: '记录不存在' };
	}

	const record = recordRes.data[0];
	if (record.user_id !== userId) {
		return { code: -1, msg: '无权查看' };
	}

	return {
		code: 0,
		data: record
	};
}

// 获取考试历史
async function getHistory(userId, page, pageSize) {
	page = page || 1;
    pageSize = pageSize || 10;
    const skip = (page - 1) * pageSize;

    const historyWhere = { user_id: userId, is_deleted: db.command.neq(true) };

    const countRes = await recordsCol
        .where(historyWhere)
        .count();

    const listRes = await recordsCol
        .where(historyWhere)
        .orderBy('create_date', 'desc')
        .skip(skip)
        .limit(pageSize)
        .field({
            _id: true,
            score: true,
            correct_count: true,
            passed: true,
            create_date: true
        })
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

// 获取错题本
async function getWrongQuestions(userId) {
	// 获取用户所有考试记录
	const recordsRes = await recordsCol
        .where({ user_id: userId, is_deleted: dbCmd.neq(true) })
        .orderBy('create_date', 'desc')
        .get();

	if (!recordsRes.data || recordsRes.data.length === 0) {
		return { code: 0, data: [] };
	}

	// 获取该用户所有"已学会"的题目 ID，用于过滤
	const learnedRes = await learnedCol
		.where({ user_id: userId })
		.field({ question_id: true })
		.limit(1000)
		.get();
	const learnedSet = new Set(
		(learnedRes.data || []).map(item => item.question_id).filter(Boolean)
	);

	// 收集所有错题
	const wrongMap = {}; // 以 questionId 为 key，保留最新的
	recordsRes.data.forEach(record => {
		if (!record.questions) return;
		record.questions.forEach(q => {
			if (q.isCorrect === false && q.questionId) {
				// 已学会的题目不再出现在错题本
				if (learnedSet.has(q.questionId)) return;
				if (!wrongMap[q.questionId]) {
					wrongMap[q.questionId] = {
						questionId: q.questionId,
						question: q.question,
						type: q.type,
						category: q.category,
						difficulty: q.difficulty,
						options: q.options,
						correctAnswer: (q.options && q.options.length > 0)
							? (q.correctAnswer || []).map(key => {
								const opt = q.options.find(o => o.key === key);
								return opt ? key + ' ' + opt.value : key;
							})
							: (q.correctAnswer || []),
						userAnswer: (q.userAnswer && q.userAnswer.length > 0)
							? q.userAnswer.map(key => {
								const opt = q.options.find(o => o.key === key);
								return opt ? key + ' ' + opt.value : key;
							})
							: (q.userAnswer || []),
						analysis: q.analysis || '',
						wrongCount: 0,
						lastWrongDate: record.create_date
					};
				}
				wrongMap[q.questionId].wrongCount++;
			}
		});
	});

	const wrongList = Object.values(wrongMap).sort(
        (a, b) => b.lastWrongDate - a.lastWrongDate
    );

	return {
		code: 0,
		data: wrongList
	};
}
// 标记错题为已学会
async function markLearned(userId, questionId) {
	if (!questionId) {
		return { code: -1, msg: '缺少题目ID' };
	}

	// 已存在则不重复插入
	const existRes = await learnedCol
		.where({ user_id: userId, question_id: questionId })
		.count();
	if (existRes.total > 0) {
		return { code: 0, msg: '已标记为学会' };
	}

	await learnedCol.add({
		user_id: userId,
		question_id: questionId,
		learned_date: Date.now()
	});

	return { code: 0, msg: '已标记为学会' };
}

// 删除考试记录（软删除，仅修改状态，不物理删除）
async function deleteRecord(userId, recordId) {
    if (!recordId) {
        return { code: -1, msg: '缺少记录ID' };
    }

    const recordRes = await recordsCol.doc(recordId).get();
    if (!recordRes.data || recordRes.data.length === 0) {
        return { code: -1, msg: '记录不存在' };
    }

    const record = recordRes.data[0];
    if (record.user_id !== userId) {
        return { code: -1, msg: '无权操作此记录' };
    }

    await recordsCol.doc(recordId).update({
        is_deleted: true
    });

    return {
        code: 0,
        msg: '删除成功'
    };
}
// 工具：数组洗牌（Fisher-Yates）
function shuffleArray(arr) {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
