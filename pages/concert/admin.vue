<template>
	<view class="page-container">
		<!-- 操作按钮区 -->
		<view class="action-box">
			<button class="add-btn" @click="showAddDialog">+ 添加演唱会/音乐节</button>
		</view>
		
		<!-- 筛选区 -->
		<view class="filter-box">
			<view class="filter-item">
				<text>类型：</text>
				<picker @change="onTypeChange" :value="typeIndex" :range="typeList" range-key="label">
					<view class="picker">{{typeList[typeIndex].label}}</view>
				</picker>
			</view>
			<view class="search-box">
				<input 
					class="search-input" 
					v-model="searchKeyword"
					placeholder="搜索主题/场馆/地址"
					@confirm="handleSearch"
				/>
				<view class="search-btn" @click="handleSearch">搜索</view>
			</view>
		</view>
		
		<!-- 列表区 -->
		<view class="list-box">
			<view class="list-header">
				<text class="count">共 {{totalCount}} 条记录</text>
			</view>
			
			<view 
				class="concert-item"
				v-for="item in concertList"
				:key="item._id"
			>
				<view class="item-header">
					<view class="item-type" :class="getTypeClass(item.type)">{{item.type}}</view>
					<view class="item-actions">
						<view class="action-btn edit" @click="editConcert(item)">编辑</view>
						<view class="action-btn delete" @click="deleteConcert(item)">删除</view>
					</view>
				</view>
				
				<view class="item-content">
					<view class="item-row">
						<text class="label">主题：</text>
						<text class="value">{{item.ychTheme || '未设置'}}</text>
					</view>
					<view class="item-row">
						<text class="label">场馆：</text>
						<text class="value">{{item.yhcTheme || '未设置'}}</text>
					</view>
					<view class="item-row">
						<text class="label">场次：</text>
						<text class="value">{{item.Session || '未设置'}}</text>
					</view>
					<view class="item-row">
						<text class="label">时间：</text>
						<text class="value">{{item.time || '未设置'}}</text>
					</view>
					<view class="item-row">
						<text class="label">地址：</text>
						<text class="value">{{item.address || '未设置'}}</text>
					</view>
					<view class="item-row" v-if="item.playlist">
						<text class="label">歌单：</text>
						<text class="value">{{item.playlist}}</text>
					</view>
					<view class="item-row" v-if="item.bz">
						<text class="label">备注：</text>
						<text class="value">{{item.bz}}</text>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-box" v-if="concertList.length === 0 && !loading">
				<text class="empty-text">暂无数据</text>
			</view>
			
			<!-- 加载更多 -->
			<view class="load-more" v-if="hasMore && concertList.length > 0">
				<text @click="loadMore">加载更多</text>
			</view>
		</view>
		
		<!-- 添加/编辑弹窗 -->
		<uni-popup ref="popup" type="center">
			<view class="dialog-box">
				<view class="dialog-title">{{editMode ? '编辑' : '添加'}}演唱会/音乐节</view>
				
				<view class="form-box">
					<view class="form-item">
						<text class="form-label">类型 <text class="required">*</text></text>
						<picker @change="onFormTypeChange" :value="formTypeIndex" :range="typeList" range-key="label">
							<view class="form-picker">{{typeList[formTypeIndex].label}}</view>
						</picker>
					</view>
					
					<view class="form-item">
						<text class="form-label">主题</text>
						<input class="form-input" v-model="formData.ychTheme" placeholder="请输入演唱会主题" />
					</view>
					
					<view class="form-item">
						<text class="form-label">场馆</text>
						<input class="form-input" v-model="formData.yhcTheme" placeholder="请输入演唱会场馆" />
					</view>
					
					<view class="form-item">
						<text class="form-label">场次</text>
						<input class="form-input" v-model="formData.Session" placeholder="例如：D1、D2" />
					</view>
					
					<view class="form-item">
						<text class="form-label">时间</text>
						<uni-datetime-picker 
							type="datetime" 
							v-model="formData.time"
							placeholder="请选择时间"
						/>
					</view>
					
					<view class="form-item">
						<text class="form-label">省份 <text class="required">*</text></text>
						<picker @change="onProvinceChange" :value="provinceIndex" :range="provinceList">
							<view class="form-picker">{{provinceList[provinceIndex] || '请选择省份'}}</view>
						</picker>
					</view>
                    <view class="form-item">
						<text class="form-label">详细地址</text>
						<input class="form-input" v-model="formData.address" placeholder="请输入详细地址" />
					</view>
					
					<view class="form-item">
						<text class="form-label">歌单</text>
						<textarea class="form-textarea" v-model="formData.playlist" placeholder="请输入歌单内容" />
					</view>
					
					<view class="form-item">
						<text class="form-label">备注</text>
						<textarea class="form-textarea" v-model="formData.bz" placeholder="请输入备注信息" />
					</view>
				</view>
				
				<view class="dialog-actions">
					<button class="cancel-btn" @click="closeDialog">取消</button>
					<button class="submit-btn" @click="submitForm">保存</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				loading: false,
				searchKeyword: '',
				typeIndex: 0,
				typeList: [
					{ label: '全部', value: 'all' },
					{ label: '演唱会', value: '演唱会' },
					{ label: '音乐节', value: '音乐节' },
					{ label: '其他', value: '其他' }
				],
				provinceList: [
					'北京', '天津', '上海', '重庆',
					'河北', '山西', '辽宁', '吉林', '黑龙江',
					'江苏', '浙江', '安徽', '福建', '江西', '山东',
					'河南', '湖北', '湖南', '广东', '海南',
					'四川', '贵州', '云南', '陕西', '甘肃', '青海',
					'台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆'
				],
				provinceIndex: -1,
				concertList: [],
				totalCount: 0,
				page: 1,
				pageSize: 20,
				hasMore: true,
				
				// 表单相关
				editMode: false,
				formTypeIndex: 1,
				formData: {
					_id: '',
					type: '演唱会',
					ychTheme: '',
					yhcTheme: '',
					Session: '',
					time: '',
					Province: '',
					address: '',
					playlist: '',
					bz: ''
				}
			}
		},
		onLoad() {
			this.loadData()
		},
		onPullDownRefresh() {
			this.page = 1
			this.loadData(true)
		},
		methods: {
			// 加载数据
			loadData(isRefresh = false) {
				if (this.loading) return
				
				this.loading = true
				if (isRefresh) {
					uni.showLoading({ title: '刷新中' })
				}
				
				const query = {}
				if (this.typeIndex > 0) {
					query.type = this.typeList[this.typeIndex].value
				}
				if (this.searchKeyword) {
					query.keyword = this.searchKeyword
				}
				
				uniCloud.callFunction({
					name: 'concert-admin',
					data: {
						action: 'getList',
						...query,
						page: this.page,
						pageSize: this.pageSize
					},
					success: (res) => {
						this.loading = false
						uni.hideLoading()
						uni.stopPullDownRefresh()
						
						if (res.result.code === 0) {
							if (isRefresh || this.page === 1) {
								this.concertList = res.result.data.list || []
							} else {
								this.concertList = [...this.concertList, ...(res.result.data.list || [])]
							}
							this.totalCount = res.result.data.total || 0
							this.hasMore = this.concertList.length < this.totalCount
						} else {
							uni.showToast({
								title: res.result.message || '加载失败',
								icon: 'none'
							})
						}
					},
					fail: (err) => {
						this.loading = false
						uni.hideLoading()
						uni.stopPullDownRefresh()
						console.error('加载失败', err)
						uni.showToast({
							title: '加载失败',
							icon: 'none'
						})
					}
				})
			},
			
			// 加载更多
			loadMore() {
				this.page++
				this.loadData()
			},
			
			// 类型筛选
			onTypeChange(e) {
				this.typeIndex = e.detail.value
				this.page = 1
				this.loadData(true)
			},
			
			// 省份选择变化
			onProvinceChange(e) {
				this.provinceIndex = e.detail.value
				this.formData.Province = this.provinceList[this.provinceIndex] || ''
			},
			
			// 搜索
			handleSearch() {
				this.page = 1
				this.loadData(true)
			},
			
			// 显示添加弹窗
			showAddDialog() {
				this.editMode = false
				this.formData = {
					_id: '',
					type: '演唱会',
					ychTheme: '',
					yhcTheme: '',
					Session: '',
					time: '',
					Province: '',
					address: '',
					playlist: '',
					bz: ''
				}
				this.formTypeIndex = 1
				this.provinceIndex = -1
				this.$refs.popup.open()
			},
			
			// 编辑
			editConcert(item) {
				this.editMode = true
				this.formData = {
					_id: item._id,
					type: item.type || '演唱会',
					ychTheme: item.ychTheme || '',
					yhcTheme: item.yhcTheme || '',
					Session: item.Session || '',
					time: item.time || '',
					Province: item.Province || '',
					address: item.address || '',
					playlist: item.playlist || '',
					bz: item.bz || ''
				}
				
				// 设置类型索引
				const index = this.typeList.findIndex(t => t.value === this.formData.type)
				this.formTypeIndex = index > -1 ? index : 1
				
				// 设置省份索引
				if (item.Province) {
					const provinceIndex = this.provinceList.indexOf(item.Province)
					this.provinceIndex = provinceIndex !== -1 ? provinceIndex : -1
				} else {
					this.provinceIndex = -1
				}
				
				this.$refs.popup.open()
			},
			
			// 删除
			deleteConcert(item) {
				uni.showModal({
					title: '确认删除',
					content: `确定要删除"${item.ychTheme || item.type}"吗？`,
					success: (res) => {
						if (res.confirm) {
							uni.showLoading({ title: '删除中' })
							uniCloud.callFunction({
								name: 'concert-admin',
								data: {
									action: 'delete',
									id: item._id
								},
								success: (res) => {
									uni.hideLoading()
									if (res.result.code === 0) {
										uni.showToast({
											title: '删除成功',
											icon: 'success'
										})
										this.page = 1
										this.loadData(true)
									} else {
										uni.showToast({
											title: res.result.message || '删除失败',
											icon: 'none'
										})
									}
								},
								fail: (err) => {
									uni.hideLoading()
									console.error('删除失败', err)
									uni.showToast({
										title: '删除失败',
										icon: 'none'
									})
								}
							})
						}
					}
				})
			},
			
			// 表单类型变化
			onFormTypeChange(e) {
				this.formTypeIndex = e.detail.value
				this.formData.type = this.typeList[this.formTypeIndex].value
			},
			
			// 提交表单
			submitForm() {
				if (!this.formData.type) {
					uni.showToast({
						title: '请选择类型',
						icon: 'none'
					})
					return
				}
				
				uni.showLoading({ title: '保存中' })
				
				const action = this.editMode ? 'update' : 'add'
				
				uniCloud.callFunction({
					name: 'concert-admin',
					data: {
						action: action,
						data: this.formData
					},
					success: (res) => {
						uni.hideLoading()
						if (res.result.code === 0) {
							uni.showToast({
								title: this.editMode ? '更新成功' : '添加成功',
								icon: 'success'
							})
							this.closeDialog()
							this.page = 1
							this.loadData(true)
						} else {
							uni.showToast({
								title: res.result.message || '保存失败',
								icon: 'none'
							})
						}
					},
					fail: (err) => {
						uni.hideLoading()
						console.error('保存失败', err)
						uni.showToast({
							title: '保存失败',
							icon: 'none'
						})
					}
				})
			},
			
			// 获取类型样式类名
			getTypeClass(type) {
				const typeMap = {
					'演唱会': 'type-concert',
					'音乐节': 'type-festival',
					'其他': 'type-other'
				}
				return typeMap[type] || 'type-other'
			},
			
			// 关闭弹窗
			closeDialog() {
				this.$refs.popup.close()
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding-bottom: 40rpx;
}

// 操作按钮区
.action-box {
	padding: 20rpx 30rpx;
	
	.add-btn {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
		color: #fff;
		border-radius: 44rpx;
		font-size: 32rpx;
		font-weight: 500;
		border: none;
		box-shadow: 0 8rpx 24rpx rgba(33, 150, 243, 0.3);
	}
}

// 筛选区
.filter-box {
	background: #fff;
	margin: 0 30rpx 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.filter-item {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
		
		text {
			font-size: 28rpx;
			color: #666;
		}
		
		.picker {
			flex: 1;
			font-size: 28rpx;
			color: #333;
			padding: 16rpx;
			background: #f5f5f5;
			border-radius: 12rpx;
		}
	}
	
	.search-box {
		display: flex;
		align-items: center;
		
		.search-input {
			flex: 1;
			height: 72rpx;
			background: #f5f5f5;
			border-radius: 12rpx 0 0 12rpx;
			padding: 0 24rpx;
			font-size: 28rpx;
		}
		
		.search-btn {
			height: 72rpx;
			padding: 0 32rpx;
			background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
			color: #fff;
			border-radius: 0 12rpx 12rpx 0;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 28rpx;
		}
	}
}

// 列表区
.list-box {
	padding: 0 30rpx;
	
	.list-header {
		margin-bottom: 20rpx;
		
		.count {
			font-size: 26rpx;
			color: #999;
		}
	}
	
	.concert-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		
		.item-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 20rpx;
			padding-bottom: 16rpx;
			border-bottom: 1rpx solid #f0f0f0;
			
			.item-type {
				padding: 8rpx 20rpx;
				border-radius: 20rpx;
				font-size: 24rpx;
				font-weight: 500;
				
				&.type-concert {
					background: #ffe0e6;
					color: #c62828;
				}
							
				&.type-festival {
					background: #e8f5e9;
					color: #2e7d32;
				}
							
				&.type-other {
					background: #fff3e0;
					color: #e65100;
				}
			}
			
			.item-actions {
				display: flex;
				gap: 16rpx;
				
				.action-btn {
					padding: 12rpx 24rpx;
					border-radius: 12rpx;
					font-size: 24rpx;
					
					&.edit {
						background: #e3f2fd;
						color: #1976D2;
					}
					
					&.delete {
						background: #ffebee;
						color: #c62828;
					}
				}
			}
		}
		
		.item-content {
			.item-row {
				display: flex;
				margin-bottom: 12rpx;
				
				&:last-child {
					margin-bottom: 0;
				}
				
				.label {
					font-size: 26rpx;
					color: #666;
					width: 120rpx;
					flex-shrink: 0;
				}
				
				.value {
					flex: 1;
					font-size: 26rpx;
					color: #333;
					word-break: break-all;
				}
			}
		}
	}
	
	.empty-box {
		text-align: center;
		padding: 100rpx 0;
		
		.empty-text {
			font-size: 28rpx;
			color: #999;
		}
	}
	
	.load-more {
		text-align: center;
		padding: 30rpx 0;
		
		text {
			font-size: 28rpx;
			color: #2196F3;
		}
	}
}

// 弹窗
.dialog-box {
	background: #fff;
	border-radius: 24rpx;
	width: 680rpx;
	max-height: 80vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	
	.dialog-title {
		padding: 32rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		text-align: center;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.form-box {
		flex: 1;
		overflow-y: auto;
		padding: 24rpx;
		
		.form-item {
			margin-bottom: 24rpx;
			
			.form-label {
				display: block;
				font-size: 26rpx;
				color: #666;
				margin-bottom: 12rpx;
				
				.required {
					color: #c62828;
				}
			}
			
			.form-picker {
				height: 72rpx;
				line-height: 72rpx;
				background: #f5f5f5;
				border-radius: 12rpx;
				padding: 0 24rpx;
				font-size: 28rpx;
				color: #333;
			}
			
			.form-input {
				height: 72rpx;
				background: #f5f5f5;
				border-radius: 12rpx;
				padding: 0 24rpx;
				font-size: 28rpx;
			}
			
			.form-textarea {
				background: #f5f5f5;
				border-radius: 12rpx;
				padding: 16rpx 24rpx;
				font-size: 28rpx;
				min-height: 150rpx;
			}
		}
	}
	
	.dialog-actions {
		display: flex;
		border-top: 1rpx solid #f0f0f0;
		
		button {
			flex: 1;
			height: 88rpx;
			border: none;
			border-radius: 0;
			font-size: 30rpx;
		}
		
		.cancel-btn {
			background: #f5f5f5;
			color: #666;
		}
		
		.submit-btn {
			background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
			color: #fff;
		}
	}
}
</style>
