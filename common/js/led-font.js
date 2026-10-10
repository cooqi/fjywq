/**
 * 灯牌字号自适应工具（DOM 渲染方案，仅用 canvas 做 measureText 测量）
 * ESM 具名导出（common/js 前端模块禁止 CommonJS 导出，否则具名导入编译失败）
 * 策略：优先用离屏 canvas 的 measureText 精确测量；不可用时用字符宽度估算兜底。
 */

let _ctx = null
let _ctxTried = false

// 获取测量上下文（懒加载，仅一次）
function getMeasureCtx() {
	if (_ctxTried) return _ctx
	_ctxTried = true
	try {
		// #ifdef MP-WEIXIN
		const canvas = wx.createOffscreenCanvas({ type: '2d', width: 300, height: 200 })
		_ctx = canvas.getContext('2d')
		// #endif
		// #ifdef H5
		const c = document.createElement('canvas')
		_ctx = c.getContext('2d')
		// #endif
	} catch (e) {
		_ctx = null
	}
	return _ctx
}

// 字符宽度估算兜底：中日韩全角按 1em，其余按 0.55em
function approxWidth(text, fontSize) {
	let w = 0
	for (const ch of String(text)) {
		if (/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(ch)) w += fontSize
		else w += fontSize * 0.55
	}
	return w
}

// 单行文本在指定字号下的宽度
function measureLine(text, fontSize, ctx) {
	if (ctx) {
		ctx.font = fontSize + 'px sans-serif'
		return ctx.measureText(text).width
	}
	return approxWidth(text, fontSize)
}

/**
 * 测量整块：返回最长行宽与总高
 * @param {Array} lines 形如 [{chars:[{char}...]}, ...]
 */
export function measure(lines, fontSize) {
	const ctx = getMeasureCtx()
	let maxW = 0
	for (const line of lines || []) {
		const text = (line.chars || []).map(c => c.char).join('')
		const w = measureLine(text, fontSize, ctx)
		if (w > maxW) maxW = w
	}
	const lineCount = Math.max(1, (lines || []).length)
	const totalH = lineCount * fontSize * 1.2
	return { maxW, totalH }
}

/**
 * 二分查找最大可用字号
 */
export function findFitFontSize(containerW, containerH, lines, padding = 40) {
	const W = Math.max(20, containerW - padding * 2)
	const H = Math.max(20, containerH - padding * 2)
	let lo = 12
	let hi = Math.floor(Math.min(W, H))
	let best = lo
	let guard = 0
	while (lo <= hi && guard++ < 40) {
		const mid = Math.floor((lo + hi) / 2)
		const { maxW, totalH } = measure(lines, mid)
		if (maxW <= W && totalH <= H) {
			best = mid
			lo = mid + 1
		} else {
			hi = mid - 1
		}
	}
	return best
}

/**
 * 根据 preset 计算实际字号
 * preset: fit | small | medium | large | xlarge | custom
 */
export function resolveFontSize(preset, customValue, containerW, containerH, lines) {
	const fitSize = findFitFontSize(containerW, containerH, lines)
	switch (preset) {
		case 'fit': return fitSize
		case 'small': return Math.round(fitSize * 0.4)
		case 'medium': return Math.round(fitSize * 0.6)
		case 'large': return Math.round(fitSize * 0.8)
		case 'xlarge': return Math.round(fitSize * 0.95)
		case 'custom': return customValue || fitSize
		default: return fitSize
	}
}

export const MIN_FONT = 12
