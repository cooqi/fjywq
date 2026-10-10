<template>
	<view class="page-container">
		<view class="hero">
			<view class="hero-icon">🕵️</view>
			<view class="hero-title">谁是卧底</view>
			<view class="hero-sub">同词识人 · 找出那个不一样的人</view>
		</view>

		<!-- 玩法简介 -->
		<view class="section-card rules-card">
			<view class="section-title">怎么玩</view>
			<view class="rule-item"><text class="rule-dot">🎟️</text><text class="rule-text">房主设定人数与卧底数，生成 6 位游戏码</text></view>
			<view class="rule-item"><text class="rule-dot">🔑</text><text class="rule-text">好友输入游戏码加入，凭码各领一张牌（仅自己可见）</text></view>
			<view class="rule-item"><text class="rule-dot">🗣️</text><text class="rule-text">轮流描述自己的词，多数人拿到「平民词」，少数是「卧底词」</text></view>
			<view class="rule-item"><text class="rule-dot">🕵️</text><text class="rule-text">每轮投票揪出可疑者，卧底撑到最后即获胜</text></view>
		</view>

		<!-- 创建房间 -->
		<view class="section-card">
			<view class="section-title">创建房间</view>
			<view class="field">
				<view class="field-label">
					<text>游戏人数</text>
					<text class="field-value">{{ totalPlayers }} 人</text>
				</view>
				<slider :value="totalPlayers" :min="4" :max="12" :step="1" activeColor="#4facfe" @change="onTotalChange" />
			</view>
			<view class="field">
				<view class="field-label">
					<text>卧底人数</text>
					<text class="field-value spy">{{ spyCount }} 人</text>
				</view>
				<slider :value="spyCount" :min="1" :max="maxSpy" :step="1" activeColor="#f6685e" @change="onSpyChange" />
				<text class="hint">卧底人数需少于好人人数</text>
			</view>
			<button class="primary-btn" :disabled="creating" @click="createRoom">
				{{ creating ? '生成中...' : '生成游戏码' }}
			</button>
		</view>

		<!-- 加入房间 -->
		<view class="section-card">
			<view class="section-title">我有游戏码</view>
			<input class="code-input" v-model="joinCode" type="number" placeholder="请输入 6 位数字游戏码" maxlength="6" @confirm="joinRoom" />
			<button class="join-btn" @click="joinRoom">加入房间</button>
		</view>

		<!-- 题库管理（仅管理员可见） -->
		<view v-if="isAdmin" class="section-card admin-entry" @click="goAdmin">
			<view class="mine-entry-icon">📚</view>
			<view class="mine-entry-text">
				<view class="mine-entry-title">题库管理</view>
				<view class="mine-entry-sub">维护平民词 / 卧底词</view>
			</view>
			<view class="mine-entry-arrow">›</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			totalPlayers: 6,
			spyCount: 1,
			creating: false,
			joinCode: '',
			isAdmin: false,
			userRole: ''
		}
	},
	computed: {
		maxSpy() {
			return Math.max(1, Math.floor((this.totalPlayers - 1) / 2))
		}
	},
	onLoad() {
		this.loadUser()
	},
	onShow() {
		this.loadUser()
	},
	onShareAppMessage() {
		return { title: '谁是卧底 · 来一局烧脑推理', path: '/pages/game/xianxia/wodi/wodi' }
	},
	onShareTimeline() {
		return { title: '谁是卧底 · 来一局烧脑推理' }
	},
	methods: {
		loadUser() {
			const raw = uni.getStorageSync('userInfo')
			let info = {}
			if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
			this.userRole = info.role || ''
			this.isAdmin = this.userRole === 's_admin' || this.userRole === 'admin'
		},
		onTotalChange(e) {
			this.totalPlayers = e.detail.value
			if (this.spyCount > this.maxSpy) this.spyCount = this.maxSpy
		},
		onSpyChange(e) {
			this.spyCount = e.detail.value
		},
		async createRoom() {
			if (this.creating) return
			this.creating = true
			uni.showLoading({ title: '生成中...', mask: true })
			try {
				const res = await uniCloud.callFunction({
					name: 'wodi',
					data: { action: 'createRoom', totalPlayers: this.totalPlayers, spyCount: this.spyCount }
				})
				uni.hideLoading()
				const r = res.result
				if (r.code !== 0) {
					this.creating = false
					return uni.showToast({ title: r.msg || '生成失败', icon: 'none' })
				}
				const d = r.data
				// 缓存房主牌面（座位固定 1）
				uni.setStorageSync('wodi_card_' + d.gameCode, {
					gameCode: d.gameCode, seat: d.seat, word: d.word,
					joinedCount: d.joinedCount, totalPlayers: d.totalPlayers
				})
				this.creating = false
				uni.redirectTo({ url: '/pages/game/xianxia/wodi/wodi-room?code=' + d.gameCode })
			} catch (e) {
				uni.hideLoading()
				this.creating = false
				console.error('创建房间失败:', e)
				uni.showToast({ title: '网络异常，请重试', icon: 'none' })
			}
		},
		joinRoom() {
			const c = (this.joinCode || '').trim()
			if (!/^\d{6}$/.test(c)) {
				return uni.showToast({ title: '请输入 6 位数字游戏码', icon: 'none' })
			}
			uni.navigateTo({ url: '/pages/game/xianxia/wodi/wodi-room?code=' + c })
		},
		goAdmin() {
			uni.navigateTo({ url: '/pages/game/xianxia/wodi/wodi-admin' })
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
	border-radius: 50%; background: linear-gradient(135deg, #4facfe, #00f2fe);
	box-shadow: 0 12rpx 36rpx rgba(79, 172, 254, .4);
}
.hero-title {
	font-size: 46rpx; font-weight: bold; margin-top: 20rpx;
	background: linear-gradient(135deg, #3a6ea5, #2a9d8f);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 25rpx; color: #8a86a8; margin-top: 10rpx; letter-spacing: 2rpx; }

.section-card {
	background: #fff; border-radius: 28rpx; padding: 32rpx 30rpx; margin-top: 24rpx;
	box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10);
	border: 2rpx solid rgba(255, 255, 255, .7);
}
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 18rpx; }
.rules-card .section-title { color: #3a6ea5; }
.rule-item { display: flex; align-items: flex-start; margin-bottom: 14rpx; }
.rule-item:last-child { margin-bottom: 0; }
.rule-dot { font-size: 24rpx; margin-right: 14rpx; flex-shrink: 0; line-height: 1.6; }
.rule-text { flex: 1; font-size: 25rpx; color: #666; line-height: 1.6; }

.field { margin-bottom: 12rpx; }
.field-label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.field-label text:first-child { font-size: 27rpx; color: #666; }
.field-value { font-size: 30rpx; font-weight: bold; color: #4facfe; }
.field-value.spy { color: #f6685e; }
.hint { font-size: 22rpx; color: #999; }

.code-input {
	height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; margin-bottom: 20rpx;
	letter-spacing: 4rpx;
}
.primary-btn {
	background: linear-gradient(135deg, #4facfe 0%, #00c6fb 100%);
	color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none; margin-top: 10rpx;
	&[disabled] { opacity: .6; }
}
.join-btn {
	background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
	color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; border: none;
}

.admin-entry { display: flex; align-items: center; }
.admin-entry:active { transform: scale(.99); }
.mine-entry-icon { font-size: 44rpx; margin-right: 22rpx; }
.mine-entry-text { flex: 1; }
.mine-entry-title { font-size: 30rpx; font-weight: bold; color: #3a5a6f; }
.mine-entry-sub { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.mine-entry-arrow { font-size: 40rpx; color: #cfcfe0; }
</style>
