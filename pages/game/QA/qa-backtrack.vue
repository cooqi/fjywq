<template>
	<view class="page-container">
		<!-- ===== 设置页 ===== -->
		<view class="setup-page" v-if="phase === 'setup'">
			<view class="setup-card">
				<view class="setup-icon">🧠</view>
				<view class="setup-title">回溯答题</view>
				<view class="setup-sub">记住题干 · 延迟 k 题作答</view>

				<view class="setup-rules">
					<view class="sr-item">🔥 前 {{ k }} 步为热身：只看题、不用作答，用来记题干</view>
					<view class="sr-item">✍️ 中间各步：记住当前新题，同时回答前面第 {{ k }} 题</view>
					<view class="sr-item">🧩 作答区按“被考古的那道题”显示，题型/选项可能与当前题不同</view>
					<view class="sr-item">🌙 最后 {{ k }} 步收尾：不再出新题，凭记忆继续作答剩余题目，直到全部答完</view>
					<view class="sr-item">⏱️ 作答每题限时 20 秒，超时自动跳过</view>
				</view>

				<view class="k-setting">
					<text class="k-label">回溯题数 k</text>
					<view class="k-stepper">
						<view class="k-btn" @click="decK">－</view>
						<text class="k-value">{{ k }}</text>
						<view class="k-btn" @click="incK">＋</view>
					</view>
				</view>

				<button class="start-btn" :disabled="isLoading" @click="start">
					{{ isLoading ? '加载中...' : '开始挑战' }}
				</button>
				<view class="back-entry" @click="goBack">‹ 返回</view>
			</view>
		</view>

		<!-- ===== 答题页 ===== -->
		<view class="exam-page" v-if="phase === 'exam'">
			<view class="exam-header">
				<view class="progress-info">
					<text class="progress-text">{{ progressText }}</text>
					<view class="progress-bar">
						<view class="progress-fill" :style="{ width: (stepNum / totalSteps * 100) + '%' }"></view>
					</view>
				</view>
				<view class="timer-box" :class="{'timer-warn': timer <= 5}" v-if="!isWarmup">
					<text class="timer-text">{{ timer }}s</text>
				</view>
			</view>

			<scroll-view scroll-y class="exam-body">
				<!-- 记忆区：非收尾阶段显示当前步的题目，供记忆 -->
				<block v-if="!isTail">
					<view class="zone-label mem-label">{{ isWarmup ? '🔥 热身记忆 · 记住下面这道题' : '👀 记忆当前题 · 第 ' + (currentIndex + 1) + ' 题（稍后会考古它）' }}</view>
					<view class="mem-card" v-if="memoryQuestion && memoryQuestion.question">
					<view class="mem-meta">
						<view class="type-tag" :class="'type-' + memoryQuestion.type">{{ typeLabel(memoryQuestion.type) }}</view>
						<view class="cat-tag">{{ memoryQuestion.category }}</view>
					</view>
					<view class="mem-question">{{ memoryQuestion.question }}</view>
					<view class="mem-options" v-if="memoryQuestion.type !== 'fill'">
						<view class="mem-opt" v-for="opt in memoryQuestion.options" :key="opt.key">
							<text class="mem-opt-key">{{ opt.key }}.</text>
							<text class="mem-opt-val">{{ opt.value }}</text>
						</view>
					</view>
					<view class="mem-fill" v-else>（本题为填空题）</view>
					</view>
				</block>
				<view class="tail-banner" v-else>🌙 收尾阶段：没有新题了，请凭记忆作答剩余题目</view>

				<!-- 作答区：显示目标题(第 targetStep 题)的选项/输入；所有阶段均隐藏题干，考验记忆 -->
				<block v-if="!isWarmup">
					<view class="zone-label ans-label">✍️ {{ isTail ? ('收尾回忆作答：第 ' + targetStep + ' 题（' + (answerQuestion.type === 'fill' ? '填空' : '选择') + '）') : ('回忆并作答：第 ' + targetStep + ' 题（' + (answerQuestion.type === 'fill' ? '填空' : '选择') + '）') }}</view>
					<view class="ans-card">
						<view class="options-list" v-if="answerQuestion.type !== 'fill'">
							<view
								class="option-item"
								v-for="opt in answerQuestion.options"
								:key="opt.key"
								:class="{ 'option-selected': isOptionSelected(opt.key), 'option-disabled': isLocked }"
								@click="selectOption(opt.key)"
							>
								<view class="option-key">{{ opt.key }}</view>
								<view class="option-value">{{ opt.value }}</view>
								<view class="option-check" v-if="isOptionSelected(opt.key)">✓</view>
							</view>
						</view>
						<view class="fill-input-box" v-if="answerQuestion.type === 'fill'">
							<input class="fill-input" v-model="fillText" placeholder="请输入答案" :disabled="isLocked" @confirm="confirmFill" />
						</view>
					</view>
				</block>
			</scroll-view>

			<view class="exam-footer">
				<button v-if="isWarmup" class="confirm-btn" @click="goNextQuestion">下一题</button>
				<button
					v-else-if="answerQuestion.type === 'multiple' || answerQuestion.type === 'fill'"
					class="confirm-btn"
					:class="{'confirm-disabled': answerQuestion.type === 'multiple' ? selectedOptions.length === 0 : !fillText.trim()}"
					@click="answerQuestion.type === 'fill' ? confirmFill() : confirmAnswer()"
					:disabled="isLocked"
				>
					确认答案
				</button>
				<view class="footer-tip" v-else>
					<text>选择后自动进入下一题</text>
				</view>
			</view>
		</view>

		<view class="loading-mask" v-if="isLoading && phase === 'exam'">
			<text>处理中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			phase: 'setup', // setup | exam
			isLoading: false,
			k: 1,
			// 考试数据
			recordId: '',
			questions: [],
			currentIndex: 0,
			userAnswers: [], // 按步索引收集答案
			selectedOptions: [],
			fillText: '',
			isLocked: false,
			timer: 20,
			timerInterval: null
		}
	},
	computed: {
		stepNum() {
			return this.currentIndex + 1
		},
		isWarmup() {
			return this.stepNum <= this.k
		},
		targetStep() {
			// 仅作答步有意义：第 i 步作答第 (i-k) 题
			return this.stepNum - this.k
		},
		// 记忆区：当前步的题目（收尾阶段无新题）
		memoryQuestion() {
			if (this.isTail) return {}
			return this.questions[this.currentIndex] || {}
		},
		// 作答区：目标题（第 i-k 题）
		answerQuestion() {
			if (this.isWarmup) return {}
			return this.questions[this.targetStep - 1] || {}
		},
		totalSteps() {
			// 总步数 = 题数 N + 热身 k（末尾 k 步只作答不再出新题）
			return this.questions.length + this.k
		},
		isTail() {
			return this.stepNum > this.questions.length
		},
		progressText() {
			if (this.isWarmup) return `热身 ${this.stepNum}/${this.k}`
			if (this.isTail) return `收尾 · 第 ${this.targetStep}/${this.questions.length} 题`
			return `第 ${this.targetStep}/${this.questions.length} 题`
		}
	},
	onLoad() {
		const userInfo = uni.getStorageSync('userInfo')
		if (userInfo) {
			this.userInfo = JSON.parse(userInfo)
		}
		if (!this.userInfo._id) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			setTimeout(() => {
				uni.switchTab({ url: '/pages/profile/profile' })
			}, 500)
		}
	},
	onUnload() {
		this.clearTimer()
	},
	methods: {
		typeLabel(type) {
			const map = { single: '单选', multiple: '多选', judge: '判断', fill: '填空' }
			return map[type] || type
		},
		incK() { if (this.k < 8) this.k++ },
		decK() { if (this.k > 1) this.k-- },
		goBack() {
			const pages = getCurrentPages()
			if (pages && pages.length > 1) uni.navigateBack()
			else uni.reLaunch({ url: '/pages/game/game' })
		},

		// 开始：向后端申请一套题（回溯模式）
		start() {
			if (!this.userInfo._id) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			this.isLoading = true
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'startExam',
					userId: this.userInfo._id,
					mode: 'backtrack',
					k: this.k
				},
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						this.recordId = res.result.data.recordId
						this.questions = res.result.data.questions
						this.k = res.result.data.k || this.k
						this.currentIndex = 0
						this.userAnswers = new Array((this.questions.length + (res.result.data.k || this.k))).fill(null)
						this.phase = 'exam'
						this.setupStep()
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: (err) => {
					this.isLoading = false
					console.error('开始回溯考试失败:', err)
					uni.showToast({ title: '网络错误', icon: 'none' })
				}
			})
		},

		// 进入某一步：热身不计时，作答步计时
		setupStep() {
			this.selectedOptions = []
			this.fillText = ''
			this.isLocked = false
			if (this.isWarmup) {
				this.clearTimer()
				this.timer = 20
			} else {
				this.startTimer()
			}
		},

		startTimer() {
			this.clearTimer()
			this.timer = 20
			this.timerInterval = setInterval(() => {
				this.timer--
				if (this.timer <= 0) {
					this.clearTimer()
					this.handleTimeout()
				}
			}, 1000)
		},
		clearTimer() {
			if (this.timerInterval) {
				clearInterval(this.timerInterval)
				this.timerInterval = null
			}
		},
		handleTimeout() {
			// 作答步超时：记录已选（可能为空）并前进
			this.recordCurrentAnswer()
			setTimeout(() => { this.goNextQuestion() }, 400)
		},

		recordCurrentAnswer() {
			if (this.answerQuestion.type === 'fill') {
				this.userAnswers[this.currentIndex] = this.fillText.trim() ? [this.fillText.trim()] : []
			} else {
				this.userAnswers[this.currentIndex] = [...this.selectedOptions]
			}
		},

		selectOption(key) {
			if (this.isLocked) return
			const type = this.answerQuestion.type
			if (type === 'single' || type === 'judge') {
				this.selectedOptions = [key]
				this.isLocked = true
				this.clearTimer()
				this.userAnswers[this.currentIndex] = [key]
				setTimeout(() => { this.goNextQuestion() }, 400)
			} else if (type === 'multiple') {
				const idx = this.selectedOptions.indexOf(key)
				if (idx > -1) this.selectedOptions.splice(idx, 1)
				else {
					this.selectedOptions.push(key)
					this.selectedOptions.sort()
				}
			}
		},
		isOptionSelected(key) {
			return this.selectedOptions.includes(key)
		},
		confirmAnswer() {
			if (this.isLocked || this.selectedOptions.length === 0) return
			this.isLocked = true
			this.clearTimer()
			this.userAnswers[this.currentIndex] = [...this.selectedOptions]
			setTimeout(() => { this.goNextQuestion() }, 300)
		},
		confirmFill() {
			if (this.isLocked || !this.fillText.trim()) return
			this.isLocked = true
			this.clearTimer()
			this.userAnswers[this.currentIndex] = [this.fillText.trim()]
			setTimeout(() => { this.goNextQuestion() }, 300)
		},

		goNextQuestion() {
			this.currentIndex++
			if (this.currentIndex >= this.totalSteps) {
				this.submitExam()
			} else {
				this.setupStep()
			}
		},

		submitExam() {
			this.clearTimer()
			this.isLoading = true
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'submitExam',
					userId: this.userInfo._id,
					recordId: this.recordId,
					answers: this.userAnswers
				},
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						const data = res.result.data
						uni.redirectTo({
							url: '/pages/game/QA/qa-result?recordId=' + this.recordId +
								'&score=' + data.score +
								'&correctCount=' + data.correctCount +
								'&total=' + data.totalQuestions +
								'&passed=' + data.passed
						})
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: (err) => {
					this.isLoading = false
					console.error('提交失败:', err)
					uni.showToast({ title: '提交失败', icon: 'none' })
				}
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
}

/* ===== 设置页 ===== */
.setup-page {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 90vh;
}
.setup-card {
	background: #fff;
	border-radius: 32rpx;
	padding: 60rpx 40rpx;
	width: 100%;
	max-width: 650rpx;
	text-align: center;
	box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.1);
}
.setup-icon { font-size: 80rpx; margin-bottom: 16rpx; }
.setup-title { font-size: 44rpx; font-weight: bold; color: #333; margin-bottom: 10rpx; }
.setup-sub { font-size: 28rpx; color: #999; margin-bottom: 36rpx; }
.setup-rules {
	background: #f8f9fa;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 36rpx;
	text-align: left;
}
.sr-item {
	font-size: 25rpx;
	color: #555;
	line-height: 1.7;
	margin-bottom: 14rpx;
}
.sr-item:last-child { margin-bottom: 0; }

.k-setting {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 28rpx;
	background: #f8f9fa;
	border-radius: 16rpx;
	margin-bottom: 40rpx;
}
.k-label { font-size: 30rpx; color: #333; font-weight: 500; }
.k-stepper { display: flex; align-items: center; gap: 28rpx; }
.k-btn {
	width: 64rpx;
	height: 64rpx;
	line-height: 60rpx;
	text-align: center;
	border-radius: 50%;
	background: #fff;
	border: 2rpx solid #667eea;
	color: #667eea;
	font-size: 36rpx;
}
.k-btn:active { background: rgba(102, 126, 234, 0.12); }
.k-value { font-size: 36rpx; font-weight: bold; color: #333; min-width: 48rpx; text-align: center; }

.start-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 50rpx;
	height: 90rpx;
	line-height: 90rpx;
	font-size: 32rpx;
	font-weight: bold;
	border: none;
	&[disabled] { opacity: 0.6; }
}
.back-entry { margin-top: 28rpx; font-size: 26rpx; color: #999; }

/* ===== 答题页 ===== */
.exam-page {
	display: flex;
	flex-direction: column;
	min-height: 92vh;
}
.exam-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #fff;
	border-radius: 20rpx;
	padding: 24rpx 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.progress-info { flex: 1; margin-right: 20rpx; }
.progress-text { font-size: 26rpx; color: #666; margin-bottom: 12rpx; display: block; }
.progress-bar { height: 12rpx; background: #f0f0f0; border-radius: 6rpx; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 6rpx; transition: width 0.3s ease; }
.timer-box {
	width: 90rpx;
	height: 90rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #e8f8f5, #d4efdf);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}
.timer-warn { background: linear-gradient(135deg, #ffe0e6, #ffcdd2); }
.timer-text { font-size: 32rpx; font-weight: bold; color: #333; }
.timer-warn .timer-text { color: #c62828; }

.exam-body {
	flex: 1;
	padding-bottom: 20rpx;
}

.zone-label {
	font-size: 26rpx;
	font-weight: bold;
	padding: 14rpx 20rpx;
	border-radius: 14rpx;
	margin-bottom: 16rpx;
}
.mem-label { background: #eef2ff; color: #4b5cc4; }
.ans-label { background: #fff3e0; color: #e65100; margin-top: 28rpx; }

/* 记忆区 */
.mem-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.mem-meta { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.mem-question { font-size: 30rpx; color: #333; line-height: 1.6; margin-bottom: 16rpx; font-weight: 500; }
.mem-options { display: flex; flex-direction: column; gap: 10rpx; }
.mem-opt { font-size: 26rpx; color: #777; line-height: 1.5; }
.mem-opt-key { font-weight: bold; margin-right: 8rpx; color: #999; }
.mem-opt-val { color: #888; }
.mem-fill { font-size: 24rpx; color: #bbb; }

/* 收尾阶段横幅 */
.tail-banner {
	background: #ede7f6;
	color: #5e35b1;
	font-size: 26rpx;
	font-weight: bold;
	padding: 20rpx 24rpx;
	border-radius: 16rpx;
	margin-bottom: 16rpx;
}

/* 作答区 */
.ans-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}
.ans-question {
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
	line-height: 1.6;
	margin-bottom: 20rpx;
	padding-bottom: 18rpx;
	border-bottom: 2rpx dashed #eee;
}
.options-list { display: flex; flex-direction: column; gap: 20rpx; }
.option-item {
	display: flex;
	align-items: center;
	padding: 28rpx 24rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 20rpx;
	transition: all 0.2s;
	&:active { transform: scale(0.98); }
}
.option-selected { border-color: #ff8f3f; background: rgba(255, 143, 63, 0.10); }
.option-disabled { opacity: 0.6; }
.option-key {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: bold;
	color: #666;
	margin-right: 20rpx;
	flex-shrink: 0;
}
.option-selected .option-key { background: #ff8f3f; color: #fff; }
.option-value { flex: 1; font-size: 28rpx; color: #333; line-height: 1.4; }
.option-check { font-size: 32rpx; color: #ff8f3f; font-weight: bold; margin-left: 12rpx; }

.fill-input-box { margin-top: 10rpx; }
.fill-input {
	height: 88rpx;
	background: #f8f9fa;
	border: 2rpx solid #e0e0e0;
	border-radius: 16rpx;
	padding: 0 24rpx;
	font-size: 30rpx;
	color: #333;
}
.fill-input:focus { border-color: #ff8f3f; background: #fff; }

/* 通用标签 */
.type-tag {
	padding: 6rpx 20rpx;
	border-radius: 16rpx;
	font-size: 22rpx;
	&.type-single { background: #e3f2fd; color: #1976D2; }
	&.type-multiple { background: #fff3e0; color: #e65100; }
	&.type-judge { background: #e8f5e9; color: #2e7d32; }
	&.type-fill { background: #fce4ec; color: #ad1457; }
}
.cat-tag {
	padding: 6rpx 20rpx;
	border-radius: 16rpx;
	font-size: 22rpx;
	background: #f3e5f5;
	color: #7b1fa2;
}

/* 底部 */
.exam-footer { margin-top: 20rpx; }
.confirm-btn {
	background: linear-gradient(135deg, #ff9a3c 0%, #ff6f00 100%);
	color: #fff;
	border-radius: 50rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	border: none;
}
.confirm-disabled { opacity: 0.5; }
.footer-tip { text-align: center; font-size: 24rpx; color: #999; padding: 20rpx 0; }

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
