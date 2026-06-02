<template>
	<view class="page-container">
		<!-- 未登录状态 -->
		<view class="login-box" v-if="!userInfo._id">
			<view class="login-content">
				<view class="login-avatar"></view>
				<view class="login-title">登录后查看见面记录</view>
				<button class="login-btn" @click="getUserInfo">立即登录</button>
			</view>
		</view>
		
		<!-- 已登录状态 -->
		<view class="content-box" v-else>
			<!-- 类型切换 -->
			<view class="type-tabs">
				<view 
					class="tab-item" 
					:class="{active: currentType === '演唱会'}"
					@click="switchType('演唱会')"
				>
					演唱会
				</view>
				<view 
					class="tab-item" 
					:class="{active: currentType === '音乐节'}"
					@click="switchType('音乐节')"
				>
					音乐节/拼盘
				</view>
			</view>
			
			<!-- 搜索框 -->
			<view class="search-box">
				<input 
					class="search-input" 
					v-model="searchKeyword"
					placeholder="快速搜索并添加场次..."
					@confirm="handleSearch"
				/>
			</view>
			
			<!-- 选择主题 -->
			<view class="section-box">
				<view class="section-title">选择主题</view>
				<view class="theme-grid">
					<view 
						class="theme-item"
						v-for="(item, index) in themeList"
						:key="index"
						:class="{selected: selectedTheme === item}"
						@click="selectTheme(item)"
					>
						<view class="theme-name">{{item.ychTheme}}</view>
						<view class="theme-time">{{item.time}}</view>
						<view class="check-icon" v-if="selectedTheme === item">✓</view>
					</view>
				</view>
				<view class="collapse-btn" @click="showAllThemes = !showAllThemes">
					{{showAllThemes ? '收起' : '展开更多'}}
				</view>
			</view>
			
			<!-- 选择场馆 -->
			<view class="section-box">
				<view class="section-title">选择场馆</view>
				<view class="venue-grid">
					<view 
						class="venue-item"
						v-for="(item, index) in venueList"
						:key="index"
						:class="{selected: selectedVenue === item}"
						@click="selectVenue(item)"
					>
						<view class="venue-name">{{item.yhcTheme}}</view>
						<view class="venue-time">{{item.time}}</view>
						<view class="venue-count">{{item.count}} 场演出</view>
						<view class="check-icon" v-if="selectedVenue === item">✓</view>
					</view>
				</view>
			</view>
			
			<!-- 已选演出 -->
			<view class="section-box" v-if="selectedConcerts.length > 0">
				<view class="section-title">已选演出（长按可删除）</view>
				<view 
					class="concert-item"
					v-for="(item, index) in selectedConcerts"
					:key="index"
					@longpress="deleteConcert(item)"
				>
					<view class="concert-dot"></view>
					<view class="concert-info">
						<view class="concert-name">{{item.ychTheme}}</view>
						<view class="concert-detail">{{item.yhcTheme}} - {{item.Session}}</view>
					</view>
				</view>
			</view>
			
			<!-- 添加按钮 -->
			<view class="add-btn" @click="addConcert" v-if="selectedTheme && selectedVenue">
				添加此场次
			</view>
			
			<!-- 我的见面记录 -->
			<view class="section-box" v-if="myConcerts.length > 0">
				<view class="section-title">我的见面记录</view>
				<view 
					class="record-item"
					v-for="(item, index) in myConcerts"
					:key="index"
				>
					<view class="record-dot"></view>
					<view class="record-info">
						<view class="record-name">{{item.Concert.ychTheme}}</view>
						<view class="record-detail">{{item.Concert.yhcTheme}} - {{item.Concert.time}}</view>
					</view>
					<view class="delete-btn" @click="deleteMyConcert(item)">删除</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				userInfo: {},
				currentType: '演唱会',
				searchKeyword: '',
				showAllThemes: false,
				selectedTheme: null,
				selectedVenue: null,
				themeList: [],
				venueList: [],
				selectedConcerts: [],
				myConcerts: []
			}
		},
		onLoad() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.loadData()
				} else {
					this.getUserInfo()
				}
			} else {
				this.getUserInfo()
			}
		},
		onPullDownRefresh() {
			this.loadData()
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
										_this.loadData()
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
			loadData() {
				this.loadConcertList()
				this.loadMyConcerts()
			},
			loadConcertList() {
				uni.showLoading({ title: '加载中' })
				uniCloud.callFunction({
					name: 'concert',
					data: {
						action: 'getList',
						type: this.currentType
					},
					success: (res) => {
						uni.hideLoading()
						uni.stopPullDownRefresh()
						if (res.result.code === 0) {
							this.processConcertData(res.result.data)
						}
					},
					fail: (err) => {
						uni.hideLoading()
						uni.stopPullDownRefresh()
						console.error('加载演唱会列表失败', err)
					}
				})
			},
			processConcertData(data) {
				// 按主题分组
				const themeMap = {}
				data.forEach(item => {
					const key = item.ychTheme
					if (!themeMap[key]) {
						themeMap[key] = item
					}
				})
				this.themeList = Object.values(themeMap)
				
				// 按场馆分组
				const venueMap = {}
				data.forEach(item => {
					const key = item.yhcTheme
					if (!venueMap[key]) {
						venueMap[key] = {
							...item,
							count: 1
						}
					} else {
						venueMap[key].count++
					}
				})
				this.venueList = Object.values(venueMap)
			},
			loadMyConcerts() {
				uniCloud.callFunction({
					name: 'concert',
					data: {
						action: 'getMyConcerts',
						userId: this.userInfo._id,
						meetType: '单人'
					},
					success: (res) => {
						if (res.result.code === 0) {
							this.myConcerts = res.result.data || []
						}
					}
				})
			},
			switchType(type) {
				this.currentType = type
				this.selectedTheme = null
				this.selectedVenue = null
				this.loadData()
			},
			handleSearch() {
				if (!this.searchKeyword) return
				// TODO: 实现搜索功能
				uni.showToast({
					title: '搜索功能开发中',
					icon: 'none'
				})
			},
			selectTheme(item) {
				this.selectedTheme = item
			},
			selectVenue(item) {
				this.selectedVenue = item
			},
			addConcert() {
				if (!this.selectedTheme || !this.selectedVenue) {
					uni.showToast({
						title: '请选择主题和场馆',
						icon: 'none'
					})
					return
				}
				
				uni.showLoading({ title: '添加中' })
				uniCloud.callFunction({
					name: 'concert',
					data: {
						action: 'addMyConcert',
						userId: this.userInfo._id,
						ConcertId: this.selectedTheme._id,
						meetType: '单人'
					},
					success: (res) => {
						uni.hideLoading()
						if (res.result.code === 0) {
							uni.showToast({
								title: '添加成功',
								icon: 'success'
							})
							this.selectedTheme = null
							this.selectedVenue = null
							this.loadMyConcerts()
						} else {
							uni.showToast({
								title: res.result.message || '添加失败',
								icon: 'none'
							})
						}
					},
					fail: (err) => {
						uni.hideLoading()
						uni.showToast({
							title: '添加失败',
							icon: 'none'
						})
					}
				})
			},
			deleteConcert(item) {
				uni.showModal({
					title: '提示',
					content: '确认删除此演出记录？',
					success: (res) => {
						if (res.confirm) {
							// TODO: 删除逻辑
						}
					}
				})
			},
			deleteMyConcert(item) {
				uni.showModal({
					title: '提示',
					content: '确认删除此记录？',
					success: (res) => {
						if (res.confirm) {
							uni.showLoading({ title: '删除中' })
							uniCloud.callFunction({
								name: 'concert',
								data: {
									action: 'deleteMyConcert',
									id: item._id
								},
								success: (res) => {
									uni.hideLoading()
									if (res.result.code === 0) {
										uni.showToast({
											title: '删除成功',
											icon: 'success'
										})
										this.loadMyConcerts()
									}
								},
								fail: (err) => {
									uni.hideLoading()
									console.error('删除失败', err)
								}
							})
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
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
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
			width: 120rpx;
			height: 120rpx;
			border-radius: 50%;
			background: linear-gradient(135deg, #ff6b9d 0%, #c62828 100%);
			margin: 0 auto 32rpx;
		}
		
		.login-title {
			font-size: 32rpx;
			font-weight: bold;
			color: #333;
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

// 内容区域
.content-box {
	padding: 20rpx 30rpx 40rpx;
}

// 类型切换
.type-tabs {
	display: flex;
	background: #fff;
	border-radius: 16rpx;
	padding: 8rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.tab-item {
		flex: 1;
		text-align: center;
		padding: 20rpx;
		border-radius: 12rpx;
		font-size: 28rpx;
		color: #666;
		transition: all 0.3s;
		
		&.active {
			background: linear-gradient(135deg, #ff6b9d 0%, #c62828 100%);
			color: #fff;
			font-weight: 500;
		}
	}
}

// 搜索框
.search-box {
	background: #fff;
	border-radius: 16rpx;
	padding: 20rpx 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.search-input {
		font-size: 28rpx;
		color: #333;
	}
}

// 区块
.section-box {
	background: #fff;
	border-radius: 24rpx;
	padding: 32rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 24rpx;
		position: relative;
		padding-left: 24rpx;
		
		&::before {
			content: '';
			position: absolute;
			left: 0;
			top: 50%;
			transform: translateY(-50%);
			width: 6rpx;
			height: 28rpx;
			background: #c62828;
			border-radius: 3rpx;
		}
	}
}

// 主题网格
.theme-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16rpx;
	
	.theme-item {
		background: #f5f5f5;
		border-radius: 16rpx;
		padding: 24rpx;
		position: relative;
		transition: all 0.3s;
		
		&.selected {
			background: linear-gradient(135deg, #fff0f3 0%, #ffe0e6 100%);
			border: 2rpx solid #c62828;
		}
		
		.theme-name {
			font-size: 28rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 8rpx;
		}
		
		.theme-time {
			font-size: 22rpx;
			color: #999;
		}
		
		.check-icon {
			position: absolute;
			top: 12rpx;
			right: 12rpx;
			width: 36rpx;
			height: 36rpx;
			background: #c62828;
			color: #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 24rpx;
		}
	}
}

.collapse-btn {
	text-align: center;
	padding: 20rpx;
	color: #c62828;
	font-size: 26rpx;
}

// 场馆网格
.venue-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 16rpx;
	
	.venue-item {
		background: #f5f5f5;
		border-radius: 16rpx;
		padding: 24rpx;
		position: relative;
		transition: all 0.3s;
		
		&.selected {
			background: linear-gradient(135deg, #fff0f3 0%, #ffe0e6 100%);
			border: 2rpx solid #c62828;
		}
		
		.venue-name {
			font-size: 26rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 8rpx;
			line-height: 1.4;
		}
		
		.venue-time {
			font-size: 22rpx;
			color: #999;
			margin-bottom: 4rpx;
		}
		
		.venue-count {
			font-size: 22rpx;
			color: #c62828;
		}
		
		.check-icon {
			position: absolute;
			top: 12rpx;
			right: 12rpx;
			width: 36rpx;
			height: 36rpx;
			background: #c62828;
			color: #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 24rpx;
		}
	}
}

// 已选演出
.concert-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
	
	&:last-child {
		border-bottom: none;
	}
	
	.concert-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #c62828;
		margin-right: 16rpx;
		flex-shrink: 0;
	}
	
	.concert-info {
		flex: 1;
		
		.concert-name {
			font-size: 28rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 8rpx;
		}
		
		.concert-detail {
			font-size: 24rpx;
			color: #999;
		}
	}
}

// 添加按钮
.add-btn {
	background: linear-gradient(135deg, #c62828 0%, #d32f2f 100%);
	color: #fff;
	border-radius: 44rpx;
	padding: 28rpx;
	text-align: center;
	font-size: 32rpx;
	font-weight: 500;
	margin: 20rpx 0;
	box-shadow: 0 8rpx 24rpx rgba(198, 40, 40, 0.3);
}

// 我的记录
.record-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
	
	&:last-child {
		border-bottom: none;
	}
	
	.record-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #c62828;
		margin-right: 16rpx;
		flex-shrink: 0;
	}
	
	.record-info {
		flex: 1;
		
		.record-name {
			font-size: 28rpx;
			font-weight: 500;
			color: #333;
			margin-bottom: 8rpx;
		}
		
		.record-detail {
			font-size: 24rpx;
			color: #999;
		}
	}
	
	.delete-btn {
		font-size: 24rpx;
		color: #ff6b6b;
		padding: 8rpx 16rpx;
		background: rgba(255, 107, 107, 0.1);
		border-radius: 12rpx;
	}
}
</style>
