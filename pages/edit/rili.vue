<template>
	<view>
		<view class="search-box">
			<text class="title">日期搜索</text>
			<input class="uni-input" name="date" v-model="search.date" placeholder="请输入"  @blur="getList"/>
		</view>
		<view class="list">
			<view class="list-item" v-for="(item,i) in list" :key="i" @click="editInfo(item)">
				{{item.date}}-{{item.title}}
			</view>
		</view>
		
		 <view class="page">
		      <form>
				  <view class="uni-form-item ">
					<text class="title">日期</text>
					<input class="uni-input" name="date" v-model="formData.date" placeholder="请输入"  />
				  </view>
				  
					<view class="uni-form-item">
					  <text class="title">标题</text>
					  <input class="uni-input" name="title" v-model="formData.title" placeholder="请输入"  />
					</view>
				
					<view class="uni-form-item">
					  <text class="title">备注</text>
					  <textarea name="bz" v-model="formData.bz" placeholder="请输入备注" style="background: #FFF;" />
					
					</view>
		        
		        
		       
		        <view class="flex-row" v-if="formData._id">
		          <button type="primary" class="uni-button" @click="submit('update')" >更新</button>
		          <button type="primary" class="uni-button" @click="remove(formData._id)">删除</button>
		         <button type="primary" class="uni-button" @click="clearForm" >清空</button>
		        </view>
				 <button type="primary" class="uni-button" @click="submit('add')" v-else>保存</button>
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
				}
			}
		},
		onLoad() {
			
		},
		methods:{
			editInfo(item){
				this.formData= {...item};
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
	.flex-row{display: flex;}
	.title{color: cadetblue;}
	.page{
		padding: 5px;
	}
	.uni-form-item{
		margin-bottom: 10px;
	}
	  .search-box{
		  background: #eee;
		  margin-bottom: 15px;
		  padding: 3px;
	  }   
		.list{
			margin-bottom: 20px;
			.list-item{
				background: #ddd;
				margin-bottom: 5px;
				padding: 3px;
			}
		}
</style>
