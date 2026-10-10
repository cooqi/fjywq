/**
 * 灯牌本地存储与默认配置（纯本地，不依赖服务端）
 * ESM 具名导出。列表键 lanban_list，最多 20 个方案；展示临时键 lanban_current。
 */

export const LIST_KEY = 'lanban_list'
export const CURRENT_KEY = 'lanban_current'
export const MAX_ITEMS = 20
export const MAX_LINES = 6
export const MAX_CHARS_PER_LINE = 50

export const PRESET_COLORS = [
	'#000000', '#FFFFFF', '#FF3B30', '#FF9500',
	'#FFD700', '#34C759', '#00FFFF', '#00FF88',
	'#00D4FF', '#0066FF', '#FF69B4', '#FF0066',
	'#9933FF', '#C77DFF', '#8B5A2B', '#BDBDBD'
]

function uid() {
	return 'lb' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36)
}

// 新建一个默认灯牌配置
export function createDefault() {
	return {
		id: uid(),
		name: '未命名灯牌',
		updateTime: Date.now(),
		lines: [{ chars: [] }],
		bgColor: '#000000',
		fontSize: { preset: 'fit', value: null, actual: 0 },
		mode: 'static', // static | scroll | blink
		orientation: 'portrait', // portrait | landscape
		scroll: { direction: 'left', loop: true, speed: 5 },
		blink: { target: 'text', effect: 'flash', speed: 500 }
	}
}

// 深拷贝读取列表
export function loadList() {
	let list = uni.getStorageSync(LIST_KEY)
	if (!list) return []
	try { list = typeof list === 'string' ? JSON.parse(list) : list } catch (e) { return [] }
	return Array.isArray(list) ? list : []
}

export function saveList(list) {
	const arr = (list || []).slice(0, MAX_ITEMS)
	uni.setStorageSync(LIST_KEY, arr)
	return arr
}

// 按 id 取单个
export function getItem(id) {
	return loadList().find(x => x.id === id) || null
}

// 新增或更新（按 id），返回 { ok, msg, list }
export function upsert(config) {
	if (!config || !config.id) return { ok: false, msg: '配置无效' }
	const list = loadList()
	const idx = list.findIndex(x => x.id === config.id)
	config.updateTime = Date.now()
	if (!config.name) config.name = summarizeName(config)
	if (idx >= 0) list[idx] = config
	else {
		if (list.length >= MAX_ITEMS) return { ok: false, msg: '最多保存 ' + MAX_ITEMS + ' 个灯牌，请先删除旧的' }
		list.unshift(config)
	}
	saveList(list)
	return { ok: true, msg: '已保存', list }
}

export function removeItem(id) {
	const list = loadList().filter(x => x.id !== id)
	saveList(list)
	return list
}

export function setCurrent(config) {
	uni.setStorageSync(CURRENT_KEY, config)
}

export function getCurrent() {
	let c = uni.getStorageSync(CURRENT_KEY)
	if (!c) return null
	try { c = typeof c === 'string' ? JSON.parse(c) : c } catch (e) { return null }
	return c
}

// 用首行文字生成方案名
export function summarizeName(config) {
	const first = (config.lines && config.lines[0] && config.lines[0].chars || []).map(c => c.char).join('')
	const text = (first || '').trim()
	if (!text) return '未命名灯牌'
	return text.length > 8 ? text.slice(0, 8) + '…' : text
}

// 取整块纯文本（用于列表摘要）
export function fullText(config) {
	return (config.lines || []).map(l => (l.chars || []).map(c => c.char).join('')).join(' / ')
}
