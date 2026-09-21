<template>
	<view class="page-container">
		<!-- 操作按钮区 -->
		<view class="action-box" v-if="isAdminUser">
			<button class="add-btn" @click="showAddDialog">+ 添加节日配置</button>
		</view>
		
		<!-- 列表区 -->
		<view class="list-box">
			<view class="list-header">
				<text class="count">共 {{holidayList.length}} 条配置</text>
			</view>
			
			<view class="holiday-item" v-for="item in holidayList" :key="item._id">
				<view class="item-header">
					<view class="item-emoji">{{item.emoji || '🎉'}}</view>
					<view class="item-info">
						<text class="item-name">{{item.name}}</text>
						<text class="item-date">{{getDateText(item)}}</text>
					</view>
					<view class="item-status" :class="{active: item.is_active !== false}">
						{{item.is_active !== false ? '启用' : '禁用'}}
					</view>
				</view>
				<view class="item-preview">
					<text class="preview-label">装饰：</text>
					<text class="preview-emojis">{{item.emojiLeft}} {{item.emojiRight}}</text>
				</view>
				<view class="item-remark" v-if="item.remark">
					<text class="remark-label">备注：</text>
					<text class="remark-text">{{item.remark}}</text>
				</view>
				<view class="item-actions" v-if="isAdminUser">
					<view class="action-btn edit" @click="editHoliday(item)">编辑</view>
					<view class="action-btn toggle" @click="toggleActive(item)">
						{{item.is_active !== false ? '禁用' : '启用'}}
					</view>
					<view class="action-btn delete" @click="deleteHoliday(item)">删除</view>
				</view>
			</view>
			
			<view class="empty-box" v-if="holidayList.length === 0 && !loading">
				<text class="empty-text">暂无节日配置</text>
			</view>
		</view>
		
		<!-- 添加/编辑弹窗 -->
		<uni-popup ref="popup" type="center">
			<view class="dialog-box">
				<view class="dialog-title">{{editMode ? '编辑' : '添加'}}节日配置</view>
				
				<scroll-view scroll-y class="form-box">
					<view class="form-item">
						<text class="form-label">节日名称 <text class="required">*</text></text>
						<input class="form-input" v-model="formData.name" placeholder="如：元旦、春节" />
					</view>
					
					<view class="form-item">
						<text class="form-label">唯一标识 <text class="required">*</text></text>
						<input class="form-input" v-model="formData.key" placeholder="如：newYear、spring-festival" />
					</view>
					
					<view class="form-item">
						<text class="form-label">日期类型</text>
						<picker @change="onDateTypeChange" :value="dateTypeIndex" :range="dateTypeList" range-key="label">
							<view class="form-picker">{{dateTypeList[dateTypeIndex].label}}</view>
						</picker>
					</view>
					
					<!-- 固定日期 -->
					<template v-if="formData.date_type === 'fixed'">
						<view class="form-item">
							<text class="form-label">月份 <text class="required">*</text></text>
							<picker @change="onMonthChange" :value="formData.month - 1" :range="monthList">
								<view class="form-picker">{{monthList[formData.month - 1] || '请选择月份'}}</view>
							</picker>
						</view>
						<view class="form-item">
							<text class="form-label">日期 <text class="required">*</text></text>
							<picker @change="onDayChange" :value="formData.day - 1" :range="dayList">
								<view class="form-picker">{{dayList[formData.day - 1] || '请选择日期'}}</view>
							</picker>
						</view>
					</template>
					
					<!-- 范围日期 -->
					<template v-if="formData.date_type === 'range'">
						<view class="form-item">
							<text class="form-label">年份 <text class="required">*</text></text>
							<input class="form-input" v-model="formData.year" type="number" placeholder="如：2026" />
						</view>
						<view class="form-item">
							<text class="form-label">开始月份</text>
							<picker @change="onStartMonthChange" :value="formData.startMonth - 1" :range="monthList">
								<view class="form-picker">{{monthList[formData.startMonth - 1] || '请选择'}}</view>
							</picker>
						</view>
						<view class="form-item">
							<text class="form-label">开始日期</text>
							<picker @change="onStartDayChange" :value="formData.startDay - 1" :range="dayList">
								<view class="form-picker">{{dayList[formData.startDay - 1] || '请选择'}}</view>
							</picker>
						</view>
						<view class="form-item">
							<text class="form-label">结束月份</text>
							<picker @change="onEndMonthChange" :value="formData.endMonth - 1" :range="monthList">
								<view class="form-picker">{{monthList[formData.endMonth - 1] || '请选择'}}</view>
							</picker>
						</view>
						<view class="form-item">
							<text class="form-label">结束日期</text>
							<picker @change="onEndDayChange" :value="formData.endDay - 1" :range="dayList">
								<view class="form-picker">{{dayList[formData.endDay - 1] || '请选择'}}</view>
							</picker>
						</view>
					</template>
					
					<view class="form-item">
						<text class="form-label">主Emoji</text>
						<input class="form-input" v-model="formData.emoji" placeholder="如：🎆" />
					</view>
					<view class="form-item">
						<text class="form-label">左侧装饰Emoji</text>
						<input class="form-input" v-model="formData.emojiLeft" placeholder="如：🎆" />
					</view>
					<view class="form-item">
						<text class="form-label">右侧装饰Emoji</text>
						<input class="form-input" v-model="formData.emojiRight" placeholder="如：🎇" />
					</view>
					
					<view class="form-item">
						<text class="form-label">背景CSS类名</text>
						<input class="form-input" v-model="formData.containerClass" placeholder="如：theme-new-year" />
					</view>
					<view class="form-item">
						<text class="form-label">横幅背景渐变</text>
						<input class="form-input" v-model="formData.bannerBg" placeholder="如：linear-gradient(135deg, #ff6b6b, #ee5a24)" />
					</view>
					
					<view class="form-item">
						<text class="form-label">飘浮装饰（JSON数组）</text>
						<textarea class="form-textarea" v-model="floatingEmojisStr" :placeholder="emojiPlaceholder" maxlength="9000"/>
						<view class="gen-btn" @click="generateFloatingEmojis">自动生成默认飘浮装饰</view>
					</view>
					
					<view class="form-item">
						<image-upload 
							ref="bgImageUpload"
							title="背景图片" 
							optionalText="（选填）"
							:maxCount="1" 
							uploadPath="holiday-bg" 
							:modelValue="formData.bgImage"
						/>
					</view>
					
					<view class="form-item">
						<text class="form-label">备注</text>
						<textarea class="form-textarea" v-model="formData.remark" placeholder="如：节日来源、特殊说明等" maxlength="500"/>
					</view>
					
					<view class="form-item">
						<text class="form-label">是否启用</text>
						<switch :checked="formData.is_active" @change="onActiveChange" />
					</view>
				</scroll-view>
				
				<view class="dialog-actions">
					<button class="cancel-btn" @click="closeDialog">取消</button>
					<button class="submit-btn" @click="submitForm">保存</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
import { isAdmin } from '@/common/js/permission.js'
import imageUpload from '@/components/image-upload/image-upload.vue'

export default {
	components: {
		imageUpload
	},
	data() {
		return {
			loading: false,
			holidayList: [],
			userInfo: {},
			isAdminUser: false,
			editMode: false,
			dateTypeList: [
				{ label: '固定日期（每年同月同日）', value: 'fixed' },
				{ label: '范围日期（如春节）', value: 'range' }
			],
			dateTypeIndex: 0,
			monthList: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
			dayList: Array.from({length: 31}, (_, i) => (i + 1) + '日'),
			formData: this.getEmptyForm(),
			emojiPlaceholder: '示例: [{emoji:✨, left:10%, top:5%, delay:0s, size:30rpx}]'
		}
	},
	computed: {
		floatingEmojisStr: {
			get() {
				return JSON.stringify(this.formData.floatingEmojis || [], null, 2)
			},
			set(val) {
				try {
					this.formData.floatingEmojis = JSON.parse(val)
				} catch(e) {
					// 输入过程中可能不是合法JSON，暂不处理
				}
			}
		}
	},
	onLoad() {
		this.loadData()
		try {
			const userInfo = uni.getStorageSync('userInfo')
			this.userInfo = JSON.parse(userInfo)
			this.isAdminUser = isAdmin(this.userInfo)
		} catch(e) {}
	},
	onPullDownRefresh() {
		this.loadData(true)
	},
	methods: {
		getEmptyForm() {
			return {
				_id: '',
				name: '',
				key: '',
				date_type: 'fixed',
				month: 1,
				day: 1,
				year: new Date().getFullYear(),
				startMonth: 1,
				startDay: 1,
				endMonth: 1,
				endDay: 1,
				emoji: '',
				emojiLeft: '',
				emojiRight: '',
				containerClass: '',
				bannerBg: '',
				bgImage: '',
				floatingEmojis: [],
				remark: '',
				is_active: true
			}
		},
		getDateText(item) {
			if (item.date_type === 'range') {
				return `${item.year}年 ${item.startMonth}/${item.startDay} - ${item.endMonth}/${item.endDay}`
			}
			return `${item.month}月${item.day}日`
		},
		loadData(isRefresh = false) {
			if (this.loading) return
			this.loading = true
			if (isRefresh) uni.showLoading({ title: '刷新中' })
			
			uniCloud.callFunction({
				name: 'holiday-config',
				data: { action: 'getList' },
				success: (res) => {
					this.loading = false
					uni.hideLoading()
					uni.stopPullDownRefresh()
					if (res.result.code === 0) {
						this.holidayList = res.result.data || []
					} else {
						uni.showToast({ title: res.result.message || '加载失败', icon: 'none' })
					}
				},
				fail: (err) => {
					this.loading = false
					uni.hideLoading()
					uni.stopPullDownRefresh()
					uni.showToast({ title: '加载失败', icon: 'none' })
				}
			})
		},
		showAddDialog() {
			this.editMode = false
			this.formData = this.getEmptyForm()
			this.dateTypeIndex = 0
			this.floatingEmojisStr = '[]'
			this.$nextTick(() => {
				if(this.$refs.bgImageUpload) this.$refs.bgImageUpload.clearImages()
			})
			this.$refs.popup.open()
		},
		editHoliday(item) {
			this.editMode = true
			this.formData = {
				_id: item._id,
				name: item.name || '',
				key: item.key || '',
				date_type: item.date_type || 'fixed',
				month: item.month || 1,
				day: item.day || 1,
				year: item.year || new Date().getFullYear(),
				startMonth: item.startMonth || 1,
				startDay: item.startDay || 1,
				endMonth: item.endMonth || 1,
				endDay: item.endDay || 1,
				emoji: item.emoji || '',
				emojiLeft: item.emojiLeft || '',
				emojiRight: item.emojiRight || '',
				containerClass: item.containerClass || '',
				bannerBg: item.bannerBg || '',
				bgImage: item.bgImage || '',
				floatingEmojis: item.floatingEmojis || [],
				remark: item.remark || '',
				is_active: item.is_active !== false
			}
			this.dateTypeIndex = this.formData.date_type === 'range' ? 1 : 0
			this.floatingEmojisStr = JSON.stringify(this.formData.floatingEmojis, null, 2)
			this.$refs.popup.open()
		},
		deleteHoliday(item) {
			uni.showModal({
				title: '确认删除',
				content: `确定要删除"${item.name}"吗？`,
				success: (res) => {
					if (res.confirm) {
						uni.showLoading({ title: '删除中' })
						uniCloud.callFunction({
							name: 'holiday-config',
							data: { action: 'delete', data: { _id: item._id } },
							success: (res) => {
								uni.hideLoading()
								if (res.result.code === 0) {
									uni.showToast({ title: '删除成功', icon: 'success' })
									this.loadData(true)
								} else {
									uni.showToast({ title: res.result.message || '删除失败', icon: 'none' })
								}
							},
							fail: () => {
								uni.hideLoading()
								uni.showToast({ title: '删除失败', icon: 'none' })
							}
						})
					}
				}
			})
		},
		toggleActive(item) {
			const newActive = item.is_active !== false ? false : true
			uni.showLoading({ title: '处理中' })
			uniCloud.callFunction({
				name: 'holiday-config',
				data: { action: 'update', data: { _id: item._id, is_active: newActive } },
				success: (res) => {
					uni.hideLoading()
					if (res.result.code === 0) {
						uni.showToast({ title: newActive ? '已启用' : '已禁用', icon: 'success' })
						this.loadData(true)
					} else {
						uni.showToast({ title: res.result.message || '操作失败', icon: 'none' })
					}
				},
				fail: () => {
					uni.hideLoading()
					uni.showToast({ title: '操作失败', icon: 'none' })
				}
			})
		},
		async submitForm() {
			if (!this.formData.name) {
				uni.showToast({ title: '请输入节日名称', icon: 'none' })
				return
			}
			if (!this.formData.key) {
				uni.showToast({ title: '请输入唯一标识', icon: 'none' })
				return
			}
			
			// 解析飘浮装饰JSON
			try {
				if (typeof this.floatingEmojisStr === 'string') {
					this.formData.floatingEmojis = JSON.parse(this.floatingEmojisStr)
				}
			} catch(e) {
				uni.showToast({ title: '飘浮装饰JSON格式错误', icon: 'none' })
				return
			}
			
			// 确保数值类型
			this.formData.month = parseInt(this.formData.month)
			this.formData.day = parseInt(this.formData.day)
			this.formData.year = parseInt(this.formData.year)
			this.formData.startMonth = parseInt(this.formData.startMonth)
			this.formData.startDay = parseInt(this.formData.startDay)
			this.formData.endMonth = parseInt(this.formData.endMonth)
			this.formData.endDay = parseInt(this.formData.endDay)
			
			// 处理背景图片上传
			if (this.$refs.bgImageUpload) {
				const bgImgResult = await this.$refs.bgImageUpload.processImages(this.editMode)
				if (bgImgResult === null) return
				if (bgImgResult) {
					this.formData.bgImage = bgImgResult
				}
			}
			
			// 确保_id正确传递
			const submitData = Object.assign({}, this.formData)
			if (!this.editMode) {
				// 新增模式：不传_id，由数据库自动生成
				delete submitData._id
			} else if (!submitData._id) {
				uni.showToast({ title: '缺少记录ID，请重新编辑', icon: 'none' })
				return
			}
			
			uni.showLoading({ title: '保存中' })
			const action = this.editMode ? 'update' : 'add'
			
			uniCloud.callFunction({
				name: 'holiday-config',
				data: { action, data: submitData },
				success: (res) => {
					uni.hideLoading()
					if (res.result.code === 0) {
						uni.showToast({ title: this.editMode ? '更新成功' : '添加成功', icon: 'success' })
						this.closeDialog()
						this.loadData(true)
					} else {
						uni.showToast({ title: res.result.message || '保存失败', icon: 'none' })
					}
				},
				fail: () => {
					uni.hideLoading()
					uni.showToast({ title: '保存失败', icon: 'none' })
				}
			})
		},
		closeDialog() {
			this.$refs.popup.close()
		},
		onDateTypeChange(e) {
			this.dateTypeIndex = e.detail.value
			this.formData.date_type = this.dateTypeList[this.dateTypeIndex].value
		},
		onMonthChange(e) { this.formData.month = parseInt(e.detail.value) + 1 },
		onDayChange(e) { this.formData.day = parseInt(e.detail.value) + 1 },
		onStartMonthChange(e) { this.formData.startMonth = parseInt(e.detail.value) + 1 },
		onStartDayChange(e) { this.formData.startDay = parseInt(e.detail.value) + 1 },
		onEndMonthChange(e) { this.formData.endMonth = parseInt(e.detail.value) + 1 },
		onEndDayChange(e) { this.formData.endDay = parseInt(e.detail.value) + 1 },
		onActiveChange(e) { this.formData.is_active = e.detail.value },
		// 自动生成默认飘浮装饰
		generateFloatingEmojis() {
			const mainEmoji = this.formData.emoji || this.formData.emojiLeft || '✨'
			const leftEmoji = this.formData.emojiLeft || mainEmoji
			const rightEmoji = this.formData.emojiRight || mainEmoji
			const defaults = [
				{ emoji: leftEmoji, left: '8%', top: '5%', delay: '0s', size: '30rpx' },
				{ emoji: mainEmoji, left: '85%', top: '7%', delay: '0.6s', size: '28rpx' },
				{ emoji: rightEmoji, left: '50%', top: '3%', delay: '1s', size: '26rpx' }
			]
			this.formData.floatingEmojis = defaults
			this.floatingEmojisStr = JSON.stringify(defaults, null, 2)
			uni.showToast({ title: '已生成默认飘浮装饰', icon: 'none' })
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

.action-box {
	padding: 20rpx 30rpx;
	.add-btn {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		color: #fff;
		border-radius: 44rpx;
		font-size: 32rpx;
		font-weight: 500;
		border: none;
		box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.3);
	}
}

.list-box {
	padding: 0 30rpx;
	.list-header {
		margin-bottom: 20rpx;
		.count { font-size: 26rpx; color: #999; }
	}
	.holiday-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		
		.item-header {
			display: flex;
			align-items: center;
			margin-bottom: 16rpx;
			
			.item-emoji {
				font-size: 50rpx;
				margin-right: 20rpx;
			}
			.item-info {
				flex: 1;
				.item-name {
					font-size: 32rpx;
					font-weight: 600;
					color: #333;
					display: block;
				}
				.item-date {
					font-size: 24rpx;
					color: #999;
					margin-top: 4rpx;
				}
			}
			.item-status {
				padding: 6rpx 16rpx;
				border-radius: 20rpx;
				font-size: 22rpx;
				&.active {
					background: #e8f5e9;
					color: #2e7d32;
				}
				&:not(.active) {
					background: #ffebee;
					color: #c62828;
				}
			}
		}
		.item-preview {
			padding: 12rpx 0;
			border-top: 1rpx dashed #eee;
			font-size: 26rpx;
			.preview-label { color: #999; }
			.preview-emojis { font-size: 30rpx; margin-left: 8rpx; }
		}
		.item-remark {
			padding: 8rpx 0;
			font-size: 24rpx;
			color: #999;
			.remark-label { color: #aaa; }
			.remark-text { color: #666; margin-left: 4rpx; }
		}
		.item-actions {
			display: flex;
			justify-content: flex-end;
			gap: 16rpx;
			margin-top: 12rpx;
			padding-top: 12rpx;
			border-top: 1rpx solid #f0f0f0;
			
			.action-btn {
				padding: 10rpx 24rpx;
				border-radius: 12rpx;
				font-size: 24rpx;
				&.edit { background: #ede7f6; color: #5e35b1; }
				&.toggle { background: #e3f2fd; color: #1565c0; }
				&.delete { background: #ffebee; color: #c62828; }
			}
		}
	}
	.empty-box {
		text-align: center;
		padding: 100rpx 0;
		.empty-text { font-size: 28rpx; color: #999; }
	}
}

.dialog-box {
	background: #fff;
	border-radius: 24rpx;
	width: 680rpx;
	max-height: 85vh;
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
		max-height: 60vh;
		
		.form-item {
			margin-bottom: 24rpx;
			.form-label {
				display: block;
				font-size: 26rpx;
				color: #666;
				margin-bottom: 12rpx;
				.required { color: #c62828; }
			}
			.form-input {
				height: 72rpx;
				background: #f5f5f5;
				border-radius: 12rpx;
				padding: 0 24rpx;
				font-size: 28rpx;
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
			.form-textarea {
				background: #f5f5f5;
				border-radius: 12rpx;
				padding: 16rpx 24rpx;
				font-size: 24rpx;
				min-height: 200rpx;
				width: 100%;
			}
			.bg-preview {
				width: 100%;
				height: 300rpx;
				border-radius: 12rpx;
				background: #f0f0f0;
			}
			.gen-btn {
				margin-top: 12rpx;
				padding: 12rpx 24rpx;
				background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
				color: #fff;
				border-radius: 8rpx;
				font-size: 24rpx;
				text-align: center;
				display: inline-block;
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
		.cancel-btn { background: #f5f5f5; color: #666; }
		.submit-btn { background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: #fff; }
	}
}
</style>
