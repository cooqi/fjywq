'use strict';
const db = uniCloud.database()
const dbCmd = db.command
const collection = db.collection('suggestion')

// 管理员唯一标识
const ADMIN_ID = '68b547748a5c782a2b48ac30'

exports.main = async (event, context) => {
	const { type, userId, content, id, answer, status } = event
	
	// ================= 1. 提交建议 =================
	if (type === 'add') {
		if (!userId || !content) return { code: 400, message: '参数不完整' }
		
		try {
			const res = await collection.add({
				userId,
				content: content.trim(),
				status: 'todo', // 默认待处理
				createTime: new Date().getTime()
			})
			return { code: 200, message: '提交成功', id: res.id }
		} catch (err) {
			return { code: 500, message: `提交失败：${err.message}` }
		}
	} 
	
	// ================= 2. 获取列表 (核心逻辑区分) =================
	else if (type === 'getAll') {
		if (!userId) return { code: 400, message: '没有用户信息' }
		
		try {
			let query = collection
			
			if (userId === ADMIN_ID) {
				// 【管理员视角】：查只获取 status 为 'todo' 的数据（兼容历史无 status 字段的数据）
				query = query.where({
					status: dbCmd.eq('todo').or(dbCmd.exists(false))
				})
			} else {
				// 【普通用户视角】：查看自己提交的，且已经被回复的数据
				query = query.where({
					userId: userId,
					answer: dbCmd.exists(true).and(dbCmd.neq(null)).and(dbCmd.neq(''))
				})
			}
			
			const res = await query.orderBy('createTime', 'desc').limit(100).get()
			return { code: 200, data: res.data }
		} catch (err) {
			return { code: 500, message: `查询失败：${err.message}` }
		}
	} 
	
	// ================= 3. 管理员回复及修改状态 =================
	else if (type === 'adminReply') {
		// 严格校验管理员权限
		if (userId !== ADMIN_ID) return { code: 403, message: '无权操作' }
		if (!id || (!answer && status === 'Finish')) return { code: 400, message: '参数不完整' }
		
		try {
			await collection.doc(id).update({
				answer: answer.trim(),
				status: status || 'Finish',
				replyTime: new Date().getTime()
			})
			return { code: 200, message: '处理成功' }
		} catch (err) {
			return { code: 500, message: `回复失败：${err.message}` }
		}
	}
	
	return { code: 400, message: '无效的操作类型' }
};
