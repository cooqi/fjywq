'use strict';
const db = uniCloud.database()
const dbCmd = db.command

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
			if (event.concertID) {
				const duplicateCheck = await collection.where({
					userId: userId,
					concertID: event.concertID
				}).get()
				
				if (duplicateCheck.data && duplicateCheck.data.length > 0) {
					return {
						code: 1,
						message: '您已经添加过该场次的记录了，不能重复添加'
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
				TransportationExpenses: event.TransportationExpenses || '0',
				HotelExpenses: event.HotelExpenses || '0',
				otherExpenses: event.otherExpenses || '0',
				payAmount: event.payAmount || '0',
				bz: event.bz || '',
				adress: event.adress || '',
				Province: event.Province || '',
				creatTime: now.toString(),
				upTime: now.toString(),
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
			
			const now = new Date().getTime()
			const data = {
				payTime: event.payTime,
				payType: event.payType,
				payName: event.payName || '',
				payNum: event.payNum || '1',
				payPrice: event.payPrice || '0',
				TransportationExpenses: event.TransportationExpenses || '0',
				HotelExpenses: event.HotelExpenses || '0',
				otherExpenses: event.otherExpenses || '0',
				payAmount: event.payAmount || '0',
				bz: event.bz || '',
				adress: event.adress || '',
				Province: event.Province || '',
				upTime: now.toString(),
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
			
			if (!event.concertID) {
				return {
					code: 0,
					isDuplicate: false
				}
			}
			
			// 查询是否存在相同用户和场次的记录
			const checkRes = await collection.where({
				userId: userId,
				concertID: event.concertID
			}).get()
			
			return {
				code: 0,
				isDuplicate: checkRes.data && checkRes.data.length > 0
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
	
	return {
		code: 1,
		message: '未知操作类型'
	}
}
