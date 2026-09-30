<template>
	<view class="page">
		<view v-if="loading" class="center-tip">打开衣橱……</view>

		<view v-else>
			<view class="head">
				<canvas canvas-id="wdPet" :style="{ width: px.w + 'px', height: px.h + 'px' }"></canvas>
				<view class="equipped">当前穿戴：{{ equippedText || '无' }}</view>
				<view class="streak">🔥 连续陪伴 {{ streak }} 天</view>
			</view>

			<view class="grid">
				<view v-for="it in items" :key="it.key" class="cell" :class="{ locked: !it.unlocked, on: it.equipped }">
					<text class="c-e">{{ it.unlocked ? it.emoji : '🔒' }}</text>
					<text class="c-n">{{ it.name }}</text>
					<text class="c-d">{{ it.unlocked ? (it.equipped ? '已穿戴' : '点击穿戴') : it.how }}</text>
					<button v-if="it.unlocked" class="c-btn" :class="{ off: it.equipped }" @click="toggle(it)">
						{{ it.equipped ? '卸下' : '穿上' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'
import { normalizeLook } from './look.js'
import { renderPet, CANVAS_W, CANVAS_H } from './renderer.js'

export default {
	data() {
		return { loading: true, userId: '', items: [], streak: 1, pet: {}, px: { w: CANVAS_W * 3, h: CANVAS_H * 3 } }
	},
	computed: {
		equippedText() {
			return this.items.filter(i => i.equipped).map(i => i.emoji + i.name).join(' ')
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.load()
	},
	onShow() { if (!this.loading) this.load() },
	methods: {
		drawPet() {
			try { renderPet(uni.createCanvasContext('wdPet', this), normalizeLook(this.pet.look, this.pet), 'smile', this.pet.equippedItems || [], 3) } catch (e) {}
		},
		async load() {
			this.loading = true
			const res = await callBeemore({ action: 'wardrobe', userId: this.userId })
			if (res.code === 0 && res.data) {
				this.items = res.data.items || []
				this.streak = res.data.streak || 1
				// 顺带取 pet 形象
				const cached = uni.getStorageSync('beemore_pet_cache')
				if (cached) { try { this.pet = JSON.parse(cached) || {} } catch (e) { this.pet = {} } }
			}
			this.loading = false
			this.$nextTick(() => this.drawPet())
		},
		async toggle(it) {
			const res = await callBeemore({ action: 'equip', userId: this.userId, itemKey: it.key, on: !it.equipped })
			if (res.code === 0) {
				uni.showToast({ title: res.message || '好了', icon: 'none' })
				this.load()
			} else {
				uni.showToast({ title: res.message || '操作失败', icon: 'none' })
			}
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.head { background: #fff; border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 14px; }
.big { font-size: 60px; }
.equipped { font-size: 14px; color: #6a5acd; margin-top: 8px; }
.streak { font-size: 12px; color: #999; margin-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.cell { background: #fff; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; }
.cell.locked { opacity: .6; }
.cell.on { box-shadow: 0 0 0 2px #b79cff inset; }
.c-e { font-size: 34px; }
.c-n { font-size: 14px; color: #444; font-weight: bold; margin-top: 6px; }
.c-d { font-size: 11px; color: #999; margin-top: 4px; text-align: center; min-height: 16px; }
.c-btn { margin-top: 10px; background: #6a5acd; color: #fff; font-size: 13px; border-radius: 10px; line-height: 2.2; padding: 0 18px; }
.c-btn.off { background: #eee; color: #888; }
</style>
