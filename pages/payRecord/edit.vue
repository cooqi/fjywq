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

		<!-- 照片 功能完好，已测试，但是由于存库空间有限-->
				<view class="section-box">
					<view class="section-title">订单截图 <text class="optional">不建议在小程序储存图片，以防丢失</text></view>
					<view class="upload-box">
						<view class="upload-item" v-for="(img, index) in imageList" :key="index">
							<image class="upload-image" :src="img" mode="aspectFill" @click="previewImage(index)"></image>
							<view class="upload-delete" @click.stop="deleteImage(index)">×</view>
						</view>
						<view class="upload-add" @click="chooseImage" v-if="imageList.length < 1">
							<text class="upload-add-icon">+</text>
							<text class="upload-add-text">添加照片</text>
							<text class="upload-add-count">{{imageList.length}}/1</text>
						</view>
					</view>
				</view>
		
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
		
		
		<!-- 隐藏canvas用于图片压缩 -->
		<canvas canvas-id="compressCanvas" style="width: 800px; height: 800px; position: fixed; left: -9999px; top: -9999px;"></canvas>
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
				imageList: [],
				originalFileIDs: [], // 存储原始的 fileID 列表
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
				this.formData.payType = type
				// 如果选择的是音乐节或演唱会，加载列表
				if (type === '音乐节' || type === '演唱会') {
					this.loadConcertList()
				}
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
			chooseImage() {
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera'],
					type: 'image',
					success: async (res) => {
						// 压缩图片
						const compressedImages = []
						for (let i = 0; i < res.tempFilePaths.length; i++) {
							const compressedPath = await this.compressImage(res.tempFilePaths[i])
							compressedImages.push(compressedPath)
						}
						this.imageList = this.imageList.concat(compressedImages)
					}
				})
			},
			deleteImage(index) {
				this.imageList.splice(index, 1)
			},
			previewImage(index) {
				uni.previewImage({
					urls: this.imageList,
					current: index,
					longPressActions: {
						itemList: ['发送给朋友', '保存图片', '收藏'],
						success: function(data) {
							console.log('选中了第' + (data.tapIndex + 1) + '个按钮,第' + (data.index + 1) + '张图片');
						},
						fail: function(err) {
							console.log(err.errMsg);
						}
					}
				});
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
														
						// 如果有图片，需要将 fileID 转换为临时 URL
						if (data.imgs) {
							const fileIDs = data.imgs.split(';').filter(img => img)
							this.originalFileIDs = fileIDs // 保存原始 fileID
							console.log('需要转换的图片 fileIDs:', fileIDs)
															
							try {
								const urlRes = await uniCloud.getTempFileURL({
									fileList: fileIDs
								})
								console.log('获取临时URL成功:', urlRes)
																
								// 将临时 URL 赋值给 imageList
								this.imageList = urlRes.fileList.map(item => item.tempFileURL)
								console.log('图片列表:', this.imageList)
							} catch (err) {
								console.error('获取图片临时URL失败:', err)
								// 如果失败，仍然使用 fileID（虽然无法显示）
								this.imageList = fileIDs
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
							
				// 处理图片：区分新图片和已有图片
				let newImageFiles = [] // 需要上传的新图片（本地路径）
				let keptFileIDs = [] // 保留的已有 fileID
							
				if (this.imageList.length > 0) {
					// 创建一个映射表，将临时URL映射到fileID
					const urlToFileIDMap = {}
					if (this.originalFileIDs.length > 0 && this.imageList.length > 0) {
						// 在编辑模式下，建立 URL -> fileID 的映射
						// 注意：这里假设 imageList 中的 URL 顺序和 originalFileIDs 的顺序一致
						for (let i = 0; i < this.imageList.length; i++) {
							const imgPath = this.imageList[i]
							// 如果是临时URL，说明是已有图片
							if ((imgPath.startsWith('http://') || imgPath.startsWith('https://')) && this.originalFileIDs[i]) {
								urlToFileIDMap[imgPath] = this.originalFileIDs[i]
							}
						}
					}
								
					// 遍历当前图片列表
					this.imageList.forEach((imgPath, index) => {
						// 判断是临时URL还是本地文件路径
						if ((imgPath.startsWith('http://') || imgPath.startsWith('https://')) && urlToFileIDMap[imgPath]) {
							// 这是已有的图片（临时URL），使用映射表中的 fileID
							keptFileIDs.push(urlToFileIDMap[imgPath])
							console.log(`保留第${index + 1}张已有图片的fileID:`, urlToFileIDMap[imgPath])
						} else {
							// 这是新选择的图片（本地路径），需要上传
							newImageFiles.push(imgPath)
							console.log(`第${index + 1}张是新图片，需要上传`)
						}
					})
				}
							
				console.log('保留的fileIDs:', keptFileIDs)
				console.log('需要上传的新图片数量:', newImageFiles.length)
							
				// 上传新图片
				if (newImageFiles.length > 0) {
					uni.showLoading({
						title: '上传中...'
					})
					try {
						const uploadPromises = newImageFiles.map((filePath, index) => {
							return uniCloud.uploadFile({
								filePath: filePath,
								cloudPath: `payRecord/${Date.now()}_${index}.jpg`
							}).then(res => {
								console.log(`新图片${index + 1}上传成功:`, res.fileID)
								return res.fileID
							})
						})
						const newFileIDs = await Promise.all(uploadPromises)
									
						// 合并保留的和新的 fileID
						const allFileIDs = [...keptFileIDs, ...newFileIDs]
						this.formData.imgs = allFileIDs.join(';')
						console.log('最终所有图片fileIDs:', this.formData.imgs)
					} catch (err) {
						uni.hideLoading()
						console.error('图片上传失败详情:', err)
						uni.showModal({
							content: `图片上传失败：${err.message || '未知错误'}`,
							showCancel: false
						})
						return
					}
					uni.hideLoading()
				} else {
					// 没有新图片上传，但可能有删除操作
					if (this.isEdit) {
						// 编辑模式：使用保留的 fileID
						this.formData.imgs = keptFileIDs.join(';')
						console.log('没有新图片，保留的fileIDs:', this.formData.imgs)
					}
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
			// 压缩图片
			compressImage(filePath) {
				return new Promise((resolve, reject) => {
					// 获取图片信息
					uni.getImageInfo({
						src: filePath,
						success: (info) => {
							console.log('原始图片信息:', info)
									
							// 使用 Canvas 进行等比例压缩（保证不变形）
							this.compressImageByCanvas(filePath, info).then(resolve)
						},
						fail: (err) => {
							console.error('获取图片信息失败', err)
							resolve(filePath) // 失败返回原图
						}
					})
				})
			},
			// Canvas 压缩（主方案）
			compressImageByCanvas(filePath, info) {
				return new Promise((resolve) => {
					// 计算压缩后的尺寸（最大宽度500px，最大高度800px，保持宽高比）
					let width = info.width
					let height = info.height
					const maxWidth = 500
					const maxHeight = 800
							
					// 等比例缩放，确保不超过最大尺寸
					if (width > maxWidth || height > maxHeight) {
						const ratio = Math.min(maxWidth / width, maxHeight / height)
						width = Math.round(width * ratio)
						height = Math.round(height * ratio)
					}
							
					console.log(`原始尺寸: ${info.width}x${info.height}, 压缩后: ${width}x${height}`)
							
					// 先填充白色背景（PNG转JPG防止透明区域变黑）
					const ctx = uni.createCanvasContext('compressCanvas', this)
					ctx.setFillStyle('#ffffff')
					ctx.fillRect(0, 0, width, height)
							
					// 绘制图片（完整绘制整个图片到指定尺寸）
					ctx.drawImage(filePath, 0, 0, width, height)
							
					ctx.draw(false, () => {
						// 增加延迟确保绘制完成
						setTimeout(() => {
							uni.canvasToTempFilePath({
								canvasId: 'compressCanvas',
								quality: 0.6,
								fileType: 'jpg',
								// 指定导出区域，只导出绘制的内容部分
								x: 0,
								y: 0,
								width: width,
								height: height,
								destWidth: width,
								destHeight: height,
								success: (res) => {
									console.log('Canvas压缩成功:', res.tempFilePath)
									resolve(res.tempFilePath)
								},
								fail: (err) => {
									console.error('Canvas压缩失败', err)
									resolve(filePath) // 压缩失败返回原图
								}
							}, this)
						}, 500)
					})
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

.upload-box {
	display: flex;
	flex-wrap: wrap;
	
	.upload-item {
		position: relative;
		width: 160rpx;
		height: 160rpx;
		margin-right: 16rpx;
		margin-bottom: 16rpx;
		border-radius: 12rpx;
		overflow: hidden;
		
		.upload-image {
			width: 100%;
			height: 100%;
		}
		
		.upload-delete {
			position: absolute;
			top: 0;
			right: 0;
			width: 40rpx;
			height: 40rpx;
			background: rgba(0,0,0,0.6);
			color: #fff;
			font-size: 32rpx;
			line-height: 40rpx;
			text-align: center;
		}
	}
	
	.upload-add {
		width: 160rpx;
		height: 160rpx;
		background: #f5f5f5;
		border-radius: 12rpx;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		border: 2rpx dashed #ddd;
		
		.upload-add-icon {
			font-size: 48rpx;
			color: #999;
		}
		
		.upload-add-text {
			font-size: 24rpx;
			color: #999;
			margin-top: 8rpx;
		}
		
		.upload-add-count {
			font-size: 20rpx;
			color: #bbb;
		}
	}
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
