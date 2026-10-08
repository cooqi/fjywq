<template>
	<view class="page">
		<view v-if="loading" class="center-tip">正在摆碗筷……</view>

		<view v-else-if="!pet._id" class="center-tip">还没有杯蜜，先回去领养一只吧～</view>

		<view v-else class="wrap">
			<!-- 饥饿 / 体重概览 -->
			<view class="card body">
				<view class="h-row">
					<text class="h-face" :style="{ color: hungerMeta.tone }">{{ hungerMeta.face }}</text>
					<view class="h-col">
						<view class="h-top">
							<text class="h-lab">饥饿值 {{ hunger }}</text>
							<text class="h-lv" :style="{ color: hungerMeta.tone }">{{ hungerMeta.label }}</text>
						</view>
						<view class="h-bar"><view class="h-fill" :style="{ width: hunger + '%', background: hungerMeta.tone }"></view></view>
						<text class="h-tip">{{ hungerMeta.tip }}</text>
					</view>
				</view>
				<view class="b-stats">
					<text class="b-item">⚖️ {{ weight }}kg</text>
					<text class="b-item">标准 {{ weightBase }}kg</text>
					<text class="b-item">🍚 今日 {{ meals }} 顿</text>
					<text class="b-item">🪙 {{ coin }}</text>
				</view>
				<view v-if="toFat > 0" class="b-note">还差 {{ toFat }} kcal 就攒满 1kg，堆积越多越容易胖</view>
			</view>

			<!-- 能不能吃：只有休息/空闲/请假可以 -->
			<view class="gate" :class="{ deny: !allowed }" :style="allowed ? { background: statusTone } : {}">
				<text>{{ statusEmoji }} {{ gateText }}</text>
				<text v-if="cooldownText" class="cd">下次能动筷：{{ cooldownText }}</text>
			</view>

			<!-- 菜单 -->
			<view class="card">
				<view class="sec">今天吃点什么</view>
				<view class="sub">吃饱了还硬吃、一天吃太多顿，热量没处放就会长在杯蜜身上 🐷</view>
				<view class="food-list">
					<view v-for="f in foods" :key="f.key" class="food" :class="{ off: !edible(f) }" @click="choose(f)">
						<text class="f-e">{{ f.emoji }}</text>
						<view class="f-mid">
							<view class="f-n-row">
								<text class="f-n">{{ f.name }}</text>
								<text v-if="f.tag" class="f-tag" :class="{ light: f.light }">{{ f.tag }}</text>
							</view>
							<text class="f-d">{{ f.kcal }} kcal · 解饿 {{ f.hunger }} · 开心 +{{ f.happiness }}{{ f.health ? ' · 健康 +' + f.health : '' }}</text>
						</view>
						<text class="f-c">{{ f.cost || 0 }}币</text>
					</view>
				</view>
			</view>

			<!-- 本顿结果 -->
			<view v-if="result" class="card result" :class="{ fat: result.fatGain > 0 }">
				<view class="r-line">{{ result.line }}</view>
				<view class="r-rows">
					<text>吃了 {{ result.food.emoji }} {{ result.food.name }}（{{ result.food.kcal }} kcal）</text>
					<text>饥饿值：{{ result.hungerBefore }} → {{ result.hungerLeft }}</text>
					<text>这顿真正消耗 {{ result.burned }} kcal，堆积 {{ result.surplus }} kcal</text>
					<text v-if="result.fatGain > 0" class="warn">⚠️ 体重 +{{ result.fatGain }}kg，现在是 {{ result.weight }}kg，已经写进日记了</text>
					<text v-else>体重没变：{{ result.weight }}kg</text>
				</view>
				<button class="ghost-btn" @click="goDiary">看看她的日记 📔</button>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo, cachePet, eatFood } from './store/pet.js'
import { getFoods, hungerInfo, canEat, STATUS_MAP, fmtCountdown, getRules, loadBeemoreConfig } from './beemore.js'

/** 与云函数 EAT_DENY_MSG 对齐的本地话术（服务端仍是最终裁判） */
const DENY_MSG = {
	working: '杯蜜正在上班，吃饭要等到休息时间哦～ 💼',
	sleeping: '睡觉时间不能吃东西，会积食的，等她醒来再说～ 😴',
	traveling: '旅行路上先忍着，回到家再一起吃好的 🎒'
}

export default {
	data() {
		return {
			loading: true, userId: '', pet: {},
			result: null, cooldownLeft: 0, timer: null
		}
	},
	computed: {
		foods() { return getFoods() },
		status() { return this.pet.status || 'idle' },
		hunger() { return this.pet.hunger == null ? 35 : Math.max(0, Math.min(100, this.pet.hunger)) },
		hungerMeta() { return hungerInfo(this.hunger) },
		weight() { return this.pet.weight || 0 },
		weightBase() { return this.pet.weightBase || this.pet.weight || 0 },
		meals() { return (this.pet.daily && this.pet.daily.meals) || 0 },
		coin() { return this.pet.coin || 0 },
		/** 还差多少热量攒满 1kg（服务端返回优先，本地按 overKcal 估算） */
		toFat() {
			if (this.result) return Math.max(0, this.result.toFat)
			const per = (getRules() && getRules().FAT_KCAL_PER_KG) || 240
			return Math.max(0, per - (this.pet.overKcal || 0))
		},
		allowed() { return canEat(this.status) },
		statusEmoji() { return (STATUS_MAP[this.status] || STATUS_MAP.idle).emoji },
		statusTone() { return ((STATUS_MAP[this.status] || STATUS_MAP.idle).tone) + '22' },
		gateText() {
			if (this.allowed) {
				if (this.meals >= this.dailyLimit) return `今天已经吃了 ${this.meals} 顿，胃要撑坏了，明天再吃吧`
				return '现在是能吃饭的时间，挑一道吧～'
			}
			return DENY_MSG[this.status] || '这会儿不方便进食，等她空闲下来再吃吧～'
		},
		dailyLimit() { return (getRules() && getRules().MEAL_DAILY_LIMIT) || 8 },
		sick() { return this.pet.mood === 'sick' },
		cooldownText() { return fmtCountdown(this.cooldownLeft) }
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.startTimer()
		// 菜单/阈值可能被管理员配置覆盖，先取配置再拉状态
		loadBeemoreConfig().then(() => this.load())
	},
	onShow() { if (!this.loading) this.load() },
	onUnload() { this.stopTimer() },
	methods: {
		async load() {
			if (!this.userId) { this.loading = false; return }
			const res = await callBeemore({ action: 'getStatus', userId: this.userId })
			if (res.code === 0 && res.data && res.data.pet) {
				this.pet = res.data.pet
				cachePet(this.pet)
				// 服务端已结算冷却，本地按 lastActionAt.eat 续上倒计时
				this.tickCooldown()
			}
			this.loading = false
		},
		/** 生病只能吃清淡的；余额不够/超顿数/冷却中也不能点 */
		edible(f) { return !this.reason(f) },
		reason(f) {
			if (!this.allowed || this.meals >= this.dailyLimit) return this.gateText
			if (this.cooldownLeft > 0) return '刚吃过，让胃缓一缓吧'
			if (this.sick && !f.light) return `生病只能吃清淡的，${f.name}吃了会更难受`
			if ((f.cost || 0) > this.coin) return `这顿要 ${f.cost} 杯蜜币，余额不够，先工作赚点吧`
			return ''
		},
		choose(f) {
			const why = this.reason(f)
			if (why) { uni.showToast({ title: why, icon: 'none' }); return }
			this.result = null
			this.doEat(f)
		},
		async doEat(f) {
			uni.showLoading({ title: '上菜中……' })
			const hungerBefore = this.hunger
			const res = await eatFood(this.userId, f.key)
			uni.hideLoading()
			if (res.code === 0 && res.data) {
				this.pet = res.data.pet
				cachePet(this.pet)
				uni.$emit('beemore:pet-updated', this.pet)
				this.result = Object.assign({}, res.data, { hungerBefore, burned: Math.max(0, (f.kcal || 0) - res.data.surplus) })
				this.tickCooldown()
				if (res.data.fatGain > 0) uni.showToast({ title: `体重 +${res.data.fatGain}kg`, icon: 'none' })
			} else if (res.code === 3001) {
				const left = (res.data && res.data.retryAfter) || (getRules() && getRules().MEAL_COOLDOWN_MS) || 900000
				this.cooldownLeft = left
				uni.showToast({ title: '刚吃过，让胃缓一缓吧', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || '这顿吃不上，稍后再试', icon: 'none' })
				if (res.code === 4002) this.load()
			}
		},
		/** 距上次吃饭未到冷却时长时，本地走倒计时 */
		tickCooldown() {
			const cd = (getRules() && getRules().MEAL_COOLDOWN_MS) || 900000
			const last = (this.pet.lastActionAt && this.pet.lastActionAt.eat) || 0
			this.cooldownLeft = Math.max(0, last + cd - Date.now())
		},
		startTimer() {
			this.stopTimer()
			this.timer = setInterval(() => {
				if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - 1000)
			}, 1000)
		},
		stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } },
		goDiary() { uni.navigateTo({ url: '/pages/game/loveQY/diary' }) }
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.wrap { display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 18px; padding: 16px; }
.sec { font-size: 16px; font-weight: bold; color: #6a5acd; }
.sub { font-size: 12px; color: #999; margin: 6px 0 12px; }

/* 饥饿与体重 */
.h-row { display: flex; align-items: center; gap: 12px; }
.h-face { font-size: 15px; width: 74px; flex: none; text-align: center; }
.h-col { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.h-top { display: flex; justify-content: space-between; align-items: baseline; }
.h-lab { font-size: 13px; color: #666; }
.h-lv { font-size: 14px; font-weight: bold; }
.h-bar { height: 10px; border-radius: 6px; background: #f0edf8; overflow: hidden; }
.h-fill { height: 100%; border-radius: 6px; }
.h-tip { font-size: 12px; color: #8a6fb0; }
.b-stats { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; padding-top: 10px; border-top: 1rpx dashed #ece7f6; }
.b-item { font-size: 13px; color: #555; }
.b-note { font-size: 11px; color: #b08a5a; margin-top: 8px; }

/* 能不能吃 */
.gate { background: #eafaf0; border-radius: 14px; padding: 10px 14px; display: flex; flex-direction: column; gap: 4px; }
.gate text { font-size: 13px; color: #4a5a6a; }
.gate.deny { background: #fff2f2; }
.gate.deny text { color: #d0566b; }
.gate .cd { font-size: 12px; color: #8a6fb0; }

/* 菜单 */
.food-list { display: flex; flex-direction: column; }
.food { display: flex; align-items: center; gap: 10px; padding: 12px 6px; border-bottom: 1rpx solid #f5f2fb; }
.food:last-child { border-bottom: none; }
.food.off { opacity: .45; }
.f-e { font-size: 26px; flex: none; }
.f-mid { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.f-n-row { display: flex; align-items: center; gap: 6px; }
.f-n { font-size: 14px; color: #444; font-weight: bold; }
.f-tag { font-size: 10px; color: #b06ab3; background: #f6ecff; border-radius: 8px; padding: 1px 6px; }
.f-tag.light { color: #2f9e6e; background: #e8f9f0; }
.f-d { font-size: 11px; color: #999; }
.f-c { font-size: 12px; color: #6a5acd; flex: none; }

/* 结果 */
.result { background: linear-gradient(160deg, #f3fbff, #fff6fb); }
.result.fat { background: linear-gradient(160deg, #fff7e6, #fff0f0); }
.r-line { font-size: 15px; color: #6a5acd; font-weight: bold; }
.r-rows { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.r-rows text { font-size: 12px; color: #666; }
.r-rows .warn { color: #d0566b; font-weight: bold; }
.ghost-btn { margin-top: 12px; background: #f0ebff; color: #6a5acd; border-radius: 12px; font-size: 14px; }
</style>
