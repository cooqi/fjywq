<template>
	<view class="page">
		<view v-if="loading" class="center-tip">打开衣橱……</view>

		<view v-else>
			<view class="head">
				<view class="stage">
					<view class="grid-overlay"></view>
					<canvas canvas-id="wdPet" :style="{ width: px.w + 'px', height: px.h + 'px' }" class="wd-canvas"></canvas>
				</view>
				<view class="equipped">当前穿戴：{{ equippedText || '无' }}</view>
				<view class="wd-tip">{{ hairName }} · 配饰配色自动跟随衣服颜色</view>
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
import { callBeemore, getMyUserInfo, getCachedPet, refreshPet } from './store/pet.js'
import { normalizeLook, HAIRS } from './look.js'
import { renderPet, CANVAS_W, CANVAS_H } from './renderer.js'

export default {
	data() {
		return { loading: true, userId: '', items: [], streak: 1, pet: {}, px: { w: CANVAS_W * 3, h: CANVAS_H * 3 } }
	},
	computed: {
		equippedText() {
			return this.items.filter(i => i.equipped).map(i => i.emoji + i.name).join(' ')
		},
		// 发型属于形象（造型间）而不在衣橱里，预览下方明说避免找不到开关
		hairName() { return '发型：' + (HAIRS[normalizeLook(this.pet.look, this.pet).hair] || HAIRS.none).name }
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.load()
	},
	onShow() { if (!this.loading) this.load() },
	methods: {
		drawPet() {
			// 静态帧：衣橱预览不需要逐帧动画，但形象（发型/衣服色）必须与主面板一致
			try { renderPet(uni.createCanvasContext('wdPet', this), normalizeLook(this.pet.look, this.pet), 'happy', this.pet.equippedItems || [], 3) } catch (e) {}
		},
		async load() {
			this.loading = true
			const res = await callBeemore({ action: 'wardrobe', userId: this.userId })
			if (res.code === 0 && res.data) {
				this.items = res.data.items || []
				this.streak = res.data.streak || 1
				// 形象以服务端 wardrobe 回传为准（缓存只作底色），否则预览会画错发型/性别；不写回缓存，避免局部字段污染
				this.pet = Object.assign({}, getCachedPet() || {}, {
					look: res.data.look,
					gender: res.data.gender,
					equippedItems: res.data.equippedItems || []
				})
			}
			this.loading = false
			this.$nextTick(() => this.drawPet())
			// canvas 在 v-else 里，小程序首帧未就绪时补画一次
			setTimeout(() => this.drawPet(), 200)
		},
		async toggle(it) {
			const res = await callBeemore({ action: 'equip', userId: this.userId, itemKey: it.key, on: !it.equipped })
			if (res.code === 0) {
				uni.showToast({ title: res.message || '好了', icon: 'none' })
				// 先拿服务端回传的 equippedItems 就地重画预览，再拉一次全量状态同步缓存与主面板
				if (res.data && Array.isArray(res.data.equippedItems)) {
					this.pet = Object.assign({}, this.pet, { equippedItems: res.data.equippedItems })
					this.items = this.items.map(i => Object.assign({}, i, { equipped: it.key === i.key ? !it.equipped : i.equipped }))
					this.drawPet()
				}
				refreshPet()
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
/* 霓虹舞台：线条形象在暗底上才能体现发光 */
.stage { position: relative; display: inline-block; padding: 6px 10px; border-radius: 16px; overflow: hidden; background: radial-gradient(circle at 50% 40%, #16232e 0%, #0a1117 55%, #04070a 100%); }
.grid-overlay { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-image: linear-gradient(rgba(94, 234, 212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(94, 234, 212, 0.05) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; }
.wd-canvas { position: relative; z-index: 1; }
.big { font-size: 60px; }
.equipped { font-size: 14px; color: #6a5acd; margin-top: 8px; }
.wd-tip { font-size: 11px; color: #a8a2c0; margin-top: 4px; }
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
