'use strict';
/**
 * 加载 beemore 运行时配置：以 DEFAULT_CONFIG 为底，用 beemore_config 集合(is_active) 覆盖同名 key。
 * 每个 key 的 value 整块替换（管理员编辑整个 value 对象），保证结构一致。
 * DB 不可用/无数据时静默回退内置默认。
 */
const { DEFAULT_CONFIG } = require('./constants.js')

async function loadConfig(db) {
	// 深拷贝默认，避免多次调用相互污染
	const merged = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
	try {
		const res = await db.collection('beemore_config').where({ is_active: true }).get()
		for (const doc of res.data) {
			if (doc.key && doc.value && typeof doc.value === 'object' && !Array.isArray(doc.value)) {
				merged[doc.key] = doc.value
			}
		}
	} catch (e) {
		console.warn('beemore loadConfig fallback to defaults:', e && e.message)
	}
	return merged
}

module.exports = { loadConfig }
