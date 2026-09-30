<template>
	<view class="page">
		<view v-if="loading" class="center-tip">打开造型间……</view>

		<view v-else>
			<!-- 主预览 -->
			<view class="preview card">
				<canvas canvas-id="lookMain" :style="{ width: mainPx.w + 'px', height: mainPx.h + 'px' }"></canvas>
				<view class="p-sub">{{ pet.name }} · 表情预览不会保存，心情由互动状态自动决定</view>
			</view>

			<!-- 表情试换（仅预览） -->
			<view class="card">
				<view class="sec">试表情（不保存）</view>
				<view class="chip-row">
					<view v-for="e in exprKeys" :key="e" class="chip" :class="{ on: previewExp === e }" @click="setExp(e)">{{ exprName(e) }}</view>
				</view>
			</view>

			<!-- 性别 -->
			<view class="card">
				<view class="sec">性别</view>
				<view class="chip-row">
					<view v-for="g in genders" :key="g.v" class="chip" :class="{ on: look.gender === g.v }" @click="setGender(g.v)">{{ g.label }}</view>
				</view>
			</view>

			<!-- 肤色 -->
			<view class="card">
				<view class="sec">肤色</view>
				<view class="sw-row">
					<view v-for="s in skins" :key="s" class="sw" :class="{ on: look.skin === s }" :style="{ background: s }" @click="look.skin = s"></view>
				</view>
			</view>

			<!-- 发型发色 -->
			<view class="card">
				<view class="sec">发型</view>
				<view class="chip-row">
					<view v-for="h in hairKeys" :key="h" class="chip" :class="{ on: look.hair === h }" @click="look.hair = h">{{ hairName(h) }}</view>
				</view>
				<view class="sec" style="margin-top: 12px;">发色</view>
				<view class="sw-row">
					<view v-for="hc in hairColors" :key="hc" class="sw" :class="{ on: look.hairColor === hc }" :style="{ background: hc }" @click="look.hairColor = hc"></view>
				</view>
			</view>

			<!-- 衣服（所见即所得缩略图） -->
			<view class="card">
				<view class="sec">衣服（{{ look.gender === 'f' ? '女生' : '男生' }}款 + 通用款）</view>
				<view class="fit-row">
					<view v-for="o in fitOutfits" :key="o.key" class="fit-cell" :class="{ on: look.outfit === o.key }" @click="look.outfit = o.key">
						<canvas :canvas-id="'fit_' + o.key" :style="{ width: fitPx.w + 'px', height: fitPx.h + 'px' }"></canvas>
						<text class="fit-n">{{ o.name }}</text>
					</view>
				</view>
			</view>

			<button class="save-btn" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存新造型 ✨' }}</button>
			<view class="tip">提示：帽子/围巾/眼镜请在「衣橱」中穿戴，会自动叠加到形象上。</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo, getCachedPet, cachePet } from './store/pet.js'
import { SKIN_COLORS, HAIR_COLORS, OUTFITS, HAIRS, EXPRESSIONS } from './look.js'
import { renderPet, resolveLook, CANVAS_W, CANVAS_H } from './renderer.js'

const EXPR_LABEL = { smile: '微笑', laugh: '大笑', sad: '伤心', angry: '生气', surprised: '惊讶', upset: '难过', cheeky: '调皮', confused: '困惑' }

export default {
	data() {
		return {
			loading: true, saving: false, userId: '', pet: {},
			look: resolveLook(null),
			previewExp: 'smile',
			exprKeys: Object.keys(EXPRESSIONS),
			genders: [{ v: 'm', label: '男生' }, { v: 'f', label: '女生' }],
			skins: SKIN_COLORS,
			hairColors: HAIR_COLORS,
			hairKeys: Object.keys(HAIRS),
			mainPx: { w: CANVAS_W * 4, h: CANVAS_H * 4 },
			fitPx: { w: CANVAS_W * 1.5, h: CANVAS_H * 1.5 }
		}
	},
	computed: {
		fitOutfits() {
			return Object.keys(OUTFITS)
				.filter(k => OUTFITS[k].gender === this.look.gender || OUTFITS[k].gender === 'unisex')
				.map(k => ({ key: k, name: OUTFITS[k].name }))
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		const cached = getCachedPet()
		if (cached) this.pet = cached
		this.look = resolveLook(cached && cached.look)
		if (this.look.gender !== 'f' && this.look.hair === 'long') this.look.hair = 'short'
		this.loading = false
		this.$nextTick(() => this.drawAll())
	},
	watch: {
		look: { deep: true, handler() { this.drawAll() } },
		previewExp() { this.drawMain() }
	},
	methods: {
		exprName(e) { return EXPR_LABEL[e] || e },
		hairName(h) { return (HAIRS[h] || {}).name || h },
		setGender(g) {
			this.look.gender = g
			// 切换性别时回落该性别默认（除非当前衣服是通用款）
			const cur = OUTFITS[this.look.outfit]
			if (!cur || (cur.gender !== 'unisex' && cur.gender !== g)) {
				this.look.outfit = g === 'f' ? 'rose-dress' : 'tee-blue'
			}
			if (g === 'm' && this.look.hair === 'long') this.look.hair = 'short'
		},
		setExp(e) { this.previewExp = e },
		drawAll() {
			this.drawMain()
			this.drawFits()
		},
		drawMain() {
			try { renderPet(uni.createCanvasContext('lookMain', this), this.look, this.previewExp, this.pet.equippedItems || [], 4) } catch (e) {}
		},
		drawFits() {
			for (const o of this.fitOutfits) {
				try {
					const ctx = uni.createCanvasContext('fit_' + o.key, this)
					renderPet(ctx, Object.assign({}, this.look, { outfit: o.key }), 'smile', [], 1.5)
				} catch (e) {}
			}
		},
		async save() {
			this.saving = true
			try {
				const res = await callBeemore({ action: 'customizeLook', userId: this.userId, look: this.look })
				if (res.code === 0 && res.data && res.data.pet) {
					cachePet(res.data.pet)
					uni.$emit('beemore:pet-updated', res.data.pet)
					uni.showToast({ title: res.message || '新造型登场！', icon: 'success' })
					setTimeout(() => uni.navigateBack(), 600)
				} else {
					uni.showToast({ title: res.message || '保存失败', icon: 'none' })
				}
			} finally {
				this.saving = false
			}
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #ffeef5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.card { background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; }
.preview { display: flex; flex-direction: column; align-items: center; }
.p-sub { font-size: 12px; color: #999; margin-top: 8px; }
.sec { font-size: 14px; font-weight: bold; color: #6a5acd; margin-bottom: 8px; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 20px; background: #f4f2fb; font-size: 13px; color: #666; }
.chip.on { background: #6a5acd; color: #fff; }
.sw-row { display: flex; gap: 10px; }
.sw { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #eee; }
.sw.on { border-color: #6a5acd; box-shadow: 0 0 0 2px #b79cff; }
.fit-row { display: flex; flex-wrap: wrap; gap: 12px; }
.fit-cell { display: flex; flex-direction: column; align-items: center; padding: 6px; border-radius: 12px; }
.fit-cell.on { background: #efe6ff; box-shadow: 0 0 0 2px #b79cff inset; }
.fit-n { font-size: 11px; color: #666; margin-top: 4px; }
.save-btn { background: linear-gradient(135deg, #ff6b9d, #b06ab3); color: #fff; border-radius: 14px; font-size: 16px; }
.tip { font-size: 12px; color: #999; text-align: center; margin: 10px 0 20px; }
</style>
