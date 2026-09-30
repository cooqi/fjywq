'use strict';
/**
 * 合成大西瓜：用户自定义水果贴图云函数
 * 集合：game2048_fruits（记录每个用户已上传的图片，供下次从图库中选取）
 * actions:
 *   list     拉取某用户的图库（按上传时间倒序）
 *   add      新增一条已上传图片记录 { userId, url, cloudPath, label }
 *   remove   删除某条记录（校验归属）{ userId, id }
 * 说明：图片文件本体由前端 uniCloud.uploadFile 直传云存储，这里只维护图库元数据。
 */
const db = uniCloud.database()
const collection = db.collection('game2048_fruits')

// 图库容量限制：每人至多 MAX_GALLERY 张（前端同步拦截，这里兜底防绕过）
const MAX_GALLERY = 20

const err = (message, code = -1) => ({ code, message: message || 'error', data: null })
const ok = (data, message) => ({ code: 0, message: message || 'ok', data: data || null })

exports.main = async (event, context) => {
	const { action } = event
	try {
		switch (action) {
			case 'list': return await list(event)
			case 'add': return await add(event)
			case 'remove': return await remove(event)
			default: return err('未知操作：' + action)
		}
	} catch (e) {
		console.error('game2048-skin error', action, e)
		return err('系统错误：' + e.message, 9001)
	}
}

async function list(event) {
	const { userId } = event
	if (!userId) return err('缺少 userId')
	const res = await collection.where({ user_id: userId }).orderBy('create_date', 'desc').limit(200).get()
	return ok(res.data)
}

async function add(event) {
	const { userId, url, cloudPath, label } = event
	if (!userId) return err('缺少 userId')
	if (!url) return err('缺少图片地址 url')
	// 数量上限与重复登记校验
	const cnt = await collection.where({ user_id: userId }).count()
	if (cnt.total >= MAX_GALLERY) return err(`图库已满（最多 ${MAX_GALLERY} 张），请先删除不用的图片`)
	const dup = await collection.where({ user_id: userId, url }).limit(1).get()
	if (dup.data.length) return err('该图片已在图库中，请勿重复上传')
	const now = Date.now()
	const payload = {
		user_id: userId,
		url,
		cloud_path: cloudPath || '',
		label: label || '',
		create_date: now
	}
	const res = await collection.add(payload)
	return ok({ _id: res.id, ...payload }, '已加入图库')
}

async function remove(event) {
	const { userId, id } = event
	if (!userId) return err('缺少 userId')
	if (!id) return err('缺少 _id')
	// 校验归属，只允许删除自己的图片记录
	const exist = await collection.doc(id).get()
	if (!exist.data.length) return err('记录不存在')
	if (exist.data[0].user_id !== userId) return err('无权删除该图片')
	await collection.doc(id).remove()
	return ok(null, '已删除')
}
