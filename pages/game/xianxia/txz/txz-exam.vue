<template>
	<view class="page-container">
		<!-- 载入 / 过期 -->
		<view class="center-box" v-if="phase === 'loading'">
			<view class="center-text">加载题目中...</view>
		</view>
		<view class="center-box" v-else-if="phase === 'expired'">
			<view class="center-icon">⌛</view>
			<view class="center-title">考试码已过期</view>
			<view class="center-text">{{ examCode }} 已失效，请让发起人续期或重新获取考试码</view>
			<button class="back-btn" @click="goHome">返回首页</button>
		</view>

		<!-- 答题 -->
		<view class="exam-page" v-else-if="phase === 'exam'">
			<view class="exam-header">
				<view class="progress-info">
					<view class="progress-top">
						<text class="progress-text">第 {{ currentIndex + 1 }}/{{ questions.length }} 题</text>
						<text class="nick-text">{{ nick }}</text>
					</view>
					<view class="progress-bar"><view class="progress-fill" :style="{width: ((currentIndex + 1) / questions.length * 100) + '%'}"></view></view>
				</view>
				<view class="timer-box" :class="{'timer-warn': timer <= 5 && !locked}">
					<text class="timer-text">{{ timer }}s</text>
				</view>
			</view>

			<view class="question-area">
				<view class="question-meta">
					<view class="type-tag" :class="'type-' + currentQuestion.type">{{ typeLabel(currentQuestion.type) }}</view>
					<view class="category-tag" v-if="currentQuestion.category">{{ currentQuestion.category }}</view>
					<view class="point-tag">{{ currentQuestion.points }} 分</view>
				</view>
				<view class="question-text">{{ currentQuestion.question }}</view>

				<view class="options-list" v-if="currentQuestion.type !== 'fill'">
					<view
						class="option-item"
						v-for="opt in currentQuestion.options"
						:key="opt.key"
						:class="{ 'option-selected': isOptionSelected(opt.key), 'option-disabled': locked }"
						@click="selectOption(opt.key)"
					>
						<view class="option-key">{{ opt.key }}</view>
						<view class="option-value">{{ opt.value }}</view>
						<view class="option-check" v-if="isOptionSelected(opt.key)">✓</view>
					</view>
				</view>

				<view class="fill-input-box" v-else>
					<input class="fill-input" v-model="fillText" placeholder="请输入答案" :disabled="locked" @confirm="confirmAnswer" />
				</view>
			</view>

			<view class="exam-footer">
				<button
					class="confirm-btn"
					:class="{ 'confirm-disabled': !canConfirm }"
					:disabled="locked || !canConfirm"
					@click="confirmAnswer"
				>确认答案</button>
			</view>
		</view>

		<!-- 答题即时反馈：撒糖 / 补糖 -->
		<view class="feedback-mask" v-if="phase === 'feedback'">
			<view class="candy-rain" v-if="feedback.isCorrect">
				<text class="candy" v-for="n in 12" :key="'c'+n" :style="candyStyle(n)">🍬</text>
			</view>
			<view class="candy-rain" v-else>
				<text class="candy" v-for="n in 8" :key="'s'+n" :style="candyStyle(n)">🍯</text>
			</view>

			<view class="feedback-card" :class="feedback.isCorrect ? 'fb-right' : 'fb-wrong'">
				<view class="fb-emoji">{{ feedback.isCorrect ? '🎉' : '🥺' }}</view>
				<view class="fb-title">{{ feedback.isCorrect ? '答对啦 · 撒糖' : '答错了 · 补糖' }}</view>
				<view class="fb-earned" v-if="feedback.isCorrect">+{{ feedback.earned }} 分</view>
				<view class="fb-answer" v-if="!feedback.isCorrect">
					<text class="fb-label">正确答案：</text>
					<text class="fb-correct">{{ formatAnswer(feedback.correctAnswer) }}</text>
				</view>
				<view class="fb-analysis" v-if="feedback.analysis">
					<text class="fb-label">糖点解析：</text>
					<text class="fb-analysis-text">{{ feedback.analysis }}</text>
				</view>
				<button class="fb-next" @click="nextQuestion">{{ isLast ? '完成考试' : '下一题 →' }}</button>
			</view>
		</view>

		<view class="loading-mask" v-if="isSubmitting"><text>交卷中...</text></view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			examCode: '',
			nick: '',
			phase: 'loading', // loading | exam | feedback | expired
			questions: [],
			currentIndex: 0,
			selectedOptions: [],
			fillText: '',
			locked: false,
			timer: 20,
			timerInterval: null,
			answers: [],           // 与题目对齐的答案数组
			feedback: {},          // 当前题判分结果
			totalScore: 0,
			isSubmitting: false
		}
	},
	computed: {
		currentQuestion() {
			return this.questions[this.currentIndex] || {}
		},
		isLast() {
			return this.currentIndex >= this.questions.length - 1
		},
		canConfirm() {
			if (this.currentQuestion.type === 'fill') return !!this.fillText.trim()
			return this.selectedOptions.length > 0
		}
	},
	onLoad(options) {
		const raw = uni.getStorageSync('userInfo')
		if (raw) { try { this.userInfo = JSON.parse(raw) } catch (e) { this.userInfo = {} } }
		this.examCode = (options.examCode || '').toUpperCase()
		this.nick = options.nick ? decodeURIComponent(options.nick) : (this.userInfo.nickName || '匿名')
		if (!this.examCode) {
			uni.showToast({ title: '缺少考试码', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 600)
			return
		}
		this.loadExam()
	},
	onUnload() { this.clearTimer() },
	onShareAppMessage() {
		return { title: '青宇宇宙通行证 · 嗑学水平测试', path: '/pages/game/xianxia/txz/txz-index?shareCode=' + this.examCode }
	},
	methods: {
		typeLabel(type) {
			return { single: '单选', multiple: '多选', judge: '判断', fill: '填空' }[type] || type
		},
		goHome() { uni.navigateBack() },

		loadExam() {
			uniCloud.callFunction({
				name: 'txz-exam',
				data: { action: 'getExamInfo', examCode: this.examCode },
				success: (res) => {
					if (res.result.code === 0) {
						const d = res.result.data
						this.questions = d.questions
						this.totalScore = d.totalScore
						this.answers = new Array(d.questions.length).fill(null)
						this.currentIndex = 0
						this.selectedOptions = []
						this.fillText = ''
						this.locked = false
						this.phase = 'exam'
						this.startTimer()
					} else if (res.result.code === 2) {
						this.phase = 'expired'
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
						setTimeout(() => uni.navigateBack(), 800)
					}
				},
				fail: (err) => {
					console.error('加载考试失败:', err)
					uni.showToast({ title: '网络错误', icon: 'none' })
					setTimeout(() => uni.navigateBack(), 800)
				}
			})
		},

		// 计时
		startTimer() {
			this.clearTimer()
			this.timer = 20
			this.timerInterval = setInterval(() => {
				this.timer--
				if (this.timer <= 0) { this.clearTimer(); this.confirmAnswer(true) }
			}, 1000)
		},
		clearTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null } },

		selectOption(key) {
			if (this.locked) return
			const type = this.currentQuestion.type
			if (type === 'multiple') {
				const idx = this.selectedOptions.indexOf(key)
				if (idx > -1) this.selectedOptions.splice(idx, 1)
				else { this.selectedOptions.push(key); this.selectedOptions.sort() }
			} else {
				// 单选/判断：仅选中，等待确认
				this.selectedOptions = [key]
			}
		},
		isOptionSelected(key) { return this.selectedOptions.includes(key) },

		currentUserAnswer() {
			if (this.currentQuestion.type === 'fill') return this.fillText.trim() ? [this.fillText.trim()] : []
			return [...this.selectedOptions]
		},

		// 确认答案 -> 即时判分
		confirmAnswer(fromTimeout) {
			if (this.locked) return
			if (!fromTimeout && !this.canConfirm) return
			this.locked = true
			this.clearTimer()

			const ans = this.currentUserAnswer()
			this.answers[this.currentIndex] = ans

			uniCloud.callFunction({
				name: 'txz-exam',
				data: {
					action: 'judgeOne',
					examCode: this.examCode,
					index: this.currentQuestion.index,
					userAnswer: ans
				},
				success: (res) => {
					if (res.result.code === 0) {
						this.feedback = res.result.data
						this.phase = 'feedback'
					} else {
						// 判分失败：视为未作答，空答案继续
						this.feedback = { isCorrect: false, correctAnswer: [], analysis: res.result.msg || '判分失败', earned: 0 }
						this.phase = 'feedback'
					}
				},
				fail: () => {
					this.feedback = { isCorrect: false, correctAnswer: [], analysis: '网络异常，本题按未作答处理', earned: 0 }
					this.phase = 'feedback'
				}
			})
		},

		nextQuestion() {
			if (this.isLast) { this.submitAll(); return }
			this.currentIndex++
			this.selectedOptions = []
			this.fillText = ''
			this.locked = false
			this.phase = 'exam'
			this.startTimer()
		},

		// 交卷：云端按固化答案统一判分、给称号奖品与排名
		submitAll() {
			this.isSubmitting = true
			// 补齐未作答（理论不会发生，兜底空数组）
			const answers = this.answers.map(a => a || [])
			uniCloud.callFunction({
				name: 'txz-exam',
				data: {
					action: 'submitExam',
					userId: this.userInfo._id || '',
					examCode: this.examCode,
					nick: this.nick,
					answers
				},
				success: (res) => {
					this.isSubmitting = false
					if (res.result.code === 0) {
						const d = res.result.data
						uni.redirectTo({
							url: '/pages/game/xianxia/txz/txz-result?recordId=' + d.recordId +
								'&examCode=' + this.examCode +
								'&nick=' + encodeURIComponent(this.nick) +
								'&score=' + d.score + '&totalScore=' + d.totalScore +
								'&passScore=' + d.passScore + '&passed=' + d.passed +
								'&title=' + encodeURIComponent(d.title || '') +
								'&prize=' + encodeURIComponent(d.prize || '') +
								'&rank=' + d.rank + '&correctCount=' + d.correctCount +
								'&questionCount=' + d.questionCount
						})
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: (err) => {
					this.isSubmitting = false
					console.error('交卷失败:', err)
					uni.showToast({ title: '交卷失败', icon: 'none' })
				}
			})
		},

		formatAnswer(arr) {
			if (!arr || arr.length === 0) return '—'
			const opts = this.currentQuestion.options || []
			return arr.map(v => {
				const o = opts.find(op => op.key === v)
				return o ? v + ' ' + o.value : v
			}).join('，')
		},

		// 撒糖/补糖动画的位置样式
		candyStyle(n) {
			const left = (n * 8 + Math.floor(Math.random() * 6)) % 100
			const delay = (Math.random() * 0.8).toFixed(2)
			const dur = (1.4 + Math.random()).toFixed(2)
			return `left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;`
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

.center-box { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center; padding: 0 40rpx; }
.center-icon { font-size: 90rpx; }
.center-title { font-size: 40rpx; font-weight: bold; color: #4b3a8f; margin: 20rpx 0; }
.center-text { font-size: 28rpx; color: #888; line-height: 1.6; }
.back-btn { margin-top: 40rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border-radius: 44rpx; padding: 0 60rpx; height: 84rpx; line-height: 84rpx; border: none; }

.exam-page { display: flex; flex-direction: column; min-height: 88vh; }
.exam-header { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 20rpx; padding: 24rpx 30rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.06); }
.progress-info { flex: 1; margin-right: 20rpx; }
.progress-top { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.progress-text { font-size: 26rpx; color: #666; }
.nick-text { font-size: 24rpx; color: #a29bfe; max-width: 220rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.progress-bar { height: 12rpx; background: #f0f0f0; border-radius: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg,#667eea,#764ba2); border-radius: 6rpx; transition: width .3s; }
.timer-box { width: 90rpx; height: 90rpx; border-radius: 50%; background: linear-gradient(135deg,#e8f8f5,#d4efdf); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.timer-warn { background: linear-gradient(135deg,#ffe0e6,#ffcdd2); }
.timer-text { font-size: 32rpx; font-weight: bold; color: #333; }
.timer-warn .timer-text { color: #c62828; }

.question-area { background: #fff; border-radius: 24rpx; padding: 36rpx; flex: 1; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.06); }
.question-meta { display: flex; gap: 16rpx; margin-bottom: 24rpx; align-items: center; }
.type-tag { padding: 6rpx 20rpx; border-radius: 16rpx; font-size: 22rpx;
	&.type-single { background:#e3f2fd; color:#1976D2; }
	&.type-multiple { background:#fff3e0; color:#e65100; }
	&.type-judge { background:#e8f5e9; color:#2e7d32; }
	&.type-fill { background:#fce4ec; color:#ad1457; }
}
.category-tag { padding: 6rpx 20rpx; border-radius: 16rpx; font-size: 22rpx; background:#f3e5f5; color:#7b1fa2; }
.point-tag { padding: 6rpx 20rpx; border-radius: 16rpx; font-size: 22rpx; background:#fff8e1; color:#f9a825; }
.question-text { font-size: 32rpx; color: #333; line-height: 1.6; margin-bottom: 36rpx; font-weight: 500; }

.options-list { display: flex; flex-direction: column; gap: 20rpx; }
.option-item { display: flex; align-items: center; padding: 28rpx 24rpx; border: 2rpx solid #e8e8e8; border-radius: 20rpx; transition: all .2s; &:active { transform: scale(.98); } }
.option-selected { border-color: #667eea; background: rgba(102,126,234,.08); }
.option-disabled { opacity: .6; }
.option-key { width: 56rpx; height: 56rpx; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: bold; color: #666; margin-right: 20rpx; flex-shrink: 0; }
.option-selected .option-key { background: #667eea; color: #fff; }
.option-value { flex: 1; font-size: 28rpx; color: #333; line-height: 1.4; }
.option-check { font-size: 32rpx; color: #667eea; font-weight: bold; margin-left: 12rpx; }

.fill-input-box { margin-top: 10rpx; }
.fill-input { height: 88rpx; background: #f8f9fa; border: 2rpx solid #e0e0e0; border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; color: #333; }

.exam-footer { margin-top: 24rpx; }
.confirm-btn { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none; }
.confirm-disabled { opacity: .5; }

/* 反馈遮罩 */
.feedback-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(40,30,70,.55); display: flex; align-items: center; justify-content: center; z-index: 900; overflow: hidden; }
.feedback-card { position: relative; width: 620rpx; background: #fff; border-radius: 28rpx; padding: 44rpx 36rpx; text-align: center; box-shadow: 0 12rpx 48rpx rgba(0,0,0,.3); z-index: 2; }
.fb-right { border-top: 10rpx solid #66bb6a; }
.fb-wrong { border-top: 10rpx solid #ef5350; }
.fb-emoji { font-size: 76rpx; }
.fb-title { font-size: 36rpx; font-weight: bold; margin: 16rpx 0; color: #333; }
.fb-earned { font-size: 30rpx; color: #2e7d32; font-weight: bold; }
.fb-answer { margin: 16rpx 0; }
.fb-label { font-size: 26rpx; color: #999; display: block; margin-bottom: 8rpx; }
.fb-correct { font-size: 30rpx; color: #c62828; font-weight: bold; }
.fb-analysis { background: #f8f6ff; border-radius: 16rpx; padding: 20rpx; margin: 20rpx 0; text-align: left; }
.fb-analysis-text { font-size: 26rpx; color: #555; line-height: 1.6; }
.fb-next { margin-top: 20rpx; background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; border: none; }

/* 糖果雨 */
.candy-rain { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; }
.candy { position: absolute; top: -60rpx; font-size: 44rpx; animation-name: fall; animation-timing-function: linear; animation-iteration-count: 1; }
@keyframes fall {
	0% { transform: translateY(-60rpx) rotate(0deg); opacity: 1; }
	100% { transform: translateY(110vh) rotate(360deg); opacity: .2; }
}

.loading-mask { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,.7); color: #fff; padding: 30rpx 50rpx; border-radius: 16rpx; font-size: 28rpx; z-index: 999; }
</style>
