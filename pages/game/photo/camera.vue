<template>
	<view class="page">
		<view class="preview">
			<!-- #ifdef MP-WEIXIN -->
			<camera
				class="camera"
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

			<!-- 相框叠加：微信下相机是原生组件，必须用 cover-image 才能覆盖在其上 -->
			<!-- #ifdef MP-WEIXIN -->
			<cover-image
				v-if="frame && frame.frameUrl"
				class="frame-overlay"
				:src="frame.frameUrl"
			/>
			<cover-view class="flip" @click="toggleDevice">🔄</cover-view>
			<!-- #endif -->
			<!-- #ifndef MP-WEIXIN -->
			<image v-if="frame && frame.frameUrl" class="frame-overlay" :src="frame.frameUrl" mode="aspectFill" />
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
			devicePosition: 'front'
		}
	},
	onLoad(options) {
		this.frameId = options.frameId || ''
		this.loadFrame()
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
				} else {
					uni.showToast({ title: r.msg || '相框加载失败', icon: 'none' })
				}
			} catch (e) {
				console.error('相框加载失败:', e)
				uni.showToast({ title: '相框加载失败，请重试', icon: 'none' })
			}
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
				success: (res) => this.goEdit(res.tempImagePath),
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
					success: (res) => this.goEdit(res.tempFiles[0].tempFilePath),
					fail: () => {}
				})
				: uni.chooseImage({
					count: 1,
					sourceType: ['album'],
					success: (res) => this.goEdit(res.tempFilePaths[0]),
					fail: () => {}
				})
		},
		reskip() {
			uni.navigateBack()
		},
		goEdit(imagePath) {
			if (!imagePath) return
			uni.setStorageSync('photo_photo', imagePath)
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
	inset: 0;
	width: 100%;
	height: 100%;
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
