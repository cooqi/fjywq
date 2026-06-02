<template>
	<view class="edit-page">
		<view class="form-box">
			<!-- 头像 -->
			<view class="avatar-section">
				<image class="avatar" src="/static/userImg/baby.png" mode="aspectFill"></image>
				<view class="avatar-tip">固定头像</view>
			</view>
			
			<!-- 昵称 -->
			<view class="form-item">
				<view class="form-label">昵称</view>
				<input 
					class="form-input" 
					v-model="formData.nickName" 
					placeholder="请输入昵称"
					maxlength="20"
				/>
			</view>
			
			<!-- 入坑时间 -->
			<view class="form-item">
				<view class="form-label">入坑时间</view>
				<uni-datetime-picker 
					type="date" 
					v-model="formData.startTime"
					placeholder="请选择入坑时间"
				/>
			</view>
			
			<!-- 喜欢类型 -->
			<view class="form-item">
				<view class="form-label">我的属性/我站</view>
				<input 
					class="form-input" 
					v-model="formData.loveType" 
					placeholder="默认宇青99"
					maxlength="20"
				/>
			</view>
			
			<!-- 微信号 -->
			<view class="form-item">
				<view class="form-label">微信号</view>
				<input 
					class="form-input" 
					v-model="formData.wxid" 
					placeholder="请输入微信号"
					maxlength="30"
				/>
			</view>
		</view>
		
		<!-- 保存按钮 -->
		<view class="btn-box">
			<button class="btn-save" @click="saveProfile">保存</button>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				formData: {
					nickName: '',
					startTime: '',
					loveType: '宇青99',
					wxid: ''
				},
				userInfo: {}
			}
		},
		onLoad(options) {
			// 获取传递的参数
			if (options.nickName) {
				this.formData.nickName = decodeURIComponent(options.nickName)
			}
			if (options.startTime) {
				this.formData.startTime = decodeURIComponent(options.startTime)
			}
			if (options.loveType) {
				this.formData.loveType = decodeURIComponent(options.loveType) || '宇青99'
			}
			if (options.wxid) {
				this.formData.wxid = decodeURIComponent(options.wxid)
			}
			
			// 获取用户信息
			try {
				const userInfo = uni.getStorageSync('userInfo')
				this.userInfo = JSON.parse(userInfo)
			} catch (e) {
				console.error('获取用户信息失败', e)
			}
		},
		methods: {
			saveProfile() {
				// 验证必填项
				if (!this.formData.nickName) {
					uni.showModal({
						content: '请输入昵称',
						showCancel: false
					})
					return
				}
				
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录',
						showCancel: false
					})
					return
				}
				
				uni.showLoading({ title: '保存中...' })
				
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'update',
						_id: this.userInfo._id,
						open_id: this.userInfo.mp_wx_openid,
						user_info: {
							nickName: this.formData.nickName,
							avatarUrl: '/static/userImg/baby.png'
						},
						startTime: this.formData.startTime,
						loveType: this.formData.loveType || '宇青99',
						wxid: this.formData.wxid
					}
				}).then((res) => {
					uni.hideLoading()
					if (res.result) {
						// 更新本地存储
						const userInfo = uni.getStorageSync('userInfo')
						if (userInfo) {
							const userObj = JSON.parse(userInfo)
							userObj.nickName = this.formData.nickName
							userObj.startTime = this.formData.startTime
							userObj.loveType = this.formData.loveType || '宇青99'
							userObj.wxid = this.formData.wxid
							uni.setStorageSync('userInfo', JSON.stringify(userObj))
						}
						
						uni.showModal({
							content: '保存成功',
							showCancel: false,
							success: () => {
								// 返回上一页并刷新
								uni.navigateBack()
							}
						})
					}
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `保存失败：${err.message}`,
						showCancel: false
					})
				})
			}
		}
	}
</script>

<style lang="scss">
.edit-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx 30rpx 120rpx;
}

.form-box {
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
	margin-top: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.avatar-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 40rpx;
	
	.avatar {
		width: 160rpx;
		height: 160rpx;
		border-radius: 50%;
		border: 4rpx solid #2df3e3;
		margin-bottom: 16rpx;
	}
	
	.avatar-tip {
		font-size: 24rpx;
		color: #999;
	}
}

.form-item {
	margin-bottom: 32rpx;
	
	&:last-child {
		margin-bottom: 0;
	}
	
	.form-label {
		font-size: 28rpx;
		color: #333;
		font-weight: bold;
		margin-bottom: 16rpx;
	}
	
	.form-input {
		height: 80rpx;
		background: #f5f5f5;
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}
}

.btn-box {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 20rpx 30rpx;
	background: #fff;
	box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.1);
	
	.btn-save {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #31eee0 0%, #a9a9d9 100%);
		color: #fff;
		border-radius: 44rpx;
		font-size: 32rpx;
		border: none;
	}
}
</style>
