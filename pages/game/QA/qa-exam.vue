<template>
	<view class="page-container">
		<!-- 考试说明页 -->
		<view class="intro-page" v-if="phase === 'intro'">
			<view class="intro-card">
				<view class="intro-icon">📝</view>
				<view class="intro-title">青宇问答</view>
				<view class="intro-subtitle">测试你对宇青的了解程度</view>
				
				<view class="rules-box">
					<view class="rule-item">
						<text class="rule-dot">📌</text>
						<text class="rule-text">共 25 题，每题 4 分，满分 100 分</text>
					</view>
					<view class="rule-item">
						<text class="rule-dot">⏱️</text>
						<text class="rule-text">每题限时 20 秒，超时自动跳过</text>
					</view>
					<view class="rule-item">
						<text class="rule-dot">✅</text>
						<text class="rule-text">60 分及格，多选需完全匹配</text>
					</view>
					<view class="rule-item">
						<text class="rule-dot">🚫</text>
						<text class="rule-text">每题只能答一次，不可回退修改</text>
					</view>
				</view>
				
				<button class="start-btn" @click="startExam" :disabled="isLoading">
					{{isLoading ? '加载中...' : '开始答题'}}
				</button>
				
				<!-- 历史记录入口 -->
				<view class="history-entry" @click="goHistory">
					<text>查看历史记录 & 错题本 ›</text>
				</view>
				
				<!-- 管理员入口 -->
				<view class="admin-entry" v-if="isAdmin" @click="goAdmin">
					<text>📋 题库管理 ›</text>
				</view>
			</view>
		</view>
		
		<!-- 答题页 -->
		<view class="exam-page" v-if="phase === 'exam'">
			<!-- 顶部信息栏 -->
			<view class="exam-header">
				<view class="progress-info">
					<text class="progress-text">第 {{currentIndex + 1}}/{{questions.length}} 题</text>
					<view class="progress-bar">
						<view class="progress-fill" :style="{width: ((currentIndex + 1) / questions.length * 100) + '%'}"></view>
					</view>
				</view>
				<view class="timer-box" :class="{'timer-warn': timer <= 5}">
					<text class="timer-text">{{timer}}s</text>
				</view>
			</view>
			
			<!-- 题目区域 -->
			<view class="question-area">
				<view class="question-meta">
					<view class="type-tag" :class="'type-' + currentQuestion.type">
						{{typeLabel(currentQuestion.type)}}
					</view>
					<view class="category-tag">{{currentQuestion.category}}</view>
				</view>
				
				<view class="question-text">{{currentQuestion.question}}</view>
				
				<!-- 选项列表 -->
				<view class="options-list" v-if="currentQuestion.type !== 'fill'">
					<view 
						class="option-item"
						v-for="opt in currentQuestion.options"
						:key="opt.key"
						:class="{
							'option-selected': isOptionSelected(opt.key),
							'option-disabled': isLocked
						}"
						@click="selectOption(opt.key)"
					>
						<view class="option-key">{{opt.key}}</view>
						<view class="option-value">{{opt.value}}</view>
						<view class="option-check" v-if="isOptionSelected(opt.key)">✓</view>
					</view>
				</view>
				
				<!-- 填空题输入 -->
				<view class="fill-input-box" v-if="currentQuestion.type === 'fill'">
					<input 
						class="fill-input" 
						v-model="fillText" 
						placeholder="请输入答案" 
						:disabled="isLocked"
						@confirm="confirmFill"
					/>
				</view>
			</view>
			
			<!-- 底部操作 -->
			<view class="exam-footer">
				<button 
					v-if="currentQuestion.type === 'multiple' || currentQuestion.type === 'fill'"
					class="confirm-btn" 
					:class="{'confirm-disabled': currentQuestion.type === 'multiple' ? selectedOptions.length === 0 : !fillText.trim()}"
					@click="currentQuestion.type === 'fill' ? confirmFill() : confirmAnswer()"
					:disabled="isLocked"
				>
					确认答案
				</button>
				<view class="footer-tip" v-else>
					<text>选择后自动进入下一题</text>
				</view>
			</view>
		</view>
		
		<!-- 历史记录页 -->
		<view class="history-page" v-if="phase === 'history'">
			<view class="history-tabs">
				<view class="tab-item" :class="{'tab-active': historyTab === 'records'}" @click="historyTab = 'records'">
					考试记录
				</view>
				<view class="tab-item" :class="{'tab-active': historyTab === 'wrong'}" @click="historyTab = 'wrong'">
					错题本
				</view>
			</view>
			
			<!-- 考试记录列表 -->
			<view class="records-list" v-if="historyTab === 'records'">
				<view class="record-item" v-for="item in historyList" :key="item._id" @click="viewRecord(item)" @longpress="deleteRecord(item)">
					<view class="record-score" :class="{'score-pass': item.passed, 'score-fail': !item.passed}">
						{{item.score}}分
					</view>
					<view class="record-info">
						<view class="record-status">{{item.passed ? '及格' : '未及格'}}</view>
						<view class="record-detail">答对 {{item.correct_count}}/25 题</view>
					</view>
					<view class="record-time">{{formatTime(item.create_date)}}</view>
				</view>
				<view class="empty-tip" v-if="historyList.length === 0 && !historyLoading">
					暂无考试记录
				</view>
			</view>
			
			<!-- 错题本 -->
			<view class="wrong-list" v-if="historyTab === 'wrong'">
				<view class="wrong-item" v-for="(item, idx) in wrongList" :key="item.questionId || idx">
					<view class="wrong-header">
						<view class="type-tag" :class="'type-' + item.type">{{typeLabel(item.type)}}</view>
						<text class="wrong-count">错 {{item.wrongCount}} 次</text>
					</view>
					<view class="wrong-question">{{item.question}}</view>
					<view class="wrong-answers">
						<view class="answer-row">
							<text class="answer-label">你的答案：</text>
							<text class="answer-wrong">{{formatAnswer(item.userAnswer)}}</text>
						</view>
						<view class="answer-row">
							<text class="answer-label">正确答案：</text>
							<text class="answer-correct">{{formatAnswer(item.correctAnswer)}}</text>
						</view>
					</view>
					<view class="wrong-analysis" v-if="item.analysis">
						<text class="analysis-label">解析：</text>
						<text class="analysis-text">{{item.analysis}}</text>
					</view>
					<view class="wrong-footer">
						<view class="learned-btn" @click="markLearned(item, idx)">✓ 已学会</view>
					</view>
				</view>
				<view class="empty-tip" v-if="wrongList.length === 0 && !wrongLoading">
					暂无错题，继续保持！
				</view>
			</view>
			
			<view class="back-btn-box">
				<button class="back-btn" @click="backFromHistory">返回</button>
			</view>
		</view>
		
		<!-- 加载遮罩 -->
		<view class="loading-mask" v-if="isLoading">
			<text>加载中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			phase: 'intro', // intro | exam | history
			isLoading: false,
			// 考试数据
			recordId: '',
			questions: [],
			currentIndex: 0,
			selectedOptions: [],
			fillText: '',
			isLocked: false,
			timer: 20,
			timerInterval: null,
			userAnswers: [], // 收集所有答案
			// 历史
			historyTab: 'records',
			historyList: [],
			historyLoading: false,
			wrongList: [],
			wrongLoading: false
		}
	},
	computed: {
		isAdmin() {
			const role = this.userInfo.role || ''
			return role === 's_admin' || role === 'admin'
		},
		currentQuestion() {
			if (this.currentIndex < this.questions.length) {
				return this.questions[this.currentIndex]
			}
			return {}
		}
	},
	onLoad(options) {
		const userInfo = uni.getStorageSync('userInfo')
		if (userInfo) {
			this.userInfo = JSON.parse(userInfo)
		}
		// 未登录跳转到“我的”页面
		if (!this.userInfo._id) {
			uni.showToast({ title: '请先登录', icon: 'none' })
			setTimeout(() => {
				uni.switchTab({ url: '/pages/profile/profile' })
			}, 500)
			return
		}
		// 通过 URL 参数 view=history 直接以历史记录/错题本视图打开新页面实例，
		// 这样小程序系统返回按钮会自然回到上一个 qa-exam（intro）实例。
		if (options && options.view === 'history') {
			this.phase = 'history'
			this.loadHistory()
			this.loadWrongQuestions()
		}
	},
	onUnload() {
		this.clearTimer()
	},
	onShareAppMessage: function () {
		return {
			title: '宇青青宇全肯定',
			path: '/pages/game/QA/qa-exam'
		}
	},
	onShareTimeline: function () {
		return {
			title: '宇青青宇全肯定'
		}
	},
	methods: {
		// 题型标签
		typeLabel(type) {
			const map = { single: '单选', multiple: '多选', judge: '判断', fill: '填空' }
			return map[type] || type
		},
		
		// 开始考试
		startExam() {
			if (!this.userInfo._id) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			this.isLoading = true
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'startExam',
					userId: this.userInfo._id
				},
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						this.recordId = res.result.data.recordId
						this.questions = res.result.data.questions
						this.currentIndex = 0
						this.userAnswers = new Array(this.questions.length).fill(null)
						this.selectedOptions = []
						this.isLocked = false
						this.phase = 'exam'
						this.startTimer()
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: (err) => {
					this.isLoading = false
					console.error('开始考试失败:', err)
					uni.showToast({ title: '网络错误', icon: 'none' })
				}
			})
		},
		
		// 计时器
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
		
		// 超时处理
		handleTimeout() {
			this.isLocked = true
			// 记录当前答案（空 = 未作答）
			if (this.currentQuestion.type === 'fill') {
				this.userAnswers[this.currentIndex] = this.fillText.trim() ? [this.fillText.trim()] : []
			} else {
				this.userAnswers[this.currentIndex] = [...this.selectedOptions]
			}
			
			setTimeout(() => {
				this.goNextQuestion()
			}, 500)
		},
		
		// 选择选项
		selectOption(key) {
			if (this.isLocked) return
			
			const type = this.currentQuestion.type
			
			if (type === 'single' || type === 'judge') {
				// 单选/判断：直接选中并自动跳转
				this.selectedOptions = [key]
				this.isLocked = true
				this.clearTimer()
				this.userAnswers[this.currentIndex] = [key]
				
				setTimeout(() => {
					this.goNextQuestion()
				}, 400)
			} else if (type === 'multiple') {
				// 多选：切换选中状态
				const idx = this.selectedOptions.indexOf(key)
				if (idx > -1) {
					this.selectedOptions.splice(idx, 1)
				} else {
					this.selectedOptions.push(key)
					this.selectedOptions.sort()
				}
			}
		},
		
		// 判断是否选中
		isOptionSelected(key) {
			return this.selectedOptions.includes(key)
		},
		
		// 多选题确认
		confirmAnswer() {
			if (this.isLocked || this.selectedOptions.length === 0) return
			this.isLocked = true
			this.clearTimer()
			this.userAnswers[this.currentIndex] = [...this.selectedOptions]
			
			setTimeout(() => {
				this.goNextQuestion()
			}, 300)
		},
		
		// 填空题确认
		confirmFill() {
			if (this.isLocked || !this.fillText.trim()) return
			this.isLocked = true
			this.clearTimer()
			this.userAnswers[this.currentIndex] = [this.fillText.trim()]
			
			setTimeout(() => {
				this.goNextQuestion()
			}, 300)
		},
		
		// 进入下一题
		goNextQuestion() {
			this.currentIndex++
			this.selectedOptions = []
			this.fillText = ''
			this.isLocked = false
			
			if (this.currentIndex >= this.questions.length) {
				// 全部答完，提交
				this.submitExam()
			} else {
				this.startTimer()
			}
		},
		
		// 提交考试
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
		},
		
		// 查看历史
		goHistory() {
			if (!this.userInfo._id) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			// 新开一个页面实例展示历史/错题本，便于小程序系统返回能回到本页 intro 阶段
			uni.navigateTo({
				url: '/pages/game/QA/qa-exam?view=history'
			})
		},
		
		// 历史页面实例的“返回”按钮：直接回退页面栈
		backFromHistory() {
			const pages = getCurrentPages()
			if (pages && pages.length > 1) {
				uni.navigateBack()
			} else {
				this.phase = 'intro'
			}
		},
		
		// 加载历史记录
		loadHistory() {
			this.historyLoading = true
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'getHistory',
					userId: this.userInfo._id,
					page: 1,
					pageSize: 20
				},
				success: (res) => {
					this.historyLoading = false
					if (res.result.code === 0) {
						this.historyList = res.result.data.list || []
					}
				},
				fail: () => {
					this.historyLoading = false
				}
			})
		},
		
		// 加载错题本
		loadWrongQuestions() {
			this.wrongLoading = true
			uniCloud.callFunction({
				name: 'qa-exam',
				data: {
					action: 'getWrongQuestions',
					userId: this.userInfo._id
				},
				success: (res) => {
					this.wrongLoading = false
					if (res.result.code === 0) {
						this.wrongList = res.result.data || []
					}
				},
				fail: () => {
					this.wrongLoading = false
				}
			})
		},
		
		// 查看某次考试详情
		viewRecord(item) {
			uni.redirectTo({
				url: '/pages/game/QA/qa-result?recordId=' + item._id +
					'&score=' + item.score +
					'&correctCount=' + item.correct_count +
					'&total=25' +
					'&passed=' + item.passed
			})
		},
		
		// 格式化答案显示
		formatAnswer(answerArr) {
			if (!answerArr || answerArr.length === 0) return '未作答'
			return answerArr.join(', ')
		},
		
		// 进入题库管理
		goAdmin() {
			uni.navigateTo({
				url: '/pages/game/QA/qa-admin'
			})
		},
		
		// 格式化时间
		formatTime(timestamp) {
			if (!timestamp) return ''
			const d = new Date(timestamp)
			if (isNaN(d.getTime())) return ''
			const y = d.getFullYear()
			const m = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			const h = String(d.getHours()).padStart(2, '0')
			const min = String(d.getMinutes()).padStart(2, '0')
			return `${y}-${m}-${day} ${h}:${min}`
		},
		// 标记错题为已学会
		markLearned(item, idx) {
			if (!this.userInfo._id) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			if (!item.questionId) {
				uni.showToast({ title: '题目信息缺失', icon: 'none' })
				return
			}
			uni.showModal({
				title: '提示',
				content: '确定已掌握这道题？标记后将从错题本移除；若下次再答错，会重新回到错题本。',
				confirmText: '已学会',
				confirmColor: '#2e7d32',
				success: (res) => {
					if (!res.confirm) return
					uniCloud.callFunction({
						name: 'qa-exam',
						data: {
							action: 'markLearned',
							userId: this.userInfo._id,
							questionId: item.questionId
						},
						success: (r) => {
							if (r.result.code === 0) {
								// 直接从当前列表中移除，避免重新拉取
								this.wrongList.splice(idx, 1)
								uni.showToast({ title: '已标记为学会', icon: 'success' })
							} else {
								uni.showToast({ title: r.result.msg || '操作失败', icon: 'none' })
							}
						},
						fail: (err) => {
							console.error('标记已学会失败:', err)
							uni.showToast({ title: '网络错误', icon: 'none' })
						}
					})
				}
			})
		},
		 // 删除考试记录（软删除）
        deleteRecord(item) {
            if (!this.userInfo._id) {
                uni.showToast({ title: '请先登录', icon: 'none' })
                return
            }
            uni.showModal({
                title: '提示',
                content: '确定删除该考试记录吗？',
                confirmColor: '#c62828',
                success: (res) => {
                    if (!res.confirm) return
                    this.isLoading = true
                    uniCloud.callFunction({
                        name: 'qa-exam',
                        data: {
                            action: 'deleteRecord',
                            userId: this.userInfo._id,
                            recordId: item._id
                        },
                        success: (r) => {
                            this.isLoading = false
                            if (r.result.code === 0) {
                                uni.showToast({ title: '已删除', icon: 'none' })
                                this.historyList = this.historyList.filter(x => x._id !== item._id)
                            } else {
                                uni.showToast({ title: r.result.msg || '删除失败', icon: 'none' })
                            }
                        },
                        fail: (err) => {
                            this.isLoading = false
                            console.error('删除记录失败:', err)
                            uni.showToast({ title: '删除失败', icon: 'none' })
                        }
                    })
                }
            })
        },
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx;
}

/* 考试说明页 */
.intro-page {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 80vh;
}

.intro-card {
	background: #fff;
	border-radius: 32rpx;
	padding: 60rpx 40rpx;
	width: 100%;
	max-width: 650rpx;
	text-align: center;
	box-shadow: 0 8rpx 40rpx rgba(0, 0, 0, 0.1);
}

.intro-icon {
	font-size: 80rpx;
	margin-bottom: 20rpx;
}

.intro-title {
	font-size: 44rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 12rpx;
}

.intro-subtitle {
	font-size: 28rpx;
	color: #999;
	margin-bottom: 40rpx;
}

.rules-box {
	background: #f8f9fa;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 40rpx;
	text-align: left;
}

.rule-item {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
	
	&:last-child {
		margin-bottom: 0;
	}
}

.rule-dot {
	font-size: 28rpx;
	margin-right: 16rpx;
}

.rule-text {
	font-size: 26rpx;
	color: #555;
}

.start-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 50rpx;
	height: 90rpx;
	font-size: 32rpx;
	font-weight: bold;
	border: none;
	
	&[disabled] {
		opacity: 0.6;
	}
}

.history-entry {
	margin-top: 30rpx;
	font-size: 26rpx;
	color: #667eea;
}

.admin-entry {
	margin-top: 20rpx;
	font-size: 26rpx;
	color: #e65100;
}

/* 答题页 */
.exam-page {
	display: flex;
	flex-direction: column;
	min-height: 90vh;
}

.exam-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background: #fff;
	border-radius: 20rpx;
	padding: 24rpx 30rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.progress-info {
	flex: 1;
	margin-right: 20rpx;
}

.progress-text {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 12rpx;
	display: block;
}

.progress-bar {
	height: 12rpx;
	background: #f0f0f0;
	border-radius: 6rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #667eea, #764ba2);
	border-radius: 6rpx;
	transition: width 0.3s ease;
}

.timer-box {
	width: 90rpx;
	height: 90rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #e8f8f5, #d4efdf);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: background 0.3s;
}

.timer-warn {
	background: linear-gradient(135deg, #ffe0e6, #ffcdd2);
}

.timer-text {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.timer-warn .timer-text {
	color: #c62828;
}

/* 题目区域 */
.question-area {
	background: #fff;
	border-radius: 24rpx;
	padding: 36rpx;
	flex: 1;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.question-meta {
	display: flex;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.type-tag {
	padding: 6rpx 20rpx;
	border-radius: 16rpx;
	font-size: 22rpx;
	
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
	&.type-fill {
		background: #fce4ec;
		color: #ad1457;
	}
}

.category-tag {
	padding: 6rpx 20rpx;
	border-radius: 16rpx;
	font-size: 22rpx;
	background: #f3e5f5;
	color: #7b1fa2;
}

.question-text {
	font-size: 32rpx;
	color: #333;
	line-height: 1.6;
	margin-bottom: 36rpx;
	font-weight: 500;
}

/* 选项 */
.options-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.option-item {
	display: flex;
	align-items: center;
	padding: 28rpx 24rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 20rpx;
	transition: all 0.2s;
	
	&:active {
		transform: scale(0.98);
	}
}

.option-selected {
	border-color: #667eea;
	background: rgba(102, 126, 234, 0.08);
}

.option-disabled {
	opacity: 0.6;
}

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

.option-selected .option-key {
	background: #667eea;
	color: #fff;
}

.option-value {
	flex: 1;
	font-size: 28rpx;
	color: #333;
	line-height: 1.4;
}

.option-check {
	font-size: 32rpx;
	color: #667eea;
	font-weight: bold;
	margin-left: 12rpx;
}

/* 填空题输入 */
.fill-input-box {
	margin-top: 10rpx;
}

.fill-input {
	height: 88rpx;
	background: #f8f9fa;
	border: 2rpx solid #e0e0e0;
	border-radius: 16rpx;
	padding: 0 24rpx;
	font-size: 30rpx;
	color: #333;
}

.fill-input:focus {
	border-color: #667eea;
	background: #fff;
}

/* 底部操作 */
.exam-footer {
	margin-top: 24rpx;
}

.confirm-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 50rpx;
	height: 88rpx;
	font-size: 30rpx;
	border: none;
}

.confirm-disabled {
	opacity: 0.5;
}

.footer-tip {
	text-align: center;
	font-size: 24rpx;
	color: #999;
	padding: 20rpx 0;
}

/* 历史记录页 */
.history-page {
	padding-bottom: 40rpx;
}

.history-tabs {
	display: flex;
	background: #fff;
	border-radius: 20rpx;
	margin-bottom: 24rpx;
	overflow: hidden;
}

.tab-item {
	flex: 1;
	text-align: center;
	padding: 24rpx 0;
	font-size: 28rpx;
	color: #666;
}

.tab-active {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	font-weight: bold;
}

.record-item {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 16rpx;
}

.record-score {
	font-size: 36rpx;
	font-weight: bold;
	margin-right: 24rpx;
	min-width: 100rpx;
	text-align: center;
}

.score-pass {
	color: #2e7d32;
}

.score-fail {
	color: #c62828;
}

.record-info {
	flex: 1;
}

.record-status {
	font-size: 26rpx;
	color: #333;
	font-weight: 500;
}

.record-detail {
	font-size: 22rpx;
	color: #999;
	margin-top: 6rpx;
}

.record-time {
	font-size: 22rpx;
	color: #bbb;
}

/* 错题本 */
.wrong-item {
	background: #fff;
	border-radius: 20rpx;
	padding: 28rpx;
	margin-bottom: 20rpx;
}

.wrong-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.wrong-count {
	font-size: 22rpx;
	color: #c62828;
}

.wrong-question {
	font-size: 28rpx;
	color: #333;
	line-height: 1.5;
	margin-bottom: 20rpx;
}

.wrong-answers {
	margin-bottom: 16rpx;
}

.answer-row {
	display: flex;
	align-items: center;
	margin-bottom: 8rpx;
}

.answer-label {
	font-size: 24rpx;
	color: #999;
}

.answer-wrong {
	font-size: 24rpx;
	color: #c62828;
}

.answer-correct {
	font-size: 24rpx;
	color: #2e7d32;
}

.wrong-analysis {
	background: #f8f9fa;
	border-radius: 12rpx;
	padding: 16rpx;
}

.analysis-label {
	font-size: 22rpx;
	color: #999;
}

.analysis-text {
	font-size: 24rpx;
	color: #555;
	line-height: 1.5;
}

.empty-tip {
	text-align: center;
	padding: 80rpx 0;
	font-size: 28rpx;
	color: #999;
}

.back-btn-box {
	margin-top: 30rpx;
}

.back-btn {
	background: #fff;
	color: #667eea;
	border: 2rpx solid #667eea;
	border-radius: 50rpx;
	height: 80rpx;
	font-size: 28rpx;
}

/* 加载遮罩 */
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

.record-time {
    font-size: 22rpx;
    color: #bbb;
}

/* 错题本底部操作 */
.wrong-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 20rpx;
    padding-top: 16rpx;
    border-top: 2rpx dashed #f0f0f0;
}

.learned-btn {
    padding: 10rpx 28rpx;
    font-size: 24rpx;
    color: #2e7d32;
    background: #e8f5e9;
    border: 2rpx solid #a5d6a7;
    border-radius: 30rpx;
    
    &:active {
        background: #c8e6c9;
    }
}
</style>
