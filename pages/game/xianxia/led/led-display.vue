<template>
	<view class="full" id="full-area" :style="rootStyle" @click="onTapScreen">
		<!-- 背景层：背景闪只作用于此 -->
		<view class="bg-layer" :class="bgAnimClass" :style="bgStyle"></view>
		<!-- 内容层（可横屏旋转） -->
		<view class="rotator" :class="{ landscape: isLandscape }" :style="rotatorStyle">
			<!-- 滚动 -->
			<view v-if="isScroll" class="scroll-wrap">
				<view class="scroll-track" :class="scrollAnimClass" :style="scrollStyle">
					<text v-for="(c, i) in cfg.lines[0].chars" :key="i" class="char" :style="charStyle(c)">{{ c.char }}</text>
				</view>
			</view>
			<!-- 静态 / 闪烁 -->
			<view v-else class="stage">
				<view v-for="(line, li) in cfg.lines" :key="li" class="line" :class="lineAnimClass" :style="lineStyle">
					<text v-for="(c, ci) in line.chars" :key="ci" class="char" :style="charStyle(c)">{{ c.char }}</text>
				</view>
			</view>

			<!-- 闪光覆盖层 -->
			<view v-if="isShimmer" class="shimmer-overlay"></view>
		</view>

		<!-- 退出按钮 -->
		<view class="exit-btn" v-if="controlsVisible" @click.stop="goBack">✕ 退出</view>
		<view class="hint" v-if="controlsVisible">轻点屏幕任意处隐藏按钮 · 屏幕已常亮</view>
	</view>
</template>

<script>
import { getCurrent } from '@/common/js/led-store.js'
import { resolveFontSize, MIN_FONT } from '@/common/js/led-font.js'

export default {
	data() {
		return {
			cfg: { lines: [], bgColor: '#000000', fontSize: { preset: 'fit' }, mode: 'static', scroll: {}, blink: {} },
			actualFontSize: 60,
			controlsVisible: true,
			hideTimer: null,
			info: { windowWidth: 375, windowHeight: 600 }
		}
	},
	computed: {
		multiLine() { return (this.cfg.lines || []).length > 1 },
		isScroll() { return this.cfg.mode === 'scroll' && !this.multiLine && (this.cfg.lines || []).length >= 1 },
		isShimmer() { return this.cfg.mode === 'blink' && this.cfg.blink.effect === 'shimmer' && this.cfg.blink.target !== 'bg' },
		isLandscape() { return this.cfg.orientation === 'landscape' },
		// 全屏黑底（背景色交给 bg-layer，背景闪才能只暗背景不伤字）
		rootStyle() { return { background: '#000000' } },
		bgStyle() {
			const s = { background: this.cfg.bgColor }
			if (this.cfg.mode === 'blink' && this.cfg.blink.target !== 'text') {
				s.animationDuration = (this.cfg.blink.speed || 500) + 'ms'
			}
			return s
		},
		bgAnimClass() {
			if (this.cfg.mode !== 'blink' || this.cfg.blink.target === 'text') return ''
			return 'bg-' + this.cfg.blink.effect
		},
		rotatorStyle() {
			if (!this.isLandscape) return {}
			return { width: this.info.windowHeight + 'px', height: this.info.windowWidth + 'px' }
		},
		lineStyle() {
			const s = { fontSize: this.actualFontSize + 'px' }
			if (this.cfg.mode === 'blink') s.animationDuration = (this.cfg.blink.speed || 600) + 'ms'
			return s
		},
		lineAnimClass() {
			if (this.cfg.mode !== 'blink' || this.cfg.blink.target === 'bg') return ''
			return { flash: 'bl-flash', pulse: 'bl-pulse', rainbow: 'bl-rainbow', shimmer: '' }[this.cfg.blink.effect] || ''
		},
		scrollAnimClass() {
			return { left: 'an-scroll-left', right: 'an-scroll-right', up: 'an-scroll-up', down: 'an-scroll-down' }[this.cfg.scroll.direction] || 'an-scroll-left'
		},
		scrollStyle() {
			const dur = Math.max(2, 12 - (this.cfg.scroll.speed || 5))
			return { fontSize: this.actualFontSize + 'px', animationDuration: dur + 's', animationIterationCount: this.cfg.scroll.loop === false ? '1' : 'infinite' }
		}
	},
	onLoad() {
		const c = getCurrent()
		if (c) this.cfg = c
		this.info = uni.getSystemInfoSync()
		// 全屏常亮
		uni.setKeepScreenOn && uni.setKeepScreenOn({ keepScreenOn: true })
		// 隐藏导航栏（custom 已在 pages.json 设置，这里再兜底）
		uni.hideLoading && 0
		this.scheduleHide()
	},
	onReady() {
		this.recalc()
	},
	onUnload() {
		uni.setKeepScreenOn && uni.setKeepScreenOn({ keepScreenOn: false })
		if (this.hideTimer) clearTimeout(this.hideTimer)
	},
	methods: {
		recalc() {
			// 横屏时内容被旋转，可用宽高需互换
			const effW = this.isLandscape ? this.info.windowHeight : this.info.windowWidth
			const effH = this.isLandscape ? this.info.windowWidth : this.info.windowHeight
			const size = resolveFontSize(
				this.cfg.fontSize.preset,
				this.cfg.fontSize.value,
				effW, effH,
				this.cfg.lines
			)
			this.actualFontSize = Math.max(MIN_FONT, size)
		},
		charStyle(c) {
			const glow = c.glow || c.color
			return {
				color: c.color,
				textShadow: [
					'0 0 0.05em ' + glow, '0 0 0.1em ' + glow, '0 0 0.2em ' + glow,
					'0 0 0.4em ' + glow, '0 0 0.8em ' + glow
				].join(', ')
			}
		},
		onTapScreen() {
			this.controlsVisible = !this.controlsVisible
			if (this.controlsVisible) this.scheduleHide()
		},
		scheduleHide() {
			if (this.hideTimer) clearTimeout(this.hideTimer)
			this.hideTimer = setTimeout(() => { this.controlsVisible = false }, 3000)
		},
		goBack() { uni.navigateBack() }
	}
}
</script>

<style lang="scss">
.full {
	position: fixed; left: 0; top: 0; right: 0; bottom: 0;
	display: flex; align-items: center; justify-content: center;
	overflow: hidden;
}
/* 背景层：只承载背景色，背景闪只作用于此 */
.bg-layer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
/* 内容层：默认铺满；横屏时宽高互换并旋转 90° */
.rotator { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rotator.landscape { right: auto; bottom: auto; transform: rotate(90deg) translateY(-100%); transform-origin: top left; }
.stage { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30rpx; box-sizing: border-box; }
.line { display: flex; flex-direction: row; justify-content: center; align-items: center; line-height: 1.25; }
.char { white-space: pre; }

.scroll-wrap { width: 100%; overflow: hidden; display: flex; align-items: center; }
.scroll-track { display: inline-flex; white-space: nowrap; will-change: transform; }

.exit-btn {
	position: absolute; top: calc(80rpx + env(safe-area-inset-top)); right: 28rpx;
	background: rgba(0, 0, 0, .45); color: #fff; font-size: 26rpx;
	padding: 12rpx 26rpx; border-radius: 40rpx; z-index: 10;
}
.hint { position: absolute; bottom: calc(30rpx + env(safe-area-inset-bottom)); left: 0; right: 0; text-align: center; color: rgba(255, 255, 255, .5); font-size: 22rpx; z-index: 10; }

/* keyframes 需在本页重复定义（页面样式不跨页共享）；起始用 100vw/100vh（避坑 #7） */
@keyframes scrollLeft { from { transform: translateX(100vw); } to { transform: translateX(-100%); } }
@keyframes scrollRight { from { transform: translateX(-100%); } to { transform: translateX(100vw); } }
@keyframes scrollUp { from { transform: translateY(100vh); } to { transform: translateY(-100%); } }
@keyframes scrollDown { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
.an-scroll-left { animation-name: scrollLeft; animation-timing-function: linear; }
.an-scroll-right { animation-name: scrollRight; animation-timing-function: linear; }
.an-scroll-up { animation-name: scrollUp; animation-timing-function: linear; }
.an-scroll-down { animation-name: scrollDown; animation-timing-function: linear; }

@keyframes flash { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@keyframes rainbow { from { filter: hue-rotate(0); } to { filter: hue-rotate(360deg); } }
@keyframes bgflash { 0%, 49% { filter: brightness(1); } 50%, 100% { filter: brightness(.25); } }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.bl-flash { animation-name: flash; animation-timing-function: step-end; animation-iteration-count: infinite; }
.bl-pulse { animation-name: pulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.bl-rainbow { animation-name: rainbow; animation-timing-function: linear; animation-iteration-count: infinite; }
.bg-flash { animation-name: bgflash; animation-timing-function: step-end; animation-iteration-count: infinite; }
.bg-pulse { animation-name: pulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.bg-rainbow { animation-name: rainbow; animation-timing-function: linear; animation-iteration-count: infinite; }

.shimmer-overlay {
	position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none;
	background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, .85) 50%, transparent 70%);
	background-size: 200% 100%; mix-blend-mode: overlay; animation: shimmer 1.5s linear infinite;
}
</style>
