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
				<view class="wd-tip">{{ hairName }} · 眼睛颜色在「造型间」调，下方可逐件逐片调配饰色</view>
				<view class="streak">🔥 连续陪伴 {{ streak }} 天</view>
			</view>

			<!-- 已穿戴配饰的配色面板：帽/围巾整体一色，眼镜左右镜片可分开 -->
			<view v-for="p in accPanels" :key="p.key" class="acc-card">
				<view class="acc-sec">{{ p.title }}<text class="acc-tip">{{ p.tip }}</text></view>
				<view v-for="row in p.rows" :key="row.slot" class="acc-row">
					<text class="acc-label">{{ row.label }}</text>
					<view class="sw-row">
						<view v-for="c in themeColors" :key="p.key + row.slot + c" class="sw" :class="{ on: row.on === c, dim: savingAcc }" :style="{ background: c }" @click="setAcc(p.key, row.slot, c)"></view>
						<view class="sw follow" :class="{ on: !row.on }" @click="setAcc(p.key, row.slot, followDefault)">随</view>
					</view>
				</view>
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
import { normalizeLook, accColorOf, FOLLOW_DEFAULT, THEME_COLORS, HAIRS } from './look.js'
import { renderPet, CANVAS_W, CANVAS_H } from './renderer.js'

// 衣橱可调色的配饰：眼镜分左/右镜片，其余整体一个 main 色（与云函数 LOOK_PARTS.accParts 对齐）
const ACC_PANELS = [
	{ key: 'hat', slots: [{ slot: 'main', label: '颜色' }] },
	{ key: 'scarf', slots: [{ slot: 'main', label: '颜色' }] },
	{ key: 'glasses', slots: [{ slot: 'l', label: '左镜片' }, { slot: 'r', label: '右镜片' }] }
]
const FOLLOW_TIP = '点「随」回到跟随衣服色'

export default {
	data() {
		return {
			loading: true, userId: '', items: [], streak: 1, pet: {}, px: { w: CANVAS_W * 3, h: CANVAS_H * 3 },
			// 配饰各部位配色（空串 = 跟随衣服色），与 look.accColors 双向同步
			accColors: { hat: { main: '' }, scarf: { main: '' }, glasses: { l: '', r: '' } },
			themeColors: THEME_COLORS,
			followDefault: FOLLOW_DEFAULT,
			savingAcc: false
		}
	},
	computed: {
		equippedText() {
			return this.items.filter(i => i.equipped).map(i => i.emoji + i.name).join(' ')
		},
		// 发型属于形象（造型间）而不在衣橱里，预览下方明说避免找不到开关
		hairName() { return '发型：' + (HAIRS[normalizeLook(this.pet.look, this.pet).hair] || HAIRS.none).name },
		// 只把已穿戴的配饰排进配色面板，并把当前选中色一起算好（避免模板里写层层取值）
		accPanels() {
			const eq = this.pet.equippedItems || []
			const panels = []
			for (const p of ACC_PANELS) {
				if (eq.indexOf(p.key) < 0) continue
				const item = this.items.filter(i => i.key === p.key)[0]
				const rows = p.slots.map(s => ({ slot: s.slot, label: s.label, on: accColorOf(this.accColors, p.key, s.slot) }))
				panels.push({ key: p.key, title: (item ? item.name : p.key) + '配色', tip: (p.key === 'glasses' ? '两只镜片可以用不同颜色；' : '') + FOLLOW_TIP, rows })
			}
			return panels
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
				this.syncAccColors()
			}
			this.loading = false
			this.$nextTick(() => this.drawPet())
			// canvas 在 v-else 里，小程序首帧未就绪时补画一次
			setTimeout(() => this.drawPet(), 200)
		},
		// 从当前 look 回填配饰配色面板（服务端未存过该字段时各处都是“跟随衣服”）
		syncAccColors() {
			const acc = (this.pet.look || {}).accColors || {}
			this.accColors = {
				hat: { main: accColorOf(acc, 'hat', 'main') },
				scarf: { main: accColorOf(acc, 'scarf', 'main') },
				glasses: { l: accColorOf(acc, 'glasses', 'l'), r: accColorOf(acc, 'glasses', 'r') }
			}
		},
		async setAcc(part, slot, color) {
			if (this.savingAcc) return
			if ((this.accColors[part][slot] || '') === (color || '')) return
			this.savingAcc = true
			try {
				const res = await callBeemore({ action: 'setAccColor', userId: this.userId, part, slot, color })
				if (res.code === 0 && res.data && res.data.pet) {
					this.pet = res.data.pet
					this.accColors[part] = Object.assign({}, this.accColors[part], { [slot]: color || FOLLOW_DEFAULT })
					this.drawPet()
					// 主面板等页面靠该事件刷新，否则回到主页还是旧配色（callBeemore 已写本地缓存）
					uni.$emit('beemore:pet-updated', res.data.pet)
				} else {
					uni.showToast({ title: res.message || '配色失败', icon: 'none' })
				}
			} finally {
				this.savingAcc = false
			}
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
/* 配饰配色：与造型间一致的圆形色卡，按件/按片分行选色 */
.acc-card { background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; }
.acc-sec { font-size: 14px; font-weight: bold; color: #6a5acd; margin-bottom: 10px; }
.acc-tip { font-size: 11px; color: #aaa; font-weight: normal; margin-left: 8px; }
.acc-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.acc-row:last-child { margin-bottom: 0; }
.acc-label { font-size: 12px; color: #666; width: 46px; flex-shrink: 0; }
.sw-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sw { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #eee; }
.sw.on { border-color: #6a5acd; box-shadow: 0 0 0 2px #b79cff; }
.sw.dim { opacity: .5; }
.sw.follow { background: #f4f2fb; color: #6a5acd; font-size: 12px; text-align: center; line-height: 24px; }
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
