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
	// 数值规则：离线衰减 + 打扰惩罚 + 阈值
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
		MOOD_TH: { happy: { interaction: 80, health: 80, happiness: 80 }, unhappy: 40 }
	},
	// 请假/旷工
	leave: {
		personal: { label: '事假', payCut: 0.5, canInteract: true, travel: 'allowed', mood: 0 },
		sick: { label: '病假', payCut: 0, canInteract: true, noAudit: true, travel: 'restricted', mood: -1 },
		absent: { label: '旷工', payCut: 1, mood: -4 }
	},
	// 闺蜜互动动作（去宠物化）
	actions: {
		accompany: { name: '陪伴', emoji: '🫂', interaction: 4, health: 0, happiness: 1, cost: 0, cooldown: 300000, dailyLimit: 20 },
		chat: { name: '聊天', emoji: '💬', interaction: 3, health: 1, happiness: 2, cost: 0, cooldown: 5000, dailyLimit: 30 },
		gift: { name: '送小礼物', emoji: '🎁', interaction: 5, health: 0, happiness: 4, cost: 5, cooldown: 1800000, dailyLimit: 5 }
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
			{ key: 'variety', name: '使用 2 种不同互动', icon: '🌈', target: 2, reward: { heart: 2, herb: 1 } },
			{ key: 'help', name: '帮助好友杯蜜 1 次', icon: '🤝', target: 1, reward: { heart: 2 } },
			{ key: 'heal', name: '完成调养护理 1 次', icon: '🏥', target: 1, reward: { heart: 3, herb: 2 } }
		]
	}
}

// ============ 互动反馈文案（非配置项，动作兜底语气）============
const ACTION_LINES = {
	accompany: ['陪着你真好～', '有你在，上班都有动力了 (｡•̀ᴗ-)✧', '谢谢你陪我，心情好多了'],
	gift: ['哇，收到礼物超开心！', '这个我喜欢，你怎么知道～', '礼物收下了，爱你哟 ( ˘ ³˘)♥']
}

// ============ 形象自定义白名单（结构型，不入库配置）============
const LOOK_PARTS = {
	outfits: ['tee-blue', 'tee-green', 'hoodie-gray', 'sky-dress', 'rose-dress', 'sun-dress', 'denim-uniform', 'leaf-uniform'],
	hairs: ['short', 'long'],
	accessories: ['hat', 'scarf', 'glasses'],
	HEX_RE: /^#[0-9a-fA-F]{6}$/,
	DEFAULT: {
		m: { ver: 1, gender: 'm', skin: '#4fc3f7', hairColor: '#4a4a55', hair: 'short', outfit: 'tee-blue' },
		f: { ver: 1, gender: 'f', skin: '#ffe1e6', hairColor: '#e8437a', hair: 'short', outfit: 'rose-dress' }
	}
}

// ============ 敏感词副本（前端 common/js/sensitive-words.js 同步维护）============
const BANNED_WORDS = ['傻逼', '妈的', '垃圾', '滚蛋', '废物', '去死', 'sb', 'nmsl']

module.exports = { DEFAULT_CONFIG, ACTION_LINES, LOOK_PARTS, BANNED_WORDS }
