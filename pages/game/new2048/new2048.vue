<template>
	<view class="page">
		<view class="hud">
			<view class="hud-item">分数<text class="hud-val">{{ score }}</text></view>
			<view class="hud-item">最高<text class="hud-val">{{ best }}</text></view>
			<view class="hud-item">下一个<image class="hud-val next-img" :src="levelImg(nextLevel)" mode="aspectFill"></image></view>
			<view class="hud-btn ghost" @click="openSkin">🎨贴图</view>
			<view class="hud-btn" @click="restart">重新开始</view>
		</view>

		<view class="stage" :style="{ width: canvasW + 'px', height: canvasH + 'px' }">
			<canvas canvas-id="game" id="game" class="cv" :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
				@touchstart="onTouch" @touchmove="onTouch" @touchend="onDrop"></canvas>

			<!-- 开始遮罩 -->
			<view v-if="status === 'ready'" class="overlay" @click="restart">
				<view class="ov-card">
					<view class="ov-big">🍉</view>
					<view class="ov-title">合成大青宇</view>
					<view class="ov-sub">左右滑动瞄准 · 松开手指投放</view>
					<view class="ov-sub">同级水果相碰即可升级，堆过红线就输啦</view>
					<button class="ov-btn">开始游戏</button>
				</view>
			</view>

			<!-- 胜利提示（可继续） -->
			<view v-if="status === 'playing' && showWin" class="overlay" @click="resumePlay">
				<view class="ov-card">
					<view class="ov-big">🎉🍉🎉</view>
					<view class="ov-title">合成大青宇！</view>
					<view class="ov-sub">当前 {{ score }} 分，点击继续冲击更高分</view>
					<button class="ov-btn">继续玩</button>
				</view>
			</view>

			<!-- 结束遮罩 -->
			<view v-if="status === 'over'" class="overlay">
				<view class="ov-card">
					<view class="ov-big">😵</view>
					<view class="ov-title">游戏结束</view>
					<view class="ov-sub">本局 {{ score }} 分 · 历史最高 {{ best }} 分</view>
					<button class="ov-btn" @click.stop="restart">再来一局</button>
				</view>
			</view>
		</view>

		<view class="tips">提示：两个大青宇不再合并；合成大青宇即胜利，可继续刷分</view>

		<!-- 自定义贴图弹窗（登录用户上传/选择水果皮肤） -->
		<view v-if="skinVisible" class="popup-mask" @click="closeSkin" @touchmove.stop.prevent>
			<view class="skin-panel" @click.stop>
				<view class="sp-head">
					<text class="sp-title">自定义水果贴图</text>
					<text class="sp-close" @click="closeSkin">×</text>
				</view>

				<view v-if="!loggedIn" class="sp-login">请先登录后再上传属于你自己的水果图片～</view>

				<block v-else>
					<view class="sp-row">
						<text class="sp-label">使用我的图片作贴图</text>
						<switch :checked="skinOn" color="#e0566b" @change="onToggleSkin" />
					</view>
					<view class="sp-tip">按点选先后依次对应 Lv1→Lv{{ MAX_SELECTED }}（Lv1 最小、Lv{{ MAX_SELECTED }} 最大），缩略图左上角已标注其等级；选不满时高等级自动用默认图补足。图库可上传最多 {{ MAX_GALLERY }} 张（可多于 {{ MAX_SELECTED }} 张备用），但同时最多勾选 {{ MAX_SELECTED }} 张作贴图；需调整顺序时先取消再重新按序点选。</view>

					<scroll-view scroll-y class="sp-body">
						<view class="grid">
							<view class="cell" :class="{ disabled: gallery.length >= MAX_GALLERY }" @click="onUpload">
								<text class="cell-plus">＋</text>
								<text class="cell-txt">{{ gallery.length >= MAX_GALLERY ? '已满' : '上传' }}</text>
							</view>
							<view v-for="item in gallery" :key="item._id" class="cell"
								:class="{ picked: isSelected(item.url) }" @click="toggleSelect(item)">
								<image class="cell-img" :src="item.url" mode="aspectFill"></image>
								<text v-if="isSelected(item.url)" class="cell-level">Lv{{ selIdx(item.url) + 1 }}</text>
								<text v-if="isSelected(item.url)" class="cell-check">✓</text>
								<text class="cell-del" @click.stop="onDeleteImg(item)">×</text>
							</view>
						</view>
						<view v-if="!gallery.length" class="sp-empty">还没有图片，点上方“＋上传”添加吧</view>
					</scroll-view>

					<view class="sp-foot">
						<text class="sp-count">图库 {{ gallery.length }}/{{ MAX_GALLERY }} · 已选 {{ selected.length }}/{{ MAX_SELECTED }}</text>
						<view class="sp-btn" @click="closeSkin">完成</view>
					</view>
				</block>
			</view>
		</view>
	</view>
</template>

<script>
import { FRUITS, MAX_LEVEL, randomSpawnLevel } from './fruits.js'
import { createWorld, addCircle, removeCircle, step } from './physics.js'

const SPAWN_Y = 36 // 待落水果中心线
const DEATH_Y = SPAWN_Y + 34 // 死亡线
const BEST_KEY = 'new2048_best'
const CLOUD_DOMAIN = 'https://env-00jy66xyyok3.normal.cloudstatic.cn'
const SKIN_FN = 'game2048-skin'
// 贴图数量限制：图库总量至多 MAX_GALLERY 张（与云函数一致）；勾选至多 MAX_SELECTED（=等级数，按等级从低到高依次套用，不足部分用默认图补足）、至少 1 张才可开启
const MAX_GALLERY = 20
const MAX_SELECTED = 11
const MIN_SELECTED = 1
// 皮肤本地持久化 key 前缀（按用户隔离）：{ on, selected:[url...] }
const SKIN_STORE_PREFIX = 'new2048_skin_'

export default {
	data() {
		return {
			FRUITS,
			canvasW: 300,
			canvasH: 420,
			status: 'ready', // ready | playing | over
			score: 0,
			best: 0,
			nextLevel: 0,
			showWin: false,
			// 自定义贴图相关
			skinVisible: false,
			loggedIn: false,
			userId: '',
			gallery: [], // 当前用户已上传图片 [{_id,url,...}]
			selected: [], // 勾选作为皮肤的 url 数组（按顺序）
			skinOn: false, // 是否启用自定义贴图
			uploading: false
		}
	},
	created() {
		// 非响应式实例属性：高频物理数据不进 data，避免小程序 setData 开销
		this.world = null
		this.aimX = 150
		this.rectLeft = 0
		this.timer = null
		this.dropLockUntil = 0
		this.fx = [] // 合成闪光特效
		this.winShown = false
		this.imgs = {} // level → 预加载完成的本地图路径
		this.imgSize = {} // level → 原图宽高 {w,h}，用于等比裁剪防变形
	},
	onLoad() {
		const info = uni.getSystemInfoSync()
		const w = Math.min(info.windowWidth - 24, 420)
		this.canvasW = Math.round(w)
		this.canvasH = Math.round(Math.min(w * 1.4, info.windowHeight - 170))
		this.aimX = this.canvasW / 2
		this.best = Number(uni.getStorageSync(BEST_KEY)) || 0
		this.initUserSkin()
		this.preloadImages()
	},
	onReady() {
		this.queryRect()
	},
	onHide() { this.stopTimer() },
	onUnload() { this.stopTimer() },
	onShow() {
		if (this.status === 'playing' && !this.timer) this.timer = setInterval(() => this.tick(), 33)
	},
	methods: {
		// 预加载各等级贴图：启用自定义时低等级用用户图、不足等级用默认在线图补足；转本地缓存路径供 canvas drawImage
		preloadImages() {
			this.imgs = {}
			for (let i = 0; i < FRUITS.length; i++) {
				const src = this.levelImg(i)
				if (!src) continue
				const level = i
				uni.getImageInfo({
					src,
					success: (res) => {
						this.imgs[level] = res.path
						this.imgSize[level] = { w: res.width, h: res.height }
						if (this.status !== 'playing') this.draw()
					},
					fail: () => {} // 失败降级为色圆 + emoji
				})
			}
		},
		/* ---------- 自定义贴图（登录用户上传/选择，图库持久化） ---------- */
		// 读取本地 userInfo（项目统一存于 storage，JSON 字符串）
		getMyUserInfo() {
			try { const raw = uni.getStorageSync('userInfo'); return raw ? JSON.parse(raw) : null } catch (e) { return null }
		},
		// 初始化登录态并恢复本用户已保存的皮肤选择
		initUserSkin() {
			const u = this.getMyUserInfo()
			this.loggedIn = !!(u && u._id)
			this.userId = u && u._id ? u._id : ''
			if (!this.loggedIn) return
			try {
				const saved = JSON.parse(uni.getStorageSync(SKIN_STORE_PREFIX + this.userId) || '{}')
				this.skinOn = !!saved.on
				this.selected = Array.isArray(saved.selected) ? saved.selected : []
			} catch (e) { this.skinOn = false; this.selected = [] }
		},
		// 当前第 i 级水果使用贴图：启用自定义时低等级依次用勾选的图，选够前用完则回退默认图补足
		levelImg(i) {
			if (this.skinOn && this.selected && i < this.selected.length) return this.selected[i]
			return FRUITS[i].img
		},
		openSkin() {
			this.skinVisible = true
			if (this.loggedIn) this.loadGallery()
		},
		closeSkin() { this.skinVisible = false },
		loadGallery() {
			uni.showLoading({ title: '加载中' })
			this.callSkin({ action: 'list', userId: this.userId }).then(res => {
				this.gallery = (res && res.code === 0 && res.data) ? res.data : []
			}).catch(() => { this.gallery = [] }).finally(() => uni.hideLoading())
		},
		isSelected(url) { return this.selected.indexOf(url) !== -1 },
		selIdx(url) { return this.selected.indexOf(url) },
		toggleSelect(item) {
			const idx = this.selected.indexOf(item.url)
			if (idx === -1) {
				if (this.selected.length >= MAX_SELECTED) { uni.showToast({ title: `最多勾选 ${MAX_SELECTED} 张`, icon: 'none' }); return }
				this.selected.push(item.url)
			} else {
				this.selected.splice(idx, 1)
			}
			if (this.selected.length < MIN_SELECTED) this.skinOn = false
			this.persistSkin()
			this.applySkin()
		},
		onToggleSkin(e) {
			const on = e.detail.value
			if (on && this.selected.length < MIN_SELECTED) { uni.showToast({ title: `请至少勾选 ${MIN_SELECTED} 张图片`, icon: 'none' }); return }
			this.skinOn = on
			this.persistSkin()
			this.applySkin()
		},
		onDeleteImg(item) {
			uni.showModal({
				title: '删除图片', content: '从图库中移除这张图片？',
				success: (r) => {
					if (!r.confirm) return
					this.callSkin({ action: 'remove', userId: this.userId, id: item._id }).then(res => {
						if (res && res.code === 0) {
							this.gallery = this.gallery.filter(g => g._id !== item._id)
							const si = this.selected.indexOf(item.url)
							if (si !== -1) { this.selected.splice(si, 1); if (this.selected.length < MIN_SELECTED) this.skinOn = false; this.persistSkin(); this.applySkin() }
						} else uni.showToast({ title: (res && res.message) || '删除失败', icon: 'none' })
					})
				}
			})
		},
		onUpload() {
			if (this.uploading) return
			if (this.gallery.length >= MAX_GALLERY) { uni.showToast({ title: `图库最多 ${MAX_GALLERY} 张，请先删除部分图片`, icon: 'none' }); return }
			const remain = MAX_GALLERY - this.gallery.length
			uni.chooseImage({
				count: Math.min(remain, 9),
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					this.uploading = true
					uni.showLoading({ title: '上传中...', mask: true })
					try {
						let failedMsg = ''
						const added = []
						for (const filePath of res.tempFilePaths) {
							const r = await this.uploadOne(filePath)
							if (r && r.url) {
								if (this.gallery.some(g => g.url === r.url) || added.some(a => a.url === r.url)) continue // 本地去重
								const saved = await this.callSkin({ action: 'add', userId: this.userId, url: r.url, cloudPath: r.cloudPath })
								if (saved && saved.code === 0) added.unshift(saved.data)
								else failedMsg = (saved && saved.message) || '登记失败'
							}
						}
						if (added.length) {
							this.gallery = added.concat(this.gallery)
							// 自动勾选新图，但不超过 MAX_SELECTED
							added.forEach(d => { if (this.selected.indexOf(d.url) === -1 && this.selected.length < MAX_SELECTED) this.selected.push(d.url) })
							if (this.selected.length >= MIN_SELECTED) this.skinOn = true
							this.persistSkin()
							this.applySkin()
						}
						if (added.length && failedMsg) uni.showToast({ title: `已上传 ${added.length} 张，部分失败：${failedMsg}`, icon: 'none' })
						else if (added.length) uni.showToast({ title: `已上传 ${added.length} 张`, icon: 'none' })
						else if (failedMsg) uni.showToast({ title: failedMsg, icon: 'none' })
					} catch (err) {
						uni.showModal({ content: '上传失败：' + ((err && err.message) || '未知错误'), showCancel: false })
					} finally {
						uni.hideLoading()
						this.uploading = false
					}
				}
			})
		},
		// 单张上传到云存储，返回 {url, cloudPath}（与 image-upload 一致的 fileID 还原方式）
		uploadOne(filePath) {
			return new Promise((resolve, reject) => {
				const ts = Date.now()
				const rand = Math.random().toString(36).substr(2, 9)
				const cloudPath = `game2048/${this.userId}/${ts}_${rand}.jpg`
				uniCloud.uploadFile({
					filePath,
					cloudPath,
					success: (res) => {
						const parts = (res.fileID || '').split('/')
						const realPath = parts.slice(3).join('/')
						resolve({ url: `${CLOUD_DOMAIN}/${realPath}`, cloudPath: realPath })
					},
					fail: (e) => reject(e)
				})
			})
		},
		// 切换皮肤后重新预加载贴图（无需重开一局）
		applySkin() {
			this.preloadImages()
			if (this.status !== 'playing') this.draw()
		},
		persistSkin() {
			if (!this.loggedIn) return
			try { uni.setStorageSync(SKIN_STORE_PREFIX + this.userId, JSON.stringify({ on: this.skinOn, selected: this.selected })) } catch (e) {}
		},
		callSkin(payload) {
			return uniCloud.callFunction({ name: SKIN_FN, data: payload }).then(r => r.result)
		},
		queryRect() {
			uni.createSelectorQuery().in(this).select('#game').boundingClientRect(rect => {
				if (rect) this.rectLeft = rect.left
			}).exec()
		},
		restart() {
			this.stopTimer()
			this.world = createWorld(this.canvasW, this.canvasH)
			this.fx = []
			this.winShown = false
			this.showWin = false
			this.score = 0
			this.nextLevel = randomSpawnLevel()
			this.dropLockUntil = 0
			this.status = 'playing'
			this.queryRect()
			this.timer = setInterval(() => this.tick(), 33)
			this.draw()
		},
		stopTimer() {
			if (this.timer) { clearInterval(this.timer); this.timer = null }
		},
		resumePlay() { this.showWin = false },
		tick() {
			if (this.status !== 'playing' || this.showWin) return
			step(this.world, 0.033)
			this.processMerges()
			this.checkDeath()
			this.draw()
		},
		clampAim(x, r) {
			const rr = r || 20
			return Math.max(rr + 2, Math.min(this.canvasW - rr - 2, x))
		},
		onTouch(e) {
			if (this.status !== 'playing' || this.showWin) return
			const t = e.touches && e.touches[0]
			if (!t) return
			const f = FRUITS[this.nextLevel]
			this.aimX = this.clampAim(t.clientX - this.rectLeft, f.r)
		},
		onDrop() {
			if (this.status !== 'playing' || this.showWin) return
			const now = Date.now()
			if (now < this.dropLockUntil) return
			const f = FRUITS[this.nextLevel]
			const b = addCircle(this.world, this.clampAim(this.aimX, f.r), SPAWN_Y, f.r, { level: this.nextLevel })
			b.bornAt = now
			this.nextLevel = randomSpawnLevel()
			this.dropLockUntil = now + 480
		},
		processMerges() {
			const pairs = []
			for (const [a, b] of this.world.contacts) {
				if (a.merged || b.merged) continue
				if (a.level == null || a.level !== b.level) continue
				if (a.level >= MAX_LEVEL) continue
				a.merged = true
				b.merged = true
				pairs.push([a, b])
			}
			if (!pairs.length) return
			const now = Date.now()
			for (const [a, b] of pairs) {
				const nl = a.level + 1
				const x = (a.x + b.x) / 2
				const y = (a.y + b.y) / 2
				removeCircle(this.world, a)
				removeCircle(this.world, b)
				const r = FRUITS[nl].r
				const nb = addCircle(this.world, this.clampAim(x, r), Math.min(y, this.canvasH - r), r, { level: nl })
				nb.vx = 0
				nb.vy = ((a.vy + b.vy) / 2) * 0.4 // 新水果速度归小，避免飞出
				nb.bornAt = now // 合成保护期，防死亡线误判
				this.score += FRUITS[nl].score
				this.fx.push({ x: nb.x, y: nb.y, r, until: now + 260 })
				if (nl === MAX_LEVEL && !this.winShown) {
					this.winShown = true
					this.showWin = true
				}
			}
		},
		checkDeath() {
			const now = Date.now()
			const bs = this.world.bodies
			for (let i = 0; i < bs.length; i++) {
				const b = bs[i]
				if (b.bornAt && now - b.bornAt < 1200) continue // 刚投放/刚合成的水果给缓冲
				if (b.y - b.r < DEATH_Y && Math.abs(b.vy) < 45) {
					if (!b.overAt) b.overAt = now
					else if (now - b.overAt > 1500) { this.gameOver(); return }
				} else {
					b.overAt = 0
				}
			}
		},
		gameOver() {
			this.status = 'over'
			this.stopTimer()
			if (this.score > this.best) {
				this.best = this.score
				uni.setStorageSync(BEST_KEY, String(this.best))
			}
			this.draw()
		},
		/* ---------- Canvas 渲染（旧版 API，微信/支付宝小程序通用） ---------- */
		draw() {
			const ctx = uni.createCanvasContext('game', this)
			const W = this.canvasW, H = this.canvasH
			// 背景
			const grad = ctx.createLinearGradient(0, 0, 0, H)
			grad.addColorStop(0, '#f6efdb')
			grad.addColorStop(1, '#e9dfc8')
			ctx.setFillStyle(grad)
			ctx.fillRect(0, 0, W, H)
			// 左右墙 + 底部装饰
			ctx.setFillStyle('#c8b89a')
			ctx.fillRect(0, 0, 3, H)
			ctx.fillRect(W - 3, 0, 3, H)
			ctx.fillRect(0, H - 3, W, 3)
			// 死亡线（短横段模拟虚线）
			ctx.setStrokeStyle('rgba(224, 86, 107, .7)')
			ctx.setLineWidth(2)
			for (let x = 4; x < W - 4; x += 14) {
				ctx.beginPath()
				ctx.moveTo(x, DEATH_Y)
				ctx.lineTo(Math.min(x + 8, W - 4), DEATH_Y)
				ctx.stroke()
			}
			// 瞄准引导线（短竖段模拟虚线）
			if (this.status === 'playing' && !this.showWin) {
				ctx.setStrokeStyle('rgba(120, 110, 90, .35)')
				ctx.setLineWidth(1)
				for (let y = SPAWN_Y + 14; y < H - 6; y += 12) {
					ctx.beginPath()
					ctx.moveTo(this.aimX, y)
					ctx.lineTo(this.aimX, Math.min(y + 6, H - 6))
					ctx.stroke()
				}
			}
			// 水果
			if (this.world) {
				const bs = this.world.bodies
				for (let i = 0; i < bs.length; i++) {
					this.drawFruit(ctx, bs[i].x, bs[i].y, bs[i].r, bs[i].level)
				}
			}
			// 合成闪光圈
			const now = Date.now()
			this.fx = this.fx.filter(fx => fx.until > now)
			for (const f of this.fx) {
				const p = (f.until - now) / 260
				ctx.setStrokeStyle('rgba(255, 255, 255, ' + (0.85 * p).toFixed(2) + ')')
				ctx.setLineWidth(3)
				ctx.beginPath()
				ctx.arc(f.x, f.y, f.r + (1 - p) * 14, 0, Math.PI * 2)
				ctx.stroke()
			}
			// 待落水果
			if (this.status === 'playing') {
				const f = FRUITS[this.nextLevel]
				this.drawFruit(ctx, this.clampAim(this.aimX, f.r), SPAWN_Y, f.r, this.nextLevel)
			}
			ctx.draw()
		},
		drawFruit(ctx, x, y, r, level) {
			const f = FRUITS[level]
			const img = this.imgs[level]
			if (img) {
				// 圆形裁剪贴图：按短边取居中正方形源区，等比填入圆内，避免非方图被拉伸变形
				ctx.save()
				ctx.beginPath()
				ctx.arc(x, y, r, 0, Math.PI * 2)
				ctx.clip()
				const dim = this.imgSize[level]
				if (dim && dim.w && dim.h) {
					const side = Math.min(dim.w, dim.h)
					const sx = (dim.w - side) / 2
					const sy = (dim.h - side) / 2
					ctx.drawImage(img, sx, sy, side, side, x - r, y - r, r * 2, r * 2)
				} else {
					ctx.drawImage(img, x - r, y - r, r * 2, r * 2)
				}
				ctx.restore()
				ctx.beginPath()
				ctx.arc(x, y, r, 0, Math.PI * 2)
				ctx.setStrokeStyle('rgba(0, 0, 0, .22)')
				ctx.setLineWidth(2)
				ctx.stroke()
				return
			}
			// 降级：色圆 + 高光 + emoji
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2)
			ctx.setFillStyle(f.color)
			ctx.fill()
			ctx.setStrokeStyle('rgba(0, 0, 0, .18)')
			ctx.setLineWidth(2)
			ctx.stroke()
			// 高光
			ctx.beginPath()
			ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2)
			ctx.setFillStyle('rgba(255, 255, 255, .35)')
			ctx.fill()
			ctx.setFontSize(Math.max(Math.round(r * 1.05), 12))
			ctx.setTextAlign('center')
			ctx.setTextBaseline('middle')
			ctx.setFillStyle('#fff')
			ctx.fillText(f.emoji, x, y + r * 0.08)
		}
	},
	onShareAppMessage() {
		return { title: '合成大青宇：我的最高分 ' + this.best + '，来挑战！', path: '/pages/game/new2048/new2048' }
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: #efe6d0; display: flex; flex-direction: column; align-items: center; padding: 12px 0 20px; box-sizing: border-box; }
.hud { width: 92vw; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.hud-item { flex: 1; background: #fff; border-radius: 12px; padding: 6px 8px; text-align: center; font-size: 11px; color: #9a8c6e; }
.hud-val { display: block; font-size: 17px; font-weight: bold; color: #5d4f36; margin-top: 2px; }
.next-img { width: 26px; height: 26px; border-radius: 50%; margin: 2px auto 0; display: block; }
.hud-btn { background: #e0566b; color: #fff; font-size: 12px; border-radius: 12px; padding: 10px 12px; }
.hud-btn.ghost { background: #fff; color: #e0566b; border: 1px solid #f2c8d0; }
.stage { position: relative; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(93, 79, 54, .18); }
.cv { display: block; }
.overlay { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(60, 50, 30, .55); display: flex; align-items: center; justify-content: center; }
.ov-card { width: 78%; background: #fff; border-radius: 18px; padding: 22px 16px; text-align: center; }
.ov-big { font-size: 42px; }
.ov-title { font-size: 19px; font-weight: bold; color: #5d4f36; margin: 8px 0 6px; }
.ov-sub { font-size: 12px; color: #9a8c6e; line-height: 1.8; }
.ov-btn { margin-top: 14px; background: linear-gradient(135deg, #66bb6a, #2e7d32); color: #fff; border-radius: 24px; font-size: 15px; }
.tips { font-size: 11px; color: #9a8c6e; margin-top: 10px; }

/* 自定义贴图弹窗 */
.popup-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(40, 34, 20, .5); z-index: 999; display: flex; flex-direction: column; justify-content: flex-end; }
.skin-panel { width: 100%; box-sizing: border-box; background: #fbf6e9; border-radius: 18px 18px 0 0; padding: 14px 16px 18px; max-height: 82vh; display: flex; flex-direction: column; animation: pop-up .22s ease; }
@keyframes pop-up { from { transform: translateY(40px); opacity: .6; } to { transform: translateY(0); opacity: 1; } }
.sp-head { display: flex; align-items: center; justify-content: space-between; }
.sp-title { font-size: 16px; font-weight: bold; color: #5d4f36; }
.sp-close { font-size: 24px; color: #b0a286; line-height: 1; padding: 0 4px; }
.sp-login { margin: 24px 0; text-align: center; font-size: 13px; color: #9a8c6e; }
.sp-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.sp-label { font-size: 13px; color: #5d4f36; }
.sp-tip { font-size: 11px; color: #9a8c6e; line-height: 1.6; margin-top: 6px; }
.sp-body { flex: 1; min-height: 120px; max-height: 46vh; margin-top: 12px; }
.grid { display: flex; flex-wrap: wrap; }
.cell { position: relative; width: 68px; height: 68px; margin: 0 8px 8px 0; border-radius: 12px; overflow: hidden; background: #fff; border: 2px solid transparent; box-sizing: border-box; }
.cell.picked { border-color: #e0566b; }
.cell.disabled { opacity: .45; }
.cell-img { width: 100%; height: 100%; }
.cell-plus { position: absolute; left: 0; right: 0; top: 14px; text-align: center; font-size: 24px; color: #cbbf9f; }
.cell-txt { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-size: 11px; color: #9a8c6e; }
.cell.picked .cell-img { opacity: .9; }
.cell-check { position: absolute; right: 3px; bottom: 3px; top: auto; font-size: 15px; color: #e0566b; background: #fff; border-radius: 50%; width: 18px; height: 18px; line-height: 18px; text-align: center; font-weight: bold; }
.cell-level { position: absolute; left: 0; top: 0; max-width: 100%; padding: 1px 5px; box-sizing: border-box; background: rgba(224, 86, 107, .9); color: #fff; font-size: 9px; line-height: 1.4; border-top-left-radius: 10px; border-bottom-right-radius: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cell-del { position: absolute; right: 0; left: auto; top: 0; width: 20px; height: 20px; line-height: 20px; text-align: center; background: rgba(0, 0, 0, .5); color: #fff; font-size: 15px; border-bottom-left-radius: 8px; }
.cell:first-child { background: #f1e9d4; }
.sp-empty { padding: 24px 0; text-align: center; font-size: 12px; color: #b0a286; }
.sp-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.sp-count { font-size: 12px; color: #9a8c6e; }
.sp-btn { background: #e0566b; color: #fff; font-size: 14px; border-radius: 20px; padding: 8px 26px; }
</style>
