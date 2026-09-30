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
					<text class="sb-label">{{ statusName }}<text v-if="pet.job"> · {{ jobName }}</text></text>
					<text class="sb-hint">{{ statusHint }}</text>
				</view>
			</view>
			<view class="away" v-if="awayText">{{ awayText }}</view>

			<view class="top-res">
				<text>❤️ {{ pet.heart || 0 }}</text>
				<text>🌿 {{ pet.herb || 0 }}</text>
				<text>🪙 {{ pet.coin || 0 }}</text>
				<text>💼 {{ todayWage }}</text>
				<text>Lv.{{ pet.level || 1 }}</text>
			</view>

			<PetDisplay :emoji="pet.emoji" :mood="pet.mood" :name="pet.name" :decor="pet.equippedItems || []" :look="myLook" :transient="transientExp" />
			<Bubble :text="bubble" />
			<StatusBar :interaction="pet.interaction || 0" :health="pet.health || 0" :happiness="pet.happiness || 0" />

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
					<button class="w-btn work" @click="doSettle">结算工资 💼</button>
					<button class="w-btn leave" @click="doLeave">请假 🙋</button>
				</view>
				<view class="work-note" v-if="settleText">{{ settleText }}</view>
			</view>

			<view class="sec-title">快捷入口</view>
			<view class="quick">
				<view class="q-item" @click="go('notice')">
					<text class="q-e">🔔</text>
					<text v-if="unreadNotices" class="q-badge">{{ unreadNotices > 99 ? '99+' : unreadNotices }}</text>
					<text class="q-t">消息</text>
				</view>
				<view class="q-item" @click="go('chat')"><text class="q-e">💬</text><text class="q-t">聊天</text></view>
				<view class="q-item" @click="goGated('travel')"><text class="q-e">🎒</text><text class="q-t">旅行</text></view>
				<view class="q-item" @click="goGated('wardrobe')"><text class="q-e">👒</text><text class="q-t">衣橱</text></view>
				<view class="q-item" @click="goGated('customize')"><text class="q-e">🎨</text><text class="q-t">形象</text></view>
				<view class="q-item" @click="goGated('friends')"><text class="q-e">🤝</text><text class="q-t">好友</text></view>
				<view class="q-item" @click="go('clinic')"><text class="q-e">🏥</text><text class="q-t">诊所</text></view>
				<view class="q-item" @click="go('tasks')"><text class="q-e">📋</text><text class="q-t">任务</text></view>
				<view class="q-item" @click="go('diary')"><text class="q-e">📔</text><text class="q-t">日记</text></view>
				<view class="q-item" @click="go('settings')"><text class="q-e">⚙️</text><text class="q-t">设置</text></view>
			</view>
		</view>
	</view>
</template>

<script>
import PetDisplay from './components/PetDisplay.vue'
import StatusBar from './components/StatusBar.vue'
import ActionButton from './components/ActionButton.vue'
import Bubble from './components/Bubble.vue'
import { BEE_EMOJIS, MOOD_MAP, STATUS_MAP, awayTip, ERR_MSG, isLocked, loadBeemoreConfig, getJobs } from './beemore.js'
import { normalizeLook, ACTION_EXPRESSION } from './look.js'
import { getMyUserInfo, getCachedPet, cachePet, callBeemore, settleWork, applyLeave } from './store/pet.js'

const defaultForm = () => ({ name: '', emoji: '🐥', gender: '', age: '', height: '', weight: '', likes: [], job: '' })

export default {
	components: { PetDisplay, StatusBar, ActionButton, Bubble },
	data() {
		return {
			loading: true,
			needAdopt: false,
			userId: '',
			pet: {},
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
		statusHint() { return this.pet.statusHint || (STATUS_MAP[this.pet.status] || STATUS_MAP.idle).hint },
		todayWage() { return (this.pet.wallet && this.pet.wallet.todayWage) || 0 }
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
					this.needAdopt = false
					this.awayText = awayTip(res.data.awayTipBase)
					cachePet(this.pet)
					if (!this.bubble) this.bubble = this.stateLine()
				}
			} catch (e) {}
			this.loading = false
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
			const res = await settleWork(this.userId)
			if (res.code === 0 && res.data) {
				if (res.data.rest) { uni.showToast({ title: '今天是休息日～', icon: 'none' }); return }
				this.settleText = res.data.text
				uni.showToast({ title: res.data.text || '结算完成', icon: 'none', duration: 2500 })
				this.loadStatus()
			} else if (res.code === 3001) {
				uni.showToast({ title: '今天已经结算过工作啦', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || '结算失败', icon: 'none' })
			}
		},
		doLeave() {
			uni.showActionSheet({
				itemList: ['事假（扣当日工资50%）', '病假（不扣钱）'],
				success: async ({ tapIndex }) => {
					const type = tapIndex === 0 ? 'personal' : 'sick'
					const res = await applyLeave(this.userId, type, 8, '')
					if (res.code === 0) {
						uni.showToast({ title: res.message || '已请假', icon: 'none' })
						this.loadStatus()
					} else {
						uni.showToast({ title: res.message || '请假失败', icon: 'none' })
					}
				}
			})
		},
		go(name) {
			uni.navigateTo({ url: `/pages/game/loveQY/${name}` })
		},
		goGated(name) {
			if (isLocked(this.pet.status)) {
				uni.showToast({ title: ERR_MSG[4002], icon: 'none' })
				return
			}
			this.go(name)
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
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.q-item { background: #fff; border-radius: 14px; padding: 16px 0; display: flex; flex-direction: column; align-items: center; position: relative; }
.q-badge { position: absolute; top: 8px; right: 18px; min-width: 16px; height: 16px; line-height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: 8px; background: #f5576c; color: #fff; font-size: 10px; text-align: center; }
.q-e { font-size: 26px; }
.q-t { font-size: 13px; color: #555; margin-top: 6px; }

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
