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
import { expressionForMood } from './look.js'
import { renderPet, CANVAS_W, CANVAS_H } from './renderer.js'

// 海报画布尺寸（竖版明信片；形象改为高个线条小人，高度相应加大）
const PW = 300
const PH = 500
// 形象在海报里的缩放与霓虹舞台底板尺寸
const PET_SCALE = 2
const PET_W = CANVAS_W * PET_SCALE
const PET_H = CANVAS_H * PET_SCALE
const STAGE_X = 20, STAGE_Y = 106, STAGE_W = PW - 40, STAGE_H = PET_H + 26

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

		/** 用旧版 canvas-context 合成明信片海报：背景/边框/文字/形象/水印 */
		drawPoster() {
			const p = this.postcard
			if (!p) return
			const ctx = uni.createCanvasContext('postcard', this)
			// 暂存并挂起 renderPet 内部的 draw，最后统一 flush
			const realDraw = ctx.draw
			ctx.draw = function () {}

			// 背景
			ctx.setFillStyle('#fff6fb')
			ctx.fillRect(0, 0, PW, PH)
			// 顶部色带
			ctx.setFillStyle('#ffe3ef')
			ctx.fillRect(0, 0, PW, 96)
			// 边框
			ctx.setStrokeStyle('#f0a6c8')
			ctx.setLineWidth(3)
			ctx.strokeRect(8, 8, PW - 16, PH - 16)

			// 标题 & 目的地（canvas fillText 不能渲染彩色 emoji，图标只保留在页面 DOM，这里用纯中文）
			ctx.setFillStyle('#b06ab3')
			ctx.setFontSize(16)
			ctx.fillText('杯蜜的旅行明信片', 24, 34)
			ctx.setFontSize(22)
			ctx.setFillStyle('#6a5acd')
			ctx.fillText(this.clean(p.placeName), 24, 70)

			// 霓虹舞台底板（线条形象在亮底上会看不清，给一块暗色底板）
			ctx.setFillStyle('#0d151c')
			ctx.fillRect(STAGE_X, STAGE_Y, STAGE_W, STAGE_H)
			ctx.setStrokeStyle('#2b3d4d')
			ctx.setLineWidth(1)
			ctx.strokeRect(STAGE_X, STAGE_Y, STAGE_W, STAGE_H)
			// 底板上的淡网格（对齐 ren.html 背景；透明度写进颜色，不用 setGlobalAlpha）
			ctx.setStrokeStyle('rgba(94, 234, 212, 0.08)')
			for (let gx = STAGE_X + 26; gx < STAGE_X + STAGE_W; gx += 26) ctx.drawLine(gx, STAGE_Y, gx, STAGE_Y + STAGE_H)
			for (let gy = STAGE_Y + 26; gy < STAGE_Y + STAGE_H; gy += 26) ctx.drawLine(STAGE_X, gy, STAGE_X + STAGE_W, gy)

			// 形象（在底板里居中，明信片为一次性绘制，不传 time 即静态帧）
			if (ctx.save) ctx.save()
			if (ctx.translate) ctx.translate(STAGE_X + (STAGE_W - PET_W) / 2, STAGE_Y + (STAGE_H - PET_H) / 2)
			renderPet(ctx, p.look, expressionForMood(p.mood), p.equippedItems || [], PET_SCALE)
			if (ctx.restore) ctx.restore()

			// 信息行
			let y = STAGE_Y + STAGE_H + 26
			ctx.setFontSize(14)
			ctx.setFillStyle('#666')
			ctx.fillText(`${this.clean(p.date || '')}  ·  ${this.clean(p.weather || '')}`, 24, y)
			y += 26
			const moodLabel = (MOOD_MAP[p.mood] || MOOD_MAP.normal).label
			ctx.fillText(`心情：${moodLabel}    花费：${p.cost || 0} 杯蜜币`, 24, y)
			y += 34

			// 正文（自动换行）
			ctx.setFontSize(15)
			ctx.setFillStyle('#555')
			y = this.wrapText(ctx, this.clean(p.card || ''), 24, y, PW - 48, 24)

			// 水印
			ctx.setFontSize(11)
			ctx.setFillStyle('#cc99aa')
			ctx.fillText('—— 来自电子杯蜜 · 数字闺蜜 ——', 24, PH - 22)

			// 恢复并一次性 flush
			ctx.draw = realDraw
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
