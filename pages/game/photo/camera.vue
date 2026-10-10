<template>
	<view class="page">
		<view class="preview">
			<!-- #ifdef MP-WEIXIN -->
			<camera
				class="camera"
				:style="camStyle"
				:device-position="devicePosition"
				flash="off"
				@error="onCameraError"
			/>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<view class="camera camera-fallback">
				<text class="fallback-text">当前平台不支持相机，请从相册选择</text>
			</view>
			<!-- #endif -->

			<!-- 相机按相框比例开洞（camStyle 与叠加层同一矩形），模板等比覆盖整个相机，取景所见即框内 -->
			<!-- #ifdef MP-WEIXIN -->
			<cover-image
				v-if="frame && frame.frameUrl"
				class="frame-overlay"
				:src="frame.frameUrl"
				:style="overlayStyle"
			/>
			<cover-view class="flip" @click="toggleDevice">🔄</cover-view>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<image v-if="frame && frame.frameUrl" class="frame-overlay" :src="frame.frameUrl" mode="aspectFit" :style="overlayStyle" />
			<view class="flip" @click="toggleDevice">🔄</view>
			<!-- #endif -->
		</view>

		<view class="actions">
			<button class="ghost-btn" @click="chooseFromAlbum">从相册选</button>
			<button class="shoot-btn" @click="takePhoto">●</button>
			<button class="ghost-btn" @click="reskip">换个相框</button>
		</view>

		<view v-if="frame" class="frame-tip">当前相框：{{ frame.name }}</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			frameId: '',
			frame: null,
			devicePosition: 'front',
			// 相框图原始宽高比（w/h）与预览区实测尺寸：叠加层按此比例 contain 居中
			ratio: 0,
			previewW: 0,
			previewH: 0
		}
	},
	computed: {
		// 相框叠加层在预览区内的像素矩形（按相框原图比例 contain 居中），edit 页合成时要用它反推窗口取景范围
		box() {
			if (!this.previewW || !this.previewH) return null
			// 默认 3:4 与 edit.vue 无相框尺寸时的合成比例保持一致
			const r = this.ratio > 0 ? this.ratio : 3 / 4
			let w = this.previewW
			let h = w / r
			if (h > this.previewH) { h = this.previewH; w = h * r }
			return {
				w: Math.round(w),
				h: Math.round(h),
				left: Math.round((this.previewW - w) / 2),
				top: Math.round((this.previewH - h) / 2)
			}
		},
		overlayStyle() {
			// 预览尺寸未量到前不显示，避免无比例的铺满拉伸变形
			if (!this.box) return { display: 'none' }
			const b = this.box
			return { width: b.w + 'px', height: b.h + 'px', left: b.left + 'px', top: b.top + 'px' }
		},
		// 相机与相框同一矩形：模板等比拉伸覆盖整个相机，消除“框外取景被裁”的错位
		// 未量到尺寸前返回空对象，维持 CSS 默认铺满（瞬时）
		camStyle() {
			if (!this.box) return {}
			const b = this.box
			return { left: b.left + 'px', top: b.top + 'px', width: b.w + 'px', height: b.h + 'px' }
		}
	},
	onLoad(options) {
		this.frameId = options.frameId || ''
		this.loadFrame()
	},
	onReady() {
		this.measurePreview()
	},
	methods: {
		async loadFrame() {
			if (!this.frameId) return
			try {
				const res = await uniCloud.callFunction({
					name: 'photo',
					data: { action: 'get', id: this.frameId }
				})
				const r = res.result || {}
				if (r.code === 0) {
					this.frame = r.data.frame
					this.loadRatio()
				} else {
					uni.showToast({ title: r.msg || '相框加载失败', icon: 'none' })
				}
			} catch (e) {
				console.error('相框加载失败:', e)
				uni.showToast({ title: '相框加载失败，请重试', icon: 'none' })
			}
		},
		// 取相框图原始宽高比（getImageInfo 会把远程 URL 缓存成本地图并返回尺寸，与 edit.vue 同源逻辑）
		loadRatio() {
			const url = this.frame && this.frame.frameUrl
			if (!url) return
			uni.getImageInfo({
				src: url,
				success: (img) => {
					if (img.width && img.height) this.ratio = img.width / img.height
				},
				fail: () => {} // 取不到就维持默认 3:4
			})
		},
		// 量取预览区实际尺寸（屏幕剩余高度不固定，比例需运行时计算）
		measurePreview() {
			uni.createSelectorQuery().in(this).select('.preview').boundingClientRect((rect) => {
				if (rect && rect.width) { this.previewW = rect.width; this.previewH = rect.height }
			}).exec()
		},
		toggleDevice() {
			this.devicePosition = this.devicePosition === 'front' ? 'back' : 'front'
		},
		onCameraError(e) {
			console.warn('相机错误:', e)
			uni.showToast({ title: '相机不可用，请从相册选择', icon: 'none' })
		},
		takePhoto() {
			// #ifdef MP-WEIXIN
			const ctx = uni.createCameraContext()
			ctx.takePhoto({
				quality: 'high',
				success: (res) => this.goEdit(res.tempImagePath, true),
				fail: () => uni.showToast({ title: '拍照失败，请重试', icon: 'none' })
			})
			// #endif
			// #ifndef MP-WEIXIN
			this.chooseFromAlbum()
			// #endif
		},
		chooseFromAlbum() {
			uni.chooseMedia
				? uni.chooseMedia({
					count: 1,
					mediaType: ['image'],
					sourceType: ['album'],
					success: (res) => this.goEdit(res.tempFiles[0].tempFilePath, false),
					fail: () => {}
				})
				: uni.chooseImage({
					count: 1,
					sourceType: ['album'],
					success: (res) => this.goEdit(res.tempFilePaths[0], false),
					fail: () => {}
				})
		},
		reskip() {
			uni.navigateBack()
		},
		goEdit(imagePath, fromCamera) {
			if (!imagePath) return
			uni.setStorageSync('photo_photo', imagePath)
			// 取景几何：相机矩形已等于相框矩形，pw/ph 直接用 box 尺寸、box 归零到全幅，
			// edit 页 cover 映射在同一坐标系内反推窗口取景范围；
			// 相册选图/未量到尺寸时写空串，清掉上一张的残留，避免错误映射
			let geo = ''
			if (fromCamera && this.box) {
				const b = this.box
				geo = JSON.stringify({ pw: b.w, ph: b.h, box: { w: b.w, h: b.h, left: 0, top: 0 } })
			}
			uni.setStorageSync('photo_geo', geo)
			uni.navigateTo({ url: '/pages/game/photo/edit?frameId=' + this.frameId })
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: #0d0d12;
	display: flex;
	flex-direction: column;
}
.preview {
	position: relative;
	width: 100%;
	flex: 1;
	overflow: hidden;
	background: #000;
}
.camera {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.camera-fallback {
	display: flex;
	align-items: center;
	justify-content: center;
	background: #1a1a22;
}
.fallback-text { color: #8a86a8; font-size: 26rpx; }
.frame-overlay {
	position: absolute;
	/* 宽高与位置由 overlayStyle 按相框比例动态计算，不再铺满拉伸 */
	pointer-events: none;
	z-index: 2;
}
.flip {
	position: absolute;
	right: 24rpx;
	top: 24rpx;
	z-index: 3;
	width: 72rpx;
	height: 72rpx;
	line-height: 72rpx;
	text-align: center;
	border-radius: 50%;
	background: rgba(0, 0, 0, .35);
	color: #fff;
	font-size: 34rpx;
}
.actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx 40rpx 20rpx;
	background: #0d0d12;
}
.ghost-btn {
	flex: 1;
	background: rgba(255, 255, 255, .12);
	color: #fff;
	font-size: 26rpx;
	border-radius: 44rpx;
	margin: 0 10rpx;
	line-height: 76rpx;
}
.shoot-btn {
	width: 110rpx;
	height: 110rpx;
	line-height: 100rpx;
	border-radius: 50%;
	background: #fff;
	color: #0d0d12;
	font-size: 44rpx;
	text-align: center;
	border: 6rpx solid rgba(255, 255, 255, .5);
	margin: 0 10rpx;
}
.frame-tip {
	text-align: center;
	color: #8a86a8;
	font-size: 24rpx;
	padding-bottom: 24rpx;
}
</style>
