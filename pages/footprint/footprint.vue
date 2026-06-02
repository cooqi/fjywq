<template>
	<view class="page-container">
		<!-- 未登录状态 -->
		<view class="login-tip" v-if="!userInfo._id">
			<text>请先登录后查看足迹</text>
		</view>
		
		<!-- 已登录状态 -->
		<view class="content-box" v-else>
			<!-- 统计信息 -->
			<view class="stats-box">
				<view class="stat-item">
					<view class="stat-value">{{provinceList.length}}</view>
					<view class="stat-label">去过的省份</view>
				</view>
				<view class="stat-item">
					<view class="stat-value">{{totalConcerts}}</view>
					<view class="stat-label">参加场次</view>
				</view>
			</view>
			
			<!-- 省份列表 -->
			<view class="province-list">
				<view class="list-title">足迹详情</view>
				
				<view 
					class="province-item"
					v-for="(province, index) in provinceList"
					:key="index"
					@click="showProvinceDetail(province)"
				>
					<view class="province-info">
						<view class="province-name">{{province.name}}</view>
						<view class="province-count">{{province.count}} 场</view>
					</view>
					<view class="province-cities">
						<text v-for="(city, cIndex) in province.cities" :key="cIndex" class="city-tag">
							{{city}}
						</text>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-box" v-if="provinceList.length === 0 && !loading">
					<view class="empty-icon">🗺️</view>
					<text class="empty-text">还没有足迹记录</text>
					<text class="empty-desc">参加演唱会或音乐节后会自动生成足迹</text>
				</view>
			</view>
		</view>
		
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading">
			<text>加载中...</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {},
				loading: false,
				provinceList: [], // 省份列表
				totalConcerts: 0 // 总场次
			}
		},
		onLoad() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.loadFootprint()
				}
			}
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.loadFootprint()
				}
			}
		},
		methods: {
			// 加载足迹数据
			loadFootprint() {
				if (!this.userInfo._id) return
				
				this.loading = true
				
				// 查询用户的演唱会/音乐节消费记录
				uniCloud.callFunction({
					name: 'pay-record',
					data: {
						type: 'get',
						userId: this.userInfo._id,
						payType: ['演唱会', '音乐节']
					},
					success: (res) => {
						this.loading = false
						if (res.result.code === 0 && res.result.data) {
							const records = res.result.data || []
							this.totalConcerts = records.length
							
							// 处理数据，按省份分组
							this.processFootprintData(records)
						}
					},
					fail: (err) => {
						this.loading = false
						console.error('加载足迹失败:', err)
						uni.showToast({
							title: '加载失败',
							icon: 'none'
						})
					}
				})
			},
			
			// 处理足迹数据
			processFootprintData(records) {
				const provinceMap = {}
				
				records.forEach(record => {
					// 从地址中提取省份信息
					let province = ''
					let city = ''
					
					if (record.Province) {
						// 如果有 Province 字段，直接使用
						province = record.Province
						city = record.adress || '未知城市'
					} else if (record.adress) {
						// 否则从 address 中提取
						const address = record.adress
						// 简单的省份提取逻辑（可以根据需要优化）
						province = this.extractProvince(address)
						city = this.extractCity(address)
					}
					
					if (!province) {
						province = '未知省份'
					}
					if (!city) {
						city = '未知城市'
					}
					
					// 添加到省份映射
					if (!provinceMap[province]) {
						provinceMap[province] = {
							name: province,
							count: 1,
							cities: new Set([city])
						}
					} else {
						provinceMap[province].count++
						provinceMap[province].cities.add(city)
					}
				})
				
				// 转换为数组并排序
				this.provinceList = Object.values(provinceMap).map(item => ({
					...item,
					cities: Array.from(item.cities)
				})).sort((a, b) => b.count - a.count)
				
				console.log('足迹数据:', this.provinceList)
			},
			
			// 从地址中提取省份
			extractProvince(address) {
				if (!address) return ''
				
				// 匹配常见的省份名称
				const provinces = [
					'北京', '天津', '上海', '重庆',
					'河北', '山西', '辽宁', '吉林', '黑龙江',
					'江苏', '浙江', '安徽', '福建', '江西', '山东',
					'河南', '湖北', '湖南', '广东', '海南',
					'四川', '贵州', '云南', '陕西', '甘肃', '青海',
					'台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆'
				]
				
				for (let province of provinces) {
					if (address.includes(province)) {
						return province
					}
				}
				
				return ''
			},
			
			// 从地址中提取城市
			extractCity(address) {
				if (!address) return ''
				
				// 简单的城市提取：去掉省份后的部分
				const province = this.extractProvince(address)
				if (province) {
					return address.replace(province, '').trim()
				}
				
				return address
			},
			
			// 显示省份详情
			showProvinceDetail(province) {
				uni.showModal({
					title: province.name,
					content: `共参加 ${province.count} 场\n去过：${province.cities.join('、')}`,
					showCancel: false
				})
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx 30rpx;
}

.login-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	font-size: 28rpx;
	color: #999;
}

.content-box {
	padding-bottom: 40rpx;
}

// 统计信息
.stats-box {
	display: flex;
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.stat-item {
		flex: 1;
		text-align: center;
		
		&:not(:last-child) {
			border-right: 1rpx solid #f0f0f0;
		}
		
		.stat-value {
			font-size: 56rpx;
			font-weight: bold;
			color: #c62828;
			margin-bottom: 12rpx;
		}
		
		.stat-label {
			font-size: 26rpx;
			color: #666;
		}
	}
}

// 省份列表
.province-list {
	.list-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 24rpx;
		padding-left: 12rpx;
		border-left: 6rpx solid #c62828;
	}
	
	.province-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		
		&:active {
			background: #f5f5f5;
		}
		
		.province-info {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16rpx;
			
			.province-name {
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
			}
			
			.province-count {
				font-size: 28rpx;
				color: #c62828;
				font-weight: 500;
			}
		}
		
		.province-cities {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;
			
			.city-tag {
				background: #fff8e1;
				color: #666;
				font-size: 24rpx;
				padding: 8rpx 16rpx;
				border-radius: 8rpx;
			}
		}
	}
	
	.empty-box {
		text-align: center;
		padding: 100rpx 0;
		
		.empty-icon {
			font-size: 100rpx;
			margin-bottom: 24rpx;
		}
		
		.empty-text {
			font-size: 28rpx;
			color: #999;
			display: block;
			margin-bottom: 12rpx;
		}
		
		.empty-desc {
			font-size: 24rpx;
			color: #bbb;
			display: block;
		}
	}
}

// 加载中
.loading-box {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 30rpx 50rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}
</style>
