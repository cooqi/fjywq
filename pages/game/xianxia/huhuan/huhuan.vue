<template>
	<view class="page-container">
		<view class="hero">
			<view class="hero-icon">🔄</view>
			<view class="hero-title">物料互换</view>
			<view class="hero-sub">发布物料 · 凭码互换 · 线下交换</view>
		</view>

		<!-- 玩法简介 -->
		<view class="section-card rules-card">
			<view class="section-title">怎么玩</view>
			<view class="rule-item"><text class="rule-dot">📣</text><text class="rule-text">A 发布物料和互换数量 N，系统生成 8 位物料码</text></view>
			<view class="rule-item"><text class="rule-dot">✋</text><text class="rule-text">B 凭物料码填昵称 + 份数 + 备注申请，先到先得</text></view>
			<view class="rule-item"><text class="rule-dot">🧮</text><text class="rule-text">总份数和申请人数都不超过 N，满了自动关闭名额</text></view>
			<view class="rule-item"><text class="rule-dot">✅</text><text class="rule-text">A 在管理页改份数 / 删除 / 标记已互换，名额实时释放</text></view>
		</view>

		<!-- 快捷入口 -->
		<view class="section-card">
			<button class="primary-btn" @click="goPublish">＋ 发布互换</button>
		</view>

		<view class="section-card">
			<view class="section-title">我有物料码</view>
			<input class="code-input" v-model="joinCode" placeholder="请输入 8 位物料码" maxlength="8" @confirm="goApply" />
			<button class="join-btn" @click="goApply">去申请</button>
		</view>

		<!-- 我的 -->
		<view class="section-card mine-entry" @click="goMine('created')">
			<view class="mine-entry-icon">📦</view>
			<view class="mine-entry-text">
				<view class="mine-entry-title">我发布的</view>
				<view class="mine-entry-sub">管理别人的申请</view>
			</view>
			<view class="mine-entry-arrow">›</view>
		</view>
		<view class="section-card mine-entry" @click="goMine('joined')">
			<view class="mine-entry-icon">🎁</view>
			<view class="mine-entry-text">
				<view class="mine-entry-title">我申请的</view>
				<view class="mine-entry-sub">我发起的互换申请</view>
			</view>
			<view class="mine-entry-arrow">›</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userId: '',
			userNick: '',
			joinCode: ''
		}
	},
	onLoad() {
		this.loadUser()
	},
	onShow() {
		this.loadUser()
	},
	onShareAppMessage() {
		return { title: '杯杯儿互动 · 物料互换', path: '/pages/game/xianxia/huhuan/huhuan' }
	},
	onShareTimeline() {
		return { title: '杯杯儿互动 · 物料互换' }
	},
	methods: {
		loadUser() {
			const raw = uni.getStorageSync('userInfo')
			let info = {}
			if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
			this.userId = info._id || ''
			this.userNick = info.nickName || ''
		},
		needLogin() {
			if (!this.userId) {
				uni.showToast({ title: '请先在「我的」登录', icon: 'none' })
				return true
			}
			return false
		},
		goPublish() {
			if (this.needLogin()) return
			uni.navigateTo({ url: '/pages/game/xianxia/huhuan/huhuan-publish' })
		},
		goApply() {
			const code = (this.joinCode || '').trim().toUpperCase()
			if (!code) { uni.showToast({ title: '请输入物料码', icon: 'none' }); return }
			if (this.needLogin()) return
			uni.navigateTo({ url: '/pages/game/xianxia/huhuan/huhuan-apply?code=' + code })
		},
		goMine(tab) {
			if (this.needLogin()) return
			uni.navigateTo({ url: '/pages/game/xianxia/huhuan/huhuan-manage?mode=mine&tab=' + tab })
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
.hero { text-align: center; padding: 40rpx 0 16rpx; }
.hero-icon {
	font-size: 76rpx; width: 140rpx; height: 140rpx; line-height: 140rpx; margin: 0 auto;
	border-radius: 50%; background: linear-gradient(135deg, #43e97b, #38f9d7);
	box-shadow: 0 12rpx 36rpx rgba(56, 214, 150, .4);
}
.hero-title {
	font-size: 46rpx; font-weight: bold; margin-top: 20rpx;
	background: linear-gradient(135deg, #2e8b6f, #3a6ea5);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 25rpx; color: #8a86a8; margin-top: 10rpx; letter-spacing: 2rpx; }

.section-card {
	background: #fff; border-radius: 28rpx; padding: 32rpx 30rpx; margin-top: 24rpx;
	box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10);
	border: 2rpx solid rgba(255, 255, 255, .7);
}
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 18rpx; }

.rules-card .section-title { color: #2e8b6f; }
.rule-item { display: flex; align-items: flex-start; margin-bottom: 14rpx; }
.rule-item:last-child { margin-bottom: 0; }
.rule-dot { font-size: 24rpx; margin-right: 14rpx; flex-shrink: 0; line-height: 1.6; }
.rule-text { flex: 1; font-size: 25rpx; color: #666; line-height: 1.6; }

.code-input {
	height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; margin-bottom: 20rpx;
	letter-spacing: 4rpx;
}
.primary-btn {
	background: linear-gradient(135deg, #43e97b 0%, #38b2ac 100%);
	color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none;
}
.join-btn {
	background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
	color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; border: none;
}

.mine-entry { display: flex; align-items: center; }
.mine-entry:active { transform: scale(.99); }
.mine-entry-icon { font-size: 44rpx; margin-right: 22rpx; }
.mine-entry-text { flex: 1; }
.mine-entry-title { font-size: 30rpx; font-weight: bold; color: #3a5a6f; }
.mine-entry-sub { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.mine-entry-arrow { font-size: 40rpx; color: #cfcfe0; }
</style>
