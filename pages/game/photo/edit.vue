<template>
	<view class="page">
		<view class="stage">
			<!-- 合成结果预览 -->
			<image
				v-if="resultPath"
				class="result"
				:src="resultPath"
				mode="aspectFit"
				show-menu-by-longpress
				@error="onPreviewError"
			/>
			<view v-if="resultPath && previewErr" class="preview-err-tip">{{ previewErr }}</view>
			<view v-else-if="!resultPath" class="placeholder">
				<text class="ph-icon">🎞️</text>
				<text class="ph-text">{{ errorMsg || '正在合成照片…' }}</text>
			</view>

			<!-- 合成用的离屏 canvas（移出可视区，全分辨率绘制；尺寸随相框比例动态变化，故双向绑定） -->
			<canvas
				class="off-canvas"
				canvas-id="pc"
				:style="{ width: cw + 'px', height: ch + 'px' }"
			></canvas>
		</view>

		<view class="btn-row">
			<button class="ghost" @click="rechoose">重拍/换图</button>
			<button class="primary" :disabled="!resultPath" @click="savePoster">保存到相册</button>
			<button class="share" open-type="share" :disabled="!resultPath">分享</button>
		</view>

		<view v-if="frame" class="tip">相框：{{ frame.name }}</view>
	</view>
</template>

<script>
const W = 1080
const H = 1440

export default {
	data() {
		return {
			W,
			H,
			frameId: '',
			frame: null,
			photoPath: '',
			// 当前合成画布尺寸：宽固定 1080，高按相框图实际比例自适应（导出尺寸必须与它一致，否则截断/留白）
			cw: W,
			ch: H,
			canvasReady: false,
			frameReady: false,
			resultPath: '',
			errorMsg: '',
			// 拍照页传来的取景几何（{pw,ph,box}）；相册选图为 null
			geo: null,
			// 导出成功但 <image> 渲染失败时的提示（不影响保存/分享）
			previewErr: ''
		}
	},
	onLoad(options) {
		this.frameId = options.frameId || ''
		this.photoPath = uni.getStorageSync('photo_photo') || ''
		// 取景几何一次性消费：读完即删，避免重进本页时拿旧数据错映射
		const rawGeo = uni.getStorageSync('photo_geo')
		uni.removeStorageSync('photo_geo')
		if (rawGeo) {
			try { this.geo = typeof rawGeo === 'string' ? JSON.parse(rawGeo) : rawGeo } catch (e) { this.geo = null }
		}
		if (!this.photoPath) this.errorMsg = '未获取到照片，请返回重拍'
		this.loadFrame()
	},
	onReady() {
		this.canvasReady = true
		this.tryCompose()
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

		// 拿到本地路径 + 尺寸（远程 URL 会被缓存成本地 path）
		getInfo(src) {
			return new Promise((resolve, reject) => {
				uni.getImageInfo({ src, success: resolve, fail: reject })
			})
		},

		async tryCompose() {
			if (!this.canvasReady || !this.frameReady) return
			if (!this.photoPath || !this.frame) return
			uni.showLoading({ title: '合成中…', mask: true })
			try {
				const [photo, frame] = await Promise.all([
					this.getInfo(this.photoPath),
					this.frame.frameUrl ? this.getInfo(this.frame.frameUrl) : Promise.resolve(null)
				])
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
			const H = Math.max(1, Math.round(W * fh / fw))
			this.cw = W
			this.ch = H
			const area = this.frame.photoArea || { x: 0, y: 0, w: 1, h: 1 }
			const ax = area.x * W, ay = area.y * H, aw = area.w * W, ah = area.h * H
			// 拍照链路：把取景窗口内的画面原样搬进画布窗口，模板位置/大小与拍照时一致
			const src = this.cameraSrc(photo, area)
			let dx = ax, dy = ay, dw = aw, dh = ah
			if (!src) {
				// 相册图/无取景信息：照片等比例放入 photoArea（contain：不裁剪不拉伸，未铺满处留白底）
				const scale = Math.min(aw / photo.width, ah / photo.height)
				dw = photo.width * scale; dh = photo.height * scale
				dx = ax + (aw - dw) / 2; dy = ay + (ah - dh) / 2
			}
			// canvas 尺寸是响应式 style，改变后需等框架更新完再画，否则画在旧尺寸缓冲上
			// 注：微信旧 canvas drawImage 不支持网络图，必须传 getImageInfo 缓存后的本地 path
			this.$nextTick(() => this.paintCanvas({ H, ax, ay, aw, ah, dx, dy, dw, dh, src, photoPath: photo.path, framePath: frameImg ? frameImg.path : '' }))
		},

		/**
		 * 取景→成片的源裁剪区换算：相机画面以 cover 方式铺满预览区（居中裁剪），
		 * 相框叠加层矩形 + photoArea 决定了窗口在预览区内的像素位置，
		 * 反推它在照片原图上对应的区域，合成时用 9 参 drawImage 等比搬进画布窗口
		 */
		cameraSrc(photo, area) {
			const g = this.geo
			if (!g || !g.box || !(g.pw > 0) || !(g.ph > 0) || !(g.box.w > 0) || !(g.box.h > 0)) return null
			const b = g.box
			// 窗口在预览区里的像素矩形
			const wx = b.left + (area.x || 0) * b.w
			const wy = b.top + (area.y || 0) * b.h
			const ww = (area.w || 1) * b.w
			const wh = (area.h || 1) * b.h
			if (!(ww > 0 && wh > 0)) return null
			// s：1 图像像素 = s 显示像素（cover 铺满预览区，超出部分居中裁掉）
			const s = Math.max(g.pw / photo.width, g.ph / photo.height)
			const ox = (photo.width - g.pw / s) / 2
			const oy = (photo.height - g.ph / s) / 2
			let sx = ox + wx / s
			let sy = oy + wy / s
			let sw = ww / s
			let sh = wh / s
			// 防拍后取图比例与预览微差异导致越界
			sx = Math.max(0, Math.min(sx, photo.width - 1))
			sy = Math.max(0, Math.min(sy, photo.height - 1))
			sw = Math.min(sw, photo.width - sx)
			sh = Math.min(sh, photo.height - sy)
			if (!(sw > 1 && sh > 1)) return null
			return { sx, sy, sw, sh }
		},

		paintCanvas({ H, ax, ay, aw, ah, dx, dy, dw, dh, src, photoPath, framePath }) {
			const W = this.cw
			const ctx = uni.createCanvasContext('pc', this)

			// 1. 白底
			ctx.setFillStyle('#FFFFFF')
			ctx.fillRect(0, 0, W, H)

			// 2. 照片放入 photoArea，clip 防贴边溢出；拍照链路带源裁剪区（9 参 cover），相册链路整图等比
			ctx.save()
			ctx.beginPath()
			ctx.rect(ax, ay, aw, ah)
			ctx.clip()
			if (src) ctx.drawImage(photoPath, src.sx, src.sy, src.sw, src.sh, dx, dy, dw, dh)
			else ctx.drawImage(photoPath, dx, dy, dw, dh)
			ctx.restore()

			// 3. 相框覆盖层（透明 PNG 按画布实际尺寸铺满，比例已与其一致不会变形）
			if (framePath) ctx.drawImage(framePath, 0, 0, W, H)

			ctx.draw(false, () => {
				// 微信 draw 回调仅代表指令下发：离屏大画布+大图解码在真机可能未完，
				// 过早导出会得到空白图，给 400ms 余量；尺寸用 this.ch（与 canvas style 同步）
				setTimeout(() => this.exportCanvas(), 400)
			})
		},

		exportCanvas() {
			const W = this.cw, H = this.ch
			uni.canvasToTempFilePath({
				canvasId: 'pc',
				x: 0, y: 0,
				width: W, height: H,
				destWidth: W, destHeight: H,
				fileType: 'png',
				quality: 1,
				success: (res) => {
					uni.hideLoading()
					this.previewErr = ''
					this.resultPath = res.tempFilePath
					this.incUse()
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

		// 预览加载失败：文件已合成成功，仅展示提示，仍可直接保存/分享
		onPreviewError(e) {
			console.error('预览图加载失败:', e, this.resultPath)
			this.previewErr = '预览未能显示，但图片已合成，可直接保存或分享'
		},

		rechoose() {
			uni.navigateBack()
		},

		savePoster() {
			if (!this.resultPath) return
			uni.saveImageToPhotosAlbum({
				filePath: this.resultPath,
				success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
				fail: (err) => this.handleSaveFail(err)
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
	min-height: 60vh;
}
/* 显式高度：父容器只有 min-height 时百分比高度会塌陷为 0，导致“保存成功但预览看不到” */
.result { width: 92%; height: 62vh; flex-shrink: 0; }
.preview-err-tip {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	bottom: 24rpx;
	background: rgba(224, 86, 107, .9);
	color: #fff;
	font-size: 24rpx;
	text-align: center;
	border-radius: 16rpx;
	padding: 14rpx 0;
}
.placeholder { display: flex; flex-direction: column; align-items: center; }
.ph-icon { font-size: 90rpx; opacity: .6; }
.ph-text { margin-top: 20rpx; font-size: 27rpx; color: #8a86a8; }

/* 离屏合成画布：移出可视区，全分辨率绘制 */
.off-canvas {
	position: fixed;
	left: -9999px;
	top: 0;
	z-index: -1;
}

.btn-row { display: flex; margin-top: 24rpx; }
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
