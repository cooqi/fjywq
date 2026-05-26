<template>
	<view class="page-container">
		<!-- 搜索框 -->
		<view class="search-box">
			<text class="search-label">日期搜索</text>
			<input 
				class="search-input" 
				name="date" 
				v-model="search.date" 
				placeholder="请输入日期"
				@blur="getList"
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
					<input 
						class="form-input" 
						name="date" 
						v-model="formData.date" 
						placeholder="请输入日期（如：2024-01-01）"
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
					/>
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
	export default{
		data(){
			return{
				list:[],
				formData:{
					title:'',
					bz:'',
					date:''
				},
				search:{
					date:''
				},
				customGreeting:{
					title:''
				}
			}
		},
		onLoad() {
			
		},
		methods:{
			editInfo(item){
				this.formData= {...item};
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
			add() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						type:'add',
						params:this.formData
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
			update() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						type:'update',
						params:this.formData
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `更新成功`,
						showCancel: false
					})
					this.getList()
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
				this.formData._id=''
				this.formData.date=''
				this.formData.title=''
				this.formData.bz=''
				
			}
		}
	}
</script>

<style lang="scss">
// 页面容器
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #f5f7fa 0%, #ffffff 100%);
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