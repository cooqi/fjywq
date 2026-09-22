<template>
	<view class="container">
		<!-- 书的封面/内页区域 -->
		<view class="book-area">
			<view class="book" :class="{ 'book-flipping': flipping }">
				<!-- 封面页：提问 -->
				<view class="book-page page-front" v-if="stage === 'ask'">
					<view class="book-title">
						<text class="book-title-icon">📖</text>
						<text class="book-title-text">青宇答案之书</text>
					</view>
					<text class="book-subtitle">心中默念你的问题</text>

					<view class="question-box">
						<textarea class="question-input" v-model="question" maxlength="50" :disabled="drawing"
							placeholder="写下你的问题（可留空）" placeholder-class="question-ph" />
						<view class="question-count">{{ question.length }}/50</view>
					</view>

					<button class="draw-btn" :class="{ 'draw-btn-disabled': drawing }" @click="drawAnswer">
						翻页
					</button>
					<text class="draw-tip">不提问也可以，书页会替你回答「如何面对当下」</text>
				</view>

				<!-- 动画页：翻页中 -->
				<view class="book-page page-flipping" v-if="stage === 'drawing'">
					<view class="flip-pages">
						<view class="flip-page" v-for="i in 4" :key="i" :style="{ animationDelay: (i - 1) * 0.18 + 's' }">
							<text class="flip-page-mark">?</text>
						</view>
					</view>
					<text class="flip-tip">{{ flipTip }}</text>
				</view>

				<!-- 答案页 -->
				<view class="book-page page-answer" v-if="stage === 'result'">
					<view class="answer-question">
						<text class="answer-question-text">Q：{{ result.question }}</text>
					</view>
					<view class="answer-divider"></view>
					<text class="answer-text">{{ result.answer }}</text>
					<text class="answer-interpretation" v-if="result.interpretation">{{ result.interpretation }}</text>
					<view class="answer-meta">
						<text class="answer-tag" v-if="result.category"># {{ result.category }}</text>
						<text class="answer-date">{{ todayStr }}</text>
					</view>

					<!-- 操作区 -->
					<view class="action-row">
						<button class="action-btn fav-btn" @click="toggleFav">
							{{ favLoaded ? (isFaved ? '★ 已收藏' : '☆ 收藏') : '收藏' }}
						</button>
						<button class="action-btn share-btn" @click="makeShareCard">分享卡片</button>
					</view>
					<view class="action-row">
						<button class="again-btn" :disabled="cooldown > 0 || drawCount >= maxDraw" @click="drawAgain">
							<text v-if="cooldown > 0">静候 {{ cooldown }}s 再翻页</text>
							<text v-else-if="drawCount >= maxDraw">今天翻得够多了，明日再来</text>
							<text v-else>再抽一次（已抽 {{ drawCount }}/{{ maxDraw }}）</text>
						</button>
					</view>
					<view class="back-edit" @click="backToAsk">
						<text>← 换个问题</text>
					</view>
				</view>
			</view>

			<!-- 我的收藏入口 -->
			<view class="fav-entry" @click="openFavList">
				<text>★ 我的收藏</text>
			</view>
		</view>

		<!-- 分享卡片弹窗 -->
		<uni-popup ref="sharePopup" type="center" :mask-click="false">
			<view class="share-pop">
				<view class="share-pop-title">分享卡片</view>
				<image v-if="shareCardPath" class="share-card-img" :src="shareCardPath" mode="widthFix"></image>
				<view v-else class="share-card-loading">正在生成卡片…</view>
				<!-- 离屏画布：固定尺寸，移出可视区域 -->
				<canvas canvas-id="answerCard" class="share-canvas"></canvas>
				<view class="share-pop-btns">
					<button class="action-btn save-btn" @click="saveShareCard">保存到相册</button>
					<button class="action-btn share-friend-btn" open-type="share">分享给好友</button>
				</view>
				<view class="share-pop-close" @click="closeSharePopup">关闭</view>
			</view>
		</uni-popup>

		<!-- 收藏列表弹窗 -->
		<uni-popup ref="favPopup" type="bottom">
			<view class="fav-pop">
				<view class="fav-pop-title">
					<text>我的收藏</text>
					<text class="fav-pop-close" @click="closeFavPopup">✕</text>
				</view>
				<scroll-view scroll-y class="fav-list-scroll">
					<view v-if="favLoading" class="fav-empty">加载中…</view>
					<view v-else-if="favList.length === 0" class="fav-empty">还没有收藏，去收藏打动你的答案吧</view>
					<view v-for="item in favList" :key="item._id" class="fav-item">
						<view class="fav-item-main">
							<text class="fav-item-answer">{{ item.answer_text }}</text>
							<text class="fav-item-question" v-if="item.question">问：{{ item.question }}</text>
							<text class="fav-item-date">{{ formatTime(item.create_date) }}</text>
						</view>
						<view class="fav-item-del" @click="removeFav(item)">删除</view>
					</view>
				</scroll-view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import { checkSensitiveWords } from '@/common/js/sensitive-words.js'

	const MAX_DRAW = 50 // 单次进入页面最多抽取次数，防刷答案
	const COOLDOWN_SEC = 5 // 同一问题重抽冷却时间（秒）

	export default {
		data() {
			return {
				stage: 'ask', // ask 提问 | drawing 翻页动画 | result 答案展示
				question: '',
				drawing: false, // 防抖锁：动画/请求期间禁止再点
				flipping: false,
				flipTip: '书页翻动中，请静心等待…',
				result: {
					question: '',
					answerId: '',
					answer: '',
					interpretation: '',
					category: ''
				},
				drawCount: 0, // 本次会话已抽次数
				lastQuestion: '', // 上次抽取的问题，用于判断是否冷却
				cooldown: 0,
				cooldownTimer: null,
				maxDraw: MAX_DRAW,
				favListLoadedOnce: false, // 是否已首次拉取收藏列表
				userInfo: {},
				// 收藏
				favList: [],
				favLoading: false,
				favLoaded: false, // 当前答案是否已收藏
				isFaved: false,
				// 分享卡片
				shareCardPath: '',
				flipTips: [
					'书页翻动中，请静心等待…',
					'答案正在赶来的路上…',
					'别急，好的回答值得等待…',
					'宇宇青青正在为你执笔…'
				]
			}
		},
		computed: {
			todayStr() {
				const d = new Date()
				const m = d.getMonth() + 1
				const day = d.getDate()
				return `${d.getFullYear()}年${m}月${day}日`
			}
		},
		onLoad() {
			try {
				const userInfo = uni.getStorageSync('userInfo')
				if (userInfo) {
					this.userInfo = JSON.parse(userInfo)
				}
			} catch (e) { }
		},
		onUnload() {
			if (this.cooldownTimer) clearInterval(this.cooldownTimer)
		},
		onShareAppMessage() {
			return {
				title: this.result.answer ? `青宇答案之书告诉我：${this.result.answer}` : '青宇答案之书，替你回答心中的问题',
				path: '/pages/game/answer-book'
			}
		},
		onShareTimeline() {
			return {
				title: '青宇答案之书 | 宇青青宇全肯定'
			}
		},
		methods: {
			// ========== F01/F02 提问与翻页抽取 ==========
			drawAnswer() {
				if (this.drawing) return // 防抖
				const q = this.question.trim()

				// 次数上限：换了问题也不给抽，只能明日再来
				if (this.drawCount >= MAX_DRAW) {
					uni.showToast({ title: '今天翻得够多了，明日再来', icon: 'none' })
					return
				}
				// 长度校验（textarea maxlength 已限制，此处兜底）
				if (q.length > 50) {
					uni.showToast({ title: '问题最多50字', icon: 'none' })
					return
				}
				// 敏感词校验（前端先行，云端兜底）
				if (q && checkSensitiveWords(q).hit) {
					uni.showToast({ title: '问题包含不当内容，换个问法吧', icon: 'none' })
					return
				}
				// 同一问题重抽需冷却；换问题立即放行
				if (this.drawCount > 0 && q === this.lastQuestion && this.cooldown > 0) {
					uni.showToast({ title: `静候 ${this.cooldown}s 再翻`, icon: 'none' })
					return
				}

				this.startDraw(q)
			},

			startDraw(q) {
				this.drawing = true
				this.stage = 'drawing'
				this.flipTip = this.flipTips[Math.floor(Math.random() * this.flipTips.length)]
				this.flipping = true

				// 震动反馈
				uni.vibrateShort({ fail: () => { } })

				// 动画时长 1.5s - 2.5s 随机
				const animDuration = 1500 + Math.floor(Math.random() * 1000)

				uniCloud.callFunction({
					name: 'answer-book',
					data: {
						action: 'draw',
						question: q
					},
					success: (res) => {
						const r = res.result || {}
						if (r.code !== 0) {
							this.drawing = false
							this.flipping = false
							this.stage = 'ask'
							uni.showToast({ title: r.msg || '抽取失败', icon: 'none' })
							return
						}
						// 等动画播完再展示答案
						setTimeout(() => {
							this.result = r.data
							this.lastQuestion = q
							this.drawCount++
							this.flipping = false
							this.stage = 'result'
							this.drawing = false
							this.refreshFavState()
							// 有解读文本时震动加长反馈（长震动部分端不支持，降级短震动）
							uni.vibrateShort({ fail: () => { } })
							this.startCooldown()
						}, animDuration)
					},
					fail: () => {
						this.drawing = false
						this.flipping = false
						this.stage = 'ask'
						uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
					}
				})
			},

			// 同一问题重抽冷却倒计时
			startCooldown() {
				this.cooldown = COOLDOWN_SEC
				if (this.cooldownTimer) clearInterval(this.cooldownTimer)
				this.cooldownTimer = setInterval(() => {
					this.cooldown--
					if (this.cooldown <= 0) {
						clearInterval(this.cooldownTimer)
						this.cooldownTimer = null
					}
				}, 1000)
			},

			// 结果页「再抽一次」：沿用当前问题
			drawAgain() {
				if (this.cooldown > 0 || this.drawCount >= MAX_DRAW) return
				this.startDraw(this.lastQuestion)
			},

			backToAsk() {
				this.stage = 'ask'
			},

			// ========== 收藏 ==========
			ensureLogin() {
				if (!this.userInfo._id) {
					uni.showToast({ title: '请先登录', icon: 'none' })
					setTimeout(() => {
						uni.switchTab({ url: '/pages/profile/profile' })
					}, 800)
					return false
				}
				return true
			},

			toggleFav() {
				if (!this.ensureLogin()) return
				if (this.isFaved) {
					this.doRemoveFav()
				} else {
					this.doAddFav()
				}
			},

			doAddFav() {
				uniCloud.callFunction({
					name: 'answer-book',
					data: {
						action: 'addFav',
						userId: this.userInfo._id,
						answerId: this.result.answerId,
						question: this.result.question
					},
					success: (res) => {
						const r = res.result || {}
						uni.showToast({ title: r.msg || (r.code === 0 ? '收藏成功' : '收藏失败'), icon: 'none' })
						if (r.code === 0) {
							this.isFaved = true
							// 同步本地列表状态（未加载过列表时仅标记，收藏弹窗打开时会重新拉取）
							if (this.favListLoadedOnce) {
								this.favListLoadedOnce = false
							}
						}
					},
					fail: () => uni.showToast({ title: '收藏失败', icon: 'none' })
				})
			},

			doRemoveFav() {
				const target = this.favList.find(f => f.answer_id === this.result.answerId)
				if (!target || !target._id) {
					this.isFaved = false
					return
				}
				uniCloud.callFunction({
					name: 'answer-book',
					data: {
						action: 'removeFav',
						userId: this.userInfo._id,
						favId: target._id
					},
					success: (res) => {
						const r = res.result || {}
						if (r.code === 0) {
							this.isFaved = false
							this.favList = this.favList.filter(f => f._id !== target._id)
							uni.showToast({ title: '已取消收藏', icon: 'none' })
						} else {
							uni.showToast({ title: r.msg || '操作失败', icon: 'none' })
						}
					},
					fail: () => uni.showToast({ title: '操作失败', icon: 'none' })
				})
			},

			// 刷新当前答案的收藏状态（依赖已加载的收藏列表）
			refreshFavState() {
				if (!this.userInfo._id) {
					this.favLoaded = false
					this.isFaved = false
					return
				}
				if (!this.favListLoadedOnce) {
					// 首次进入结果页时拉一次收藏列表
					this.favListLoadedOnce = true
					this.loadFavList()
					return
				}
				this.favLoaded = true
				this.isFaved = this.favList.some(f => f.answer_id === this.result.answerId)
			},

			openFavList() {
				if (!this.ensureLogin()) return
				this.loadFavList()
				this.$refs.favPopup.open()
			},

			closeFavPopup() {
				this.$refs.favPopup.close()
			},

			loadFavList() {
				this.favLoading = true
				uniCloud.callFunction({
					name: 'answer-book',
					data: {
						action: 'getFavList',
						userId: this.userInfo._id,
						page: 1,
						pageSize: 50
					},
					success: (res) => {
						this.favLoading = false
						const r = res.result || {}
						if (r.code === 0) {
							this.favList = r.data.list || []
							this.favLoaded = true
							if (this.result.answerId) {
								this.isFaved = this.favList.some(f => f.answer_id === this.result.answerId)
							}
						}
					},
					fail: () => {
						this.favLoading = false
					}
				})
			},

			removeFav(item) {
				uni.showModal({
					title: '取消收藏',
					content: '不再收藏这条答案？',
					success: (res) => {
						if (!res.confirm) return
						uniCloud.callFunction({
							name: 'answer-book',
							data: {
								action: 'removeFav',
								userId: this.userInfo._id,
								favId: item._id
							},
							success: (r) => {
								if (r.result && r.result.code === 0) {
									this.favList = this.favList.filter(f => f._id !== item._id)
									if (item.answer_id === this.result.answerId) {
										this.isFaved = false
									}
								} else {
									uni.showToast({ title: '删除失败', icon: 'none' })
								}
							}
						})
					}
				})
			},

			formatTime(ts) {
				if (!ts) return ''
				const d = new Date(ts)
				const p = n => (n < 10 ? '0' + n : n)
				return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
			},

			// ========== F05 分享卡片 ==========
			makeShareCard() {
				this.shareCardPath = ''
				this.$refs.sharePopup.open()
				// 等待弹窗渲染后再绘制
				setTimeout(() => {
					this.drawShareCard()
				}, 350)
			},

			drawShareCard() {
				const W = 600
				const ctx = uni.createCanvasContext('answerCard', this)

				// 背景：青紫渐变
				const g = ctx.createLinearGradient(0, 0, 0, 900)
				g.addColorStop(0, '#2e7d8c')
				g.addColorStop(0.55, '#4a3f8f')
				g.addColorStop(1, '#241b52')
				ctx.setFillStyle(g)
				ctx.fillRect(0, 0, W, 900)

				// 边框装饰
				ctx.setStrokeStyle('rgba(180, 225, 255, 0.6)')
				ctx.setLineWidth(2)
				ctx.strokeRect(24, 24, W - 48, 852)

				// 标题
				ctx.setTextAlign('center')
				ctx.setFillStyle('rgba(190, 235, 255, 0.95)')
				ctx.setFontSize(26)
				ctx.fillText('✦ 青宇答案之书 ✦', W / 2, 90)

				// 日期
				ctx.setFillStyle('rgba(255, 255, 255, 0.55)')
				ctx.setFontSize(18)
				ctx.fillText(this.todayStr, W / 2, 128)

				// 问题（最多两行）
				ctx.setFillStyle('rgba(255, 255, 255, 0.75)')
				ctx.setFontSize(20)
				const qLines = this.wrapText('Q：' + this.result.question, 22).slice(0, 2)
				qLines.forEach((line, i) => {
					ctx.fillText(line, W / 2, 190 + i * 32)
				})

				// 分隔线
				ctx.setStrokeStyle('rgba(190, 175, 255, 0.55)')
				ctx.setLineWidth(1)
				ctx.beginPath()
				ctx.moveTo(W / 2 - 80, 280)
				ctx.lineTo(W / 2 + 80, 280)
				ctx.stroke()

				// 答案（大号，最多 3 行）
				ctx.setFillStyle('#ffffff')
				ctx.setFontSize(40)
				const aLines = this.wrapText(this.result.answer, 12).slice(0, 3)
				aLines.forEach((line, i) => {
					ctx.fillText(line, W / 2, 360 + i * 60)
				})

				// 解读（可选，最多 3 行）
				if (this.result.interpretation) {
					ctx.setFillStyle('rgba(255, 255, 255, 0.6)')
					ctx.setFontSize(18)
					const iLines = this.wrapText(this.result.interpretation, 26).slice(0, 3)
					iLines.forEach((line, i) => {
						ctx.fillText(line, W / 2, 360 + aLines.length * 60 + 30 + i * 28)
					})
				}

				// 分类标签
				if (this.result.category) {
					ctx.setFillStyle('rgba(205, 195, 255, 0.95)')
					ctx.setFontSize(20)
					ctx.fillText('# ' + this.result.category, W / 2, 700)
				}

				// 底部署名：昵称 + 小程序码占位（logo）
				const nickname = this.userInfo.nickname || '一位杯杯儿'
				ctx.setTextAlign('left')
				ctx.setFillStyle('rgba(255, 255, 255, 0.7)')
				ctx.setFontSize(18)
				ctx.fillText(nickname + ' · 翻自青宇答案之书', 60, 830)
				ctx.drawImage('/static/tabbar/hd1.png', W - 130, 770, 72, 72)
				ctx.setTextAlign('center')

				ctx.draw(false, () => {
					// draw 回调后立即导出会偶发空白，延迟导出
					setTimeout(() => {
						uni.canvasToTempFilePath({
							canvasId: 'answerCard',
							success: (res) => {
								this.shareCardPath = res.tempFilePath
							},
							fail: () => {
								uni.showToast({ title: '生成卡片失败', icon: 'none' })
							}
						}, this)
					}, 300)
				})
			},

			// 简单文本换行：按每行 maxLen 个字符切分
			wrapText(text, maxLen) {
				const lines = []
				let rest = String(text || '')
				while (rest.length > maxLen) {
					lines.push(rest.slice(0, maxLen))
					rest = rest.slice(maxLen)
				}
				if (rest) lines.push(rest)
				return lines
			},

			saveShareCard() {
				if (!this.shareCardPath) {
					uni.showToast({ title: '卡片生成中，请稍候', icon: 'none' })
					return
				}
				uni.saveImageToPhotosAlbum({
					filePath: this.shareCardPath,
					success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
					fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
				})
			},

			closeSharePopup() {
				this.$refs.sharePopup.close()
			}
		}
	}
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background: linear-gradient(180deg, #bfe6ef 0%, #cdb9f0 55%, #a48ade 100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 40rpx 30rpx 60rpx;
		box-sizing: border-box;
	}

	.book-area {
		width: 100%;
		max-width: 640rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* 书本主体 */
	.book {
		width: 100%;
		min-height: 880rpx;
		border-radius: 24rpx;
		background: linear-gradient(160deg, #f5f6fd 0%, #e8e4f7 100%);
		box-shadow: 0 20rpx 60rpx rgba(64, 50, 120, 0.3), inset 12rpx 0 0 rgba(120, 110, 200, 0.08);
		position: relative;
		overflow: hidden;
	}

	.book-flipping {
		animation: book-shake 0.4s ease-in-out infinite;
	}

	@keyframes book-shake {
		0%, 100% { transform: rotate(0deg); }
		25% { transform: rotate(-0.6deg); }
		75% { transform: rotate(0.6deg); }
	}

	.book-page {
		min-height: 880rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 60rpx 44rpx;
		box-sizing: border-box;
	}

	/* ===== 封面页 ===== */
	.book-title {
		display: flex;
		align-items: center;
		margin-top: 40rpx;
	}

	.book-title-icon {
		font-size: 52rpx;
		margin-right: 16rpx;
	}

	.book-title-text {
		font-size: 52rpx;
		font-weight: bold;
		color: #3d3560;
		letter-spacing: 6rpx;
	}

	.book-subtitle {
		margin-top: 20rpx;
		font-size: 26rpx;
		color: #7a72a3;
	}

	.question-box {
		width: 100%;
		margin-top: 70rpx;
		position: relative;
	}

	.question-input {
		width: 100%;
		height: 200rpx;
		background: rgba(255, 255, 255, 0.7);
		border: 2rpx dashed #b9b0dd;
		border-radius: 16rpx;
		padding: 24rpx;
		box-sizing: border-box;
		font-size: 30rpx;
		color: #3d3560;
	}

	.question-ph {
		color: #a9a3c9;
	}

	.question-count {
		position: absolute;
		right: 20rpx;
		bottom: 14rpx;
		font-size: 22rpx;
		color: #a9a3c9;
	}

	.draw-btn {
		margin-top: 70rpx;
		width: 360rpx;
		height: 92rpx;
		line-height: 92rpx;
		border-radius: 46rpx;
		background: linear-gradient(135deg, #4aa8b8 0%, #6f5bd8 100%);
		color: #f5f3ff;
		font-size: 34rpx;
		letter-spacing: 10rpx;
		box-shadow: 0 10rpx 24rpx rgba(90, 80, 190, 0.35);
	}

	.draw-btn::after {
		border: none;
	}

	.draw-btn-disabled {
		opacity: 0.6;
	}

	.draw-tip {
		margin-top: 26rpx;
		font-size: 22rpx;
		color: #9d95bd;
		text-align: center;
	}

	/* ===== 翻页动画页 ===== */
	.page-flipping {
		justify-content: center;
	}

	.flip-pages {
		display: flex;
		gap: 24rpx;
	}

	.flip-page {
		width: 110rpx;
		height: 150rpx;
		border-radius: 10rpx;
		background: linear-gradient(160deg, #f7f8ff, #ddd6f3);
		box-shadow: 0 6rpx 16rpx rgba(90, 80, 190, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: page-flip 0.7s ease-in-out infinite;
	}

	@keyframes page-flip {
		0% { transform: rotateY(0deg); }
		50% { transform: rotateY(-120deg); }
		100% { transform: rotateY(0deg); }
	}

	.flip-page-mark {
		font-size: 44rpx;
		color: #a294dd;
	}

	.flip-tip {
		margin-top: 60rpx;
		font-size: 26rpx;
		color: #7a72a3;
	}

	/* ===== 答案页 ===== */
	.page-answer {
		animation: answer-in 0.6s ease;
	}

	@keyframes answer-in {
		from { opacity: 0; transform: translateY(30rpx); }
		to { opacity: 1; transform: translateY(0); }
	}

	.answer-question {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.answer-question-text {
		font-size: 26rpx;
		color: #8d84bd;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.answer-divider {
		width: 120rpx;
		height: 4rpx;
		background: #b9b0dd;
		border-radius: 2rpx;
		margin: 30rpx 0;
	}

	.answer-text {
		font-size: 52rpx;
		font-weight: bold;
		color: #332a55;
		text-align: center;
		line-height: 1.6;
		margin-top: 70rpx;
	}

	.answer-interpretation {
		margin-top: 36rpx;
		font-size: 26rpx;
		color: #6e6597;
		line-height: 1.8;
		text-align: center;
	}

	.answer-meta {
		margin-top: 40rpx;
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.answer-tag {
		font-size: 22rpx;
		color: #6f5bd8;
		background: rgba(111, 91, 216, 0.12);
		border-radius: 20rpx;
		padding: 6rpx 20rpx;
	}

	.answer-date {
		font-size: 22rpx;
		color: #9d95bd;
	}

	/* 操作按钮 */
	.action-row {
		width: 100%;
		display: flex;
		gap: 20rpx;
		margin-top: 28rpx;
	}

	.action-btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		border-radius: 40rpx;
		font-size: 27rpx;
		margin: 0;
	}

	.action-btn::after {
		border: none;
	}

	.fav-btn {
		background: #fff;
		color: #6f5bd8;
		border: 2rpx solid #b9b0dd;
	}

	.share-btn {
		background: linear-gradient(135deg, #4aa8b8 0%, #6f5bd8 100%);
		color: #f5f3ff;
	}

	.save-btn {
		background: #fff;
		color: #6f5bd8;
		border: 2rpx solid #b9b0dd;
	}

	.share-friend-btn {
		background: linear-gradient(135deg, #4aa8b8 0%, #6f5bd8 100%);
		color: #fff;
	}

	.again-btn {
		width: 100%;
		height: 84rpx;
		line-height: 84rpx;
		border-radius: 42rpx;
		background: rgba(111, 91, 216, 0.08);
		color: #6f5bd8;
		font-size: 27rpx;
		border: 2rpx dashed #a294dd;
	}

	.again-btn::after {
		border: none;
	}

	.again-btn[disabled] {
		opacity: 0.55;
	}

	.back-edit {
		margin-top: 26rpx;
		font-size: 24rpx;
		color: #7a72a3;
		padding: 10rpx 30rpx;
	}

	/* 收藏入口 */
	.fav-entry {
		margin-top: 40rpx;
		padding: 16rpx 44rpx;
		border-radius: 34rpx;
		background: rgba(255, 255, 255, 0.22);
		color: #ffffff;
		font-size: 26rpx;
	}

	/* ===== 分享卡片弹窗 ===== */
	.share-pop {
		width: 560rpx;
		background: #f2f1fb;
		border-radius: 24rpx;
		padding: 36rpx 30rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	.share-pop-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #3d3560;
		margin-bottom: 24rpx;
	}

	.share-card-img {
		width: 100%;
		border-radius: 16rpx;
	}

	.share-card-loading {
		width: 100%;
		height: 500rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26rpx;
		color: #9d95bd;
		background: rgba(0, 0, 0, 0.04);
		border-radius: 16rpx;
	}

	/* 离屏画布：保持绘制尺寸 600x900，挪出可视区域 */
	.share-canvas {
		position: fixed;
		left: -9999px;
		top: 0;
		width: 600px;
		height: 900px;
	}

	.share-pop-btns {
		width: 100%;
		display: flex;
		gap: 20rpx;
		margin-top: 28rpx;
	}

	.share-pop-close {
		margin-top: 22rpx;
		font-size: 26rpx;
		color: #7a72a3;
		padding: 8rpx 30rpx;
	}

	/* ===== 收藏列表弹窗 ===== */
	.fav-pop {
		background: #f2f1fb;
		border-radius: 24rpx 24rpx 0 0;
		padding: 30rpx;
		max-height: 70vh;
		display: flex;
		flex-direction: column;
	}

	.fav-pop-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 32rpx;
		font-weight: bold;
		color: #3d3560;
		margin-bottom: 20rpx;
	}

	.fav-pop-close {
		font-size: 32rpx;
		color: #7a72a3;
		padding: 0 10rpx;
	}

	.fav-list-scroll {
		max-height: 55vh;
	}

	.fav-empty {
		text-align: center;
		font-size: 26rpx;
		color: #9d95bd;
		padding: 60rpx 0;
	}

	.fav-item {
		display: flex;
		align-items: center;
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 18rpx;
	}

	.fav-item-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-right: 20rpx;
	}

	.fav-item-answer {
		font-size: 30rpx;
		font-weight: bold;
		color: #332a55;
	}

	.fav-item-question {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #8d84bd;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fav-item-date {
		margin-top: 8rpx;
		font-size: 20rpx;
		color: #a9a3c9;
	}

	.fav-item-del {
		font-size: 24rpx;
		color: #b5544a;
		padding: 10rpx 18rpx;
	}
</style>
