/**
 * 电子杯蜜后台配置「可视化表单」描述表（beemore-admin 专用）
 * 结构须与云函数 constants.js DEFAULT_CONFIG / database/beemore_config.init_data.json 对齐。
 * 这里只描述「怎么渲染」，不复制默认值：表单数据始终来自数据库里那条配置文档的 value，
 * 描述表没覆盖到的字段会原样保留（切到 JSON 模式可看到全部字段）。
 * 必须使用 ESM 导出（common/js 模块规范），禁止 module.exports
 *
 * 段（section）类型：
 *   fields   平铺字段：{ title, fields:[F] }
 *   entries  对象表（key -> 对象）：{ title, path?, keyLabel, itemFields:[F], newItem:{}, itemSections?:[S], addLabel }
 *   items    对象数组：{ title, path, itemFields:[F], newItem:{}, nameField }
 *   states   文案库（key -> 字符串数组）：{ title, path, labelOf:{} }
 *   kv       键值对（key -> 字符串）：{ title, path?, keyLabel, valueLabel }
 * 字段（F）：{ path, label, type, tip?, ph?, opts?, divide?, maxlen?, optional? }
 *   type: text | int | num | bool | select | time | weekdays | lines | csv
 *   divide: 显示值 = 存库值 / divide（毫秒转分钟/秒用，存库仍是毫秒）
 *   optional: 数值字段允许留空（留空即不写这个键，如任务可以只奖爱心不奖币）
 */

// 星期标签（与云函数 dow 一致：0=周日）
export const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

// 颜文字状态中文名
const STATE_LABELS = {
	working: '上班中', resting: '午休中', sleeping: '睡觉中', traveling: '旅行中',
	happy: '开心', normal: '普通', unhappy: '不开心', shy: '害羞', leave: '请假中', absent: '旷工'
}

// 班次字段（职业班次 / 全局班次通用）
const SHIFT_FIELDS = [
	{ path: 'key', label: '代号', type: 'text', ph: 'day', tip: '英文代号，用户端按它锁定单一班次' },
	{ path: 'name', label: '班次名', type: 'text', ph: '白班' },
	{ path: 'start', label: '开始', type: 'time' },
	{ path: 'end', label: '结束', type: 'time', tip: '小于开始时间即跨天（如夜班 20:00-02:00）' },
	{ path: 'weekdays', label: '每周哪几天', type: 'weekdays' }
]
const newShift = () => ({ key: '', name: '新班次', start: '09:00', end: '18:00', weekdays: [1, 2, 3, 4, 5] })

export const CONFIG_META = {
	// ============ 日程（由 beemore-admin 自己的可视化日程编辑器接管）============
	schedule: {
		icon: '🕒',
		label: '日程（班次/休息/睡眠）',
		summary: (v) => {
			const s = v || {}
			return `${(s.workShifts || []).length} 个班次 · ${(s.restWindows || []).length} 段休息` + (s.sleep ? ` · 睡眠 ${s.sleep.start}-${s.sleep.end}` : '')
		},
		sections: []
	},

	// ============ 数值规则 ============
	rules: {
		icon: '🧮',
		label: '数值规则',
		summary: (v) => `${Object.keys(v || {}).length} 项数值规则`,
		sections: [
			{
				title: '🕒 离线衰减（每次进页面按离线小时补算）',
				fields: [
					{ path: 'MAX_OFFLINE_HOURS', label: '离线最多按几小时算', type: 'int', tip: '超过这个时长的离线不再扣' },
					{ path: 'INTERACT_DECAY_PER_HOUR', label: '互动值每小时下降', type: 'num' },
					{ path: 'HAPPY_DECAY_PER_HOUR', label: '开心值每小时下降', type: 'num' },
					{ path: 'HEALTH_DECAY_OFFLINE', label: '离线也结算健康涨跌', type: 'bool' },
					{ path: 'RECOVER_PER_HOUR', label: '互动≥60 时每小时回升', type: 'num' },
					{ path: 'HEALTH_SLOW_DECAY', label: '互动≥30 时每小时微降', type: 'num' },
					{ path: 'HEALTH_FAST_DECAY', label: '互动<30 时每小时速降', type: 'num' },
					{ path: 'HEALTH_RECOVER_CAP', label: '健康回升上限', type: 'int' },
					{ path: 'DAILY_LOGIN_BONUS', label: '每日登录送互动值', type: 'int' }
				]
			},
			{
				title: '🤒 生病与心情阈值',
				fields: [
					{ path: 'SICK_HEALTH', label: '健康低于多少就生病', type: 'int' },
					{ path: 'SICK_INTERACT', label: '互动低于多少算冷落', type: 'int' },
					{ path: 'SICK_HOURS', label: '冷落累计几小时生病', type: 'int' },
					{ path: 'MOOD_TH.happy.interaction', label: '开心需要互动≥', type: 'int' },
					{ path: 'MOOD_TH.happy.health', label: '开心需要健康≥', type: 'int' },
					{ path: 'MOOD_TH.happy.happiness', label: '开心需要快乐≥', type: 'int' },
					{ path: 'MOOD_TH.unhappy', label: '低于多少算不开心', type: 'int' }
				]
			},
			{
				title: '💢 打扰惩罚（上班/睡觉/午休乱吵的代价）',
				fields: [
					{ path: 'WORK_FORCE_INTERACT.coin', label: '上班打扰扣杯蜜币', type: 'int', tip: '填负数，如 -5' },
					{ path: 'WORK_FORCE_INTERACT.mood', label: '上班打扰扣心情', type: 'int', tip: '填负数，如 -2' },
					{ path: 'WORK_DISTURB_HEALTH.health', label: '打扰上班健康变化', type: 'int', tip: '填负数' },
					{ path: 'WORK_DISTURB_HEALTH.threshold', label: '每天第几次起加罚', type: 'int' },
					{ path: 'REST_OVER.health', label: '午休聊太久健康变化', type: 'int', tip: '填负数' },
					{ path: 'REST_OVER.threshold.minutes', label: '午休互动超过几分钟', type: 'int' },
					{ path: 'REST_OVER.threshold.countPerHour', label: '午休每小时互动超几次', type: 'int' },
					{ path: 'SLEEP_WAKE.health', label: '强行叫醒扣健康', type: 'int', tip: '填负数' },
					{ path: 'SLEEP_WAKE.mood', label: '强行叫醒扣心情', type: 'int', tip: '填负数' }
				]
			},
			{
				title: '🏥 诊所 / 旅行 / 好友',
				fields: [
					{ path: 'CLINIC_FEE', label: '诊所挂号费（币）', type: 'int' },
					{ path: 'DOCTOR_FEE', label: '医生问诊费（币）', type: 'int' },
					{ path: 'FRIEND_HELP_LIMIT', label: '每天可帮好友次数', type: 'int' },
					{ path: 'TRAVEL_COST_RATIO', label: '旅行花费倍率', type: 'num', tip: '1=按目的地标价，2=双倍' }
				]
			},
			{
				title: '🍚 饥饿与体重',
				fields: [
					{ path: 'HUNGER_RISE_PER_HOUR', label: '饥饿值每小时上升', type: 'num', tip: '0-100，越大越饿' },
					{ path: 'HUNGER_STARVE', label: '饥饿到多少算饿坏', type: 'int' },
					{ path: 'HUNGER_HEALTH_DECAY', label: '饿坏每小时扣健康', type: 'num' },
					{ path: 'HUNGER_HAPPY_DECAY', label: '饿坏每小时扣心情', type: 'num' },
					{ path: 'SICK_HUNGER_RISE', label: '生病额外加速饥饿', type: 'num' },
					{ path: 'DEFAULT_WEIGHT.m', label: '男生标准体重', type: 'num' },
					{ path: 'DEFAULT_WEIGHT.f', label: '女生标准体重', type: 'num' },
					{ path: 'KCAL_PER_HUNGER', label: '抵消 1 点饥饿需热量', type: 'int' },
					{ path: 'FAT_KCAL_PER_KG', label: '攒够多少热量长 1kg', type: 'int' },
					{ path: 'MEAL_COOLDOWN_MS', label: '两顿饭间隔（分钟）', type: 'num', divide: 60000 },
					{ path: 'MEAL_DAILY_SOFT', label: '一天第几顿起全额长胖', type: 'int' },
					{ path: 'MEAL_DAILY_LIMIT', label: '每天最多几顿', type: 'int' },
					{ path: 'EAT_TOO_FULL', label: '饥饿低于多少算吃撑', type: 'int' },
					{ path: 'WEIGHT_MAX_GAIN', label: '最多比标准重几 kg', type: 'int' },
					{ path: 'WEIGHT_MAX_LOSE', label: '最多比标准瘦几 kg', type: 'int' },
					{ path: 'SICK_WEIGHT_LOSS', label: '每次生病瘦几 kg', type: 'num' }
				]
			}
		]
	},

	// ============ 请假与旷工 ============
	leave: {
		icon: '🙋',
		label: '请假与旷工规则',
		summary: (v) => Object.keys(v || {}).map(k => ((v[k] || {}).label || k)).join('、'),
		sections: [
			{
				type: 'entries',
				title: '假别规则',
				keyLabel: '假别代号',
				addLabel: '新增假别',
				hint: 'payCut 是「请假当场扣掉的比例」：0.5 = 扣半天工资，1 = 全天工资没有；病假当天不扣钱，结算仍发全额。缺勤判定只看代码 personal/sick，自定义假别按事假逻辑记账。',
				itemFields: [
					{ path: 'label', label: '名称', type: 'text', ph: '事假' },
					{ path: 'payCut', label: '当场扣薪比例', type: 'num', tip: '0~1，按日薪乘以这个比例当场扣币' },
					{ path: 'mood', label: '心情变化', type: 'int', tip: '负数是扣心情' },
					{ path: 'canInteract', label: '请假期间可互动', type: 'bool' },
					{ path: 'noAudit', label: '免打卡（不记旷工）', type: 'bool', tip: '病假用：生病没上班也不算旷工' },
					{ path: 'travel', label: '能否旅行', type: 'select', opts: ['allowed', 'restricted', 'forbidden'] }
				],
				newItem: { label: '新假别', payCut: 0.5, mood: 0, canInteract: true, travel: 'allowed' }
			}
		]
	},

	// ============ 互动动作 ============
	actions: {
		icon: '🫂',
		label: '闺蜜互动动作',
		summary: (v) => Object.keys(v || {}).map(k => `${(v[k] || {}).emoji || ''}${(v[k] || {}).name || k}`).join(' '),
		sections: [
			{
				type: 'entries',
				title: '闺蜜互动动作',
				keyLabel: '动作代号',
				addLabel: '新增动作',
				hint: 'eat（干饭）是入口动作，只能由「干饭页」触发，删掉会导致首页按钮消失。数值填正数是加、负数是扣。',
				itemFields: [
					{ path: 'name', label: '名称', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'interaction', label: '互动值', type: 'int' },
					{ path: 'health', label: '健康值', type: 'int' },
					{ path: 'happiness', label: '快乐值', type: 'int' },
					{ path: 'cost', label: '消耗杯蜜币', type: 'int' },
					{ path: 'cooldown', label: '冷却（秒）', type: 'num', divide: 1000 },
					{ path: 'dailyLimit', label: '每日次数上限', type: 'int' },
					{ path: 'kind', label: '特殊类型', type: 'select', opts: ['', 'meal'], tip: 'meal=吃饭，走独立结算' }
				],
				newItem: { name: '新动作', emoji: '✨', interaction: 1, health: 0, happiness: 1, cost: 0, cooldown: 300000, dailyLimit: 10 }
			}
		]
	},

	// ============ 职业 ============
	jobs: {
		icon: '💼',
		label: '职业与班次',
		summary: (v) => Object.keys(v || {}).map(k => `${(v[k] || {}).name || k}¥${(v[k] || {}).salary || 0}`).join('、'),
		sections: [
			{
				type: 'entries',
				title: '职业与班次',
				keyLabel: '职业代号',
				addLabel: '新增职业',
				hint: 'salary = 日薪（下班后结算全额）。勾选「自由职业」表示由杯蜜自己定义工作时段；不填班次则沿用全局日程的上班班次。',
				itemFields: [
					{ path: 'name', label: '职业名', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'salary', label: '日薪（币）', type: 'int' },
					{ path: 'custom', label: '自由职业（自定义时段）', type: 'bool' }
				],
				itemSections: [
					{
						type: 'items', title: '班次（可多班 / 跨天）', path: 'shifts',
						nameField: 'name', newItem: newShift(), itemFields: SHIFT_FIELDS
					}
				],
				newItem: { name: '新职业', emoji: '🧑‍💻', salary: 10, custom: false, shifts: [] }
			}
		]
	},

	// ============ 干饭菜单 ============
	foods: {
		icon: '🍜',
		label: '干饭菜单',
		summary: (v) => `${((v || {}).list || []).length} 道菜`,
		sections: [
			{
				type: 'items', title: '菜单', path: 'list', nameField: 'name',
				hint: 'kcal=热量，hunger=能压多少饥饿值，light=清淡（生病时只准吃这些），cost=杯蜜币。',
				newItem: { key: 'newfood', name: '新菜', emoji: '🍽️', kcal: 300, hunger: 30, happiness: 3, health: 0, cost: 3, light: false, tag: '自定义' },
				itemFields: [
					{ path: 'key', label: '代号', type: 'text' },
					{ path: 'name', label: '菜名', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'kcal', label: '热量 kcal', type: 'int' },
					{ path: 'hunger', label: '解饿（点数）', type: 'int' },
					{ path: 'happiness', label: '加快乐', type: 'int' },
					{ path: 'health', label: '健康变化', type: 'int' },
					{ path: 'cost', label: '价格（币）', type: 'int' },
					{ path: 'light', label: '清淡（生病可吃）', type: 'bool' },
					{ path: 'tag', label: '角标文案', type: 'text', ph: '高热量' }
				]
			}
		]
	},

	// ============ 旅行目的地 ============
	travel_places: {
		icon: '🎒',
		label: '旅行目的地',
		summary: (v) => `${((v || {}).list || []).length} 个目的地`,
		sections: [
			{
				type: 'items', title: '目的地', path: 'list', nameField: 'name',
				hint: '时长到点寄回明信片；花费按规则 TRAVEL_COST_RATIO 倍率结算。',
				newItem: { key: 'newplace', name: '新地方', emoji: '🏝️', ms: 1800000, cost: 10 },
				itemFields: [
					{ path: 'key', label: '代号', type: 'text' },
					{ path: 'name', label: '名称', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'ms', label: '时长（分钟）', type: 'num', divide: 60000 },
					{ path: 'cost', label: '花费（币）', type: 'int' }
				]
			}
		]
	},

	// ============ 明信片文案 ============
	postcards: {
		icon: '📮',
		label: '明信片文案库',
		summary: (v) => `${Object.keys(v || {}).length} 条文案`,
		sections: [
			{
				type: 'kv', title: '各地明信片文案',
				keyLabel: '目的地代号', valueLabel: '文案',
				hint: '代号要和「旅行目的地」对上，旅行结束时按代号取文案。',
				addLabel: '新增一条'
			}
		]
	},

	// ============ 颜文字库 ============
	emoticons: {
		icon: '😀',
		label: '颜文字库',
		summary: (v) => {
			const s = v || {}
			return `${Object.keys(s.byState || {}).length} 类状态 · ${(s.byKeyword || []).length} 组关键词`
		},
		sections: [
			{ type: 'states', title: '按状态回的颜文字', path: 'byState', labelOf: STATE_LABELS, newItem: [], addLabel: '+ 新增状态', hint: '每行一条，发送时随机取一句；状态代号常用 happy/normal/unhappy/working/resting/sleeping/traveling/shy。' },
			{
				type: 'items', title: '按关键词触发（优先级高于状态）', path: 'byKeyword',
				titleField: 'keywords',
				newItem: { keywords: [], replies: [] },
				itemFields: [
					{ path: 'keywords', label: '关键词（逗号分隔）', type: 'csv' },
					{ path: 'replies', label: '回复（每行一条）', type: 'lines' }
				]
			}
		]
	},

	// ============ 装扮与里程碑 ============
	decor: {
		icon: '🎩',
		label: '装扮与解锁里程碑',
		summary: (v) => `${Object.keys((v || {}).items || {}).length} 件装扮 · ${Object.keys((v || {}).milestones || {}).length} 个里程碑`,
		sections: [
			{
				type: 'entries', title: '装扮部件', path: 'items',
				keyLabel: '部件代号', addLabel: '新增装扮',
				hint: 'slot 决定穿戴部位：head 帽子 / neck 围巾 / face 眼镜 / wrist 手腕。',
				itemFields: [
					{ path: 'key', label: '代号（同主键）', type: 'text' },
					{ path: 'name', label: '名称', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'slot', label: '穿戴部位', type: 'select', opts: ['head', 'neck', 'face', 'wrist'] },
					{ path: 'how', label: '解锁方式文案', type: 'text' }
				],
				newItem: { key: '', name: '新装扮', emoji: '🎀', slot: 'head', how: '连续陪伴 N 天解锁' }
			},
			{
				type: 'kv', title: '里程碑解锁（连续陪伴天数 → 部件代号）', path: 'milestones',
				keyLabel: '天数', valueLabel: '部件代号', addLabel: '新增节点',
				hint: '天数填整数，代号必须是上面存在的装扮部件。'
			}
		]
	},

	// ============ 诊所护理任务 ============
	care_tasks: {
		icon: '🏥',
		label: '诊所护理任务',
		summary: (v) => `${((v || {}).list || []).length} 项护理`,
		sections: [
			{
				title: '护理节奏',
				fields: [
					{ path: 'intervalMs', label: '普通护理间隔（分钟）', type: 'num', divide: 60000 },
					{ path: 'doctorIntervalMs', label: '看过医生后间隔（分钟）', type: 'num', divide: 60000 }
				]
			},
			{
				type: 'items', title: '护理任务', path: 'list', nameField: 'name',
				hint: '生病期间在诊所逐项完成，全部完成即可进入恢复中。',
				newItem: { key: 'newtask', name: '新护理', emoji: '🩹' },
				itemFields: [
					{ path: 'key', label: '代号', type: 'text' },
					{ path: 'name', label: '名称', type: 'text' },
					{ path: 'emoji', label: '图标', type: 'text', maxlen: 4 }
				]
			}
		]
	},

	// ============ 每日任务 ============
	task_defs: {
		icon: '📋',
		label: '每日任务',
		summary: (v) => `${((v || {}).list || []).length} 个每日任务`,
		sections: [
			{
				type: 'items', title: '每日任务', path: 'list', nameField: 'name',
				hint: '统计口径 key：login 登录 / interact 互动次数 / variety 不同互动种类 / help 帮好友 / heal 护理 / meal 吃饭。',
				newItem: { key: 'interact', name: '新任务', icon: '✨', target: 1, reward: { heart: 1 } },
				itemFields: [
					{ path: 'key', label: '统计口径', type: 'select', opts: ['login', 'interact', 'variety', 'help', 'heal', 'meal', 'chat'] },
					{ path: 'name', label: '任务名', type: 'text' },
					{ path: 'icon', label: '图标', type: 'text', maxlen: 4 },
					{ path: 'target', label: '目标次数', type: 'int' },
					{ path: 'reward.heart', label: '奖励爱心', type: 'int', optional: true },
					{ path: 'reward.coin', label: '奖励杯蜜币', type: 'int', optional: true, tip: '留空表示这个任务不奖币' }
				]
			}
		]
	}
}

/** 取某配置的元信息（无则 null，前端回退 JSON 模式） */
export function getMeta(key) { return CONFIG_META[key] || null }

/** 列表页摘要：优先用 meta.summary，否则通用摘要 */
export function briefOf(key, value) {
	const m = CONFIG_META[key]
	if (m && m.summary) { try { return m.summary(value) } catch (e) { /* 落到通用 */ } }
	const keys = Object.keys(value || {})
	return keys.length ? `${keys.length} 项：${keys.slice(0, 6).join('、')}${keys.length > 6 ? '…' : ''}` : '空对象'
}

/** 点「新增配置」时的空白载荷（有 meta 的键给一份可直接编辑的骨架） */
export function skeletonValue(key) {
	switch (key) {
		case 'rules': return { MAX_OFFLINE_HOURS: 48, INTERACT_DECAY_PER_HOUR: 2 }
		case 'leave': return { personal: { label: '事假', payCut: 0.5, canInteract: true, travel: 'allowed', mood: 0 } }
		case 'actions': return { hug: { name: '抱抱', emoji: '🤗', interaction: 3, health: 0, happiness: 2, cost: 0, cooldown: 300000, dailyLimit: 10 } }
		case 'jobs': return { newjob: { name: '新职业', emoji: '🧑‍💻', salary: 10, custom: false, shifts: [] } }
		case 'foods': return { list: [{ key: 'newfood', name: '新菜', emoji: '🍽️', kcal: 300, hunger: 30, happiness: 3, health: 0, cost: 3, light: false, tag: '自定义' }] }
		case 'travel_places': return { list: [{ key: 'newplace', name: '新地方', emoji: '🏝️', ms: 1800000, cost: 10 }] }
		case 'postcards': return { newplace: '我在远方寄回这张明信片～' }
		case 'emoticons': return { byState: { happy: ['(≧▽≦)'] }, byKeyword: [{ keywords: ['你好'], replies: ['你好呀 (´▽`ʃ♡ƪ)'] }] }
		case 'decor': return { milestones: { 3: 'hat' }, items: { hat: { key: 'hat', name: '小帽子', emoji: '🎩', slot: 'head', how: '连续陪伴 3 天解锁' } } }
		case 'care_tasks': return { list: [{ key: 'water', name: '多喝热水', emoji: '🍵' }], intervalMs: 600000, doctorIntervalMs: 300000 }
		case 'task_defs': return { list: [{ key: 'login', name: '每日登录', icon: '📅', target: 1, reward: { heart: 1 } }] }
		default: return {}
	}
}

/* ================= 读写与校验（供 ConfigForm / 保存前使用）================= */

function containerAt(root, path) {
	if (!path) return root
	const parts = String(path).split('.')
	let cur = root
	for (const p of parts) {
		if (cur[p] == null || typeof cur[p] !== 'object') return null
		cur = cur[p]
	}
	return cur
}

/** 读字段值（path 支持 a.b.c） */
export function readPath(obj, path) {
	if (!obj || !path) return ''
	const parts = String(path).split('.')
	let cur = obj
	for (const p of parts) {
		if (cur == null) return ''
		cur = cur[p]
	}
	return cur == null ? '' : cur
}

/** 写字段值：中间对象缺失时自动补，数字串不写成嵌套（如 milestones 的 3） */
export function writePath(obj, path, val) {
	const parts = String(path).split('.')
	let cur = obj
	for (let i = 0; i < parts.length - 1; i++) {
		const p = parts[i]
		if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {}
		cur = cur[p]
	}
	const last = parts[parts.length - 1]
	if (val === undefined) delete cur[last]
	else cur[last] = val
	return obj
}

/** 单个字段按类型转成存库值（d 为显示值→存库值的倍率，表单里已是存库值时为 1） */
export function castField(f, raw, d) {
	const t = f.type
	const div = d || 1
	if (t === 'int' || t === 'num') {
		if (typeof raw === 'number') return raw * div
		const s = String(raw == null ? '' : raw).trim()
		if (s === '') return null
		const n = Number(s)
		if (!isFinite(n)) return null
		return (t === 'int' ? Math.round(n * div) : n * div)
	}
	if (t === 'bool') return raw === true || raw === 'true'
	if (t === 'csv') {
		if (Array.isArray(raw)) return raw
		return String(raw == null ? '' : raw).split(/[,，、]/).map(s => s.trim()).filter(s => s)
	}
	if (t === 'lines') {
		if (Array.isArray(raw)) return raw
		return String(raw == null ? '' : raw).split('\n').map(s => s.trim()).filter(s => s)
	}
	return typeof raw === 'string' ? raw : raw
}

/**
 * 按描述表把表单值转成存库值，并挑出非法项
 * @returns {{ value:Object, errors:[String] }}
 */
export function coerceConfig(meta, model) {
	const errors = []
	const value = JSON.parse(JSON.stringify(model || {}))
	const label = (f) => f.label || f.path
	/** 区分「库里没有这个键」与「有键但值为空」，readPath 会把两者都返回 '' */
	const peek = (box, path) => {
		let cur = box
		const parts = String(path).split('.')
		for (const p of parts) {
			if (cur === null || cur === undefined || typeof cur !== 'object' || !(p in cur)) return undefined
			cur = cur[p]
		}
		return cur
	}
	/**
	 * 表单里的数字已经是存库值（ConfigField 失焦时乘过 divide），这里只负责：
	 * 字符串→数字、把用户输入的非数字按显示单位换算、非数字空字段删键
	 */
	const handleField = (box, f, where) => {
		const raw = peek(box, f.path)
		const isNum = f.type === 'int' || f.type === 'num'
		if (raw === '' || raw === null || raw === undefined) {
			const absent = raw === undefined // 库里本来就没这个字段
			if (isNum) {
				// 库里没有 → 当可选项放过；被管理员清空 → 除标了 optional 的字段外报错
				if (!absent && !f.optional) errors.push(`${where}「${label(f)}」要填数字`)
			} else {
				// 文本类留空则删掉键，避免写入 ''
				writePath(box, f.path, undefined)
			}
			return
		}
		if (f.type === 'int' || f.type === 'num') {
			const div = f.divide || 1
			if (typeof raw === 'number') {
				if (!isFinite(raw)) { errors.push(`${where}「${label(f)}」不是合法数字`); return }
				writePath(box, f.path, f.type === 'int' ? Math.round(raw) : raw)
			} else {
				const s = String(raw).trim()
				const n = Number(s)
				if (s === '' || !isFinite(n)) { errors.push(`${where}「${label(f)}」不是合法数字`); return }
				// 没乘过 divide 的输入（JSON 模式残留 / 程序写入的显示值）按显示单位换算
				writePath(box, f.path, f.type === 'int' ? Math.round(n * div) : n * div)
			}
		} else {
			writePath(box, f.path, castField(f, raw, 1))
		}
	}
	const handleFields = (fields, box, where) => (fields || []).forEach(f => handleField(box, f, where))
	const handleItems = (sec, arrPath, box, where) => {
		const arr = readPath(box, arrPath)
		if (!Array.isArray(arr)) return
		arr.forEach((it, i) => handleFields(sec.itemFields, it, `${where}${(it && (it[sec.nameField] || it.key || it.name)) || ('第 ' + (i + 1) + ' 项')}`))
		if (sec.itemSections) sec.itemSections.forEach(s => dispatch(s, it, where))
	}
	const dispatch = (sec, box, where) => {
		// 省写 type 即平铺字段（rules / care_tasks 的节奏分组）
		if (!sec.type || sec.type === 'fields') { handleFields(sec.fields, box, where); return }
		if (sec.type === 'items') { handleItems(sec, sec.path, box, where); return }
		if (sec.type === 'entries') {
			const target = containerAt(box, sec.path) || box
			Object.keys(target).forEach(k => {
				const item = target[k]
				if (!item || typeof item !== 'object') return
				handleFields(sec.itemFields, item, `${where}${k}`)
				if (sec.itemSections) sec.itemSections.forEach(s => dispatch(s, item, `${where}${k}`))
			})
			return
		}
		// states / kv 都是纯字符串，交给自己维护的控件处理，这里只清掉空串
		if (sec.type === 'states' || sec.type === 'kv') {
			const target = containerAt(box, sec.path) || box
			Object.keys(target).forEach(k => {
				const v = target[k]
				if (Array.isArray(v)) target[k] = v.filter(s => String(s || '').trim())
				else if (typeof v === 'string' && !v.trim()) delete target[k]
			})
		}
	}
	;(meta.sections || []).forEach(sec => dispatch(sec, value, ''))
	return { value, errors }
}
