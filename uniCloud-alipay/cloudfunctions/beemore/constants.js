'use strict';
/**
 * beemore 云函数内置默认配置
 * 运行时会被 beemore_config 集合（管理员可配）覆盖，见 configLoader.js
 * 结构须与 database/beemore_config.init_data.json 对齐；改结构两处同步
 * 前端 pages/game/loveQY/beemore.js 有同步默认副本
 */

// ============ 全局默认配置（key -> value，value 即配置载荷）============
const DEFAULT_CONFIG = {
	// 日程：工作班次（可多段/跨天）+ 休息窗口 + 睡眠
	schedule: {
		workShifts: [
			{ name: '早班', start: '09:00', end: '12:00', weekdays: [1, 2, 3, 4, 5] },
			{ name: '下午班', start: '13:00', end: '18:00', weekdays: [1, 2, 3, 4, 5] },
			{ name: '晚班', start: '18:00', end: '21:00', weekdays: [1, 2, 3, 4, 5] }
		],
		restWindows: [
			{ name: '午餐休息', start: '12:00', end: '13:00', weekdays: [1, 2, 3, 4, 5] }
		],
		sleep: { start: '23:00', end: '07:00', weekdays: [0, 1, 2, 3, 4, 5, 6] },
		workDays: [1, 2, 3, 4, 5]
	},
	// 数值规则：离线衰减 + 打扰惩罚 + 饥饿/体重 + 阈值
	rules: {
		MAX_OFFLINE_HOURS: 48,
		INTERACT_DECAY_PER_HOUR: 2,
		HAPPY_DECAY_PER_HOUR: 1,
		HEALTH_DECAY_OFFLINE: true,
		RECOVER_PER_HOUR: 1,
		HEALTH_SLOW_DECAY: 1,
		HEALTH_FAST_DECAY: 2,
		HEALTH_RECOVER_CAP: 80,
		SICK_HEALTH: 30,
		SICK_INTERACT: 20,
		SICK_HOURS: 6,
		DAILY_LOGIN_BONUS: 5,
		FRIEND_HELP_LIMIT: 3,
		CLINIC_FEE: 20,
		DOCTOR_FEE: 30,
		WORK_FORCE_INTERACT: { coin: -5, mood: -2 },
		WORK_DISTURB_HEALTH: { health: -1, threshold: 3 },
		REST_OVER: { health: -1, threshold: { minutes: 20, countPerHour: 5 } },
		SLEEP_WAKE: { health: -3, mood: -3 },
		TRAVEL_COST_RATIO: 1,
		MOOD_TH: { happy: { interaction: 80, health: 80, happiness: 80 }, unhappy: 40 },
		// 饥饿值（hunger 0-100，数值越大越饿）：离线每小时上升，饿过头掉健康掉心情
		HUNGER_RISE_PER_HOUR: 3,
		HUNGER_STARVE: 80,
		HUNGER_HEALTH_DECAY: 1,
		HUNGER_HAPPY_DECAY: 1,
		SICK_HUNGER_RISE: 2, // 生病时饿得更快（每小时额外上升）
		DEFAULT_WEIGHT: { m: 60, f: 50 },
		// 干饭规则：KCAL_PER_HUNGER=抵消 1 点饥饿需要的热量；多余热量攒够 FAT_KCAL_PER_KG 就 +1kg
		KCAL_PER_HUNGER: 10,
		FAT_KCAL_PER_KG: 240,
		MEAL_COOLDOWN_MS: 900000,
		MEAL_DAILY_SOFT: 3, // 一天第 4 顿起，热量全额堆积（必长胖）
		MEAL_DAILY_LIMIT: 8,
		EAT_TOO_FULL: 15, // 饥饿值低于此值还吃 = 吃太撑，扣健康
		WEIGHT_MAX_GAIN: 20,
		WEIGHT_MAX_LOSE: 8,
		SICK_WEIGHT_LOSS: 1
	},
	// 请假/旷工
	leave: {
		personal: { label: '事假', payCut: 0.5, canInteract: true, travel: 'allowed', mood: 0 },
		sick: { label: '病假', payCut: 0, canInteract: true, noAudit: true, travel: 'restricted', mood: -1 },
		absent: { label: '旷工', payCut: 1, mood: -4 }
	},
	// 闺蜜互动动作（去宠物化）；eat 只作为入口展示，实际吃饭走独立 action 'eat'（interact 会拒绝）
	actions: {
		accompany: { name: '陪伴', emoji: '🫂', interaction: 4, health: 0, happiness: 1, cost: 0, cooldown: 300000, dailyLimit: 20 },
		chat: { name: '聊天', emoji: '💬', interaction: 3, health: 1, happiness: 2, cost: 0, cooldown: 5000, dailyLimit: 30 },
		gift: { name: '送小礼物', emoji: '🎁', interaction: 5, health: 0, happiness: 4, cost: 5, cooldown: 1800000, dailyLimit: 5 },
		eat: { name: '干饭', emoji: '🍚', kind: 'meal', interaction: 0, health: 0, happiness: 0, cost: 0, cooldown: 900000, dailyLimit: 8 }
	},
	// 干饭菜单：kcal=热量，hunger=可抵消的饥饿值，light=清淡（生病时只允许这些），cost=消耗杯蜜币
	foods: {
		list: [
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
	},
	// 颜文字库：状态 + 关键词
	emoticons: {
		byState: {
			working: ['（´-`）.｡oO（在忙…）', '(￣^￣)ゞ 工作中，下班回你', '(－‸ლ) 开会中，稍后再聊'],
			resting: ['(๑•̀ㅂ•́)و✧ 午休充电中', '~(￣▽￣)~* 吃饭最开心', 'ヽ(•̀ω•́ )ゝ 小憩一会儿'],
			sleeping: ['Zzz…醒来回你', '(-.-)zzZ 睡个好觉', '（￣︶￣）→ 已入睡，勿扰'],
			traveling: ['(≧∇≦)ﾉ 在外面玩~', '✧*。风景真好', '(*´▽`*) 旅行中'],
			happy: ['(≧▽≦)', '٩(ˊᗜˋ*)و', '(◕‿◕✿)'],
			normal: ['(・_・)', '(:3」∠)_', '（￣▽￣）'],
			unhappy: ['(╥﹏╥)', '(；′⌒`)', '(ー_ー)!!'],
			shy: ['(⁄ ⁄•⁄ω⁄•⁄ ⁄)', '( ˘ ³˘)♥', '(*ﾉωﾉ)']
		},
		byKeyword: [
			{ keywords: ['谢谢', '么么', '爱你'], replies: ['( ˘ ³˘)♥ 也爱你', '么么哒 (๑′ᴗ‵๑)', '嘿嘿，不客气～'] },
			{ keywords: ['早安', '早上好'], replies: ['早安呀 (＾－＾)V', '早上好～今天也要元气满满', '☀️ 起床啦'] },
			{ keywords: ['晚安', '睡觉'], replies: ['晚安，做个好梦 🌙', 'zzZ 一起睡叭', '晚安么么 (－ o －)'] },
			{ keywords: ['吃', '饭', '饿'], replies: ['该吃饭啦 🍚', '干饭人干饭魂！', '民以食为天，先吃饱～'] },
			{ keywords: ['忙', '累', '加班'], replies: ['辛苦啦，抱抱 (っ´ω`)ﾉ', '别太累了，注意休息', '摸鱼一下也没关系 🐟'] }
		]
	},
	// 职业：shifts 为该职业可选班次（多班次时用户可选其一，跨天支持 end<start）；custom:true 为自由职业，用户自定义工作时间；无 shifts 时回退全局 schedule.workShifts
	jobs: {
		doctor: {
			name: '医生', emoji: '🩺', salary: 20,
			shifts: [
				{ key: 'day', name: '白班', start: '08:00', end: '16:00', weekdays: [1, 2, 3, 4, 5] },
				{ key: 'night', name: '夜班', start: '20:00', end: '02:00', weekdays: [1, 3, 5] }
			]
		},
		teacher: {
			name: '老师', emoji: '🧑‍🏫', salary: 15,
			shifts: [
				{ key: 'day', name: '日班', start: '08:30', end: '16:30', weekdays: [1, 2, 3, 4, 5] }
			]
		},
		postman: {
			name: '邮递员', emoji: '📮', salary: 12,
			shifts: [
				{ key: 'am', name: '晨班投递', start: '07:00', end: '12:00', weekdays: [1, 2, 3, 4, 5, 6] }
			]
		},
		freelance: { name: '自由职业', emoji: '💻', salary: 18, custom: true, shifts: [] }
	},
	// 旅行目的地（cost=消耗杯蜜币/工资）
	travel_places: {
		list: [
			{ key: 'beach', name: '海边', emoji: '🏖️', ms: 1800000, cost: 10 },
			{ key: 'mountain', name: '山间', emoji: '⛰️', ms: 2400000, cost: 12 },
			{ key: 'city', name: '城市漫步', emoji: '🌆', ms: 1200000, cost: 8 },
			{ key: 'forest', name: '森林野餐', emoji: '🌲', ms: 2700000, cost: 14 },
			{ key: 'space', name: '太空旅行', emoji: '🚀', ms: 3600000, cost: 20 }
		]
	},
	// 明信片文案库
	postcards: {
		beach: '我在海边挖到一枚亮亮的贝壳🐚，想送给你～',
		mountain: '山顶的风好大，但我看到了很远的地方⛰️',
		city: '城市里好多好吃的，下次带你一起来🌆',
		forest: '森林里交到了一个蘑菇朋友🍄',
		space: '我从太空寄回这张明信片，星星好近呀🚀'
	},
	// 装扮与里程碑
	decor: {
		milestones: { 3: 'hat', 7: 'scarf', 30: 'glasses' },
		items: {
			hat: { key: 'hat', name: '小帽子', emoji: '🎩', slot: 'head', how: '连续陪伴 3 天解锁' },
			scarf: { key: 'scarf', name: '暖围巾', emoji: '🧣', slot: 'neck', how: '连续陪伴 7 天解锁' },
			glasses: { key: 'glasses', name: '圆眼镜', emoji: '👓', slot: 'face', how: '连续陪伴 30 天解锁' }
		}
	},
	// 诊所（过劳调养）护理任务
	care_tasks: {
		list: [
			{ key: 'medicine', name: '按医嘱服药', emoji: '💊' },
			{ key: 'water', name: '多喝热水', emoji: '🍵' },
			{ key: 'rest', name: '好好休息', emoji: '😴' }
		],
		intervalMs: 600000,
		doctorIntervalMs: 300000
	},
	// 每日任务
	task_defs: {
		list: [
			{ key: 'login', name: '每日登录', icon: '📅', target: 1, reward: { heart: 1 } },
			{ key: 'interact', name: '陪伴/聊天 3 次', icon: '🫂', target: 3, reward: { heart: 2 } },
			{ key: 'interact', name: '陪伴/聊天 5 次', icon: '💬', target: 5, reward: { heart: 3 } },
			{ key: 'variety', name: '使用 2 种不同互动', icon: '🌈', target: 2, reward: { heart: 2, coin: 5 } },
			{ key: 'help', name: '帮助好友杯蜜 1 次', icon: '🤝', target: 1, reward: { heart: 2 } },
			{ key: 'heal', name: '完成调养护理 1 次', icon: '🏥', target: 1, reward: { heart: 3, coin: 8 } },
			{ key: 'meal', name: '休息时好好吃 1 顿饭', icon: '🍚', target: 1, reward: { heart: 2 } }
		]
	}
}

// ============ 互动反馈文案（非配置项，动作兜底语气）============
const ACTION_LINES = {
	accompany: ['陪着你真好～', '有你在，上班都有动力了 (｡•̀ᴗ-)✧', '谢谢你陪我，心情好多了'],
	gift: ['哇，收到礼物超开心！', '这个我喜欢，你怎么知道～', '礼物收下了，爱你哟 ( ˘ ³˘)♥'],
	eat: ['干饭人干饭魂，太香了！(๑•̀ㅂ•́)و✧', '吃饱了才有力气上班呀～ 🍚', '这顿好满足，下次还吃 (￣▽￣)ﾉ', '唔……是不是又吃多了一点点？']
}

// ============ 形象自定义白名单（结构型，不入库配置）============
// ren.html 霓虹线条形象：8 色调色板（前端 look.js THEME_COLORS 同步维护）
const THEME_COLORS = ['#5eead4', '#14b8a6', '#f9a8d4', '#ec4899', '#c4b5fd', '#fde68a', '#fdba74', '#93c5fd']
const LOOK_PARTS = {
	// 形象数据版本：ver:3 起头发为可选部件（默认无发），旧版存量形象首次读取时一次性回落无发
	VER: 3,
	outfits: ['tee-blue', 'tee-green', 'hoodie-gray', 'sky-dress', 'rose-dress', 'sun-dress', 'denim-uniform', 'leaf-uniform'],
	// 头发不默认长在头上：none（默认）/ short / long
	hairs: ['none', 'short', 'long'],
	HAIR_NAMES: { none: '无发', short: '短发', long: '长发' },
	accessories: ['hat', 'scarf', 'glasses'],
	// 配饰可着色的部位（存于 look.accColors）：帽/围巾整体一个 main 色，眼镜左右镜片各一色；空串 = 跟随衣服色
	accParts: { hat: ['main'], scarf: ['main'], glasses: ['l', 'r'] },
	ACC_SLOT_NAMES: { main: '颜色', l: '左镜片', r: '右镜片' },
	// 眼睛（含眉毛）可左右异色，存于 look.eyeColors；空串 = 跟随该性别的线条色
	eyeSlots: ['l', 'r'],
	EYE_SLOT_NAMES: { l: '左眼', r: '右眼' },
	themeColors: THEME_COLORS,
	// 调色板色名（仅用于日志/日记展示）
	COLOR_NAMES: {
		'#5eead4': '薄荷青', '#14b8a6': '深海青', '#f9a8d4': '樱花粉', '#ec4899': '玫红',
		'#c4b5fd': '香芋紫', '#fde68a': '奶黄', '#fdba74': '橘杏', '#93c5fd': '天蓝'
	},
	HEX_RE: /^#[0-9a-fA-F]{6}$/,
	// ver:3 = 线条形象，衣服色/头发色取自 themeColors（线条色由性别固定），头发默认不选；
	// 眼睛色与配饰色不写在默认值里（无 eyeColors/accColors = 全部跟随默认色，避免给存量形象多挂一层空对象）
	DEFAULT: {
		m: { ver: 3, gender: 'm', skin: '#4fc3f7', clothColor: '#5eead4', hairColor: '#14b8a6', hair: 'none', outfit: 'tee-blue' },
		f: { ver: 3, gender: 'f', skin: '#ffe1e6', clothColor: '#f9a8d4', hairColor: '#ec4899', hair: 'none', outfit: 'rose-dress' }
	}
}

// ============ 敏感词副本（前端 common/js/sensitive-words.js 同步维护）============
const BANNED_WORDS = ['傻逼', '妈的', '垃圾', '滚蛋', '废物', '去死', 'sb', 'nmsl']

module.exports = { DEFAULT_CONFIG, ACTION_LINES, LOOK_PARTS, BANNED_WORDS }
