<template>
	<view class="content-box">
		<!-- 分类选择 -->
		<view class="section-box">
			<view class="section-title">分类</view>
			<scroll-view scroll-x class="type-scroll">
				<view class="type-item" 
					:class="{active: formData.payType === item, disabled: isEdit}" 
					v-for="(item, index) in typeList" 
					:key="index"
					@click="!isEdit && selectType(item)">
					<view class="type-icon">{{getTypeIcon(item)}}</view>
					<view class="type-name">{{item}}</view>
				</view>
			</scroll-view>
		</view>
		
		<!-- 演唱会/音乐节选择（仅在选择音乐节或演唱会时显示） -->
		<view class="section-box" v-if="formData.payType === '音乐节' || formData.payType === '演唱会'">
			<view class="section-title">选择场次 <text class="required">*</text></view>
			<picker @change="onConcertChange" :value="concertIndex" :range="concertList" range-key="displayName">
				<view class="form-picker">
					{{selectedConcert ? selectedConcert.displayName : '请选择演唱会/音乐节'}}
				</view>
			</picker>
			
			<!-- 显示选中场次的详细信息 -->
			<view class="concert-info" v-if="selectedConcert">
				<view class="info-row" v-if="selectedConcert.ychTheme">
					<text class="info-label">主题：</text>
					<text class="info-value">{{selectedConcert.ychTheme}}</text>
				</view>
				<view class="info-row" v-if="selectedConcert.Session">
					<text class="info-label">场次：</text>
					<text class="info-value">{{selectedConcert.Session}}</text>
				</view>
				<view class="info-row" v-if="selectedConcert.yhcTheme">
					<text class="info-label">场馆：</text>
					<text class="info-value">{{selectedConcert.yhcTheme}}</text>
				</view>
				<view class="info-row">
					<text class="info-label">时间：</text>
					<text class="info-value">{{selectedConcert.time || '未设置'}}</text>
				</view>
				<view class="info-row">
					<text class="info-label">地址：</text>
					<text class="info-value">{{selectedConcert.address || '未设置'}}</text>
				</view>
			</view>
			
			<!-- 是否入场 -->
			<view class="entry-section">
				<view class="section-subtitle">是否有票入场 <text class="required">*</text></view>
				<view class="radio-group">
					<view class="radio-item" :class="{active: formData.isEntry === '1'}" @click="selectEntry('1')">
						<view class="radio-circle"></view>
						<text>有票</text>
					</view>
					<view class="radio-item" :class="{active: formData.isEntry === '0'}" @click="selectEntry('0')">
						<view class="radio-circle"></view>
						<text>外场</text>
					</view>
				</view>
			</view>
			
			<!-- 座位号（选填） -->
			<view class="form-item" v-if="formData.isEntry === '1'">
				<view class="section-subtitle">座位号 <text class="optional">选填</text></view>
				<input class="input" 
					v-model="formData.SeatNumber" 
					placeholder="请输入座位号，如：A区1排5座" />
			</view>
		</view>
		
		<!-- 基本信息（非音乐节/演唱会类型显示） -->
		<view class="section-box" v-if="formData.payType !== '音乐节' && formData.payType !== '演唱会'">
			<view class="section-title">名称</view>
			<input class="input" 
				v-model="formData.payName" 
				:placeholder="getPlaceholder()" />
		</view>
		
		<!-- 金额信息 -->
		<view class="section-box">
			<view class="section-title">金额</view>
			
			<!-- 音乐节/演唱会类型：显示详细的费用明细 -->
			<template v-if="formData.payType === '音乐节' || formData.payType === '演唱会'">
				<view class="amount-item">
					<view class="amount-label">原票价</view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.payPrice" 
						placeholder="0.00"
						@input="calculateTotal" />
				</view>
				<view class="amount-item">
					<view class="amount-label">数量 </view>
					<input class="amount-input" 
						type="number"
						v-model="formData.payNum" 
						placeholder="1"
						@input="calculateTotal" />
				</view>
				<view class="amount-item">
					<view class="amount-label">实付</view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.payPrice" 
						placeholder="0.00" />
				</view>
				<view class="amount-item">
					<view class="amount-label">交通费 <text class="optional">选填</text></view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.TransportationExpenses" 
						placeholder="0.00"
						@input="calculateTotal" />
				</view>
				<view class="amount-item">
					<view class="amount-label">住宿费 <text class="optional">选填</text></view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.HotelExpenses" 
						placeholder="0.00"
						@input="calculateTotal" />
				</view>
				<view class="amount-item">
					<view class="amount-label">其他费用 <text class="optional">选填</text></view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.otherExpenses" 
						placeholder="0.00"
						@input="calculateTotal" />
				</view>
				
			</template>
			
			<!-- 金额信息（非音乐节/演唱会类型显示） -->
			<template v-else>
				<view class="amount-item">
					<view class="amount-label">单价 <text class="optional">选填</text></view>
					<input class="amount-input" 
						type="digit"
						v-model="formData.payPrice" 
						placeholder="0.00"
						@input="calculateTotal" />
				</view>
				<view class="amount-item">
					<view class="amount-label">数量 <text class="optional">选填</text></view>
					<input class="amount-input" 
						type="number"
						v-model="formData.payNum" 
						placeholder="1"
						@input="calculateTotal" />
				</view>
			</template>
			
			<view class="amount-item total">
				<view class="amount-label">总金额</view>
				<view class="total-amount">¥ {{formData.payAmount}}</view>
			</view>
		</view>
		
		<!-- 购买日期 -->
		<view class="section-box">
			<view class="section-title">购买日期</view>
			
			<uni-datetime-picker 
						type="date" 
						v-model="formData.payTime"
						placeholder="请选择标时间"
					/>
		</view>
		
		<!-- 地址（音乐节/演唱会类型，从选择的场次自动填充） -->
		<view class="section-box" v-if="formData.payType === '音乐节' || formData.payType === '演唱会'">
			<view class="section-title">演唱会/音乐节主办地址 <text class="optional">已自动填充</text></view>
			<input class="input" 
				v-model="formData.adress" 
				placeholder="地址将从选择的场次自动填充" 
				disabled />
		</view>
		
		
		
		<!-- 晒单地址 -->
		<view class="section-box">
			<view class="section-title">晒单链接 <text class="optional">选填</text></view>
			<textarea class="textarea" 
				v-model="formData.sdUrl" 
				placeholder="如果你有在其他平台发布一些晒单，可以复制链接记录在这里"
				maxlength="200"></textarea>
		</view>

		<image-upload 
				ref="imageUpload"
				title="订单截图" 
				optionalText="不建议在小程序储存图片，以防丢失" 
				maxCount="1"
				uploadPath="payRecord"
				:modelValue="formData.imgs"
			></image-upload>
		
		<!-- 备注 -->
		<view class="section-box">
			<view class="section-title">备注 <text class="optional">选填</text></view>
			<textarea class="textarea" 
				v-model="formData.bz" 
				placeholder="添加备注..."
				maxlength="200"></textarea>
		</view>
		
		<!-- 操作按钮 -->
		<view class="btn-box">
			<button class="btn-save" @click="saveRecord">{{isEdit ? '更新记录' : '保存记录'}}</button>
			<button class="btn-delete" v-if="isEdit" @click="deleteRecord">删除这条记录</button>
		</view>
		
		
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isEdit: false,
				recordId: '',
				typeList: ['音乐节', '演唱会', '周边', '专辑', '商务', '其他'],
				concertList: [], // 演唱会/音乐节列表
				concertIndex: -1, // 选中的演唱会索引
				selectedConcert: null, // 选中的演唱会对象
				formData: {
					payTime: this.getCurrentDate(),
					payType: '音乐节',
					payName: '',
					payNum: '1',
					payPrice: '',
					TransportationExpenses: '',
					HotelExpenses: '',
					otherExpenses: '',
					payAmount: '',
					bz: '',
					adress: '',
					Province: '',
					imgs: '',
					sdUrl:'',
					concertID:'',
					isEntry: '', // 是否入场：1是/0否
					SeatNumber: '' // 座位号
				},
				
				showDatePicker: false,
				userInfo: {
					_id: ''
				}
			}
		},
		onLoad(options) {
			try {
				const userInfo = uni.getStorageSync('userInfo')
				this.userInfo = JSON.parse(userInfo)
			} catch (e) {
				// error
			}
			
			if (options.id) {
				this.isEdit = true
				this.recordId = options.id
				this.getRecordDetail(options.id)
			} else {
				// 新增模式，加载演唱会/音乐节列表
				this.loadConcertList()
			}
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo');
				console.log('userInfo',userInfo)
				this.userInfo=JSON.parse(userInfo)
				if(!this.userInfo._id){
					//返回
					uni.navigateBack()
				}
		
		},
		watch: {
			showDatePicker(newVal) {
				if (newVal) {
					this.$refs.datetimePicker.show()
				}
			}
		},
		methods: {
			
			getCurrentDate() {
				const date = new Date()
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${year}-${month}-${day}`
			},
			getTypeIcon(type) {
				const iconMap = {
					'音乐节': '🎵',
					'演唱会': '🎤',
					'周边': '🧸',
					'专辑': '💿',
					'商务': '💼',
					'其他': '📦'
				}
				return iconMap[type] || '📦'
			},
			getPlaceholder() {
				const placeholderMap = {
					'音乐节': '如：迷笛音乐节 - 连云港',
					'演唱会': '如：某某演唱会',
					'周边': '如：涂鸦森林黑胶',
					'专辑': '如：专辑名称',
					'商务': '如：ELLEMEN杂志',
					'其他': '请输入名称'
				}
				return placeholderMap[this.formData.payType] || '请输入名称'
			},
			selectType(type) {
				// 如果切换到不同的类型，清空之前的数据
				if (this.formData.payType !== type) {
					this.clearFormData()
				}
				
				this.formData.payType = type
				// 如果选择的是音乐节或演唱会，加载列表
				if (type === '音乐节' || type === '演唱会') {
					this.loadConcertList()
				}
			},
			// 清空表单数据
			clearFormData() {
				this.formData = {
					payTime: this.getCurrentDate(),
					payType: this.formData.payType, // 保留当前类型
					payName: '',
					payNum: '1',
					payPrice: '',
					TransportationExpenses: '',
					HotelExpenses: '',
					otherExpenses: '',
					payAmount: '',
					bz: '',
					adress: '',
					Province: '',
					imgs: '',
					sdUrl: '',
					concertID: '',
					isEntry: '',
					SeatNumber: ''
				}
				if (this.$refs.imageUpload) {
					this.$refs.imageUpload.clearImages()
				}
				this.concertIndex = -1
				this.selectedConcert = null
			},
			// 加载演唱会/音乐节列表
			loadConcertList() {
				uni.showLoading({ title: '加载中' })
				uniCloud.callFunction({
					name: 'concert',
					data: {
						action: 'getList',
						type: this.formData.payType // 根据当前类型筛选
					}
				}).then((res) => {
					uni.hideLoading()
					if (res.result.code === 0) {
						// 处理数据，添加 displayName 字段用于显示
						this.concertList = res.result.data.map(item => {
							// 智能生成显示名称：优先使用 ychTheme，其次使用 Session
							let displayName = ''
							
							if (item.ychTheme) {
								// 如果有主题，使用：主题 - 场馆 (时间)
								displayName = `${item.ychTheme}`
								if (item.yhcTheme) {
									displayName += ` - ${item.yhcTheme}`
								}
								
								if (item.Session) {
									displayName += ` - ${item.Session}`
								}
								if (item.time) {
									displayName += ` (${item.time})`
								}
							} else if (item.Session) {
								// 如果没有主题但有场次，使用：场次 - 地址 (时间)
								displayName = `${item.Session}`
								if (item.address) {
									displayName += ` - ${item.address}`
								}
								if (item.time) {
									displayName += ` (${item.time})`
								}
							} else {
								// 都没有，使用时间或默认文本
								displayName = item.time || '未命名场次'
							}
							
							return {
								...item,
								displayName
							}
						})
						console.log('演唱会列表:', this.concertList)
					} else {
						uni.showToast({
							title: res.result.message || '加载失败',
							icon: 'none'
						})
					}
				}).catch((err) => {
					uni.hideLoading()
					console.error('加载演唱会列表失败', err)
					uni.showToast({
						title: '加载失败',
						icon: 'none'
					})
				})
			},
			// 选择是否入场
			selectEntry(value) {
				this.formData.isEntry = value
				// 如果选择未入场，清空票价相关字段
				if (value === '否') {
					this.formData.payPrice = ''
					this.calculateTotal()
				}
			},
			// 选择演唱会/音乐节
			onConcertChange(e) {
				const index = e.detail.value
				this.concertIndex = index
				this.selectedConcert = this.concertList[index]
				
				if (this.selectedConcert) {
					// 自动填充名称、地址和省份
					this.formData.payName = this.selectedConcert.displayName
					this.formData.adress = this.selectedConcert.Province+this.selectedConcert.address || ''
					
					this.formData.concertID = this.selectedConcert._id || ''
					
					console.log('选中的演唱会:', this.selectedConcert)
				}
			},
			calculateTotal() {
				if (this.formData.payType === '音乐节' || this.formData.payType === '演唱会') {
					const payPrice = parseFloat(this.formData.payPrice) || 0
					const transportation = parseFloat(this.formData.TransportationExpenses) || 0
					const hotel = parseFloat(this.formData.HotelExpenses) || 0
					const other = parseFloat(this.formData.otherExpenses) || 0
					this.formData.payAmount = (payPrice + transportation + hotel + other).toFixed(2)
				} else {
					const price = parseFloat(this.formData.payPrice) || 0
					const num = parseInt(this.formData.payNum) || 1
					this.formData.payAmount = (price * num).toFixed(2)
				}
			},
			
			getRecordDetail(id) {
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录！',
						showCancel: false,
						success: () => {
							uni.navigateBack()
						}
					})
					return
				}
				
				uni.showLoading({
					title: '加载中...'
				})
				uniCloud.callFunction({
					name: 'pay-record',
					data: {
						type: 'getDetail',
						id: id,
						userId: this.userInfo._id
					}
				}).then(async (res) => {
					uni.hideLoading()
					if (res.result.code === 0) {
						const data = res.result.data
						this.formData = {
							payTime: data.payTime || this.getCurrentDate(),
							payType: data.payType || '周边',
							payName: data.payName || '',
							payNum: data.payNum || '1',
							payPrice: data.payPrice || '0',
							TransportationExpenses: data.TransportationExpenses || '0',
							HotelExpenses: data.HotelExpenses || '0',
							otherExpenses: data.otherExpenses || '0',
							payAmount: data.payAmount || '0',
							bz: data.bz || '',
							adress: data.adress || '',
							Province: data.Province || '',
							imgs: data.imgs || '',
							isEntry: data.isEntry || '',
							SeatNumber: data.SeatNumber || ''
						}
														
						// 如果是音乐节或演唱会类型，需要加载列表并匹配选中的项
						if (data.payType === '音乐节' || data.payType === '演唱会') {
							await this.loadConcertList()
							// 根据 payName、Session 和 adress 尝试匹配已选择的演唱会
							const matchedIndex = this.concertList.findIndex(item => 
								item.ychTheme === data.payName || 
								item.Session === data.payName ||
								item.address === data.adress ||
								item.displayName === data.payName
							)
							if (matchedIndex > -1) {
								this.concertIndex = matchedIndex
								this.selectedConcert = this.concertList[matchedIndex]
							}
						}
														
						
					}
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `加载失败：${err.message}`,
						showCancel: false
					})
				})
			},
			async saveRecord() {
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录',
						showCancel: false
					})
					return
				}
				
				// 验证必填项
				if (this.formData.payType === '音乐节' || this.formData.payType === '演唱会') {
					// 音乐节/演唱会类型：必须选择场次
					if (!this.selectedConcert) {
						uni.showModal({
							content: '请选择演唱会/音乐节场次',
							showCancel: false
						})
						return
					}
					
					// 验证是否入场
					if (!this.formData.isEntry) {
						uni.showModal({
							content: '请选择是否入场',
							showCancel: false
						})
						return
					}
					
					// 如果已入场，必须填写票价
					if (this.formData.isEntry === '1' && !this.formData.payPrice) {
						uni.showModal({
							content: '已入场必须填写票价',
							showCancel: false
						})
						return
					}
					
					// 检查是否重复添加（同一用户、同一场次、同一天只能添加一次）
					if (!this.isEdit) {
						const isDuplicate = await this.checkDuplicateRecord()
						if (isDuplicate) {
							uni.showModal({
								content: '您今天已经添加过该场次的记录了，不能重复添加',
								showCancel: false
							})
							return
						}
					}
				} else {
					// 其他类型：必须输入名称
					if (!this.formData.payName) {
						uni.showModal({
							content: '请输入消费名称',
							showCancel: false
						})
						return
					}
				}
							
				// 处理图片
				const imgResult = await this.$refs.imageUpload.processImages(this.isEdit)
				if (imgResult !== null) {
					this.formData.imgs = imgResult
				}
							
				// 保存记录
				uni.showLoading({
					title: '保存中...'
				})
				
				const actionType = this.isEdit ? 'update' : 'add'
				const data = {
					type: actionType,
					userId: this.userInfo._id,
					...this.formData
				}
				if (this.isEdit) {
					data.id = this.recordId
				}
				
				uniCloud.callFunction({
					name: 'pay-record',
					data: data
				}).then((res) => {
					uni.hideLoading()
					if (res.result.code === 0) {
						uni.showModal({
							content: this.isEdit ? '更新成功' : '保存成功',
							showCancel: false,
							success: () => {
								uni.navigateBack()
							}
						})
					} else {
						uni.showModal({
							content: res.result.message,
							showCancel: false
						})
					}
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `保存失败：${err.message}`,
						showCancel: false
					})
				})
			},
			deleteRecord() {
				if (!this.userInfo._id) {
					uni.showModal({
						content: '请先登录',
						showCancel: false
					})
					return
				}
				
				uni.showModal({
					content: '确定要删除这条记录吗？',
					success: (res) => {
						if (res.confirm) {
							uni.showLoading({
								title: '删除中...'
							})
							uniCloud.callFunction({
								name: 'pay-record',
								data: {
									type: 'delete',
									id: this.recordId,
									userId: this.userInfo._id
								}
							}).then((res) => {
								uni.hideLoading()
								if (res.result.code === 0) {
									uni.showModal({
										content: '删除成功',
										showCancel: false,
										success: () => {
											uni.navigateBack()
										}
									})
								} else {
									uni.showModal({
										content: res.result.message,
										showCancel: false
									})
								}
							}).catch((err) => {
								uni.hideLoading()
								uni.showModal({
									content: `删除失败：${err.message}`,
									showCancel: false
								})
							})
						}
					}
				})
			},
			
			// 检查是否重复添加
			checkDuplicateRecord() {
				return new Promise((resolve) => {
					uniCloud.callFunction({
						name: 'pay-record',
						data: {
							type: 'checkDuplicate',
							userId: this.userInfo._id,
							concertID: this.formData.concertID,
							payTime: this.formData.payTime
						}
					}).then((res) => {
						if (res.result.code === 0) {
							resolve(res.result.isDuplicate || false)
						} else {
							resolve(false)
						}
					}).catch((err) => {
						console.error('检查重复记录失败', err)
						resolve(false)
					})
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

.section-box {
	background: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.08);
	
	.section-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 16rpx;
		
		.optional {
			font-size: 24rpx;
			color: #999;
			font-weight: normal;
		}
		
		.required {
			font-size: 24rpx;
			color: #8433ee;
			font-weight: normal;
		}
	}
}

.type-scroll {
	white-space: nowrap;
	
	.type-item {
		display: inline-block;
		width: 120rpx;
		text-align: center;
		padding: 20rpx 10rpx;
		margin-right: 16rpx;
		background: #f5f5f5;
		border-radius: 12rpx;
		
		&.active {
			background: linear-gradient(135deg, #66baea 0%, #a97bd6 100%);
			color: #fff;
			
			.type-name {
				color: #fff;
			}
		}
		
		&.disabled {
			opacity: 0.6;
			pointer-events: none;
		}
		
		.type-icon {
			font-size: 40rpx;
			margin-bottom: 8rpx;
		}
		
		.type-name {
			font-size: 24rpx;
			color: #666;
		}
	}
}

.input {
	height: 80rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
}

.form-picker {
	width: 100%;
	height: 80rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	line-height: 80rpx;
	color: #333;
}

.concert-info {
	margin-top: 20rpx;
	padding: 20rpx;
	background: #fff8e1;
	border-radius: 12rpx;
	
	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12rpx 0;
		border-bottom: 1rpx solid #ffe0b2;
		
		&:last-child {
			border-bottom: none;
		}
		
		.info-label {
			font-size: 26rpx;
			color: #666;
			min-width: 100rpx;
		}
		
		.info-value {
			font-size: 26rpx;
			color: #333;
			flex: 1;
			text-align: right;
		}
	}
}

.entry-section {
	margin-top: 20rpx;
	
	.section-subtitle {
		font-size: 26rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 16rpx;
		
		.required {
			font-size: 24rpx;
			color: #0ff8ec;
			font-weight: normal;
		}
	}
	
	.radio-group {
		display: flex;
		gap: 20rpx;
		
		.radio-item {
			flex: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 20rpx;
			background: #f5f5f5;
			border-radius: 12rpx;
			cursor: pointer;
			transition: all 0.3s;
			
			&.active {
				background: linear-gradient(135deg, #66baea 0%, #a97bd6 100%);
				color: #fff;
				
				.radio-circle {
					border-color: #fff;
					
					&::after {
						background: #fff;
					}
				}
			}
			
			.radio-circle {
				width: 32rpx;
				height: 32rpx;
				border: 3rpx solid #ddd;
				border-radius: 50%;
				margin-right: 12rpx;
				position: relative;
				transition: all 0.3s;
				
				&::after {
					content: '';
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					width: 16rpx;
					height: 16rpx;
					border-radius: 50%;
					background: transparent;
					transition: all 0.3s;
				}
			}
			
			text {
				font-size: 28rpx;
				color: inherit;
			}
		}
	}
}

.form-item {
	margin-top: 20rpx;
	
	.section-subtitle {
		font-size: 26rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 12rpx;
		
		.optional {
			font-size: 24rpx;
			color: #999;
			font-weight: normal;
		}
	}
}

.amount-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
	
	&:last-child {
		border-bottom: none;
	}
	
	.amount-label {
		font-size: 28rpx;
		color: #333;
		
		.optional {
			font-size: 24rpx;
			color: #999;
		}
	}
	
	.amount-input {
		width: 300rpx;
		height: 60rpx;
		background: #f5f5f5;
		border-radius: 12rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		text-align: right;
	}
	
	&.total {
		background: #fff8e1;
		border-radius: 12rpx;
		padding: 20rpx;
		margin-top: 16rpx;
		
		.total-amount {
			font-size: 32rpx;
			font-weight: bold;
			color: #844eb1;
		}
	}
}

.date-picker {
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 80rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	color: #333;
}



.textarea {
	height: 120rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 20rpx;
	font-size: 28rpx;
}

.btn-box {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 20rpx 30rpx;
	background: #fff;
	box-shadow: 0 -4rpx 12rpx rgba(0,0,0,0.1);
	z-index: 9999;
	
	.btn-save {
		width: 100%;
		height: 88rpx;
		background: linear-gradient(135deg, #66baea 0%, #a97bd6 100%);
		color: #fff;
		border-radius: 44rpx;
		font-size: 32rpx;
		border: none;
	}
	
	.btn-delete {
		width: 100%;
		height: 88rpx;
		background: #fff;
		color: #c62828;
		border: 2rpx solid #c62828;
		border-radius: 44rpx;
		font-size: 32rpx;
		margin-top: 16rpx;
	}
}
</style>
