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

			<!-- 合成用的离屏 canvas（移出可视区，全分辨率绘制） -->
			<canvas
				class="off-canvas"
				canvas-id="pc"
				:style="{ width: W + 'px', height: H + 'px' }"
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
			canvasReady: false,
			frameReady: false,
			resultPath: '',
			errorMsg: '',
			// 导出成功但 <image> 渲染失败时的提示（不影响保存/分享）
			previewErr: ''
		}
	},
	onLoad(options) {
		this.frameId = options.frameId || ''
		this.photoPath = uni.getStorageSync('photo_photo') || ''
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
			const area = this.frame.photoArea || { x: 0, y: 0, w: 1, h: 1 }
			const ax = area.x * W, ay = area.y * H, aw = area.w * W, ah = area.h * H
			const ctx = uni.createCanvasContext('pc', this)

			// 1. 白底
			ctx.setFillStyle('#FFFFFF')
			ctx.fillRect(0, 0, W, H)

			// 2. 照片 cover 裁剪到 photoArea（clip 双保险，避免溢出盖住相框）
			const pw = photo.width, ph = photo.height
			const areaRatio = aw / ah, photoRatio = pw / ph
			let sw, sh, sx, sy
			if (photoRatio > areaRatio) {
				sh = ph; sw = ph * areaRatio; sx = (pw - sw) / 2; sy = 0
			} else {
				sw = pw; sh = pw / areaRatio; sx = 0; sy = (ph - sh) / 2
			}
			ctx.save()
			ctx.beginPath()
			ctx.rect(ax, ay, aw, ah)
			ctx.clip()
			ctx.drawImage(photo.path, sx, sy, sw, sh, ax, ay, aw, ah)
			ctx.restore()

			// 3. 相框覆盖层（透明 PNG 铺满画布）
			if (frameImg) ctx.drawImage(frameImg.path, 0, 0, W, H)

			ctx.draw(false, () => {
				// 微信 draw 回调仅代表指令下发：离屏大画布+1080×1440 大图解码在真机可能未完，
				// 过早导出会得到空白图，给 400ms 余量
				setTimeout(() => this.exportCanvas(), 400)
			})
		},

		exportCanvas() {
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
