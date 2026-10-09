'use strict';
const db = uniCloud.database()
const dbCmd = db.command

// 需要按场次去重的消费类型：同一用户同一场次只能有一条记录
const CONCERT_TYPES = ['音乐节', '演唱会', '见面会']

// 查找重复的场次记录；excludeId 用于编辑时排除记录自身
async function findDuplicateConcert({
	userId,
	concertID,
	payName,
	excludeId
}) {
	const pick = (list) => (list || []).find(item => !excludeId || item._id !== excludeId) || null
	
	// 1、按场次ID查重
	if (concertID) {
		const res = await db.collection('payRecord').where({
			userId: userId,
			concertID: concertID
		}).limit(50).get()
		const hit = pick(res.data)
		if (hit) return hit
	}
	
	// 2、兼容历史数据（早期记录未写入 concertID），按名称+类型查重
	if (payName) {
		const res = await db.collection('payRecord').where({
			userId: userId,
			payName: payName,
			payType: dbCmd.in(CONCERT_TYPES)
		}).limit(50).get()
		const hit = pick(res.data)
		if (hit) return hit
	}
	
	return null
}

exports.main = async (event, context) => {
	// event为客户端上传的参数
	const collection = db.collection('payRecord')
	let type = event.type
	
	// 获取用户信息：从event中获取userId
	let userId = event.userId || ''
	
	
	// 新增记录
	if (type === 'add') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			// 检查是否重复添加（同一用户、同一场次不能重复添加）
			if (CONCERT_TYPES.includes(event.payType)) {
				if (!event.concertID) {
					return {
						code: 1,
						message: '请选择演唱会/音乐节/见面会场次'
					}
				}
				
				const duplicate = await findDuplicateConcert({
					userId: userId,
					concertID: event.concertID,
					payName: event.payName
				})
				
				if (duplicate) {
					return {
						code: 1,
						message: `您已添加过「${duplicate.payName || event.payName}」的记录，同一场次不能重复添加`,
						data: duplicate
					}
				}
			}
			
			const now = new Date().getTime()
			const data = {
				userId: userId,
				payTime: event.payTime,
				payType: event.payType,
				payName: event.payName || '',
				payNum: event.payNum || '1',
				payPrice: event.payPrice || '0',
				regular:event.regular|| '0',
				TransportationExpenses: event.TransportationExpenses || '0',
				HotelExpenses: event.HotelExpenses || '0',
				otherExpenses: event.otherExpenses || '0',
				payAmount: event.payAmount || '0',
				bz: event.bz || '',
				adress: event.adress || '',
				Province: event.Province || '',
				creatTime: now,
				upTime: now,
				imgs: event.imgs || '',
				sdUrl: event.sdUrl || '',
				concertID: event.concertID || '',
				isEntry: event.isEntry || '',
				SeatNumber: event.SeatNumber || ''
			}
			
			const res = await collection.add(data)
			return {
				code: 0,
				message: '添加成功',
				data: res
			}
		} catch (err) {
			return {
				code: 1,
				message: '添加失败：' + err.message
			}
		}
	}
	
	// 更新记录
	if (type === 'update') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			if (!event.id) {
				return {
					code: 1,
					message: '记录ID不能为空'
				}
			}
			
			// 验证是否是当前用户的记录
			const checkRes = await collection.doc(event.id).get()
			if (!checkRes.data || checkRes.data.length === 0) {
				return {
					code: 1,
					message: '记录不存在'
				}
			}
			const record = checkRes.data[0]
			if (!record.userId || record.userId !== userId) {
				return {
					code: 1,
					message: '无权修改此记录'
				}
			}
			
			// 改成其他场次时同样要校验重复（排除自身）
			if (CONCERT_TYPES.includes(event.payType)) {
				if (!event.concertID) {
					return {
						code: 1,
						message: '请选择演唱会/音乐节/见面会场次'
					}
				}
				
				const duplicate = await findDuplicateConcert({
					userId: userId,
					concertID: event.concertID,
					payName: event.payName,
					excludeId: event.id
				})
				
				if (duplicate) {
					return {
						code: 1,
						message: `您已添加过「${duplicate.payName || event.payName}」的记录，同一场次不能重复添加`,
						data: duplicate
					}
				}
			}
			
			const now = new Date().getTime()
			const data = {
				payTime: event.payTime,
				payType: event.payType,
				payName: event.payName || '',
				payNum: event.payNum || '1',
				payPrice: event.payPrice || '0',
				regular:event.regular|| '0',
				TransportationExpenses: event.TransportationExpenses || '0',
				HotelExpenses: event.HotelExpenses || '0',
				otherExpenses: event.otherExpenses || '0',
				payAmount: event.payAmount || '0',
				bz: event.bz || '',
				adress: event.adress || '',
				Province: event.Province || '',
				upTime: now,
				imgs: event.imgs || '',
				sdUrl: event.sdUrl || '',
				concertID: event.concertID || '',
				isEntry: event.isEntry || '',
				SeatNumber: event.SeatNumber || ''
			}
			
			const res = await collection.doc(event.id).update(data)
			return {
				code: 0,
				message: '更新成功',
				data: res
			}
		} catch (err) {
			return {
				code: 1,
				message: '更新失败：' + err.message
			}
		}
	}
	
	// 删除记录
	if (type === 'delete') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			if (!event.id) {
				return {
					code: 1,
					message: '记录ID不能为空'
				}
			}
			
			// 验证是否是当前用户的记录
			const checkRes = await collection.doc(event.id).get()
			if (!checkRes.data || checkRes.data.length === 0) {
				return {
					code: 1,
					message: '记录不存在'
				}
			}
			const record = checkRes.data[0]
			if (!record.userId || record.userId !== userId) {
				return {
					code: 1,
					message: '无权删除此记录'
				}
			}
			
			const res = await collection.doc(event.id).remove()
			return {
				code: 0,
				message: '删除成功',
				data: res
			}
		} catch (err) {
			return {
				code: 1,
				message: '删除失败：' + err.message
			}
		}
	}
	
	// 查询记录列表
	if (type === 'get') {
		try {
			console.log('查询参数:', event)
			
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			const queryConditions = {
				userId: userId
			}
			
			// 如果有类型筛选（支持单个字符串或数组）
			if (event.payType && event.payType !== 'all') {
				if (Array.isArray(event.payType)) {
					// 如果是数组，使用 $in 操作符
					queryConditions.payType = dbCmd.in(event.payType)
					console.log('多类型查询:', event.payType)
				} else {
					// 如果是单个字符串，直接匹配
					queryConditions.payType = event.payType
					console.log('单类型查询:', event.payType)
				}
			}
			
			console.log('最终查询条件:', queryConditions)
			
			const res = await collection
				.where(queryConditions)
				.orderBy('creatTime', 'desc')
				.get()
			
			console.log('查询结果数量:', res.data.length)
			
			return {
				code: 0,
				message: '查询成功',
				data: res.data
			}
		} catch (err) {
			console.error('查询失败:', err)
			return {
				code: 1,
				message: '查询失败：' + err.message
			}
		}
	}
	
	// 查询单条记录详情
	if (type === 'getDetail') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			if (!event.id) {
				return {
					code: 1,
					message: '记录ID不能为空'
				}
			}
			
			const res = await collection.doc(event.id).get()
			
			if (!res.data || res.data.length === 0) {
				return {
					code: 1,
					message: '记录不存在'
				}
			}
			
			const record = res.data[0]
			
			// 验证是否是当前用户的记录
			if (!record.userId || record.userId !== userId) {
				return {
					code: 1,
					message: '无权查看此记录'
				}
			}
			
			return {
				code: 0,
				message: '查询成功',
				data: record
			}
		} catch (err) {
			console.error('getDetail error:', err)
			return {
				code: 1,
				message: '查询失败：' + err.message
			}
		}
	}
	
	// 统计消费总额
	if (type === 'getTotal') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			const queryConditions = {
				userId: userId
			}
			
			// 如果有类型筛选（支持单个字符串或数组）
			if (event.payType && event.payType !== 'all') {
				if (Array.isArray(event.payType)) {
					// 如果是数组，使用 $in 操作符
					queryConditions.payType = dbCmd.in(event.payType)
				} else {
					// 如果是单个字符串，直接匹配
					queryConditions.payType = event.payType
				}
			}
			
			const res = await collection
				.where(queryConditions)
				.field({ payAmount: true })
				.get()
			
			let total = 0
			res.data.forEach(item => {
				total += parseFloat(item.payAmount || 0)
			})
			
			return {
				code: 0,
				message: '查询成功',
				data: {
					total: total.toFixed(2),
					count: res.data.length
				}
			}
		} catch (err) {
			return {
				code: 1,
				message: '查询失败：' + err.message
			}
		}
	}
	
	// 检查是否重复添加（供前端调用）
	if (type === 'checkDuplicate') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			if (!event.concertID && !event.payName) {
				return {
					code: 0,
					isDuplicate: false
				}
			}
			
			// 查询是否存在相同用户和场次的记录
			const duplicate = await findDuplicateConcert({
				userId: userId,
				concertID: event.concertID,
				payName: event.payName,
				excludeId: event.excludeId
			})
			
			return {
				code: 0,
				isDuplicate: !!duplicate,
				data: duplicate ? {
					id: duplicate._id,
					payName: duplicate.payName || '',
					payType: duplicate.payType || '',
					payTime: duplicate.payTime || ''
				} : null
			}
		} catch (err) {
			console.error('检查重复记录失败:', err)
			return {
				code: 1,
				message: '检查失败：' + err.message,
				isDuplicate: false
			}
		}
	}
	
	// 历史数据迁移：把字符串类型的 creatTime/upTime 转成 timestamp（毫秒数字）
	// 上线后只需执行一次，调用参数：{ type: 'migrateTime', userId, secret: 'payRecord-time-v1' }
	if (type === 'migrateTime') {
		try {
			if (!userId) {
				return {
					code: 1,
					message: '请先登录'
				}
			}
			
			if (event.secret !== 'payRecord-time-v1') {
				return {
					code: 1,
					message: '无权限执行迁移'
				}
			}
			
			const TIME_FIELDS = ['creatTime', 'upTime']
			// 只接受 13 位毫秒时间戳，其他格式（如空字符串）单独统计便于人工确认
			const toNum = (val) => /^\d{13}$/.test(String(val === null || val === undefined ? '' : val).trim()) ? Number(String(val).trim()) : null
			
			let migrated = 0
			let skipped = 0
			const pageSize = 200
			let page = 0
			let hasMore = true
			
			while (hasMore) {
				const res = await collection
					.where({ userId: userId })
					.skip(page * pageSize)
					.limit(pageSize)
					.field({ creatTime: true, upTime: true })
					.get()
				const list = res.data || []
				hasMore = list.length === pageSize
				page++
				
				for (const item of list) {
					const patch = {}
					
					TIME_FIELDS.forEach(field => {
						if (typeof item[field] === 'number') return
						
						const num = toNum(item[field])
						if (num === null) {
							skipped++
							return
						}
						patch[field] = num
					})
					
					if (Object.keys(patch).length === 0) continue
					
					await collection.doc(item._id).update(patch)
					migrated++
				}
			}
			
			return {
				code: 0,
				message: `迁移完成：更新 ${migrated} 条，异常值 ${skipped} 个`,
				data: {
					migrated,
					skipped
				}
			}
		} catch (err) {
			console.error('时间字段迁移失败:', err)
			return {
				code: 1,
				message: '迁移失败：' + err.message
			}
		}
	}
	
	return {
		code: 1,
		message: '未知操作类型'
	}
}
