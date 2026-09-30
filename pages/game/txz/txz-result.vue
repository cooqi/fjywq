<template>
	<view class="page-container">
		<!-- 证书 -->
		<view class="cert" :class="passed ? 'cert-pass' : 'cert-fail'">
			<view class="cert-ribbon">青宇宇宙通行证 · 嗑学认证</view>
			<view class="cert-title-big">{{ title || '嗑学测试证书' }}</view>
			<view class="cert-nick">认证人：{{ nick }}</view>

			<view class="cert-score-row">
				<view class="score-circle">
					<view class="score-num">{{ score }}</view>
					<view class="score-den">/ {{ totalScore }}</view>
				</view>
			</view>

			<view class="cert-meta">
				<view class="cert-meta-item"><text class="cm-num">{{ correctCount }}</text><text class="cm-label">答对题数</text></view>
				<view class="cert-meta-item"><text class="cm-num">{{ rank }}</text><text class="cm-label">本场排名</text></view>
				<view class="cert-meta-item"><text class="cm-num">{{ passed ? '及格' : '未及格' }}</text><text class="cm-label">结果</text></view>
			</view>

			<view class="cert-prize" v-if="prize">🎁 奖品资格：{{ prize }}</view>
			<view class="cert-code">考试码 {{ examCode }}</view>
		</view>

		<view class="verdict" :class="passed ? 'v-pass' : 'v-fail'">
			{{ passed ? '恭喜通过嗑学认证！' : '差一点点，再撒一把糖～' }}
		</view>

		<!-- 操作 -->
		<view class="action-grid">
			<!-- #ifdef MP-WEIXIN -->
			<button class="action-item primary-action" open-type="share">💌 分享成绩</button>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<view class="action-item primary-action" @click="copyResult">📋 复制成绩</view>
			<!-- #endif -->
			<view class="action-item" @click="loadRank">🏆 查看排行榜</view>
			<view class="action-item" @click="goHome">🏠 返回</view>
		</view>

		<!-- 排行榜弹层 -->
		<view class="rank-mask" v-if="showRank" @click="showRank = false">
			<view class="rank-panel" @click.stop>
				<view class="rank-panel-head">
					<text>排行榜 · {{ examCode }}</text>
					<text class="rank-close" @click="showRank = false">✕</text>
				</view>
				<view class="rank-summary" v-if="rankTotal > 0">共 {{ rankTotal }} 人参与</view>
				<scroll-view scroll-y class="rank-scroll">
					<view class="rank-item" v-for="(item, idx) in rankList" :key="idx" :class="{'rank-me': idx + 1 === rank}">
						<view class="rank-no" :class="'no-' + (idx < 3 ? idx + 1 : 'n')">{{ idx + 1 }}</view>
						<view class="rank-info">
							<view class="rank-nick">{{ item.nick }}</view>
							<view class="rank-title">{{ item.title }}</view>
						</view>
						<view class="rank-score">{{ item.score }} 分</view>
					</view>
					<view class="empty-tip" v-if="rankList.length === 0">暂无数据</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			examCode: '',
			nick: '',
			score: 0,
			totalScore: 0,
			passScore: 0,
			passed: false,
			title: '',
			prize: '',
			rank: 0,
			correctCount: 0,
			questionCount: 0,
			showRank: false,
			rankList: [],
			rankTotal: 0
		}
	},
	onLoad(options) {
		this.examCode = (options.examCode || '').toUpperCase()
		this.nick = options.nick ? decodeURIComponent(options.nick) : '匿名'
		this.score = parseInt(options.score) || 0
		this.totalScore = parseInt(options.totalScore) || 0
		this.passScore = parseInt(options.passScore) || 0
		this.passed = options.passed === 'true'
		this.title = options.title ? decodeURIComponent(options.title) : ''
		this.prize = options.prize ? decodeURIComponent(options.prize) : ''
		this.rank = parseInt(options.rank) || 0
		this.correctCount = parseInt(options.correctCount) || 0
		this.questionCount = parseInt(options.questionCount) || 0
	},
	onShareAppMessage() {
		return {
			title: `${this.nick} 拿下「${this.title || '嗑学认证'}」，${this.score}/${this.totalScore} 分，来挑战我！`,
			path: '/pages/game/txz/txz-index?shareCode=' + this.examCode
		}
	},
	onShareTimeline() {
		return { title: '青宇宇宙通行证 · 嗑学水平测试' }
	},
	methods: {
		copyResult() {
			const text = `我在【青宇宇宙通行证】嗑学测试拿了 ${this.score}/${this.totalScore} 分，称号「${this.title || '—'}」，排名第 ${this.rank}！考试码 ${this.examCode}，来考考你~`
			uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
		},
		goHome() {
			uni.navigateBack({ delta: 2, fail: () => uni.reLaunch({ url: '/pages/game/game' }) })
		},
		loadRank() {
			this.showRank = true
			uni.showLoading({ title: '加载中' })
			uniCloud.callFunction({
				name: 'txz-exam',
				data: { action: 'getRankList', examCode: this.examCode },
				complete: () => uni.hideLoading(),
				success: (res) => {
					if (res.result.code === 0) {
						this.rankList = res.result.data.list || []
						this.rankTotal = res.result.data.total || 0
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
			})
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 30rpx;
	box-sizing: border-box;
}

.cert {
	background: #fff;
	border-radius: 32rpx;
	padding: 44rpx 34rpx 44rpx;
	text-align: center;
	box-shadow: 0 16rpx 48rpx rgba(102,80,180,.18);
	position: relative;
	overflow: hidden;
}
.cert::before {
	content: ''; position: absolute; top: 0; left: 0; right: 0; height: 96rpx;
	background: linear-gradient(150deg,#6a5cff 0%,#8f5bff 55%,#c86dd7 100%);
}
.cert::after {
	content: ''; position: absolute; left: 22rpx; right: 22rpx; top: 22rpx; bottom: 22rpx;
	border: 2rpx dashed rgba(122,92,255,.35); border-radius: 22rpx; pointer-events: none;
}
.cert-pass { border: 3rpx solid #b39ddb; }
.cert-fail { border: 3rpx solid #ffcdd2; }
.cert > view, .cert > text { position: relative; z-index: 1; }
.cert-ribbon {
	display: inline-block;
	background: rgba(255,255,255,.22); color: #fff;
	font-size: 24rpx; padding: 10rpx 32rpx; border-radius: 30rpx; letter-spacing: 2rpx;
	border: 2rpx solid rgba(255,255,255,.5);
}
.cert-title-big {
	font-size: 50rpx; font-weight: bold; margin: 26rpx 0 8rpx;
	background: linear-gradient(135deg,#5b3fd6,#a6489f);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.cert-nick { font-size: 26rpx; color: #999; }

.cert-score-row { display: flex; justify-content: center; margin: 30rpx 0; }
.score-circle {
	width: 240rpx; height: 240rpx; border-radius: 50%;
	background: radial-gradient(circle at 32% 30%, #f6f2ff, #e6cffc);
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	border: 8rpx solid rgba(122,92,255,.25);
	box-shadow: inset 0 0 0 4rpx rgba(122,92,255,.10), 0 8rpx 24rpx rgba(122,92,255,.18);
}
.score-num { font-size: 82rpx; font-weight: bold; color: #4b2f8f; line-height: 1; }
.score-den { font-size: 26rpx; color: #9a9ab0; margin-top: 10rpx; }

.cert-meta { display: flex; justify-content: space-around; margin: 10rpx 0 24rpx; }
.cert-meta-item { display: flex; flex-direction: column; align-items: center; }
.cm-num { font-size: 36rpx; font-weight: bold; color: #667eea; }
.cm-label { font-size: 22rpx; color: #999; margin-top: 6rpx; }

.cert-prize {
	background: linear-gradient(135deg,#fff4d6,#ffe6ad); color: #a5670a;
	border-radius: 18rpx; padding: 20rpx; font-size: 26rpx; margin-bottom: 18rpx;
	border: 2rpx solid #ffd88a; font-weight: 500;
}
.cert-code { font-size: 22rpx; color: #bbb; letter-spacing: 3rpx; }

.verdict { text-align: center; font-size: 30rpx; font-weight: bold; margin: 30rpx 0; }
.v-pass { color: #2e7d32; }
.v-fail { color: #c62828; }

.action-grid { display: flex; flex-wrap: wrap; gap: 18rpx; }
.action-item {
	width: calc(50% - 9rpx); box-sizing: border-box; background: #fff; border: none;
	border-radius: 20rpx; padding: 28rpx 0; text-align: center; font-size: 28rpx; color: #4b3a8f;
	box-shadow: 0 4rpx 16rpx rgba(0,0,0,.05); line-height: 1.4;
}
.primary-action { width: 100%; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }

.rank-mask { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 900; }
.rank-panel { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 30rpx; max-height: 75vh; display: flex; flex-direction: column; }
.rank-panel-head { display: flex; justify-content: space-between; align-items: center; font-size: 32rpx; font-weight: bold; color: #4b3a8f; margin-bottom: 16rpx; }
.rank-close { font-size: 36rpx; color: #999; padding: 0 10rpx; }
.rank-summary { font-size: 24rpx; color: #888; margin-bottom: 12rpx; }
.rank-scroll { flex: 1; }
.rank-item { display: flex; align-items: center; padding: 24rpx 10rpx; border-bottom: 2rpx solid #f2f2f7; }
.rank-me { background: #f3effe; border-radius: 14rpx; }
.rank-no { width: 56rpx; height: 56rpx; border-radius: 50%; text-align: center; line-height: 56rpx; font-size: 24rpx; background: #eee; color: #666; margin-right: 20rpx; font-weight: bold; }
.no-1 { background:#ffd54f; color:#7a5a00; }
.no-2 { background:#cfd8dc; color:#455a64; }
.no-3 { background:#ffcc80; color:#8d5524; }
.rank-info { flex: 1; }
.rank-nick { font-size: 28rpx; color: #333; font-weight: 500; }
.rank-title { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rank-score { font-size: 30rpx; font-weight: bold; color: #764ba2; }
.empty-tip { text-align: center; padding: 60rpx 0; color: #999; }
</style>
