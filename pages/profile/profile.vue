<template>
	<view class="page-container">
		<!-- 未登录状态 -->
		<view class="login-box" v-if="!userInfo._id">
			<view class="login-content">
				<view class="login-title">欢迎使用宇青青宇备忘录</view>
				<view class="login-desc">登录后可以记录你的追星历程，还有更多 surprises 等你来发现</view>
				<button class="login-btn" @click="getUserInfo">立即登录</button>
			</view>
		</view>
		
		<!-- 已登录状态 -->
		<view class="profile-box" v-else>
			<!-- 用户信息卡片 -->
			<view class="user-card">
				<image class="user-avatar" src="/static/userImg/baby.png" mode="aspectFill"></image>
				<view class="user-info">
					<view class="user-name">
                        <view class="user-nick-name">{{userInfo.nickName || '杯杯儿'}}</view>
                        <view class="archive-value">{{profileData.loveType || '未设置'}}</view>
                        <view class="archive-value">入坑时间：{{profileData.joinTime || '未设置'}}</view>
                    </view>
					<view class="user-edit-btn" @click="showEditDialog">编辑</view>
				</view>
                
			</view>
			
			
			
			<!-- 功能菜单 -->
			<view class="menu-box">
				<view class="menu-item" @click="goToTodo">
					<view class="menu-icon">📝</view>
					<view class="menu-text">我的待办</view>
				</view>
				<view class="menu-item" @click="showMeetTypeDialog">
					<view class="menu-icon">🎤</view>
					<view class="menu-text">点亮双人见面</view>
				</view>
				<view class="menu-item" @click="goToPayRecord">
					<view class="menu-icon">💰</view>
					<view class="menu-text">消费记录</view>
				</view>
				<view class="menu-item" @click="goToFootprint">
					<view class="menu-icon">🗺️</view>
					<view class="menu-text">足迹</view>
				</view>
				<view class="menu-item" @click="goToSuggestion">
					<view class="menu-icon">💬</view>
					<view class="menu-text">杯杯儿信箱</view>
				</view>
			</view>
			
			<!-- 其他信息 -->
			<view class="info-box">
				<view class="info-item" @click="goToConcertAdmin"  v-if="userInfo._id==='68b547748a5c782a2b48ac30'">
					<view class="info-text">演唱会/音乐节管理</view>
				</view>
				<view class="info-item" @click="showAbout">
					<view class="info-text">关于我们</view>
				</view>
			</view>
			
			<!-- 版本号 -->
			<view class="version">v19.27.69</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {},
				profileData: {
					joinTime: '',
					loveType: '宇青99',
					wxid: ''
				},
				meetCount: 0,
				firstMeetInfo: '',
				todoCount: 0,
				// 编辑表单数据
				editForm: {
					nickName: '',
					startTime: '',
					loveType: '',
					wxid: ''
				}
			}
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.getUserStats()
				} else {
					this.getUserInfo()
				}
			} else {
				this.getUserInfo()
			}
		},
		methods: {
			getUserInfo() {
				const _this = this
				uni.getUserProfile({
					desc: '用于完善会员资料',
					success: (result) => {
						_this.userInfo = result.userInfo
						_this.wxLogin()
					},
					fail: () => {
						uni.hideLoading()
						uni.showModal({
							content: '获取用户信息失败',
							showCancel: false
						})
					}
				})
			},
			wxLogin() {
				const _this = this
				uni.showLoading({ title: '加载中' })
				uni.login({
					provider: 'weixin',
					success: (res) => {
						if (res.code) {
							uniCloud.callFunction({
								name: 'user',
								data: {
									action: 'code2Session',
									js_code: res.code,
									user_info: _this.userInfo
								},
								success: (res) => {
									uni.hideLoading()
									if (res.result.result.result._id) {
										uni.setStorageSync('userInfo', JSON.stringify(res.result.result.result))
										_this.userInfo = res.result.result.result
										_this.getUserStats()
									}
								},
								fail: (err) => {
									uni.hideLoading()
									console.log('云函数调用失败', err)
								}
							})
						}
					}
				})
			},
			getUserStats() {
				// 获取消费记录中的音乐节场次
				console.log('当前用户ID:', this.userInfo._id)
				
				
						
				// 获取用户详细信息（包括 startTime 和 loveType）
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'getUser',
						open_id: this.userInfo.mp_wx_openid
					},
					success: (res) => {
						if (res.result) {
							this.profileData.joinTime = res.result.startTime || ''
							this.profileData.loveType = res.result.loveType || '宇青99'
							this.profileData.wxid = res.result.wxid || ''
						}
					}
				})
			},
			editProfile() {
				this.showEditDialog()
			},
			showEditDialog() {
				// 初始化编辑表单
				this.editForm = {
					nickName: this.userInfo.nickName || '',
					startTime: this.profileData.joinTime || '',
					loveType: this.profileData.loveType || '宇青99',
					wxid: this.profileData.wxid || ''
				}
						
				this.openEditPage()
			},
			openEditPage() {
				// 跳转到编辑页面
				uni.navigateTo({
					url: `/pages/profile/edit?nickName=${encodeURIComponent(this.editForm.nickName)}&startTime=${encodeURIComponent(this.editForm.startTime)}&loveType=${encodeURIComponent(this.editForm.loveType)}&wxid=${encodeURIComponent(this.editForm.wxid)}`
				})
			},
			updateUserInfo(newNickName, newStartTime, newLoveType, newWxid) {
				uni.showLoading({ title: '保存中...' })
				uniCloud.callFunction({
					name: 'user',
					data: {
						action: 'update',
						_id: this.userInfo._id,
						open_id: this.userInfo.mp_wx_openid,
						user_info: {
							nickName: newNickName || this.userInfo.nickName,
							avatarUrl: '/static/userImg/baby.png'
						},
						startTime: newStartTime !== undefined ? newStartTime : this.profileData.joinTime,
						loveType: newLoveType !== undefined ? newLoveType : this.profileData.loveType,
						wxid: newWxid !== undefined ? newWxid : this.profileData.wxid
					}
				}).then((res) => {
					uni.hideLoading()
					if (res.result) {
						// 更新本地数据
						if (newNickName) {
							this.userInfo.nickName = newNickName
						}
						if (newStartTime !== undefined) {
							this.profileData.joinTime = newStartTime
						}
						if (newLoveType !== undefined) {
							this.profileData.loveType = newLoveType
						}
						if (newWxid !== undefined) {
							this.profileData.wxid = newWxid
						}
											
						// 更新本地存储
						const userInfo = uni.getStorageSync('userInfo')
						if (userInfo) {
							const userObj = JSON.parse(userInfo)
							if (newNickName) userObj.nickName = newNickName
							if (newStartTime !== undefined) userObj.startTime = newStartTime
							if (newLoveType !== undefined) userObj.loveType = newLoveType
							if (newWxid !== undefined) userObj.wxid = newWxid
							uni.setStorageSync('userInfo', JSON.stringify(userObj))
						}
											
						uni.showModal({
							content: '更新成功',
							showCancel: false
						})
					}
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `更新失败：${err.message}`,
						showCancel: false
					})
				})
			},
			goToTodo() {
				uni.navigateTo({
					url: '/pages/myTodo/myTodo'
				})
			},
			showMeetTypeDialog() {
                // 双人见面 - 跳转到现有的meet页面
							this.goToMeet()
				// uni.showActionSheet({
				// 	itemList: ['双人见面', '单人见面'],
				// 	success: (res) => {
				// 		if (res.tapIndex === 0) {
				// 			// 双人见面 - 跳转到现有的meet页面
				// 			this.goToMeet()
				// 		} else if (res.tapIndex === 1) {
				// 			// 单人见面 - 跳转到新的单人见面页面
				// 			this.goToSingleMeet()
				// 		}
				// 	}
				// })
			},
			goToMeet() {
				uni.navigateTo({
					url: '/pages/meet/meet'
				})
			},
			goToSingleMeet() {
				uni.navigateTo({
					url: '/pages/meet/singleMeet'
				})
			},
			goToPayRecord() {
				uni.navigateTo({
					url: '/pages/payRecord/record'
				})
			},
			goToConcertAdmin() {
				uni.navigateTo({
					url: '/pages/concert/admin'
				})
			},
			goToSuggestion() {
				uni.navigateTo({
					url: '/pages/myTodo/suggestion'
				})
			},
			goToFootprint() {
				uni.navigateTo({
					url: '/pages/footprint/footprint'
				})
			},
			
			showAbout() {
				uni.navigateTo({
					url: '/pages/profile/about'
				})
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
    padding: 1px
}

// 未登录状态
.login-box {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	
	.login-content {
		background: #fff;
		border-radius: 32rpx;
		padding: 80rpx 60rpx;
		text-align: center;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
		
		.login-avatar {
			font-size: 120rpx;
			margin-bottom: 32rpx;
		}
		
		.login-title {
			font-size: 40rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 16rpx;
		}
		
		.login-desc {
			font-size: 28rpx;
			color: #999;
			margin-bottom: 48rpx;
		}
		
		.login-btn {
			width: 100%;
			height: 88rpx;
			background: linear-gradient(135deg, #c62828 0%, #d32f2f 100%);
			color: #fff;
			border-radius: 44rpx;
			font-size: 32rpx;
			border: none;
		}
	}
}

// 已登录状态
.profile-box {
	padding: 0 30rpx 40rpx;
}

// 用户信息卡片
.user-card {
	background: linear-gradient(135deg, #d49ff8 0%, #a9fafa 100%);
	border-radius: 24rpx;
	padding: 40rpx;
	margin: 20rpx 0;
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 24rpx rgba(198, 40, 40, 0.3);
	
	.user-avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		margin-right: 32rpx;
		border: 4rpx solid rgba(255, 255, 255, 0.5);
	}
	
	.user-info {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
        .user-name{
			color: #fff;
        }
		
		.user-nick-name {
			font-size: 40rpx;
			font-weight: bold;
			
		}
		
		.user-edit-btn {
			background: rgba(255, 255, 255, 0.2);
			color: #fddb40;
			padding: 16rpx 32rpx;
			border-radius: 32rpx;
			font-size: 28rpx;
		}
	}
}

// 档案卡片
.archive-box {
	background: #fff;
	border-radius: 24rpx;
	padding: 32rpx;
	margin: 20rpx 0;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.archive-title {
		display: flex;
		align-items: center;
		margin-bottom: 24rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		
		.archive-title-bar {
			width: 6rpx;
			height: 32rpx;
			background: #c62828;
			border-radius: 3rpx;
			margin-right: 12rpx;
		}
	}
	
	.archive-content {
		.archive-item {
			background: #fff8e1;
			border-radius: 16rpx;
			padding: 24rpx;
			margin-bottom: 16rpx;
			
			&.full-width {
				margin-bottom: 0;
			}
			
			.archive-label {
				font-size: 24rpx;
				color: #666;
				margin-bottom: 12rpx;
				
				.archive-tip {
					color: #999;
					font-size: 22rpx;
				}
			}
			
			.archive-value {
				font-size: 28rpx;
				color: #333;
				font-weight: 500;
				
				&.highlight {
					font-size: 48rpx;
					font-weight: bold;
					color: #c62828;
				}
			}
		}
	}
}

// 功能菜单
.menu-box {
	background: #fff;
	border-radius: 24rpx;
	overflow: hidden;
	margin: 20rpx 0;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.menu-item {
		display: flex;
		align-items: center;
		padding: 32rpx;
		border-bottom: 1rpx solid #f0f0f0;
		
		&:last-child {
			border-bottom: none;
		}
		
		&:active {
			background: #f5f5f5;
		}
		
		.menu-icon {
			font-size: 40rpx;
			margin-right: 24rpx;
		}
		
		.menu-text {
			flex: 1;
			font-size: 30rpx;
			color: #333;
		}
		
		.menu-arrow {
			font-size: 28rpx;
			color: #999;
		}
	}
}

// 其他信息
.info-box {
	background: #fff;
	border-radius: 24rpx;
	overflow: hidden;
	margin: 20rpx 0;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.info-item {
		display: flex;
		align-items: center;
		padding: 32rpx;
		border-bottom: 1rpx solid #f0f0f0;
		
		&:last-child {
			border-bottom: none;
		}
		
		&:active {
			background: #f5f5f5;
		}
		
		.info-icon {
			font-size: 40rpx;
			margin-right: 24rpx;
		}
		
		.info-text {
			flex: 1;
			font-size: 28rpx;
			color: #666;
		}
		
		.info-arrow {
			font-size: 28rpx;
			color: #999;
		}
	}
}

.version {
	text-align: center;
	font-size: 24rpx;
	color: #999;
	padding: 40rpx 0;
}
</style>
