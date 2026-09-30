<template>
	<view class="status-bar">
		<view class="stat">
			<view class="stat-head">
				<text class="stat-label">💛 互动值</text>
				<text class="stat-num">{{ interaction }}</text>
			</view>
			<view class="track"><view class="fill fill-inter" :style="{ width: pct(interaction) }"></view></view>
		</view>
		<view class="stat">
			<view class="stat-head">
				<text class="stat-label">❤️ 健康值</text>
				<text class="stat-num">{{ health }}</text>
			</view>
			<view class="track"><view class="fill fill-health" :style="{ width: pct(health) }"></view></view>
		</view>
		<view class="stat">
			<view class="stat-head">
				<text class="stat-label">😄 开心值</text>
				<text class="stat-num">{{ happiness }}</text>
			</view>
			<view class="track"><view class="fill fill-happy" :style="{ width: pct(happiness) }"></view></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'StatusBar',
	props: {
		interaction: { type: Number, default: 0 },
		health: { type: Number, default: 0 },
		happiness: { type: Number, default: 0 }
	},
	methods: {
		pct(v) { return Math.max(0, Math.min(100, v || 0)) + '%' }
	}
}
</script>

<style scoped>
.status-bar { background: #fff; border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.stat-head { display: flex; justify-content: space-between; margin-bottom: 6px; }
.stat-label { font-size: 13px; color: #666; }
.stat-num { font-size: 13px; font-weight: bold; color: #333; }
.track { height: 10px; background: #eef0f7; border-radius: 6px; overflow: hidden; }
.fill { height: 100%; border-radius: 6px; transition: width .4s ease; }
.fill-inter { background: linear-gradient(90deg, #ffd76e, #ff9a3c); }
.fill-health { background: linear-gradient(90deg, #ff8a8a, #ff5d73); }
.fill-happy { background: linear-gradient(90deg, #a18cd1, #7f9cf5); }
</style>
