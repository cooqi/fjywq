<template>
	<view class="page-container">
		<!-- ===== 预览区（实时渲染，DOM+CSS） ===== -->
		<view id="preview-area" class="preview-area" :style="previewStyle">
			<!-- 背景层：背景闪只作用于此，不影响文字 -->
			<view class="bg-layer" :class="bgAnimClass" :style="bgStyle"></view>
			<!-- 内容层（可横屏旋转） -->
			<view class="rotator" :class="{ landscape: isLandscape }" :style="rotatorStyle">
				<!-- 滚动（仅单行） -->
				<view v-if="isScroll" class="scroll-wrap">
					<view class="scroll-track" :class="scrollAnimClass" :style="scrollStyle">
						<text v-for="(c, i) in config.lines[0].chars" :key="i" class="char" :style="charStyle(c)">{{ c.char }}</text>
					</view>
				</view>
				<!-- 静态 / 闪烁 -->
				<view v-else class="stage">
					<view v-for="(line, li) in config.lines" :key="li" class="line" :class="lineAnimClass" :style="lineStyle">
						<text v-for="(c, ci) in line.chars" :key="ci" class="char" :style="charStyle(c)">{{ c.char }}</text>
						<text v-if="!line.chars.length" class="ph">请输入文字</text>
					</view>
				</view>
				<!-- 闪光覆盖层 -->
				<view v-if="isShimmer" class="shimmer-overlay"></view>
			</view>
		</view>

		<view class="fs-badge">{{ actualFontSize }}px · {{ modeText }}</view>

		<!-- ===== Tab 头 ===== -->
		<view class="tab-bar">
			<view v-for="(t, i) in tabs" :key="i" class="tab-item" :class="{ active: tab === i }" @click="tab = i">{{ t }}</view>
		</view>

		<!-- ===== Tab 内容 ===== -->
		<scroll-view scroll-y class="tab-panel">
			<!-- 0 文字 -->
			<view v-if="tab === 0" class="panel-body">
				<view class="row-title">文字内容（最多 {{ maxLines }} 行，每行最多 {{ maxChars }} 字）</view>
				<view v-for="(line, li) in config.lines" :key="li" class="line-input-row">
					<text class="line-no">{{ li + 1 }}</text>
					<input class="line-input" :value="lineText(li)" :maxlength="maxChars" placeholder="输入这行的文字"
						@focus="selLine = li; selChar = -1" @input="onLineInput(li, $event)" />
					<text class="line-del" v-if="config.lines.length > 1" @click="removeLine(li)">✕</text>
				</view>
				<view class="add-line" @click="addLine">＋ 添加一行</view>

				<view class="divider"></view>
				<view class="row-title">逐字上色 · 第 {{ selLine + 1 }} 行</view>
				<view class="char-grid">
					<view v-for="(c, ci) in curChars" :key="ci" class="char-chip" :class="{ sel: selChar === ci }"
						@click="pickChar(ci)">
						<text class="chip-t" :style="{ color: c.color === '#000000' ? '#333' : c.color }">{{ c.char }}</text>
					</view>
					<text v-if="!curChars.length" class="grid-empty">上面输入文字后，这里点字选色</text>
				</view>
				<view class="scope-tip">{{ selChar >= 0 ? ('正在设置第 ' + (selChar + 1) + ' 个字「' + (curChars[selChar] ? curChars[selChar].char : '') + '」') : '未选中单字 · 色板将作用于全部文字' }}</view>
				<view class="pal-label">字色</view>
				<led-palette :colors="presetColors" @pick="applyChar('color', $event)" />
				<view class="pal-label">发光色</view>
				<led-palette :colors="presetColors" @pick="applyChar('glow', $event)" />
				<view class="inline-apply">
					<button class="mini-btn" @click="selChar = -1">取消选字</button>
					<button class="mini-btn warn" @click="clearColors">重置为白字</button>
				</view>
			</view>

			<!-- 1 颜色 -->
			<view v-if="tab === 1" class="panel-body">
				<view class="row-title">背景色</view>
				<led-palette :colors="presetColors" @pick="applyBg" />
				<view class="hex-row">
					<input class="hex-input" v-model="hex.bg" placeholder="#000000" @confirm="applyHex('bg')" />
					<button class="mini-btn" @click="applyHex('bg')">应用</button>
				</view>

				<view class="divider"></view>
				<view class="row-title">全部字色（一键应用）</view>
				<led-palette :colors="presetColors" @pick="applyAll('color', $event)" />
				<view class="row-title">全部发光色</view>
				<led-palette :colors="presetColors" @pick="applyAll('glow', $event)" />
				<view class="inline-apply">
					<button class="mini-btn rainbow" @click="applyMulticolor">🌈 多彩随机</button>
				</view>
			</view>

			<!-- 2 大小 -->
			<view v-if="tab === 2" class="panel-body">
				<view class="row-title">字号</view>
				<view class="seg-row">
					<view v-for="p in fontPresets" :key="p.key" class="seg" :class="{ active: config.fontSize.preset === p.key }"
						@click="setPreset(p.key)">{{ p.label }}</view>
				</view>
				<view v-if="config.fontSize.preset === 'custom'" class="slider-row">
					<text class="slider-label">{{ config.fontSize.value }}px</text>
					<slider :value="config.fontSize.value" :min="12" :max="200" :step="2" activeColor="#fa709a" @changing="onCustomSize" @change="onCustomSize" />
				</view>
				<view class="fit-tip">适应模式会按容器与文字量自动二分求最大字号；当前实际 {{ actualFontSize }}px</view>
			</view>

			<!-- 3 效果 -->
			<view v-if="tab === 3" class="panel-body">
				<view class="row-title">模式</view>
				<view class="seg-row">
					<view class="seg" :class="{ active: config.mode === 'static' }" @click="setMode('static')">静态</view>
					<view class="seg" :class="{ active: config.mode === 'scroll', dis: multiLine }" @click="setMode('scroll')">滚动</view>
					<view class="seg" :class="{ active: config.mode === 'blink' }" @click="setMode('blink')">闪烁</view>
				</view>
				<view v-if="multiLine" class="warn-tip">⚠ 多行不支持滚动，选择滚动会自动切回静态</view>

				<view class="divider"></view>
				<view class="row-title">屏向</view>
				<view class="seg-row">
					<view class="seg" :class="{ active: !isLandscape }" @click="setOrientation('portrait')">竖屏</view>
					<view class="seg" :class="{ active: isLandscape }" @click="setOrientation('landscape')">横屏</view>
				</view>

				<!-- 滚动子项 -->
				<block v-if="config.mode === 'scroll' && !multiLine">
					<view class="divider"></view>
					<view class="row-title">方向</view>
					<view class="seg-row">
						<view class="seg" :class="{ active: config.scroll.direction === 'left' }" @click="config.scroll.direction = 'left'">← 左</view>
						<view class="seg" :class="{ active: config.scroll.direction === 'right' }" @click="config.scroll.direction = 'right'">→ 右</view>
						<view class="seg" :class="{ active: config.scroll.direction === 'up' }" @click="config.scroll.direction = 'up'">↑ 上</view>
						<view class="seg" :class="{ active: config.scroll.direction === 'down' }" @click="config.scroll.direction = 'down'">↓ 下</view>
					</view>
					<view class="switch-row">
						<text>循环滚动</text>
						<switch :checked="config.scroll.loop" color="#fa709a" @change="config.scroll.loop = $event.detail.value" />
					</view>
					<view class="slider-row">
						<text class="slider-label">速度 {{ config.scroll.speed }}</text>
						<slider :value="config.scroll.speed" :min="1" :max="10" :step="1" activeColor="#fa709a" @change="config.scroll.speed = $event.detail.value" />
					</view>
				</block>

				<!-- 闪烁子项 -->
				<block v-if="config.mode === 'blink'">
					<view class="divider"></view>
					<view class="row-title">效果</view>
					<view class="seg-row">
						<view class="seg" :class="{ active: config.blink.effect === 'flash' }" @click="config.blink.effect = 'flash'">闪烁</view>
						<view class="seg" :class="{ active: config.blink.effect === 'pulse' }" @click="config.blink.effect = 'pulse'">脉冲</view>
						<view class="seg" :class="{ active: config.blink.effect === 'rainbow' }" @click="config.blink.effect = 'rainbow'">彩虹</view>
						<view class="seg" :class="{ active: config.blink.effect === 'shimmer' }" @click="config.blink.effect = 'shimmer'">闪光</view>
					</view>
					<view class="row-title">目标</view>
					<view class="seg-row">
						<view class="seg" :class="{ active: config.blink.target === 'text' }" @click="config.blink.target = 'text'">文字闪</view>
						<view class="seg" :class="{ active: config.blink.target === 'bg' }" @click="config.blink.target = 'bg'">背景闪</view>
						<view class="seg" :class="{ active: config.blink.target === 'both' }" @click="config.blink.target = 'both'">都闪</view>
					</view>
					<view class="slider-row">
						<text class="slider-label">节奏 {{ config.blink.speed }}ms</text>
						<slider :value="config.blink.speed" :min="200" :max="2000" :step="50" activeColor="#fa709a" @change="config.blink.speed = $event.detail.value" />
					</view>
				</block>
			</view>
		</scroll-view>

		<!-- ===== 底部操作 ===== -->
		<view class="bottom-bar">
			<button class="ghost-btn" @click="saveBoard">💾 保存</button>
			<button class="show-btn" @click="goDisplay">🔆 全屏展示</button>
		</view>
	</view>
</template>

<script>
// 调色板用 easycom 组件 led-palette（微信小程序运行时无模板编译器，不能用运行时 template 字符串）
import { createDefault, getItem, upsert, setCurrent, PRESET_COLORS, MAX_LINES, MAX_CHARS_PER_LINE, summarizeName } from '@/common/js/led-store.js'
import { resolveFontSize, MIN_FONT } from '@/common/js/led-font.js'

export default {
	data() {
		return {
			config: createDefault(),
			tabs: ['文字', '颜色', '大小', '效果'],
			tab: 0,
			selLine: 0,
			selChar: -1,
			presetColors: PRESET_COLORS,
			maxLines: MAX_LINES,
			maxChars: MAX_CHARS_PER_LINE,
			actualFontSize: 40,
			containerW: 0,
			containerH: 0,
			hex: { bg: '' },
			fontPresets: [
				{ key: 'fit', label: '适应' },
				{ key: 'small', label: '小' },
				{ key: 'medium', label: '中' },
				{ key: 'large', label: '大' },
				{ key: 'xlarge', label: '再大' },
				{ key: 'custom', label: '自定义' }
			]
		}
	},
	computed: {
		multiLine() { return this.config.lines.length > 1 },
		isScroll() { return this.config.mode === 'scroll' && !this.multiLine && this.config.lines.length >= 1 },
		isShimmer() { return this.config.mode === 'blink' && this.config.blink.effect === 'shimmer' && this.config.blink.target !== 'bg' },
		modeText() {
			if (this.config.mode === 'scroll') return '滚动·' + ({ left: '左', right: '右', up: '上', down: '下' }[this.config.scroll.direction])
			if (this.config.mode === 'blink') return ({ flash: '闪烁', pulse: '脉冲', rainbow: '彩虹', shimmer: '闪光' }[this.config.blink.effect]) || '闪烁'
			return '静态'
		},
		curChars() { return (this.config.lines[this.selLine] && this.config.lines[this.selLine].chars) || [] },
		isLandscape() { return this.config.orientation === 'landscape' },
		// 容器底部黑底（背景色交给 bg-layer，背景闪时才能只暗背景不伤字）
		previewStyle() { return { background: '#000000' } },
		// 背景层：颜色 + 背景闪动画时长
		bgStyle() {
			const s = { background: this.config.bgColor }
			if (this.config.mode === 'blink' && this.config.blink.target !== 'text') {
				s.animationDuration = (this.config.blink.speed || 500) + 'ms'
			}
			return s
		},
		bgAnimClass() {
			if (this.config.mode !== 'blink' || this.config.blink.target === 'text') return ''
			return 'bg-' + this.config.blink.effect
		},
		// 横屏：交换容器宽高后旋转 90°（沿用旧 Canvas 版的成熟写法）
		rotatorStyle() {
			if (!this.isLandscape) return {}
			return { width: this.containerH + 'px', height: this.containerW + 'px' }
		},
		// 每行字号（滚动 track 也用到）
		lineStyle() {
			const s = { fontSize: this.actualFontSize + 'px' }
			if (this.config.mode === 'blink') s.animationDuration = this.config.blink.speed + 'ms'
			return s
		},
		lineAnimClass() {
			if (this.config.mode !== 'blink') return ''
			if (this.config.blink.target === 'bg') return ''
			return this.effectClass
		},
		effectClass() {
			return { flash: 'bl-flash', pulse: 'bl-pulse', rainbow: 'bl-rainbow', shimmer: 'bl-shimmer' }[this.config.blink.effect] || ''
		},
		scrollAnimClass() {
			return { left: 'an-scroll-left', right: 'an-scroll-right', up: 'an-scroll-up', down: 'an-scroll-down' }[this.config.scroll.direction] || 'an-scroll-left'
		},
		scrollStyle() {
			const dur = Math.max(2, 12 - this.config.scroll.speed)
			const st = { fontSize: this.actualFontSize + 'px', animationDuration: dur + 's', animationIterationCount: this.config.scroll.loop ? 'infinite' : '1' }
			return st
		}
	},
	watch: {
		'config.lines.length'(n) {
			if (n > 1 && this.config.mode === 'scroll') {
				this.config.mode = 'static'
				uni.showToast({ title: '多行不支持滚动，已切回静态', icon: 'none' })
			}
			if (this.selLine >= n) this.selLine = n - 1
			this.recalc()
		}
	},
	onLoad(options) {
		if (options && options.id) {
			const found = getItem(options.id)
			if (found) this.config = found
		}
		this.ensureDefaults()
	},
	onReady() {
		this.getContainerSize().then(() => this.recalc())
	},
	methods: {
		ensureDefaults() {
			if (!this.config.defColor) this.config.defColor = '#FFFFFF'
			if (!this.config.defGlow) this.config.defGlow = '#FFFFFF'
			if (!this.config.orientation) this.config.orientation = 'portrait'
		},
		getContainerSize() {
			return new Promise(resolve => {
				uni.createSelectorQuery().in(this).select('#preview-area').boundingClientRect(rect => {
					if (rect) { this.containerW = rect.width; this.containerH = rect.height }
					resolve(rect || { width: 0, height: 0 })
				}).exec()
			})
		},
		recalc() {
			if (!this.containerW) return
			// 横屏时内容被旋转，可用宽高需互换
			const effW = this.isLandscape ? this.containerH : this.containerW
			const effH = this.isLandscape ? this.containerW : this.containerH
			const size = resolveFontSize(
				this.config.fontSize.preset,
				this.config.fontSize.value,
				effW, effH,
				this.config.lines
			)
			this.actualFontSize = Math.max(MIN_FONT, size)
			this.config.fontSize.actual = this.actualFontSize
		},
		/* ===== 文字 ===== */
		lineText(li) { return ((this.config.lines[li] || {}).chars || []).map(c => c.char).join('') },
		onLineInput(li, e) {
			const text = (e.detail.value || '').slice(0, MAX_CHARS_PER_LINE)
			const old = this.config.lines[li].chars
			const next = []
			for (let i = 0; i < text.length; i++) {
				const o = old[i]
				next.push(o && o.char === text[i] ? o : { char: text[i], color: this.config.defColor, glow: this.config.defGlow })
			}
			this.config.lines[li].chars = next
			if (this.selChar >= next.length) this.selChar = -1
			this.recalc()
		},
		addLine() {
			if (this.config.lines.length >= MAX_LINES) return uni.showToast({ title: '最多 ' + MAX_LINES + ' 行', icon: 'none' })
			this.config.lines.push({ chars: [] })
			this.selLine = this.config.lines.length - 1
			this.selChar = -1
		},
		removeLine(li) {
			if (this.config.lines.length <= 1) return
			this.config.lines.splice(li, 1)
			if (this.selLine >= this.config.lines.length) this.selLine = this.config.lines.length - 1
			this.selChar = -1
			this.recalc()
		},
		pickChar(ci) { this.selChar = this.selChar === ci ? -1 : ci },
		applyChar(prop, color) {
			this.ensureDefaults()
			if (this.selChar >= 0 && this.curChars[this.selChar]) {
				this.curChars[this.selChar][prop] = color
			} else {
				this.applyAll(prop, color)
				return
			}
			// 同步默认色，方便后续输入
			if (prop === 'color') this.config.defColor = color
			else this.config.defGlow = color
		},
		applyAll(prop, color) {
			this.ensureDefaults()
			if (prop === 'color') this.config.defColor = color
			else this.config.defGlow = color
			this.config.lines.forEach(line => (line.chars || []).forEach(c => { c[prop] = color }))
		},
		clearColors() {
			this.config.lines.forEach(line => (line.chars || []).forEach(c => { c.color = '#FFFFFF'; c.glow = '#FFFFFF' }))
			this.config.defColor = '#FFFFFF'; this.config.defGlow = '#FFFFFF'
			uni.showToast({ title: '已重置', icon: 'none' })
		},
		applyMulticolor() {
			const colors = ['#FF0066', '#00D4FF', '#FFD700', '#00FF88', '#FF8800', '#9933FF', '#FF3B30', '#C77DFF']
			this.config.lines.forEach(line => (line.chars || []).forEach(c => {
				const cc = colors[Math.floor(Math.random() * colors.length)]
				c.color = cc; c.glow = cc
			}))
			this.config.mode = 'static'
			uni.showToast({ title: '已应用多彩', icon: 'none' })
		},
		/* ===== 颜色 tab ===== */
		applyBg(color) { this.config.bgColor = color },
		applyHex(which) {
			let v = (this.hex[which] || '').trim()
			if (v && v[0] !== '#') v = '#' + v
			if (!/^#[0-9a-fA-F]{6}$/.test(v)) return uni.showToast({ title: '格式应为 #RRGGBB', icon: 'none' })
			if (which === 'bg') this.config.bgColor = v
			this.hex[which] = ''
		},
		/* ===== 大小 ===== */
		setPreset(key) {
			this.config.fontSize.preset = key
			if (key === 'custom' && !this.config.fontSize.value) this.config.fontSize.value = this.actualFontSize || 48
			this.recalc()
		},
		onCustomSize(e) {
			this.config.fontSize.value = e.detail.value
			this.recalc()
		},
		/* ===== 效果 ===== */
		setMode(m) {
			if (m === 'scroll' && this.multiLine) {
				uni.showToast({ title: '多行不支持滚动，已切回静态', icon: 'none' })
				this.config.mode = 'static'
				return
			}
			this.config.mode = m
		},
		setOrientation(o) {
			this.config.orientation = o
			this.recalc()
		},
		/* ===== 展示/保存 ===== */
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
		goDisplay() {
			setCurrent(JSON.parse(JSON.stringify(this.config)))
			uni.navigateTo({ url: '/pages/game/xianxia/led/led-display' })
		},
		saveBoard() {
			const cfg = JSON.parse(JSON.stringify(this.config))
			if (!cfg.lines.some(l => (l.chars || []).length)) return uni.showToast({ title: '请先输入文字', icon: 'none' })
			if (!cfg._named) cfg.name = summarizeName(cfg)
			const r = upsert(cfg)
			if (!r.ok) return uni.showToast({ title: r.msg, icon: 'none' })
			this.config = cfg
			uni.showToast({ title: '已保存', icon: 'success' })
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx 24rpx calc(150rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	display: flex; flex-direction: column;
}

/* 预览区 */
.preview-area {
	position: relative;
	width: 100%; height: 560rpx; border-radius: 28rpx;
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	overflow: hidden; box-shadow: 0 14rpx 40rpx rgba(0, 0, 0, .28);
}
/* 背景层：只承载背景色，背景闪只作用于此 */
.bg-layer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
/* 内容层：默认铺满；横屏时宽高互换并旋转 90° */
.rotator { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rotator.landscape { right: auto; bottom: auto; transform: rotate(90deg) translateY(-100%); transform-origin: top left; }
.stage { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24rpx; box-sizing: border-box; }
.line { display: flex; flex-direction: row; justify-content: center; align-items: center; line-height: 1.25; }
.char { white-space: pre; }
.ph { color: rgba(255, 255, 255, .35); font-size: 32rpx; }
.fs-badge { align-self: flex-end; font-size: 22rpx; color: #8a86a8; margin: 10rpx 6rpx 4rpx; }

/* 滚动 */
.scroll-wrap { width: 100%; height: 100%; overflow: hidden; display: flex; align-items: center; }
.scroll-track { display: inline-flex; white-space: nowrap; will-change: transform; }

/* Tab */
.tab-bar { display: flex; background: rgba(255, 255, 255, .7); border-radius: 20rpx; padding: 8rpx; margin-top: 8rpx; }
.tab-item { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #7a76a0; border-radius: 14rpx; }
.tab-item.active { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; font-weight: bold; }

.tab-panel { flex: 1; margin-top: 16rpx; }
.panel-body { background: #fff; border-radius: 22rpx; padding: 24rpx; box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, .08); }
.row-title { font-size: 26rpx; color: #666; margin: 6rpx 0 12rpx; }
.pal-label { font-size: 24rpx; color: #888; margin: 14rpx 0 6rpx; }
.divider { height: 2rpx; background: #f0f0f5; margin: 24rpx 0; }

.line-input-row { display: flex; align-items: center; gap: 12rpx; margin-bottom: 14rpx; }
.line-no { width: 40rpx; text-align: center; color: #aaa; font-size: 26rpx; }
.line-input { flex: 1; height: 76rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 14rpx; padding: 0 20rpx; font-size: 30rpx; }
.line-del { width: 56rpx; text-align: center; color: #f6685e; font-size: 30rpx; }
.add-line { text-align: center; color: #fa709a; font-size: 27rpx; padding: 16rpx; border: 2rpx dashed #f3b7c9; border-radius: 14rpx; }

.char-grid { display: flex; flex-wrap: wrap; gap: 12rpx; min-height: 40rpx; }
.char-chip { min-width: 76rpx; height: 76rpx; padding: 0 10rpx; display: flex; align-items: center; justify-content: center; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 14rpx; }
.char-chip.sel { border-color: #fa709a; background: #fff0f5; box-shadow: 0 0 0 3rpx rgba(250, 112, 154, .25); }
.chip-t { font-size: 34rpx; font-weight: bold; }
.grid-empty { font-size: 24rpx; color: #bbb; }
.scope-tip { font-size: 22rpx; color: #8a86a8; margin: 14rpx 0; }
.inline-apply { display: flex; gap: 16rpx; margin-top: 18rpx; }
.mini-btn { flex: 1; background: #eef4fb; color: #3a6ea5; border: none; border-radius: 14rpx; height: 68rpx; line-height: 68rpx; font-size: 25rpx; }
.mini-btn.warn { background: #fdeeee; color: #f6685e; }
.mini-btn.rainbow { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; }
.hex-row { display: flex; gap: 16rpx; align-items: center; margin-top: 12rpx; }
.hex-input { flex: 1; height: 68rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 14rpx; padding: 0 20rpx; font-size: 26rpx; }
.hex-row .mini-btn { flex: 0 0 160rpx; }

.seg-row { display: flex; flex-wrap: wrap; gap: 14rpx; }
.seg { padding: 16rpx 26rpx; background: #f2f2f7; color: #666; border-radius: 14rpx; font-size: 26rpx; }
.seg.active { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; font-weight: bold; }
.seg.dis { opacity: .4; }
.slider-row { margin-top: 20rpx; }
.slider-label { font-size: 24rpx; color: #888; }
.switch-row { display: flex; align-items: center; justify-content: space-between; margin-top: 24rpx; font-size: 27rpx; color: #555; }
.fit-tip, .warn-tip { font-size: 22rpx; color: #8a86a8; margin-top: 18rpx; line-height: 1.6; }
.warn-tip { color: #e08a00; }

/* 底部操作 */
.bottom-bar {
	position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
	display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
	background: rgba(255, 255, 255, .92); box-shadow: 0 -6rpx 20rpx rgba(0, 0, 0, .06);
}
.bottom-bar button { flex: 1; margin: 0; }
.ghost-btn { background: #fff; color: #fa709a; border: 2rpx solid #fa709a; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.show-btn { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; border: none; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }

/* ===== 动画 keyframes ===== */
/* 循环起始用 100vw/100vh（相对屏幕），否则超长文本起点不对（避坑 #7） */
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
.bl-flash { animation-name: flash; animation-timing-function: step-end; animation-iteration-count: infinite; }
.bl-pulse { animation-name: pulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.bl-rainbow { animation-name: rainbow; animation-timing-function: linear; animation-iteration-count: infinite; }
.bl-shimmer { /* 闪光靠覆盖层，文字本身不动 */ }

/* 背景闪（作用于 .bg-layer，用 filter 不影响文字；时长由 inline animationDuration 供） */
@keyframes bgFlash { 0%, 49% { filter: brightness(1); } 50%, 100% { filter: brightness(.2); } }
@keyframes bgPulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(.45); } }
@keyframes bgRainbow { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
.bg-flash { animation-name: bgFlash; animation-timing-function: step-end; animation-iteration-count: infinite; }
.bg-pulse { animation-name: bgPulse; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
.bg-rainbow { animation-name: bgRainbow; animation-timing-function: linear; animation-iteration-count: infinite; }
.bg-shimmer { /* 背景不单独做闪光 */ }

/* 闪光覆盖层 */
.shimmer-overlay {
	position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none;
	background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, .85) 50%, transparent 70%);
	background-size: 200% 100%;
	mix-blend-mode: overlay;
	animation: shimmer 1.5s linear infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
