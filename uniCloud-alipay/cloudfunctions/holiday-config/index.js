'use strict';

const db = uniCloud.database()
const collection = db.collection('holiday_config')

exports.main = async (event, context) => {
	const { action, data } = event
	
	switch (action) {
		case 'getList':
			return await getList()
		case 'add':
			return await add(data)
		case 'update':
			return await update(data)
		case 'delete':
			return await remove(data._id)
		case 'getToday':
			return await getToday()
		default:
			return await getList()
	}
}

// 获取所有节日配置
async function getList() {
	try {
		const res = await collection.orderBy('month', 'asc').orderBy('day', 'asc').get()
		return {
			code: 0,
			data: res.data
		}
	} catch (e) {
		console.error('获取节日列表失败:', e)
		return { code: -1, message: e.message }
	}
}

// 获取今日节日
async function getToday() {
	try {
		const now = new Date()
		const year = now.getFullYear()
		const month = now.getMonth() + 1
		const day = now.getDate()
		
		// 查询所有启用的节日
		const res = await collection.where({ is_active: true }).get()
		const allHolidays = res.data
		
		// 检查固定节日（month/day匹配）
		const fixedHoliday = allHolidays.find(h => {
			if (h.date_type === 'fixed' || !h.date_type) {
				return h.month === month && h.day === day
			}
			return false
		})
		
		if (fixedHoliday) {
			return { code: 0, data: fixedHoliday }
		}
		
		// 检查范围节日（如春节）
		const rangeHoliday = allHolidays.find(h => {
			if (h.date_type === 'range' && h.year === year) {
				const start = new Date(year, h.startMonth - 1, h.startDay)
				const end = new Date(year, h.endMonth - 1, h.endDay)
				return now >= start && now <= end
			}
			return false
		})
		
		if (rangeHoliday) {
			return { code: 0, data: rangeHoliday }
		}
		
		return { code: 0, data: null }
	} catch (e) {
		console.error('获取今日节日失败:', e)
		return { code: -1, message: e.message }
	}
}

// 添加节日配置
async function add(data) {
	try {
		if (!data.name || !data.month) {
			return { code: -1, message: '名称和月份为必填' }
		}
		// 新增时移除空_id，让数据库自动生成
		if (!data._id) {
			delete data._id
		}
		data.create_time = Date.now()
		data.update_time = Date.now()
		const res = await collection.add(data)
		return { code: 0, data: res, message: '添加成功' }
	} catch (e) {
		console.error('添加节日配置失败:', e)
		return { code: -1, message: e.message }
	}
}

// 更新节日配置
async function update(data) {
	try {
		if (!data._id) {
			return { code: -1, message: '缺少ID' }
		}
		const id = data._id
		delete data._id
		data.update_time = Date.now()
		await collection.doc(id).update(data)
		return { code: 0, message: '更新成功' }
	} catch (e) {
		console.error('更新节日配置失败:', e)
		return { code: -1, message: e.message }
	}
}

// 删除节日配置
async function remove(id) {
	try {
		if (!id) {
			return { code: -1, message: '缺少ID' }
		}
		await collection.doc(id).remove()
		return { code: 0, message: '删除成功' }
	} catch (e) {
		console.error('删除节日配置失败:', e)
		return { code: -1, message: e.message }
	}
}
