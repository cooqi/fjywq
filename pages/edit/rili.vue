<template>
	<view class="page-container">
		<!-- 搜索框 -->
		<view class="search-box">
			<text class="search-label">日期搜索</text>
			<uni-datetime-picker 
				type="date" 
				v-model="searchDatePicker"
				placeholder="请选择日期"
				@change="onSearchDateChange"
			/>
		</view>
		
		<!-- 列表 -->
		<view class="list-section">
			<view 
				class="list-item" 
				v-for="(item,i) in list" 
				:key="i" 
				@click="editInfo(item)"
			>
				<text class="item-date">{{item.date}}</text>
				<text class="item-title">{{item.title}}</text>
				<text class="item-arrow">›</text>
			</view>
			
			<view v-if="!list.length" class="empty-list">
				<text>暂无数据</text>
			</view>
		</view>
		
		<!-- 表单 -->
		<view class="form-section">
			<form>
				<view class="form-item">
					<text class="form-label">日期</text>
					<uni-datetime-picker 
						class="form-input"
						type="date" 
						v-model="formDatePicker"
						placeholder="请选择日期"
						@change="onFormDateChange"
					/>
				</view>
				
				<view class="form-item">
					<text class="form-label">标题</text>
					<input 
						class="form-input" 
						name="title" 
						v-model="formData.title" 
						placeholder="请输入标题"
					/>
				</view>
				
				<view class="form-item">
					<text class="form-label">备注</text>
					<textarea 
						class="form-textarea" 
						name="bz" 
						v-model="formData.bz" 
						placeholder="请输入备注"
						auto-height
						maxlength="4000"
					/>
					<view class="date-extract-hint">
						<text>在备注中用【2024-01-01】格式包裹日期，可提取为关联日期</text>
					</view>
				</view>
				<view class="form-item">
					<text class="form-label">类型</text>
					<input 
						class="form-input" 
						name="title" 
						v-model="formData.type" 
						placeholder="1重要，2糖"
					/>
				</view>
				
				<view class="form-item">
					<text class="form-label">图片路径</text>
					<textarea 
						class="form-textarea" 
						name="imgurl" 
						v-model="formData.imgurl" 
						placeholder="请输入图片路径，多个用分号隔开"
						auto-height
						maxlength="2000"
					/>
				</view>
				
				<image-upload 
						ref="imageUpload"
						title="上传图片" 
						optionalText="优先外链" 
						maxCount="3"
						uploadPath="rili"
						:modelValue="formData.imgurl"
					></image-upload>
				
				<view class="form-item">
					<text class="form-label">关联日期</text>
					<view class="related-date-picker">
						<uni-datetime-picker 
							type="date" 
							v-model="relatedDatePicker"
							placeholder="选择日期添加"
							@change="onRelatedDateChange"
						/>
					</view>
					<view class="related-dates-list" v-if="formData.relatedDates.length">
						<view 
							class="date-tag" 
							v-for="(d,i) in formData.relatedDates" 
							:key="i"
						>
							<text class="date-tag-text">{{d}}</text>
							<text class="date-tag-remove" @click="removeRelatedDate(i)">×</text>
						</view>
					</view>
					<view class="bz-extract-section" v-if="getBzInlineDates().length">
						<text class="extract-label">备注中发现的日期：</text>
						<view class="extract-dates">
							<text 
								class="extract-date-item" 
								v-for="(d,i) in getBzInlineDates()" 
								:key="i"
								@click="extractBzDate(d)"
							>{{d}} +</text>
						</view>
					</view>
				</view>
				
				<view class="form-actions" v-if="formData._id">
					<button 
						type="primary" 
						class="action-btn update-btn" 
						@click="submit('update')"
					>
						更新
					</button>
					<button 
						type="primary" 
						class="action-btn delete-btn" 
						@click="remove(formData._id)"
						v-if=" isCalendarPermission('del') "
					>
						删除
					</button>
					<button 
						type="primary" 
						class="action-btn clear-btn" 
						@click="clearForm"
					>
						清空
					</button>
				</view>
				
				<button 
					type="primary" 
					class="action-btn save-btn full-width" 
					@click="submit('add')" 
					v-else
				>
					保存
				</button>
			</form>
		</view>
		
		<!-- 问候语设置 -->
		<view class="greeting-section">
			<view class="section-title">
				<text class="title-icon">🔔</text>
				<text>问候语设置</text>
			</view>
			<form>
				<view class="form-item">
					<text class="form-label">问候语</text>
					<input 
						class="form-input" 
						name="greeting" 
						v-model="customGreeting.title" 
						placeholder="请输入问候语"
					/>
				</view>
				
				<button 
					type="primary" 
					class="action-btn save-btn full-width" 
					@click="add_customGreeting"
				>
					保存问候语
				</button>
			</form>
		</view>
		
		
	</view>
</template>

<script>
import { hasCalendarPermission } from '@/common/js/permission.js'
	export default{
		data(){
			return{
				list:[],
				formData:{
					title:'',
					bz:'',
					date:'',
					imgurl:'',
					type:'',
					relatedDates:[]
				},
				search:{
					date:''
				},
				searchDatePicker: '',
				formDatePicker: '',
				relatedDatePicker: '',
				customGreeting:{
					title:''
				},
				userInfo:null,
			}
		},
		onLoad(options) {
			const userInfo = uni.getStorageSync('userInfo');
			this.userInfo=JSON.parse(userInfo)
			if(options.itemData){
				try {
					const item = JSON.parse(decodeURIComponent(options.itemData))
					this.editInfo(item)
				} catch(e) {
					console.error('解析编辑数据失败:', e)
				}
			}
		},
		methods:{
			isCalendarPermission(type) {
				return hasCalendarPermission(this.userInfo, type)
			},
			editInfo(data){
				this.formData = {
					_id: data._id || '',
					title: data.title || '',
					bz: data.bz || '',
					date: data.date || '',
					imgurl: data.imgurl || '',
					type: data.type || '',
				}
				this.formData.relatedDates = data.relatedDates ? (typeof data.relatedDates === 'string' ? data.relatedDates.split(',').filter(d=>d) : (Array.isArray(data.relatedDates) ? data.relatedDates : [])) : []
				this.formDatePicker = data.date ? this.formatToPicker(data.date) : ''
			},
			formatToPicker(dateStr) {
				if (!dateStr) return ''
				const parts = dateStr.split('-')
				if (parts.length === 3) {
					return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`
				}
				return dateStr
			},
			formatDate(dateStr) {
				if (!dateStr) return ''
				const parts = dateStr.split('-')
				if (parts.length === 3) {
					return `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`
				}
				return dateStr
			},
			onSearchDateChange() {
				this.search.date = this.formatDate(this.searchDatePicker)
				this.getList()
			},
			onFormDateChange() {
				this.formData.date = this.formatDate(this.formDatePicker)
			},
			onRelatedDateChange() {
				if(!this.relatedDatePicker) return
				const date = this.formatToPicker(this.relatedDatePicker)
				if(date && !this.formData.relatedDates.includes(date)){
					this.formData.relatedDates.push(date)
				}
				this.relatedDatePicker = ''
			},
			removeRelatedDate(index) {
				this.formData.relatedDates.splice(index, 1)
			},
			getBzInlineDates() {
				if(!this.formData.bz) return []
				const regex = /【(\d{4}-\d{1,2}-\d{1,2})】/g
				const dates = []
				let match
				while((match = regex.exec(this.formData.bz)) !== null){
					if(this.isValidDate(match[1]) && !dates.includes(match[1])){
						dates.push(match[1])
					}
				}
				return dates.filter(d => !this.formData.relatedDates.includes(d))
			},
			extractBzDate(date) {
				if(!this.formData.relatedDates.includes(date)){
					this.formData.relatedDates.push(date)
				}
			},
			isValidDate(dateStr) {
				if(!dateStr) return false
				const parts = dateStr.split('-')
				if(parts.length !== 3) return false
				const year = parseInt(parts[0])
				const month = parseInt(parts[1])
				const day = parseInt(parts[2])
				if(month < 1 || month > 12) return false
				const daysInMonth = new Date(year, month, 0).getDate()
				if(day < 1 || day > daysInMonth) return false
				const d = new Date(dateStr.replace(/-/g,'/'))
				return !isNaN(d.getTime())
			},
			add_customGreeting(){
				if(!this.customGreeting.title&&!this.customGreeting.bgcolor){
					uni.showModal({
						content: `请输入有效数据`,
						showCancel: false
					})
					return
					
				}
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'welcome',
					data: {
						type:'update',
						params:this.customGreeting,
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `问候语修改成功`,
						showCancel: false
					})
					this.clearForm()
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `修改数据失败`,
						showCancel: false
					})
					console.error(err)
				})
			},
			async setImg(){
				const isEdit = !!this.formData._id
				const result = await this.$refs.imageUpload.processImages(isEdit)
				if (result !== null) {
					this.formData.imgurl = result
				}
			},
			async add() {
				if(!this.formData.date){
					uni.showModal({
						content: `请选择日期`,
						showCancel: false
					})
					return
				}
				if(!this.formData.title){
					uni.showModal({
						content: `请输入标题`,
						showCancel: false
					})
					return
				}
				await this.setImg()
				uni.showLoading({
					title: '处理中...'
				})
				let params = {...this.formData, relatedDates: this.formData.relatedDates.join(','), add_czr:this.userInfo._id}
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						type:'add',
						params
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `成功添加一条数据，文档id为：${res.result.id}`,
						showCancel: false
					})
					this.clearForm()
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `添加数据失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			remove(id) {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						type:'del',
						params:this.formData._id
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `删除成功`,
						showCancel: false
					})
					this.getList()
					this.clearForm()
					//console.log(res)
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `删除失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			async update() {
				if(!this.formData.date){
					uni.showModal({
						content: `请选择日期`,
						showCancel: false
					})
					return
				}
				if(!this.formData.title){
					uni.showModal({
						content: `请输入标题`,
						showCancel: false
					})
					return
				}
				await this.setImg()
				uni.showLoading({
					title: '处理中...'
				})
				let params = {...this.formData, relatedDates: this.formData.relatedDates.join(','), update_czr:this.userInfo._id}
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						type:'update',
						params
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `更新成功`,
						showCancel: false
					})
					this.clearForm()
					//console.log(res)
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `更新操作执行失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			submit(type) {
				if(type==='add'){
					this.add()
				}else if(type==='update'){
					this.update()
				}
			},
			getList() {
				
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-get',
					data:{
						search:this.search
					}
				}).then((res) => {
					uni.hideLoading()
					
					this.list=res.result.data ||[]
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			clearForm(){
				
				delete this.formData._id
				this.formDatePicker=''
				this.searchDatePicker=''
				this.relatedDatePicker=''

				this.formData.date=''
				this.formData.title=''
				this.formData.bz=''
				this.formData.imgurl=''
				this.formData.relatedDates=[]
				if (this.$refs.imageUpload) {
					this.$refs.imageUpload.clearImages()
				}
			},
		}
	}
</script>

<style lang="scss">
// 页面容器
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 16px;
}

// 搜索框
.search-box {
	background: #fff;
	border-radius: 12px;
	padding: 12px 16px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	
	.search-label {
		font-size: 14px;
		color: #666;
		margin-right: 12px;
		white-space: nowrap;
	}
	
	.search-input {
		flex: 1;
		font-size: 15px;
	}
}

// 列表区域
.list-section {
	background: #fff;
	border-radius: 12px;
	padding: 8px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	
	.list-item {
		display: flex;
		align-items: center;
		padding: 14px 16px;
		border-radius: 8px;
		margin-bottom: 4px;
		background: #fafafa;
		transition: all 0.3s ease;
		
		&:last-child {
			margin-bottom: 0;
		}
		
		&:active {
			background: #f0f0f0;
		}
		
		.item-date {
			font-size: 13px;
			color: #aaa1ce;
			margin-right: 12px;
			white-space: nowrap;
		}
		
		.item-title {
			flex: 1;
			font-size: 15px;
			color: #333;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		
		.item-arrow {
			font-size: 20px;
			color: #999;
			margin-left: 8px;
		}
	}
	
	.empty-list {
		text-align: center;
		padding: 30px;
		color: #999;
		font-size: 14px;
	}
}

// 表单区域
.form-section {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	
	.form-item {
		margin-bottom: 16px;
		
		&:last-child {
			margin-bottom: 0;
		}
		
		.form-label {
			display: block;
			font-size: 14px;
			color: #666;
			margin-bottom: 8px;
			font-weight: 500;
		}
		
		.form-input {
			width: 100%;
			height: 44px;
			background: #f5f7fa;
			border-radius: 8px;
			padding: 0 12px;
			font-size: 15px;
		}
		
		.form-textarea {
			width: 100%;
			min-height: 80px;
			background: #f5f7fa;
			border-radius: 8px;
			padding: 12px;
			font-size: 15px;
			line-height: 1.5;
		}
	}
	
	.date-extract-hint {
		margin-top: 8px;
		font-size: 12px;
		color: #aaa1ce;
		line-height: 1.5;
	}
	
	.related-date-picker {
		background: #f5f7fa;
		border-radius: 8px;
		padding: 0 12px;
	}
	
	.related-dates-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}
	
	.date-tag {
		display: flex;
		align-items: center;
		background: linear-gradient(135deg, #aaa1ce22, #e6cffc44);
		border-radius: 16px;
		padding: 4px 12px;
		
		.date-tag-text {
			font-size: 13px;
			color: #8b5cf6;
		}
		
		.date-tag-remove {
			font-size: 16px;
			color: #fa709a;
			margin-left: 6px;
			line-height: 1;
		}
	}
	
	.bz-extract-section {
		margin-top: 12px;
		padding: 10px;
		background: #f0f7ff;
		border-radius: 8px;
		border: 1px dashed #aaa1ce;
		
		.extract-label {
			font-size: 12px;
			color: #888;
			margin-bottom: 8px;
			display: block;
		}
		
		.extract-dates {
			display: flex;
			flex-wrap: wrap;
			gap: 8px;
		}
		
		.extract-date-item {
			font-size: 13px;
			color: #4facfe;
			background: #fff;
			padding: 4px 10px;
			border-radius: 12px;
			border: 1px solid #4facfe44;
		}
	}
	
	.form-actions {
		display: flex;
		gap: 12px;
		margin-top: 24px;
		
		.action-btn {
			flex: 1;
			height: 44px;
			line-height: 44px;
			border-radius: 8px;
			font-size: 15px;
			font-weight: 500;
			border: none;
		}
		
		.save-btn {
			background: linear-gradient(135deg, #aaa1ce 0%, #9b8fbf 100%);
			color: #fff;
		}
		
		.update-btn {
			background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
			color: #fff;
		}
		
		.delete-btn {
			background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
			color: #fff;
		}
		
		.clear-btn {
			background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
			color: #333;
		}
		
		.full-width {
			width: 100%;
		}
	}
}

// 问候语设置区域
.greeting-section {
	background: #fff;
	border-radius: 12px;
	padding: 16px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	
	.section-title {
		display: flex;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid #f0f0f0;
		
		.title-icon {
			width: 20px;
			height: 20px;
			margin-right: 8px;
		}
		
		text {
			font-size: 16px;
			font-weight: 600;
			color: #333;
		}
	}
	
	.form-item {
		margin-bottom: 16px;
		
		.form-label {
			display: block;
			font-size: 14px;
			color: #666;
			margin-bottom: 8px;
			font-weight: 500;
		}
		
		.form-input {
			width: 100%;
			height: 44px;
			background: #f5f7fa;
			border-radius: 8px;
			padding: 0 12px;
			font-size: 15px;
		}
	}
	
	.action-btn {
		width: 100%;
		height: 44px;
		line-height: 44px;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 500;
		border: none;
		background: linear-gradient(135deg, #aaa1ce 0%, #9b8fbf 100%);
		color: #fff;
	}
}

// 保留旧样式
.flex-row {
	display: flex;
}

.title {
	color: cadetblue;
}

.page {
	padding: 5px;
}

.uni-form-item {
	margin-bottom: 10px;
}

.search-box {
	background: #eee;
	margin-bottom: 15px;
	padding: 3px;
}

.list {
	margin-bottom: 20px;
	
	.list-item {
		background: #ddd;
		margin-bottom: 5px;
		padding: 3px;
	}
}

.customGreeting {
	margin-top: 30px;
	
	.customGreeting-save-btn {
		margin: auto;
		text-align: center;
	}
}


</style>