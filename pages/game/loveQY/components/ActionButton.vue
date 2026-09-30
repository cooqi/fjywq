<template>
	<view class="action-grid">
		<view
			v-for="item in list"
			:key="item.key"
			class="action-btn"
			:class="{ disabled: item.blocked }"
			@click="onTap(item)"
		>
			<text class="a-emoji">{{ item.emoji }}</text>
			<text class="a-name">{{ item.name }}</text>
			<text class="a-sub">{{ item.subText }}</text>
		</view>
	</view>
</template>

<script>
import { ACTIONS, ACTION_KEYS, fmtCountdown } from '../beemore.js'
export default {
	name: 'ActionButton',
	props: {
		pet: { type: Object, default: () => ({}) }
	},
	data() {
		return { now: Date.now(), timer: null }
	},
	computed: {
		list() {
			const pet = this.pet || {}
			const disturb = pet.status === 'working' || pet.status === 'sleeping'
			return ACTION_KEYS.map(key => {
				const cfg = ACTIONS[key]
				const lastAt = (pet.lastActionAt || {})[key] || 0
				const remain = cfg.cooldown - (this.now - lastAt)
				const used = ((pet.daily && pet.daily.actions) || {})[key] || 0
				const cooling = remain > 0
				const limited = used >= cfg.dailyLimit
				const costTip = cfg.cost > 0 ? `耗${cfg.cost}币 · ` : ''
				let subText
				if (cooling) subText = fmtCountdown(remain)
				else if (limited) subText = `已 ${used}/${cfg.dailyLimit}`
				else if (disturb) subText = '打扰 ⚠️'
				else subText = costTip + `剩余 ${Math.max(0, cfg.dailyLimit - used)}`
				return {
					key,
					emoji: cfg.emoji,
					name: cfg.name,
					cooling,
					disturb,
					blocked: cooling,
					subText
				}
			})
		}
	},
	mounted() {
		this.timer = setInterval(() => { this.now = Date.now() }, 1000)
	},
	beforeDestroy() {
		if (this.timer) clearInterval(this.timer)
	},
	methods: {
		onTap(item) {
			if (item.blocked) {
				if (item.cooling) uni.showToast({ title: '杯蜜正在冷却中～', icon: 'none' })
				return
			}
			this.$emit('act', item.key)
		}
	}
}
</script>

<style scoped>
.action-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.action-btn {
	background: #fff;
	border-radius: 14px;
	padding: 14px 6px;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
	transition: transform .15s;
}
.action-btn:active { transform: scale(0.94); }
.action-btn.disabled { opacity: 0.5; }
.a-emoji { font-size: 26px; }
.a-name { font-size: 14px; font-weight: bold; color: #444; margin-top: 4px; }
.a-sub { font-size: 11px; color: #999; margin-top: 2px; }
</style>
