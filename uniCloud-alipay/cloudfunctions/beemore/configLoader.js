'use strict';
/**
 * 加载 beemore 运行时配置：以 DEFAULT_CONFIG 为底，用 beemore_config 集合(is_active) 覆盖同名 key。
 * 每个 key 的 value 整块替换（管理员编辑整个 value 对象），保证结构一致。
 * 兼容处理：rules/actions 逐字段回填内置默认，foods 缺失时整体回填，
 * 这样「新增配置字段」（如饥饿值/干饭）无需重传 init_data.json 也能生效。
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
	// rules 浅合并：存量配置缺少新增字段时补默认，避免运行时读到 undefined
	merged.rules = Object.assign({}, DEFAULT_CONFIG.rules, merged.rules || {})
	// actions：逐个动作补字段，并保证新增的「干饭」入口存在（否则前端按钮会消失）
	const acts = merged.actions || {}
	Object.keys(acts).forEach(k => { acts[k] = Object.assign({}, DEFAULT_CONFIG.actions[k] || {}, acts[k]) })
	if (!acts.eat) acts.eat = DEFAULT_CONFIG.actions.eat
	merged.actions = acts
	// foods：菜单整块缺失（旧库未配）时用内置菜单
	if (!merged.foods || !Array.isArray(merged.foods.list) || !merged.foods.list.length) {
		merged.foods = JSON.parse(JSON.stringify(DEFAULT_CONFIG.foods))
	}
	return merged
}

module.exports = { loadConfig }
