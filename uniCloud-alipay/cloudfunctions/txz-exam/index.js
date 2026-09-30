'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
const questionsCol = db.collection('qa_questions');
const examCol = db.collection('txz_exam');
const recordsCol = db.collection('txz_exam_records');

const VALID_MS = 10 * 60 * 1000; // 考试码有效期 10 分钟

// 生成 6 位考试码（去掉易混淆字符 0/O/1/I）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode() {
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
	}
	return code;
}

exports.main = async (event, context) => {
	const { action, userId } = event;

	try {
		switch (action) {
			case 'createExam':
				if (!userId) return { code: -1, msg: '未登录' };
				return await createExam(event);
			case 'getExamInfo':
				return await getExamInfo(event.examCode);
			case 'judgeOne':
				return await judgeOne(event);
			case 'renewExam':
				if (!userId) return { code: -1, msg: '未登录' };
				return await renewExam(event, userId);
			case 'submitExam':
				return await submitExam(event, userId);
			case 'getRankList':
				return await getRankList(event.examCode);
			case 'getMyExams':
				if (!userId) return { code: -1, msg: '未登录' };
				return await getMyExams(userId);
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (error) {
		console.error('txz-exam 错误:', error);
		return { code: -1, msg: error.message || '服务器错误' };
	}
};

// 创建考试：随机抽题并固化，生成唯一考试码
async function createExam(event) {
	const { userId, creatorNick, config } = event;
	const questionCount = parseInt(config && config.questionCount);
	const passScore = parseInt(config && config.passScore);
	const totalScore = parseInt(config && config.totalScore);
	const tiers = (config && config.tiers) || [];

	// 参数校验
	if (!(questionCount >= 5)) return { code: -1, msg: '题数至少 5 道' };
	if (!(totalScore >= 5)) return { code: -1, msg: '满分至少 5 分' };
	if (!(passScore >= 1)) return { code: -1, msg: '及格分至少 1 分' };
	if (passScore > totalScore) return { code: -1, msg: '及格分不能大于满分' };

	// 拉取启用题库
	const countRes = await questionsCol.where({ status: 1 }).count();
	if (countRes.total < questionCount) {
		return { code: -1, msg: `题库可用题目不足（需 ${questionCount} 道，当前 ${countRes.total} 道）` };
	}
	const allQ = await questionsCol.where({ status: 1 }).limit(countRes.total).get();

	const selected = shuffleArray(allQ.data).slice(0, questionCount);

	// 每题分值：base 分，前 remainder 题额外 +1，保证满分正好等于 totalScore
	const base = Math.floor(totalScore / questionCount);
	const remainder = totalScore - base * questionCount;

	// 固化题目快照（含答案与解析，仅云端保留）
	const frozen = selected.map((q, idx) => ({
		questionId: q._id,
		index: idx + 1,
		question: q.question,
		type: q.type,
		category: q.category,
		difficulty: q.difficulty,
		options: q.options,
		answer: Array.isArray(q.answer) ? q.answer : [q.answer],
		analysis: q.analysis || '',
		points: base + (idx < remainder ? 1 : 0)
	}));

	// 生成唯一考试码（最多重试 10 次）
	let examCode = '';
	for (let i = 0; i < 10; i++) {
		const code = genCode();
		const exist = await examCol.where({ exam_code: code }).count();
		if (exist.total === 0) {
			examCode = code;
			break;
		}
	}
	if (!examCode) return { code: -1, msg: '考试码生成失败，请重试' };

	const now = Date.now();
	const addRes = await examCol.add({
		creator_id: userId,
		creator_nick: creatorNick || '',
		exam_code: examCode,
		question_count: questionCount,
		pass_score: passScore,
		total_score: totalScore,
		points_per_question: base,
		tiers,
		questions: frozen,
		create_date: now,
		expire_at: now + VALID_MS,
		participant_count: 0
	});

	return {
		code: 0,
		msg: '创建成功',
		data: {
			examId: addRes.id,
			examCode,
			expireAt: now + VALID_MS
		}
	};
}

// 获取考试信息：返回题目（不含答案/解析）；判断是否过期
async function getExamInfo(examCode) {
	if (!examCode) return { code: -1, msg: '缺少考试码' };

	const res = await examCol.where({ exam_code: examCode.toUpperCase() }).get();
	if (!res.data || res.data.length === 0) {
		return { code: -1, msg: '考试码不存在' };
	}
	const exam = res.data[0];

	if (Date.now() > exam.expire_at) {
		return { code: 2, msg: '考试码已过期', data: { expired: true, examCode } };
	}

	// 剥离答案与解析
	const safeQuestions = exam.questions.map(q => ({
		index: q.index,
		question: q.question,
		type: q.type,
		category: q.category,
		difficulty: q.difficulty,
		options: q.options,
		points: q.points
	}));

	return {
		code: 0,
		data: {
			examCode,
			creatorNick: exam.creator_nick,
			questionCount: exam.question_count,
			passScore: exam.pass_score,
			totalScore: exam.total_score,
			tiers: exam.tiers || [],
			expireAt: exam.expire_at,
			questions: safeQuestions
		}
	};
}

// 单题即时判分（答案与解析仅在确认时下发，防止提前偷看）
async function judgeOne(event) {
	const { examCode, index, userAnswer } = event;
	if (!examCode || !index) return { code: -1, msg: '参数错误' };

	const res = await examCol.where({ exam_code: examCode.toUpperCase() }).get();
	if (!res.data || res.data.length === 0) return { code: -1, msg: '考试码不存在' };
	const exam = res.data[0];
	if (Date.now() > exam.expire_at) return { code: -1, msg: '考试码已过期' };

	const q = (exam.questions || []).find(item => item.index === parseInt(index));
	if (!q) return { code: -1, msg: '题目不存在' };

	const isCorrect = judgeAnswer(q, userAnswer);
	return {
		code: 0,
		data: {
			isCorrect,
			correctAnswer: q.answer || [],
			analysis: q.analysis || '',
			points: q.points || 0,
			earned: isCorrect ? (q.points || 0) : 0
		}
	};
}

// 判分核心：填空题匹配任一可接受答案，选择题需完全匹配
function judgeAnswer(q, userAnswer) {
	const correctAnswer = Array.isArray(q.answer) ? q.answer : [q.answer];
	const qType = q.type || 'single';
	if (qType === 'fill') {
		const userInput = Array.isArray(userAnswer) ? (userAnswer[0] || '') : (userAnswer || '');
		const trimmed = String(userInput).trim().toLowerCase();
		return trimmed.length > 0 && correctAnswer.some(a => String(a).trim().toLowerCase() === trimmed);
	}
	return (
		Array.isArray(userAnswer) &&
		userAnswer.length === correctAnswer.length &&
		userAnswer.slice().sort().join(',') === correctAnswer.slice().sort().join(',')
	);
}

// 续期：仅创建者可延长 10 分钟
async function renewExam(event, userId) {
	const { examCode } = event;
	const res = await examCol.where({ exam_code: (examCode || '').toUpperCase() }).get();
	if (!res.data || res.data.length === 0) return { code: -1, msg: '考试码不存在' };
	const exam = res.data[0];
	if (exam.creator_id !== userId) return { code: -1, msg: '只有创建者可以续期' };

	const newExpire = Date.now() + VALID_MS;
	await examCol.doc(exam._id).update({ expire_at: newExpire });
	return { code: 0, msg: '已续期 10 分钟', data: { expireAt: newExpire } };
}

// 提交考试：按固化答案判分、计算称号奖品与排名
async function submitExam(event, userId) {
	const { examCode, nick, answers } = event;
	if (!examCode || !Array.isArray(answers)) return { code: -1, msg: '参数错误' };

	const res = await examCol.where({ exam_code: examCode.toUpperCase() }).get();
	if (!res.data || res.data.length === 0) return { code: -1, msg: '考试码不存在' };
	const exam = res.data[0];

	if (Date.now() > exam.expire_at) return { code: -1, msg: '考试码已过期，无法提交' };

	const frozen = exam.questions;
	if (answers.length !== frozen.length) {
		return { code: -1, msg: '答案数量与题目数不一致' };
	}

	let score = 0;
	let correctCount = 0;
	const questionResults = frozen.map((q, i) => {
		const userAnswer = answers[i] || [];
		const isCorrect = judgeAnswer(q, userAnswer);
		const earned = isCorrect ? (q.points || 0) : 0;
		if (isCorrect) {
			correctCount++;
			score += earned;
		}

		return {
			questionId: q.questionId,
			index: q.index,
			question: q.question,
			type: q.type,
			category: q.category,
			options: q.options,
			userAnswer,
			correctAnswer: q.answer || [],
			isCorrect,
			earned,
			analysis: q.analysis || ''
		}
	});

	const passed = score >= exam.pass_score;
	const matched = matchTier(exam.tiers, score);
	const title = matched.title;
	const prize = matched.prize;
	const finishTime = Date.now();

	// 排名：统计分数更高、或同分但交卷更早的人数
	const betterRes = await recordsCol.where(
		dbCmd.and([
			{ exam_code: exam.exam_code },
			dbCmd.or([
				{ score: dbCmd.gt(score) },
				dbCmd.and([{ score: score }, { finish_time: dbCmd.lt(finishTime) }])
			])
		])
	).count();
	const rank = betterRes.total + 1;

	const recordAdd = await recordsCol.add({
		exam_code: exam.exam_code,
		user_id: userId || '',
		nick: nick || '匿名',
		questions: questionResults,
		score,
		correct_count: correctCount,
		total_score: exam.total_score,
		pass_score: exam.pass_score,
		passed,
		title,
		prize,
		rank,
		finish_time: finishTime,
		create_date: finishTime
	});

	// 参与人数 +1
	await examCol.doc(exam._id).update({ participant_count: dbCmd.inc(1) });

	return {
		code: 0,
		msg: '提交成功',
		data: {
			recordId: recordAdd.id,
			examCode: exam.exam_code,
			nick: nick || '匿名',
			score,
			totalScore: exam.total_score,
			passScore: exam.pass_score,
			correctCount,
			questionCount: exam.question_count,
			passed,
			title,
			prize,
			rank,
			questions: questionResults
		}
	};
}

// 称号匹配：按 minScore 降序找到第一个满足的档位
function matchTier(tiers, score) {
	if (!Array.isArray(tiers) || tiers.length === 0) {
		return { title: '继续加油', prize: '' };
	}
	const sorted = [...tiers]
		.filter(t => t && t.title)
		.sort((a, b) => (b.minScore || 0) - (a.minScore || 0));
	for (const t of sorted) {
		if (score >= (t.minScore || 0)) {
			return { title: t.title, prize: t.prize || '' };
		}
	}
	return { title: '继续加油', prize: '' };
}

// 排行榜：同考试码按分数降序、同分按交卷时间升序
async function getRankList(examCode) {
	if (!examCode) return { code: -1, msg: '缺少考试码' };
	const code = examCode.toUpperCase();

	const totalRes = await recordsCol.where({ exam_code: code }).count();
	const res = await recordsCol
		.where({ exam_code: code })
		.orderBy('score', 'desc')
		.orderBy('finish_time', 'asc')
		.limit(50)
		.field({ nick: true, score: true, title: true, passed: true, finish_time: true, correct_count: true })
		.get();

	const list = (res.data || []).map((r, idx) => ({
		rank: idx + 1,
		nick: r.nick,
		score: r.score,
		title: r.title,
		passed: r.passed,
		correctCount: r.correct_count,
		finishTime: r.finish_time
	}));

	return { code: 0, data: { total: totalRes.total, list } };
}

// 我创建的考试 + 我参与的记录
async function getMyExams(userId) {
	const createdRes = await examCol
		.where({ creator_id: userId })
		.orderBy('create_date', 'desc')
		.limit(30)
		.field({
			exam_code: true, creator_nick: true, question_count: true,
			pass_score: true, total_score: true, create_date: true,
			expire_at: true, participant_count: true
		})
		.get();

	const joinedRes = await recordsCol
		.where({ user_id: userId })
		.orderBy('create_date', 'desc')
		.limit(30)
		.field({
			exam_code: true, nick: true, score: true, total_score: true,
			pass_score: true, correct_count: true, passed: true,
			title: true, prize: true, rank: true, create_date: true
		})
		.get();

	return {
		code: 0,
		data: {
			created: createdRes.data || [],
			joined: joinedRes.data || []
		}
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
