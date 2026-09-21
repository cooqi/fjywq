<template>
	<view class="section-box">
		<view class="section-title">{{ title }} <text class="optional">{{ optionalText }}</text></view>
		<view class="upload-box">
			<view 
				class="upload-item" 
				:class="{ 'upload-item-placeholder': isDragging && dragIndex === index }" 
				v-for="(img, index) in imageList" 
				:key="index"
				@longpress="onDragStart($event, index)"
				@touchmove.stop.prevent="onDragMove"
				@touchend="onDragEnd"
				:style="getImageItemStyle(index)"
			>
				<image class="upload-image" :src="img" mode="aspectFill" @click="previewImage(index)"></image>
				<view class="upload-delete" v-if="!(isDragging && (dragIndex === index || dragTargetIndex === index))" @click.stop="deleteImage(index)">×</view>
			</view>
			<view class="upload-add" @click="chooseImage" v-if="imageList.length < maxCount">
					<text class="upload-add-icon">+</text>
					<text class="upload-add-text">添加照片</text>
					<text class="upload-add-count">{{ imageList.length }}/{{ maxCount }}</text>
				</view>
			</view>
			<canvas :canvas-id="canvasId" style="width: 800px; height: 800px; position: fixed; left: -9999px; top: -9999px;"></canvas>
		</view>
</template>

<script>
	export default {
		name: 'image-upload',
		props: {
			title: {
				type: String,
				default: '上传图片'
			},
			optionalText: {
				type: String,
				default: ''
			},
			maxCount: {
				type: Number,
				default: 1
			},
			uploadPath: {
				type: String,
				default: 'upload'
			},
			modelValue: {
				type: String,
				default: ''
			}
		},
		data() {
			return {
				imageList: [],
				cloudDomain: 'https://env-00jy66xyyok3.normal.cloudstatic.cn',
				canvasId: `compressCanvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				// 拖拽排序相关状态
				isDragging: false,
				dragIndex: -1,
				dragTargetIndex: -1,
				dragOffsetX: 0,
				dragOffsetY: 0,
				dragStartTouchX: 0,
				dragStartTouchY: 0,
				dragItemPositions: [],
				dragJustEnded: false
			}
		},
		watch: {
			modelValue: {
				immediate: true,
				handler(newVal) {
					if (newVal) {
						this.initImages(newVal)
					} else {
						this.imageList = []
					}
				}
			}
		},
		methods: {
			initImages(imgUrl) {
				const urls = imgUrl.split(';').filter(img => img)
				this.imageList = urls
			},
			chooseImage() {
				uni.chooseImage({
					count: this.maxCount - this.imageList.length,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					success: async (res) => {
						uni.showLoading({
							title: '处理中...'
						})
						try {
							const compressedPaths = []
							for (const filePath of res.tempFilePaths) {
								const compressedPath = await this.compressImage(filePath)
								compressedPaths.push(compressedPath)
							}
							this.imageList = this.imageList.concat(compressedPaths)
						} catch (err) {
							console.error('图片处理失败:', err)
							uni.showToast({
								title: '图片处理失败',
								icon: 'none'
							})
						} finally {
							uni.hideLoading()
						}
					},
					fail: (err) => {
						console.error('chooseImage失败:', err)
					}
				})
			},
			compressImage(filePath) {
				return new Promise((resolve) => {
					const timeout = setTimeout(() => {
						console.error('压缩超时，使用原图')
						resolve(filePath)
					}, 10000)

					uni.getImageInfo({
						src: filePath,
						success: (info) => {
							this.compressImageByCanvas(filePath, info).then((compressedPath) => {
								clearTimeout(timeout)
								resolve(compressedPath)
							}).catch(() => {
								clearTimeout(timeout)
								resolve(filePath)
							})
						},
						fail: (err) => {
							clearTimeout(timeout)
							console.error('获取图片信息失败:', err)
							resolve(filePath)
						}
					})
				})
			},
			compressImageByCanvas(filePath, info) {
				return new Promise((resolve, reject) => {
					let width = info.width
					let height = info.height
					const maxWidth = 500
					const maxHeight = 800

					if (width > maxWidth || height > maxHeight) {
						const ratio = Math.min(maxWidth / width, maxHeight / height)
						width = Math.round(width * ratio)
						height = Math.round(height * ratio)
					}

					const ctx = uni.createCanvasContext(this.canvasId, this)
					ctx.setFillStyle('#ffffff')
					ctx.fillRect(0, 0, width, height)
					ctx.drawImage(filePath, 0, 0, width, height)

					ctx.draw(false, () => {
						setTimeout(() => {
							uni.canvasToTempFilePath({
								canvasId: this.canvasId,
								quality: 0.6,
								fileType: 'jpg',
								x: 0,
								y: 0,
								width: width,
								height: height,
								destWidth: width,
								destHeight: height,
								success: (res) => {
									resolve(res.tempFilePath)
								},
								fail: (err) => {
									console.error('Canvas压缩失败:', err)
									reject(err)
								}
							}, this)
						}, 300)
					})
				})
			},
			deleteImage(index) {
				if (this.isDragging) return
				this.imageList.splice(index, 1)
			},
			previewImage(index) {
				if (this.dragJustEnded) {
					this.dragJustEnded = false
					return
				}
				uni.previewImage({
					urls: this.imageList,
					current: index,
					longPressActions: {
						itemList: ['发送给朋友', '保存图片', '收藏'],
						success: function(data) {
							console.log('选中了第' + (data.tapIndex + 1) + '个按钮,第' + (data.index + 1) + '张图片');
						},
						fail: function(err) {
							console.log(err.errMsg);
						}
					}
				})
			},
			async processImages(isEdit) {
				let newImageFiles = []
				let keptUrls = []

				if (this.imageList.length > 0) {
					this.imageList.forEach((imgPath) => {
						if (imgPath.startsWith('http://tmp/') || imgPath.startsWith('wxfile://')) {
							newImageFiles.push(imgPath)
						} else if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
							keptUrls.push(imgPath)
						} else {
							newImageFiles.push(imgPath)
						}
					})
				}

				if (newImageFiles.length > 0) {
					uni.showLoading({
						title: '上传中...'
					})
					try {
						const timestamp = Date.now()
						const uploadPromises = newImageFiles.map((filePath, index) => {
							return new Promise((resolve, reject) => {
								const timeout = setTimeout(() => {
									console.error('上传超时:', filePath)
									reject(new Error('上传超时'))
								}, 30000)

								uniCloud.uploadFile({
									filePath: filePath,
									cloudPath: `${this.uploadPath}/${timestamp}_${index}_${Math.random().toString(36).substr(2, 9)}.jpg`,
									success: (res) => {
										clearTimeout(timeout)
										console.log('上传返回 fileID:', res.fileID)
										const parts = res.fileID.split('/')
										const cloudPath = parts.slice(3).join('/')
										const finalUrl = `${this.cloudDomain}/${cloudPath}`
										console.log('最终URL:', finalUrl)
										resolve(finalUrl)
									},
									fail: (err) => {
										clearTimeout(timeout)
										console.error('单个文件上传失败:', filePath, err)
										reject(err)
									}
								})
							})
						})
						const newUrls = await Promise.all(uploadPromises)
						const allUrls = [...keptUrls, ...newUrls]
						const result = allUrls.join(';')
						uni.hideLoading()
						return result
					} catch (err) {
						uni.hideLoading()
						console.error('图片上传失败详情:', err)
						uni.showModal({
							content: `图片上传失败：${err.message || '未知错误'}`,
							showCancel: false
						})
						return null
					}
				} else {
					if (isEdit) {
						return keptUrls.join(';')
					} else if (keptUrls.length > 0) {
						return keptUrls.join(';')
					}
					return ''
				}
			},
			
			clearImages() {
				this.imageList = []
			},
			// ===== 拖拽排序方法 =====
			// 统一计算每个格子的视觉样式：拖拽项跟随手指，被占位的项平滑让位
			getImageItemStyle(index) {
				if (!this.isDragging || this.dragIndex < 0) return ''
				const positions = this.dragItemPositions
				if (index === this.dragIndex) {
					// 拖拽中的图片：跟随手指 + 浮起效果（无过渡保证跟手）
					return `transform: translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(1.1); z-index: 100; opacity: 0.9; box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.3); transition: none;`
				}
				// 计算让位偏移
				let dx = 0
				let dy = 0
				const s = positions[this.dragIndex]
				if (this.dragTargetIndex > this.dragIndex && index > this.dragIndex && index <= this.dragTargetIndex) {
					// 向后拖：中间的元素向前移一位
					const t = positions[index - 1]
					dx = t.left - positions[index].left
					dy = t.top - positions[index].top
				} else if (this.dragTargetIndex < this.dragIndex && index >= this.dragTargetIndex && index < this.dragIndex) {
					// 向前拖：中间的元素向后移一位
					const t = positions[index + 1]
					dx = t.left - positions[index].left
					dy = t.top - positions[index].top
				} else if (index === this.dragTargetIndex && this.dragTargetIndex !== this.dragIndex) {
					// 目标位置：移到拖拽项的原始位置（补位）
					dx = s.left - positions[index].left
					dy = s.top - positions[index].top
				}
				if (dx === 0 && dy === 0) return ''
				return `transform: translate(${dx}px, ${dy}px); z-index: 2; transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.3, 1);`
			},
			onDragStart(e, index) {
				if (this.imageList.length <= 1) return
				this.isDragging = true
				this.dragJustEnded = false
				this.dragIndex = index
				this.dragTargetIndex = index
				const touch = e.touches[0]
				this.dragStartTouchX = touch.clientX
				this.dragStartTouchY = touch.clientY
				this.dragOffsetX = 0
				this.dragOffsetY = 0
				// 获取所有图片元素的位置用于碰撞检测
				const query = uni.createSelectorQuery().in(this)
				query.selectAll('.upload-item').boundingClientRect()
				query.exec((res) => {
					if (res && res[0]) {
						this.dragItemPositions = res[0]
					}
				})
				uni.vibrateShort()
			},
			onDragMove(e) {
				if (!this.isDragging || this.dragIndex < 0) return
				const touch = e.touches[0]
				this.dragOffsetX = touch.clientX - this.dragStartTouchX
				this.dragOffsetY = touch.clientY - this.dragStartTouchY
				const positions = this.dragItemPositions
				if (!positions.length) return
				// 手指当前位置落在哪个格子，目标索引就是哪里（无需中心点判断，响应更直接）
				let target = -1
				for (let i = 0; i < positions.length; i++) {
					const pos = positions[i]
					if (touch.clientX >= pos.left && touch.clientX <= pos.right && touch.clientY >= pos.top && touch.clientY <= pos.bottom) {
						target = i
						break
					}
				}
				// 只在目标位置真正变化时才更新，避免重渲染抖动
				if (target !== -1 && target !== this.dragTargetIndex) {
					this.dragTargetIndex = target
					uni.vibrateShort()
				}
			},
			onDragEnd() {
				if (!this.isDragging) return
				// 松手时才真正调整数组顺序，拖拽过程中数组不变（避免列表重渲染卡顿）
				if (this.dragTargetIndex !== -1 && this.dragTargetIndex !== this.dragIndex) {
					const moved = this.imageList.splice(this.dragIndex, 1)[0]
					this.imageList.splice(this.dragTargetIndex, 0, moved)
				}
				this.isDragging = false
				this.dragIndex = -1
				this.dragTargetIndex = -1
				this.dragOffsetX = 0
				this.dragOffsetY = 0
				this.dragItemPositions = []
				this.dragJustEnded = true
				setTimeout(() => {
					this.dragJustEnded = false
				}, 300)
			}
		}
	}
</script>

<style lang="scss" scoped>
	.section-box {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);

		.section-title {
			font-size: 28rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 16rpx;

			.optional {
				font-size: 24rpx;
				color: #999;
				font-weight: normal;
			}
		}
	}

	.upload-box {
		display: flex;
		flex-wrap: wrap;

		.upload-item {
			position: relative;
			width: 160rpx;
			height: 160rpx;
			margin-right: 16rpx;
			margin-bottom: 16rpx;
			border-radius: 12rpx;
			overflow: hidden;
			will-change: transform;

			.upload-image {
				width: 100%;
				height: 100%;
			}

			.upload-delete {
				position: absolute;
				top: 0;
				right: 0;
				width: 40rpx;
				height: 40rpx;
				background: rgba(0, 0, 0, 0.6);
				color: #fff;
				font-size: 32rpx;
				line-height: 40rpx;
				text-align: center;
			}
		}

		.upload-add {
			width: 160rpx;
			height: 160rpx;
			background: #f5f5f5;
			border-radius: 12rpx;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			border: 2rpx dashed #ddd;

			.upload-add-icon {
				font-size: 48rpx;
				color: #999;
			}

			.upload-add-text {
				font-size: 24rpx;
				color: #999;
				margin-top: 8rpx;
			}

			.upload-add-count {
				font-size: 20rpx;
				color: #bbb;
			}
		}

		.upload-item-placeholder {
			opacity: 0.25;
			border: 2rpx dashed #999;
			box-sizing: border-box;
		}
	}
</style>