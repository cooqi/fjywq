<template>
	<view class="page">
		<!-- 加载中 -->
		<view v-if="loading" class="center-tip">正在呼唤杯蜜……</view>

		<!-- 未领养：领养引导 -->
		<view v-else-if="needAdopt" class="adopt">
			<view class="adopt-title">领养你的电子闺蜜 💁‍♀️</view>
			<view class="adopt-sub">她住在你的微信里，有工作、日程和心情，需要你的陪伴。</view>

			<view class="field">
				<text class="lab">名字</text>
				<input class="ipt" v-model="form.name" placeholder="给杯蜜取个名字" maxlength="12" />
			</view>
			<view class="field">
				<text class="lab">性别</text>
				<view class="chip-row">
					<view v-for="g in genders" :key="g" class="chip" :class="{ on: form.gender === g }" @click="form.gender = g">{{ g }}</view>
				</view>
			</view>
			<view class="grid3">
				<view class="field mini"><text class="lab">年龄</text><input class="ipt" type="number" v-model="form.age" placeholder="岁" /></view>
				<view class="field mini"><text class="lab">身高</text><input class="ipt" type="number" v-model="form.height" placeholder="cm" /></view>
				<view class="field mini"><text class="lab">体重</text><input class="ipt" type="number" v-model="form.weight" placeholder="kg" /></view>
			</view>
			<view class="field">
				<text class="lab">喜好（可多选）</text>
				<view class="chip-row">
					<view v-for="l in likeOptions" :key="l" class="chip" :class="{ on: form.likes.includes(l) }" @click="toggleLike(l)">{{ l }}</view>
				</view>
			</view>
			<view class="field">
				<text class="lab">职业（可留空，设置后按日程上班、领工资）</text>
				<view class="chip-row">
					<view v-for="j in jobOptions" :key="j.value" class="chip" :class="{ on: form.job === j.value }" @click="form.job = j.value">{{ j.label }}</view>
				</view>
			</view>
			<button class="adopt-btn" @click="doAdopt">开始领养</button>
		</view>

		<!-- 首页主界面 -->
		<view v-else class="home">
			<!-- 状态条 -->
			<view class="status-badge" :style="{ borderColor: statusTone }">
				<text class="sb-emoji">{{ statusEmoji }}</text>
				<view class="sb-mid">
					<text class="sb-label">{{ statusName }}<text v-if="pet.job"> · {{ jobName }}</text><text v-if="pet.mood === 'sick'" class="sb-sick"> · 🤒 生病</text></text>
					<text class="sb-hint">{{ statusHint }}</text>
				</view>
			</view>
			<view class="away" v-if="awayText">{{ awayText }}</view>

			<view class="top-res">
				<text>❤️ {{ pet.heart || 0 }}</text>
				<text>⚖️ {{ pet.weight || 0 }}kg</text>
				<text>🪙 {{ pet.coin || 0 }}</text>
				<text>💼 {{ todayWage }}</text>
				<text>Lv.{{ pet.level || 1 }}</text>
			</view>

			<PetDisplay :emoji="pet.emoji" :mood="pet.mood" :status="pet.status" :name="pet.name" :decor="pet.equippedItems || []" :look="myLook" :transient="transientExp" />
			<Bubble :text="bubble" />
			<StatusBar :interaction="pet.interaction || 0" :health="pet.health || 0" :happiness="pet.happiness || 0" :hunger="hungerNow" />

			<!-- 需调养提示 + 去诊所 -->
			<view v-if="pet.mood === 'sick'" class="sick-tip" @click="go('clinic')">
				🤒 杯蜜太累了需要调养，点心我去诊所照顾她 →
			</view>

			<view class="sec-title">互动</view>
			<ActionButton :pet="pet" @act="onAct" />

			<!-- 工作区（有职业才显示） -->
			<view v-if="pet.job" class="work">
				<view class="sec-title">今日工作（{{ jobName }}）</view>
				<view class="work-btns">
					<button class="w-btn work" @click="doSettle">{{ settleLabel }}</button>
					<button class="w-btn leave" @click="doLeave">请假 🙋</button>
				</view>
				<view v-if="salary && salary.unpaidDays" class="work-note owing">⏳ 本月还有 {{ salary.unpaidDays }} 天工资没领（共 {{ salary.unpaid }} 币），跨月会自动一次性发放</view>
				<view v-if="salary && salary.absentDays" class="work-note absent">🫥 本月旷工 {{ salary.absentDays }} 天：生病要记得请病假，不然当天没有工资</view>
				<view v-if="schedule" class="sched">
					<view v-if="schedule.work && schedule.work.length" class="sched-row"><text class="sch-k">🕘 上班时间</text><text class="sch-v">{{ fmtShifts(schedule.work) }}</text></view>
					<view v-if="schedule.rest && schedule.rest.length" class="sched-row"><text class="sch-k">🍚 休息时间</text><text class="sch-v">{{ fmtShifts(schedule.rest) }}</text></view>
					<view v-if="schedule.sleep" class="sched-row"><text class="sch-k">😴 睡眠时间</text><text class="sch-v">{{ schedule.sleep.start }} - {{ schedule.sleep.end }}</text></view>
				</view>
				<view class="work-note" v-if="settleText">{{ settleText }}</view>
			</view>

			<view class="sec-title">快捷入口</view>
			<view class="quick">
				<view v-for="q in quickEntries" :key="q.key" class="q-item" :class="{ dim: q.locked }" @click="goEntry(q)">
					<text class="q-e">{{ q.icon }}</text>
					<text v-if="q.badge && unreadNotices" class="q-badge">{{ unreadNotices > 99 ? '99+' : unreadNotices }}</text>
					<text v-if="q.locked" class="q-lock">忙</text>
					<text class="q-t">{{ q.label }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import PetDisplay from './components/PetDisplay.vue'
import StatusBar from './components/StatusBar.vue'
import ActionButton from './components/ActionButton.vue'
import Bubble from './components/Bubble.vue'
import { BEE_EMOJIS, MOOD_MAP, STATUS_MAP, awayTip, ERR_MSG, isLocked, statusLabel, loadBeemoreConfig, getJobs, getLeave } from './beemore.js'
import { normalizeLook, ACTION_EXPRESSION } from './look.js'
import { getMyUserInfo, getCachedPet, cachePet, callBeemore, settleWork, applyLeave } from './store/pet.js'

const defaultForm = () => ({ name: '', emoji: '🐥', gender: '', age: '', height: '', weight: '', likes: [], job: '' })

// ============ 跳转用页面路径表（与 pages.json 一一对应，改路由只改这里）============
// 不用 `'/pages/game/loveQY/' + name` 现拼：拼错了运行时只会静默失败，查不到也提示不出
const PAGE = {
	loveQY: 'pages/game/loveQY/loveQY',
	notice: 'pages/game/loveQY/notice',
	chat: 'pages/game/loveQY/chat',
	eat: 'pages/game/loveQY/eat',
	travel: 'pages/game/loveQY/travel',
	wardrobe: 'pages/game/loveQY/wardrobe',
	customize: 'pages/game/loveQY/customize',
	friends: 'pages/game/loveQY/friends',
	clinic: 'pages/game/loveQY/clinic',
	tasks: 'pages/game/loveQY/tasks',
	diary: 'pages/game/loveQY/diary',
	settings: 'pages/game/loveQY/settings',
	admin: 'pages/game/loveQY/beemore-admin'
}

// ============ 快捷入口配置 ============
// gate：'travel' 需要她空闲且没生病；'idle' 需要她空闲（上班/睡觉时先挡住，进去也办不成事）；不写=随时可进
const QUICK_ENTRIES = [
	{ key: 'notice', icon: '🔔', label: '消息', badge: true },
	{ key: 'chat', icon: '💬', label: '聊天' },
	{ key: 'clinic', icon: '🏥', label: '诊所' },
	{ key: 'tasks', icon: '📋', label: '任务' },
	{ key: 'diary', icon: '📔', label: '日记' },
	{ key: 'settings', icon: '⚙️', label: '设置' },
	{ key: 'travel', icon: '🎒', label: '旅行', gate: 'travel' },
	{ key: 'wardrobe', icon: '👒', label: '衣橱', gate: 'idle' },
	{ key: 'customize', icon: '🎨', label: '形象', gate: 'idle' },
	{ key: 'friends', icon: '🤝', label: '好友', gate: 'idle' }
]

// 拦截文案按入口分开说，不再共用一句「杯蜜正忙或已入睡」
const GATE_TIP = {
	travel: s => `杯蜜正在${s}，旅行得等她下班睡饱再去～`,
	idle: s => `杯蜜正在${s}，这事得等她空闲时再办，现在改了她也看不见～`
}

export default {
	components: { PetDisplay, StatusBar, ActionButton, Bubble },
	data() {
		return {
			loading: true,
			needAdopt: false,
			userId: '',
			pet: {},
			schedule: null,
			salary: null,
			bubble: '',
			awayText: '',
			settleText: '',
			unreadNotices: 0,
			transientExp: '',
			transientTimer: null,
			form: defaultForm(),
			emojis: BEE_EMOJIS,
			genders: ['女生', '男生', '小秘密'],
			likeOptions: ['奶茶', '追剧', '逛街', '听音乐', '旅行', '睡懒觉', '拍照', '看星星'],
			jobOptions: [{ label: '不设职业', value: '' }, { label: '医生 🩺', value: 'doctor' }, { label: '老师 🧑‍🏫', value: 'teacher' }, { label: '邮递员 📮', value: 'postman' }]
		}
	},
	computed: {
		myLook() { return normalizeLook(this.pet.look, this.pet) },
		jobName() { return (getJobs()[this.pet.job] || {}).name || '' },
		statusName() { return (STATUS_MAP[this.pet.status] || STATUS_MAP.idle).label },
		statusEmoji() { return (STATUS_MAP[this.pet.status] || STATUS_MAP.idle).emoji },
		statusTone() { return (STATUS_MAP[this.pet.status] || STATUS_MAP.idle).tone },
		statusHint() {
			// 生病优先：即使当前 status 是空闲/工作，也提示需去诊所调养，且不能上班与旅行（旷工不在这里说，服务端文案已写清当日没工资）
			if (this.pet.mood === 'sick' && this.pet.status !== 'absent') return '杯蜜生病啦，需要先带去诊所调养，这期间不能上班和旅行哦～'
			return this.pet.statusHint || (STATUS_MAP[this.pet.status] || STATUS_MAP.idle).hint
		},
		/** 今天有没有排班（班次按星期过滤后是否非空） */
		scheduledToday() { return !!(this.schedule && this.schedule.work && this.schedule.work.length) },
		/** 今天是否已经请过假（按日期认定，下班后补请也算） */
		dayKey() {
			const d = new Date()
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		},
		hasLeaveToday() { return (this.pet.leaveLog || []).some(l => l && l.date === this.dayKey) },
		jobSalary() { return ((getJobs()[this.pet.job] || {}).salary) || 0 },
		/** 事假当场扣的钱（云函数按 job.salary × leave.personal.payCut 计算，口径保持一致） */
		leaveDeduct() { return Math.round(this.jobSalary * (((getLeave().personal) || {}).payCut || 0)) },
		canSettle() {
			// 请假只占今天的上班时间，到点照样下班，所以结算一律等到今日班次全部结束（不再有“请假中可随时结算”的捷径）
			if (this.pet.status === 'working' || this.pet.status === 'resting') return false
			if (this.salary && this.salary.settledToday) return false
			return !(this.schedule && this.schedule.offAt && Date.now() < this.schedule.offAt)
		},
		settleLabel() {
			if (this.salary && this.salary.settledToday) return '今日已结算 💼'
			if (!this.scheduledToday) return '今天不上班 💼'
			return this.canSettle ? '结算工资 💼' : '下班后结算 💼'
		},
		todayWage() { return (this.pet.wallet && this.pet.wallet.todayWage) || 0 },
		/** 饥饿值 0-100（越大越饿），存量数据无该字段时按“有点饿”展示，与服务端 hungerOf 对齐 */
		hungerNow() { return this.pet.hunger == null ? 35 : Math.max(0, Math.min(100, this.pet.hunger)) },
		/** 快捷入口：10 项固定顺序，忙时只打标记（仍可点，点了告诉她为什么进不去） */
		quickEntries() {
			const busy = isLocked(this.pet.status)
			return QUICK_ENTRIES.map(q => ({
				key: q.key, icon: q.icon, label: q.label, badge: !!q.badge, gate: q.gate || '',
				locked: !!(q.gate && busy)
			}))
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		if (!u || !u._id) {
			this.loading = false
			uni.showModal({ title: '未登录', content: '请先在「我的」页面登录后再领养杯蜜', showCancel: false })
			return
		}
		this.userId = u._id
		const cached = getCachedPet()
		if (cached && cached.user_id === this.userId) {
			this.pet = cached
			this.needAdopt = false
			this.loading = false
			this.bubble = (MOOD_MAP[cached.mood] || {}).face || ''
		}
		// 先加载管理员配置（更新 ACTIONS/TRAVEL_PLACES/职业 等），再拉状态
		loadBeemoreConfig().then(() => { this.buildJobOptions(); this.loadStatus() })
	},
	onShow() {
		if (!this.loading && this.userId) this.loadStatus()
	},
	onShareAppMessage() {
		return { title: `我的电子闺蜜「${this.pet.name || ''}」超可爱`, path: '/pages/game/loveQY/loveQY' }
	},
	methods: {
		async loadStatus() {
			try {
				const res = await callBeemore({ action: 'getStatus', userId: this.userId })
				if (res.code === 0 && res.data) {
					if (res.data.needAdopt || !res.data.pet) {
						this.needAdopt = true
						this.loading = false
						return
					}
					this.pet = res.data.pet
					this.unreadNotices = res.data.unreadNotices || 0
					if (res.data.statusInfo) { this.$set(this.pet, 'statusHint', res.data.statusInfo.hint) }
					this.schedule = res.data.schedule || null
					this.salary = res.data.salary || null
					this.needAdopt = false
					this.awayText = awayTip(res.data.awayTipBase)
					cachePet(this.pet)
					if (!this.bubble) this.bubble = this.stateLine()
				}
			} catch (e) {}
			this.loading = false
		},
		fmtShifts(list) {
			return (list || []).map(s => (s.name ? s.name + ' ' : '') + s.start + '-' + s.end).join('、')
		},
		fmtHM(ts) {
			const d = new Date(ts)
			const p = n => (n < 10 ? '0' + n : '' + n)
			return `${p(d.getHours())}:${p(d.getMinutes())}`
		},
		stateLine() {
			const m = { happy: '今天和你聊天好开心！', normal: '你来了呀。', unhappy: '好久没人陪我了……', sick: '最近太累了，需要调养一下。', recovering: '好多了，再多陪陪我。' }
			return m[this.pet.mood] || '在的呀～'
		},
		toggleLike(l) {
			const i = this.form.likes.indexOf(l)
			if (i >= 0) this.form.likes.splice(i, 1)
			else if (this.form.likes.length < 6) this.form.likes.push(l)
		},
		async doAdopt() {
			if (!this.form.name.trim()) { uni.showToast({ title: '请给杯蜜取名字', icon: 'none' }); return }
			const res = await callBeemore({ action: 'adopt', userId: this.userId, profile: this.form })
			if (res.code === 0) {
				this.pet = res.data.pet
				this.needAdopt = false
				cachePet(this.pet)
				this.bubble = '我们第一次见面啦！(≧▽≦)'
				this.flashExp('laugh')
				uni.showToast({ title: '领养成功', icon: 'success' })
			} else {
				uni.showToast({ title: res.message || '领养失败', icon: 'none' })
			}
		},
		async onAct(key) {
			if (key === 'chat') { this.go('chat'); return }
			// 干饭走独立页面（要选菜、算热量），不占用 interact 的打扰惩罚逻辑
			if (key === 'eat') { this.go('eat'); return }
			const res = await callBeemore({ action: 'interact', userId: this.userId, actionKey: key })
			if (res.code === 0) {
				this.pet = Object.assign({}, res.data.pet, { statusHint: (res.data.statusInfo || {}).hint })
				this.bubble = res.data.line
				cachePet(this.pet)
				this.flashExp(ACTION_EXPRESSION[key] || 'smile')
				if (res.data.disturb) uni.showToast({ title: '打扰到她上班了，扣了工资和心情…', icon: 'none' })
				else if (res.data.wokeup) uni.showToast({ title: '把杯蜜吵醒了，健康和心情都受影响…', icon: 'none' })
			} else if (res.code === 3001) {
				uni.showToast({ title: '杯蜜正在冷却中～', icon: 'none' })
			} else if (res.code === 4001) {
				uni.showToast({ title: '杯蜜需要调养，先带她去休息吧', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || ERR_MSG[res.code] || '出错了', icon: 'none' })
			}
		},
		buildJobOptions() {
			const jobs = getJobs() || {}
			this.jobOptions = [{ label: '不设职业', value: '' }].concat(
				Object.keys(jobs).map(k => ({ label: `${jobs[k].name} ${jobs[k].emoji || ''}`, value: k }))
			)
		},
		async doSettle() {
			// 生病又没请假：她上不了班，当天已记旷工（工资 0），结算前给她一次补请病假的机会
			if (this.pet.mood === 'sick' && !this.hasLeaveToday && (this.scheduledToday || this.pet.status === 'absent')) {
				uni.showModal({
					title: '杯蜜病着上不了班 🤒',
					content: `她今天该上班却病倒了，也没人帮她请假，已经记了旷工（当天工资 0）。现在补一张病假条可以撤销旷工、工资照发；不补就按旷工结算。`,
					confirmText: '补请病假', cancelText: '按旷工结算',
					success: (r) => { if (r.confirm) this.submitLeave('sick'); else this.submitSettle() }
				})
				return
			}
			// 只有下班后才能结算：未下班时提醒，并展示今日班次/下班时刻
			if (!this.canSettle) {
				if (this.salary && this.salary.settledToday) {
					uni.showToast({ title: '今天已经结算过工资啦', icon: 'none' })
					return
				}
				const w = this.scheduledToday ? this.fmtShifts(this.schedule.work) : ''
				const off = this.schedule && this.schedule.offAt ? this.fmtHM(this.schedule.offAt) : ''
				const extra = off ? `今天 ${off} 下班` : '还在上班/休息中'
				uni.showModal({
					title: '还没下班哦 💼',
					content: w ? `杯蜜今日班次：${w}（${extra}），下班后再来结算工资吧～不点结算也不会丢，跨月会一次性补发。` : `杯蜜${extra}，下班后再来结算工资吧～`,
					showCancel: false
				})
				return
			}
			this.submitSettle()
		},
		async submitSettle() {
			const res = await settleWork(this.userId)
			if (res.code === 0 && res.data) {
				if (res.data.rest) { uni.showToast({ title: '今天是休息日～', icon: 'none' }); this.loadStatus(); return }
				this.settleText = res.data.text
				uni.showToast({ title: res.data.text || '结算完成', icon: 'none', duration: 2500 })
				this.loadStatus()
			} else if (res.code === 3001) {
				uni.showToast({ title: '今天已经结算过工作啦', icon: 'none' })
				this.loadStatus()
			} else {
				uni.showToast({ title: res.message || '结算失败', icon: 'none' })
			}
		},
		doLeave() {
			if (this.hasLeaveToday) {
				uni.showToast({ title: '杯蜜今天已经请过假啦，一天只能请一次', icon: 'none' })
				return
			}
			if (!this.scheduledToday) {
				uni.showToast({ title: '今天没有排班，是休息日，不用请假～', icon: 'none' })
				return
			}
			const canSick = this.pet.mood === 'sick'
			uni.showActionSheet({
				itemList: ['请事假', canSick ? '请病假（不扣钱）' : '请病假（需生病）'],
				success: ({ tapIndex }) => { this.confirmLeave(tapIndex === 0 ? 'personal' : 'sick', canSick) }
			})
		},
		/** 请假前把“只占今日上班时间 + 当场扣多少钱”讲清楚，避免用户误以为请假就等于结算 */
		confirmLeave(type, canSick) {
			if (type === 'sick' && !canSick) {
				uni.showToast({ title: '杯蜜没生病，不能请病假哦～', icon: 'none' })
				return
			}
			const lv = getLeave()[type] || {}
			const cut = type === 'sick' ? 0 : this.leaveDeduct
			const off = this.schedule && this.schedule.offAt ? this.fmtHM(this.schedule.offAt) : ''
			const span = off ? `请假只到今天 ${off} 下班，之后她会正常作息` : '请假只占今天的上班时间'
			uni.showModal({
				title: `确认请${lv.label || (type === 'sick' ? '病假' : '事假')}`,
				content: cut > 0
					? `${span}。当场扣 ${cut} 杯蜜币（余额 ${this.pet.coin || 0}），工资仍是下班后按全额 ${this.jobSalary} 发放～`
					: `${span}。病假不扣钱，下班后结算照发全额工资 ${this.jobSalary} 杯蜜币～`,
				success: (r) => { if (r.confirm) this.submitLeave(type) }
			})
		},
		async submitLeave(type) {
			const res = await applyLeave(this.userId, type, 8, '')
			if (res.code === 0) {
				uni.showToast({ title: res.message || '已请假', icon: 'none', duration: 2500 })
				this.loadStatus()
			} else {
				uni.showToast({ title: res.message || '请假失败', icon: 'none' })
			}
		},
		/** 统一跳转：查表取路径 + 带 fail 兜底。小程序的 navigateTo 失败默认是静默的
		 * （页面栈满 10 层 / 目标是 tabBar 页 / 路径不存在），过去只能看到“点了没反应” */
		navTo(key) {
			const path = PAGE[key]
			if (!path) {
				console.warn('[beemore] 跳转 key 未在 PAGE 表登记:', key)
				uni.showToast({ title: '这个页面还没上线，先回主页吧', icon: 'none' })
				return
			}
			const url = '/' + path
			uni.navigateTo({
				url,
				fail: (e) => {
					const msg = String((e && e.errMsg) || '')
					console.warn('[beemore] navigateTo 失败:', url, msg)
					if (msg.indexOf('tabbar') >= 0 || msg.indexOf('tabBar') >= 0) { uni.switchTab({ url }); return }
					if (msg.indexOf('not found') >= 0 || msg.indexOf('不存在') >= 0) {
						uni.showToast({ title: '页面没注册，检查 pages.json', icon: 'none' })
						return
					}
					// 页面栈最多 10 层：满了就换掉当前页再进，实在不行整页重启，保证入口一定能点开
					if (/10|exceed|maximum|栈/i.test(msg)) {
						uni.redirectTo({ url, fail: () => uni.reLaunch({ url }) })
						return
					}
					uni.showToast({ title: '打不开：' + (msg || '未知原因'), icon: 'none' })
				}
			})
		},
		/** 兼容旧写法（生病提示条等直接按 key 跳） */
		go(key) { this.navTo(key) },
		/** 快捷入口点击：先按入口自己的规则拦一道，拦不住才真正跳转 */
		goEntry(q) {
			if (q.gate === 'travel' && this.pet.mood === 'sick') {
				uni.showToast({ title: '杯蜜生病啦，先带她去诊所调养，这期间出不了门～', icon: 'none' })
				return
			}
			if (q.gate && isLocked(this.pet.status)) {
				uni.showToast({ title: GATE_TIP[q.gate](statusLabel(this.pet.status)), icon: 'none' })
				return
			}
			this.navTo(q.key)
		},
		/** 事件瞬时表情：覆盖 mood 推导 2.5 秒后自动还原 */
		flashExp(exp) {
			this.transientExp = exp
			if (this.transientTimer) clearTimeout(this.transientTimer)
			this.transientTimer = setTimeout(() => { this.transientExp = '' }, 2500)
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.home { display: flex; flex-direction: column; gap: 12px; }
.status-badge { display: flex; align-items: center; gap: 12px; background: #fff; border-radius: 14px; padding: 12px 14px; border-left: 6px solid #43e97b; }
.sb-emoji { font-size: 30px; }
.sb-mid { display: flex; flex-direction: column; }
.sb-label { font-size: 15px; font-weight: bold; color: #444; }
.sb-hint { font-size: 12px; color: #8a6fb0; margin-top: 2px; }
.away { text-align: center; font-size: 13px; color: #8a6fb0; background: rgba(255,255,255,.6); border-radius: 12px; padding: 8px; }
.top-res { display: flex; justify-content: space-around; background: #fff; border-radius: 14px; padding: 10px; font-size: 14px; color: #555; }
.sick-tip { background: #ffecec; color: #e0566b; border-radius: 12px; padding: 12px; text-align: center; font-size: 14px; }
.sec-title { font-size: 14px; color: #6a5acd; font-weight: bold; margin-top: 4px; }
.work { background: rgba(255,255,255,.55); border-radius: 14px; padding: 12px; }
.work-btns { display: flex; gap: 10px; margin-top: 8px; }
.w-btn { flex: 1; font-size: 13px; border-radius: 10px; margin: 0; line-height: 2.2; }
.w-btn.work { background: #43e97b; color: #fff; }
.w-btn.leave { background: #ffd76e; color: #7a5a00; }
.work-note { font-size: 12px; color: #6a5acd; margin-top: 8px; }
.work-note.owing { color: #b47800; }
.work-note.absent { color: #e0566b; }
.sched { margin-top: 10px; background: rgba(255,255,255,.7); border-radius: 12px; padding: 8px 12px; }
.sched-row { display: flex; align-items: baseline; gap: 8px; padding: 3px 0; }
.sch-k { font-size: 12px; color: #8a6fb0; flex: none; }
.sch-v { font-size: 13px; color: #444; }
.sb-sick { color: #e0566b; font-weight: bold; }
/* 10 个入口刚好 5 列 × 2 行，不留孤项 */
.quick { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.q-item { background: #fff; border-radius: 12px; padding: 12px 0; display: flex; flex-direction: column; align-items: center; position: relative; }
.q-item.dim { opacity: .6; }
.q-badge { position: absolute; top: 5px; right: 8px; min-width: 15px; height: 15px; line-height: 15px; padding: 0 3px; box-sizing: border-box; border-radius: 8px; background: #f5576c; color: #fff; font-size: 9px; text-align: center; }
.q-lock { position: absolute; top: 4px; left: 6px; font-size: 9px; color: #8a6fb0; background: rgba(138, 111, 176, .16); border-radius: 6px; padding: 0 4px; }
.q-e { font-size: 22px; }
.q-t { font-size: 11px; color: #555; margin-top: 5px; }

/* 领养 */
.adopt { background: #fff; border-radius: 20px; padding: 20px 16px; }
.adopt-title { font-size: 20px; font-weight: bold; color: #6a5acd; text-align: center; }
.adopt-sub { font-size: 13px; color: #999; text-align: center; margin: 8px 0 16px; }
.field { margin-bottom: 14px; }
.field.mini { margin-bottom: 0; }
.lab { display: block; font-size: 13px; color: #666; margin-bottom: 6px; }
.ipt { border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px 10px; font-size: 14px; background: #faf9ff; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 20px; background: #f4f2fb; font-size: 13px; color: #666; }
.chip.on { background: #6a5acd; color: #fff; }
.adopt-btn { margin-top: 10px; background: linear-gradient(135deg, #7f9cf5, #b06ab3); color: #fff; border-radius: 14px; font-size: 16px; }
</style>
