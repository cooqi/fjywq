<template>
	<view class="page-container">
		<view v-if="loading" class="center"><text>加载中...</text></view>

		<view v-else-if="error" class="center">
			<view class="error-emoji">🫥</view>
			<text class="error-text">{{ error }}</text>
			<button class="join-btn" @click="goHome">返回首页</button>
		</view>

		<view v-else class="room">
			<!-- 游戏码 -->
			<view class="code-card">
				<view class="code-label">游戏码</view>
				<view class="code-value">{{ gameCode }}</view>
				<view class="code-meta">{{ joinedCount }} / {{ totalPlayers }} 人已加入 · {{ statusText }}</view>
				<view class="code-actions">
					<view class="chip" @click="copyCode">📋 复制游戏码</view>
					<!-- #ifdef MP-WEIXIN -->
					<button class="chip" open-type="share">💌 邀请好友</button>
					<!-- #endif -->
				</view>
			</view>

			<!-- 我的牌 -->
			<view class="card-section">
				<view v-if="!revealed" class="card card-hidden" @click="reveal">
					<text class="card-hint">👆 点击查看我的牌</text>
					<text class="card-sub">注意别被旁边人看到</text>
				</view>
				<view v-else class="card card-shown" @click="hide">
					<text class="card-word">{{ word }}</text>
					<text class="card-sub">{{ revealed ? '点击隐藏' : '' }}</text>
				</view>
			</view>

			<!-- 信息 -->
			<view class="info-card">
				<view class="info-row"><text class="info-k">我的座位</text><text class="info-v">{{ seat }} 号</text></view>
				<view class="info-row"><text class="info-k">已加入</text><text class="info-v">{{ joinedCount }} / {{ totalPlayers }} 人</text></view>
				<view class="info-row"><text class="info-k">房间状态</text><text class="info-v">{{ statusText }}</text></view>
			</view>

			<view class="btn-row">
				<button class="ghost-btn" @click="refresh(false)">🔄 刷新人数</button>
				<button class="ghost-btn" @click="goHome">🏠 返回首页</button>
			</view>

			<view class="play-tip" v-if="status === 'playing'">🎉 人已满，开始轮流描述、投票揪卧底吧！</view>
			<view class="play-tip" v-else>把游戏码分享给好友，人满后自动开始。</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			gameCode: '',
			loading: true,
			error: '',
			word: '',
			seat: 0,
			joinedCount: 0,
			totalPlayers: 0,
			status: 'waiting',
			revealed: false
		}
	},
	computed: {
		statusText() {
			return { waiting: '等待加入', playing: '已满·游戏中', ended: '已结束' }[this.status] || '未知'
		}
	},
	onLoad(options) {
		this.gameCode = (options.code || '').trim()
		this.init()
	},
	onShareAppMessage() {
		return {
			title: '谁是卧底 · 输入游戏码 ' + this.gameCode + ' 加入我',
			path: '/pages/game/xianxia/wodi/wodi-room?code=' + this.gameCode
		}
	},
	methods: {
		cacheKey() { return 'wodi_card_' + this.gameCode },
		async init() {
			if (!this.gameCode) { this.error = '缺少游戏码'; this.loading = false; return }
			// 1. 优先本地缓存（避免重复领牌消耗名额）
			const cached = uni.getStorageSync(this.cacheKey())
			if (cached && cached.word) {
				this.word = cached.word
				this.seat = cached.seat
				this.joinedCount = cached.joinedCount || 0
				this.totalPlayers = cached.totalPlayers || 0
				this.loading = false
				this.refresh(true)
				return
			}
			// 2. 无缓存 → 加入领牌
			await this.join()
		},
		async join() {
			uni.showLoading({ title: '进入房间...', mask: true })
			try {
				const res = await uniCloud.callFunction({ name: 'wodi', data: { action: 'joinRoom', gameCode: this.gameCode } })
				uni.hideLoading()
				const r = res.result
				if (r.code !== 0) { this.error = r.msg || '加入失败'; this.loading = false; return }
				const d = r.data
				this.word = d.word
				this.seat = d.seat
				this.joinedCount = d.joinedCount
				this.totalPlayers = d.totalPlayers
				this.status = d.joinedCount >= d.totalPlayers ? 'playing' : 'waiting'
				uni.setStorageSync(this.cacheKey(), {
					gameCode: this.gameCode, seat: d.seat, word: d.word,
					joinedCount: d.joinedCount, totalPlayers: d.totalPlayers
				})
				this.loading = false
			} catch (e) {
				uni.hideLoading()
				console.error('加入房间失败:', e)
				this.error = '加入失败，请重试'
				this.loading = false
			}
		},
		async refresh(silent = false) {
			try {
				const res = await uniCloud.callFunction({ name: 'wodi', data: { action: 'getRoom', gameCode: this.gameCode } })
				const r = res.result
				if (r.code === 0) {
					this.joinedCount = r.data.joinedCount
					this.totalPlayers = r.data.totalPlayers
					this.status = r.data.status
					const cached = uni.getStorageSync(this.cacheKey()) || {}
					uni.setStorageSync(this.cacheKey(), { ...cached, joinedCount: this.joinedCount, totalPlayers: this.totalPlayers })
					if (!silent) uni.showToast({ title: '已刷新', icon: 'none' })
				} else if (!silent) {
					uni.showToast({ title: r.msg || '刷新失败', icon: 'none' })
				}
			} catch (e) {
				if (!silent) uni.showToast({ title: '刷新失败', icon: 'none' })
			}
		},
		reveal() { this.revealed = true },
		hide() { this.revealed = false },
		copyCode() {
			uni.setClipboardData({ data: this.gameCode, success: () => uni.showToast({ title: '游戏码已复制', icon: 'none' }) })
		},
		goHome() {
			uni.navigateBack({ delta: 1, fail: () => uni.redirectTo({ url: '/pages/game/xianxia/wodi/wodi' }) })
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
.center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; }
.error-emoji { font-size: 90rpx; margin-bottom: 20rpx; }
.error-text { color: #f6685e; font-size: 30rpx; margin-bottom: 40rpx; }

.code-card {
	background: linear-gradient(150deg, #4facfe 0%, #00c6fb 55%, #2a9d8f 100%);
	border-radius: 32rpx; padding: 44rpx 30rpx; text-align: center; color: #fff;
	box-shadow: 0 14rpx 44rpx rgba(79, 172, 254, .4);
}
.code-label { font-size: 24rpx; opacity: .85; letter-spacing: 4rpx; }
.code-value { font-size: 84rpx; font-weight: bold; letter-spacing: 14rpx; margin: 12rpx 0; font-family: monospace; }
.code-meta { font-size: 25rpx; opacity: .95; }
.code-actions { display: flex; justify-content: center; gap: 20rpx; margin-top: 28rpx; }
.chip {
	background: rgba(255, 255, 255, .22); color: #fff; font-size: 25rpx;
	padding: 14rpx 28rpx; border-radius: 40rpx; border: none; line-height: 1.4;
}
.chip:active { background: rgba(255, 255, 255, .34); }

.card-section { display: flex; flex-direction: column; align-items: center; margin: 40rpx 0; }
.card {
	width: 440rpx; height: 380rpx; border-radius: 28rpx;
	display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.card-hidden { background: linear-gradient(135deg, #667eea, #764ba2); box-shadow: 0 12rpx 32rpx rgba(102, 126, 234, .4); }
.card-hidden .card-hint { color: #fff; font-size: 34rpx; font-weight: bold; }
.card-shown { background: #fff; border: 4rpx solid #4facfe; }
.card-shown .card-word { font-size: 88rpx; font-weight: bold; color: #333; }
.card-sub { margin-top: 16rpx; font-size: 22rpx; color: rgba(255, 255, 255, .85); }
.card-shown .card-sub { color: #999; }

.info-card { background: #fff; border-radius: 24rpx; padding: 16rpx 30rpx; box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, .08); }
.info-row { display: flex; justify-content: space-between; padding: 22rpx 0; font-size: 29rpx; border-bottom: 2rpx solid #f2f2f7; }
.info-row:last-child { border-bottom: none; }
.info-k { color: #888; }
.info-v { color: #3a6ea5; font-weight: bold; }

.btn-row { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-row button { flex: 1; margin: 0; }
.ghost-btn {
	background: #fff; color: #3a6ea5; border: 2rpx solid #3a6ea5;
	border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx;
}
.play-tip { text-align: center; font-size: 24rpx; color: #8a86a8; margin-top: 28rpx; line-height: 1.6; }
</style>
