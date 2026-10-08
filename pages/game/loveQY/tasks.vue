<template>
	<view class="page">
		<view v-if="loading" class="center-tip">加载任务……</view>

		<view v-else>
			<view class="res-bar">
				<text>❤️ 爱心 {{ heart }}</text>
				<text>🪙 杯蜜币 {{ coin }}</text>
				<text>🍚 饥饿 {{ hunger }}</text>
				<text>🔥 连续陪伴 {{ streak }} 天</text>
			</view>

			<view class="sec">每日任务</view>
			<TaskItem v-for="t in tasks" :key="t.id" :task="t" @claim="onClaim" />

			<view class="sec">成就</view>
			<view class="ach">
				<view v-for="a in achievements" :key="a.name" class="ach-item" :class="{ on: a.got }">
					<text class="ach-e">{{ a.icon }}</text>
					<text class="ach-n">{{ a.name }}</text>
					<text class="ach-d">{{ a.got ? '已达成' : a.desc }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import TaskItem from './components/TaskItem.vue'
import { callBeemore, getMyUserInfo } from './store/pet.js'

export default {
	components: { TaskItem },
	data() {
		return {
			loading: true, userId: '', tasks: [], heart: 0, coin: 0, hunger: 35, streak: 1
		}
	},
	computed: {
		achievements() {
			const s = this.streak || 1
			return [
				{ name: '初次相遇', icon: '🐣', got: true, desc: '' },
				{ name: '陪伴 3 天', icon: '🎩', got: s >= 3, desc: `还差 ${Math.max(0, 3 - s)} 天` },
				{ name: '陪伴 7 天', icon: '🧣', got: s >= 7, desc: `还差 ${Math.max(0, 7 - s)} 天` },
				{ name: '陪伴 30 天', icon: '👓', got: s >= 30, desc: `还差 ${Math.max(0, 30 - s)} 天` }
			]
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
	},
	onShow() { this.load() },
	methods: {
		async load() {
			this.loading = true
			const tRes = await callBeemore({ action: 'tasks', userId: this.userId })
			if (tRes.code === 0 && tRes.data) {
				this.tasks = tRes.data.tasks || []
				this.heart = tRes.data.heart || 0
				this.coin = tRes.data.coin || 0
				this.hunger = tRes.data.hunger == null ? 35 : tRes.data.hunger
				this.streak = tRes.data.streak || 1
			}
			this.loading = false
		},
		async onClaim(id) {
			const res = await callBeemore({ action: 'claimTask', userId: this.userId, taskId: id })
			if (res.code === 0) {
				uni.showToast({ title: '奖励已领取', icon: 'success' })
				this.load()
			} else {
				uni.showToast({ title: res.message || '领取失败', icon: 'none' })
			}
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.res-bar { display: flex; justify-content: space-around; background: #fff; border-radius: 14px; padding: 12px; font-size: 13px; color: #666; margin-bottom: 14px; }
.sec { font-size: 15px; font-weight: bold; color: #6a5acd; margin: 16px 0 10px; }
.ach { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.ach-item { background: #fff; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: center; opacity: .55; }
.ach-item.on { opacity: 1; box-shadow: 0 0 0 2px #ffd76e inset; }
.ach-e { font-size: 28px; }
.ach-n { font-size: 14px; color: #444; margin-top: 6px; font-weight: bold; }
.ach-d { font-size: 11px; color: #999; margin-top: 2px; }
.friend-box { background: #fff; border-radius: 14px; padding: 14px; }
.my-code { font-size: 13px; color: #666; margin-bottom: 10px; }
.code { font-weight: bold; color: #6a5acd; letter-spacing: 2px; }
.copy { color: #43a047; margin-left: 6px; }
.add-row { display: flex; gap: 8px; margin-bottom: 12px; }
.add-ipt { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 6px 10px; background: #faf9ff; }
.add-btn { background: #6a5acd; color: #fff; font-size: 13px; border-radius: 10px; margin: 0; padding: 0 14px; line-height: 2.2; }
.no-friend { font-size: 12px; color: #aaa; text-align: center; padding: 10px 0; }
.f-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1rpx solid #f0eef7; }
.f-e { font-size: 22px; }
.f-n { flex: 1; font-size: 14px; color: #444; }
.f-c { font-size: 12px; color: #999; }
.f-help { background: #ff8a8a; color: #fff; font-size: 12px; border-radius: 10px; margin: 0; padding: 0 10px; line-height: 2; }
.f-help[disabled] { opacity: .5; }
.help-left { font-size: 12px; color: #8a7fb0; margin-top: 8px; text-align: center; }
</style>
