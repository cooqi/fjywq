<template>
	<view class="pet-display" :class="{ dark: canRender }">
		<!-- 霓虹舞台背景网格（仅线条形象时启用暗色舞台） -->
		<view v-if="canRender" class="grid-overlay"></view>
		<!-- 线条形象（look 有效时渲染，失败/缺失降级为 Emoji） -->
		<canvas v-if="canRender" :canvas-id="cid" :style="{ width: px.w + 'px', height: px.h + 'px' }" class="pet-canvas"></canvas>
		<view v-else class="pet-emoji">{{ emoji }}</view>
		<view class="pet-face" :style="{ color: moodColor }">{{ face }}</view>
		<view class="pet-name" :class="{ light: canRender }">{{ name }}</view>
	</view>
</template>

<script>
import { MOOD_MAP } from '../beemore.js'
import { expressionForMood } from '../look.js'
import { renderPet, CANVAS_W, CANVAS_H } from '../renderer.js'

const FRAME_MS = 60 // 逐帧动画间隔（约 16fps，够顺且省电）
export default {
	name: 'PetDisplay',
	props: {
		emoji: { type: String, default: '🐥' },
		mood: { type: String, default: 'normal' },
		name: { type: String, default: '杯蜜' },
		decor: { type: Array, default: () => [] }, // 已穿戴配饰 key（equippedItems）
		look: { type: Object, default: null },
		status: { type: String, default: '' }, // sleeping 时显示困倦脸
		scale: { type: Number, default: 3 },
		// 瞬时表情覆盖（事件反馈，空串表示按 mood 推导）
		transient: { type: String, default: '' },
		// 关闭逐帧动画（低端机或静态截图场景）
		animated: { type: Boolean, default: true }
	},
	data() {
		return { cid: 'petc_' + Math.random().toString(36).slice(2, 8), failed: false, t: 0, timer: null }
	},
	computed: {
		face() { return (MOOD_MAP[this.mood] || MOOD_MAP.normal).face },
		moodColor() { return (MOOD_MAP[this.mood] || MOOD_MAP.normal).color },
		// look 是否可信（存量/领养数据由父级归一化后传入）
		valid() { return !this.failed && this.look && (this.look.gender === 'm' || this.look.gender === 'f') },
		canRender() { return this.valid },
		expr() {
			if (this.transient) return this.transient
			if (this.status === 'sleeping') return 'sleepy'
			return expressionForMood(this.mood)
		},
		px() { return { w: CANVAS_W * this.scale, h: CANVAS_H * this.scale } }
	},
	watch: {
		look: { deep: true, handler() { this.draw() } },
		mood() { this.draw() },
		status() { this.draw() },
		transient() { this.draw() },
		decor: { deep: true, handler() { this.draw() } },
		canRender(v) { v ? this.start() : this.stop() }
	},
	mounted() {
		this.draw()
		// canvas 由 v-if 控制，小程序首帧可能还没就绪，延时再补画一次
		setTimeout(() => { this.draw(); if (this.animated) this.start() }, 200)
	},
	beforeDestroy() { this.stop() },
	// 小程序页面切走时停掉定时器，回来再续
	activated() { if (this.animated) this.start() },
	deactivated() { this.stop() },
	methods: {
		start() {
			if (this.timer || !this.canRender || !this.animated) return
			this.timer = setInterval(() => { this.t += FRAME_MS; this.draw() }, FRAME_MS)
		},
		stop() {
			if (this.timer) { clearInterval(this.timer); this.timer = null }
		},
		draw() {
			if (!this.valid) return
			this.$nextTick(() => {
				try {
					const ctx = uni.createCanvasContext(this.cid, this)
					renderPet(ctx, this.look, this.expr, this.decor, this.scale, { time: this.animated ? this.t : 0 })
				} catch (e) {
					this.failed = true // 渲染异常降级 Emoji
					this.stop()
				}
			})
		}
	}
}
</script>

<style scoped>
.pet-display {
	position: relative;
	border-radius: 24px;
	padding: 22px 16px 18px;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 6px 20px rgba(120, 90, 200, 0.12);
	background: linear-gradient(160deg, #ffffff 0%, #f6f0ff 100%);
	overflow: hidden;
}
/* 霓虹舞台：对齐 ren.html 的深色底 + 网格 */
.pet-display.dark {
	background: radial-gradient(circle at 50% 40%, #16232e 0%, #0a1117 55%, #04070a 100%);
	box-shadow: 0 8px 24px rgba(10, 20, 30, 0.45);
}
.grid-overlay {
	position: absolute;
	top: 0; right: 0; bottom: 0; left: 0;
	background-image:
		linear-gradient(rgba(94, 234, 212, 0.05) 1px, transparent 1px),
		linear-gradient(90deg, rgba(94, 234, 212, 0.05) 1px, transparent 1px);
	background-size: 30px 30px;
	pointer-events: none;
}
.pet-canvas { display: block; position: relative; z-index: 1; }
.pet-emoji { font-size: 88px; line-height: 1.1; }
.pet-face { font-size: 22px; font-weight: bold; margin-top: 6px; position: relative; z-index: 1; }
.pet-name { font-size: 15px; color: #6a5acd; margin-top: 8px; position: relative; z-index: 1; }
.pet-name.light { color: rgba(255, 255, 255, 0.82); }
</style>
