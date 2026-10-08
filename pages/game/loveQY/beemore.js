/**
 * 电子杯蜜（beemore）前端公共常量与工具 —— 电子闺蜜/数字打工人逻辑 V1.0
 * 运行时会被 beemore_config（管理员可配）覆盖：调用 loadBeemoreConfig() 后 ACTIONS/TRAVEL_PLACES 就地更新，
 * 其余配置通过 getXxx() 访问器读取。DB 不可用时回退本文件内置默认值。
 * 云函数端有同步副本 constants.js（DEFAULT_CONFIG），改数值规则需两处对齐。
 * 必须使用 ESM 导出（common/js 模块规范），禁止 module.exports
 */

// ============ 心情状态映射（sick=过劳/作息紊乱需调养）============
export const MOOD_MAP = {
	happy: { label: '开心', face: '(≧▽≦)', color: '#43e97b' },
	normal: { label: '普通', face: '(・_・)', color: '#4facfe' },
	unhappy: { label: '不开心', face: '(╥﹏╥)', color: '#f093fb' },
	sick: { label: '需调养', face: '(x_x)', color: '#f5576c' },
	recovering: { label: '恢复中', face: '(๑•̀ㅂ•́)و✧', color: '#fa709a' }
}

// ============ 当前状态映射（数字打工人）============
export const STATUS_MAP = {
	idle: { label: '空闲', emoji: '☕', tone: '#43e97b', hint: '现在有空，随便玩～' },
	working: { label: '工作中', emoji: '💼', tone: '#f093fb', hint: '杯蜜正在上班，现在打扰会扣工资和心情，午休再聊吧～' },
	resting: { label: '休息中', emoji: '🍚', tone: '#ffd76e', hint: '午休时间，可以互动，但别聊太多影响下午状态哦～' },
	sleeping: { label: '睡觉中', emoji: '😴', tone: '#7f9cf5', hint: '杯蜜已睡着，消息会醒来后回复，强行叫醒影响健康和心情～' },
	leave: { label: '请假中', emoji: '🙋', tone: '#4facfe', hint: '请假中，可以尽情陪她～' },
	traveling: { label: '旅行中', emoji: '🎒', tone: '#fa709a', hint: '旅行中，等她寄回明信片吧～' },
	absent: { label: '旷工', emoji: '🫥', tone: '#bdbdbd', hint: '上次上班旅行没请假，按旷工处理了……' }
}

/** 是否处于锁定状态（工作/睡觉禁止换装·交友·旅行） */
export function isLocked(status) { return status === 'working' || status === 'sleeping' }
export function statusLabel(status) { return (STATUS_MAP[status] || STATUS_MAP.idle).label }
export function statusEmoji(status) { return (STATUS_MAP[status] || STATUS_MAP.idle).emoji }
export function statusTip(status) { return (STATUS_MAP[status] || STATUS_MAP.idle).hint }

// ============ 初始杯蜜 Emoji 候选 ============
export const BEE_EMOJIS = ['🐥', '🐤', '🐣', '🧑‍💻', '👩‍💻', '🐼', '🐰', '🐱', '🦊', '🐻']

// ============ 闺蜜互动动作（默认值；运行时被配置覆盖）============
// interaction/health/happiness: 属性变化, cost: 消耗杯蜜币, cooldown: 冷却ms, dailyLimit: 每日上限
// eat（干饭）只作为入口：点它跳转干饭页，实际吃饭走云函数 action 'eat'
export const ACTIONS = {
	accompany: { name: '陪伴', emoji: '🫂', interaction: 4, health: 0, happiness: 1, cost: 0, cooldown: 5 * 60 * 1000, dailyLimit: 20 },
	chat: { name: '聊天', emoji: '💬', interaction: 3, health: 1, happiness: 2, cost: 0, cooldown: 5 * 1000, dailyLimit: 30 },
	gift: { name: '送小礼物', emoji: '🎁', interaction: 5, health: 0, happiness: 4, cost: 5, cooldown: 30 * 60 * 1000, dailyLimit: 5 },
	eat: { name: '干饭', emoji: '🍚', kind: 'meal', interaction: 0, health: 0, happiness: 0, cost: 0, cooldown: 15 * 60 * 1000, dailyLimit: 8 }
}
export const ACTION_KEYS = ['accompany', 'chat', 'gift', 'eat']

// ============ 干饭菜单（默认值；运行时被 beemore_config 的 foods 覆盖）============
// kcal=热量, hunger=可抵消的饥饿值, light=清淡（生病时只允许这些）, cost=消耗杯蜜币
export const FOODS = [
	{ key: 'rice', name: '家常套餐', emoji: '🍚', kcal: 400, hunger: 45, happiness: 4, health: 1, cost: 3, light: true, tag: '正餐' },
	{ key: 'noodle', name: '热汤面', emoji: '🍜', kcal: 350, hunger: 38, happiness: 4, health: 1, cost: 2, light: true, tag: '正餐' },
	{ key: 'congee', name: '小米粥', emoji: '🥣', kcal: 180, hunger: 20, happiness: 2, health: 2, cost: 1, light: true, tag: '生病可吃' },
	{ key: 'salad', name: '轻食沙拉', emoji: '🥗', kcal: 150, hunger: 18, happiness: 1, health: 2, cost: 3, light: true, tag: '不易胖' },
	{ key: 'burger', name: '芝士汉堡', emoji: '🍔', kcal: 560, hunger: 48, happiness: 7, health: 0, cost: 5, light: false, tag: '高热量' },
	{ key: 'hotpot', name: '火锅套餐', emoji: '🍲', kcal: 720, hunger: 55, happiness: 9, health: 0, cost: 8, light: false, tag: '高热量' },
	{ key: 'boba', name: '珍珠奶茶', emoji: '🧋', kcal: 380, hunger: 15, happiness: 8, health: 0, cost: 5, light: false, tag: '容易胖' },
	{ key: 'cake', name: '小蛋糕', emoji: '🍰', kcal: 300, hunger: 12, happiness: 7, health: 0, cost: 4, light: false, tag: '容易胖' },
	{ key: 'fruit', name: '时蔬水果', emoji: '🍎', kcal: 90, hunger: 10, happiness: 2, health: 1, cost: 2, light: true, tag: '加餐' }
]
export function getFoods() { return live.foods && live.foods.list && live.foods.list.length ? live.foods.list : FOODS }

/** 哪些状态可以吃：午休/空闲/请假（上班、睡觉、旅行都不行，与云函数 EAT_ALLOWED 对齐） */
export const EAT_ALLOWED = ['resting', 'idle', 'leave']
export function canEat(status) { return EAT_ALLOWED.indexOf(status) >= 0 }

// ============ 饥饿值（0-100，数值越大越饿）展示映射 ============
export function hungerInfo(hunger) {
	const v = Math.max(0, Math.min(100, hunger == null ? 35 : hunger))
	if (v >= 85) return { level: 'starving', label: '饿扁了', face: '(╥﹏╥)', tone: '#f5576c', tip: '肚子咕咕叫得厉害，快带她吃饭' }
	if (v >= 60) return { level: 'hungry', label: '有点饿', face: '(・_・)；', tone: '#ff9a3c', tip: '到了饭点，休息时喂点东西' }
	if (v >= 25) return { level: 'ok', label: '不饿', face: '(￣▽￣)', tone: '#ffd76e', tip: '状态正常，不用特意吃' }
	return { level: 'full', label: '饱腹', face: '(＾• ω •＾)', tone: '#43e97b', tip: '刚吃饱，再吃就要长胖啦' }
}

// ============ 旅行目的地（默认值；运行时被配置覆盖）============
export const TRAVEL_PLACES = [
	{ key: 'beach', name: '海边', emoji: '🏖️', ms: 30 * 60 * 1000, cost: 10 },
	{ key: 'mountain', name: '山间', emoji: '⛰️', ms: 40 * 60 * 1000, cost: 12 },
	{ key: 'city', name: '城市漫步', emoji: '🌆', ms: 20 * 60 * 1000, cost: 8 },
	{ key: 'forest', name: '森林野餐', emoji: '🌲', ms: 45 * 60 * 1000, cost: 14 },
	{ key: 'space', name: '太空旅行', emoji: '🚀', ms: 60 * 60 * 1000, cost: 20 }
]

// ============ 职业（默认值；运行时被配置覆盖）============
// shifts=职业可选班次（多班次时用户可选其一，支持跨天）；custom:true=自由职业，用户自定义工作时间
export const JOB_MAP = {
	doctor: {
		name: '医生', emoji: '🩺', salary: 20,
		shifts: [
			{ key: 'day', name: '白班', start: '08:00', end: '16:00', weekdays: [1, 2, 3, 4, 5] },
			{ key: 'night', name: '夜班', start: '20:00', end: '02:00', weekdays: [1, 3, 5] }
		]
	},
	teacher: {
		name: '老师', emoji: '🧑‍🏫', salary: 15,
		shifts: [{ key: 'day', name: '日班', start: '08:30', end: '16:30', weekdays: [1, 2, 3, 4, 5] }]
	},
	postman: {
		name: '邮递员', emoji: '📮', salary: 12,
		shifts: [{ key: 'am', name: '晨班投递', start: '07:00', end: '12:00', weekdays: [1, 2, 3, 4, 5, 6] }]
	},
	freelance: { name: '自由职业', emoji: '💻', salary: 18, custom: true, shifts: [] }
}

// ============ 错误码 ============
export const ERR_MSG = {
	1001: '请先登录',
	2001: '参数错误',
	3001: '杯蜜正在冷却中，稍等一下再试吧',
	3002: '今天这个动作次数用完啦，明天再来吧',
	3003: '数值已经满啦',
	4001: '杯蜜需要调养，先带她去休息吧',
	4002: '杯蜜正忙或已入睡，这个操作要等她空闲时才行',
	5001: '没有权限',
	5002: '还没有杯蜜，先领养一只吧',
	6001: '这个部件还没解锁，先去完成任务/陪伴解锁吧',
	9001: '系统开小差了，请稍后再试'
}

// ============ 运行时配置缓存 ============
const live = { loaded: false, emoticons: null, schedule: null, rules: null, leave: null, decor: null, postcards: null, careTasks: null, taskDefs: null, jobs: null, foods: null }

// 内置默认（与云函数 DEFAULT_CONFIG 对齐，供访问器兜底）
const DEFAULT_EMOTICONS = {
	byState: {
		happy: ['(≧▽≦)', '٩(ˊᗜˋ*)و', '(◕‿◕✿)'], normal: ['(・_・)', '(:3」∠)_', '（￣▽￣）'],
		unhappy: ['(╥﹏╥)', '(；′⌒`)', '(ー_ー)!!'], working: ['（´-`）.｡oO（在忙…）'], resting: ['(๑•̀ㅂ•́)و✧ 午休中'],
		sleeping: ['Zzz…醒来回你'], traveling: ['(≧∇≦)ﾉ'], shy: ['(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '( ˘ ³˘)♥']
	},
	byKeyword: [
		{ keywords: ['谢谢', '么么', '爱你'], replies: ['( ˘ ³˘)♥ 也爱你', '么么哒 (๑′ᴗ‵๑)'] },
		{ keywords: ['晚安', '睡觉'], replies: ['晚安，做个好梦 🌙'] },
		{ keywords: ['早安'], replies: ['早安呀 (＾－＾)V'] }
	]
}

/**
 * 加载管理员配置：调 beemore-config getMap，成功则就地更新 ACTIONS/TRAVEL_PLACES 并缓存其余配置。
 * 失败静默使用内置默认值。
 */
export function loadBeemoreConfig() {
	return new Promise((resolve) => {
		uniCloud.callFunction({
			name: 'beemore-config',
			data: { action: 'getMap' },
			success: (res) => {
				const map = (res.result && res.result.code === 0 && res.result.data) || null
				if (map) applyConfig(map)
				live.loaded = true
				resolve(map)
			},
			fail: () => { resolve(null) }
		})
	})
}

function applyConfig(map) {
	if (map.actions && typeof map.actions === 'object') {
		// 逐动作字段回填：管理员只改数值时不会丢字段；内置新增动作（干饭）在旧配置里缺 key 时也保留
		const builtin = { eat: ACTIONS.eat }
		Object.keys(ACTIONS).forEach(k => { if (!map.actions[k] && !builtin[k]) delete ACTIONS[k] })
		Object.keys(map.actions).forEach(k => { ACTIONS[k] = Object.assign({}, ACTIONS[k] || builtin[k] || {}, map.actions[k]) })
		Object.keys(builtin).forEach(k => { if (!ACTIONS[k]) ACTIONS[k] = builtin[k] })
		ACTION_KEYS.length = 0
		Object.keys(ACTIONS).forEach(k => ACTION_KEYS.push(k))
	}
	if (map.travel_places && Array.isArray(map.travel_places.list)) {
		TRAVEL_PLACES.length = 0
		map.travel_places.list.forEach(p => TRAVEL_PLACES.push(p))
	}
	if (map.jobs) Object.assign(live, { jobs: map.jobs })
	if (map.emoticons) live.emoticons = map.emoticons
	if (map.schedule) live.schedule = map.schedule
	if (map.rules) live.rules = map.rules
	if (map.leave) live.leave = map.leave
	if (map.decor) live.decor = map.decor
	if (map.postcards) live.postcards = map.postcards
	if (map.care_tasks) live.careTasks = map.care_tasks
	if (map.task_defs) live.taskDefs = map.task_defs
	if (map.foods) live.foods = map.foods
}

export function getEmoticons() { return live.emoticons || DEFAULT_EMOTICONS }
export function getSchedule() { return live.schedule || null }
export function getRules() { return live.rules || null }
export function getLeave() { return live.leave || { personal: { label: '事假' }, sick: { label: '病假' }, absent: { label: '旷工' } } }
export function getDecor() { return live.decor || null }
export function getJobs() { return live.jobs || JOB_MAP }
export function isConfigLoaded() { return live.loaded }

/** 按关键词/状态选一条颜文字（前端本地即时反馈用；服务端为准） */
export function pickEmoticon(state, mood, text) {
	const emo = getEmoticons()
	if (text && Array.isArray(emo.byKeyword)) {
		for (const g of emo.byKeyword) {
			if (g.keywords && g.keywords.some(k => String(text).includes(k)) && g.replies && g.replies.length) {
				return g.replies[Math.floor(Math.random() * g.replies.length)]
			}
		}
	}
	const byState = emo.byState || {}
	const pool = byState[state] || byState[mood] || byState.normal || ['嗯嗯～']
	return pool[Math.floor(Math.random() * pool.length)]
}

/** 离线时长友好提示 */
export function awayTip(lastCalcAt, now = Date.now()) {
	if (!lastCalcAt) return ''
	const hours = Math.floor((now - lastCalcAt) / 3600000)
	if (hours < 1) return ''
	if (hours < 6) return `你离开了 ${hours} 小时，杯蜜一直在等你`
	if (hours < 24) return `你离开了 ${hours} 小时，杯蜜有点想你`
	const days = Math.floor(hours / 24)
	return `你离开了 ${days} 天，杯蜜盼了好久……欢迎回来 <3`
}

/** 秒数格式化为 mm:ss / hh:mm:ss */
export function fmtCountdown(ms) {
	if (!ms || ms <= 0) return ''
	const s = Math.ceil(ms / 1000)
	const h = Math.floor(s / 3600)
	const m = Math.floor((s % 3600) / 60)
	const sec = s % 60
	const pad = n => (n < 10 ? '0' + n : '' + n)
	return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** 时间戳 -> MM-DD HH:mm */
export function fmtTime(ts) {
	if (!ts) return ''
	const d = new Date(ts)
	const pad = n => (n < 10 ? '0' + n : '' + n)
	return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
