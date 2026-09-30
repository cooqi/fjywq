'use strict';
/**
 * 电子杯蜜全局配置管理云函数
 * 集合：beemore_config（每个 key 一条文档，value 为配置载荷）
 * actions:
 *   getList    管理页列表（全部文档）
 *   getMap     组装成 { key: value } 供前端/云函数运行时读取
 *   add        新增/覆盖某 key 配置（value 为对象）
 *   update     更新指定 _id 的配置
 *   delete     删除指定 _id
 *   resetDefaults 清空全部配置（回退到内置默认值；重新上传 init_data.json 可再次初始化）
 */
const db = uniCloud.database()
const collection = db.collection('beemore_config')

const err = (message, code = -1) => ({ code, message: message || 'error', data: null })
const ok = (data, message) => ({ code: 0, message: message || 'ok', data: data || null })

exports.main = async (event, context) => {
	const { action, data } = event
	try {
		switch (action) {
			case 'getList': return await getList()
			case 'getMap': return await getMap()
			case 'add': return await add(data)
			case 'update': return await update(data)
			case 'delete': return await remove(data && data._id)
			case 'resetDefaults': return await resetDefaults()
			default: return await getList()
		}
	} catch (e) {
		console.error('beemore-config error', action, e)
		return err('系统错误：' + e.message, 9001)
	}
}

async function getList() {
	const res = await collection.orderBy('sort', 'asc').get()
	return ok(res.data)
}

// 组装 { key: value }，仅取启用项；缺项由调用方内置默认兜底
async function getMap() {
	const res = await collection.where({ is_active: true }).orderBy('sort', 'asc').get()
	const map = {}
	for (const doc of res.data) {
		if (doc.key && doc.value && typeof doc.value === 'object') map[doc.key] = doc.value
	}
	return ok(map)
}

async function add(data) {
	if (!data || !data.key) return err('缺少配置键 key')
	if (!data.value || typeof data.value !== 'object') return err('配置载荷 value 必须为对象')
	const now = Date.now()
	// 同 key 覆盖：先查已有则更新，否则新增
	const exist = await collection.where({ key: data.key }).limit(1).get()
	if (exist.data.length) {
		const id = exist.data[0]._id
		await collection.doc(id).update({
			label: data.label || exist.data[0].label || data.key,
			value: data.value,
			sort: data.sort != null ? data.sort : exist.data[0].sort,
			is_active: data.is_active !== false,
			update_date: now
		})
		return ok({ _id: id }, '配置已更新')
	}
	const payload = {
		key: data.key,
		label: data.label || data.key,
		value: data.value,
		sort: data.sort != null ? data.sort : 100,
		is_active: data.is_active !== false,
		update_date: now,
		create_date: now
	}
	const res = await collection.add(payload)
	return ok({ _id: res.id }, '配置已添加')
}

async function update(data) {
	if (!data || !data._id) return err('缺少 _id')
	const id = data._id
	const payload = {}
	if (data.key) payload.key = data.key
	if (data.label !== undefined) payload.label = data.label
	if (data.value !== undefined) payload.value = data.value
	if (data.sort !== undefined) payload.sort = data.sort
	if (data.is_active !== undefined) payload.is_active = data.is_active
	payload.update_date = Date.now()
	await collection.doc(id).update(payload)
	return ok(null, '更新成功')
}

async function remove(id) {
	if (!id) return err('缺少 _id')
	await collection.doc(id).remove()
	return ok(null, '删除成功')
}

// 清空全部配置文档：运行时会回退到 constants.js / beemore.js 内置默认值
async function resetDefaults() {
	let removed = 0
	// uniCloud 单次 remove 受 where 限制，循环删除
	for (let i = 0; i < 50; i++) {
		const res = await collection.limit(100).get()
		if (!res.data.length) break
		for (const doc of res.data) {
			await collection.doc(doc._id).remove()
			removed++
		}
		if (res.data.length < 100) break
	}
	return ok({ removed }, `已清空 ${removed} 条配置，运行时将回退到内置默认值`)
}
