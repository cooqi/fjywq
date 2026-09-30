/**
 * 杯蜜像素形象 Canvas 渲染器（方案 A：像素网格 + 五官矢量基元，旧版 canvas-context 全端兼容）
 * 画布原生坐标 52×60，乘 scale 使用；绘制顺序：
 * 背发层 -> 身体(衣服) -> 头(肤色/刘海发色) -> 五官(表情) -> 腮红(女) -> 配饰图层(帽/巾/镜)
 */
import { GRID, PARTS, OUTFITS, HAIRS, EXPRESSIONS, ACCESSORIES, BLUSH, INK } from './look.js'

const W = GRID.cols * GRID.cell // 52
const H = GRID.rows * GRID.cell // 60

/** 归一化 look：任何字段缺失/非法都回落到性别默认，保证渲染永不崩 */
export function resolveLook(look) {
	const l = look && typeof look === 'object' ? look : {}
	const gender = l.gender === 'f' ? 'f' : 'm'
	const outfit = OUTFITS[l.outfit] && (OUTFITS[l.outfit].gender === gender || OUTFITS[l.outfit].gender === 'unisex')
		? l.outfit
		: (gender === 'f' ? 'rose-dress' : 'tee-blue')
	const hair = HAIRS[l.hair] ? l.hair : 'short'
	return {
		ver: 1,
		gender,
		skin: /^#[0-9a-fA-F]{6}$/.test(l.skin || '') ? l.skin : (gender === 'f' ? '#ffe1e6' : '#4fc3f7'),
		hairColor: /^#[0-9a-fA-F]{6}$/.test(l.hairColor || '') ? l.hairColor : (gender === 'f' ? '#e8437a' : '#4a4a55'),
		hair,
		outfit
	}
}

function paintGrid(ctx, rows, colorOf, scale) {
	const cs = GRID.cell * scale
	for (let r = 0; r < rows.length; r++) {
		const line = rows[r]
		for (let c = 0; c < line.length; c++) {
			const code = line.charCodeAt(c) - 48
			if (code <= 0) continue
			ctx.setFillStyle(colorOf(code))
			ctx.fillRect(c * cs, r * cs, cs, cs)
		}
	}
}

function partColorOf(part, l) {
	const outfit = OUTFITS[l.outfit]
	return (code) => {
		if (part.bangsUseHair && code === 1 && l.hair === 'long') return l.hairColor
		if (outfit && outfit.colors[code]) return outfit.colors[code]
		if (code === 2) return outfit ? (outfit.colors[1] || '#0a84ff') : '#0a84ff'
		return '#0a84ff'
	}
}

/** 基元绘制：椭圆/线/曲线均以小方格近似，保持像素风且兼容旧 canvas API */
function ellipseBox(ctx, x, y, rx, ry, color, scale, filled) {
	const s = GRID.cell * scale / 2
	for (let dy = -ry; dy <= ry; dy += 1) {
		for (let dx = -rx; dx <= rx; dx += 1) {
			if (dx * dx / (rx * rx) + dy * dy / (ry * ry) > 1) continue
			ctx.setFillStyle(color)
			ctx.fillRect((x + dx) * scale, (y + dy) * scale, filled ? s * 2 : s, s)
		}
	}
}

function lineBox(ctx, x1, y1, x2, y2, w, color, scale) {
	const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2
	ctx.setFillStyle(color)
	for (let i = 0; i <= steps; i++) {
		const t = i / steps
		ctx.fillRect((x1 + (x2 - x1) * t - w / 2) * scale, (y1 + (y2 - y1) * t - w / 2) * scale, w * scale, w * scale)
	}
}

function curveBox(ctx, x1, y1, cx, cy, x2, y2, color, scale) {
	const n = 24
	ctx.setFillStyle(color)
	for (let i = 0; i <= n; i++) {
		const t = i / n, mt = 1 - t
		const x = mt * mt * x1 + 2 * mt * t * cx + t * t * x2
		const y = mt * mt * y1 + 2 * mt * t * cy + t * t * y2
		ctx.fillRect(x * scale - scale, y * scale - scale, 2 * scale, 2 * scale)
	}
}

function drawPrim(ctx, p, scale) {
	switch (p.t) {
		case 'e': // 空心椭圆（眼睛轮廓）
			ellipseBox(ctx, p.x, p.y, p.rx, p.ry, p.col || INK, scale, false)
			break
		case 'ef': // 实心椭圆
			ellipseBox(ctx, p.x, p.y, p.rx, p.ry, p.col || INK, scale, true)
			break
		case 'c': // 高光圆点
			ellipseBox(ctx, p.x, p.y, p.r, p.r, p.col || '#fff', scale, true)
			break
		case 'r':
			ctx.setFillStyle(p.col || INK)
			ctx.fillRect(p.x * scale, p.y * scale, p.w * scale, p.h * scale)
			break
		case 'ln':
			lineBox(ctx, p.x1, p.y1, p.x2, p.y2, p.w || 1.6, p.col || INK, scale)
			break
		case 'q':
			curveBox(ctx, p.x1, p.y1, p.cx, p.cy, p.x2, p.y2, p.col || INK, scale)
			break
		case 'pw': { // 折线 / 多边形轮廓
			const pts = p.pts
			ctx.setFillStyle(p.col || INK)
			for (let i = 0; i < pts.length - 1; i++) lineBox(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1.6, p.col || INK, scale)
			if (p.fill) { // 简单扫描线填充（大笑张嘴）
				for (let y = Math.min(...pts.map(q => q[1])); y <= Math.max(...pts.map(q => q[1])); y++) {
					const xs = []
					for (let i = 0; i < pts.length; i++) {
						const a = pts[i], b = pts[(i + 1) % pts.length]
						if ((a[1] <= y && b[1] >= y) || (b[1] <= y && a[1] >= y)) {
							xs.push(a[0] + (b[0] - a[0]) * ((y - a[1]) / ((b[1] - a[1]) || 1)))
						}
					}
					if (xs.length >= 2) {
						ctx.fillRect(Math.min(...xs) * scale, y * scale, (Math.max(...xs) - Math.min(...xs)) * scale, scale)
					}
				}
			}
			break
		}
	}
}

function drawPrims(ctx, prims, scale) {
	for (const p of prims || []) {
		if (p.alpha) ctx.setGlobalAlpha ? ctx.setGlobalAlpha(p.alpha) : null
		drawPrim(ctx, p, scale)
		if (p.alpha && ctx.setGlobalAlpha) ctx.setGlobalAlpha(1)
	}
}

/**
 * 渲染杯蜜形象
 * @param {Object} ctx uni.createCanvasContext 返回值
 * @param {Object} rawLook pet.look（可空，自动归一化）
 * @param {String} expression 表情 key（smile/laugh/sad/angry/surprised/upset/cheeky/confused）
 * @param {Array} equipped 已穿戴配饰 key 列表（hat/scarf/glasses）
 * @param {Number} scale 放大倍数（cell*scale 像素）
 */
export function renderPet(ctx, rawLook, expression, equipped, scale = 3) {
	const l = resolveLook(rawLook)
	const exp = EXPRESSIONS[expression] ? expression : 'smile'
	const partHead = PARTS[l.gender === 'f' ? 'head-f' : 'head-m']
	const outfit = OUTFITS[l.outfit]
	const hair = HAIRS[l.hair]

	// 1. 背发层
	if (hair && hair.back && PARTS[hair.back]) {
		paintGrid(ctx, PARTS[hair.back].grid, () => l.hairColor, scale)
	}
	// 2. 身体（衣服）
	if (outfit && PARTS[outfit.shape]) {
		paintGrid(ctx, PARTS[outfit.shape].grid, partColorOf(outfit, l), scale)
	}
	// 3. 头（肤色；长发时刘海染成发色）
	paintGrid(ctx, partHead.grid, (code) => {
		if (code === 1) return partHead.bangsUseHair && l.hair === 'long' ? l.hairColor : l.skin
		return l.skin
	}, scale)
	// 4. 五官表情
	drawPrims(ctx, EXPRESSIONS[exp].prims, scale)
	// 5. 女生腮红
	if (l.gender === 'f') drawPrims(ctx, BLUSH, scale)
	// 6. 配饰图层（正交于 look，来自衣橱）
	const eq = Array.isArray(equipped) ? equipped : []
	for (const key of ['hat', 'scarf', 'glasses']) {
		if (!eq.includes(key)) continue
		const acc = ACCESSORIES[key]
		if (acc && acc.layer === 'accessory') drawPrims(ctx, acc.prims, scale)
	}

	ctx.draw && ctx.draw()
}

export const CANVAS_W = W
export const CANVAS_H = H
