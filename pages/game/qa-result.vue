<template>
	<view class="page-container">
		<!-- 成绩卡片 -->
		<view class="result-card">
			<view class="result-icon">{{passed ? '🎉' : '💪'}}</view>
			<view class="result-status" :class="passed ? 'status-pass' : 'status-fail'">
				{{passed ? '恭喜及格！' : '未及格'}}
			</view>
			<view class="score-box">
				<text class="score-number">{{score}}</text>
				<text class="score-unit">分</text>
			</view>
			<view class="score-detail">
				答对 {{correctCount}} / {{totalQuestions}} 题（每题 4 分）
			</view>
			<view class="score-bar">
				<view class="bar-fill" :class="{'bar-pass': passed}" :style="{width: (score) + '%'}"></view>
			</view>
			<view class="score-line">
				<text class="line-label">及格线 60 分</text>
			</view>
		</view>
		
		<!-- 操作按钮 -->
		<view class="action-btns">
			<button class="action-btn retry-btn" @click="retryExam">再考一次</button>
			<button class="action-btn home-btn" @click="goHome">返回首页</button>
		</view>
		
		<!-- 错题解析 -->
		<view class="wrong-section" v-if="wrongQuestions.length > 0">
			<view class="section-title">
				<text class="title-icon">📖</text>
				<text>错题解析（{{wrongQuestions.length}} 题）</text>
			</view>
			
			<view class="wrong-card" v-for="(item, idx) in wrongQuestions" :key="idx">
				<view class="wrong-card-header">
					<text class="wrong-index">第 {{item.index}} 题</text>
					<view class="type-tag" :class="'type-' + item.type">
						{{typeLabel(item.type)}}
					</view>
				</view>
				
				<view class="wrong-question-text">{{item.question}}</view>
				
				<view class="wrong-options">
					<view 
						class="wrong-option"
						v-for="opt in item.options"
						:key="opt.key"
						:class="{
							'opt-correct': isCorrectOption(opt.key, item.correctAnswer),
							'opt-wrong': isWrongOption(opt.key, item.userAnswer, item.correctAnswer)
						}"
					>
						<text class="opt-key">{{opt.key}}.</text>
						<text class="opt-value">{{opt.value}}</text>
						<text class="opt-mark" v-if="isCorrectOption(opt.key, item.correctAnswer)">✓ 正确答案</text>
						<text class="opt-mark wrong-mark" v-if="isWrongOption(opt.key, item.userAnswer, item.correctAnswer)">✗ 你的选择</text>
					</view>
				</view>
				
				<view class="wrong-user-answer">
					<text>你的答案：</text>
					<text class="user-ans">{{formatAnswer(item.userAnswer)}}</text>
				</view>
				
				<view class="wrong-analysis-box" v-if="item.analysis">
					<text class="analysis-title">💡 解析</text>
					<text class="analysis-content">{{item.analysis}}</text>
				</view>
			</view>
		</view>
		
		<!-- 全对提示 -->
		<view class="all-correct" v-if="wrongQuestions.length === 0 && loaded">
			<view class="correct-icon">🏆</view>
			<text class="correct-text">全部答对，太厉害了！</text>
		</view>
		
		<!-- 加载中 -->
		<view class="loading-mask" v-if="!loaded">
			<text>加载成绩中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			recordId: '',
			score: 0,
			correctCount: 0,
			totalQuestions: 25,
			passed: false,
			wrongQuestions: [],
			loaded: false
		}
	},
	onLoad(options) {
		const userInfo = uni.getStorageSync('userInfo')
		if (userInfo) {
			this.userInfo = JSON.parse(userInfo)
		}
		
		this.recordId = options.recordId || ''
		this.score = parseInt(options.score) || 0
		this.correctCount = parseInt(options.correctCount) || 0
		this.totalQuestions = parseInt(options.total) || 25
		this.passed = options.passed === 'true'
		
		// 加载错题详情
		this.loadWrongDetails()
	},
	methods: {
		typeLabel(type) {
			const map = { single: '单选', multiple: '多选', judge: '判断' }
			return map[type] || type
		},
		
		// 加载错题详情
		loadWrongDetails() {
			if (!this.recordId || !this.userInfo._id) {
				this.loaded = true
				return
			}
			
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'getRecord',
					userId: this.userInfo._id,
					recordId: this.recordId
				},
				success: (res) => {
					this.loaded = true
					if (res.result.code === 0 && res.result.data) {
						const record = res.result.data
						// 筛选错题
						this.wrongQuestions = (record.questions || [])
							.filter(q => q.isCorrect === false)
					}
				},
				fail: () => {
					this.loaded = true
				}
			})
		},
		
		// 判断是否为正确选项
		isCorrectOption(key, correctAnswer) {
			return correctAnswer && correctAnswer.includes(key)
		},
		
		// 判断为用户错选（选了但不是正确答案）
		isWrongOption(key, userAnswer, correctAnswer) {
			if (!userAnswer || !correctAnswer) return false
			return userAnswer.includes(key) && !correctAnswer.includes(key)
		},
		
		// 格式化答案
		formatAnswer(answerArr) {
			if (!answerArr || answerArr.length === 0) return '未作答'
			return answerArr.join(', ')
		},
		
		// 再考一次
		retryExam() {
			uni.redirectTo({
				url: '/pages/game/qa-exam'
			})
		},
		
		// 返回首页
		goHome() {
			uni.navigateBack({
				delta: 10
			})
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx;
	padding-bottom: 60rpx;
}

/* 成绩卡片 */
.result-card {
	background: #fff;
	border-radius: 32rpx;
	padding: 50rpx 40rpx;
	text-align: center;
	box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.1);
	margin-bottom: 30rpx;
}

.result-icon {
	font-size: 80rpx;
	margin-bottom: 16rpx;
}

.result-status {
	font-size: 36rpx;
	font-weight: bold;
	margin-bottom: 24rpx;
}

.status-pass {
	color: #2e7d32;
}

.status-fail {
	color: #c62828;
}

.score-box {
	display: flex;
	align-items: baseline;
	justify-content: center;
	margin-bottom: 16rpx;
}

.score-number {
	font-size: 100rpx;
	font-weight: bold;
	color: #333;
	line-height: 1;
}

.score-unit {
	font-size: 32rpx;
	color: #666;
	margin-left: 8rpx;
}

.score-detail {
	font-size: 26rpx;
	color: #999;
	margin-bottom: 30rpx;
}

.score-bar {
	height: 16rpx;
	background: #f0f0f0;
	border-radius: 8rpx;
	overflow: hidden;
	margin-bottom: 12rpx;
}

.bar-fill {
	height: 100%;
	background: #c62828;
	border-radius: 8rpx;
	transition: width 0.6s ease;
}

.bar-pass {
	background: linear-gradient(90deg, #667eea, #2e7d32);
}

.score-line {
	text-align: left;
	position: relative;
}

.line-label {
	font-size: 22rpx;
	color: #bbb;
}

/* 操作按钮 */
.action-btns {
	display: flex;
	gap: 20rpx;
	margin-bottom: 40rpx;
}

.action-btn {
	flex: 1;
	height: 84rpx;
	border-radius: 42rpx;
	font-size: 28rpx;
	font-weight: bold;
	border: none;
}

.retry-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
}

.home-btn {
	background: #fff;
	color: #667eea;
	border: 2rpx solid #667eea;
}

/* 错题解析 */
.wrong-section {
	margin-bottom: 40rpx;
}

.section-title {
	display: flex;
	align-items: center;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 24rpx;
	padding-left: 12rpx;
	border-left: 6rpx solid #c62828;
}

.title-icon {
	margin-right: 12rpx;
	font-size: 32rpx;
}

.wrong-card {
	background: #fff;
	border-radius: 24rpx;
	padding: 30rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.wrong-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.wrong-index {
	font-size: 26rpx;
	color: #999;
}

.type-tag {
	padding: 4rpx 16rpx;
	border-radius: 12rpx;
	font-size: 20rpx;
	
	&.type-single {
		background: #e3f2fd;
		color: #1976D2;
	}
	&.type-multiple {
		background: #fff3e0;
		color: #e65100;
	}
	&.type-judge {
		background: #e8f5e9;
		color: #2e7d32;
	}
}

.wrong-question-text {
	font-size: 30rpx;
	color: #333;
	line-height: 1.6;
	margin-bottom: 24rpx;
}

.wrong-options {
	margin-bottom: 20rpx;
}

.wrong-option {
	display: flex;
	align-items: center;
	padding: 16rpx 20rpx;
	border-radius: 12rpx;
	margin-bottom: 8rpx;
	background: #f8f9fa;
	position: relative;
}

.opt-correct {
	background: #e8f5e9;
}

.opt-wrong {
	background: #ffebee;
}

.opt-key {
	font-size: 26rpx;
	font-weight: bold;
	color: #666;
	margin-right: 12rpx;
}

.opt-value {
	flex: 1;
	font-size: 26rpx;
	color: #333;
}

.opt-mark {
	font-size: 22rpx;
	color: #2e7d32;
	margin-left: 12rpx;
	flex-shrink: 0;
}

.wrong-mark {
	color: #c62828;
}

.wrong-user-answer {
	font-size: 24rpx;
	color: #999;
	margin-bottom: 16rpx;
	
	.user-ans {
		color: #c62828;
	}
}

.wrong-analysis-box {
	background: #f8f9fa;
	border-radius: 16rpx;
	padding: 20rpx;
}

.analysis-title {
	font-size: 24rpx;
	color: #667eea;
	display: block;
	margin-bottom: 8rpx;
}

.analysis-content {
	font-size: 26rpx;
	color: #555;
	line-height: 1.6;
}

/* 全对 */
.all-correct {
	text-align: center;
	padding: 80rpx 0;
}

.correct-icon {
	font-size: 100rpx;
	margin-bottom: 20rpx;
}

.correct-text {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
}

/* 加载 */
.loading-mask {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 30rpx 50rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
	z-index: 999;
}
</style>
