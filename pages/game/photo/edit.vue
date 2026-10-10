<template>
	<view class="page">
		<view class="stage">
			<!-- 画布直接显示：所见即所存；照片可拖动/双指缩放，与模板窗口手动对齐（抵消设备预览与 takePhoto 的视场角差异） -->
			<canvas
				class="live-canvas"
				canvas-id="pc"
				:style="{ width: cw + 'px', height: ch + 'px' }"
				@touchstart="onTouchStart"
				@touchmove.stop="onTouchMove"
				@touchend="onTouchEnd"
				@touchcancel="onTouchEnd"
			></canvas>
			<view v-if="!imgCache" class="placeholder">
				<text class="ph-icon">🎞️</text>
				<text class="ph-text">{{ errorMsg || '正在合成照片…' }}</text>
			</view>
		</view>

		<!-- 取景模式：与拍摄一致=照片按预览同几何 cover 铺满画布（默认）；完整照片=整图塞进窗口，内容全但相对模板会偏移 -->
		<view v-if="photoPath && frame" class="mode-row">
			<view class="mode-chip" :class="{ on: composeMode === 'cover' }" @click="switchMode('cover')">与拍摄一致</view>
			<view class="mode-chip" :class="{ on: composeMode === 'fit' }" @click="switchMode('fit')">完整照片</view>
			<view class="mode-chip" @click="resetAdjust">复位画面</view>
		</view>

		<view v-if="imgCache" class="adj-hint">👆 拖动画面微调位置，双指捏合缩放，直到与模板窗口对齐</view>

		<view class="btn-row">
			<button class="ghost" @click="rechoose">重拍/换图</button>
			<button class="primary" :disabled="!imgCache" @click="savePoster">保存到相册</button>
			<button class="share" open-type="share" :disabled="!resultPath">分享</button>
		</view>

		<view v-if="frame" class="tip">相框：{{ frame.name }}</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			frameId: '',
			frame: null,
			photoPath: '',
			// 画布 CSS 尺寸：宽按舞台与相框比例适配，高=宽/相框比例；绘制坐标即 CSS 像素
			cw: 300,
			ch: 400,
			stageW: 0,
			stageH: 0,
			canvasReady: false,
			frameReady: false,
			// 导出文件路径（分享缩略图用；保存时现导出不依赖它）
			resultPath: '',
			errorMsg: '',
			// 照片是否来自拍照页（storage photo_geo 非空即拍照链路）；相册图为 false
			fromCamera: false,
			// 取景模式：cover=窗口内画面与拍照预览一致（默认）；fit=整张照片完整放入窗口
			composeMode: uni.getStorageSync('photo_mode') === 'fit' ? 'fit' : 'cover',
			// 已解码的图片信息缓存（切换模式/重画时直接用，不重新拉图）
			imgCache: null,
			// 照片摆放：base=模式基准矩形（画布 CSS 像素），微调=相对基准的缩放倍数与平移
			base: null,
			photoZoom: 1,
			photoOff: { x: 0, y: 0 }
		}
	},
	onLoad(options) {
		this.frameId = options.frameId || ''
		this.photoPath = uni.getStorageSync('photo_photo') || ''
		// 拍照标记一次性消费：读完即删，避免相册图被误判成拍照链路
		const rawGeo = uni.getStorageSync('photo_geo')
		uni.removeStorageSync('photo_geo')
		this.fromCamera = !!rawGeo
		if (!this.photoPath) this.errorMsg = '未获取到照片，请返回重拍'
		this.loadFrame()
	},
	onReady() {
		this.canvasReady = true
		this.measureStage()
		this.tryCompose()
	},
	onUnload() {
		clearTimeout(this._exT)
		clearTimeout(this._rpT)
	},
	onShareAppMessage() {
		return {
			title: '我在大头贴拍了张照，快来试试',
			path: '/pages/game/photo/home',
			imageUrl: this.resultPath || ''
		}
	},
	onShareTimeline() {
		return {
			title: '我在大头贴拍了张照，快来试试'
		}
	},
	methods: {
		async loadFrame() {
			if (!this.frameId) { this.errorMsg = '缺少相框信息'; return }
			try {
				const res = await uniCloud.callFunction({
					name: 'photo',
					data: { action: 'get', id: this.frameId }
				})
				const r = res.result || {}
				if (r.code === 0 && r.data.frame) {
					this.frame = r.data.frame
					this.frameReady = true
					this.tryCompose()
				} else {
					this.errorMsg = r.msg || '相框加载失败'
				}
			} catch (e) {
				console.error('相框加载失败:', e)
				this.errorMsg = '相框加载失败，请重试'
			}
		},

		// 量舞台尺寸：画布要按舞台宽/高与相框比例适配，保证整张可见（便于拖动微调）
		measureStage() {
			uni.createSelectorQuery().in(this).select('.stage').boundingClientRect((rect) => {
				if (rect && rect.width) { this.stageW = rect.width; this.stageH = rect.height }
			}).exec()
		},

		/** 切换取景模式：重置微调并按缓存重合成（两种模式的"不偏移基准"不同） */
		switchMode(m) {
			if (m === this.composeMode) return
			this.composeMode = m
			uni.setStorageSync('photo_mode', m) // 记住偏好，下次合成沿用
			if (this.imgCache) this.compose(this.imgCache.photo, this.imgCache.frameImg)
			else this.tryCompose()
		},

		resetAdjust() {
			this.photoZoom = 1
			this.photoOff = { x: 0, y: 0 }
			this.redraw(true)
		},

		// 拿到本地路径 + 尺寸（远程 URL 会被缓存成本地 path）
		getInfo(src) {
			return new Promise((resolve, reject) => {
				uni.getImageInfo({ src, success: resolve, fail: reject })
			})
		},

		async tryCompose() {
			if (!this.canvasReady || !this.frameReady) return
			if (!this.photoPath || !this.frame) return
			if (this.imgCache) { this.compose(this.imgCache.photo, this.imgCache.frameImg); return }
			uni.showLoading({ title: '合成中…', mask: true })
			try {
				const [photo, frame] = await Promise.all([
					this.getInfo(this.photoPath),
					this.frame.frameUrl ? this.getInfo(this.frame.frameUrl) : Promise.resolve(null)
				])
				this.imgCache = { photo, frameImg: frame }
				this.compose(photo, frame)
			} catch (e) {
				console.error('图片加载失败:', e)
				uni.hideLoading()
				this.errorMsg = '照片或相框加载失败，请重试'
				uni.showToast({ title: this.errorMsg, icon: 'none' })
			}
		},

		compose(photo, frameImg) {
			// 画布比例跟随相框图原尺寸（常见 3:4），避免拉伸相框导致变形；无相框时保持默认 3:4
			const fw = frameImg && frameImg.width ? frameImg.width : 3
			const fh = frameImg && frameImg.height ? frameImg.height : 4
			const r = fw / fh
			// 画布 CSS 尺寸：受舞台宽高约束的 contain，整张成片都能看见
			const capW = (this.stageW || uni.getSystemInfoSync().windowWidth - 60) - 16
			const capH = (this.stageH || capW * 1.4) - 16
			this.cw = Math.floor(Math.min(capW, capH * r))
			this.ch = Math.floor(this.cw / r)
			const H = this.ch, W = this.cw
			const area = this.frame.photoArea || { x: 0, y: 0, w: 1, h: 1 }
			const ax = area.x * W, ay = area.y * H, aw = area.w * W, ah = area.h * H
			// cover（默认，仅拍照链路）：照片整图 cover 铺满画布——与预览"feed 铺满相机矩形"同几何，
			// 窗口内画面即拍照所见；fit / 相册图：整图等比 contain 进窗口
			let bx, by, bw, bh
			if (this.fromCamera && this.composeMode === 'cover') {
				const k = Math.max(W / photo.width, H / photo.height)
				bw = photo.width * k; bh = photo.height * k
				bx = (W - bw) / 2; by = (H - bh) / 2
			} else {
				const scale = Math.min(aw / photo.width, ah / photo.height)
				bw = photo.width * scale; bh = photo.height * scale
				bx = ax + (aw - bw) / 2; by = ay + (ah - bh) / 2
			}
			// 新基准下重置手动微调
			this.base = { bx, by, bw, bh, ax, ay, aw, ah, photoPath: photo.path, framePath: frameImg ? frameImg.path : '' }
			this.photoZoom = 1
			this.photoOff = { x: 0, y: 0 }
			// canvas 尺寸是响应式 style，改变后需等框架更新完再画，否则画在旧尺寸缓冲上
			// 注：微信旧 canvas drawImage 不支持网络图，必须传 getImageInfo 缓存后的本地 path
			this.$nextTick(() => this.redraw(true))
		},

		/** 按基准矩形 + 微调（缩放/平移）算出最终目标矩形并重画；doExport=true 时画完更新导出图 */
		redraw(doExport) {
			const b = this.base
			if (!b) return
			const z = this.photoZoom
			const dw = b.bw * z, dh = b.bh * z
			const dx = b.bx + (b.bw - dw) / 2 + this.photoOff.x
			const dy = b.by + (b.bh - dh) / 2 + this.photoOff.y
			this.paintCanvas({ dx, dy, dw, dh, photoPath: b.photoPath, framePath: b.framePath, doExport: !!doExport })
		},

		paintCanvas({ dx, dy, dw, dh, photoPath, framePath, doExport }) {
			const W = this.cw, H = this.ch
			const b = this.base
			const ctx = uni.createCanvasContext('pc', this)

			// 1. 白底
			ctx.setFillStyle('#FFFFFF')
			ctx.fillRect(0, 0, W, H)

			// 2. 照片按目标矩形绘制，clip 到窗口防止溢出到模板透明区；
			// 裁剪矩形向外扩一小圈：模板 PNG 透明窗口的实际透光区比配置的 photoArea 略大
			// （抗锯齿白边/羽化边缘），照片只裁到配置矩形会在窗口周围露出一圈白边“吃掉”照片；
			// 拍照预览没这问题是因为模板背后整块都是相机画面、没有白底。
			// 多铺的一圈会被模板不透明边框盖住，不会溢出。
			const pad = Math.max(2, Math.round(Math.min(W, H) * 0.01))
			ctx.save()
			ctx.beginPath()
			ctx.rect(b.ax - pad, b.ay - pad, b.aw + pad * 2, b.ah + pad * 2)
			ctx.clip()
			ctx.drawImage(photoPath, dx, dy, dw, dh)
			ctx.restore()

			// 3. 相框覆盖层（透明 PNG 按画布实际尺寸铺满，比例已与其一致不会变形）
			if (framePath) ctx.drawImage(framePath, 0, 0, W, H)

			ctx.draw(false, () => {
				if (!doExport) return
				// 微信 draw 回调仅代表指令下发：大画布+大图解码在真机可能未完，
				// 过早导出会得到空白图，给 400ms 余量；尺寸用 this.ch（与 canvas style 同步）
				clearTimeout(this._exT)
				this._exT = setTimeout(() => this.exportCanvas(), 400)
			})
		},

		// ===== 手动微调：单指拖动平移，双指捏合缩放（围绕基准矩形中心） =====
		dist(a, b) {
			const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY
			return Math.sqrt(dx * dx + dy * dy)
		},
		onTouchStart(e) {
			if (!this.base) return
			clearTimeout(this._exT)
			const t = e.touches || []
			if (t.length >= 2) {
				this._g = { mode: 'zoom', d0: this.dist(t[0], t[1]), z0: this.photoZoom }
			} else if (t.length === 1) {
				this._g = { mode: 'pan', sx: t[0].clientX, sy: t[0].clientY, ox: this.photoOff.x, oy: this.photoOff.y }
			}
		},
		onTouchMove(e) {
			const g = this._g
			if (!g) return
			const t = e.touches || []
			if (g.mode === 'zoom') {
				if (t.length < 2 || !(g.d0 > 0)) return
				const d = this.dist(t[0], t[1])
				if (d > 0) this.photoZoom = Math.min(4, Math.max(0.3, g.z0 * d / g.d0))
			} else {
				if (t.length < 1) return
				this.photoOff = { x: g.ox + (t[0].clientX - g.sx), y: g.oy + (t[0].clientY - g.sy) }
			}
			this.scheduleRepaint()
		},
		onTouchEnd() {
			this._g = null
			// 手势结束补一帧最终画面，再延迟导出刷新分享缩略图（拖动过程中不导出，避免卡顿）
			this.redraw(false)
			clearTimeout(this._exT)
			this._exT = setTimeout(() => this.exportCanvas(), 700)
		},
		// 拖动/捏合重画节流：50ms 内合并，尾部补最后一次，保证跟手且不刷爆指令队列
		scheduleRepaint() {
			if (this._rpT) { this._rpPending = true; return }
			this.redraw(false)
			this._rpT = setTimeout(() => {
				this._rpT = null
				if (this._rpPending) { this._rpPending = false; this.redraw(false) }
			}, 50)
		},

		/** 导出当前画布为临时文件（3 倍 CSS 尺寸≈设备原生分辨率，清晰）；cb 拿到路径 */
		exportCanvas(cb) {
			const destW = Math.round(this.cw * 3)
			const destH = Math.round(this.ch * 3)
			uni.canvasToTempFilePath({
				canvasId: 'pc',
				x: 0, y: 0,
				width: this.cw, height: this.ch,
				destWidth: destW, destHeight: destH,
				fileType: 'png',
				quality: 1,
				success: (res) => {
					uni.hideLoading()
					this.resultPath = res.tempFilePath
					if (!this._used) { this._used = true; this.incUse() }
					if (cb) cb(res.tempFilePath)
				},
				fail: (e) => {
					console.error('导出失败:', e)
					uni.hideLoading()
					this.errorMsg = '合成失败，请重试'
					uni.showToast({ title: '合成失败，请重试', icon: 'none' })
				}
			}, this)
		},

		incUse() {
			if (!this.frameId) return
			uniCloud.callFunction({ name: 'photo', data: { action: 'incUse', id: this.frameId } }).catch(() => {})
		},

		rechoose() {
			uni.navigateBack()
		},

		// 保存时现导出：拿到的永远是当前画面（含手动微调），不受导出节流影响
		savePoster() {
			if (!this.imgCache) return
			uni.showLoading({ title: '导出中…', mask: true })
			this.exportCanvas((p) => {
				uni.saveImageToPhotosAlbum({
					filePath: p,
					success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
					fail: (err) => this.handleSaveFail(err)
				})
			})
		},
		handleSaveFail(err) {
			const msg = (err && err.errMsg) || ''
			if (msg.indexOf('auth deny') > -1 || msg.indexOf('authorize') > -1 || msg.indexOf('auth') > -1) {
				uni.showModal({
					title: '需要相册权限',
					content: '保存图片需要您授权「添加到相册」，是否前往设置开启？',
					confirmText: '去设置',
					success: (r) => {
						if (r.confirm) {
							uni.openSetting({
								success: (s) => {
									if (s.authSetting && s.authSetting['scope.writePhotosAlbum']) this.savePoster()
								}
							})
						}
					}
				})
			} else {
				uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	display: flex;
	flex-direction: column;
	padding: 24rpx;
	box-sizing: border-box;
}
.stage {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: rgba(255, 255, 255, .5);
	border-radius: 24rpx;
	overflow: hidden;
	position: relative;
	min-height: 56vh;
}
/* 画布按 measureStage 算出的 CSS 尺寸显示；显式绑定尺寸避免百分比塌陷 */
.live-canvas { flex-shrink: 0; }
.placeholder {
	position: absolute;
	left: 0;
	right: 0;
	top: 40%;
	display: flex;
	flex-direction: column;
	align-items: center;
}
.ph-icon { font-size: 90rpx; opacity: .6; }
.ph-text { margin-top: 20rpx; font-size: 27rpx; color: #8a86a8; }

.mode-row { display: flex; justify-content: center; gap: 16rpx; margin-top: 20rpx; }
.mode-chip { font-size: 24rpx; color: #6a6a86; background: #fff; border-radius: 30rpx; padding: 10rpx 28rpx; }
.mode-chip.on { background: #6a5acd; color: #fff; }

.adj-hint { text-align: center; font-size: 22rpx; color: #6a6a86; margin-top: 14rpx; }

.btn-row { display: flex; margin-top: 20rpx; }
.btn-row button {
	flex: 1;
	margin: 0 8rpx;
	font-size: 27rpx;
	border-radius: 44rpx;
	line-height: 84rpx;
}
.ghost { background: #fff; color: #6a6a86; }
.primary { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; }
.share { background: linear-gradient(135deg, #4facfe, #00f2fe); color: #fff; }
button[disabled] { opacity: .5; }
.tip { text-align: center; color: #8a86a8; font-size: 24rpx; margin-top: 18rpx; }
</style>
