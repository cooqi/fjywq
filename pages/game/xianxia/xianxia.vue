<template>
	<view class="page-container">
		<view class="hero">
			<view class="hero-icon">🥤</view>
			<view class="hero-title">杯杯儿互动</view>
			<view class="hero-sub">线下应援互动小工具集合</view>
		</view>

		<view class="feature-list">
			<!-- 宇宙通行证 -->
			<view class="feature-card" @click="go('txz')">
				<view class="feature-icon txz-icon">🎫</view>
				<view class="feature-info">
					<view class="feature-name">宇宙通行证</view>
					<view class="feature-desc">嗑学水平测试 · 邀请好友一起考</view>
				</view>
				<view class="feature-arrow">›</view>
			</view>

			<!-- 物料互换 -->
			<view class="feature-card" @click="go('huhuan')">
				<view class="feature-icon huhuan-icon">🔄</view>
				<view class="feature-info">
					<view class="feature-name">物料互换</view>
					<view class="feature-desc">发布小卡海报 · 互换换物料</view>
				</view>
				<view class="feature-arrow">›</view>
			</view>

			<!-- 手机灯牌 -->
			<view class="feature-card" @click="go('led')">
				<view class="feature-icon led-icon">📱</view>
				<view class="feature-info">
					<view class="feature-name">手机灯牌</view>
					<view class="feature-desc">滚动应援牌 · 保存分享</view>
				</view>
				<view class="feature-arrow">›</view>
			</view>

			<!-- 谁是卧底 -->
			<view class="feature-card" @click="go('undercover')">
				<view class="feature-icon undercover-icon">🕵️</view>
				<view class="feature-info">
					<view class="feature-name">谁是卧底</view>
					<view class="feature-desc">经典桌面推理游戏</view>
				</view>
				<view class="feature-arrow">›</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {}
	},
	onShareAppMessage() {
		return {
			title: '杯杯儿互动 · 线下应援小工具',
			path: '/pages/game/xianxia/xianxia'
		}
	},
	onShareTimeline() {
		return { title: '杯杯儿互动 · 线下应援小工具' }
	},
	methods: {
		go(type) {
			const routes = {
				'txz': '/pages/game/xianxia/txz/txz-index',
				'huhuan': '/pages/game/xianxia/huhuan/huhuan',
				'led': '/pages/game/xianxia/led/led-index',
				'undercover': '/pages/game/xianxia/wodi/wodi'
			}
			if (routes[type]) {
				uni.navigateTo({ url: routes[type] })
			} else {
				uni.showToast({ title: '功能开发中，敬请期待', icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx;
	box-sizing: border-box;
}

.hero { text-align: center; padding: 44rpx 0 24rpx; }
.hero-icon {
	font-size: 84rpx; width: 150rpx; height: 150rpx; line-height: 150rpx; margin: 0 auto;
	border-radius: 50%; background: linear-gradient(135deg, #667eea, #b06ab3);
	box-shadow: 0 12rpx 36rpx rgba(102, 126, 234, .45);
}
.hero-title {
	font-size: 48rpx; font-weight: bold; margin-top: 22rpx;
	background: linear-gradient(135deg, #5b3fd6, #a6489f);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 26rpx; color: #8a86a8; margin-top: 12rpx; letter-spacing: 2rpx; }

.feature-list { margin-top: 20rpx; }
.feature-card {
	display: flex; align-items: center;
	background: #fff; border-radius: 28rpx;
	padding: 34rpx 30rpx; margin-bottom: 24rpx;
	box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10);
	border: 2rpx solid rgba(255, 255, 255, .7);
	transition: transform .15s;
}
.feature-card:active { transform: scale(.98); }
.feature-icon {
	width: 96rpx; height: 96rpx; border-radius: 24rpx; flex-shrink: 0;
	display: flex; align-items: center; justify-content: center;
	font-size: 48rpx; margin-right: 26rpx;
}
.txz-icon { background: linear-gradient(135deg, #667eea, #764ba2); }
.huhuan-icon { background: linear-gradient(135deg, #43e97b, #38f9d7); }
.led-icon { background: linear-gradient(135deg, #fa709a, #fee140); }
.undercover-icon { background: linear-gradient(135deg, #4facfe, #00f2fe); }
.feature-info { flex: 1; }
.feature-name { font-size: 32rpx; font-weight: bold; color: #4b3a8f; }
.feature-desc { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.feature-tag {
	font-size: 20rpx; color: #b0a8c8; background: #f2effa;
	padding: 6rpx 16rpx; border-radius: 20rpx; margin-right: 12rpx;
}
.feature-arrow { font-size: 44rpx; color: #cfcfe0; }
</style>
