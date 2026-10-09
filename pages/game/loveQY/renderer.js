/**
 * 杯蜜形象渲染器 v2 —— ren.html「极简电子小人 · 换装版」霓虹线条风（Canvas 逐帧）
 * 1. 坐标直接沿用 ren.html 的 SVG viewBox 源坐标（男生在左、女生在右，女生 = 男生 x + 200）；
 * 2. 按性别裁出单人画框 FRAME，统一乘 u 映射到逻辑画布 CANVAS_W×CANVAS_H，再乘调用方 scale，
 *    因此不使用 ctx 变换矩阵，全端（H5/小程序旧 canvas-context）表现一致；
 * 3. 颜色：线条色（头/四肢/五官）按性别固定，衣服色、头发色可在调色板中自定义；
 *    眼睛（含愤怒/晕眩的眉毛、爱心目、闭眼线）可按 look.eyeColors 左右异色，未选色的一侧用线条色；
 *    配饰（帽/巾/镜）默认同 ren.html 取衣服色作为 --acc 实色填充、描边用其暗色，
 *    可按 look.accColors 逐件逐片分色（帽/围巾 main，眼镜左右镜片 l/r）；
 * 4. 头发是可选部件（look.hair: none/short/long），默认不画，只有用户选了发型才叠加；
 * 5. 动画：呼吸浮动/弹跳/抖动/心跳/眼泪/眨眼/手臂摆动/Zzz 漂浮，由 opts.time 逐帧驱动，
 *    不传 time 则为静态帧（衣橱缩略图、明信片等一次性绘制场景）。
 */
import { OUTFITS, HAIRS, LOOK_VER, THEME_COLORS, THEME_DEFAULT, LINE_COLOR, faceFor } from './look.js'

// ================= 画框与逻辑尺寸 =================
// 画框预留了动画上浮空间（ren.html 的 translateY + 支点缩放最高能让内容上移约 26 源单位），
// 否则帽子/发顶在跳动时会戳出画布。
const FRAME = { m: { x: 24, y: -18, w: 160, h: 274 }, f: { x: 224, y: -18, w: 160, h: 274 } }
export const CANVAS_W = 52
export const CANVAS_H = 90
const DX = 200 // ren.html 女生整体右移量

// ================= 形体轮廓（源坐标） =================
const HEAD = {
	m: [{ t: 'rrect', x: 58, y: 30, w: 84, h: 84, r: 26 }],
	f: [{ t: 'circle', x: 300, y: 72, r: 42 }]
}
const BODY = {
	m: [{ t: 'rrect', x: 75, y: 120, w: 50, h: 54, r: 17 }],
	f: [{ t: 'path', d: 'M279 120 Q276 120 276 124 L268 169 Q267 174 272 174 L328 174 Q333 174 332 169 L324 124 Q324 120 321 120 Z' }]
}
const HAIR = {
	m: [{ t: 'path', d: 'M57 66 Q57 26 100 26 Q143 26 143 66 Q140 52 122 46 Q100 38 80 46 Q60 52 57 66 Z' }],
	f: [{ t: 'path', d: 'M258 82 C258 44 276 28 300 28 C324 28 342 44 342 82 C342 92 340 100 338 104 C334 94 332 82 330 70 C327 56 318 50 300 50 C282 50 273 56 270 70 C268 82 266 94 262 104 C260 100 258 92 258 82 Z' }]
}
// 长发：在基础发廓之外再叠两缕垂到肩下的发丝（仅 look.hair === 'long' 时叠加）
const HAIR_LONG = {
	m: [
		{ t: 'path', d: 'M60 62 C52 92 52 118 58 140 L74 140 C70 118 70 92 76 64 Z' },
		{ t: 'path', d: 'M140 62 C148 92 148 118 142 140 L126 140 C130 118 130 92 124 64 Z' }
	],
	f: [
		{ t: 'path', d: 'M262 94 C252 122 252 148 258 168 L276 168 C272 148 272 122 278 96 Z' },
		{ t: 'path', d: 'M338 94 C348 122 348 148 342 168 L324 168 C328 148 328 122 322 96 Z' }
	]
}
// 腿 + 脚（男女共用，女生 +200）
const LEGS = [
	{ t: 'line', x1: 87, y1: 170, x2: 87, y2: 220 },
	{ t: 'ellipse', x: 87, y: 224, rx: 8.5, ry: 5.5 },
	{ t: 'line', x1: 113, y1: 170, x2: 113, y2: 220 },
	{ t: 'ellipse', x: 113, y: 224, rx: 8.5, ry: 5.5 }
]
// 手臂：以肩为轴摆动（对应 ren.html armL/armR 的 rotate 关键帧）；cx/cy 为手掌圆心（源图略超手臂线末端）
const ARMS = [
	{ sx: 76, sy: 134, hx: 54, hy: 158, cx: 52, cy: 160, dir: 1 },
	{ sx: 124, sy: 134, hx: 146, hy: 158, cx: 148, cy: 160, dir: -1 }
]
const GROUND = { m: { x: 100, y: 234, rx: 50, ry: 9 }, f: { x: 300, y: 234, rx: 50, ry: 9 } }
const PIVOT = { m: { x: 100, y: 229 }, f: { x: 300, y: 229 } } // 动画缩放的支点（中心底部）

// ================= 8 张脸（男生坐标，女生整体 +200；s=样式，role=动画标记，side=属于哪只眼睛/眉毛）=================
// side 标 'l'/'r' 的形状受 look.eyeColors 控制（异瞳时左右可异色），未标者用性别线条色
const FACES = {
	normal: [
		{ t: 'circle', s: 'solid', role: 'eye', side: 'l', x: 80, y: 74, r: 7 },
		{ t: 'circle', s: 'solid', role: 'eye', side: 'r', x: 120, y: 74, r: 7 },
		{ t: 'path', s: 'stroke', d: 'M88 98 Q100 110 112 98' }
	],
	happy: [
		{ t: 'path', s: 'stroke', side: 'l', d: 'M70 79 Q80 65 90 79' },
		{ t: 'path', s: 'stroke', side: 'r', d: 'M110 79 Q120 65 130 79' },
		{ t: 'path', s: 'stroke', d: 'M84 94 Q100 116 116 94' },
		{ t: 'circle', s: 'blush', x: 66, y: 92, r: 5.5 },
		{ t: 'circle', s: 'blush', x: 134, y: 92, r: 5.5 }
	],
	love: [
		{ t: 'heart', s: 'solid', side: 'l', x: 80, y: 72 },
		{ t: 'heart', s: 'solid', side: 'r', x: 120, y: 72 },
		{ t: 'path', s: 'stroke', d: 'M86 96 Q100 112 114 96' }
	],
	wow: [
		{ t: 'circle', s: 'solid', side: 'l', x: 80, y: 71, r: 10 },
		{ t: 'circle', s: 'solid', side: 'r', x: 120, y: 71, r: 10 },
		{ t: 'ellipse', s: 'solid', x: 100, y: 102, rx: 7, ry: 9 }
	],
	sad: [
		{ t: 'circle', s: 'solid', role: 'eye', side: 'l', x: 80, y: 72, r: 6.5 },
		{ t: 'circle', s: 'solid', role: 'eye', side: 'r', x: 120, y: 72, r: 6.5 },
		{ t: 'ellipse', s: 'tear', role: 'tear', x: 72, y: 88, rx: 3.5, ry: 5 },
		{ t: 'path', s: 'stroke', d: 'M86 108 Q100 92 114 108' }
	],
	angry: [
		{ t: 'path', s: 'stroke', side: 'l', d: 'M67 58 L90 68' },
		{ t: 'path', s: 'stroke', side: 'r', d: 'M133 58 L110 68' },
		{ t: 'circle', s: 'solid', role: 'eye', side: 'l', x: 80, y: 78, r: 6.5 },
		{ t: 'circle', s: 'solid', role: 'eye', side: 'r', x: 120, y: 78, r: 6.5 },
		{ t: 'path', s: 'stroke', d: 'M88 106 Q100 97 112 106' }
	],
	sleepy: [
		{ t: 'path', s: 'stroke', side: 'l', d: 'M70 76 H90' },
		{ t: 'path', s: 'stroke', side: 'r', d: 'M110 76 H130' },
		{ t: 'path', s: 'stroke', d: 'M92 100 Q100 106 108 100' },
		{ t: 'text', s: 'z', role: 'z', zi: 0, x: 148, y: 64, text: 'z' },
		{ t: 'text', s: 'z', role: 'z', zi: 1, x: 158, y: 48, text: 'z' },
		{ t: 'text', s: 'z', role: 'z', zi: 2, x: 168, y: 32, text: 'z' }
	],
	dizzy: [
		{ t: 'path', s: 'stroke', side: 'l', d: 'M71 65 L89 83' },
		{ t: 'path', s: 'stroke', side: 'l', d: 'M89 65 L71 83' },
		{ t: 'path', s: 'stroke', side: 'r', d: 'M111 65 L129 83' },
		{ t: 'path', s: 'stroke', side: 'r', d: 'M129 65 L111 83' },
		{ t: 'path', s: 'stroke', d: 'M84 102 q8 -8 16 0 t16 0' }
	]
}
// ren.html 心动眼的爱心路径（局部坐标，配合 ts 缩放 + tx/ty 平移）
const HEART_D = 'M0,-4 C-1.5,-9 -9,-9 -9,-3 C-9,2 -3,7 0,10 C3,7 9,2 9,-3 C9,-9 1.5,-9 0,-4 Z'

// ================= 配饰（衣橱 equippedItems，几何形状逐条照搬 ren.html）=================
// 男女头型不同（男 84×84 圆角矩形、女 r42 圆），所以帽子形状分性别定义，不用简单位移套用；
// k = 图层样式：shape 实色配件 / lens 镜片（半透）/ line 镜腿与镜梁 / hl 白色高光
// side = 该形状属于哪片镜片（l 画面左侧 / r 画面右侧），眼镜按片取色，镜梁从中点拆开各归一边
const ACCESSORIES = {
	m: {
		hat: [
			{ k: 'shape', t: 'path', d: 'M56 60 Q56 18 100 18 Q144 18 144 60 Z' },
			{ k: 'shape', t: 'rrect', x: 52, y: 54, w: 96, h: 13, r: 6.5 },
			{ k: 'hl', t: 'ellipse', x: 86, y: 32, rx: 6, ry: 4.5 }
		],
		scarf: [
			{ k: 'shape', t: 'rrect', x: 76, y: 102, w: 48, h: 20, r: 10 },
			{ k: 'shape', t: 'path', d: 'M84 118 L79 150 Q78.5 153 82 153 L94 153 Q97 153 96.5 150 L94 118 Z' },
			{ k: 'hl', t: 'ellipse', x: 90, y: 110, rx: 12, ry: 3.5 }
		],
		glasses: [
			{ k: 'lens', side: 'l', t: 'circle', x: 80, y: 74, r: 13 },
			{ k: 'lens', side: 'r', t: 'circle', x: 120, y: 74, r: 13 },
			{ k: 'line', side: 'l', t: 'path', d: 'M93 74 L100 74' },
			{ k: 'line', side: 'r', t: 'path', d: 'M100 74 L107 74' },
			{ k: 'line', side: 'l', t: 'path', d: 'M67 72 L58 64' },
			{ k: 'line', side: 'r', t: 'path', d: 'M133 72 L142 64' },
			{ k: 'hl', side: 'l', t: 'circle', x: 75, y: 69, r: 3 },
			{ k: 'hl', side: 'r', t: 'circle', x: 115, y: 69, r: 3 }
		]
	},
	f: {
		hat: [
			{ k: 'shape', t: 'path', d: 'M258 62 Q258 20 300 20 Q342 20 342 62 Z' },
			{ k: 'shape', t: 'rrect', x: 254, y: 56, w: 92, h: 13, r: 6.5 },
			{ k: 'hl', t: 'ellipse', x: 286, y: 34, rx: 6, ry: 4.5 }
		],
		scarf: [
			{ k: 'shape', t: 'rrect', x: 276, y: 102, w: 48, h: 20, r: 10 },
			{ k: 'shape', t: 'path', d: 'M284 118 L279 150 Q278.5 153 282 153 L294 153 Q297 153 296.5 150 L294 118 Z' },
			{ k: 'hl', t: 'ellipse', x: 290, y: 110, rx: 12, ry: 3.5 }
		],
		glasses: [
			{ k: 'lens', side: 'l', t: 'circle', x: 280, y: 74, r: 13 },
			{ k: 'lens', side: 'r', t: 'circle', x: 320, y: 74, r: 13 },
			{ k: 'line', side: 'l', t: 'path', d: 'M293 74 L300 74' },
			{ k: 'line', side: 'r', t: 'path', d: 'M300 74 L307 74' },
			{ k: 'line', side: 'l', t: 'path', d: 'M267 72 L258 64' },
			{ k: 'line', side: 'r', t: 'path', d: 'M333 72 L342 64' },
			{ k: 'hl', side: 'l', t: 'circle', x: 275, y: 69, r: 3 },
			{ k: 'hl', side: 'r', t: 'circle', x: 315, y: 69, r: 3 }
		]
	}
}

// ================= 形象归一化 =================
const HEX_RE = /^#[0-9a-fA-F]{6}$/
/** 旧色值（非调色板）就近映射到 ren.html 霓虹色板，保证存量形象也有合适的线条配色 */
function nearestPalette(hex) {
	if (!HEX_RE.test(hex || '')) return null
	const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
	let best = null, dist = 1e9
	for (const c of THEME_COLORS) {
		const d = [1, 3, 5].reduce((s, i) => s + Math.pow(parseInt(c.slice(i, i + 2), 16) - rgb[(i - 1) / 2], 2), 0)
		if (d < dist) { dist = d; best = c }
	}
	return best
}
const palOr = (v, dft) => (THEME_COLORS.indexOf(v) >= 0 ? v : (nearestPalette(v) || dft))
/** 分部位取色：只认调色板内的色值，其余一律归为空串（= 跟随默认色，保证存量形象行为不变） */
const palOrFollow = (v) => (THEME_COLORS.indexOf(v) >= 0 ? v : '')

/** 归一化 look：任何字段缺失/非法都回落到性别默认，保证渲染永不崩 */
export function resolveLook(look) {
	const l = look && typeof look === 'object' ? look : {}
	const gender = l.gender === 'f' ? 'f' : 'm'
	const base = THEME_DEFAULT[gender]
	const outfit = OUTFITS[l.outfit] && (OUTFITS[l.outfit].gender === gender || OUTFITS[l.outfit].gender === 'unisex')
		? l.outfit : (gender === 'f' ? 'rose-dress' : 'tee-blue')
	const outfitColor = (l.outfit && OUTFITS[l.outfit]) ? (OUTFITS[l.outfit].colors || {})[1] : ''
	const eye = l.eyeColors || {}
	const acc = l.accColors || {}
	const accPart = (v) => ({ main: palOrFollow((v || {}).main) })
	const glasses = acc.glasses || {}
	return {
		ver: LOOK_VER, gender,
		skin: HEX_RE.test(l.skin || '') ? l.skin : (gender === 'f' ? '#ffe1e6' : '#4fc3f7'),
		// 头发为可选造型，未选/非法均为无发（不能默认长头发）
		hair: HAIRS[l.hair] ? l.hair : 'none',
		outfit,
		clothColor: palOr(l.clothColor || outfitColor, base.cloth),
		hairColor: palOr(l.hairColor, base.hair),
		// 眼睛左右可异色（空串 = 该侧用性别线条色）
		eyeColors: { l: palOrFollow(eye.l), r: palOrFollow(eye.r) },
		// 配饰配色：帽/围巾整体一色，眼镜左右镜片各一色（空串 = 跟随衣服色）
		accColors: { hat: accPart(acc.hat), scarf: accPart(acc.scarf), glasses: { l: palOrFollow(glasses.l), r: palOrFollow(glasses.r) } }
	}
}

// ================= SVG path 迷你解析（M/L/H/V/C/Q/T/Z，支持小写相对） =================
const CMD_RE = /[MmLlHhVvCcQqTtZz][^MmLlHhVvCcQqTtZz]*/g
const NUM_RE = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi
const pathCache = {}
function parsePath(d) {
	if (pathCache[d]) return pathCache[d]
	const out = []
	let m
	CMD_RE.lastIndex = 0
	while ((m = CMD_RE.exec(d)) !== null) {
		out.push({ c: m[0][0], n: (m[0].slice(1).match(NUM_RE) || []).map(Number) })
	}
	pathCache[d] = out
	return out
}
const K = 0.5523 // 圆/椭圆四段贝塞尔逼近系数

function traceEllipse(ctx, cx, cy, rx, ry, map) {
	const a = map(cx, cy - ry)
	ctx.moveTo(a[0], a[1])
	let p1 = map(cx + K * rx, cy - ry), p2 = map(cx + rx, cy - K * ry), e = map(cx + rx, cy)
	ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], e[0], e[1])
	p1 = map(cx + rx, cy + K * ry); p2 = map(cx + K * rx, cy + ry); e = map(cx, cy + ry)
	ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], e[0], e[1])
	p1 = map(cx - K * rx, cy + ry); p2 = map(cx - rx, cy + K * ry); e = map(cx - rx, cy)
	ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], e[0], e[1])
	p1 = map(cx - rx, cy - K * ry); p2 = map(cx - K * rx, cy - ry); e = map(cx, cy - ry)
	ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], e[0], e[1])
	ctx.closePath()
}
function traceRrect(ctx, x, y, w, h, r, map) {
	r = Math.min(r, w / 2, h / 2)
	let p = map(x + r, y)
	ctx.moveTo(p[0], p[1])
	p = map(x + w - r, y); ctx.lineTo(p[0], p[1])
	let c = map(x + w, y); p = map(x + w, y + r)
	ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
	p = map(x + w, y + h - r); ctx.lineTo(p[0], p[1])
	c = map(x + w, y + h); p = map(x + w - r, y + h)
	ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
	p = map(x + r, y + h); ctx.lineTo(p[0], p[1])
	c = map(x, y + h); p = map(x, y + h - r)
	ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
	p = map(x, y + r); ctx.lineTo(p[0], p[1])
	c = map(x, y); p = map(x + r, y)
	ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
	ctx.closePath()
}
/** 把 path d 逐段映射为 canvas 路径命令（坐标已由 map 转成设备像素） */
function tracePath(ctx, d, map) {
	const segs = parsePath(d)
	let cx = 0, cy = 0, qx = 0, qy = 0
	for (let s = 0; s < segs.length; s++) {
		const seg = segs[s], kind = seg.c.toUpperCase(), rel = seg.c !== kind, n = seg.n
		const A = (v, base) => (rel ? base + v : v)
		if (kind === 'M') {
			cx = A(n[0], cx); cy = A(n[1], cy); qx = cx; qy = cy
			const p = map(cx, cy); ctx.moveTo(p[0], p[1])
		} else if (kind === 'L') {
			cx = A(n[0], cx); cy = A(n[1], cy); qx = cx; qy = cy
			const p = map(cx, cy); ctx.lineTo(p[0], p[1])
		} else if (kind === 'H') {
			cx = A(n[0], cx); const p = map(cx, cy); ctx.lineTo(p[0], p[1])
		} else if (kind === 'V') {
			cy = A(n[0], cy); const p = map(cx, cy); ctx.lineTo(p[0], p[1])
		} else if (kind === 'Q') {
			const ax = A(n[0], cx), ay = A(n[1], cy)
			cx = A(n[2], cx); cy = A(n[3], cy); qx = ax; qy = ay
			const c = map(ax, ay), p = map(cx, cy)
			ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
		} else if (kind === 'T') {
			const ax = 2 * cx - qx, ay = 2 * cy - qy
			cx = A(n[0], cx); cy = A(n[1], cy); qx = ax; qy = ay
			const c = map(ax, ay), p = map(cx, cy)
			ctx.quadraticCurveTo(c[0], c[1], p[0], p[1])
		} else if (kind === 'C') {
			const p1x = A(n[0], cx), p1y = A(n[1], cy)
			const p2x = A(n[2], cx), p2y = A(n[3], cy)
			cx = A(n[4], cx); cy = A(n[5], cy); qx = p2x; qy = p2y
			const a = map(p1x, p1y), b = map(p2x, p2y), p = map(cx, cy)
			ctx.bezierCurveTo(a[0], a[1], b[0], b[1], p[0], p[1])
		} else if (kind === 'Z') {
			ctx.closePath()
		}
	}
}
/** 单个形状（path/rrect/circle/ellipse/line/heart）落到当前路径上 */
function traceShape(ctx, sh, map) {
	if (sh.t === 'path' || sh.t === 'heart') {
		tracePath(ctx, sh.t === 'heart' ? HEART_D : sh.d, sh.t === 'heart'
			? (a, b) => map(sh.x + a * 0.78, sh.y + b * 0.78)
			: map)
	} else if (sh.t === 'rrect') {
		traceRrect(ctx, sh.x, sh.y, sh.w, sh.h, sh.r, map)
	} else if (sh.t === 'circle') {
		traceEllipse(ctx, sh.x, sh.y, sh.r, sh.r, map)
	} else if (sh.t === 'ellipse') {
		traceEllipse(ctx, sh.x, sh.y, sh.rx, sh.ry, map)
	} else if (sh.t === 'line') {
		const a = map(sh.x1, sh.y1), b = map(sh.x2, sh.y2)
		ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1])
	}
}

// ================= 样式绘制 =================
const rgba = (hex, a) => {
	const h = String(hex || '').replace('#', '')
	const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h
	return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`
}
/** 同 ren.html 的 darken(hex, amt)：配饰描边用衣服色的暗色版（返回 hex，便于 rgba 取光晕色） */
const darken = (hex, amt) => {
	const h = String(hex || '').replace('#', '')
	const s = h.length === 3 ? h.split('').map(c => c + c).join('') : h
	const ch = (i) => ('0' + Math.round(parseInt(s.slice(i, i + 2), 16) * amt).toString(16)).slice(-2)
	return `#${ch(0)}${ch(2)}${ch(4)}`
}
function begin(ctx) { if (ctx.beginPath) ctx.beginPath() }
function setCap(ctx) {
	if (ctx.setLineCap) ctx.setLineCap('round')
	if (ctx.setLineJoin) ctx.setLineJoin('round')
}
function setGlow(ctx, blur, color) {
	if (!ctx.setShadow) return
	if (blur > 0) ctx.setShadow(0, 0, blur, color)
	else ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
}
/** 填充 + 描边（头/身体/头发这类带霓虹光晕的形体） */
function paintShape(ctx, sh, map, u, opt) {
	begin(ctx)
	traceShape(ctx, sh, map)
	if (opt.fill) {
		setGlow(ctx, 0)
		ctx.setFillStyle(opt.fill)
		ctx.fill()
	}
	if (opt.stroke) {
		setGlow(ctx, opt.glow || 0, rgba(opt.stroke, 0.45))
		ctx.setStrokeStyle(opt.stroke)
		ctx.setLineWidth(opt.width || 4 * u)
		setCap(ctx)
		// 只描边形状需要重新起笔（fill 已消费路径）
		begin(ctx)
		traceShape(ctx, sh, map)
		ctx.stroke()
		setGlow(ctx, 0)
	}
}
function paintGroup(ctx, shapes, map, u, opt) {
	for (let i = 0; i < shapes.length; i++) paintShape(ctx, shapes[i], map, u, opt)
}
/** 地面光晕：三层同心椭圆近似 ren.html 的 radialGradient */
function paintGround(ctx, g, map, u, color) {
	const layers = [[1, 0.10], [0.66, 0.16], [0.34, 0.24]]
	for (let i = 0; i < layers.length; i++) {
		const k = layers[i][0]
		begin(ctx)
		traceEllipse(ctx, g.x, g.y, g.rx * k, g.ry * k, map)
		ctx.setFillStyle(rgba(color, layers[i][1]))
		ctx.fill()
	}
}
/** 配饰图层样式：k 决定实色配件 / 半透镜片 / 镜腿镜梁 / 白色高光，color 由调用方按片给定（眼镜可左右异色） */
function accStyle(k, color, u) {
	const dark = darken(color, 0.55)
	if (k === 'lens') return { fill: rgba(color, 0.72), stroke: dark, width: 2.5 * u, glow: 6 * u }
	if (k === 'line') return { stroke: dark, width: 3.5 * u, glow: 6 * u }
	if (k === 'hl') return { fill: 'rgba(255,255,255,0.35)' }
	return { fill: color, stroke: dark, width: 2.5 * u, glow: 7 * u }
}

// ================= 逐帧动画 =================
const TAU = Math.PI * 2
/** 按当前脸与时间算出整体位移/缩放与局部动画参数（对应 ren.html 的 CSS 关键帧） */
function animOf(face, t) {
	const a = { dx: 0, dy: 0, kx: 1, ky: 1, eyeKy: 1, tearY: 0, tearA: 1, arm: 0, zY: [0, 0, 0], zA: [1, 1, 1] }
	if (!t || t < 0) return a
	const ph = (ms) => (t % ms) / ms
	a.arm = 8 * Math.sin(TAU * ph(2600)) * Math.PI / 180 // 手臂 ±8°
	switch (face) {
		case 'happy': { // bounce 1s
			const p = ph(1000)
			a.dy = -14 * Math.abs(Math.sin(Math.PI * p))
			a.ky = 1 + 0.04 * Math.cos(TAU * p)
			a.kx = 2 - a.ky
			break
		}
		case 'love': { // beat 1.15s
			const p = ph(1150)
			const s = Math.max(0, Math.sin(TAU * p))
			a.kx = a.ky = 1 + 0.06 * s
			break
		}
		case 'wow': { // pop 1.15s
			const p = ph(1150)
			a.dy = p < 0.15 ? -16 * (p / 0.15) : (p < 0.42 ? -16 * (1 - (p - 0.15) / 0.27) : 0)
			a.ky = p < 0.42 ? 1 + 0.05 * Math.sin(Math.PI * (p / 0.42)) : 1
			break
		}
		case 'sad': { // droop 3s
			const p = ph(3000)
			a.dy = 2 + 7 * (0.5 - 0.5 * Math.cos(TAU * p))
			break
		}
		case 'angry': { // shake 0.16s
			a.dx = 2.5 * Math.sin(TAU * ph(160))
			break
		}
		case 'sleepy': { // sway 3.8s（以横向漂移近似左右摇摆）
			a.dx = 4 * Math.sin(TAU * ph(3800))
			break
		}
		case 'dizzy': { // tilt 1.4s
			const s = Math.sin(TAU * ph(1400))
			a.dx = 6 * s
			a.dy = -2 * Math.abs(s)
			break
		}
		default: { // normal float 3.6s
			a.dy = -7 * (0.5 - 0.5 * Math.cos(TAU * ph(3600)))
		}
	}
	if (face === 'normal') { // blink 4.2s：93%→97.5% 平滑闭眼（同 ren.html 关键帧插值）
		const p = ph(4200)
		if (p > 0.93 && p < 0.975) a.eyeKy = 1 - 0.9 * Math.sin(Math.PI * (p - 0.93) / 0.045)
	}
	if (face === 'sad') { // tearDrop 1.9s：眼泪下落并淡出
		const p = ph(1900)
		a.tearY = 24 * Math.min(1, p / 0.85)
		a.tearA = p < 0.18 ? (p / 0.18) : Math.max(0, 1 - (p - 0.18) / 0.82)
	}
	if (face === 'sleepy') { // zfloat 2.2s，三颗 z 依次延迟
		for (let i = 0; i < 3; i++) {
			const p = ph(2200) + i * 0.2
			a.zY[i] = -6 * Math.sin(TAU * (p % 1))
			a.zA[i] = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(TAU * (p % 1)))
		}
	}
	return a
}

// ================= 主渲染 =================
/**
 * 渲染杯蜜形象
 * @param {Object} ctx uni.createCanvasContext 返回值
 * @param {Object} rawLook pet.look（可空，自动归一化；含 clothColor/hairColor/eyeColors/accColors）
 * @param {String} expression 表情 key（旧 smile/laugh/… 与新 normal/happy/… 均可）
 * @param {Array} equipped 已穿戴配饰 key 列表（hat/scarf/glasses）
 * @param {Number} scale 放大倍数（逻辑画布 × scale = 像素）
 * @param {Object} opts { time: 逐帧动画毫秒；flush: 是否内部 ctx.draw()，默认 true }
 */
export function renderPet(ctx, rawLook, expression, equipped, scale = 3, opts) {
	const o = opts || {}
	const l = resolveLook(rawLook)
	const face = faceFor(expression)
	const g = l.gender
	const frame = FRAME[g]
	const u = (CANVAS_W * scale) / frame.w
	const line = LINE_COLOR[g]
	const cloth = l.clothColor
	const hair = l.hairColor
	const dx0 = g === 'f' ? DX : 0 // 统一把「男生坐标数据」平移到女生位置
	const an = animOf(face, o.time || 0)
	const pv = PIVOT[g]

	// 坐标映射：源坐标 -> 画框内设备像素（含整体位移与支点缩放）
	const map = (x, y) => [
		(pv.x + (x - pv.x) * an.kx + an.dx - frame.x) * u,
		(pv.y + (y - pv.y) * an.ky + an.dy - frame.y) * u
	]
	// 女生数据 = 男生坐标 +200：对只写了男生坐标的部分用 shifted 映射
	const mapS = (x, y) => map(x + dx0, y)

	// 1. 地面光晕
	paintGround(ctx, GROUND[g], map, u, line)

	// 2. 手臂（绕肩摆动）+ 手
	for (let i = 0; i < ARMS.length; i++) {
		const arm = ARMS[i]
		const ang = an.arm * arm.dir
		const cos = Math.cos(ang), sin = Math.sin(ang)
		const rot = (px, py) => [arm.sx + (px - arm.sx) * cos - (py - arm.sy) * sin, arm.sy + (px - arm.sx) * sin + (py - arm.sy) * cos]
		const h = rot(arm.hx, arm.hy)
		const c = rot(arm.cx, arm.cy)
		paintShape(ctx, { t: 'line', x1: arm.sx, y1: arm.sy, x2: h[0], y2: h[1] }, mapS, u, { stroke: line, width: 4 * u })
		paintShape(ctx, { t: 'circle', x: c[0], y: c[1], r: 7.5 }, mapS, u, { fill: rgba(line, 0.9) })
	}

	// 3. 腿 + 脚（.solid 仅填色，无描边，同 ren.html）
	for (let i = 0; i < LEGS.length; i++) {
		const sh = LEGS[i]
		paintShape(ctx, sh, mapS, u, sh.t === 'line'
			? { stroke: line, width: 4 * u }
			: { fill: rgba(line, 0.9) })
	}

	// 4. 身体（衣服色）
	paintGroup(ctx, BODY[g], map, u, { fill: rgba(cloth, 0.08), stroke: cloth, width: 3.5 * u, glow: 8 * u })
	// 5. 头（线条色）
	paintGroup(ctx, HEAD[g], map, u, { fill: rgba(line, 0.07), stroke: line, width: 3.5 * u, glow: 8 * u })
	// 6. 头发（可选部件：无发时不画，长发额外叠加垂肩发缕）
	if (l.hair !== 'none') {
		const hairOpt = { fill: rgba(hair, 0.22), stroke: hair, width: 3.5 * u, glow: 8 * u }
		paintGroup(ctx, HAIR[g], map, u, hairOpt)
		if (l.hair === 'long') paintGroup(ctx, HAIR_LONG[g], map, u, hairOpt)
	}

	// 7. 表情（男生坐标 + 性别平移）
	const faces = FACES[face] || FACES.normal
	for (let i = 0; i < faces.length; i++) {
		const f = faces[i]
		if (f.t === 'text') {
			// 透明度直接写进 rgba（小程序部分 Canvas 实现不支持 setGlobalAlpha）
			const p = mapS(f.x, f.y + (an.zY[f.zi] || 0))
			ctx.setFillStyle(rgba(line, Math.max(0.1, an.zA[f.zi])))
			if (ctx.setFontSize) ctx.setFontSize(Math.max(8, Math.round(16 * u)))
			ctx.fillText(f.text, p[0], p[1])
			continue
		}
		const sh = f.role === 'tear' ? Object.assign({}, f, { y: f.y + an.tearY }) : f
		// 眼睛/眉毛可按侧取色（异瞳），未选色的一侧仍用性别线条色
		const eyeColor = (f.side && l.eyeColors[f.side]) || line
		let opt
		if (f.s === 'stroke') opt = { stroke: eyeColor, width: 4 * u }
		else if (f.s === 'blush') opt = { fill: 'rgba(255,143,177,0.55)' }
		else if (f.s === 'tear') opt = { fill: `rgba(125,211,252,${Math.max(0.15, an.tearA)})` }
		else opt = { fill: rgba(eyeColor, 0.95) }
		// 眨眼：只压扁眼睛（以眼心为支点），整体位移/缩放仍跟随全身
		const m = f.role === 'eye' && an.eyeKy !== 1
			? (x, y) => [
				(pv.x + (x + dx0 - pv.x) * an.kx + an.dx - frame.x) * u,
				(pv.y + (f.y + (y - f.y) * an.eyeKy - pv.y) * an.ky + an.dy - frame.y) * u
			]
			: mapS
		paintShape(ctx, sh, m, u, opt)
	}

	// 8. 配饰图层（正交于 look，来自衣橱 equippedItems）
	// 同 ren.html：默认取衣服色 --acc 做填充，描边取 darken(--acc, .55)；
	// 可按 look.accColors 逐件逐片分色（帽/围巾看 main，眼镜按镜片左右侧），未设色的回落衣服色
	const eq = Array.isArray(equipped) ? equipped : []
	for (const key of ['hat', 'scarf', 'glasses']) {
		const shapes = ACCESSORIES[g][key]
		if (!eq.includes(key) || !shapes) continue
		const part = l.accColors[key]
		for (let i = 0; i < shapes.length; i++) {
			const sh = shapes[i]
			const accColor = (sh.side ? part[sh.side] : part.main) || cloth
			// 配饰坐标已是当前性别的绝对坐标，用 map 而非 mapS
			paintShape(ctx, sh, map, u, accStyle(sh.k, accColor, u))
		}
	}

	if (o.flush !== false && ctx.draw) ctx.draw()
}
