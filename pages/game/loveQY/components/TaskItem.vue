<template>
	<view class="task-item" :class="{ done: task.done }">
		<view class="t-icon">{{ task.icon }}</view>
		<view class="t-body">
			<view class="t-name">{{ task.name }}</view>
			<view class="t-track"><view class="t-fill" :style="{ width: pct }"></view></view>
			<view class="t-meta">
				<text class="t-progress">{{ task.progress }}/{{ task.target }}</text>
				<text class="t-reward">{{ rewardText }}</text>
			</view>
		</view>
		<view class="t-btn" :class="{ can: task.done && !task.claimed }" @click="onClaim">
			<text>{{ task.claimed ? '已领' : (task.done ? '领取' : '未完成') }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'TaskItem',
	props: {
		task: { type: Object, required: true }
	},
	computed: {
		pct() {
			const t = this.task
			if (!t.target) return '0%'
			return Math.min(100, Math.round((t.progress / t.target) * 100)) + '%'
		},
		rewardText() {
			const r = this.task.reward || {}
			const arr = []
			if (r.heart) arr.push(`❤️×${r.heart}`)
			if (r.coin) arr.push(`🪙×${r.coin}`)
			if (r.newEmoji) arr.push('新表情')
			if (r.newLine) arr.push('新文案')
			if (r.growth) arr.push(`成长+${r.growth}`)
			return arr.join(' ')
		}
	},
	methods: {
		onClaim() {
			if (this.task.done && !this.task.claimed) this.$emit('claim', this.task.id)
		}
	}
}
</script>

<style scoped>
.task-item {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 14px;
	padding: 12px 14px;
	margin-bottom: 10px;
}
.task-item.done { box-shadow: 0 0 0 2px #b9f0c6 inset; }
.t-icon { font-size: 24px; margin-right: 12px; }
.t-body { flex: 1; }
.t-name { font-size: 14px; color: #444; font-weight: bold; margin-bottom: 6px; }
.t-track { height: 8px; background: #eef0f7; border-radius: 5px; overflow: hidden; }
.t-fill { height: 100%; background: linear-gradient(90deg, #7ad0a0, #43e97b); border-radius: 5px; transition: width .4s; }
.t-meta { display: flex; justify-content: space-between; margin-top: 6px; }
.t-progress { font-size: 11px; color: #999; }
.t-reward { font-size: 11px; color: #c78ce0; }
.t-btn {
	min-width: 58px;
	text-align: center;
	font-size: 12px;
	color: #aaa;
	padding: 6px 8px;
	border-radius: 10px;
	background: #f4f4f8;
}
.t-btn.can { color: #fff; background: linear-gradient(135deg, #43e97b, #38d9c9); }
</style>
