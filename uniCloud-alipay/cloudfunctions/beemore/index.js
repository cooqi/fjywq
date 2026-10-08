'use strict';
/**
 * 电子杯蜜（beemore）云函数 —— 电子闺蜜 / 数字打工人逻辑 V1.0
 * 核心：状态机（空闲/工作/休息/睡觉/请假/旅行/旷工）+ 全局日程配置 + 请假旷工 + 睡觉打扰 +
 *       去宠物化互动（陪伴/聊天/送礼）+ 状态化颜文字聊天 + 旅行消耗工资与明信片 + 全量数据可配。
 * 数据集合：beemore_pets / beemore_logs / beemore_diary / beemore_friends / beemore_chat / beemore_config
 * 错误码：0成功 1001未登录 2001参数 3001冷却 3002超上限 3003已满 4001需调养 4002状态锁定(工作/睡觉) 5001无权限 5002无杯蜜 9001系统
 */
const { loadConfig } = require('./configLoader.js')
const { ACTION_LINES, LOOK_PARTS, BANNED_WORDS } = require('./constants.js')
const db = uniCloud.database()
const $ = db.command
const PETS = 'beemore_pets'
const LOGS = 'beemore_logs'
const DIARY = 'beemore_diary'
const FRIENDS = 'beemore_friends'
const CHAT = 'beemore_chat'
const NOTICES = 'beemore_notices'

const err = (code, message) => ({ code, message: message || '', data: null })
const ok = (data, message) => ({ code: 0, message: message || 'ok', data: data || null })

const STATUS_LABEL = { idle: '空闲', working: '工作中', resting: '休息中', sleeping: '睡觉中', leave: '请假中', traveling: '旅行中', absent: '旷工' }
const STATUS_HINT = {
	working: '杯蜜正在上班，现在打扰会扣工资和心情，午休再聊吧～',
	sleeping: '杯蜜已睡着，消息会醒来后回复，强行叫醒影响健康和心情～',
	resting: '午休时间，可以互动，但别聊太多影响下午状态哦～',
	leave: '请假中，可以尽情陪她～',
	traveling: '旅行中，等她寄回明信片吧～',
	idle: '现在有空，随便玩～',
	absent: '上次上班旅行没请假，按旷工处理了……'
}

// ---- 时间工具 ----
function dayStr(ts) {
	const d = new Date(ts || Date.now())
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function pick(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '嗯嗯～' }
function parseHM(s) { const p = String(s || '0:0').split(':'); return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0) }

// ---- 日程/状态机 ----
function matchesWindow(dow, mins, weekdays, start, end) {
	const s = parseHM(start), e = parseHM(end)
	const wd = Array.isArray(weekdays) && weekdays.length ? weekdays : [0, 1, 2, 3, 4, 5, 6]
	if (s <= e) return wd.includes(dow) && mins >= s && mins < e
	const prev = (dow + 6) % 7 // 跨天：凌晨段归属前一天
	return (mins >= s && wd.includes(dow)) || (mins < e && wd.includes(prev))
}
/** 生效工作时段：自由职业取用户 customShifts；普通职业取 job.shifts（可按 workPlan.shiftKey 选其一）；无职业或职业未配班次回退全局 schedule.workShifts */
function activeWorkShifts(pet, cfg) {
	const ALL = [0, 1, 2, 3, 4, 5, 6]
	const globalShifts = (cfg.schedule && cfg.schedule.workShifts) || []
	const job = (cfg.jobs || {})[pet.job]
	if (!job) return { custom: false, own: false, shifts: globalShifts, all: ALL }
	if (job.custom) return { custom: true, own: true, shifts: (pet.workPlan && pet.workPlan.customShifts) || [], all: ALL }
	const list = job.shifts && job.shifts.length ? job.shifts : null
	if (!list) return { custom: false, own: false, shifts: globalShifts, all: ALL }
	const key = (pet.workPlan && pet.workPlan.shiftKey) || ''
	const chosen = key ? list.filter(s => s.key === key) : list
	return { custom: false, own: true, shifts: chosen.length ? chosen : list, all: ALL }
}
/** 生效睡眠时段：用户自定义(sleepPlan.on)优先，否则全局默认 */
function activeSleep(pet, cfg) {
	const sp = pet.sleepPlan
	if (sp && sp.on && sp.start && sp.end) return { start: sp.start, end: sp.end, weekdays: sp.weekdays }
	return (cfg.schedule && cfg.schedule.sleep) || null
}
function computeStatus(pet, now, cfg) {
	const d = new Date(now), dow = d.getDay(), mins = d.getHours() * 60 + d.getMinutes()
	const sc = cfg.schedule || {}
	const t = pet.travel || {}
	if (t.place && t.endAt && now < t.endAt) return 'traveling' // 旅行叠加优先
	const sl = activeSleep(pet, cfg)
	if (sl && matchesWindow(dow, mins, sl.weekdays, sl.start, sl.end)) return 'sleeping'
	if (pet.leave && pet.leave.type && pet.leave.endAt && now < pet.leave.endAt) return 'leave'
	const aw = activeWorkShifts(pet, cfg)
	// 不设职业 = 不工作：working/resting（班间午休人设）均不生效，也不受睡眠外的作息约束
	if (pet.job && aw.shifts.some(w => matchesWindow(dow, mins, w.weekdays, w.start, w.end))) return 'working'
	const rest = sc.restWindows || []
	if (pet.job && rest.some(w => matchesWindow(dow, mins, w.weekdays, w.start, w.end))) return 'resting'
	return 'idle'
}
function buildStatusInfo(pet, cfg) {
	const status = pet.status || 'idle'
	const locked = status === 'working' || status === 'sleeping'
	const starveTh = (cfg.rules && cfg.rules.HUNGER_STARVE) || 80
	const hungry = (pet.hunger || 0) >= starveTh
	let hint = STATUS_HINT[status] || ''
	// 饿了不影响“能不能打扰”，但要在提示里带上，提醒主人趁休息喂点东西
	if (hungry && !locked) hint = (hint ? hint + ' ' : '') + '她肚子饿得咕咕叫了，趁休息喂点东西吧～'
	return { status, label: STATUS_LABEL[status] || status, locked, hint, hungry }
}
/** 今日最后一个班次的下班时刻（跨天班次算到次日凌晨；今日无班返回 0） */
function lastOffDutyTs(pet, cfg, now) {
	if (!pet.job) return 0
	const d = new Date(now), dow = d.getDay(), mins = d.getHours() * 60 + d.getMinutes()
	const dayStart = now - mins * 60000
	const ALLD = [0, 1, 2, 3, 4, 5, 6]
	const aw = activeWorkShifts(pet, cfg)
	let last = 0
	for (const w of (aw.shifts || [])) {
		const wd = (w.weekdays && w.weekdays.length) ? w.weekdays : ALLD
		const s = parseHM(w.start), e = parseHM(w.end)
		let endTs = 0
		if (s <= e) {
			if (wd.includes(dow) && mins < e) endTs = dayStart + e * 60000
		} else {
			if (wd.includes(dow)) endTs = dayStart + 86400000 + e * 60000 // 今日开班、次日凌晨下班
			else if (mins < e && wd.includes((dow + 6) % 7)) endTs = dayStart + e * 60000 // 此刻处于昨日跨天班的凌晨尾段
		}
		if (endTs > last) last = endTs
	}
	return last
}
/** 今日作息：按当前星期取生效的上班班次/休息窗口/睡眠，供主面板展示（无职业返回 null） */
function buildScheduleInfo(pet, cfg, now) {
	if (!pet.job) return null
	const dow = new Date(now).getDay()
	const inToday = (weekdays) => (Array.isArray(weekdays) && weekdays.length ? weekdays.includes(dow) : true)
	const fmtW = (w) => ({ name: w.name || '', start: w.start, end: w.end })
	const aw = activeWorkShifts(pet, cfg)
	const work = (aw.shifts || []).filter(w => inToday(w.weekdays)).map(fmtW)
	const sc = cfg.schedule || {}
	const rest = (sc.restWindows || []).filter(w => inToday(w.weekdays)).map(fmtW)
	const sl = activeSleep(pet, cfg)
	const sleep = sl && sl.start && sl.end && inToday(sl.weekdays) ? { start: sl.start, end: sl.end } : null
	return { hasJob: true, work, rest, sleep, offAt: lastOffDutyTs(pet, cfg, now) }
}
function assertNotLocked(pet, msg) {
	const s = pet.status
	if (s === 'working' || s === 'sleeping') {
		return err(4002, msg || (s === 'working' ? '杯蜜正在上班，下班后再试。' : '杯蜜已睡着，醒来后再试。'))
	}
	return null
}

// ---- 颜文字/文案选择 ----
function pickEmoticon(cfg, state, mood, text) {
	const emo = cfg.emoticons || {}
	if (text && Array.isArray(emo.byKeyword)) {
		for (const g of emo.byKeyword) {
			if (g.keywords && g.keywords.some(k => String(text).includes(k)) && g.replies && g.replies.length) {
				return pick(g.replies)
			}
		}
	}
	const byState = emo.byState || {}
	const pool = byState[state] || byState[mood] || byState.normal || ['嗯嗯～']
	return pick(pool)
}
function pickActionLine(cfg, actionKey, mood) {
	if (actionKey === 'chat') return pickEmoticon(cfg, 'happy', mood, '')
	if (ACTION_LINES[actionKey] && ACTION_LINES[actionKey].length) return pick(ACTION_LINES[actionKey])
	return pickEmoticon(cfg, 'happy', mood, '')
}

// 上班中收到消息的固定话术：清楚表达“我正在上班，下班再联系”
const WORKING_REPLIES = [
	'我现在在上班啦，不方便看手机，下班再联系你好吗？💼',
	'上班中…你说的话我记下啦，下班第一时间找你！(๑•̀ㅂ•́)و✧',
	'嘘，我在忙工作，下班后再联系哦～ 🕒',
	'我正在上班呢，等我下班就回来陪你聊天！💪'
]

// ---- 离线衰减 & 心情 ----
/** 饥饿值：0-100，数值越大越饿（存量数据无该字段时按“有点饿”初始化） */
function hungerOf(pet) { return pet.hunger == null ? 35 : clamp(pet.hunger, 0, 100) }
function simulateDecay(pet, now, R) {
	let interaction = pet.interaction || 0
	let health = pet.health || 0
	let happiness = pet.happiness == null ? 60 : pet.happiness
	let hunger = hungerOf(pet)
	// 离线每小时：互动/开心下降、饥饿上升；饿过头（>=HUNGER_STARVE）连健康一起掉，生病时饿得更快
	const rise = (R.HUNGER_RISE_PER_HOUR || 3) + (pet.mood === 'sick' ? (R.SICK_HUNGER_RISE || 2) : 0)
	const since = Math.max(0, now - (pet.lastCalcAt || now))
	const hours = Math.min(Math.floor(since / 3600000), R.MAX_OFFLINE_HOURS)
	let lowHours = 0
	for (let h = 0; h < hours; h++) {
		interaction = clamp(interaction - R.INTERACT_DECAY_PER_HOUR, 0, 100)
		happiness = clamp(happiness - R.HAPPY_DECAY_PER_HOUR, 0, 100)
		hunger = clamp(hunger + rise, 0, 100)
		if (hunger >= (R.HUNGER_STARVE || 80)) {
			health = clamp(health - (R.HUNGER_HEALTH_DECAY || 1), 0, 100)
			happiness = clamp(happiness - (R.HUNGER_HAPPY_DECAY || 1), 0, 100)
		}
		if (R.HEALTH_DECAY_OFFLINE) {
			if (interaction >= 60) health = Math.min(clamp(health + R.RECOVER_PER_HOUR, 0, 100), R.HEALTH_RECOVER_CAP)
			else if (interaction >= 30) health = clamp(health - R.HEALTH_SLOW_DECAY, 0, 100)
			else health = clamp(health - R.HEALTH_FAST_DECAY, 0, 100)
		}
		if (interaction < R.SICK_INTERACT) lowHours++
	}
	if (pet.recoveringUntil && now < pet.recoveringUntil) health = clamp(health, 50, 100)
	return { interaction, health, happiness, hunger, sickByLowInteract: lowHours >= R.SICK_HOURS }
}
function computeMood(pet, interaction, health, happiness, now, sickByLowInteract, R) {
	const TH = (R.MOOD_TH) || { happy: { interaction: 80, health: 80, happiness: 80 }, unhappy: 40 }
	if (health <= 0) return 'sick' // 健康归零＝危重：必须就医服药，不能靠陪伴/自愈恢复
	if (pet.recoveringUntil && now < pet.recoveringUntil) return 'recovering'
	// 生病不再硬性锁定：只要脱离危险区（健康/互动回升，例如靠陪伴恢复），下方判定会让她好转进入恢复中
	let lowInteractSick = sickByLowInteract
	if (interaction < R.SICK_INTERACT) {
		const sinceLow = pet.lowIntimacySince || now
		if (now - sinceLow >= R.SICK_HOURS * 3600000) lowInteractSick = true
	}
	if (health < R.SICK_HEALTH || lowInteractSick) return 'sick'
	// 饿着肚子谈不上“开心”，饥饿值过高时心情最高只能到 normal
	const starving = hungerOf(pet) >= (R.HUNGER_STARVE || 80)
	if (!starving && interaction >= TH.happy.interaction && health >= TH.happy.health && happiness >= TH.happy.happiness) return 'happy'
	if (interaction < TH.unhappy || happiness < TH.unhappy) return 'unhappy'
	return 'normal'
}

// ---- 体型（吃太多长胖 / 生病消瘦）----
/** 体重基线：老数据或未填体重时按性别给默认值，并锁定基础体重作为胖瘦浮动区间的中心 */
function ensureBody(pet, R) {
	const f = (pet.look && pet.look.gender === 'f') || pet.gender === '女生' || pet.gender === 'f'
	if (!pet.weight || pet.weight < 25 || pet.weight > 200) pet.weight = (R.DEFAULT_WEIGHT || {})[f ? 'f' : 'm'] || 55
	if (!pet.weightBase || pet.weightBase < 25 || pet.weightBase > 200) pet.weightBase = pet.weight
	if (pet.overKcal == null) pet.overKcal = 0
	return pet
}
/** 多余热量攒够 FAT_KCAL_PER_KG 就 +1kg，返回本次实际涨的公斤数 */
function gainWeight(pet, surplus, R) {
	const per = R.FAT_KCAL_PER_KG || 240
	const cap = pet.weightBase + (R.WEIGHT_MAX_GAIN || 20)
	let over = (pet.overKcal || 0) + Math.max(0, Math.round(surplus))
	let gain = 0
	while (over >= per && pet.weight + gain < cap) { over -= per; gain++ }
	if (pet.weight + gain >= cap) over = Math.min(over, per - 1) // 已胖到上限就不再继续堆积
	pet.overKcal = Math.max(0, Math.round(over))
	if (gain > 0) pet.weight = clamp(pet.weight + gain, 25, 200)
	return gain
}
/** 生病消瘦：每轮生病扣 1kg，不低于 基础体重-WEIGHT_MAX_LOSE；返回掉的公斤数 */
function loseWeightBySick(pet, R) {
	const floor = Math.max(25, (pet.weightBase || pet.weight || 55) - (R.WEIGHT_MAX_LOSE || 8))
	if (pet.weight <= floor) return 0
	const before = pet.weight
	pet.weight = Math.max(floor, pet.weight - (R.SICK_WEIGHT_LOSS || 1))
	return before - pet.weight
}

// ---- 形象（头发为可选部件）----
/**
 * 补齐/升级 look，返回是否改动（需要回写数据库）
 * ver:3 起头发不再默认长在头上：旧版形象的 hair 是领养时的系统默认值而非用户选择，升级时一并清成“无发”
 */
function ensureHair(pet) {
	const l = pet.look
	if (!l || typeof l !== 'object') return false
	const valid = LOOK_PARTS.hairs.includes(l.hair)
	if (l.ver === LOOK_PARTS.VER) {
		if (valid) return false
		pet.look = Object.assign({}, l, { hair: 'none' })
		return true
	}
	pet.look = Object.assign({}, l, { ver: LOOK_PARTS.VER, hair: 'none' })
	return true
}

function ensureDaily(pet, now) {
	const today = dayStr(now)
	if (!pet.daily || pet.daily.date !== today) {
		pet.daily = { date: today, actions: {}, variety: [], interact: 0, login: 0, help: 0, heal: 0, disturb: 0, chat: 0, meals: 0 }
		pet.lastActionAt = {}
		return true
	}
	return false
}

// 读取杯蜜并落库最新衰减 + 状态
async function loadAndDecay(userId, now, cfg) {
	const res = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!res.data.length) return { pet: null }
	const pet = res.data[0]
	const R = cfg.rules
	const prevCalcAt = pet.lastCalcAt || now
	const isNewDay = ensureDaily(pet, now)
	ensureBody(pet, R) // 存量数据没有体重基线/热量累计时先补齐
	const lookUpgraded = ensureHair(pet) // 存量形象补写“头发可选、默认无发”
	const sim = simulateDecay(pet, now, R)
	let lowIntimacySince = pet.lowIntimacySince || 0
	if (sim.interaction < R.SICK_INTERACT) { if (!lowIntimacySince) lowIntimacySince = prevCalcAt || now }
	else lowIntimacySince = 0
	const moodCtx = Object.assign({}, pet, { lowIntimacySince, hunger: sim.hunger })
	let newMood = computeMood(moodCtx, sim.interaction, sim.health, sim.happiness, now, sim.sickByLowInteract, R)
	const status = computeStatus(pet, now, cfg)
	// 健康归零＝危重：强制进入“生病需就医”，并禁止靠陪伴/自愈恢复
	const healthZero = sim.health <= 0
	if (healthZero) newMood = 'sick'
	// 生病但在休养/陪伴下已脱离危险区 → 视为被治好，进入“恢复中”，本轮护理进度清零
	let healedByCompany = false
	if (!healthZero && pet.mood === 'sick' && newMood !== 'sick') { newMood = 'recovering'; healedByCompany = true }
	let recoveringUntil = pet.recoveringUntil || 0
	if (healedByCompany) recoveringUntil = now + 24 * 3600000
	const changed = {
		interaction: sim.interaction, health: sim.health, happiness: sim.happiness, hunger: sim.hunger,
		mood: newMood, status, lowIntimacySince, lastCalcAt: now,
		daily: pet.daily, lastActionAt: pet.lastActionAt || {}, recoveringUntil
	}
	// 新一轮生病：护理进度重置，从第一步开始（避免沿用上一轮未完成的“多喝水/好好休息”记录）
	if (pet.mood !== 'sick' && newMood === 'sick') {
		changed.sickAt = now
		changed.care = { done: [], lastCareAt: 0 }
		await addDiary(pet._id, 'sick', '杯蜜最近太累了，作息紊乱需要调养一下 (x_x)', '需要调养')
		// 生病吃不下饭，体重随之下降，同样记入日记
		const lost = loseWeightBySick(pet, R)
		if (lost > 0) await addDiary(pet._id, 'thin', `杯蜜一难受就吃不下饭，瘦了 ${lost}kg（现 ${pet.weight}kg），看着好心疼 🥺`, '生病变瘦')
	} else if (healthZero && (pet.health || 0) > 0) {
		// 已生病但健康刚跌到 0：病情危重，必须重新就医服药 → 护理进度重置回“按医嘱服药”
		changed.sickAt = now
		changed.care = { done: [], lastCareAt: 0 }
		await addDiary(pet._id, 'sick', '杯蜜健康透支到 0，必须重新就医服药 💊', '需就医')
		const lost = loseWeightBySick(pet, R)
		if (lost > 0) await addDiary(pet._id, 'thin', `病情加重，杯蜜又瘦了 ${lost}kg（现 ${pet.weight}kg），先好好吃饭再看医生 🥺`, '生病变瘦')
	}
	// 陪伴/休养治好：清零本轮护理进度并记日记（未做完的后续护理不再显示）
	if (healedByCompany) {
		changed.care = { done: [], lastCareAt: 0 }
		changed.sickAt = 0
		await addDiary(pet._id, 'recover', '在你的陪伴下，杯蜜慢慢好起来了 (๑•̀ㅂ•́)و✧', '恢复中')
	}
	if (pet.mood === 'recovering' && newMood !== 'recovering' && newMood !== 'sick') {
		await addDiary(pet._id, 'recover', '杯蜜彻底康复啦，满血复活！(ﾉ>ω<)ﾉ', '已康复')
	}
	// 跨天且没有多余热量堆积：偏胖的体重每天缓慢回落 1kg（回到基础体重即停）
	if (isNewDay && (pet.overKcal || 0) <= 0 && pet.weight > pet.weightBase) {
		pet.weight -= 1
		if (pet.weight === pet.weightBase) await addDiary(pet._id, 'thin', `体重慢慢回到 ${pet.weight}kg，最近吃得刚刚好 ✨`, '回到标准体重')
	}
	changed.weight = pet.weight
	changed.weightBase = pet.weightBase
	changed.overKcal = pet.overKcal
	if (lookUpgraded) changed.look = pet.look
	await db.collection(PETS).doc(pet._id).update(changed)
	Object.assign(pet, changed)
	return { pet, prevCalcAt }
}

async function addDiary(petId, type, text, title) {
	await db.collection(DIARY).add({ pet_id: petId, type, title: title || text.slice(0, 8), text, create_date: Date.now() })
}
// 写入一条消息通知（接收方为 petId/userId，from 为发起方杯蜜文档）
async function addNotice({ petId, userId, type, title, text, from, link }) {
	await db.collection(NOTICES).add({
		pet_id: petId, user_id: userId, type, title: title || '', text,
		from_pet: (from && from._id) || '', from_code: (from && from.friendCode) || '',
		from_name: (from && from.name) || '', from_emoji: (from && from.emoji) || '',
		link: link || '', read: false, create_date: Date.now()
	})
}

exports.main = async (event, context) => {
	const { action } = event
	const cfg = await loadConfig(db)
	try {
		switch (action) {
			case 'getStatus': return await getStatus(event, cfg)
			case 'getConfig': return ok({ config: cfg })
			case 'adopt': return await adopt(event, cfg)
			case 'interact': return await interact(event, cfg)
			case 'eat': return await eat(event, cfg)
			case 'chat': return await chat(event, cfg)
			case 'chatHistory': return await chatHistory(event, cfg)
			case 'clinicVisit': return await clinicVisit(event, cfg)
			case 'clinicCare': return await clinicCare(event, cfg)
			case 'tasks': return await getTasks(event, cfg)
			case 'claimTask': return await claimTask(event, cfg)
			case 'work':
			case 'settleWork': return await settleWork(event, cfg)
			case 'applyLeave': return await applyLeave(event, cfg)
			case 'setWorkPlan': return await setWorkPlan(event, cfg)
			case 'setSleepPlan': return await setSleepPlan(event, cfg)
			case 'diary': return await getDiary(event, cfg)
			case 'helpFriend': return await helpFriend(event, cfg)
			case 'addFriend': return await addFriend(event, cfg)
			case 'friendList': return await friendList(event, cfg)
			case 'noticeList': return await noticeList(event, cfg)
			case 'noticeRead': return await noticeRead(event, cfg)
			case 'acceptFriend': return await acceptFriend(event, cfg)
			case 'rejectFriend': return await rejectFriend(event, cfg)
			case 'removeFriend': return await removeFriend(event, cfg)
			case 'travel': return await travel(event, cfg)
			case 'travelCheck': return await travelCheck(event, cfg)
			case 'wardrobe': return await wardrobe(event, cfg)
			case 'equip': return await equip(event, cfg)
			case 'customizeLook': return await customizeLook(event, cfg)
			case 'rename': return await rename(event, cfg)
			case 'setJob': return await setJob(event, cfg)
			case 'setNotify': return await setNotify(event, cfg)
			case 'clearData': return await clearData(event, cfg)
			case 'timedScan': return await timedScan(event, cfg)
			default: return err(2001, '未知的操作类型')
		}
	} catch (e) {
		console.error('beemore error', action, e)
		return err(9001, '系统错误：' + e.message)
	}
}

// ================= 状态 =================
async function getStatus(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet, prevCalcAt } = await loadAndDecay(userId, now, cfg)
	if (!pet) return ok({ pet: null, needAdopt: true })
	if (pet.daily.login === 0) {
		pet.daily.login = 1
		pet.interaction = clamp(pet.interaction + cfg.rules.DAILY_LOGIN_BONUS, 0, 100)
		const today = dayStr(now)
		if (pet.lastVisitDate && pet.lastVisitDate !== today) {
			const y = new Date(now - 86400000)
			pet.streak = (pet.lastVisitDate === dayStr(y.getTime())) ? (pet.streak || 0) + 1 : 1
		} else if (!pet.lastVisitDate) pet.streak = 1
		pet.lastVisitDate = today
		const decor = (cfg.decor.milestones || {})[pet.streak]
		if (decor && !(pet.decorUnlocked || []).includes(decor)) {
			pet.decorUnlocked = (pet.decorUnlocked || []).concat(decor)
			await addDiary(pet._id, 'unlock', `连续陪伴 ${pet.streak} 天，解锁新装扮！`)
		}
		await db.collection(PETS).doc(pet._id).update({
			daily: pet.daily, interaction: pet.interaction, streak: pet.streak,
			lastVisitDate: pet.lastVisitDate, decorUnlocked: pet.decorUnlocked
		})
	}
	const unreadRes = await db.collection(NOTICES).where({ pet_id: pet._id, read: false }).count()
	return ok({ pet, statusInfo: buildStatusInfo(pet, cfg), schedule: buildScheduleInfo(pet, cfg, now), awayTipBase: prevCalcAt || now, unreadNotices: (unreadRes && unreadRes.total) || 0 })
}

// ================= 领养 =================
async function adopt(event, cfg) {
	const { userId, profile } = event
	if (!userId) return err(1001)
	if (!profile || !profile.name) return err(2001, '杯蜜名字不能为空')
	const exist = await db.collection(PETS).where({ user_id: userId }).count()
	if (exist.total > 0) return err(2001, '已经有一只杯蜜啦')
	const name = String(profile.name).slice(0, 12)
	if (hasBadWord(name)) return err(2001, '名字包含不适宜内容')
	const now = Date.now()
	// 每个杯蜜拿一份独立副本，避免存量形象升级时改到共享常量
	const look = Object.assign({}, (profile.gender === '女生' || profile.gender === 'f') ? LOOK_PARTS.DEFAULT.f : LOOK_PARTS.DEFAULT.m)
	const job = profile.job && cfg.jobs[profile.job] ? profile.job : ''
	const status = computeStatus({ travel: {}, leave: {}, job }, now, cfg)
	// 体重：未填或明显不合理时按性别给默认值，并作为“基础体重”（后续胖瘦都在它附近浮动）
	const isGirl = profile.gender === '女生' || profile.gender === 'f'
	let weight = Number(profile.weight) || 0
	if (weight < 25 || weight > 200) weight = (cfg.rules.DEFAULT_WEIGHT || {})[isGirl ? 'f' : 'm'] || 55
	const doc = {
		user_id: userId, name, look, emoji: profile.emoji || '🐥',
		gender: profile.gender || '', age: Number(profile.age) || 0, height: Number(profile.height) || 0,
		weight, weightBase: weight, overKcal: 0,
		likes: Array.isArray(profile.likes) ? profile.likes.slice(0, 6) : [], job,
		interaction: 60, health: 80, happiness: 60, hunger: 30, mood: 'happy', status,
		growth: 0, level: 1, heart: 0, coin: 10000,
		friendCode: genCode(), friends: [],
		lastCalcAt: now, lastActionAt: {}, recoveringUntil: 0, sickAt: 0, lowIntimacySince: 0,
		care: { done: [], lastCareAt: 0 },
		daily: { date: dayStr(now), actions: {}, variety: [], interact: 0, login: 1, help: 0, heal: 0, disturb: 0, chat: 0, meals: 0 },
		work: { lastWorkDate: '', state: '' },
		leave: { type: '', startAt: 0, endAt: 0, reason: '' },
		restInteract: { at: 0, count: 0 },
		workPlan: { shiftKey: '', customShifts: [] },
		sleepPlan: { on: false },
		wallet: { todayWage: 0, lastSettleDate: '' },
		absentLog: [],
		travel: { place: '', endAt: 0 },
		equippedItems: [], streak: 1, lastVisitDate: dayStr(now), decorUnlocked: [],
		notifyOn: true, adoptAt: now, create_date: now
	}
	const res = await db.collection(PETS).add(doc)
	await addDiary(res.id, 'adopt', `第一次相遇！你领养了电子闺蜜「${name}」${doc.emoji}`)
	return ok({ pet: Object.assign({ _id: res.id }, doc), statusInfo: buildStatusInfo(doc, cfg) }, '领养成功')
}

// ================= 互动（陪伴/送礼；工作/睡觉按打扰处理）=================
async function interact(event, cfg) {
	const { userId, actionKey } = event
	if (!userId) return err(1001)
	if (!actionKey || !cfg.actions[actionKey]) return err(2001, '未知互动')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const R = cfg.rules
	const acfg = cfg.actions[actionKey]
	// 干饭有独立入口（能选菜、算热量、会胖瘦），interact 不处理吃饭
	if (actionKey === 'eat' || acfg.kind === 'meal') return err(2001, '吃饭请用「干饭」功能，那里能选吃什么～')
	const status = pet.status || 'idle'

	const lastAt = (pet.lastActionAt || {})[actionKey] || 0
	if (now - lastAt < acfg.cooldown) return Object.assign(err(3001), { data: { retryAfter: acfg.cooldown - (now - lastAt) } })
	const used = (pet.daily.actions && pet.daily.actions[actionKey]) || 0
	const overLimit = used >= acfg.dailyLimit

	// 送礼需币（非打扰场景才真正消耗）
	const willDisturb = status === 'working' || status === 'sleeping'
	if (acfg.cost > 0 && !willDisturb && !overLimit && (pet.coin || 0) < acfg.cost) {
		return err(2001, '杯蜜币不够啦，先工作赚点再送吧')
	}

	let gainI = acfg.interaction, gainH = acfg.health, gainP = acfg.happiness
	let dCoin = 0, dHealth = 0, line, disturb = false, wokeup = false
	if (overLimit) { gainI = 0; gainH = 0; gainP = 0 }

	if (status === 'working') {
		disturb = true
		dCoin += R.WORK_FORCE_INTERACT.coin
		gainP = R.WORK_FORCE_INTERACT.mood
		gainI = 0; gainH = 0
		pet.daily.disturb = (pet.daily.disturb || 0) + 1
		if (pet.daily.disturb > (R.WORK_DISTURB_HEALTH.threshold || 3)) dHealth += R.WORK_DISTURB_HEALTH.health
		line = pickEmoticon(cfg, 'working', pet.mood, '')
	} else if (status === 'sleeping') {
		wokeup = true
		gainI = 0; gainH = 0
		dHealth += R.SLEEP_WAKE.health
		gainP = R.SLEEP_WAKE.mood
		line = pickEmoticon(cfg, 'sleeping', pet.mood, '')
	} else if (status === 'resting') {
		const ri = pet.restInteract || { at: 0, count: 0 }
		const withinMin = now - ri.at < (R.REST_OVER.threshold.minutes || 20) * 60000
		const nextCount = withinMin ? ri.count + 1 : 1
		pet.restInteract = { at: withinMin ? ri.at : now, count: nextCount }
		if (nextCount > (R.REST_OVER.threshold.countPerHour || 5)) {
			dHealth += R.REST_OVER.health
			line = '让她休息一下吧～今天聊太多啦 (＿☆人)'
		} else line = pickActionLine(cfg, actionKey, pet.mood)
	} else {
		line = pickActionLine(cfg, actionKey, pet.mood)
	}

	// 送礼真正消耗（正常状态收益才生效）
	if (acfg.cost > 0 && !disturb && !wokeup && !overLimit) dCoin -= acfg.cost

	const curHap = pet.happiness == null ? 60 : pet.happiness
	const newInteraction = clamp((pet.interaction || 0) + gainI, 0, 100)
	const newHealth = clamp((pet.health || 0) + gainH + dHealth, 0, 100)
	const newHappiness = clamp(curHap + gainP, 0, 100)
	const newCoin = clamp((pet.coin || 0) + dCoin, 0, 999999)

	let growth = (pet.growth || 0) + (overLimit || disturb || wokeup ? 0 : 1)
	let level = pet.level || 1
	if (growth >= level * 20) { growth = 0; level += 1 }

	const variety = pet.daily.variety || []
	if (!overLimit && !variety.includes(actionKey)) variety.push(actionKey)
	pet.daily.actions[actionKey] = used + 1
	pet.daily.interact = (pet.daily.interact || 0) + 1
	pet.lastActionAt = Object.assign({}, pet.lastActionAt, { [actionKey]: now })
	let newMood = computeMood(pet, newInteraction, newHealth, newHappiness, now, false, R)
	// 健康归零＝危重：强制生病，必须去诊所重新就医服药（护理进度回到“按医嘱服药”）
	const healthZero = newHealth <= 0
	if (healthZero) newMood = 'sick'
	// 生病但在陪伴下脱离危险区 → 视为被治好，进入恢复中，本轮护理进度清零（后续“多喝水/好好休息”不再显示）
	let healedByCompany = false
	if (!healthZero && pet.mood === 'sick' && newMood !== 'sick') { newMood = 'recovering'; healedByCompany = true }
	// 因本次互动进入生病 / 或健康刚跌到 0：重置护理进度，必须重新从“服药”开始
	const enterSick = newMood === 'sick' && pet.mood !== 'sick'
	const reMed = healthZero && (pet.health || 0) > 0
	let healUpdate = {}
	let thinLost = 0
	if (healedByCompany) healUpdate = { recoveringUntil: now + 24 * 3600000, care: { done: [], lastCareAt: 0 }, sickAt: 0 }
	else if (enterSick || reMed) {
		healUpdate = { care: { done: [], lastCareAt: 0 }, sickAt: now }
		// 生病吃不下饭：当场体重下降 1kg，变化同样写进日记
		thinLost = loseWeightBySick(pet, R)
		if (thinLost > 0) { healUpdate.weight = pet.weight; healUpdate.overKcal = pet.overKcal }
	}

	// 并发防刷
	const fresh = await db.collection(PETS).doc(pet._id).get()
	const f = fresh.data && fresh.data[0]
	const freshLast = f && f.lastActionAt && f.lastActionAt[actionKey]
	if (freshLast && now - freshLast < acfg.cooldown) return Object.assign(err(3001), { data: { retryAfter: acfg.cooldown - (now - freshLast) } })

	await db.collection(PETS).doc(pet._id).update(Object.assign({
		interaction: newInteraction, health: newHealth, happiness: newHappiness, coin: newCoin, mood: newMood,
		growth, level, daily: pet.daily, lastActionAt: pet.lastActionAt, lastCalcAt: now, lastInteractAt: now, restInteract: pet.restInteract
	}, healUpdate))
	await db.collection(LOGS).add({ pet_id: pet._id, action: actionKey, d_interaction: gainI, d_health: gainH + dHealth, d_happiness: gainP, over_limit: overLimit, create_date: now })
	if (healedByCompany) await addDiary(pet._id, 'recover', '在你的陪伴下，杯蜜慢慢好起来了 (๑•̀ㅂ•́)و✧', '恢复中')
	else if (reMed) await addDiary(pet._id, 'sick', '杯蜜健康透支到 0，必须重新就医服药 💊', '需就医')
	else if (enterSick) await addDiary(pet._id, 'sick', '杯蜜最近太累了，作息紊乱需要调养一下 (x_x)', '需要调养')
	if (thinLost > 0) await addDiary(pet._id, 'thin', `一难受就吃不下饭，杯蜜瘦了 ${thinLost}kg（现 ${pet.weight}kg），看着好心疼 🥺`, '生病变瘦')

	return ok({
		pet: Object.assign({}, pet, { interaction: newInteraction, health: newHealth, happiness: newHappiness, coin: newCoin, mood: newMood, growth, level, care: healUpdate.care || pet.care, recoveringUntil: healUpdate.recoveringUntil || pet.recoveringUntil || 0 }),
		line: healedByCompany ? '有你在，我感觉好多了～ (๑•̀ㅂ•́)و✧' : line,
		gainI, gainH: gainH + dHealth, gainP, dCoin, overLimit, disturb, wokeup, status, statusInfo: buildStatusInfo(pet, cfg), recovered: healedByCompany, critical: healthZero
	})
}

// ================= 干饭（只能休息时吃；吃太多会长胖，胖瘦写进日记）=================
// 可进食的状态：午休/空闲/请假（上班、睡觉、旅行中一律不让吃）
const EAT_ALLOWED = ['resting', 'idle', 'leave']
const EAT_DENY_MSG = {
	working: '杯蜜正在上班，吃饭要等到休息时间哦～ 💼',
	sleeping: '睡觉时间不能吃东西，会积食的，等她醒来再说～ 😴',
	traveling: '旅行路上先忍着，回到家再一起吃好的 🎒'
}
async function eat(event, cfg) {
	const { userId, foodKey } = event
	if (!userId) return err(1001)
	const R = cfg.rules
	const foods = (cfg.foods && cfg.foods.list) || []
	const food = foods.find(f => f && f.key === foodKey)
	if (!food) return err(2001, '菜单里没有这道，换一个吧')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const status = pet.status || 'idle'
	if (EAT_ALLOWED.indexOf(status) < 0) return err(4002, EAT_DENY_MSG[status] || '这会儿不方便进食，等她空闲下来再吃吧～')
	// 生病只能吃清淡的（白粥/汤面/沙拉这类）
	if (pet.mood === 'sick' && !food.light) {
		const lightNames = foods.filter(f => f.light).slice(0, 3).map(f => f.name).join('、')
		return err(2001, `杯蜜生病啦，只能吃点清淡的（${lightNames}），油腻甜食的吃了会更难受～`)
	}
	const meals = (pet.daily && pet.daily.meals) || 0
	const limit = R.MEAL_DAILY_LIMIT || 8
	if (meals >= limit) return err(3002, `今天已经吃了 ${meals} 顿，胃要撑坏了，明天再吃吧`)
	const cooldown = R.MEAL_COOLDOWN_MS || 900000
	const lastMeal = (pet.lastActionAt && pet.lastActionAt.eat) || 0
	if (now - lastMeal < cooldown) return Object.assign(err(3001), { data: { retryAfter: cooldown - (now - lastMeal) } })
	const cost = Math.max(0, Math.round(food.cost || 0))
	if ((pet.coin || 0) < cost) return err(2001, `这顿要 ${cost} 杯蜜币，余额不够，先工作赚点吧`)

	// 热量结算：能抵消饥饿的那部分被“消耗”掉，其余变成多余热量堆积；
	// 不太饿还吃（吃太撑）或一天超顿数，则全额堆积 —— 这就是“吃太多会长胖”
	ensureBody(pet, R)
	const need = hungerOf(pet)
	const satisfy = Math.min(Math.max(0, food.hunger || 0), need)
	const burned = satisfy * (R.KCAL_PER_HUNGER || 10)
	const tooFull = need <= (R.EAT_TOO_FULL || 15)
	const overMeals = meals >= (R.MEAL_DAILY_SOFT || 3)
	const surplus = (tooFull || overMeals) ? (food.kcal || 0) : Math.max(0, (food.kcal || 0) - burned)
	const newHunger = clamp(need - satisfy, 0, 100)
	const fatGain = gainWeight(pet, surplus, R)
	const per = R.FAT_KCAL_PER_KG || 240

	let dHealth = food.health || 0
	if (tooFull) dHealth -= 1 // 吃太撑伤胃
	else if (need >= (R.HUNGER_STARVE || 80)) dHealth += 1 // 饿很久才吃上饭，按时吃回一点
	const newHealth = clamp((pet.health || 0) + dHealth, 0, 100)
	const newHappiness = clamp((pet.happiness == null ? 60 : pet.happiness) + (food.happiness || 0), 0, 100)
	const newInteraction = clamp((pet.interaction || 0) + 1, 0, 100) // 记得提醒她吃饭，亲近度 +1
	const newCoin = clamp((pet.coin || 0) - cost, 0, 999999)

	const daily = Object.assign({}, pet.daily, { meals: meals + 1 })
	const lastActionAt = Object.assign({}, pet.lastActionAt || {}, { eat: now })
	const moodCtx = Object.assign({}, pet, { hunger: newHunger, health: newHealth })
	let newMood = computeMood(moodCtx, newInteraction, newHealth, newHappiness, now, false, R)
	const healthZero = newHealth <= 0
	if (healthZero) newMood = 'sick'
	let healUpdate = {}
	let thinLost = 0
	const enterSick = newMood === 'sick' && pet.mood !== 'sick'
	if (enterSick || healthZero) {
		healUpdate = { care: { done: [], lastCareAt: 0 }, sickAt: now }
		thinLost = loseWeightBySick(pet, R)
		if (thinLost > 0) healUpdate.weight = pet.weight
	}

	await db.collection(PETS).doc(pet._id).update(Object.assign({
		hunger: newHunger, health: newHealth, happiness: newHappiness, interaction: newInteraction, coin: newCoin,
		mood: newMood, weight: pet.weight, weightBase: pet.weightBase, overKcal: pet.overKcal,
		daily, lastActionAt, lastCalcAt: now, lastInteractAt: now
	}, healUpdate))
	await db.collection(LOGS).add({
		pet_id: pet._id, action: 'eat', food: food.key, d_kcal: food.kcal || 0, d_surplus: Math.round(surplus),
		d_hunger: -satisfy, d_weight: fatGain, create_date: now
	})
	// 长胖必须进日记；吃得正常不刷屏，只记体重变化
	if (fatGain > 0) {
		await addDiary(pet._id, 'fat', `杯蜜这顿吃了${food.name} ${food.emoji}，热量没处放，体重涨到 ${pet.weight}kg（+${fatGain}kg）……都怪吃太多 (╥﹏╥)`, '长胖了')
	}
	if (thinLost > 0) await addDiary(pet._id, 'thin', `一难受就吃不下饭，杯蜜瘦了 ${thinLost}kg（现 ${pet.weight}kg）🥺`, '生病变瘦')
	else if (enterSick || healthZero) await addDiary(pet._id, 'sick', '杯蜜身体不太舒服，先停一停手上的事去诊所看看吧 🤒', '需要调养')

	let line
	if (tooFull) line = '唔……吃太撑了，肚子圆滚滚的，下次不许这样啦 (＞﹏＜)'
	else if (fatGain > 0) line = `${food.name}太好吃了！可是……体重又涨了 ${fatGain}kg，我要减肥了 🥺`
	else if (overMeals) line = `又吃一顿，今天第 ${meals + 1} 顿啦，热量全都堆上了 (๑•̀ㅄ•́ง)✧`
	else line = pick(ACTION_LINES.eat || [])
	const resPet = Object.assign({}, pet, {
		hunger: newHunger, health: newHealth, happiness: newHappiness, interaction: newInteraction,
		coin: newCoin, mood: newMood, daily, lastActionAt, care: healUpdate.care || pet.care
	})
	return ok({
		pet: resPet, line, status, statusInfo: buildStatusInfo(resPet, cfg),
		food: { key: food.key, name: food.name, emoji: food.emoji, kcal: food.kcal || 0 },
		hungerLeft: newHunger, weight: pet.weight, weightBase: pet.weightBase, fatGain, surplus: Math.round(surplus),
		toFat: Math.max(0, per - pet.overKcal), tooFull, meals: meals + 1, coin: newCoin, recovered: false
	}, '吃得开心')
}

// ================= 聊天（自定义内容 -> 颜文字回复）=================
async function chat(event, cfg) {
	const { userId, text } = event
	if (!userId) return err(1001)
	const clean = String(text || '').slice(0, 200)
	if (!clean.trim()) return err(2001, '说点什么吧')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const status = pet.status || 'idle'
	const queued = status === 'working' || status === 'sleeping'
	await db.collection(CHAT).add({ pet_id: pet._id, role: 'user', text: clean, state: status, queued, create_date: now })

	let reply, happy = 0
	if (queued) {
		// 上班中：固定回复“在上班、下班再联系”；其他锁定状态（如睡觉）依旧走配置表情
		reply = status === 'working' ? pick(WORKING_REPLIES) : pickEmoticon(cfg, status, pet.mood, '')
	} else {
		reply = pickEmoticon(cfg, pet.mood, pet.mood, clean)
		happy = 1
		pet.daily.chat = (pet.daily.chat || 0) + 1
		const nh = clamp((pet.happiness == null ? 60 : pet.happiness) + happy, 0, 100)
		pet.happiness = nh
		await db.collection(PETS).doc(pet._id).update({ happiness: nh, daily: pet.daily })
	}
	await db.collection(CHAT).add({ pet_id: pet._id, role: 'beemore', emoticon: reply, state: status, queued, create_date: now + 1 })
	return ok({ reply, queued, status })
}
async function chatHistory(event) {
	const { userId } = event
	if (!userId) return err(1001)
	const petRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!petRes.data.length) return err(5002)
	const res = await db.collection(CHAT).where({ pet_id: petRes.data[0]._id }).orderBy('create_date', 'desc').limit(50).get()
	return ok({ list: res.data.reverse() })
}

// ================= 诊所（过劳调养）=================
async function clinicVisit(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (pet.mood !== 'sick') return ok({ pet, visitable: false }, '杯蜜现在状态不错，不用调养')
	const reason = pickReason(pet, cfg)
	const doctor = await findDoctor(pet)
	return ok({
		pet, visitable: true, reason,
		tasks: cfg.care_tasks.list,
		care: pet.care || { done: [], lastCareAt: 0 },
		intervalMs: doctor.self ? cfg.care_tasks.doctorIntervalMs : cfg.care_tasks.intervalMs,
		doctor: doctor.info
	})
}
async function clinicCare(event, cfg) {
	const { userId, taskKey } = event
	if (!userId) return err(1001)
	if (!taskKey) return err(2001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (pet.mood !== 'sick') return err(2001, '杯蜜没有需要调养')
	const doctor = await findDoctor(pet)
	const care = pet.care || { done: [], lastCareAt: 0 }
	if (care.done.includes(taskKey)) return err(2001, '该护理已完成')
	const idx = cfg.care_tasks.list.findIndex(t => t.key === taskKey)
	const prevKey = idx > 0 ? cfg.care_tasks.list[idx - 1].key : null
	if (prevKey && !care.done.includes(prevKey)) return err(2001, '请先完成上一步护理')
	const interval = doctor.self ? cfg.care_tasks.doctorIntervalMs : cfg.care_tasks.intervalMs
	if (care.done.length && now - (care.lastCareAt || 0) < interval) {
		return Object.assign(err(3001), { data: { retryAfter: interval - (now - (care.lastCareAt || 0)) } })
	}
	care.done.push(taskKey); care.lastCareAt = now
	let update = { care }
	// 诊疗费只在第一步“按医嘱服药（看诊开药）”收取；“多喝热水”“好好休息”等后续护理免费
	let fee = 0
	if (idx === 0) {
		if (!doctor.self) { fee += cfg.rules.CLINIC_FEE; if (doctor.global) fee += cfg.rules.DOCTOR_FEE }
		if ((pet.coin || 0) < fee) return err(2001, `杯蜜币不足，本次看诊开药需 ${fee} 币（余额 ${pet.coin || 0}）`)
		if (fee > 0) update.coin = clamp((pet.coin || 0) - fee, 0, 999999)
		update.careFee = fee
	}
	if (care.done.length >= cfg.care_tasks.list.length) {
		const newHealth = clamp((pet.health || 0) + 30, 0, 100)
		const newInter = clamp((pet.interaction || 0) + 20, 0, 100)
		update = Object.assign(update, { health: newHealth, interaction: newInter, mood: 'recovering', recoveringUntil: now + 24 * 3600000, care: { done: [], lastCareAt: 0 }, sickAt: 0 })
		pet.daily.heal = (pet.daily.heal || 0) + 1
		update.daily = pet.daily
		await addDiary(pet._id, 'heal', '完成全部调养，杯蜜正在恢复中 🌱')
	}
	await db.collection(PETS).doc(pet._id).update(update)
	const finished = update.mood === 'recovering'
	const resPet = Object.assign({}, pet, { coin: update.coin != null ? update.coin : pet.coin })
	if (finished) Object.assign(resPet, { mood: 'recovering', health: update.health, interaction: update.interaction })
	return ok({ care: update.care, finished, fee, pet: resPet })
}

// ================= 每日任务 =================
async function getTasks(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	return ok({ tasks: buildTaskList(pet, cfg), streak: pet.streak || 1, heart: pet.heart || 0, coin: pet.coin || 0, hunger: hungerOf(pet), weight: pet.weight || 0 })
}
function buildTaskList(pet, cfg) {
	const claimed = pet.tasksClaimed || {}
	return (cfg.task_defs.list || []).map((t, i) => {
		let progress = 0
		if (t.key === 'login') progress = pet.daily.login || 0
		else if (t.key === 'interact') progress = pet.daily.interact || 0
		else if (t.key === 'variety') progress = (pet.daily.variety || []).length
		else if (t.key === 'help') progress = pet.daily.help || 0
		else if (t.key === 'heal') progress = pet.daily.heal || 0
		else if (t.key === 'meal') progress = pet.daily.meals || 0
		const done = progress >= t.target
		const id = `${pet.daily.date}:${i}`
		return { id, name: t.name, icon: t.icon, target: t.target, progress: Math.min(progress, t.target), done, claimed: !!claimed[id], reward: t.reward }
	})
}
async function claimTask(event, cfg) {
	const { userId, taskId } = event
	if (!userId) return err(1001)
	if (!taskId) return err(2001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const task = buildTaskList(pet, cfg).find(t => t.id === taskId)
	if (!task) return err(2001, '任务不存在')
	if (!task.done) return err(2001, '任务未完成')
	if (task.claimed) return err(2001, '奖励已领取')
	const claimed = Object.assign({}, pet.tasksClaimed || {}, { [taskId]: true })
	const heart = (pet.heart || 0) + (task.reward.heart || 0)
	const coin = clamp((pet.coin || 0) + (task.reward.coin || 0), 0, 999999)
	await db.collection(PETS).doc(pet._id).update({ tasksClaimed: claimed, heart, coin })
	return ok({ heart, coin, reward: task.reward }, '领取成功')
}

// ================= 工作结算 & 请假 =================
// 每日结算一次：正常上班发工资；请假按 payCut；旷工（上班期间旅行未请假）扣更多
async function settleWork(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (!pet.job) return err(2001, '杯蜜还没有职业，先去设置吧')
	const today = dayStr(now)
	const wallet = pet.wallet || { todayWage: 0, lastSettleDate: '' }
	if (wallet.lastSettleDate === today) return err(3001, '今天已经结算过工作了')
	const dow = new Date(now).getDay()
	const workDays = (cfg.schedule.workDays && cfg.schedule.workDays.length) ? cfg.schedule.workDays : [1, 2, 3, 4, 5]
	// 工作日判定：有固定/自定义班次的职业按班次星期并集；否则按全局 workDays
	const aw = activeWorkShifts(pet, cfg)
	const ALLD = [0, 1, 2, 3, 4, 5, 6]
	let isWorkDay
	if (aw.own && aw.shifts.length) isWorkDay = aw.shifts.some(s => (s.weekdays && s.weekdays.length ? s.weekdays : ALLD).includes(dow))
	else isWorkDay = workDays.includes(dow)
	if (!isWorkDay) {
		wallet.lastSettleDate = today; wallet.todayWage = 0
		await db.collection(PETS).doc(pet._id).update({ wallet })
		return ok({ rest: true, wallet }, '今天是休息日，杯蜜不用上班～')
	}
	// 生病（需调养）期间不能上班：先去诊所把她照顾好，再回来结算
	if (pet.mood === 'sick') return err(4001, '杯蜜生病啦，需要先去诊所调养，好起来才能上班～')
	// 只有下班后才能结算：仍在上班/午休时段不允许（pet.status 由 loadAndDecay 实时计算）
	if (pet.status === 'working') return err(2001, '杯蜜还在上班中，等今天下班后再来结算工资吧～')
	if (pet.status === 'resting') return err(2001, '现在是午休时间，等今天工作全部结束后再来结算吧～')
	// 今日还有未结束的班次（含尚未上班）时也不能提前结算；请假/旷工当天无需等下班，随时可结算
	const onLeaveNow = pet.leave && pet.leave.type && pet.leave.endAt > now
	if (!onLeaveNow) {
		const offAt = lastOffDutyTs(pet, cfg, now)
		if (offAt && now < offAt) {
			const od = new Date(offAt)
			const hh = String(od.getHours()).padStart(2, '0'), mm = String(od.getMinutes()).padStart(2, '0')
			return err(2001, `杯蜜今天 ${hh}:${mm} 才下班，下班后再来结算工资吧～`)
		}
	}
	const job = cfg.jobs[pet.job] || { salary: 0, name: '打工人' }
	const base = job.salary || 0
	const absent = (pet.absentLog || []).includes(today)
	const leave = (pet.leave && pet.leave.type && pet.leave.endAt > now) ? pet.leave.type : ''
	let cut = 0, moodD = 0, text
	if (absent) {
		cut = cfg.leave.absent.payCut; moodD = cfg.leave.absent.mood
		text = `旷工（上班期间跑去旅行还没请假），今天工资 ${base} 全扣，杯蜜很自责 😔`
	} else if (leave) {
		const lv = cfg.leave[leave] || { payCut: 0, mood: 0 }
		cut = lv.payCut; moodD = lv.mood || 0
		text = `${lv.label || '请假'}一天，${cut > 0 ? `扣了 ${Math.round(base * cut)} 杯蜜币` : '病假不扣钱'}，好好休息～`
	} else {
		text = `${job.name}的一天结束啦，工资 +${base} 杯蜜币，充实又满足 💪`
	}
	const wage = Math.round(base * (1 - cut))
	const coin = clamp((pet.coin || 0) + wage, 0, 999999)
	const happiness = clamp((pet.happiness == null ? 60 : pet.happiness) + moodD, 0, 100)
	wallet.lastSettleDate = today; wallet.todayWage = wage
	const firstWork = !pet.workStarted
	await db.collection(PETS).doc(pet._id).update({ coin, happiness, wallet, workStarted: true })
	await addDiary(pet._id, 'work', text)
	if (firstWork) await addDiary(pet._id, 'work', `🌟 第一次以${job.name}的身份上岗，迈出独立的一步，赚到 ${wage} 杯蜜币！`, '第一次工作')
	return ok({ coin, wage, happiness, wallet, text })
}
async function applyLeave(event, cfg) {
	const { userId, type, hours } = event
	if (!userId) return err(1001)
	if (!cfg.leave[type] || (type !== 'personal' && type !== 'sick')) return err(2001, '请假类型不正确')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (!pet.job) return err(2001, '杯蜜还没有职业')
	// 请假生效期间不能重复请假
	if (pet.leave && pet.leave.type && cfg.leave[pet.leave.type] && pet.leave.endAt > now) {
		return err(2001, `杯蜜已经在${cfg.leave[pet.leave.type].label}中啦，这次假期结束后才能再请假`)
	}
	// 病假必须确实生病（处于需调养状态）
	if (type === 'sick' && pet.mood !== 'sick') return err(2001, '杯蜜身体好着呢，不能请病假哦～先把她的身体照顾好再说')
	const hrs = Number(hours) > 0 ? Number(hours) : 24
	// 请假至当日结束（与“每日结算一次”对齐，保证当晚结算能命中 payCut）
	const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)
	const leave = { type, startAt: now, endAt: Math.max(now + hrs * 3600000, endOfDay.getTime()), reason: String((event.reason || '')).slice(0, 50) }
	await db.collection(PETS).doc(pet._id).update({ leave })
	pet.leave = leave
	const label = cfg.leave[type].label
	await addDiary(pet._id, 'work', `杯蜜请了${label}${hrs}小时 🙋 ${type === 'sick' ? '（病假无需审核）' : ''}`)
	return ok({ leave, label }, `已提交${label}`)
}

// ================= 作息自定义（上班时段 / 睡眠时段）=================
const HM_RE = /^([01]?\d|2[0-3]):[0-5]\d$/
function validWeekdays(arr) { return Array.isArray(arr) && (arr.length === 0 || arr.every(d => d >= 0 && d <= 6)) }
/** 设置上班时段：普通职业选班次 shiftKey（空=全部）；自由职业保存 customShifts（最多 5 段） */
async function setWorkPlan(event, cfg) {
	const { userId, shiftKey, customShifts } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (!pet.job) return err(2001, '还没有职业，先去设置吧')
	const job = (cfg.jobs || {})[pet.job]
	if (!job) return err(2001, '未知职业')
	const old = pet.workPlan || {}
	let workPlan
	if (job.custom) {
		const list = Array.isArray(customShifts) ? customShifts.slice(0, 5) : []
		for (const s of list) {
			if (!s || !HM_RE.test(String(s.start || '')) || !HM_RE.test(String(s.end || ''))) return err(2001, '班次起止时间格式不正确')
			if (!validWeekdays(s.weekdays)) return err(2001, '班次星期不合法')
		}
		workPlan = { shiftKey: '', customShifts: list.map(s => ({ name: String(s.name || '').slice(0, 8), start: s.start, end: s.end, weekdays: s.weekdays || [] })) }
	} else {
		const list = job.shifts || []
		if (!list.length) return err(2001, '该职业按全局日程上班，无需选择')
		const key = shiftKey || ''
		if (key && !list.some(s => s.key === key)) return err(2001, '没有这个班次')
		workPlan = { shiftKey: key, customShifts: old.customShifts || [] }
	}
	pet.workPlan = workPlan
	pet.status = computeStatus(pet, now, cfg)
	await db.collection(PETS).doc(pet._id).update({ workPlan, status: pet.status })
	return ok({ workPlan, status: pet.status, statusInfo: buildStatusInfo(pet, cfg) }, '上班时段已更新')
}
/** 设置自定义睡眠时段；on=false 恢复全局默认 */
async function setSleepPlan(event, cfg) {
	const { userId, on, start, end, weekdays } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	let sleepPlan = { on: false }
	if (on) {
		if (!HM_RE.test(String(start || '')) || !HM_RE.test(String(end || ''))) return err(2001, '睡眠时间格式不正确')
		if (!validWeekdays(weekdays) || !(weekdays && weekdays.length)) return err(2001, '至少选择一个星期')
		sleepPlan = { on: true, start, end, weekdays }
	}
	pet.sleepPlan = sleepPlan
	pet.status = computeStatus(pet, now, cfg)
	await db.collection(PETS).doc(pet._id).update({ sleepPlan, status: pet.status })
	return ok({ sleepPlan, status: pet.status, statusInfo: buildStatusInfo(pet, cfg) }, on ? '已启用自定义睡眠时段' : '已恢复默认作息')
}

// ================= 日记 =================
async function getDiary(event) {
	const { userId } = event
	if (!userId) return err(1001)
	const petRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!petRes.data.length) return err(5002)
	const res = await db.collection(DIARY).where({ pet_id: petRes.data[0]._id }).orderBy('create_date', 'desc').limit(100).get()
	return ok({ petName: petRes.data[0].name, list: res.data })
}

// ================= 好友轻社交（工作/睡觉锁定）=================
async function helpFriend(event, cfg) {
	const { userId, friendCode } = event
	if (!userId) return err(1001)
	if (!friendCode) return err(2001)
	const now = Date.now()
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	self.status = computeStatus(self, now, cfg)
	const lock = assertNotLocked(self); if (lock) return lock
	if (self.friendCode === friendCode) return err(2001, '不能帮助自己的杯蜜')
	if ((self.daily.help || 0) >= cfg.rules.FRIEND_HELP_LIMIT) return err(3002, '今天帮助好友的次数用完啦')
	const targetRes = await db.collection(PETS).where({ friendCode }).limit(1).get()
	if (!targetRes.data.length) return err(5002, '没有找到这只杯蜜')
	const target = targetRes.data[0]
	await db.collection(PETS).doc(target._id).update({ interaction: clamp((target.interaction || 0) + 5, 0, 100), happiness: clamp((target.happiness == null ? 60 : target.happiness) + 3, 0, 100) })
	self.daily.help = (self.daily.help || 0) + 1
	const selfHeart = (self.heart || 0) + 1
	await db.collection(PETS).doc(self._id).update({ daily: self.daily, heart: selfHeart })
	await addDiary(target._id, 'friend', `好友「${self.name}」来串门送关心，互动值 +5`)
	await addNotice({ petId: target._id, userId: target.user_id, type: 'heart', title: '收到一份关心', text: `「${self.name}」送了你一份关心 ❤️`, from: self, link: 'friends' })
	await db.collection(LOGS).add({ pet_id: self._id, action: 'helpFriend', target_pet: target._id, create_date: now })
	return ok({ heart: selfHeart, targetName: target.name }, '送出了关心 ❤️')
}
async function addFriend(event, cfg) {
	const { userId, friendCode } = event
	if (!userId) return err(1001)
	if (!friendCode) return err(2001)
	const now = Date.now()
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	self.status = computeStatus(self, now, cfg)
	const lock = assertNotLocked(self); if (lock) return lock
	if (self.friendCode === friendCode) return err(2001, '不能添加自己')
	if ((self.friends || []).some(f => f.friendCode === friendCode)) return ok({}, '你们已经是好友啦')
	const targetRes = await db.collection(PETS).where({ friendCode }).limit(1).get()
	if (!targetRes.data.length) return err(5002, '编号不存在')
	const target = targetRes.data[0]
	// 对方此前也申请过我 => 视为已互申请，直接成为好友（省去二次等待）
	const mutual = await db.collection(FRIENDS).where({ user_id: target.user_id, friend_code: self.friendCode, status: 'pending' }).limit(1).get()
	if (mutual.data.length) return await acceptFriend({ userId, friendCode: target.friendCode }, cfg)
	// 查重：我是否已发送过待同意申请
	const dup = await db.collection(FRIENDS).where({ user_id: userId, friend_code: friendCode, status: 'pending' }).limit(1).get()
	if (dup.data.length) return ok({ pending: true }, '申请已发送，等待对方同意')
	await db.collection(FRIENDS).add({ user_id: userId, pet_id: self._id, from_code: self.friendCode, from_name: self.name, from_emoji: self.emoji, friend_code: friendCode, target_pet: target._id, to_name: target.name, to_emoji: target.emoji, status: 'pending', create_date: now })
	await addNotice({ petId: target._id, userId: target.user_id, type: 'friend_apply', title: '新的好友申请', text: `「${self.name}」申请加你为好友，快去同意吧～`, from: self, link: 'friends' })
	return ok({ pending: true }, '已发送好友申请，等待对方同意')
}
async function friendList(event) {
	const { userId } = event
	if (!userId) return err(1001)
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	// 收到待我同意的申请（对方发起，friend_code 是我的编码）
	const inRes = await db.collection(FRIENDS).where({ friend_code: self.friendCode, status: 'pending' }).orderBy('create_date', 'desc').limit(50).get()
	const incoming = inRes.data.map(r => ({ friendCode: r.from_code, name: r.from_name, emoji: r.from_emoji }))
	// 我发出、等待对方同意的申请
	const outRes = await db.collection(FRIENDS).where({ user_id: userId, status: 'pending' }).orderBy('create_date', 'desc').limit(50).get()
	const outgoing = outRes.data.map(r => ({ friendCode: r.friend_code, name: r.to_name, emoji: r.to_emoji }))
	return ok({ friendCode: self.friendCode, friends: self.friends || [], incoming, outgoing })
}
async function acceptFriend(event, cfg) {
	const { userId, friendCode } = event // friendCode = 申请方的编码
	if (!userId) return err(1001)
	if (!friendCode) return err(2001)
	const now = Date.now()
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	const reqRes = await db.collection(FRIENDS).where({ friend_code: self.friendCode, from_code: friendCode, status: 'pending' }).limit(1).get()
	if (!reqRes.data.length) return err(5002, '没有待处理的好友申请')
	const req = reqRes.data[0]
	const aRes = await db.collection(PETS).doc(req.pet_id).get()
	const a = aRes.data && aRes.data[0]
	if (!a) return err(5002, '申请方不存在')
	// 双方互写好友列表
	const aFriends = (a.friends || []).slice()
	if (!aFriends.some(f => f.friendCode === self.friendCode)) aFriends.push({ friendCode: self.friendCode, name: self.name, emoji: self.emoji, since: now })
	const myFriends = (self.friends || []).slice()
	if (!myFriends.some(f => f.friendCode === a.friendCode)) myFriends.push({ friendCode: a.friendCode, name: a.name, emoji: a.emoji, since: now })
	await db.collection(PETS).doc(a._id).update({ friends: aFriends })
	await db.collection(PETS).doc(self._id).update({ friends: myFriends })
	// 删除彼此之间的待处理申请（双向都清）
	await db.collection(FRIENDS).where({ status: 'pending', user_id: a.user_id, friend_code: self.friendCode }).remove()
	await db.collection(FRIENDS).where({ status: 'pending', user_id: self.user_id, friend_code: a.friendCode }).remove()
	// 双方日记留痕
	await addDiary(self._id, 'friend', `和「${a.name}」成为好友啦 🎉`)
	await addDiary(a._id, 'friend', `和「${self.name}」成为好友啦 🎉`)
	return ok({ friends: myFriends }, `已和「${a.name}」成为好友`)
}
async function rejectFriend(event) {
	const { userId, friendCode } = event
	if (!userId) return err(1001)
	if (!friendCode) return err(2001)
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	await db.collection(FRIENDS).where({ friend_code: self.friendCode, from_code: friendCode, status: 'pending' }).remove()
	return ok({}, '已拒绝该申请')
}
async function removeFriend(event) {
	const { userId, friendCode } = event
	if (!userId) return err(1001)
	if (!friendCode) return err(2001)
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	const before = self.friends || []
	const removed = before.find(f => f.friendCode === friendCode)
	const myFriends = before.filter(f => f.friendCode !== friendCode)
	if (myFriends.length === before.length) return err(2001, '未找到该好友')
	await db.collection(PETS).doc(self._id).update({ friends: myFriends })
	// 对方侧自动同步删除（不推送通知，仅日记留痕）
	const tRes = await db.collection(PETS).where({ friendCode }).limit(1).get()
	if (tRes.data.length) {
		const target = tRes.data[0]
		const tFriends = (target.friends || []).filter(f => f.friendCode !== self.friendCode)
		await db.collection(PETS).doc(target._id).update({ friends: tFriends })
		await db.collection(FRIENDS).where({ user_id: target.user_id, friend_code: self.friendCode }).remove()
		await addDiary(target._id, 'cut', `和「${self.name}」绝交了 💔`)
	}
	await db.collection(FRIENDS).where({ user_id: userId, friend_code: friendCode }).remove()
	await addDiary(self._id, 'cut', `和「${(removed && removed.name) || friendCode}」绝交了 💔`)
	return ok({ friends: myFriends }, '已绝交，双方好友关系已解除')
}

// ================= 消息通知（好友申请 / 好友送关心）=================
async function noticeList(event) {
	const { userId } = event
	if (!userId) return err(1001)
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	const res = await db.collection(NOTICES).where({ pet_id: self._id }).orderBy('create_date', 'desc').limit(50).get()
	const unread = res.data.filter(n => !n.read).length
	return ok({ list: res.data, unread })
}
async function noticeRead(event) {
	const { userId, noticeId } = event
	if (!userId) return err(1001)
	const selfRes = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!selfRes.data.length) return err(5002)
	const self = selfRes.data[0]
	if (noticeId) {
		// 只标记自己收件箱内的某一条
		await db.collection(NOTICES).where({ pet_id: self._id, _id: noticeId }).update({ read: true })
	} else {
		await db.collection(NOTICES).where({ pet_id: self._id, read: false }).update({ read: true })
	}
	return ok({}, noticeId ? '已读' : '全部已读')
}

// ================= 旅行（消耗工资；上班旅行=旷工；睡觉禁止）=================
async function travel(event, cfg) {
	const { userId, placeKey } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	if (pet.status === 'sleeping') return err(4002, '杯蜜睡着了，旅行等她醒来再说吧')
	// 生病（需调养）期间不能旅行：身体要紧，先带她去诊所
	if (pet.mood === 'sick') return err(4001, '杯蜜生病啦，先去诊所调养，旅行等她好起来再说吧')
	const t = pet.travel || { place: '', endAt: 0 }
	if (t.place && t.endAt && now < t.endAt) return Object.assign(err(3001), { data: { retryAfter: t.endAt - now, traveling: true } })
	const list = cfg.travel_places.list || []
	const place = (placeKey && list.find(p => p.key === placeKey)) || list[Math.floor(Math.random() * list.length)]
	if (!place) return err(2001, '暂无可用目的地')
	const cost = Math.round((place.cost || 0) * (cfg.rules.TRAVEL_COST_RATIO || 1))
	if ((pet.coin || 0) < cost) return err(2001, `旅行需消耗 ${cost} 杯蜜币，余额不足，先工作赚点吧`)
	const today = dayStr(now)
	// 上班期间旅行且未请假 => 旷工
	if (pet.status === 'working') {
		const onLeave = pet.leave && pet.leave.type && pet.leave.endAt > now
		if (!onLeave) {
			const absentLog = (pet.absentLog || []).concat([today])
			await db.collection(PETS).doc(pet._id).update({ absentLog })
			pet.absentLog = absentLog
			await addDiary(pet._id, 'work', `上班期间跑去旅行，今天按旷工处理 🫥（结算时扣工资）`)
		}
	}
	await db.collection(PETS).doc(pet._id).update({ coin: clamp((pet.coin || 0) - cost, 0, 999999), travel: { place: place.key, placeName: place.name, startAt: now, endAt: now + place.ms, cost } })
	await addDiary(pet._id, 'travel', `杯蜜出发去${place.name}旅行啦 🎒，花费 ${cost} 杯蜜币，预计 ${Math.round(place.ms / 60000)} 分钟后回来`)
	return ok({ travel: { place: place.key, placeName: place.name, startAt: now, endAt: now + place.ms, cost }, started: true, coin: clamp((pet.coin || 0) - cost, 0, 999999) }, `杯蜜去${place.name}旅行了～`)
}
async function travelCheck(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const t = pet.travel || { place: '', endAt: 0 }
	if (!t.place) return ok({ traveling: false, arrived: false })
	if (now < t.endAt) return ok({ traveling: true, remainMs: t.endAt - now, place: t.place, placeName: t.placeName })
	const placeName = t.placeName || (cfg.postcards[t.place] ? t.place : '远方')
	const card = cfg.postcards[t.place] || `我从${placeName}寄回一张明信片 ✉️`
	const placeEmoji = (cfg.travel_places.list || []).find(p => p.key === t.place)
	const weather = pick(['☀️ 晴', '⛅ 多云', '🌤️ 晴转多云', '🌧️ 小雨', '🌈 雨后彩虹'])
	const happiness = clamp((pet.happiness == null ? 60 : pet.happiness) + 8, 0, 100)
	const interaction = clamp((pet.interaction || 0) + 4, 0, 100)
	await db.collection(PETS).doc(pet._id).update({ travel: { place: '', endAt: 0 }, happiness, interaction })
	await addDiary(pet._id, 'travel', `【${placeName}】${card}`)
	return ok({
		traveling: false, arrived: true,
		postcard: {
			placeKey: t.place, placeName, emoji: (placeEmoji && placeEmoji.emoji) || '📮',
			date: dayStr(t.endAt || now), weather, mood: pet.mood, card, template: t.place,
			cost: t.cost || 0, look: pet.look, equippedItems: pet.equippedItems || []
		}, happiness, interaction
	}, '杯蜜旅行回来啦，带回一张明信片！')
}

// ================= 衣橱（工作/睡觉锁定）=================
async function wardrobe(event, cfg) {
	const { userId } = event
	if (!userId) return err(1001)
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const unlocked = pet.decorUnlocked || []
	const equipped = pet.equippedItems || []
	const items = Object.keys(cfg.decor.items).map(key => Object.assign({}, cfg.decor.items[key], { unlocked: unlocked.includes(key), equipped: equipped.includes(key) }))
	// 附带当前形象（发型/衣色）与穿戴列表，衣橱预览不依赖前端缓存也能画对
	return ok({ items, streak: pet.streak || 1, status: pet.status, locked: (pet.status === 'working' || pet.status === 'sleeping'), look: pet.look, gender: pet.gender, equippedItems: equipped })
}
async function equip(event, cfg) {
	const { userId, itemKey, on } = event
	if (!userId) return err(1001)
	if (!itemKey || !cfg.decor.items[itemKey]) return err(2001, '未知装扮')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const lock = assertNotLocked(pet, '上班/睡觉中不能换装，休息时再试吧。'); if (lock) return lock
	if (!(pet.decorUnlocked || []).includes(itemKey)) return err(5001, '该装扮尚未解锁')
	const slot = cfg.decor.items[itemKey].slot
	let equipped = (pet.equippedItems || []).filter(k => { const it = cfg.decor.items[k]; return it && it.slot !== slot })
	if (on) equipped.push(itemKey)
	await db.collection(PETS).doc(pet._id).update({ equippedItems: equipped })
	return ok({ equippedItems: equipped }, on ? `杯蜜戴上了${cfg.decor.items[itemKey].name}` : `卸下了${cfg.decor.items[itemKey].name}`)
}
async function customizeLook(event, cfg) {
	const { userId, look } = event
	if (!userId) return err(1001)
	if (!look || typeof look !== 'object') return err(2001, '形象参数不正确')
	const now = Date.now()
	const { pet } = await loadAndDecay(userId, now, cfg)
	if (!pet) return err(5002)
	const lock = assertNotLocked(pet, '上班/睡觉中不能换形象，休息时再试吧。'); if (lock) return lock
	const gender = look.gender === 'f' ? 'f' : 'm'
	const base = LOOK_PARTS.DEFAULT[gender]
	const hex = (v, dft) => (LOOK_PARTS.HEX_RE.test(v || '') ? v : dft)
	if (look.outfit && !LOOK_PARTS.outfits.includes(look.outfit)) return err(2001, '未知衣服款式')
	if (look.hair && !LOOK_PARTS.hairs.includes(look.hair)) return err(2001, '未知发型')
	// 霓虹线条形象的衣服色/头发色只允许可调色板内的色值，非法则回落该性别默认色
	const theme = (v, dft) => (LOOK_PARTS.themeColors.indexOf(v) >= 0 ? v : dft)
	const next = {
		ver: LOOK_PARTS.VER,
		gender,
		skin: hex(look.skin, base.skin),
		clothColor: theme(look.clothColor, base.clothColor),
		hairColor: theme(look.hairColor, base.hairColor),
		hair: look.hair || base.hair,
		outfit: look.outfit || base.outfit
	}
	await db.collection(PETS).doc(pet._id).update({ look: next })
	pet.look = next
	const cn = (v) => LOOK_PARTS.COLOR_NAMES[v] || v
	await addDiary(pet._id, 'unlock', `换了新造型：${next.gender === 'f' ? '女生' : '男生'} · 衣服「${cn(next.clothColor)}」发型「${LOOK_PARTS.HAIR_NAMES[next.hair] || next.hair}」${next.hair === 'none' ? '' : `发色「${cn(next.hairColor)}」`}`)
	return ok({ pet }, '新造型登场！')
}

// ================= 设置 =================
async function rename(event) {
	const { userId, name } = event
	if (!userId) return err(1001)
	if (!name) return err(2001, '名字不能为空')
	const clean = String(name).slice(0, 12)
	if (hasBadWord(clean)) return err(2001, '名字包含不适宜内容')
	const res = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!res.data.length) return err(5002)
	await db.collection(PETS).doc(res.data[0]._id).update({ name: clean })
	return ok({ name: clean }, '改名成功')
}
async function setJob(event, cfg) {
	const { userId, job } = event
	if (!userId) return err(1001)
	if (job && !cfg.jobs[job]) return err(2001, '未知职业')
	const res = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!res.data.length) return err(5002)
	const pet = res.data[0]
	// 换职业后原选定班次失效，重置 shiftKey（保留自由职业自定义段）；同时清空残留请假（不工作不存在请假）
	const workPlan = { shiftKey: '', customShifts: (pet.workPlan && pet.workPlan.customShifts) || [] }
	const leave = { type: '', startAt: 0, endAt: 0, reason: '' }
	const now = Date.now()
	pet.job = job || ''
	pet.workPlan = workPlan
	pet.leave = leave
	pet.status = computeStatus(pet, now, cfg)
	await db.collection(PETS).doc(pet._id).update({ job: job || '', workPlan, leave, status: pet.status })
	return ok({ job: job || '', workPlan, status: pet.status }, job ? `杯蜜成为了${cfg.jobs[job].name}！` : '杯蜜退役啦')
}
async function setNotify(event) {
	const { userId, on } = event
	if (!userId) return err(1001)
	const res = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!res.data.length) return err(5002)
	await db.collection(PETS).doc(res.data[0]._id).update({ notifyOn: !!on })
	return ok({ notifyOn: !!on })
}
async function clearData(event) {
	const { userId } = event
	if (!userId) return err(1001)
	const res = await db.collection(PETS).where({ user_id: userId }).limit(1).get()
	if (!res.data.length) return ok({}, '暂无数据')
	const petId = res.data[0]._id
	await db.collection(DIARY).where({ pet_id: petId }).remove()
	await db.collection(LOGS).where({ pet_id: petId }).remove()
	await db.collection(FRIENDS).where({ pet_id: petId }).remove()
	await db.collection(NOTICES).where({ pet_id: petId }).remove()
	await db.collection(CHAT).where({ pet_id: petId }).remove()
	await db.collection(PETS).doc(petId).remove()
	return ok({}, '数据已清空')
}

// ================= 定时扫描 =================
async function timedScan(event, cfg) {
	const now = Date.now()
	const today = dayStr(now)
	const R = cfg.rules
	const res = await db.collection(PETS).where({ notifyOn: true }).limit(200).get()
	let notified = 0
	for (const pet of res.data) {
		const sim = simulateDecay(pet, now, R)
		const mood = computeMood(pet, sim.interaction, sim.health, sim.happiness, now, sim.sickByLowInteract, R)
		if (pet.mood === 'recovering' && pet.recoveringUntil && now >= pet.recoveringUntil) {
			await db.collection(PETS).doc(pet._id).update({ mood: 'normal', recoveringUntil: 0 })
		}
		const needSend = (mood === 'unhappy' || mood === 'sick') && pet.lastNotifyDate !== today
		if (needSend) {
			await db.collection(PETS).doc(pet._id).update({ lastNotifyDate: today })
			await db.collection(DIARY).add({ pet_id: pet._id, type: 'notify', text: mood === 'sick' ? '提醒：杯蜜最近太累，需要调养' : '提醒：杯蜜有点想你啦', create_date: now })
			notified++
		}
	}
	return ok({ scanned: res.data.length, notified })
}

// ================= 工具 =================
function genCode() {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
	let s = ''
	for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
	return s
}
function hasBadWord(str) {
	const low = String(str).toLowerCase()
	return BANNED_WORDS.some(w => low.includes(w.toLowerCase()))
}
function pickReason(pet, cfg) {
	if ((pet.health || 0) < cfg.rules.SICK_HEALTH) return '最近太拼了，身体有点吃不消，需要好好休息 🤒'
	if ((pet.interaction || 0) < cfg.rules.SICK_INTERACT) return '太久没人陪，心里有点闷，需要你多陪陪 🥺'
	return '作息紊乱，精神有点差，建议调养生息 😖'
}
async function findDoctor(pet) {
	if (pet.job === 'doctor') return { self: true, global: true, info: { name: pet.name, from: 'self' } }
	const doc = await db.collection(PETS).where({ job: 'doctor', mood: $.neq('sick') }).count()
	return { self: false, global: doc.total > 0, info: { doctors: doc.total } }
}
