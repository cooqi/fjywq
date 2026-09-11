<template>
	<view class="page-container">
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading">
			<text>加载中...</text>
		</view>
		
		<!-- 详情内容 -->
		<view class="detail-box" v-else-if="concert">
			<!-- 类型标签 -->
			<view class="type-header">
				<view class="type-tag" :class="getTypeClass(concert.type)">{{concert.type || '演唱会'}}</view>
			</view>
			
			<!-- 信息卡片 -->
			<view class="info-card">
				<view class="card-row">
					<text class="card-label">主题</text>
					<text class="card-value">{{concert.ychTheme || '未设置'}}</text>
				</view>
				<view class="card-row">
					<text class="card-label">场馆</text>
					<text class="card-value">{{concert.yhcTheme || '未设置'}}</text>
				</view>
				<view class="card-row">
					<text class="card-label">场次</text>
					<text class="card-value">{{concert.Session || '未设置'}}</text>
				</view>
				<view class="card-row">
					<text class="card-label">时间</text>
					<text class="card-value">{{concert.time || '未设置'}}</text>
				</view>
				<view class="card-row">
					<text class="card-label">省份</text>
					<text class="card-value">{{concert.Province || '未设置'}}</text>
				</view>
				<view class="card-row">
					<text class="card-label">地址</text>
					<text class="card-value">{{concert.address || '未设置'}}</text>
				</view>
				<view class="card-row" v-if="concert.playlist">
					<text class="card-label">歌单</text>
					<text class="card-value playlist">{{concert.playlist}}</text>
				</view>
				<view class="card-row" v-if="concert.bz">
					<text class="card-label">备注</text>
					<text class="card-value">{{concert.bz}}</text>
				</view>
			</view>
			
			
		</view>
		
		<!-- 空状态 -->
		<view class="empty-box" v-else>
			<text>未找到该记录</text>
		</view>
	</view>
</template>

<script>
import { hasCalendarPermission } from '@/common/js/permission.js'
export default {
	data() {
		return {
			loading: true,
			concert: null,
			userInfo: {},
			canEditCalendar: false
		}
	},
	onLoad(options) {
		try {
			const userInfo = uni.getStorageSync('userInfo')
			this.userInfo = JSON.parse(userInfo)
			this.canEditCalendar = hasCalendarPermission(this.userInfo, 'add') || hasCalendarPermission(this.userInfo, 'edit')
		} catch (e) {}
		
		if (options.id) {
			this.loadDetail(options.id)
		} else {
			this.loading = false
		}
	},
	methods: {
		// 加载详情
		loadDetail(id) {
			this.loading = true
			uniCloud.callFunction({
				name: 'concert-admin',
				data: {
					action: 'getList',
					page: 1,
					pageSize: 100
				},
				success: (res) => {
					this.loading = false
					if (res.result.code === 0) {
						const list = res.result.data.list || []
						const idx = list.findIndex(item => item._id === id)
						if (idx > -1) {
							this.concert = list[idx]
						}
					}
				},
				fail: (err) => {
					this.loading = false
					console.error('加载失败', err)
				}
			})
		},
		
		// 获取类型样式类名
		getTypeClass(type) {
			const typeMap = {
				'演唱会': 'type-concert',
				'音乐节': 'type-festival',
				'见面会': 'type-meet',
				'其他': 'type-other'
			}
			return typeMap[type] || 'type-other'
		},
		
		// 编辑
		editConcert() {
			if (!this.concert) return
			// 跳转到管理页面进行编辑（通过全局事件或URL参数传递）
			uni.navigateTo({
				url: '/pages/concert/admin?editId=' + this.concert._id
			})
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 30rpx;
}

.loading-box, .empty-box {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	color: #999;
	font-size: 28rpx;
}

// 类型标签头部
.type-header {
	margin-bottom: 24rpx;
	
	.type-tag {
		display: inline-block;
		padding: 10rpx 28rpx;
		border-radius: 24rpx;
		font-size: 28rpx;
		font-weight: 500;
		
		&.type-concert {
			background: #ffe0e6;
			color: #c62828;
		}
		&.type-festival {
			background: #e8f5e9;
			color: #2e7d32;
		}
		&.type-meet {
			background: #e3f2fd;
			color: #1565c0;
		}
		&.type-other {
			background: #fff3e0;
			color: #e65100;
		}
	}
}

// 信息卡片
.info-card {
	background: #fff;
	border-radius: 20rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	
	.card-row {
		display: flex;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
		
		&:last-child {
			border-bottom: none;
		}
		
		.card-label {
			font-size: 28rpx;
			color: #999;
			width: 140rpx;
			flex-shrink: 0;
		}
		
		.card-value {
			flex: 1;
			font-size: 28rpx;
			color: #333;
			word-break: break-all;
			
			&.playlist {
				white-space: pre-wrap;
				line-height: 1.6;
			}
		}
	}
}

// 操作按钮
.action-btns {
	margin-top: 40rpx;
	
	.edit-btn {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
		color: #fff;
		border-radius: 44rpx;
		font-size: 32rpx;
		border: none;
		box-shadow: 0 8rpx 24rpx rgba(33, 150, 243, 0.3);
	}
}
</style>
