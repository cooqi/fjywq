<template>
	<view class="page-container">
		<!-- ===== 发布表单 ===== -->
		<view v-if="phase === 'form'">
			<view class="page-title">发布互换</view>

			<view class="field">
				<text class="field-label">物料名称 *</text>
				<input class="field-input" v-model="form.name" placeholder="如：A版小卡" maxlength="40" />
			</view>

			<view class="field">
				<text class="field-label">图片（可选）</text>
				<image-upload ref="uploader" title="上传图片" :max-count="1" upload-path="exchange" optional-text="单张，可跳过" :modelValue="form.image" >
					</image-upload>
			</view>

			<view class="field">
				<text class="field-label">互换数量 N *（总共放出几份）</text>
				<view class="stepper">
					<text class="step-btn" @click="changeQty(-1)">－</text>
					<input class="step-input" type="number" v-model="form.totalQty" />
					<text class="step-btn" @click="changeQty(1)">＋</text>
				</view>
			</view>

			<view class="field">
				<view class="switch-row">
					<view class="switch-info">
						<text class="switch-label">允许伸手</text>
						<text class="switch-sub">关闭后，申请人必须填写用于互换的物料</text>
					</view>
					<switch :checked="form.allowFree" color="#38b2ac" style="transform:scale(.85)" @change="onAllowFreeChange" />
				</view>
			</view>

			<view class="field">
				<text class="field-label">备注（想换什么、地点等）</text>
				<textarea class="field-textarea" v-model="form.remark" placeholder="如：想换B版，内场B区面交" maxlength="200" />
			</view>

			<view class="field">
				<text class="field-label">有效期</text>
				<picker mode="selector" :range="expireLabels" :value="expireIndex" @change="onExpireChange">
					<view class="picker-box">{{ expireLabels[expireIndex] }}</view>
				</picker>
			</view>

			<button class="primary-btn" :disabled="isLoading" @click="submitCreate">
				{{ isLoading ? '生成中...' : '生成物料码' }}
			</button>
		</view>

		<!-- ===== 物料码结果 ===== -->
		<view v-else class="code-page">
			<view class="done-tip">🎉 发布成功！</view>
			<view class="code-card">
				<view class="code-card-name">{{ result.name }}</view>
				<view class="code-label">物料码</view>
				<view class="code-value">{{ result.code }}</view>
				<view class="code-meta">共 {{ result.totalQty }} 份 · {{ expireLabels[expireIndex] }}后过期</view>
			</view>

			<view class="action-grid">
				<view class="action-item" @click="copyCode">📋 复制物料码</view>
				<!-- #ifdef MP-WEIXIN -->
				<button class="action-item" open-type="share">💌 分享给好友</button>
				<!-- #endif -->
				<!-- #ifndef MP-WEIXIN -->
				<view class="action-item" @click="copyLink">🔗 复制分享文案</view>
				<!-- #endif -->
				<view class="action-item" @click="goManage">🧾 去管理申请</view>
			</view>

			<view class="share-tip">把物料码发给好友，好友在「物料互换」首页输入物料码即可申请</view>

			<view class="btn-row">
				<button class="ghost-btn" @click="resetForm">再发一个</button>
				<button class="ghost-btn" @click="goHome">回首页</button>
			</view>
		</view>

		<view class="loading-mask" v-if="isLoading"><text>处理中...</text></view>
	</view>
</template>

<script>
import imageUpload from '@/components/image-upload/image-upload.vue'

export default {
	components: { imageUpload },
	data() {
		return {
			userId: '',
			phase: 'form', // form | code
			isLoading: false,
			form: { name: '', image: '', totalQty: '1', remark: '', allowFree: true },
			expireOptions: [1, 3, 7, 15, 30],
			expireLabels: ['1 天', '3 天', '7 天（推荐）', '15 天', '30 天'],
			expireIndex: 2,
			result: { listingId: '', code: '', name: '', totalQty: 0 }
		}
	},
	onLoad() {
		const raw = uni.getStorageSync('userInfo')
		let info = {}
		if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
		this.userId = info._id || ''
	},
	onShareAppMessage() {
		return {
			title: '来跟我换物料吧：' + this.result.name + '（物料码 ' + this.result.code + '）',
			path: '/pages/game/xianxia/huhuan/huhuan-apply?code=' + this.result.code
		}
	},
	onShareTimeline() {
		return {
			title: '来跟我换物料吧：' + this.result.name + '（物料码 ' + this.result.code + '）'
		}
	},
	methods: {
		changeQty(delta) {
			let n = parseInt(this.form.totalQty) || 0
			n = Math.max(1, Math.min(999, n + delta))
			this.form.totalQty = String(n)
		},
		onExpireChange(e) {
			this.expireIndex = Number(e.detail.value)
		},
		onAllowFreeChange(e) {
			this.form.allowFree = e.detail.value
		},
		async submitCreate() {
			if (!this.userId) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
			const name = (this.form.name || '').trim()
			if (!name) { uni.showToast({ title: '请填写物料名称', icon: 'none' }); return }
			const totalQty = parseInt(this.form.totalQty)
			if (!(totalQty >= 1)) { uni.showToast({ title: '互换数量至少 1', icon: 'none' }); return }

			this.isLoading = true
			try {
				// 处理图片上传（组件返回以分号分隔的 URL 字符串；失败返回 null 并已自行弹窗，参照 rili.vue）
				let image = ''
				if (this.$refs.uploader) {
					const result = await this.$refs.uploader.processImages(false)
					if (result === null) { this.isLoading = false; return }
					image = result || ''
					// 回写 modelValue，保持组件图片列表与页面数据一致（参照 rili.vue 的 setImg）
					this.form.image = image
				}

				uniCloud.callFunction({
					name: 'exchange',
					data: {
						action: 'createListing',
						userId: this.userId,
						name,
						image: image.split(';')[0] || '',
						totalQty,
						allowFree: this.form.allowFree,
						remark: (this.form.remark || '').trim(),
						expireDays: this.expireOptions[this.expireIndex]
					},
					success: (res) => {
						this.isLoading = false
						if (res.result.code === 0) {
							this.result = {
								listingId: res.result.data.listingId,
								code: res.result.data.code,
								name,
								totalQty
							}
							this.phase = 'code'
						} else {
							uni.showToast({ title: res.result.msg, icon: 'none' })
						}
					},
					fail: (err) => {
						this.isLoading = false
						console.error('发布失败:', err)
						uni.showToast({ title: '网络错误', icon: 'none' })
					}
				})
			} catch (e) {
				this.isLoading = false
				console.error('发布异常:', e)
				uni.showToast({ title: '发布失败，请重试', icon: 'none' })
			}
		},
		copyCode() {
			uni.setClipboardData({ data: this.result.code, success: () => uni.showToast({ title: '物料码已复制', icon: 'none' }) })
		},
		copyLink() {
			const link = `跟我换物料吧：${this.result.name}，物料码 ${this.result.code}，打开小程序「物料互换」输入物料码即可申请`
			uni.setClipboardData({ data: link, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
		},
		goManage() {
			uni.navigateTo({ url: '/pages/game/xianxia/huhuan/huhuan-manage?mode=manage&listingId=' + this.result.listingId })
		},
		goHome() {
			uni.navigateBack({ delta: 1, fail: () => uni.redirectTo({ url: '/pages/game/xianxia/huhuan/huhuan' }) })
		},
		resetForm() {
			this.form = { name: '', image: '', totalQty: '1', remark: '', allowFree: true }
			if (this.$refs.uploader) this.$refs.uploader.clearImages()
			this.phase = 'form'
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx;
	box-sizing: border-box;
}
.page-title { font-size: 36rpx; font-weight: bold; color: #2e8b6f; padding: 16rpx 0 24rpx; text-align: center; }

.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.field-input {
	height: 84rpx; background: #fff; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx;
}
.field-textarea {
	width: 100%; box-sizing: border-box; height: 140rpx; background: #fff; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx;
}
.picker-box {
	height: 84rpx; line-height: 84rpx; background: #fff; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; color: #333;
}

.stepper { display: flex; align-items: center; gap: 20rpx; }
.switch-row {
	display: flex; align-items: center; justify-content: space-between;
	background: #fff; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 18rpx 24rpx;
}
.switch-info { display: flex; flex-direction: column; flex: 1; margin-right: 20rpx; }
.switch-label { font-size: 28rpx; color: #333; font-weight: bold; }
.switch-sub { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.step-btn {
	width: 88rpx; height: 84rpx; line-height: 84rpx; text-align: center;
	background: #fff; border: 2rpx solid #e6e6f0; border-radius: 16rpx;
	font-size: 40rpx; color: #2e8b6f;
}
.step-btn:active { background: #eefaf3; }
.step-input {
	flex: 1; height: 84rpx; background: #fff; border: 2rpx solid #e6e6f0;
	border-radius: 16rpx; text-align: center; font-size: 34rpx;
}

.primary-btn {
	background: linear-gradient(135deg, #43e97b 0%, #38b2ac 100%);
	color: #fff; border-radius: 44rpx; height: 92rpx; line-height: 92rpx; font-size: 32rpx; border: none; margin-top: 20rpx;
	&[disabled] { opacity: .6; }
}

/* 物料码结果 */
.done-tip { text-align: center; font-size: 34rpx; font-weight: bold; color: #2e8b6f; padding: 20rpx 0; }
.code-card {
	background: linear-gradient(150deg, #43e97b 0%, #38b2ac 60%, #3a6ea5 100%);
	border-radius: 32rpx; padding: 46rpx 30rpx; text-align: center; color: #fff;
	box-shadow: 0 14rpx 44rpx rgba(56, 178, 172, .4);
}
.code-card-name { font-size: 32rpx; opacity: .95; }
.code-label { font-size: 24rpx; opacity: .8; margin-top: 24rpx; letter-spacing: 4rpx; }
.code-value { font-size: 72rpx; font-weight: bold; letter-spacing: 10rpx; margin: 12rpx 0; font-family: monospace; }
.code-meta { font-size: 24rpx; opacity: .9; }

.action-grid { display: flex; flex-wrap: wrap; gap: 18rpx; margin-top: 30rpx; }
.action-item {
	width: calc(50% - 9rpx); box-sizing: border-box;
	background: #fff; border-radius: 22rpx; padding: 30rpx 0; text-align: center;
	font-size: 28rpx; color: #2e8b6f; box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, .10); border: none; line-height: 1.4;
}
.action-item:active { transform: scale(.96); }
.share-tip { font-size: 24rpx; color: #8a86a8; text-align: center; margin-top: 24rpx; line-height: 1.6; }
.btn-row { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-row button { flex: 1; margin: 0; }
.ghost-btn {
	background: #fff; color: #2e8b6f; border: 2rpx solid #2e8b6f;
	border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx;
}

.loading-mask {
	position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, .7); color: #fff; padding: 30rpx 50rpx; border-radius: 16rpx; font-size: 28rpx; z-index: 999;
}
</style>
