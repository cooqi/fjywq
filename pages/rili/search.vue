<template>
	<view class="page-container">
		<!-- 搜索区域 -->
		<view class="search-section">
			<view class="search-input-wrapper">
				<uni-icons type="search" size="18" color="#999"></uni-icons>
				<input 
					class="search-input" 
					v-model="searchParams.keyword" 
					placeholder="搜索标题或备注"
					@confirm="handleSearch"
				/>
				<view v-if="searchParams.keyword" class="clear-btn" @click="clearKeyword">
					<uni-icons type="closeempty" size="14" color="#999"></uni-icons>
				</view>
			</view>
			
			<view class="date-picker-wrapper">
				<uni-datetime-picker 
					type="date" 
					v-model="searchParams.date"
					placeholder="选择日期"
					@change="handleDateChange"
                    
				/>
			</view>
			
			<view class="search-btn" @click="handleSearch">
				<text>搜索</text>
			</view>
		</view>
		
		<!-- 搜索结果 -->
		<view class="result-section">
			<view v-if="loading" class="loading">
				<text>搜索中...</text>
			</view>
			
			<view v-else-if="searchResults.length > 0" class="result-list">
                <view>共 {{ searchResults.length }} 个结果</view>
				<view v-for="item in searchResults" :key="item._id" class="result-card">
					<view class="card-header">
						<text class="date">{{ item.date }}</text>
						<text v-if="item.distanceInfo && item.distanceInfo.displayText" class="distance">{{ item.distanceInfo.displayText }}</text>
					</view>
					<view class="card-title">{{ item.title }}</view>
					<view v-if="item.bz" class="card-bz" v-html="item.bz"></view>
					<view v-if="item.imgurl" class="card-images">
						<image 
							v-for="(img, index) in item.imgurl.split(';')" 
							:key="index" 
							class="img" 
							:src="img" 
							mode="aspectFill"
							@click="previewImage(item.imgurl, index)"
						></image>
					</view>
				</view>
			</view>
			
			<view v-else-if="hasSearched" class="empty-result">
				<text>未找到相关结果</text>
			</view>
			
			<view v-else class="empty-tip">
				<text>输入关键词或选择日期进行搜索</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { processJQLResults } from '../rili/rili.js'
	
	export default {
		data() {
			return {
				searchParams: {
					keyword: '',
					date: ''
				},
				searchResults: [],
				loading: false,
				hasSearched: false
			}
		},
		methods: {
			handleDateChange(e) {
				// 将日期格式从 2025-05-05 转换为 2025-5-5
				if (e) {
					const dateObj = new Date(e.replace(/-/g, '/'))
					const year = dateObj.getFullYear()
					const month = dateObj.getMonth() + 1
					const day = dateObj.getDate()
					this.searchParams.date = `${year}-${month}-${day}`
				} else {
					this.searchParams.date = ''
				}
			},
			clearKeyword() {
				this.searchParams.keyword = ''
			},
			handleSearch() {
				const { keyword, date } = this.searchParams
				
				if (!keyword && !date) {
					uni.showToast({
						title: '请输入搜索条件',
						icon: 'none'
					})
					return
				}
				
				this.loading = true
				this.hasSearched = true
				this.searchResults =[]
				uniCloud.callFunction({
					name: 'rili-get',
					data: {
						search: {
							keyword: keyword.trim(),
							date: date
						}
					}
				}).then((res) => {
					this.loading = false
					const data = res.result.data || []
					this.searchResults = processJQLResults(data)
				}).catch((err) => {
					this.loading = false
					uni.showModal({
						content: `搜索失败：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			previewImage(imgs, i) {
				const urls = imgs.split(';') || []
				uni.previewImage({
					urls,
					current: i,
					longPressActions: {
						itemList: ['发送给朋友', '保存图片', '收藏'],
						success: function(data) {
							console.log('选中了第' + (data.tapIndex + 1) + '个按钮,第' + (data.index + 1) + '张图片')
						},
						fail: function(err) {
							console.log(err.errMsg)
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #8bf5ee 0%, #b075e7 100%);
	padding: 20rpx;
}

.search-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 24rpx;
	padding: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	
	.search-input-wrapper {
		display: flex;
		align-items: center;
		background: #f5f5f5;
		border-radius: 12rpx;
		padding: 16rpx 20rpx;
		margin-bottom: 20rpx;
		
		.search-input {
			flex: 1;
			font-size: 28rpx;
			margin-left: 12rpx;
		}
		
		.clear-btn {
			padding: 8rpx;
		}
	}
	
	.date-picker-wrapper {
		margin-bottom: 20rpx;
	}
	
	.search-btn {
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		color: #fff;
		text-align: center;
		padding: 20rpx;
		border-radius: 12rpx;
		font-size: 28rpx;
		font-weight: 600;
		box-shadow: 0 4rpx 12rpx rgba(139, 92, 246, 0.3);
		
		&:active {
			opacity: 0.8;
		}
	}
}

.result-section {
	.loading, .empty-result, .empty-tip {
		text-align: center;
		padding: 80rpx 0;
		color: #fff;
		font-size: 28rpx;
	}
	
	.result-list {
		.result-card {
			background: rgba(255, 255, 255, 0.95);
			border-radius: 16rpx;
			padding: 24rpx;
			margin-bottom: 20rpx;
			box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
			
			.card-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16rpx;
				
				.date {
					font-size: 26rpx;
					color: #8b5cf6;
					font-weight: 600;
				}
				
				.distance {
					font-size: 24rpx;
					color: #eff179;
				}
			}
			
			.card-title {
				font-size: 32rpx;
				font-weight: 600;
				color: #333;
				margin-bottom: 12rpx;
			}
			
			.card-bz {
				font-size: 28rpx;
				color: #666;
				line-height: 1.6;
				margin-bottom: 12rpx;
			}
			
			.card-images {
				display: flex;
				flex-wrap: wrap;
				
				.img {
					width: 100rpx;
					height: 100rpx;
					margin: 8rpx;
					border-radius: 8rpx;
				}
			}
		}
	}
}
</style>
