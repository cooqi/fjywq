<template>
	<view class="page">
		<view v-if="loading" class="center-tip">收拾行囊……</view>

		<view v-else>
			<!-- 正在旅行 -->
			<view v-if="traveling" class="card going">
				<view class="big">🎒</view>
				<view class="t">杯蜜正在「{{ placeName }}」旅行中……</view>
				<view class="cd">预计 {{ countdown }} 后回家</view>
				<button class="check-btn" @click="check">查看是否回来了</button>
			</view>

			<!-- 刚到站：明信片海报 -->
			<view v-else-if="postcard" class="card postcard">
				<view class="pc-title">📮 来自「{{ postcard.placeName }}」的明信片</view>
				<view class="poster-wrap">
					<canvas canvas-id="postcard" id="postcard" class="poster-canvas" :style="{ width: PW + 'px', height: PH + 'px' }"></canvas>
				</view>
				<view class="pc-actions">
					<button class="save-btn" @click="savePoster">保存到相册 ⬇️</button>
					<button class="share-btn" open-type="share">分享</button>
				</view>
				<button class="check-btn ghost" @click="resetToPick">收下啦～</button>
			</view>

			<!-- 选择目的地 -->
			<view v-else class="card">
				<view class="sec">选择目的地</view>
				<view class="sub">旅行会消耗杯蜜工资/杯蜜币，回来后寄一张明信片海报给你。生病、上班或睡觉时不能出发哦～</view>

				<view class="status-hint" :style="{ background: statusTone }">
					{{ statusEmoji }} {{ statusHint }}
				</view>

				<view class="place-row">
					<view v-for="p in places" :key="p.key" class="place" :class="{ on: pick === p.key }" @click="pick = pick === p.key ? '' : p.key">
						<text class="p-e">{{ p.emoji }}</text>
						<text class="p-n">{{ p.name }}</text>
						<text class="p-m">{{ Math.round(p.ms / 60000) }} 分钟 · {{ p.cost }}币</text>
					</view>
				</view>
				<button class="go-btn" @click="start">出发 🚏</button>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'
import { TRAVEL_PLACES, fmtCountdown, STATUS_MAP, MOOD_MAP } from './beemore.js'

// 海报画布尺寸（竖版明信片）
const PW = 300
const PH = 500

export default {
	data() {
		return {
			loading: true, userId: '', places: TRAVEL_PLACES, pick: '',
			traveling: false, placeName: '', endAt: 0, countdown: '', timer: null,
			postcard: null, pet: {},
			PW, PH
		}
	},
	computed: {
		status() { return this.pet.status || 'idle' },
		statusMeta() { return STATUS_MAP[this.status] || STATUS_MAP.idle },
		statusEmoji() { return this.statusMeta.emoji },
		statusTone() { return this.statusMeta.tone + '22' },
		statusHint() { return this.statusMeta.hint }
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.load()
	},
	onUnload() { this.stopTimer() },
	onShareAppMessage() {
		const p = this.postcard
		return { title: p ? `杯蜜从「${p.placeName}」寄回的明信片 ✉️` : '我的电子闺蜜去旅行啦', path: '/pages/game/loveQY/loveQY' }
	},
	onShareTimeline() {
		const p = this.postcard
		return { title: p ? `杯蜜从「${p.placeName}」寄回的明信片 ✉️` : '我的电子闺蜜去旅行啦' }
	},
	methods: {
		async load() {
			this.loading = true
			const st = await callBeemore({ action: 'getStatus', userId: this.userId })
			if (st.code === 0 && st.data && st.data.pet) this.pet = st.data.pet
			const res = await callBeemore({ action: 'travelCheck', userId: this.userId })
			if (res.code === 0 && res.data) this.applyState(res.data)
			this.loading = false
		},
		applyState(d) {
			if (d.arrived && d.postcard) {
				this.postcard = d.postcard
				this.traveling = false
				this.$nextTick(() => setTimeout(() => this.drawPoster(), 200))
			} else if (d.traveling) {
				this.traveling = true; this.placeName = d.placeName || '远方'
				this.endAt = Date.now() + d.remainMs; this.startTimer()
			} else {
				this.traveling = false
			}
		},
		startTimer() {
			this.stopTimer()
			const tick = () => {
				const remain = this.endAt - Date.now()
				this.countdown = fmtCountdown(remain)
				if (remain <= 0) { this.stopTimer(); this.check() }
			}
			tick()
			this.timer = setInterval(tick, 1000)
		},
		stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null } },
		resetToPick() { this.postcard = null; this.pick = '' },

		/** 出发：生病/睡觉禁止；工作且未请假 -> 引导请假 / 坚持则记旷工 */
		async start() {
			if (this.pet.mood === 'sick') {
				uni.showToast({ title: '杯蜜生病啦，先去诊所调养吧', icon: 'none' }); return
			}
			if (this.status === 'sleeping') {
				uni.showToast({ title: '杯蜜睡着了，旅行等她醒来再说吧', icon: 'none' }); return
			}
			if (this.status === 'working') {
				// 请假按“今天请过假”认定（请假只覆盖今日上班时间，下班后 endAt 已过但仍算请过假）
				const d = new Date()
				const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
				const onLeave = (this.pet.leaveLog || []).some(l => l && l.date === today)
				if (!onLeave) {
					const canSick = this.pet.mood === 'sick'
					const idx = await this.promptLeave(canSick)
					if (idx === 0) return this.doLeave('personal')
					if (idx === 1) {
						// 病假需真的生病才能请
						if (!canSick) { uni.showToast({ title: '杯蜜没生病，不能请病假哦～', icon: 'none' }); return }
						return this.doLeave('sick')
					}
					if (idx === 2) return this.doTravel() // 坚持旅行=旷工
					return // 取消
				}
				return this.doTravel()
			}
			this.doTravel()
		},
		promptLeave(canSick) {
			return new Promise((resolve) => {
				uni.showActionSheet({
					itemList: ['请事假后出发（当场扣点钱）', canSick ? '请病假后出发（不扣钱）' : '请病假（需生病才能请）', '坚持去旅行（记旷工无工资）', '先不去了'],
					success: (r) => resolve(r.tapIndex),
					fail: () => resolve(-1)
				})
			})
		},
		async doLeave(type) {
			const res = await callBeemore({ action: 'applyLeave', userId: this.userId, type, hours: 4, reason: '想去旅行' })
			if (res.code === 0) { uni.showToast({ title: '请假成功，出发～', icon: 'none' }); this.doTravel() }
			else uni.showToast({ title: res.message || '请假失败', icon: 'none' })
		},
		async doTravel() {
			const res = await callBeemore({ action: 'travel', userId: this.userId, placeKey: this.pick })
			if (res.code === 0 && res.data && res.data.travel) {
				const t = res.data.travel
				this.traveling = true
				this.placeName = t.placeName
				this.endAt = t.endAt
				this.startTimer()
				uni.showToast({ title: res.message || '出发啦～', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || '暂时出不了门', icon: 'none' })
			}
		},
		async check() {
			const res = await callBeemore({ action: 'travelCheck', userId: this.userId })
			if (res.code === 0 && res.data) this.applyState(res.data)
		},

		/** 合成明信片海报：失败时把原因显示出来，不要静默空白 */
		drawPoster() {
			const p = this.postcard
			if (!p) return
			try {
				this.paintPoster(p)
			} catch (e) {
				console.error('明信片绘制失败', e)
				uni.showToast({ title: '明信片绘制失败：' + ((e && (e.errMsg || e.message)) || '未知错误'), icon: 'none' })
			}
		},
		paintPoster(p) {
			// 只用实测可靠的基础 API（fillRect/strokeRect/fillText + 样式设置），
			// 不用 drawCircle/drawArc/drawLine/measureText（部分运行时旧 CanvasContext 无这些方法）
			const ctx = uni.createCanvasContext('postcard', this)
			const mood = MOOD_MAP[p.mood] || MOOD_MAP.normal
			const place = this.clean(p.placeName)

			// === 底色：米白纸面 + 双线框 ===
			ctx.setFillStyle('#fffaf6')
			ctx.fillRect(0, 0, PW, PH)
			ctx.setStrokeStyle('#f0a6c8')
			ctx.setLineWidth(3)
			ctx.strokeRect(8, 8, PW - 16, PH - 16)
			ctx.setStrokeStyle('#f6cfe0')
			ctx.setLineWidth(1)
			ctx.strokeRect(13, 13, PW - 26, PH - 26)

			// === 刊头：英文标签 + 目的地 + 日期天气 ===
			ctx.setFontSize(10)
			ctx.setFillStyle('#c79bb2')
			ctx.fillText('BEEMORE TRAVEL POSTCARD', 26, 36)
			ctx.setFontSize(21)
			ctx.setFillStyle('#6a5acd')
			ctx.fillText('「' + place + '」', 26, 64)
			ctx.setFontSize(11)
			ctx.setFillStyle('#a08ab0')
			ctx.fillText(`${this.clean(p.date || '')} · ${this.clean(p.weather || '')}`, 26, 84)

			// === 右上角邮票 + 邮戳横线 ===
			ctx.setFillStyle('#ffffff')
			ctx.fillRect(PW - 66, 22, 44, 54)
			ctx.setStrokeStyle('#cc99aa')
			ctx.setLineWidth(2)
			ctx.strokeRect(PW - 66, 22, 44, 54)
			ctx.setStrokeStyle('#e3bcd0')
			ctx.setLineWidth(1)
			ctx.strokeRect(PW - 61, 27, 34, 44)
			ctx.setFontSize(9)
			ctx.setFillStyle('#b06ab3')
			ctx.fillText('杯蜜邮政', PW - 58, 45)
			ctx.setFontSize(13)
			ctx.fillText('80分', PW - 54, 66)
			// 邮戳双横线（压过邮票左缘）
			ctx.setFillStyle('#b9a6c9')
			ctx.fillRect(PW - 76, 34, 54, 2)
			ctx.fillRect(PW - 76, 41, 54, 2)

			// === 插画区（白卡纸留边 + 粉底内框）===
			ctx.setFillStyle('#ffffff')
			ctx.fillRect(22, 94, PW - 44, 172)
			ctx.setFillStyle('#fdf0f6')
			ctx.fillRect(30, 102, PW - 60, 156)
			ctx.setStrokeStyle('#f0a6c8')
			ctx.setLineWidth(1)
			ctx.strokeRect(30, 102, PW - 60, 156)

			// 主视觉：居中大号心情颜文字（按字符数估宽居中，CJK 字宽≈字号）
			ctx.setFontSize(34)
			ctx.setFillStyle('#6a5acd')
			const faceW = mood.face.length * 34 * 0.62
			ctx.fillText(mood.face, (PW - faceW) / 2, 178)
			// 插画下方小字
			ctx.setFontSize(11)
			ctx.setFillStyle('#b06ab3')
			const cap = '来自『' + place + '』的你'
			ctx.fillText(cap, (PW - cap.length * 11) / 2, 246)

			// === TO 收件区（书写线用实心细矩形）===
			ctx.setFontSize(12)
			ctx.setFillStyle('#8a6a9a')
			ctx.fillText('TO：亲爱的你', 26, 288)
			ctx.setFillStyle('#f0c6da')
			ctx.fillRect(26, 298, PW - 52, 2)
			ctx.fillRect(26, 316, PW - 52, 2)

			// === 信息 + 正文 ===
			ctx.setFontSize(11)
			ctx.setFillStyle('#999999')
			ctx.fillText(`心情：${mood.label}    花费：${p.cost || 0} 杯蜜币`, 26, 338)
			ctx.setFontSize(14)
			ctx.setFillStyle('#555555')
			this.wrapText(ctx, this.clean(p.card || ''), 26, 362, PW - 52, 24)

			// === 底部：条码 + 纪念章 + 水印 ===
			// 条码：目的地+日期做种子，确定性生成疏密条纹
			const seed = String(p.placeName || '') + String(p.date || '')
			let bx = 26
			ctx.setFillStyle('#9c7aa8')
			for (let i = 0; i < 30 && bx < 146; i++) {
				const code = (seed.charCodeAt(i % Math.max(1, seed.length)) || 7) + i * 7
				const w = 1 + (code % 3)
				ctx.fillRect(bx, 430, w, 24)
				bx += w + 1 + (code % 3)
			}
			// 旅行已核销纪念章（红色方框叠在条码右侧）
			ctx.setStrokeStyle('#e0607a')
			ctx.setLineWidth(2)
			ctx.strokeRect(PW - 72, 420, 46, 42)
			ctx.setFontSize(11)
			ctx.setFillStyle('#e0607a')
			ctx.fillText('旅行', PW - 66, 438)
			ctx.fillText('已核销', PW - 66, 454)
			// 水印
			ctx.setFontSize(10)
			ctx.setFillStyle('#c79bb2')
			ctx.fillText('—— 来自电子杯蜜 · 数字闺蜜 ——', 26, PH - 24)

			// 一次性 flush 整帧
			ctx.draw()
		},
		/** 去掉 emoji/变体选择符/ZWJ：小程序 canvas fillText 无法渲染彩色 emoji，会画成方块/空白 */
		clean(s) {
			return String(s == null ? '' : s)
				.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{3030}\u{303D}]/gu, '')
				.replace(/\s{2,}/g, ' ')
				.trim()
		},
		wrapText(ctx, text, x, y, maxW, lh) {
			const chars = String(text).split('')
			let line = ''
			for (const ch of chars) {
				const test = line + ch
				// 粗略按字宽估算：中文约等于字号
				if (test.length * 15 > maxW) {
					ctx.fillText(line, x, y)
					y += lh
					line = ch
				} else {
					line = test
				}
			}
			if (line) ctx.fillText(line, x, y)
			return y
		},

		savePoster() {
			uni.canvasToTempFilePath({
				canvasId: 'postcard',
				width: PW, height: PH,
				destWidth: PW * 2, destHeight: PH * 2,
				success: (res) => {
					uni.saveImageToPhotosAlbum({
						filePath: res.tempFilePath,
						success: () => uni.showToast({ title: '明信片已保存到相册', icon: 'none' }),
						fail: (e) => this.handleSaveFail(e, res.tempFilePath)
					})
				},
				fail: () => uni.showToast({ title: '生成图片失败', icon: 'none' })
			}, this)
		},
		handleSaveFail(e, filePath) {
			const msg = (e && e.errMsg) || ''
			if (msg.indexOf('auth') > -1 || msg.indexOf('deny') > -1) {
				uni.showModal({
					title: '需要相册权限',
					content: '保存明信片需要访问相册，去设置里开启一下？',
					confirmText: '去设置',
					success: (r) => { if (r.confirm && uni.openSetting) uni.openSetting() }
				})
			} else {
				// 降级：至少预览，用户可长按保存
				uni.previewImage({ urls: [filePath] })
			}
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.card { background: #fff; border-radius: 18px; padding: 18px 16px; }
.sec { font-size: 16px; font-weight: bold; color: #6a5acd; }
.sub { font-size: 12px; color: #999; margin: 8px 0 12px; }
.status-hint { font-size: 12px; color: #6a5acd; padding: 8px 12px; border-radius: 10px; margin-bottom: 12px; }
.going { text-align: center; }
.big { font-size: 60px; }
.t { font-size: 15px; color: #555; margin-top: 8px; }
.cd { font-size: 20px; color: #6a5acd; font-weight: bold; margin: 12px 0; }
.check-btn { background: #6a5acd; color: #fff; border-radius: 12px; font-size: 15px; margin-top: 8px; }
.check-btn.ghost { background: #f0ebff; color: #6a5acd; }
.place-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.place { background: #f6f3ff; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: center; }
.place.on { box-shadow: 0 0 0 2px #b79cff inset; background: #efe6ff; }
.p-e { font-size: 30px; }
.p-n { font-size: 14px; color: #444; margin-top: 6px; font-weight: bold; }
.p-m { font-size: 11px; color: #999; margin-top: 2px; }
.go-btn { background: linear-gradient(135deg, #7f9cf5, #b06ab3); color: #fff; border-radius: 14px; font-size: 16px; margin-top: 16px; }
.postcard { background: linear-gradient(160deg, #fff7e6, #ffeef5); }
.pc-title { font-size: 15px; font-weight: bold; color: #b06ab3; margin-bottom: 12px; }
.poster-wrap { display: flex; justify-content: center; }
.poster-canvas { border-radius: 12px; box-shadow: 0 6px 18px rgba(176, 106, 179, 0.25); }
.pc-actions { display: flex; gap: 10px; margin-top: 14px; }
.save-btn { flex: 1; background: #6a5acd; color: #fff; border-radius: 12px; font-size: 14px; }
.share-btn { flex: 1; background: #ff8a8a; color: #fff; border-radius: 12px; font-size: 14px; }
</style>
