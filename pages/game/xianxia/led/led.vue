<template>
	<view class="led-root" @tap="onRootTap">
		<view class="rotator" :class="{ landscape: isLandscape }"
			:style="isLandscape ? { width: winH + 'px', height: winW + 'px' } : {}"
			@touchstart="onTouchStart" @touchmove.stop="onTouchMove" @touchend="onTouchEnd"
			@touchcancel="onTouchEnd">
			<!-- 预览区 -->
			<view class="preview" :style="{ height: previewH + 'px' }">
				<!-- 经典模式：CSS 光晕 + 跑马灯 -->
				<view v-if="mode === 'classic'" class="classic-box">
					<view v-if="marqueeOn" :class="isMarquee ? ('marquee marquee-' + direction) : 'classic-static'">
						<view class="classic-text" :style="classicStyle">
							<view class="ct-line" v-for="(l, i) in textLines" :key="i">{{ l }}</view>
						</view>
					</view>
				</view>
				<!-- 点阵 LED 模式：canvas 绘制 -->
				<canvas v-else canvas-id="ledDisplay" id="ledDisplay" class="led-canvas"
					:style="{ width: canvasW + 'px', height: canvasH + 'px' }" :disable-scroll="true"></canvas>
			</view>

			<!-- 双指缩放时的字号提示 -->
			<view class="pinch-hint" v-if="pinchHint">字号 {{ fontSize }}</view>

			<!-- 横屏模式下的浮动切换按钮 -->
			<view class="float-rotate" v-if="isLandscape" @tap.stop="toggleLandscape">↩</view>
		</view>

		<!-- 控制面板（点屏幕可唤出/收起） -->
		<view class="panel" :class="{ 'panel-ls': isLandscape }" v-if="showPanel" @tap.stop>
			<view class="panel-row">
				<textarea class="led-input" v-model="inputText" @input="onTextInput" :maxlength="30"
					placeholder="输入应援文字（最多 30 字，可换行）" auto-height />
				<text class="collapse-btn" @tap="showPanel = false">收起 ▾</text>
			</view>

			<view class="seg-row">
				<view class="seg" :class="{ active: mode === 'classic' }" @tap="setMode('classic')">经典滚动</view>
				<view class="seg" :class="{ active: mode === 'led' }" @tap="setMode('led')">点阵LED</view>
				<view class="seg seg-mini" @tap="toggleLandscape">{{ isLandscape ? '竖屏' : '横屏' }}</view>
			</view>

			<view class="slider-row">
				<text class="s-label">字号</text>
				<slider class="s-slider" :value="fontSize" :min="10" :max="40" :block-size="16" activeColor="#fa709a" @changing="onNum" @change="onNum" />
				<text class="s-val">{{ fontSize }}</text>
			</view>
			<view class="slider-row">
				<text class="s-label">字重</text>
				<slider class="s-slider" :value="fontWeight" :min="100" :max="900" :step="100" :block-size="16" activeColor="#fa709a" @changing="onWeight" @change="onWeight" />
				<text class="s-val">{{ fontWeight }}</text>
			</view>
			<view class="slider-row">
				<text class="s-label">速度</text>
				<slider class="s-slider" :value="speed" :min="0" :max="100" :block-size="16" activeColor="#fa709a" @changing="onSpeed" @change="onSpeed" />
				<text class="s-val">{{ speedLabel }}</text>
			</view>
			<view class="slider-row">
				<text class="s-label">光晕</text>
				<slider class="s-slider" :value="glow" :min="0" :max="100" :block-size="16" activeColor="#fa709a" @changing="onGlow" @change="onGlow" />
				<text class="s-val">{{ glow }}%</text>
			</view>

			<view class="seg-row">
				<view class="seg" :class="{ active: direction === 'left' }" @tap="setDirection('left')">← 向左</view>
				<view class="seg" :class="{ active: direction === 'right' }" @tap="setDirection('right')">向右 →</view>
				<view class="seg" :class="{ active: direction === 'static' }" @tap="setDirection('static')">静止</view>
			</view>

			<view class="color-row">
				<view v-for="c in presetColors" :key="c" class="swatch" :class="{ active: color === c }"
					:style="{ background: c }" @tap="pickColor(c)"></view>
				<view class="swatch custom" :class="{ active: customActive }" @tap="pickCustomColor">{{ customOn ? '✓' : '✚' }}</view>
			</view>

			<view class="decor-row">
				<text class="decor-tip">✦ 点击插入装饰符号</text>
				<view class="decor-list">
					<text class="decor-item" v-for="(s, i) in decorSymbols" :key="i" @tap="appendDecor(s)">{{ s }}</text>
				</view>
			</view>

			<view class="btn-row">
				<!-- #ifdef MP-WEIXIN -->
				<button class="save-btn" :disabled="saving" @tap="saveToAlbum">{{ saving ? '保存中...' : '💾 保存到相册' }}</button>
				<!-- #endif -->
			</view>
		</view>

		<!-- 离屏画布：点阵采样 / 高清导出（仅点阵与保存时使用，移到屏外） -->
		<canvas canvas-id="ledSample" id="ledSample" class="off-canvas"
			:style="{ width: sampleW + 'px', height: sampleH + 'px' }"></canvas>
		<!-- #ifdef MP-WEIXIN -->
		<canvas canvas-id="ledExport" id="ledExport" class="off-canvas"
			:style="{ width: exportW + 'px', height: exportH + 'px' }"></canvas>
		<!-- #endif -->
	</view>
</template>

<script>
const STORE_KEY = 'lightboard_config'
const PRESETS = ['#ff2d78', '#ff9500', '#ffe13c', '#4dff88', '#00e5ff', '#4d7cff', '#d685ff', '#f5f5f5']
// 仅过滤真彩色 emoji（点阵无法渲染图形表情）；保留 ♥♡✦✧★☆○●/| 等单色符号供点阵采样
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu
const EMOJI_TEST = /[\u{1F000}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}]/u
// 装饰符号快捷插入（点阵可采样为发光点阵图形）
const DECORS = ['♥', '♡', '✦', '✧', '★', '☆', '○', '●', '/', '|', '♪', '✿']

export default {
	data() {
		return {
			inputText: '生日快乐',
			mode: 'classic', // classic | led
			fontSize: 19,
			fontWeight: 700,
			speed: 50,
			direction: 'left', // left | right | static
			color: '#ff2d78',
			glow: 60,
			marqueeOn: true,
			isLandscape: false,
			showPanel: true,
			presetColors: PRESETS,
			decorSymbols: DECORS,
			customColor: '#ff65a3',
			customOn: false,
			saving: false,
			pinchHint: false,
			// canvas 尺寸
			sampleW: 300, sampleH: 24,
			winW: 375, winH: 667,
			dpr: 2, lowPerf: false
		}
	},
	created() {
		// 点阵运行时参数挂普通实例属性，避免响应式开销（热循环每帧写 this._off）
		this.ledTimer = null
		this.sampleTimer = null
		this._led = null        // { rows, cols, gw }
		this._ledCfg = ''       // 采样缓存键
		this._off = 0           // 滚动偏移
		this._vel = 1           // 每帧速度
		this._last = 0          // 帧控时间戳
		this._skipShadow = false
		this._pinching = false
		this._pinchStart = 0
		this._pinchFont = 19
		this._emojiTiped = false
	},
	computed: {
		textContent() {
			// 点阵模式在渲染层过滤 emoji（输入保留原样，仅提示一次）
			if (this.mode === 'led') return this.inputText.replace(EMOJI_RE, '')
			return this.inputText
		},
		textLines() {
			const lines = (this.textContent || '').split('\n')
			const show = lines.map(l => (l === '' && lines.length === 1 ? '默认：生日快乐' : l))
			return show
		},
		ledLines() {
			return (this.textContent || '').split('\n').filter(l => l.trim() !== '')
		},
		gridSize() {
			if (this.fontSize >= 28 && !this.lowPerf) return 24
			return 16
		},
		dotPx() {
			const base = 2 + (this.fontSize - 10) * 4 / 30
			const s = Math.round(base * this.dpr)
			return Math.max(2, Math.min(12, s))
		},
		pitch() { return this.dotPx + this.gapPx },
		isMarquee() { return this.direction !== 'static' && this.speed > 2 },
		marqueeKey() {
			return [this.direction, Math.round(this.duration * 10), this.textContent.length, this.mode].join('-')
		},
		duration() { return Math.max(2.5, 24 - this.speed * 0.2) },
		speedLabel() {
			if (this.direction === 'static' || this.speed <= 2) return '静止'
			if (this.speed < 34) return '慢'
			if (this.speed < 67) return '中'
			return '快'
		},
		classicStyle() {
			const g = this.glow / 100
			const rgb = this.hexRgb(this.color)
			const blur = Math.round(this.fontSize * 0.4 + this.fontSize * g * 1.6)
			const blur2 = Math.round(blur * 2.2)
			const blur3 = Math.round(blur * 3.6)
			const shadow = g > 0.02
				? `0 0 ${blur}px rgba(${rgb},${0.9 * g}), 0 0 ${blur2}px rgba(${rgb},${0.55 * g}), 0 0 ${blur3}px rgba(${rgb},${0.3 * g})`
				: 'none'
			return {
				fontSize: this.fontSize + 'px',
				fontWeight: this.fontWeight,
				color: this.color,
				textShadow: shadow,
				animationDuration: this.duration + 's'
			}
		},
		customActive() { return this.customOn },
		previewH() {
			if (this.isLandscape) return this.winH - 12
			return this.showPanel ? Math.round(this.winH * 0.44) : this.winH - 12
		},
		canvasW() { return this.isLandscape ? this.winH - 12 : this.winW },
		canvasH() { return this.previewH },
		gapPx() { return this.dotPx * 0.6 },
		rowGapPx() {
			let rg = this.dotPx * 1.6
			const led = this._led
			const L = led ? led.rows.length : 1
			if (rg > 2 && L > 1 && L * this.dotPx * 2 + (L - 1) * rg > this.canvasH - 10) rg = Math.max(1, (this.canvasH - 10 - L * this.dotPx * 2) / (L - 1))
			return rg
		},
		textW() {
			const led = this._led
			if (!led) return 0
			return led.cols * (this.dotPx + this.gapPx)
		},
		exportW() { return Math.round(this.canvasW * 2) },
		exportH() { return Math.round(this.canvasH * 2) }
	},
	onLoad() {
		const si = uni.getSystemInfoSync()
		this.winW = si.windowWidth || 375
		this.winH = si.windowHeight || 667
		this.dpr = si.pixelRatio || 2
		this.lowPerf = false
		// #ifdef MP-WEIXIN
		if (si.platform === 'android' && si.benchmarkLevel !== undefined && si.benchmarkLevel < 25) this.lowPerf = true
		// #endif
		this.loadConfig()
		// #ifdef MP-WEIXIN
		try { uni.setKeepScreenOn({ keepScreenOn: true }) } catch (e) {}
		// #endif
	},
	onUnload() {
		this.saveConfig()
		this.stopLed()
		if (this.sampleTimer) clearTimeout(this.sampleTimer)
	},
	methods: {
		hexRgb(hex) {
			const h = (hex || '').replace('#', '')
			if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)].join(',')
			if (h.length >= 6) return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)].join(',')
			return '255,255,255'
		},
		onTextInput(e) {
			const v = (e.detail && e.detail.value) || ''
			if (v.length >= 30) uni.showToast({ title: '最多 30 字', icon: 'none' })
			if (this.mode === 'led' && EMOJI_TEST.test(v)) {
				if (!this._emojiTiped) {
					uni.showToast({ title: '点阵模式不支持彩色表情', icon: 'none' })
					this._emojiTiped = true
				}
			}
		},
		appendDecor(sym) {
			if ((this.inputText || '').length >= 30) { uni.showToast({ title: '最多 30 字', icon: 'none' }); return }
			this.inputText = (this.inputText + sym).slice(0, 30)
		},
		setMode(m) {
			if (this.mode === m) return
			this.mode = m
			this.rebuild()
		},
		setDirection(d) { this.direction = d; this.rebuild() },
		onNum(v) {
			this.fontSize = parseInt(v.detail.value)
			if (this.mode === 'led') this.scheduleRebuild()
		},
		onWeight(v) { this.fontWeight = parseInt(v.detail.value) },
		onSpeed(v) { this.speed = parseInt(v.detail.value); this.restartMarquee(); this.restartLed() },
		onGlow(v) {
			this.glow = parseInt(v.detail.value)
			if (this.mode === 'led') this.restartLed()
		},
		pickColor(c) {
			this.customOn = false
			this.color = c
			if (this.mode === 'led') this.restartLed()
		},
		pickCustomColor() {
			uni.showModal({
				title: '自定义颜色',
				editable: true,
				placeholderText: '输入色值，如 FF65A3',
				success: r => {
					if (!r.confirm) return
					let c = (r.content || '').trim().replace(/^#?/i, '#')
					if (!/^#[0-9a-fA-F]{6}$/.test(c) && !/^#[0-9a-fA-F]{3}$/.test(c)) {
						uni.showToast({ title: '色值格式不正确', icon: 'none' })
						return
					}
					this.color = c
					this.customOn = true
					this.customColor = c
					if (this.mode === 'led') this.restartLed()
				}
			})
		},
		toggleLandscape() {
			this.isLandscape = !this.isLandscape
			if (this.isLandscape) this.showPanel = false
			this.$nextTick(() => this.rebuild())
		},
		onRootTap() {
			// 横屏沉浸模式：点屏幕切换面板
			if (this.isLandscape) this.showPanel = !this.showPanel
		},
		/* ===== 双指捏合缩放 ===== */
		onTouchStart(e) {
			if (e.touches.length === 2) {
				this._pinching = true
				this._pinchStart = this.getDistance(e.touches[0], e.touches[1])
				this._pinchFont = this.fontSize
				this.pinchHint = true
				this.stopLed()
			}
		},
		onTouchMove(e) {
			if (this._pinching && e.touches.length === 2) {
				const d = this.getDistance(e.touches[0], e.touches[1])
				if (this._pinchStart > 0) {
					let s = Math.round(this._pinchFont * d / this._pinchStart)
					this.fontSize = Math.max(10, Math.min(40, s))
				}
			}
		},
		onTouchEnd(e) {
			if (this._pinching && (!e.touches || e.touches.length < 2)) {
				this._pinching = false
				this.pinchHint = false
				if (this.mode === 'led') this.scheduleRebuild(100)
				else this.restartMarquee()
			}
		},
		getDistance(p1, p2) {
			const ax = p1.clientX !== undefined ? p1.clientX : p1.x
			const ay = p1.clientY !== undefined ? p1.clientY : p1.y
			const bx = p2.clientX !== undefined ? p2.clientX : p2.x
			const by = p2.clientY !== undefined ? p2.clientY : p2.y
			const dx = ax - bx, dy = ay - by
			return Math.sqrt(dx * dx + dy * dy)
		},
		/* ===== 经典模式重排 ===== */
		restartMarquee() {
			// wxml 普通节点不支持动态 key 重建，用 v-if 销毁再重建以重启 CSS 动画
			this.marqueeOn = false
			this.$nextTick(() => { this.marqueeOn = true })
		},
		/* ===== 点阵模式重启（不重新采样） ===== */
		restartLed() {
			if (this.mode !== 'led') return
			this.stopLed()
			this.startLed()
		},
		rebuild() {
			if (this.mode === 'led') this.scheduleRebuild()
			else this.stopLed()
		},
		scheduleRebuild(delay) {
			if (this.sampleTimer) clearTimeout(this.sampleTimer)
			this.sampleTimer = setTimeout(() => this.sampleLed(), delay || 250)
			if (this.mode === 'led') this.stopLed()
		},
		/* ===== 点阵采样缓存键 ===== */
		sampleKey() {
			const lines = this.ledLines.length ? this.ledLines : ['默认']
			return lines.join('') + '|' + this.gridSize
		},
		/* ===== 点阵采样：文字 → 像素 → 二维点阵 ===== */
		sampleLed(autoStart) {
			if (this.mode !== 'led') return Promise.resolve()
			const lines = this.ledLines.length ? this.ledLines : ['默认']
			const gw = this.gridSize
			const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 1)
			this.sampleW = Math.ceil(maxLen * gw) + 2
			this.sampleH = lines.length * gw + 2
			const ctx = uni.createCanvasContext('ledSample', this)
			ctx.setFillStyle('#000000')
			ctx.fillRect(0, 0, this.sampleW, this.sampleH)
			ctx.setFontSize(Math.round(gw * 0.86))
			try { ctx.setFontWeight('bold') } catch (e) {}
			ctx.setFillStyle('#ffffff')
			ctx.setTextAlign('center')
			ctx.setTextBaseline('top')
			// 整行居中绘入，多行纵向堆叠（修复旧版逐行居中到 x≈gw/2 导致的左侧裁切）
			lines.forEach((line, li) => ctx.fillText(line, this.sampleW / 2, li * gw + 1))
			return new Promise(resolve => {
				ctx.draw(false, () => {
					uni.canvasGetImageData({
						canvasId: 'ledSample', x: 0, y: 0, width: this.sampleW, height: this.sampleH,
						success: r => {
							const rows = []
							for (let y = 0; y < this.sampleH; y++) {
								let row = ''
								for (let x = 0; x < this.sampleW; x++) {
									const a = r.data[(y * this.sampleW + x) * 4 + 3]
									row += a > 90 ? '1' : '0'
								}
								rows.push(row)
							}
							this._led = { rows, cols: this.sampleW, gw }
							this._ledCfg = this.sampleKey()
							if (autoStart !== false) this.startLed()
							resolve()
						},
						fail: () => {
							this._led = null
							uni.showToast({ title: '点阵采样失败，请重试', icon: 'none' })
							resolve()
						}
					})
				})
			})
		},
		/* ===== 点阵滚动渲染 ===== */
		startLed() {
			this.stopLed()
			if (this.mode !== 'led' || this._pinching) return
			if (!this._led || this._ledCfg !== this.sampleKey()) {
				this.sampleLed(false)
				return
			}
			this._off = 0
			const speedMap = { 16: 1.4, 24: 1.1 }
			this._vel = (0.5 + (this.speed / 100) * 2.6) * (speedMap[this.gridSize] || 1.4)
			if (this.direction === 'right') this._off = this.canvasW - this.textW
			this._skipShadow = this._led.rows.join('').split('1').length > 1500
			this._last = Date.now()
			this.ledTimer = setInterval(() => this.ledTick(), 30)
		},
		stopLed() {
			if (this.ledTimer) { clearInterval(this.ledTimer); this.ledTimer = null }
		},
		ledTick() {
			if (!this._led) return
			if (Date.now() - this._last < 20) return
			this._last = Date.now()
			if (this.direction !== 'static' && this.speed > 2) {
				this._off += (this.direction === 'right' ? 1 : -1) * this._vel
				const mod = this.textW + this.gapPx
				this._off = ((this._off % mod) + mod) % mod
			} else {
				this._off = Math.max(0, (this.canvasW - this.textW) / 2)
			}
			this.drawLed(this._off)
		},
		drawLed(offsetX) {
			const led = this._led
			if (!led) return
			const ctx = uni.createCanvasContext('ledDisplay', this)
			ctx.setFillStyle('#05050c')
			ctx.fillRect(0, 0, this.canvasW, this.canvasH)
			const pitch = this.pitch
			this.drawGrid(ctx, this.canvasW, this.canvasH, pitch)
			const baseY = Math.max(2, (this.canvasH - led.rows.length * pitch) / 2)
			this.drawDots(ctx, led, this.dotPx, pitch, pitch, baseY, (offsetX || 0) - pitch, 2, this.canvasW)
			this.drawDots(ctx, led, this.dotPx, pitch, pitch, baseY, (offsetX || 0) + this.canvasW, 1, this.canvasW)
			ctx.draw()
		},
		/* 满屏暗点阵底纹（未点亮 LED），模拟真实灯牌屏 */
		drawGrid(ctx, W, H, pitch) {
			if (this.lowPerf) return
			const s = Math.max(1, pitch * 0.18)
			ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
			ctx.setFillStyle('rgba(255,255,255,0.055)')
			for (let y = pitch / 2; y < H; y += pitch) {
				for (let x = pitch / 2; x < W; x += pitch) {
					ctx.fillRect(x - s / 2, y - s / 2, s, s)
				}
			}
		},
		drawDots(ctx, led, dot, cellW, cellH, baseY, sx, copies, vw) {
			const W = vw || this.canvasW
			const w = cellW * led.cols
			if (sx > W || sx + w * copies < 0) return
			const rgb = this.hexRgb(this.color)
			const g = this.glow / 100
			const lit = !this._skipShadow
			// 光晕层（大半径半透明）
			if (g > 0.18 && lit) {
				ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
				ctx.setFillStyle('rgba(' + rgb + ',' + (0.20 * g).toFixed(3) + ')')
				for (let k = 0; k < copies; k++) {
					const baseX = sx + k * w
					if (baseX > W || baseX + w < 0) continue
					for (let r = 0; r < led.rows.length; r++) {
						const row = led.rows[r]
						const y = baseY + r * cellH + cellH / 2
						for (let c = 0; c < led.cols; c++) {
							if (row.charCodeAt(c) !== 49) continue
							const x = baseX + c * cellW + cellW / 2
							if (x < -dot * 2 || x > W + dot * 2) continue
							ctx.beginPath()
							ctx.arc(x, y, dot * 1.35, 0, Math.PI * 2)
							ctx.fill()
						}
					}
				}
			}
			// 核心层（实色 + 阴影辉光）
			ctx.setFillStyle(this.color)
			if (g > 0.08 && lit && dot >= 3) {
				ctx.setShadow(0, 0, g * dot * 3.2, this.color)
			} else {
				ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
			}
			for (let k = 0; k < copies; k++) {
				const baseX = sx + k * w
				if (baseX > W || baseX + w < 0) continue
				for (let r = 0; r < led.rows.length; r++) {
					const row = led.rows[r]
					const y = baseY + r * cellH + cellH / 2
					for (let c = 0; c < led.cols; c++) {
						if (row.charCodeAt(c) !== 49) continue
						const x = baseX + c * cellW + cellW / 2
						if (x < -dot || x > W + dot) continue
						ctx.beginPath()
						ctx.arc(x, y, dot / 2, 0, Math.PI * 2)
						ctx.fill()
					}
				}
			}
			ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
		},
		/* ===== 保存到相册（仅微信小程序） ===== */
		saveToAlbum() {
			if (this.saving) return
			this.saving = true
			uni.showLoading({ title: '生成图片中' })
			this.$nextTick(() => {
				this.doExport()
					.then(() => { uni.hideLoading(); uni.showToast({ title: '已保存到相册', icon: 'success' }) })
					.catch(err => {
						uni.hideLoading()
						const msg = (err && (err.errMsg || err.message)) || ''
						if (msg.indexOf('auth') > -1 || msg.indexOf('deny') > -1 || msg.indexOf('denied') > -1) {
							uni.showModal({
								title: '提示', content: '需要您授权保存图片到相册，是否去设置？',
								success: r => { if (r.confirm) uni.openSetting() }
							})
						} else {
							uni.showToast({ title: '保存失败：' + (msg || '未知错误'), icon: 'none' })
						}
					})
					.finally(() => { this.saving = false })
			})
		},
		doExport() {
			// #ifndef MP-WEIXIN
			return Promise.reject(new Error('请在小程序中保存'))
			// #endif
			// #ifdef MP-WEIXIN
			this.stopLed()
			const W = this.exportW, H = this.exportH
			return new Promise((resolve, reject) => {
				const ctx = uni.createCanvasContext('ledExport', this)
				ctx.setFillStyle('#05050c')
				ctx.fillRect(0, 0, W, H)
				let p = Promise.resolve()
				if (this.mode === 'led') {
					if (!this._led || this._ledCfg !== this.sampleKey()) {
						p = this.sampleLed(false).then(() => { this.stopLed() })
					}
					p = p.then(() => new Promise((res2) => {
						const led = this._led
						const dot = this.dotPx * 2
						const pitch = dot + this.gapPx * 2
						this.drawGrid(ctx, W, H, pitch)
						const baseY = Math.max(2, (H - led.rows.length * pitch) / 2)
						// 静态完整绘制（居中，无滚动偏移）
						const sx = Math.max(10, (W - led.cols * pitch) / 2)
						this.drawDots(ctx, led, dot, pitch, pitch, baseY, sx, 1, W)
						// 水印
						ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
						ctx.setFillStyle('rgba(255,255,255,0.4)')
						ctx.setFontSize(22)
						ctx.setTextAlign('right')
						ctx.setTextBaseline('bottom')
						ctx.fillText('杯杯儿互动 · 手机灯牌', W - 16, H - 10)
						ctx.draw(false, () => setTimeout(res2, 150))
					}))
				} else {
					p = this.drawClassicExport(ctx, W, H)
				}
				return p.then(() => new Promise((res3, rej3) => {
					uni.canvasToTempFilePath({
						canvasId: 'ledExport',
						success: r => res3(r.tempFilePath), fail: rej3
					}, this)
				})).then(fp => new Promise((res4, rej4) => {
					uni.saveImageToPhotosAlbum({ filePath: fp, success: res4, fail: rej4 })
				}))
			}).finally(() => { if (this.mode === 'led') this.startLed() })
			// #endif
		},
		drawClassicExport(ctx, W, H) {
			return new Promise(resolve => {
				const px = Math.round(this.fontSize * 2)
				const rgb = this.hexRgb(this.color)
				const g = this.glow / 100
				ctx.setFontSize(px)
				try { ctx.setFontWeight(String(this.fontWeight)) } catch (e) {}
				ctx.setFillStyle(this.color)
				ctx.setTextAlign('center')
				ctx.setTextBaseline('middle')
				if (g > 0.05) {
					ctx.setShadow(0, 0, Math.round(px * 0.45 * (0.3 + g)), `rgba(${rgb},${Math.min(1, 0.85 * g + 0.15)})`)
				} else {
					ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
				}
				const maxW = W - 60
				const lh = Math.round(px * 1.5)
				const out = []
				this.textLines.forEach(line => {
					if (!line) return
					if (line.length <= 4 || this.measure(line, px) <= maxW) { out.push(line); return }
					let cur = ''
					for (const ch of line) {
						if (this.measure(cur + ch, px) > maxW && cur) { out.push(cur); cur = ch }
						else cur += ch
					}
					if (cur) out.push(cur)
				})
				const total = out.length * lh
				let y = Math.round(H / 2 - total / 2 + lh / 2)
				out.forEach(line => { ctx.fillText(line, W / 2, y); y += lh })
				// 水印
				ctx.setShadow(0, 0, 0, 'rgba(0,0,0,0)')
				ctx.setFillStyle('rgba(255,255,255,0.4)')
				ctx.setFontSize(22)
				ctx.setTextAlign('right')
				ctx.setTextBaseline('bottom')
				ctx.fillText('杯杯儿互动 · 手机灯牌', W - 16, H - 10)
				ctx.draw(false, () => setTimeout(resolve, 150))
			})
		},
		measure(str, px) {
			// 粗略测宽：中文/全角按 1 倍字号，半角 0.55 倍
			let w = 0
			for (const ch of str) w += (ch.charCodeAt(0) > 255 ? px : px * 0.55)
			return w
		},
		/* ===== 配置持久化 ===== */
		saveConfig() {
			try {
				uni.setStorageSync(STORE_KEY, {
					inputText: this.inputText, mode: this.mode, fontSize: this.fontSize,
					fontWeight: this.fontWeight, speed: this.speed, direction: this.direction,
					color: this.color, glow: this.glow, isLandscape: this.isLandscape
				})
			} catch (e) {}
		},
		loadConfig() {
			try {
				const c = uni.getStorageSync(STORE_KEY)
				if (!c) return
				if (c.inputText) this.inputText = c.inputText
				if (c.mode) this.mode = c.mode
				if (c.fontSize) this.fontSize = c.fontSize
				if (c.fontWeight) this.fontWeight = c.fontWeight
				if (c.speed !== undefined) this.speed = c.speed
				if (c.direction) this.direction = c.direction
				if (c.color) {
					this.color = c.color
					this.customOn = PRESETS.indexOf(c.color) === -1
					if (this.customOn) this.customColor = c.color
				}
				if (c.glow !== undefined) this.glow = c.glow
				if (c.isLandscape) { this.isLandscape = true; this.showPanel = false }
			} catch (e) {}
		}
	},
	watch: {
		textContent() { this.rebuild() },
		marqueeKey() { this.restartMarquee() }
	}
}
</script>

<style lang="scss" scoped>
.led-root {
	position: fixed; left: 0; top: 0; bottom: 0; right: 0;
	display: flex; flex-direction: column;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	overflow: hidden; z-index: 999;
}
.rotator {
	position: relative; flex: 0 0 auto; z-index: 1;
	&.landscape {
		position: absolute; left: 0; top: 0; z-index: 2;
		transform: rotate(90deg) translateY(-100%);
		transform-origin: top left;
	}
}
/* 预览区：保持深色“屏幕”质感 */
.preview { position: relative; overflow: hidden; background: #05050c; border-radius: 0; }

/* 经典模式 */
.classic-box {
	position: absolute; left: 0; right: 0; top: 0; bottom: 0;
	white-space: nowrap; overflow: hidden;
	display: flex; align-items: center;
}
.classic-static { margin: 0 auto; }
.marquee { flex-shrink: 0; width: max-content; }
.marquee-left { animation: led-scroll-left linear infinite; }
.marquee-right { animation: led-scroll-right linear infinite; }
@keyframes led-scroll-left {
	from { transform: translateX(100vw); }
	to { transform: translateX(-100%); }
}
@keyframes led-scroll-right {
	from { transform: translateX(-100%); }
	to { transform: translateX(100vw); }
}
.classic-text { white-space: pre-line; text-align: center; line-height: 1.5; }
.ct-line { white-space: nowrap; }
.led-canvas { display: block; }

.pinch-hint {
	position: absolute; left: 50%; top: 14%; transform: translateX(-50%);
	background: rgba(255, 255, 255, .14); color: #ffd166;
	padding: 6rpx 24rpx; border-radius: 26rpx; font-size: 26rpx; z-index: 10;
}
.float-rotate {
	position: absolute; right: 24rpx; top: 24rpx; z-index: 10;
	width: 72rpx; height: 72rpx; line-height: 72rpx; text-align: center;
	background: rgba(255, 255, 255, .12); color: #fff; border-radius: 50%; font-size: 36rpx;
}

/* 控制面板（浅色卡片，与模块其他页面一致） */
.panel {
	position: relative; z-index: 5; flex: 0 0 auto;
	background: #ffffff; border-top: 1rpx solid #e6e6f0;
	box-shadow: 0 -6rpx 24rpx rgba(102, 126, 234, .10);
	padding: 16rpx 24rpx 24rpx;
}
.panel.panel-ls { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; }
.panel-row { display: flex; align-items: flex-start; }
.led-input {
	flex: 1; min-height: 64rpx; max-height: 160rpx; background: #f6f6fb; color: #333;
	border: 2rpx solid #e6e6f0; border-radius: 14rpx; padding: 14rpx 18rpx; font-size: 28rpx;
}
.collapse-btn { color: #8a86a8; font-size: 26rpx; padding: 16rpx 8rpx 16rpx 16rpx; }
.seg-row { display: flex; margin-top: 16rpx; }
.seg {
	flex: 1; text-align: center; padding: 14rpx 0; font-size: 26rpx; color: #6b6b8a;
	background: #f2f2f8; border: 1rpx solid #e6e6f0; border-radius: 14rpx; margin-right: 12rpx;
}
.seg:last-child { margin-right: 0; }
.seg.active { color: #fff; background: linear-gradient(135deg, #fa709a, #fee140); border-color: transparent; font-weight: bold; }
.seg-mini { flex: 0 0 130rpx; }
.slider-row { display: flex; align-items: center; margin-top: 6rpx; }
.s-label { width: 88rpx; font-size: 26rpx; color: #6b6b8a; }
.s-slider { flex: 1; }
.s-val { width: 96rpx; text-align: right; font-size: 26rpx; color: #d6457f; }
.color-row { display: flex; align-items: center; margin-top: 18rpx; flex-wrap: wrap; }
.decor-row { margin-top: 18rpx; }
.decor-tip { font-size: 22rpx; color: #9a94b8; }
.decor-list { display: flex; flex-wrap: wrap; margin-top: 10rpx; }
.decor-item {
	width: 60rpx; height: 60rpx; line-height: 60rpx; text-align: center; margin: 0 12rpx 12rpx 0;
	background: #f2f2f8; color: #d6457f; border-radius: 12rpx; font-size: 32rpx; border: 1rpx solid #e6e6f0;
}
.swatch {
	width: 56rpx; height: 56rpx; border-radius: 50%; margin-right: 16rpx;
	border: 3rpx solid transparent; box-sizing: border-box;
}
.swatch.active { border-color: #fff; box-shadow: 0 0 12rpx rgba(180, 130, 220, .7); }
.swatch.custom { background: #f2f2f8; color: #d6457f; font-size: 30rpx; text-align: center; line-height: 50rpx; }
.swatch.custom.active { background: #e6cffc; }
.btn-row { margin-top: 20rpx; }
.save-btn {
	background: linear-gradient(135deg, #fa709a, #fee140); color: #fff;
	border-radius: 44rpx; font-size: 30rpx; font-weight: bold; border: none;
	&[disabled] { opacity: .6; }
}

.off-canvas { position: fixed; left: -4000px; top: 0; }
</style>
