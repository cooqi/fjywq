/**
 * 杯蜜形象注册表（look）——xx.md SVG 模板部件化后的像素网格数据
 * 设计原则（形象/状态分离）：
 * 1. look 只存 key/色值（gender/skin/hair/outfit），存于 beemore_pets.look，服务端白名单校验；
 * 2. 表情 expression 不入库，由 mood 实时推导（MOOD_EXPRESSION），事件可瞬时覆盖；
 * 3. 配饰（帽/巾/镜）属于衣橱 equippedItems，渲染为 accessory 图层，与 look 正交；
 *    配色例外：帽/围巾整体一色、眼镜左右镜片各一色，存于 look.accColors
 *    {hat:{main},scarf:{main},glasses:{l,r}}；眼睛（含眉毛）也按 look.eyeColors {l,r} 左右异色，
 *    空串均表示“跟随”（配饰跟衣服色、眼睛跟性别线条色）；
 *    这样所有 renderPet 调用点（主面板/造型间/衣橱/明信片）只传 look 就能带上这些颜色；
 * 4. 新增部件 = 在注册表加一条，存量数据自动兼容；废弃部件保留 key 并打 deprecated。
 * 必须使用 ESM 导出（common/js 模块规范），禁止 module.exports
 */

// ============ 基础网格：13 列 × 15 行，单元格 4px（原生坐标 52×60）============
// 字符即色码：0 透明 1 主色 2 辅色 3 瞳色(ink) 4 高光 5 腮红 6 泪 7 舌头 8 嘴唇
export const GRID = { cols: 13, rows: 15, cell: 4 }

// 男头轮廓（xx.md #pixel-head，1=肤色）
export const HEAD_M = [
	'0000111110000',
	'0001000001000',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0001000001000',
	'0001111111000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000'
]

// 女头轮廓（xx.md #pixel-head-f；首行=刘海，长发造型时染成发色 bangsUseHair）
export const HEAD_F = [
	'0000111110000',
	'0001000001000',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0010000000100',
	'0001000001000',
	'0001111111000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000'
]

// T 恤身体（xx.md #pixel-body，男）
export const BODY_TEE = [
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000111111000',
	'0001111111100',
	'0000111111000',
	'0000110011000',
	'0000110011000',
	'0000000000000'
]

// 裙子身体（xx.md #dress-body，女；2=腿色）
export const BODY_DRESS = [
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000111111000',
	'0001111111100',
	'0011111111110',
	'1111111111111',
	'0001122110000',
	'0000000000000'
]

// 长发背发+蝴蝶结（xx.md #long-hair 部件化；先于头部绘制）
export const HAIR_LONG = [
	'0000000111100',
	'0100000000010',
	'1000000000001',
	'1000000000001',
	'1000000000001',
	'1000000000001',
	'1000000000001',
	'1000000000001',
	'1000000000001',
	'0100000000010',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000',
	'0000000000000'
]

export const PARTS = {
	'head-m': { grid: HEAD_M },
	'head-f': { grid: HEAD_F, bangsUseHair: true },
	'body-tee': { grid: BODY_TEE },
	'body-dress': { grid: BODY_DRESS },
	'hair-long': { grid: HAIR_LONG }
}

// ============ 色板（前端选择器；服务端按十六进制格式校验）============
export const SKIN_COLORS = ['#4fc3f7', '#ffd9b3', '#ffe1e6', '#c68e5a']
export const HAIR_COLORS = ['#e8437a', '#4a4a55', '#8d5a2b', '#ffb300', '#7f9cf5']
export const INK = '#1a1a2e'
export const C = { tear: '#00d4ff', tongue: '#ff6b9d', lip: '#ff8fab' }

// ============ ren.html 霓虹线条形象专用：8 色调色板（与服务端 LOOK_PARTS.themeColors 同步）============
export const THEME_COLORS = ['#5eead4', '#14b8a6', '#f9a8d4', '#ec4899', '#c4b5fd', '#fde68a', '#fdba74', '#93c5fd']
// 形象数据版本：ver:3 起头发为可选部件（默认无发），与服务端 LOOK_PARTS.VER 同步
export const LOOK_VER = 3
// 默认色对齐 ren.html：男衣青/男发深青/女衣粉/女发玫红
export const THEME_DEFAULT = {
	m: { cloth: '#5eead4', hair: '#14b8a6' },
	f: { cloth: '#f9a8d4', hair: '#ec4899' }
}
// 线条（头/四肢/五官）固定色，同 ren.html 的 --line，不开放自定义
export const LINE_COLOR = { m: '#5eead4', f: '#f9a8d4' }

// ============ ren.html 8 张脸：旧表情 key →新脸的别名（保持存量调用/mood 映射可用）============
export const FACE_KEYS = ['normal', 'happy', 'love', 'wow', 'sad', 'angry', 'sleepy', 'dizzy']
export const FACE_LABEL = { normal: '平静', happy: '开心', love: '心动', wow: '惊讶', sad: '难过', angry: '生气', sleepy: '困倦', dizzy: '晕眩' }
export const FACE_ALIAS = {
	normal: 'normal', smile: 'normal',
	happy: 'happy', laugh: 'happy',
	love: 'love', cheeky: 'love',
	wow: 'wow', surprised: 'wow',
	sad: 'sad', upset: 'sad',
	angry: 'angry',
	sleepy: 'sleepy',
	dizzy: 'dizzy', confused: 'dizzy'
}
export function faceFor(expression) { return FACE_ALIAS[expression] || 'normal' }

// ============ 衣服注册表（gender: m/f/unisex；colors 按色码 1/2 映射）============
export const OUTFITS = {
	'tee-blue': { name: '蓝色T恤', gender: 'm', shape: 'body-tee', colors: { 1: '#0a84ff' } },
	'tee-green': { name: '绿色T恤', gender: 'm', shape: 'body-tee', colors: { 1: '#34c759' } },
	'hoodie-gray': { name: '灰色卫衣', gender: 'm', shape: 'body-tee', colors: { 1: '#8e8e93' } },
	'sky-dress': { name: '天蓝连衣裙', gender: 'f', shape: 'body-dress', colors: { 1: '#5ac8fa', 2: '#d6ecff' } },
	'rose-dress': { name: '玫粉连衣裙', gender: 'f', shape: 'body-dress', colors: { 1: '#ff6b9d', 2: '#ffb8d0' } },
	'sun-dress': { name: '向日葵裙', gender: 'f', shape: 'body-dress', colors: { 1: '#ffb800', 2: '#ffe9ad' } },
	'denim-uniform': { name: '牛仔工装', gender: 'unisex', shape: 'body-tee', colors: { 1: '#3f51b5' } },
	'leaf-uniform': { name: '小翠制服', gender: 'unisex', shape: 'body-dress', colors: { 1: '#43e97b', 2: '#c8f7d8' } }
}

// ============ 发型（可选部件：none 光头 / short 贴头短发 / long 垂肩长发）============
// 头发不是默认长在头上，而是用户在「造型间」主动选择；发色仅在非 none 时生效
export const HAIR_KEYS = ['none', 'short', 'long']
export const HAIRS = {
	none: { name: '无发' },
	short: { name: '短发' },
	long: { name: '长发' }
}

// ============ 五官表情图层（8 种，对齐 xx.md 表情；primitives 为原生 52×60 坐标）============
// 类型：e 椭圆 / ef 实心椭圆 / c 高光圆 / r 像素块 / ln 直线 / q 二次贝塞尔 / pw 多边形
export const EXPRESSIONS = {
	smile: { prims: [
		{ t: 'e', x: 20, y: 16, rx: 2.5, ry: 3 }, { t: 'e', x: 36, y: 16, rx: 2.5, ry: 3 },
		{ t: 'c', x: 21, y: 15, r: 1 }, { t: 'c', x: 37, y: 15, r: 1 },
		{ t: 'q', x1: 18, y1: 24, cx: 28, cy: 30, x2: 38, y2: 24 }
	] },
	laugh: { prims: [
		{ t: 'q', x1: 14, y1: 16, cx: 20, cy: 10, x2: 26, y2: 16 },
		{ t: 'q', x1: 30, y1: 16, cx: 36, cy: 10, x2: 42, y2: 16 },
		{ t: 'pw', fill: true, pts: [[16, 22], [28, 36], [40, 22]] },
		{ t: 'q', x1: 20, y1: 25, cx: 28, cy: 30, x2: 36, y2: 25, col: C.tongue }
	] },
	sad: { prims: [
		{ t: 'e', x: 20, y: 16, rx: 2.5, ry: 3 }, { t: 'e', x: 36, y: 16, rx: 2.5, ry: 3 },
		{ t: 'c', x: 21, y: 15, r: 1 }, { t: 'c', x: 37, y: 15, r: 1 },
		{ t: 'r', x: 19, y: 20, w: 2, h: 4, col: C.tear },
		{ t: 'q', x1: 18, y1: 26, cx: 28, cy: 20, x2: 38, y2: 26 }
	] },
	angry: { prims: [
		{ t: 'e', x: 20, y: 17, rx: 2.5, ry: 3 }, { t: 'e', x: 36, y: 17, rx: 2.5, ry: 3 },
		{ t: 'ln', x1: 14, y1: 10, x2: 24, y2: 13 }, { t: 'ln', x1: 42, y1: 10, x2: 32, y2: 13 },
		{ t: 'q', x1: 18, y1: 27, cx: 28, cy: 22, x2: 38, y2: 27 }
	] },
	surprised: { prims: [
		{ t: 'e', x: 20, y: 16, rx: 3.5, ry: 4 }, { t: 'e', x: 36, y: 16, rx: 3.5, ry: 4 },
		{ t: 'c', x: 21, y: 14, r: 1.3 }, { t: 'c', x: 37, y: 14, r: 1.3 },
		{ t: 'ef', x: 28, y: 26, rx: 3, ry: 3.5 }
	] },
	upset: { prims: [
		{ t: 'q', x1: 16, y1: 15, cx: 20, cy: 18, x2: 24, y2: 15 },
		{ t: 'q', x1: 32, y1: 15, cx: 36, cy: 18, x2: 40, y2: 15 },
		{ t: 'q', x1: 20, y1: 27, cx: 28, cy: 23, x2: 36, y2: 27 }
	] },
	cheeky: { prims: [
		{ t: 'e', x: 20, y: 15, rx: 3, ry: 3.5 }, { t: 'e', x: 36, y: 16, rx: 2, ry: 2.5 },
		{ t: 'c', x: 21, y: 13, r: 1 }, { t: 'c', x: 37, y: 15, r: 0.8 },
		{ t: 'q', x1: 18, y1: 24, cx: 28, cy: 30, x2: 38, y2: 22 },
		{ t: 'pw', pts: [[26, 25], [28, 32], [30, 25]], col: C.tongue }
	] },
	confused: { prims: [
		{ t: 'e', x: 20, y: 16, rx: 3, ry: 3.5 }, { t: 'e', x: 36, y: 15, rx: 2.2, ry: 2.8 },
		{ t: 'c', x: 21, y: 14, r: 1 }, { t: 'c', x: 37, y: 13, r: 0.8 },
		{ t: 'pw', pts: [[48, 10], [51, 10], [50, 14], [52, 14], [50, 18]], col: '#ffb800' },
		{ t: 'r', x: 50, y: 20, w: 2, h: 2, col: '#ffb800' },
		{ t: 'pw', pts: [[18, 26], [22, 23], [26, 26], [30, 29], [34, 26], [38, 23], [40, 26]] }
	] }
}

// 女生腮红（所有表情通用，绘制于五官之后）
export const BLUSH = [
	{ t: 'e', x: 14, y: 22, rx: 2.5, ry: 1.5, col: C.tongue, alpha: 0.6 },
	{ t: 'e', x: 42, y: 22, rx: 2.5, ry: 1.5, col: C.tongue, alpha: 0.6 }
]

// ============ 配色扩展（眼睛 + 配饰）============
// look.eyeColors = { l, r }：性别决定的线条色作为底色，用户可给左/右眼单独上色（异瞳），值取自 THEME_COLORS
// look.accColors = { hat:{main}, scarf:{main}, glasses:{l, r} }：空串表示该处跟随（眼睛跟线条色，配饰跟衣服色）
// 存量形象无这些字段时行为不变，所以不升 ver（升 ver 会把发型重置成无发）
export const FOLLOW_DEFAULT = ''
/** 取分部位色值，未设置返回空串（由 renderer 回落到线条色/衣服色） */
export function accColorOf(accColors, accKey, side) {
	const one = (accColors || {})[accKey]
	return (one && one[side]) || FOLLOW_DEFAULT
}

// ============ 配饰图层（像素网格时代的遗留数据，已不再使用）============
// 帽子/围巾/眼镜现由 renderer.js 的 ACCESSORIES（按 ren.html 几何形状）绘制，
// 默认取衣服色，可按 look.accColors 逐件逐片分色
export const ACCESSORIES = {
	hat: { layer: 'accessory', prims: [
		{ t: 'r', x: 18, y: 0, w: 16, h: 4, col: '#ff6b6b' },
		{ t: 'r', x: 12, y: 4, w: 28, h: 4, col: '#ff6b6b' }
	] },
	scarf: { layer: 'accessory', prims: [
		{ t: 'r', x: 12, y: 36, w: 28, h: 4, col: '#ff9f43' },
		{ t: 'r', x: 16, y: 40, w: 4, h: 8, col: '#ff9f43' }
	] },
	glasses: { layer: 'accessory', prims: [
		{ t: 'e', x: 20, y: 16, rx: 5, ry: 5, stroke: true, w: 1.5, col: '#5b3a86' },
		{ t: 'e', x: 36, y: 16, rx: 5, ry: 5, stroke: true, w: 1.5, col: '#5b3a86' },
		{ t: 'r', x: 25, y: 15, w: 6, h: 2, col: '#5b3a86' }
	] }
}

// ============ mood -> expression 推导（不入库）============
export const MOOD_EXPRESSION = {
	happy: ['smile', 'laugh'], // 随机
	normal: ['smile'],
	unhappy: ['upset'],
	sick: ['sad'],
	recovering: ['cheeky']
}

export function expressionForMood(mood) {
	const pool = MOOD_EXPRESSION[mood] || MOOD_EXPRESSION.normal
	return pool[Math.floor(Math.random() * pool.length)]
}

// 互动动作 -> 瞬时表情（事件覆盖 2~3 秒，前端用）
export const ACTION_EXPRESSION = {
	accompany: 'cheeky', chat: 'smile', gift: 'laugh', eat: 'surprised'
}

// ============ 默认形象与归一化 ============
export function defaultLook(gender) {
	const f = gender === '女生' || gender === 'f'
	const g = f ? 'f' : 'm'
	// 领养默认无发（头发属于可选造型，要用户在自定义形象页主动选择）；眼睛跟线条色、配饰跟衣服色
	return {
		ver: LOOK_VER, gender: g, skin: f ? '#ffe1e6' : '#4fc3f7', hair: 'none', outfit: f ? 'rose-dress' : 'tee-blue',
		clothColor: THEME_DEFAULT[g].cloth, hairColor: THEME_DEFAULT[g].hair,
		eyeColors: { l: FOLLOW_DEFAULT, r: FOLLOW_DEFAULT },
		accColors: { hat: { main: FOLLOW_DEFAULT }, scarf: { main: FOLLOW_DEFAULT }, glasses: { l: FOLLOW_DEFAULT, r: FOLLOW_DEFAULT } }
	}
}

/** 归一化：存量杯蜜无 look 字段时按 gender 生成默认形象 */
export function normalizeLook(look, pet) {
	if (look && look.gender && OUTFITS[look.outfit]) {
		// 存量形象补写主题色（旧 hairColor 合法则保留）
		const g = look.gender === 'f' ? 'f' : 'm'
		const inPalette = (v) => THEME_COLORS.indexOf(v) >= 0
		return Object.assign({}, look, {
			ver: LOOK_VER,
			clothColor: inPalette(look.clothColor) ? look.clothColor : (inPalette(look.hairColor) ? look.hairColor : THEME_DEFAULT[g].cloth),
			hairColor: inPalette(look.hairColor) ? look.hairColor : THEME_DEFAULT[g].hair
		})
	}
	return defaultLook(pet && pet.gender)
}
