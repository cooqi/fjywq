<template>
	<view>
		
		<view>
			<view v-for="(item,i) in list" :key="i" @click="editInfo(item)">
				{{item.date}}-{{item.title}}
			</view>
		</view>
		
		 <view class="page">
		      <form>
				  <view class="uni-form-item flex-row">
					<text class="title">日期选择</text>
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
		        
		        
		       
		        <view class="flex-row">
		          <button type="primary" class="uni-button" @click="submit('update')" v-if="formData._id">更新</button>
		          <button type="primary" class="uni-button" @click="remove(formData._id)" v-if="formData._id">删除</button>
		          <button type="primary" class="uni-button" @click="submit('add')" v-else>保存</button>
		        </view>
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
				time:'2015-11-21'
			}
		},
		onLoad() {
			this.getList()
		},
		methods:{
			editInfo(item){
				alert(1)
				this.formData=item
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
					this.getList()
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
						params:this.formData.id
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
						time:this.time
					}
				}).then((res) => {
					uni.hideLoading()
					
					this.list=res.result.data
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
		}
	}
</script>

<style>
	       
</style>
