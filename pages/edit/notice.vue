<template>
	<view>
		
		<view class="search-box">
			<input class="uni-input" name="title" v-model="search.title" placeholder="请输入标题" @blur="getList" />
		</view>
		<view class="list">
			<view class="list-item" v-for="(item,i) in list" :key="i" @click="editInfo(item)">
				{{item.title}}
			</view>
		</view>
		
		 <view class="page">
		      <form>
				  <view class="uni-form-item">
				    <text class="title">标题</text>
				    <input class="uni-input" name="title" v-model="formData.title" placeholder="请输入"  />
				  </view>
				  <view class="uni-form-item ">
					<text class="title">内容</text>
					<textarea class="uni-input" name="content" v-model="formData.content" placeholder="请输入"  maxlength="2000"/>
				  </view>
				<view class="uni-form-item ">
					<text class="title">置顶</text>
					<input class="uni-input" name="top" v-model="formData.top" placeholder="请输入"  />
				</view>
				<view class="uni-form-item ">
					<text class="title">是否隐藏</text>
					<uni-data-select
					      v-model="formData.hide"
					      :localdata="sf"
					    ></uni-data-select>
				</view>
				<view class="uni-form-item ">
					<text class="title">是否今日关注</text>
					
					<uni-data-select
					      v-model="formData.is_today_important"
					      :localdata="sf"
					    ></uni-data-select>
				</view>
				<view class="uni-form-item ">
					<text class="title">是否倒计时</text>
					
					<uni-data-select
					      v-model="formData.is_countdown"
					      :localdata="sf"
					    ></uni-data-select>
				</view>
				<view class="uni-form-item">
					<text class="title">倒计时目标时间</text>
					<uni-datetime-picker 
						type="datetime" 
						v-model="formData.is_countdown_date"
						placeholder="请选择倒计时目标时间"
					/>
				</view>
				<view class="uni-form-item ">
					<text class="title">分类</text>
					<uni-data-select
					      v-model="formData.classType"
					      :localdata="range2"
					    ></uni-data-select>
				</view>
				<view class="uni-form-item ">
					<text class="title">类型</text>
					<uni-data-select
					      v-model="formData.type"
					      :localdata="range"
					    ></uni-data-select>
					
				</view>
				<view class="uni-form-item ">
					<text class="title">图片</text>
					<textarea class="uni-input" name="imgs" v-model="formData.imgs" placeholder="请输入" maxlength="1000"/>
				</view>
				<image-upload 
					ref="imageUpload"
					title="上传图片" 
					optionalText="小程序会压缩图片，优先外链" 
					maxCount="9"
					uploadPath="notice"
					:modelValue="formData.imgs"
				></image-upload>
				<view class="uni-form-item ">
					<text class="title">url</text>
					<textarea class="uni-input" name="imgs" v-model="formData.url" placeholder="请输入" maxlength="1000"/>
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
					top:'',
					type:'',
					content:'',
					hide:'',
					is_today_important:'',
					classType:'',
					imgs:'',
					url:'',
					is_countdown: '',
					is_countdown_date: ''
					
				},
				search:{
					title:''
				},
				id:'',
				 range: [
					{ value: 'news', text: "新闻类" },
					{ value: 'task', text: "任务类" }
				  ],
			  range2: [
					{ value: '0', text: "通知" },
					{ value: '1', text: "商务" },
					{ value: '2', text: "作品" },
					{ value: '3', text: "演出活动" },
			   ],
			   sf:[
				   { value: '0', text: "否" },
				   { value: '1', text: "是" },
			   ],
			   userInfo:{},
			}
		},
		onLoad(option) {
			let id=option.id
			
			if(id){
				this.getDetail(id)
			}
			const userInfo = uni.getStorageSync('userInfo');
			this.userInfo=JSON.parse(userInfo)
		},
		methods:{
			editInfo(item){
				this.formData= {...item};
			},
			async add() {
				if(!this.formData.title){
					uni.showModal({
						content: `请输入标题`,
						showCancel: false
					})
					return
				}
				if(!this.formData.classType){
					uni.showModal({
						content: `请选择分类`,
						showCancel: false
					})
					return
				}
				const isEdit = !!this.formData._id
				const imgResult = await this.$refs.imageUpload.processImages(isEdit)
				if (imgResult !== null) {
					this.formData.imgs = imgResult
				}
				uni.showLoading({
					title: '处理中...'
				})
				let params = {...this.formData,add_czr:this.userInfo._id}
				uniCloud.callFunction({
					name: 'notice-add',
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
					this.reset()
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
					name: 'notice-add',
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
					this.reset()
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
				if(!this.formData.title){
					uni.showModal({
						content: `请输入标题`,
						showCancel: false
					})
					return
				}
				if(!this.formData.classType){
					uni.showModal({
						content: `请选择分类`,
						showCancel: false
					})
					return
				}
				const isEdit = !!this.formData._id
				const imgResult = await this.$refs.imageUpload.processImages(isEdit)
				if (imgResult !== null) {
					this.formData.imgs = imgResult
				}
				let params = {...this.formData,update_czr:this.userInfo._id}
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'notice-add',
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
			getDetail(id) {
				this.reset()
				this.id=id
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'notice-add',
					data:{
						type:'view',
						id
					}
				}).then((res) => {
					uni.hideLoading()
					this.formData=res.result.data[0] 
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			getList() {
				this.reset()
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'notice-add',
					data:{
						type:'get',
						title:this.search.title
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
			reset(){
				this.formData={
					title:'',
					bz:'',
					top:'',
					type:'',
					content:'',
					hide:'',
					is_today_important:'',
					classType:'',
					imgs:'',
					url:'',
					is_countdown: '',
					is_countdown_date: ''
					
				}
				if (this.$refs.imageUpload) {
					this.$refs.imageUpload.clearImages()
				}
			}
		}
	}
</script>

<style lang="scss">
	 .page{
		 padding: 5px;
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
	   .title{color: cadetblue;}
	   .uni-form-item{margin-bottom: 5px;}
	   .flex-row{display: flex;}
</style>
