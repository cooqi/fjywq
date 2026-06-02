<template>
	<view class="content-box">
		<!-- 统计信息 -->
		<view class="stats-box">
			<view class="stats-item">
				<view class="stats-label">总消费</view>
				<view class="stats-value">¥{{totalAmount}}</view>
			</view>
			<view class="stats-item">
				<view class="stats-label">记录数</view>
				<view class="stats-value">{{totalCount}}条</view>
			</view>
		</view>
		
		<!-- 分类筛选 -->
		<view class="filter-box">
			<scroll-view scroll-x class="filter-scroll">
				<view class="filter-item" 
					:class="{active: currentType === item.value}" 
					v-for="(item, index) in typeList" 
					:key="index"
					@click="switchType(item.value)">
					{{item.label}}
				</view>
			</scroll-view>
		</view>
		
		<!-- 记录列表 -->
		<view class="record-list">
			<view class="record-item" v-for="item in list" :key="item._id" @click="editRecord(item._id)">
				<view class="record-header">
					<view class="record-type">{{item.payType}}</view>
					<view class="record-amount">¥{{item.payAmount}}</view>
				</view>
				<view class="record-name">{{item.payName}}</view>
				<view class="record-info">
					<view class="record-time">{{item.payTime}}</view>
					<view class="record-detail" v-if="item.payNum">数量：{{item.payNum}}</view>
				</view>
				<view class="record-detail" v-if="item.bz">备注：{{item.bz}}</view>
			</view>
		</view>
		
		<view v-if="!list.length && !loading" class="tips">暂无消费记录</view>
		
		<!-- 添加按钮 -->
		<view class="add-btn" @click="addRecord">+</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				list: [],
				totalAmount: '0.00',
				totalCount: 0,
				typeList: [
					{ label: '全部', value: 'all' },
					{ label: '音乐节', value: '音乐节' },
					{ label: '演唱会', value: '演唱会' },
					{ label: '周边', value: '周边' },
					{ label: '专辑', value: '专辑' },
					{ label: '商务', value: '商务' },
					{ label: '其他', value: '其他' }
				],
				currentType: 'all',
				loading: false,
				userInfo: {
					_id: ''
				}
			}
		},
		onLoad() {
			
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo');
				console.log('userInfo',userInfo)
				this.userInfo=JSON.parse(userInfo)
				if(this.userInfo._id){
					this.getRecords()
					this.getTotal()
				}else{
					this.getUserInfo()
				}
		
		},
		onPullDownRefresh() {
			this.getRecords()
			this.getTotal()
		},
		methods: {
			getUserInfo() {    
				const _this = this
			    uni.getUserProfile({desc: '用于完善会员资料',success: (result) => {
			            _this.userInfo = result.userInfo
						console.log(_this.userInfo)
			            _this.wxLogin()
			        },fail: () => {
			            uni.hideLoading();
			            uni.showModal({content: '获取用户信息失败',showCancel: false
			            })
			        }
			    })
			},
			wxLogin() {  
				const _this = this
			    uni.showLoading({title: '加载中' });
			
			    uni.login({provider: 'weixin',success: (res) => {            // 获取 code
				console.log('login',res)
			            if(res.code) {
			                uniCloud.callFunction({
								name: 'user',
								data: {
									action: 'code2Session',
									js_code: res.code,
									user_info: _this.userInfo,
								},
								success: (res) => {
									console.log('云函数返回的值：：：：', res.result)
			                        uni.hideLoading();
									if(res.result.result.result._id) {
			                            uni.setStorageSync('userInfo', JSON.stringify(res.result.result.result))
										_this.userInfo=res.result.result.result
			                            this.getRecords()
										this.getTotal()
			                        }
			                    },fail: (err) => {
			                        uni.hideLoading();
									console.log('云函数调用失败',err)
			                    }
			                })
			            }
			        }
			    })
			},
			switchType(type) {
				this.currentType = type
				this.getRecords()
				this.getTotal()
			},
			getTotal() {
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录',
						showCancel: false
					})
					return
				}
				
				uniCloud.callFunction({
					name: 'pay-record',
					data: {
						type: 'getTotal',
						payType: this.currentType,
						userId: this.userInfo._id
					}
				}).then((res) => {
					if (res.result.code === 0) {
						this.totalAmount = res.result.data.total
						this.totalCount = res.result.data.count
					}
				}).catch((err) => {
					console.error('获取统计失败', err)
				})
			},
			getRecords() {
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录',
						showCancel: false
					})
					return
				}
				
				uni.showLoading({
					title: '加载中...'
				})
				this.loading = true
				uniCloud.callFunction({
					name: 'pay-record',
					data: {
						type: 'get',
						payType: this.currentType,
						userId: this.userInfo._id
					}
				}).then((res) => {
					uni.hideLoading()
					uni.stopPullDownRefresh()
					this.loading = false
					if (res.result.code === 0) {
						this.list = res.result.data
					} else {
						uni.showModal({
							content: res.result.message,
							showCancel: false
						})
					}
				}).catch((err) => {
					uni.hideLoading()
					uni.stopPullDownRefresh()
					this.loading = false
					uni.showModal({
						content: `查询失败：${err.message}`,
						showCancel: false
					})
				})
			},
			addRecord() {
				uni.navigateTo({
					url: '/pages/payRecord/edit'
				})
			},
			editRecord(id) {
				uni.navigateTo({
					url: `/pages/payRecord/edit?id=${id}`
				})
			}
		}
	}
</script>

<style lang="scss">
.content-box {
	padding: 20rpx 30rpx 120rpx;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	min-height: 100vh;
}

.stats-box {
	display: flex;
	justify-content: space-around;
	background: linear-gradient(135deg, #dcbcf7 0%, #9eeef8 100%);
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
	
	.stats-item {
		text-align: center;
		
		.stats-label {
			font-size: 24rpx;
			color: #666;
			margin-bottom: 10rpx;
		}
		
		.stats-value {
			font-size: 36rpx;
			font-weight: bold;
			color: #fff;
		}
	}
}

.filter-box {
	margin-bottom: 20rpx;
	
	.filter-scroll {
		white-space: nowrap;
	}
	
	.filter-item {
		display: inline-block;
		padding: 16rpx 32rpx;
		margin-right: 16rpx;
		background: #fff;
		border-radius: 32rpx;
		font-size: 28rpx;
		color: #666;
		
		&.active {
			background: linear-gradient(135deg, #6bfff3 0%, #a777d3 100%);
			color: #fff;
		}
	}
}

.record-list {
	.record-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
		
		.record-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 12rpx;
			
			.record-type {
				font-size: 24rpx;
				color: #fff;
				background: linear-gradient(135deg, #66baea 0%, #a97bd6 100%);
				padding: 8rpx 16rpx;
				border-radius: 8rpx;
			}
			
			.record-amount {
				font-size: 32rpx;
				font-weight: bold;
				color: #f7ca05;
			}
		}
		
		.record-name {
			font-size: 28rpx;
			color: #333;
			font-weight: 500;
			margin-bottom: 8rpx;
		}
		
		.record-info {
			display: flex;
			justify-content: space-between;
			font-size: 24rpx;
			color: #999;
		}
		
		.record-detail {
			font-size: 24rpx;
			color: #666;
			margin-top: 8rpx;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
}

.tips {
	text-align: center;
	color: #999;
	padding: 100rpx 0;
	font-size: 28rpx;
}

.add-btn {
	position: fixed;
	right: 40rpx;
	bottom: 80rpx;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #6bfff3 0%, #a777d3 100%);
	color: #fff;
	font-size: 60rpx;
	line-height: 100rpx;
	text-align: center;
	box-shadow: 0 8rpx 24rpx rgba(255,107,107,0.4);
}
</style>
