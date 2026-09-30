<template>
	<view class="pet-display" :style="{ background: moodBg }">
		<!-- 像素形象（look 有效时渲染，失败/缺失降级为 Emoji） -->
		<canvas v-if="canRender" :canvas-id="cid" :style="{ width: px.w + 'px', height: px.h + 'px' }" class="pet-canvas"></canvas>
		<view v-else class="pet-emoji">{{ emoji }}</view>
		<view class="pet-face" :style="{ color: moodColor }">{{ face }}</view>
		<view class="pet-name">{{ name }}</view>
	</view>
</template>

<script>
import { MOOD_MAP } from '../beemore.js'
import { expressionForMood } from '../look.js'
import { renderPet, CANVAS_W, CANVAS_H } from '../renderer.js'
export default {
	name: 'PetDisplay',
	props: {
		emoji: { type: String, default: '🐥' },
		mood: { type: String, default: 'normal' },
		name: { type: String, default: '杯蜜' },
		decor: { type: Array, default: () => [] }, // 已穿戴配饰 key（equippedItems）
		look: { type: Object, default: null },
		scale: { type: Number, default: 3 },
		// 瞬时表情覆盖（事件反馈，空串表示按 mood 推导）
		transient: { type: String, default: '' }
	},
	data() {
		return { cid: 'petc_' + Math.random().toString(36).slice(2, 8), failed: false }
	},
	computed: {
		face() { return (MOOD_MAP[this.mood] || MOOD_MAP.normal).face },
		moodColor() { return (MOOD_MAP[this.mood] || MOOD_MAP.normal).color },
		moodBg() { return 'linear-gradient(160deg,#ffffff 0%,#f6f0ff 100%)' },
		// look 是否可信（存量/领养数据由父级归一化后传入）
		valid() { return !this.failed && this.look && (this.look.gender === 'm' || this.look.gender === 'f') },
		canRender() { return this.valid },
		px() { return { w: CANVAS_W * this.scale, h: CANVAS_H * this.scale } }
	},
	watch: {
		look: { deep: true, handler() { this.draw() } },
		mood() { this.draw() },
		transient() { this.draw() },
		decor: { deep: true, handler() { this.draw() } }
	},
	mounted() { this.draw() },
	methods: {
		draw() {
			if (!this.valid) return
			this.$nextTick(() => {
				try {
					const ctx = uni.createCanvasContext(this.cid, this)
					const exp = this.transient || expressionForMood(this.mood)
					renderPet(ctx, this.look, exp, this.decor, this.scale)
				} catch (e) {
					this.failed = true // 渲染异常降级 Emoji
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
	padding: 28px 16px 18px;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 6px 20px rgba(120, 90, 200, 0.12);
}
.pet-canvas { display: block; }
.pet-emoji { font-size: 88px; line-height: 1.1; }
.pet-face { font-size: 22px; font-weight: bold; margin-top: 6px; }
.pet-name { font-size: 15px; color: #6a5acd; margin-top: 8px; }
</style>
