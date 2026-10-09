<template>
	<view class="page">
		<view v-if="loading" class="center-tip">打开造型间……</view>

		<view v-else>
			<!-- 主预览（霓虹舞台） -->
			<view class="preview card stage">
				<view class="grid-overlay"></view>
				<canvas :canvas-id="cid" :style="{ width: mainPx.w + 'px', height: mainPx.h + 'px' }" class="main-canvas"></canvas>
				<view class="p-sub light">{{ petName }} · 表情预览不会保存，心情由互动状态自动决定</view>
				<view v-if="failReason" class="p-sub light warn">预览画不出来：{{ failReason }}（配色仍可正常选择并保存）</view>
			</view>

			<!-- 性别 -->
			<view class="card">
				<view class="sec">性别</view>
				<view class="chip-row">
					<view v-for="g in genders" :key="g.v" class="chip" :class="{ on: look.gender === g.v }" @click="setGender(g.v)">{{ g.label }}</view>
				</view>
			</view>

			<!-- 衣服颜色（对应 ren.html 男衣/女衣） -->
			<view class="card">
				<view class="sec">衣服颜色</view>
				<view class="sw-row">
					<view v-for="c in themeColors" :key="'c' + c" class="sw" :class="{ on: look.clothColor === c }" :style="{ background: c }" @click="look.clothColor = c"></view>
				</view>
			</view>

			<!-- 眼睛颜色（五官属于形象，所以放在造型间而不是衣橱） -->
			<view class="card">
				<view class="sec">眼睛颜色<text class="sec-tip">两只眼睛可以不一样，点「随」回到线条色</text></view>
				<view class="eye-row">
					<text class="eye-label">左眼</text>
					<view class="sw-row">
						<view v-for="c in themeColors" :key="'eL' + c" class="sw" :class="{ on: eyeColors.l === c }" :style="{ background: c }" @click="setEye('l', c)"></view>
						<view class="sw follow" :class="{ on: !eyeColors.l }" @click="setEye('l', followDefault)">随</view>
					</view>
				</view>
				<view class="eye-row">
					<text class="eye-label">右眼</text>
					<view class="sw-row">
						<view v-for="c in themeColors" :key="'eR' + c" class="sw" :class="{ on: eyeColors.r === c }" :style="{ background: c }" @click="setEye('r', c)"></view>
						<view class="sw follow" :class="{ on: !eyeColors.r }" @click="setEye('r', followDefault)">随</view>
					</view>
				</view>
			</view>

			<!-- 发型（可选部件：不选就没有头发） -->
			<view class="card">
				<view class="sec">发型<text class="sec-tip">头发是可自己选的，默认没有</text></view>
				<view class="chip-row">
					<view v-for="h in hairKeys" :key="h" class="chip" :class="{ on: look.hair === h }" @click="look.hair = h">{{ hairName(h) }}</view>
				</view>
			</view>

			<!-- 头发颜色（对应 ren.html 男发/女发，无发时置灰） -->
			<view class="card" :class="{ dim: noHair }">
				<view class="sec">头发颜色<text v-if="noHair" class="sec-tip">先选个发型才能挑发色</text></view>
				<view class="sw-row">
					<view v-for="c in themeColors" :key="'h' + c" class="sw" :class="{ on: look.hairColor === c }" :style="{ background: c }" @click="setHairColor(c)"></view>
				</view>
			</view>

			<!-- 表情试换（仅预览） -->
			<view class="card">
				<view class="sec">试表情（不保存）</view>
				<view class="chip-row">
					<view v-for="e in exprKeys" :key="e" class="chip" :class="{ on: previewExp === e }" @click="setExp(e)">{{ faceName(e) }}</view>
				</view>
			</view>

			<button class="save-btn" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存新造型 ✨' }}</button>
			<view class="tip">提示：眼睛颜色在这里选（含眉毛/爱心目等眼部形状）；帽子/围巾/眼镜在「衣橱」里穿戴，可在那里逐件逐片调色，不选就自动叠加衣服色；头身线条颜色由性别固定。</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo, getCachedPet, cachePet } from './store/pet.js'
import { THEME_COLORS, THEME_DEFAULT, FOLLOW_DEFAULT, HAIRS, HAIR_KEYS, FACE_KEYS, FACE_LABEL } from './look.js'
import { renderPet, resolveLook, CANVAS_W, CANVAS_H } from './renderer.js'

const FRAME_MS = 60
const MAIN_SCALE = 4

export default {
	data() {
		return {
			loading: true, saving: false, userId: '', pet: {},
			look: resolveLook(null),
			previewExp: 'normal',
			exprKeys: FACE_KEYS,
			hairKeys: HAIR_KEYS,
			themeColors: THEME_COLORS,
			followDefault: FOLLOW_DEFAULT,
			genders: [{ v: 'm', label: '男生' }, { v: 'f', label: '女生' }],
			mainPx: { w: CANVAS_W * MAIN_SCALE, h: CANVAS_H * MAIN_SCALE },
			// 画布 id 带随机后缀（与 PetDisplay 一致），避免与其它页面同名 canvas 串画
			cid: 'lookMain_' + Math.random().toString(36).slice(2, 8),
			failReason: '',
			t: 0, timer: null
		}
	},
	computed: {
		petName() { return this.pet.name || '杯蜜' },
		// 永远返回对象：模板里不再裸访问 look.eyeColors.x（一旦 look 被换成缺字段的对象，整个页面渲染报错就是白屏）
		eyeColors() { return (this.look && this.look.eyeColors) || { l: FOLLOW_DEFAULT, r: FOLLOW_DEFAULT } },
		// 无发时发色面板置灰（同 ren.html 头发开关把调色板 disabled 的处理）
		noHair() { return !this.look || this.look.hair === 'none' }
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.applyLook(getCachedPet())
		this.loading = false
		// 无本地缓存（如缓存版本刚升级）时必须以服务端形象为准，否则默认造型会覆盖用户已保存的发型
		if (!getCachedPet()) this.fetchServerLook()
	},
	// canvas 要等页面首帧渲染完才存在，故在 onReady 里画并启动动画（同 PetDisplay 的延时补画）
	onReady() {
		this.$nextTick(() => { this.drawMain(); setTimeout(() => { this.drawMain(); this.start() }, 200) })
	},
	onUnload() { this.stop() },
	onHide() { this.stop() },
	onShow() { this.start() },
	watch: {
		look: { deep: true, handler() { this.drawMain() } },
		previewExp() { this.drawMain() }
	},
	methods: {
		// 把 pet 数据灌进编辑器（look 统一走 resolveLook，头发未选时保持“无发”）
		applyLook(pet) {
			if (!pet) return
			this.pet = pet
			this.look = resolveLook(pet.look)
		},
		faceName(e) { return FACE_LABEL[e] || e },
		hairName(h) { return (HAIRS[h] || {}).name || h },
		setHairColor(c) {
			if (this.noHair) {
				uni.showToast({ title: '现在是光头，先选个发型再挑发色', icon: 'none' })
				return
			}
			this.look.hairColor = c
		},
		// 眼睛左右分色（异瞳）：空串 = 该侧回到性别线条色
		setEye(side, c) {
			const cur = this.look.eyeColors || { l: FOLLOW_DEFAULT, r: FOLLOW_DEFAULT }
			this.look.eyeColors = { l: side === 'l' ? c : cur.l, r: side === 'r' ? c : cur.r }
		},
		async fetchServerLook() {
			try {
				const res = await callBeemore({ action: 'getStatus', userId: this.userId })
				if (res && res.code === 0 && res.data && res.data.pet) this.applyLook(res.data.pet)
			} catch (e) { /* 拉不到就用本地/默认形象，不拦编辑 */ }
		},
		start() {
			if (this.timer || this.loading || this.failReason) return
			this.timer = setInterval(() => { this.t += FRAME_MS; this.drawMain() }, FRAME_MS)
		},
		stop() { if (this.timer) { clearInterval(this.timer); this.timer = null } },
		drawMain() {
			if (this.failReason) return
			try {
				const ctx = uni.createCanvasContext(this.cid, this)
				if (!ctx) { this.failReason = '找不到画布上下文'; return }
				renderPet(ctx, this.look, this.previewExp, this.pet.equippedItems || [], MAIN_SCALE, { time: this.t })
			} catch (e) {
				// 以前把异常吞了，画不出来时只能看到一片黑舞台，现在把原因显示出来并停帧
				this.failReason = (e && (e.errMsg || e.message)) || '绘图异常'
				this.stop()
			}
		},
		setGender(g) {
			const old = this.look.gender
			this.look.gender = g
			// 沿用该性别默认色：仅当颜色还是上一性别的默认值时才切换，尊重用户主动选色
			const dOld = THEME_DEFAULT[old], dNew = THEME_DEFAULT[g]
			if (this.look.clothColor === dOld.cloth) this.look.clothColor = dNew.cloth
			if (this.look.hairColor === dOld.hair) this.look.hairColor = dNew.hair
		},
		setExp(e) { this.previewExp = e },
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
/* 霓虹舞台底（与主面板一致，突出线条发光） */
.stage { position: relative; overflow: hidden; background: radial-gradient(circle at 50% 40%, #16232e 0%, #0a1117 55%, #04070a 100%); }
.grid-overlay { position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-image: linear-gradient(rgba(94, 234, 212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(94, 234, 212, 0.05) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; }
.main-canvas { position: relative; z-index: 1; }
.p-sub { font-size: 12px; color: #999; margin-top: 8px; position: relative; z-index: 1; }
.p-sub.light { color: rgba(255, 255, 255, 0.6); }
.p-sub.warn { color: #ffb4a9; margin-top: 4px; }
.sec { font-size: 14px; font-weight: bold; color: #6a5acd; margin-bottom: 8px; }
.sec-tip { font-size: 11px; color: #aaa; font-weight: normal; margin-left: 8px; }
/* 无发时发色卡片置灰（同 ren.html .swatches.disabled） */
.card.dim { opacity: .45; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 12px; border-radius: 20px; background: #f4f2fb; font-size: 13px; color: #666; }
.chip.on { background: #6a5acd; color: #fff; }
.sw-row { display: flex; flex-wrap: wrap; gap: 10px; }
.sw { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #eee; }
.sw.on { border-color: #6a5acd; box-shadow: 0 0 0 2px #b79cff; }
.sw.follow { background: #f4f2fb; color: #6a5acd; font-size: 13px; text-align: center; line-height: 30px; }
.eye-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.eye-row:last-child { margin-bottom: 0; }
.eye-label { font-size: 12px; color: #666; width: 34px; flex-shrink: 0; }
.save-btn { background: linear-gradient(135deg, #ff6b9d, #b06ab3); color: #fff; border-radius: 14px; font-size: 16px; }
.tip { font-size: 12px; color: #999; text-align: center; margin: 10px 0 20px; }
</style>
