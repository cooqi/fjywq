<template>
	<view class="page-container">
		<!-- ===== 首页：创建 / 参加 ===== -->
		<view class="home-page" v-if="phase === 'home'">
			<view class="hero">
				<view class="hero-icon">🎫</view>
				<view class="hero-title">青宇宇宙通行证</view>
				<view class="hero-sub">嗑学水平测试 · 邀请好友一起考</view>
			</view>
			
			<!-- 玩法介绍 -->
			<view class="section-card rules-card">
				<view class="section-title">玩法介绍</view>
				<view class="rule-item"><text class="rule-dot">🎯</text><text class="rule-text">创建考试时自定义题数、满分、及格分和各分数段的称号与奖品</text></view>
				<view class="rule-item"><text class="rule-dot">🔑</text><text class="rule-text">系统随机抽题生成专属考试码，同一考试码大家题目一致</text></view>
				<view class="rule-item"><text class="rule-dot">💌</text><text class="rule-text">考试码 10 分钟内有效，可分享海报 / 发给好友，也能续期</text></view>
				<view class="rule-item"><text class="rule-dot">✍️</text><text class="rule-text">好友输入考试码和昵称即可开始答题</text></view>
				<view class="rule-item"><text class="rule-dot">🍬</text><text class="rule-text">每题 20 秒，答完立即判对错，答对撒糖、答错补糖并看糖点解析</text></view>
				<view class="rule-item"><text class="rule-dot">🏆</text><text class="rule-text">交卷后按分数发放称号、奖品资格与本场排名，可查排行榜和证书，大家可以线下一起答题互动。</text></view>
			</view>

			<!-- 我发起的考试 -->
			<view class="section-card" v-if="isLogin">
				<button class="primary-btn" @click="goConfig">＋ 创建一套考试题</button>
			</view>
			<view class="section-card" v-else>
				<view class="login-tip">登录后可创建考试并发放通行证</view>
				<button class="ghost-btn" @click="goLogin">去登录</button>
			</view>

			<!-- 参加考试 -->
			<view class="section-card">
				<view class="section-title">我有考试码</view>
				<input class="code-input" v-model="joinForm.examCode" placeholder="请输入 6 位考试码" maxlength="10" />
				<input class="code-input" v-model="joinForm.nick" placeholder="请输入你的昵称" maxlength="12" />
				<button class="join-btn" @click="joinExam">开始考试</button>
			</view>

			<!-- 我的考试 -->
			<view class="section-card mine-entry" v-if="isLogin" @click="goMine">
				<view class="mine-entry-icon">📂</view>
				<view class="mine-entry-text">
					<view class="mine-entry-title">我的考试</view>
					<view class="mine-entry-sub">我创建的考题 / 我参与的成绩</view>
				</view>
				<view class="mine-entry-arrow">›</view>
			</view>
		</view>

		<!-- ===== 创建配置 ===== -->
		<view class="config-page" v-if="phase === 'config'">
			<view class="page-title">考试配置</view>

			<view class="field">
				<text class="field-label">题目数量（≥5）</text>
				<input class="field-input" type="number" v-model="configForm.questionCount" />
			</view>
			<view class="field">
				<text class="field-label">满分（≥5）</text>
				<input class="field-input" type="number" v-model="configForm.totalScore" />
			</view>
			<view class="field">
				<text class="field-label">及格分（≥1）</text>
				<input class="field-input" type="number" v-model="configForm.passScore" />
			</view>

			<view class="tier-head">
				<text class="field-label">分数称号与奖品</text>
				<text class="add-tier" @click="addTier">＋ 添加档位</text>
			</view>
			<view class="tier-item" v-for="(tier, idx) in configForm.tiers" :key="idx">
				<view class="tier-row">
					<text class="tier-mini">达分</text>
					<input class="tier-score" type="number" v-model="tier.minScore" placeholder="0" />
					<text class="tier-del" @click="removeTier(idx)">✕</text>
				</view>
				<input class="tier-text" v-model="tier.title" placeholder="称号，如：顶级嗑学家" maxlength="16" />
				<input class="tier-text" v-model="tier.prize" placeholder="奖品，如：专属奶茶一杯" maxlength="24" />
			</view>

			<view class="btn-row">
				<button class="ghost-btn" @click="phase = 'home'">返回</button>
				<button class="primary-btn flex-1" @click="submitCreate" :disabled="isLoading">
					{{ isLoading ? '生成中...' : '生成考试码' }}
				</button>
			</view>
		</view>

		<!-- ===== 考试码结果 ===== -->
		<view class="code-page" v-if="phase === 'codecard'">
			<view class="pass-card">
				<view class="pass-badge">宇宙通行证</view>
				<view class="pass-creator" v-if="created.creatorNick">发起人：{{ created.creatorNick }}</view>
				<view class="pass-code">{{ created.examCode }}</view>
				<view class="pass-countdown" :class="{'countdown-warn': remainSec <= 120 && remainSec > 0}">
					<text v-if="remainSec > 0">距过期还有 {{ formatRemain(remainSec) }}</text>
					<text v-else>考试码已过期，可续期</text>
				</view>

				<view class="pass-meta">
					<view class="meta-item"><text class="meta-num">{{ created.questionCount }}</text><text class="meta-label">题</text></view>
					<view class="meta-item"><text class="meta-num">{{ created.totalScore }}</text><text class="meta-label">满分</text></view>
					<view class="meta-item"><text class="meta-num">{{ created.passScore }}</text><text class="meta-label">及格</text></view>
				</view>
			</view>

			<view class="action-grid">
				<view class="action-item" @click="copyCode">📋 复制考试码</view>
				<view class="action-item" @click="makePoster">🖼️ 生成海报</view>
				<!-- #ifdef MP-WEIXIN -->
				<button class="action-item action-share" open-type="share">💌 分享给好友</button>
				<!-- #endif -->
				<!-- #ifndef MP-WEIXIN -->
				<view class="action-item" @click="copyLink">🔗 复制分享链接</view>
				<!-- #endif -->
				<view class="action-item" @click="viewRank">🏆 查看排行榜</view>
				<view class="action-item" @click="renewExam" v-if="isCreator">⏳ 续期 10 分钟</view>
			</view>

			<view class="share-tip">把考试码或海报发给好友，好友在首页输入考试码即可开始考试</view>

			<view class="btn-row">
				<button class="ghost-btn" @click="phase = 'home'">回首页</button>
				<button class="ghost-btn" @click="goConfig">再建一套</button>
			</view>
		</view>

		<!-- ===== 排行榜 ===== -->
		<view class="rank-page" v-if="phase === 'rank'">
			<view class="page-title">🏆 排行榜 · {{ created.examCode }}</view>
			<view class="rank-summary" v-if="rankTotal > 0">共 {{ rankTotal }} 人参与</view>
			<view class="rank-list">
				<view class="rank-item" v-for="(item, idx) in rankList" :key="idx" :class="{'rank-me': item.isMe}">
					<view class="rank-no" :class="'no-' + (idx < 3 ? idx + 1 : 'n')">{{ idx + 1 }}</view>
					<view class="rank-info">
						<view class="rank-nick">{{ item.nick }}</view>
						<view class="rank-title">{{ item.title }}</view>
					</view>
					<view class="rank-score">{{ item.score }} 分</view>
				</view>
				<view class="empty-tip" v-if="rankList.length === 0 && !isLoading">还没有人参加考试</view>
			</view>
			<view class="btn-row">
				<button class="ghost-btn" @click="phase = 'codecard'">返回</button>
				<button class="primary-btn flex-1" @click="viewRank">刷新</button>
			</view>
		</view>

		<!-- ===== 我的考试 ===== -->
		<view class="mine-page" v-if="phase === 'mine'">
			<view class="page-title">我的考试</view>
			<view class="mine-tabs">
				<view class="mine-tab" :class="{'tab-active': mineTab === 'created'}" @click="mineTab = 'created'">我创建的</view>
				<view class="mine-tab" :class="{'tab-active': mineTab === 'joined'}" @click="mineTab = 'joined'">我参与的</view>
			</view>

			<!-- 我创建的 -->
			<view v-if="mineTab === 'created'">
				<view class="my-item" v-for="(item, idx) in myCreated" :key="idx" @click="openCreated(item)">
					<view class="my-item-main">
						<view class="my-code">{{ item.exam_code }}</view>
						<view class="my-line">{{ item.question_count }} 题 · 满分 {{ item.total_score }} · 及格 {{ item.pass_score }}</view>
						<view class="my-time">{{ formatDate(item.create_date) }}</view>
					</view>
					<view class="my-item-right">
						<view class="my-badge" :class="isExpired(item) ? 'badge-out' : 'badge-live'">{{ isExpired(item) ? '已过期' : '进行中' }}</view>
						<view class="my-count">{{ item.participant_count || 0 }} 人参与</view>
					</view>
				</view>
				<view class="empty-tip" v-if="myCreated.length === 0 && !mineLoading">你还没有创建过考试</view>
			</view>

			<!-- 我参与的 -->
			<view v-if="mineTab === 'joined'">
				<view class="my-item" v-for="(item, idx) in myJoined" :key="idx" @click="openJoined(item)">
					<view class="my-item-main">
						<view class="my-code">{{ item.exam_code }}</view>
						<view class="my-line">称号「{{ item.title || '—' }}」· 排名第 {{ item.rank || '—' }}</view>
						<view class="my-time">{{ formatDate(item.create_date) }}</view>
					</view>
					<view class="my-item-right">
						<view class="my-score" :class="item.passed ? 'sc-pass' : 'sc-fail'">{{ item.score }} 分</view>
						<view class="my-count">答对 {{ item.correct_count }} 题</view>
					</view>
				</view>
				<view class="empty-tip" v-if="myJoined.length === 0 && !mineLoading">你还没有参加过考试</view>
			</view>

			<view class="btn-row"><button class="ghost-btn" @click="phase = 'home'">返回首页</button></view>
		</view>

		<!-- 隐藏海报画布（移出可视区，仅用于绘制） -->
		<canvas canvas-id="poster" class="poster-canvas" :style="{width: posterW + 'px', height: posterH + 'px'}"></canvas>

		<!-- 海报预览弹层 -->
		<view class="poster-mask" v-if="showPoster" @click="closePoster">
			<view class="poster-body" @click.stop>
				<image class="poster-img" :src="posterImage" mode="widthFix" show-menu-by-longpress></image>
				<view class="poster-btns">
					<view class="poster-btn poster-save" @click="savePoster">保存到相册</view>
					<view class="poster-btn poster-close" @click="closePoster">关闭</view>
				</view>
				<view class="poster-hint">长按图片也可直接保存分享</view>
			</view>
		</view>

		<view class="loading-mask" v-if="isLoading"><text>处理中...</text></view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			isLogin: false,
			phase: 'home', // home | config | codecard | rank
			isLoading: false,
			joinForm: { examCode: '', nick: '' },
			configForm: {
				questionCount: '10',
				totalScore: '100',
				passScore: '60',
				tiers: [
					{ minScore: '90', title: '顶级嗑学家', prize: '专属拥抱一个' },
					{ minScore: '60', title: '合格嗑学家', prize: '奶茶半杯' },
					{ minScore: '0', title: '嗑学萌新', prize: '再来一次机会' }
				]
			},
			created: { examCode: '', creatorNick: '', questionCount: 0, totalScore: 0, passScore: 0, expireAt: 0 },
			remainSec: 0,
			countdownTimer: null,
			rankList: [],
			rankTotal: 0,
			mineTab: 'created',
			myCreated: [],
			myJoined: [],
			mineLoading: false,
			posterW: 340,
			posterH: 540,
			showPoster: false,
			posterImage: ''
		}
	},
	computed: {
		isCreator() {
			return this.isLogin && this.userInfo._id
		}
	},
	onLoad(options) {
		const raw = uni.getStorageSync('userInfo')
		if (raw) {
			try { this.userInfo = JSON.parse(raw) } catch (e) { this.userInfo = {} }
		}
		this.isLogin = !!this.userInfo._id
		this.joinForm.nick = this.userInfo.nickName || ''

		// 分享进入自动带出考试码
		if (options && (options.shareCode || options.code)) {
			this.joinForm.examCode = (options.shareCode || options.code || '').toUpperCase()
		}
	},
	onUnload() {
		this.stopCountdown()
	},
	onShareAppMessage() {
		const code = this.created.examCode || ''
		return {
			title: '青宇宇宙通行证 · 嗑学水平测试' + (code ? '（考试码 ' + code + '）' : ''),
			path: code ? '/pages/game/txz/txz-index?shareCode=' + code : '/pages/game/txz/txz-index'
		}
	},
	onShareTimeline() {
		return { title: '青宇宇宙通行证 · 嗑学水平测试' }
	},
	methods: {
		goLogin() {
			uni.switchTab({ url: '/pages/profile/profile' })
		},
		goConfig() {
			if (!this.isLogin) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
			this.phase = 'config'
		},
		addTier() {
			this.configForm.tiers.push({ minScore: '', title: '', prize: '' })
		},
		removeTier(idx) {
			this.configForm.tiers.splice(idx, 1)
		},

		// 参加考试（首页输入考试码 + 昵称）
		joinExam() {
			const code = (this.joinForm.examCode || '').trim().toUpperCase()
			const nick = (this.joinForm.nick || '').trim()
			if (!code) { uni.showToast({ title: '请输入考试码', icon: 'none' }); return }
			if (!nick) { uni.showToast({ title: '请输入昵称', icon: 'none' }); return }
			uni.navigateTo({ url: '/pages/game/txz/txz-exam?examCode=' + code + '&nick=' + encodeURIComponent(nick) })
		},

		// 创建考试
		submitCreate() {
			const c = this.configForm
			const questionCount = parseInt(c.questionCount)
			const totalScore = parseInt(c.totalScore)
			const passScore = parseInt(c.passScore)
			if (!(questionCount >= 5)) { uni.showToast({ title: '题数至少 5', icon: 'none' }); return }
			if (!(totalScore >= 5)) { uni.showToast({ title: '满分至少 5', icon: 'none' }); return }
			if (!(passScore >= 1)) { uni.showToast({ title: '及格分至少 1', icon: 'none' }); return }
			if (passScore > totalScore) { uni.showToast({ title: '及格分不能大于满分', icon: 'none' }); return }

			const tiers = c.tiers
				.filter(t => t.title && String(t.title).trim())
				.map(t => ({ minScore: parseInt(t.minScore) || 0, title: String(t.title).trim(), prize: String(t.prize || '').trim() }))

			this.isLoading = true
			uniCloud.callFunction({
				name: 'txz-exam',
				data: {
					action: 'createExam',
					userId: this.userInfo._id,
					creatorNick: this.userInfo.nickName || '',
					config: { questionCount, totalScore, passScore, tiers }
				},
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						const d = res.result.data
						this.created = {
							examCode: d.examCode,
							creatorNick: this.userInfo.nickName || '',
							questionCount, totalScore, passScore,
							expireAt: d.expireAt
						}
						this.phase = 'codecard'
						this.startCountdown()
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: (err) => {
					this.isLoading = false
					console.error('创建考试失败:', err)
					uni.showToast({ title: '网络错误', icon: 'none' })
				}
			})
		},

		// 倒计时
		startCountdown() {
			this.stopCountdown()
			const tick = () => {
				this.remainSec = Math.max(0, Math.floor((this.created.expireAt - Date.now()) / 1000))
			}
			tick()
			this.countdownTimer = setInterval(tick, 1000)
		},
		stopCountdown() {
			if (this.countdownTimer) { clearInterval(this.countdownTimer); this.countdownTimer = null }
		},
		formatRemain(sec) {
			const m = Math.floor(sec / 60)
			const s = sec % 60
			return `${m}分${String(s).padStart(2, '0')}秒`
		},

		copyCode() {
			uni.setClipboardData({ data: this.created.examCode, success: () => uni.showToast({ title: '考试码已复制', icon: 'none' }) })
		},
		copyLink() {
			const link = `青宇宇宙通行证考试码：${this.created.examCode}，打开小程序输入考试码即可考试`
			uni.setClipboardData({ data: link, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
		},

		renewExam() {
			this.isLoading = true
			uniCloud.callFunction({
				name: 'txz-exam',
				data: { action: 'renewExam', examCode: this.created.examCode, userId: this.userInfo._id },
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						this.created.expireAt = res.result.data.expireAt
						this.startCountdown()
						uni.showToast({ title: '已续期 10 分钟', icon: 'none' })
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => { this.isLoading = false; uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
		},

		viewRank() {
			this.isLoading = true
			this.phase = 'rank'
			const myNick = this.joinForm.nick || this.userInfo.nickName || ''
			uniCloud.callFunction({
				name: 'txz-exam',
				data: { action: 'getRankList', examCode: this.created.examCode },
				success: (res) => {
					this.isLoading = false
					if (res.result.code === 0) {
						this.rankList = (res.result.data.list || []).map(r => ({ ...r, isMe: r.nick === myNick }))
						this.rankTotal = res.result.data.total || 0
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => { this.isLoading = false; uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
		},

		// 我的考试
		goMine() {
			if (!this.isLogin) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
			this.phase = 'mine'
			this.loadMine()
		},
		loadMine() {
			this.mineLoading = true
			uniCloud.callFunction({
				name: 'txz-exam',
				data: { action: 'getMyExams', userId: this.userInfo._id },
				success: (res) => {
					this.mineLoading = false
					if (res.result.code === 0) {
						this.myCreated = res.result.data.created || []
						this.myJoined = res.result.data.joined || []
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => { this.mineLoading = false; uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
		},
		isExpired(item) {
			return !item.expire_at || Date.now() > item.expire_at
		},
		formatDate(ts) {
			if (!ts) return ''
			const d = new Date(ts)
			if (isNaN(d.getTime())) return ''
			const m = String(d.getMonth() + 1).padStart(2, '0')
			const day = String(d.getDate()).padStart(2, '0')
			const h = String(d.getHours()).padStart(2, '0')
			const min = String(d.getMinutes()).padStart(2, '0')
			return `${m}-${day} ${h}:${min}`
		},
		// 打开我创建的考试（重建考试码卡片）
		openCreated(item) {
			this.created = {
				examCode: item.exam_code,
				creatorNick: item.creator_nick || this.userInfo.nickName || '',
				questionCount: item.question_count,
				totalScore: item.total_score,
				passScore: item.pass_score,
				expireAt: item.expire_at || 0
			}
			this.phase = 'codecard'
			this.startCountdown()
		},
		// 打开我参与的成绩（跳转证书页）
		openJoined(item) {
			const url = '/pages/game/txz/txz-result?recordId=&examCode=' + item.exam_code +
				'&nick=' + encodeURIComponent(item.nick || '') +
				'&score=' + (item.score || 0) + '&totalScore=' + (item.total_score || 0) +
				'&passScore=' + (item.pass_score || 0) + '&passed=' + (item.passed ? 'true' : 'false') +
				'&title=' + encodeURIComponent(item.title || '') + '&prize=' + encodeURIComponent(item.prize || '') +
				'&rank=' + (item.rank || 0) + '&correctCount=' + (item.correct_count || 0) + '&questionCount=0'
			uni.navigateTo({ url })
		},

		// 生成分享海报（票券风格 canvas 绘制，高清导出后预览）
		makePoster() {
			this.isLoading = true
			const ctx = uni.createCanvasContext('poster', this)
			const W = this.posterW, H = this.posterH
			const c = this.created

			// 背景渐变
			const bg = ctx.createLinearGradient(0, 0, W, H)
			bg.addColorStop(0, '#6a5cff')
			bg.addColorStop(0.5, '#8f5bff')
			bg.addColorStop(1, '#c86dd7')
			ctx.setFillStyle(bg)
			ctx.fillRect(0, 0, W, H)

			// 装饰光斑
			this.drawBlob(ctx, 26, 54, 78, 'rgba(255,255,255,0.14)')
			this.drawBlob(ctx, W - 20, H - 60, 96, 'rgba(255,255,255,0.10)')
			this.drawBlob(ctx, W - 40, 90, 26, 'rgba(255,255,255,0.18)')
			ctx.setTextAlign('center')

			// 顶部标题
			ctx.setFillStyle('#ffffff')
			ctx.setFontSize(23)
			ctx.fillText('青宇宇宙通行证', W / 2, 46)
			ctx.setFontSize(13)
			ctx.setFillStyle('rgba(255,255,255,0.88)')
			ctx.fillText('嗑 学 水 平 测 试', W / 2, 72)

			// 票券白卡（带阴影）
			const cardX = 26, cardY = 96, cardW = W - 52, cardH = 300
			ctx.setShadow(0, 10, 26, 'rgba(70,50,150,0.28)')
			ctx.setFillStyle('#ffffff')
			this.roundRect(ctx, cardX, cardY, cardW, cardH, 22)
			ctx.fill()
			ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')

			// 顶部小徽章
			const bw = 200, bx = (W - bw) / 2, by = cardY + 22
			ctx.setFillStyle('rgba(122,92,255,0.10)')
			this.roundRect(ctx, bx, by, bw, 34, 17)
			ctx.fill()
			ctx.setFillStyle('#7b5cff')
			ctx.setFontSize(14)
			ctx.fillText('UNIVERSE PASS · 通行证', W / 2, by + 23)

			// 考试码标签
			ctx.setFillStyle('#a7a7bd')
			ctx.setFontSize(12)
			ctx.fillText('考 试 码', W / 2, by + 62)

			// 考试码盒子
			const codeBoxY = by + 74
			ctx.setFillStyle('#f3f0ff')
			this.roundRect(ctx, bx, codeBoxY, bw, 78, 16)
			ctx.fill()
			this.drawSpaced(ctx, c.examCode, W / 2, codeBoxY + 41, 6, 34, '#4b2f8f')

			// 撕票虚线 + 两侧挖孔
			const stubY = cardY + 234
			ctx.setStrokeStyle('#e7e3f5')
			ctx.setLineWidth(2)
			ctx.beginPath()
			ctx.moveTo(cardX + 18, stubY)
			ctx.lineTo(cardX + cardW - 18, stubY)
			ctx.stroke()
			ctx.setFillStyle('#8f5bff')
			ctx.beginPath(); ctx.arc(cardX, stubY, 12, 0, Math.PI * 2); ctx.fill()
			ctx.beginPath(); ctx.arc(cardX + cardW, stubY, 12, 0, Math.PI * 2); ctx.fill()

			// 副券区：题数 / 满分 / 及格
			const cols = [
				{ n: c.questionCount, t: '题目' },
				{ n: c.totalScore, t: '满分' },
				{ n: c.passScore, t: '及格' }
			]
			cols.forEach((col, i) => {
				const colX = cardX + cardW * (0.24 + i * 0.26)
				ctx.setFillStyle('#4b2f8f')
				ctx.setFontSize(24)
				ctx.fillText(String(col.n), colX, stubY + 40)
				ctx.setFillStyle('#9a9ab0')
				ctx.setFontSize(12)
				ctx.fillText(col.t, colX, stubY + 60)
			})

			// 票卡外：发起人与步骤
			ctx.setTextAlign('center')
			if (c.creatorNick) {
				ctx.setFillStyle('#ffffff')
				ctx.setFontSize(14)
				ctx.fillText('发起人：' + c.creatorNick, W / 2, 428)
			}
			ctx.setFontSize(13)
			ctx.setFillStyle('rgba(255,255,255,0.95)')
			ctx.fillText('① 打开小程序   ② 输入考试码   ③ 开始考试', W / 2, 456)
			ctx.setFontSize(11)
			ctx.setFillStyle('rgba(255,255,255,0.75)')
			ctx.fillText('考试码 10 分钟内有效 · 过期可让发起人续期', W / 2, 482)
			ctx.setFontSize(11)
			ctx.setFillStyle('rgba(255,255,255,0.6)')
			ctx.fillText('宇青青宇全肯定 · 休息一下', W / 2, H - 20)

			ctx.draw(false, () => {
				setTimeout(() => {
					uni.canvasToTempFilePath({
						canvasId: 'poster',
						x: 0, y: 0, width: W, height: H,
						destWidth: W * 3, destHeight: H * 3,
						success: (r) => {
							this.isLoading = false
							this.posterImage = r.tempFilePath
							this.showPoster = true
						},
						fail: () => { this.isLoading = false; uni.showToast({ title: '海报生成失败', icon: 'none' }) }
					}, this)
				}, 400)
			})
		},
		// 保存海报到相册
		savePoster() {
			if (!this.posterImage) return
			uni.saveImageToPhotosAlbum({
				filePath: this.posterImage,
				success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
				fail: () => uni.showToast({ title: '保存失败或未授权', icon: 'none' })
			})
		},
		closePoster() { this.showPoster = false },
		// 径向光斑
		drawBlob(ctx, x, y, r, color) {
			const g = ctx.createCircularGradient(x, y, r)
			g.addColorStop(0, color)
			g.addColorStop(1, 'rgba(255,255,255,0)')
			ctx.setFillStyle(g)
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
			ctx.fill()
		},
		// 字符间距居中绘制（用于考试码）
		drawSpaced(ctx, text, cx, cy, spacing, fontSize, color) {
			text = String(text || '')
			ctx.setFontSize(fontSize)
			ctx.setFillStyle(color)
			const chars = text.split('')
			const widths = chars.map(ch => {
				try { return ctx.measureText(ch).width } catch (e) { return fontSize * 0.62 }
			})
			const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
			let x = cx - total / 2
			ctx.setTextAlign('left')
			ctx.setTextBaseline('middle')
			for (let i = 0; i < chars.length; i++) {
				ctx.fillText(chars[i], x, cy)
				x += widths[i] + spacing
			}
			ctx.setTextAlign('center')
			ctx.setTextBaseline('normal')
		},
		roundRect(ctx, x, y, w, h, r) {
			ctx.beginPath()
			ctx.moveTo(x + r, y)
			ctx.arcTo(x + w, y, x + w, y + h, r)
			ctx.arcTo(x + w, y + h, x, y + h, r)
			ctx.arcTo(x, y + h, x, y, r)
			ctx.arcTo(x, y, x + w, y, r)
			ctx.closePath()
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
	border-radius: 50%; background: linear-gradient(135deg,#667eea,#b06ab3);
	box-shadow: 0 12rpx 36rpx rgba(102,126,234,.45);
}
.hero-title {
	font-size: 48rpx; font-weight: bold; margin-top: 22rpx;
	background: linear-gradient(135deg,#5b3fd6,#a6489f);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 26rpx; color: #8a86a8; margin-top: 12rpx; letter-spacing: 2rpx; }

.section-card {
	background: #fff;
	border-radius: 28rpx;
	padding: 34rpx 30rpx;
	margin-top: 26rpx;
	box-shadow: 0 10rpx 30rpx rgba(102,126,234,.10);
	border: 2rpx solid rgba(255,255,255,.7);
}
.section-title { font-size: 30rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; }

/* 玩法介绍 */
.rules-card { background: rgba(255,255,255,.92); }
.rules-card .section-title { color: #4b3a8f; }
.rule-item { display: flex; align-items: flex-start; margin-bottom: 16rpx; }
.rule-item:last-child { margin-bottom: 0; }
.rule-dot { font-size: 26rpx; margin-right: 14rpx; flex-shrink: 0; line-height: 1.6; }
.rule-text { flex: 1; font-size: 25rpx; color: #666; line-height: 1.6; }
.login-tip { font-size: 26rpx; color: #999; margin-bottom: 20rpx; text-align: center; }

.code-input {
	height: 84rpx;
	background: #f6f6fb;
	border: 2rpx solid #e6e6f0;
	border-radius: 16rpx;
	padding: 0 24rpx;
	font-size: 30rpx;
	margin-bottom: 20rpx;
	letter-spacing: 4rpx;
}

.primary-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx;
	font-size: 30rpx; border: none;
	&[disabled] { opacity: .6; }
}
.join-btn {
	background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
	color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none;
}
.ghost-btn {
	background: #fff; color: #667eea; border: 2rpx solid #667eea;
	border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx;
}
.flex-1 { flex: 1; }

/* 配置页 */
.page-title { font-size: 36rpx; font-weight: bold; color: #4b3a8f; padding: 20rpx 0; text-align: center; }
.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.field-input {
	height: 80rpx; background: #fff; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx;
}
.tier-head { display: flex; justify-content: space-between; align-items: center; margin: 10rpx 0 16rpx; }
.add-tier { color: #667eea; font-size: 26rpx; }
.tier-item { background: #fff; border-radius: 18rpx; padding: 20rpx; margin-bottom: 18rpx; }
.tier-row { display: flex; align-items: center; margin-bottom: 12rpx; }
.tier-mini { font-size: 26rpx; color: #666; margin-right: 12rpx; }
.tier-score { flex: 1; height: 64rpx; background: #f6f6fb; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; }
.tier-del { color: #c62828; font-size: 30rpx; padding: 0 16rpx; }
.tier-text { height: 64rpx; background: #f6f6fb; border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; margin-top: 12rpx; }

.btn-row { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-row button { flex: 1; margin: 0; }

/* 考试码卡片 */
.pass-card {
	background: linear-gradient(150deg, #6a5cff 0%, #8f5bff 55%, #c86dd7 100%);
	border-radius: 32rpx; padding: 46rpx 30rpx; text-align: center; color: #fff;
	box-shadow: 0 14rpx 44rpx rgba(102,126,234,.42);
	position: relative; overflow: hidden;
}
.pass-card::before {
	content: ''; position: absolute; top: -60rpx; right: -50rpx;
	width: 220rpx; height: 220rpx; border-radius: 50%;
	background: radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,0));
}
.pass-badge {
	display: inline-block; background: rgba(255,255,255,.22);
	border-radius: 30rpx; padding: 8rpx 30rpx; font-size: 24rpx; letter-spacing: 4rpx;
}
.pass-creator { font-size: 24rpx; margin-top: 20rpx; opacity: .9; }
.pass-code { font-size: 76rpx; font-weight: bold; letter-spacing: 12rpx; margin: 16rpx 0; font-family: monospace; }
.pass-countdown { font-size: 26rpx; opacity: .9; }
.countdown-warn { color: #ffe082; font-weight: bold; }
.pass-meta { display: flex; justify-content: center; gap: 50rpx; margin-top: 30rpx; }
.meta-item { display: flex; flex-direction: column; align-items: center; }
.meta-num { font-size: 40rpx; font-weight: bold; }
.meta-label { font-size: 22rpx; opacity: .85; margin-top: 6rpx; }

.action-grid { display: flex; flex-wrap: wrap; gap: 18rpx; margin-top: 30rpx; }
.action-item {
	width: calc(50% - 9rpx); box-sizing: border-box;
	background: #fff; border-radius: 22rpx; padding: 30rpx 0; text-align: center;
	font-size: 28rpx; color: #4b3a8f; box-shadow: 0 6rpx 20rpx rgba(102,126,234,.10); border: none; line-height: 1.4;
	transition: transform .15s;
}
.action-item:active { transform: scale(.96); }
.action-share { line-height: 1.4; }
.share-tip { font-size: 24rpx; color: #8a86a8; text-align: center; margin-top: 24rpx; line-height: 1.6; }

/* 排行榜 */
.rank-summary { text-align: center; font-size: 26rpx; color: #666; margin-bottom: 20rpx; }
.rank-list { background: #fff; border-radius: 24rpx; overflow: hidden; }
.rank-item { display: flex; align-items: center; padding: 26rpx 30rpx; border-bottom: 2rpx solid #f2f2f7; }
.rank-item:last-child { border-bottom: none; }
.rank-me { background: #f3effe; }
.rank-no { width: 60rpx; height: 60rpx; border-radius: 50%; text-align: center; line-height: 60rpx; font-size: 26rpx; background: #eee; color: #666; margin-right: 22rpx; font-weight: bold; }
.no-1 { background: #ffd54f; color: #7a5a00; }
.no-2 { background: #cfd8dc; color: #455a64; }
.no-3 { background: #ffcc80; color: #8d5524; }
.rank-info { flex: 1; }
.rank-nick { font-size: 30rpx; color: #333; font-weight: 500; }
.rank-title { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.rank-score { font-size: 32rpx; font-weight: bold; color: #764ba2; }
.empty-tip { text-align: center; padding: 80rpx 0; color: #999; font-size: 28rpx; }

/* 我的考试入口 */
.mine-entry { display: flex; align-items: center; }
.mine-entry-icon { font-size: 46rpx; margin-right: 22rpx; }
.mine-entry-text { flex: 1; }
.mine-entry-title { font-size: 30rpx; font-weight: bold; color: #4b3a8f; }
.mine-entry-sub { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.mine-entry-arrow { font-size: 40rpx; color: #cfcfe0; }

/* 我的考试列表 */
.mine-tabs { display: flex; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 22rpx; }
.mine-tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #666; }
.mine-tab.tab-active { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; font-weight: bold; }
.my-item {
	display: flex; align-items: center; justify-content: space-between;
	background: #fff; border-radius: 22rpx; padding: 26rpx 28rpx; margin-bottom: 16rpx;
	box-shadow: 0 6rpx 20rpx rgba(102,126,234,.08);
}
.my-item:active { transform: scale(.99); }
.my-item-main { flex: 1; }
.my-code { font-size: 34rpx; font-weight: bold; color: #4b2f8f; letter-spacing: 3rpx; font-family: monospace; }
.my-line { font-size: 24rpx; color: #777; margin-top: 8rpx; }
.my-time { font-size: 22rpx; color: #bbb; margin-top: 6rpx; }
.my-item-right { display: flex; flex-direction: column; align-items: flex-end; }
.my-badge { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; }
.badge-live { background: #e8f5e9; color: #2e7d32; }
.badge-out { background: #f5f5f5; color: #aaa; }
.my-count { font-size: 22rpx; color: #999; margin-top: 10rpx; }
.my-score { font-size: 36rpx; font-weight: bold; }
.sc-pass { color: #2e7d32; }
.sc-fail { color: #c62828; }

/* 海报画布（移出可视区，仅绘制用） */
.poster-canvas {
	position: fixed;
	left: -9999px;
	top: 0;
	z-index: -1;
}

/* 海报预览弹层 */
.poster-mask {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(30,20,60,.6);
	display: flex; align-items: center; justify-content: center;
	z-index: 950;
}
.poster-body { width: 640rpx; display: flex; flex-direction: column; align-items: center; }
.poster-img {
	width: 100%; border-radius: 24rpx;
	box-shadow: 0 16rpx 60rpx rgba(0,0,0,.4);
	background: #fff;
}
.poster-btns { display: flex; gap: 24rpx; margin-top: 30rpx; width: 100%; }
.poster-btn {
	flex: 1; height: 84rpx; line-height: 84rpx; text-align: center;
	border-radius: 44rpx; font-size: 28rpx;
}
.poster-save { background: linear-gradient(135deg,#667eea,#764ba2); color: #fff; }
.poster-close { background: rgba(255,255,255,.18); color: #fff; }
.poster-hint { margin-top: 18rpx; font-size: 22rpx; color: rgba(255,255,255,.7); }

.loading-mask {
	position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
	background: rgba(0,0,0,.7); color: #fff; padding: 30rpx 50rpx; border-radius: 16rpx; font-size: 28rpx; z-index: 999;
}
</style>
