<template>
	<view class="content">
	
		<uni-card :sub-title="item.top?'置顶':item.is_today_important?'今日关注':''" :class="[item.is_today_important?'today':'']" v-for="item in list" :key="item._id" :title="item.title"  :extra="item.type" >
		
			<view class="content"  v-if="item.content">
				<text class="uni-body" user-select>{{item.content}}</text>
			</view>
			<view class="imgs" v-if="item.imgs">
				<image @click="preImg(item.imgs,index)" v-for="(img,index) in item.imgs.split(';')" class="img" :src="img" mode="aspectFill"></image>
			</view>
			<text class="uni-body bz">{{item.bz}}</text>
			<uni-link :href="item.url" :text="item.url"></uni-link>
			<view slot="actions" class="card-actions" v-if="item.type==='task'">
				<view class="card-actions-item" @click="addTask(item)">
					<uni-icons type="heart" size="18" color="#999"></uni-icons>
					<text class="card-actions-item-text">添加到我的任务</text>
				</view>
			</view>
		</uni-card>
		
	</view>
</template>

<script>

	export default {
		data() {
			return {
				list:[],
				url:''
			}
		},
		onShareAppMessage: function () {
		   return {
		     title: '宇青青宇全肯定',
		     path: '/pages/cloudFunction/cloudFunction'
		   }
		 },
		 onShareTimeline: function () {
		    return {
		      title: '宇青青宇全肯定'
		    }
		  },
		  onLoad() {
		  	this.get()
		  },
		  onPullDownRefresh() {
		  	this.get()
		  },
		methods: {
			
			get() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'notice',
					data:{
						type:'get'
					}
				}).then((res) => {
					uni.hideLoading()
					uni.stopPullDownRefresh();
					this.list=res.result.data
					console.log(res)
				}).catch((err) => {
					uni.hideLoading()
					uni.stopPullDownRefresh();
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			lower(){
				alert(1)
			},
			 addTask(item){
				uni.showLoading({
					title: '处理中...'
				})
				try {
					const user = uni.getStorageSync('userInfo');
					console.log('user',user)
					if(!user){
						uni.hideLoading()
						uni.showModal({
							content: `还未登录请先去登录`,
							showCancel: false
						})
						return
					}
					let userInfo=JSON.parse(user)
					uniCloud.callFunction({
						name: 'user-todo',
						data: {
							type: 'add',
							userID: userInfo._id,
							title:item.title,
							taskID:item._id
						}
					}).then((res) => {
						console.log('res',res)
						uni.hideLoading()
						if(res.result.code){
							uni.showModal({
								content: `${res.result.message}`,
								showCancel: false
							})
						}else{
							uni.showModal({
								content: `成功添加为我的任务，可以去我的todo里查看`,
								showCancel: false
							})
						}
						
					}).catch((err) => {
						uni.hideLoading()
						uni.showModal({
							content: `添加数据失败，错误信息为：${err.message}`,
							showCancel: false
						})
						console.error(err)
					})
				} catch (e) {
					uni.hideLoading()
					uni.showModal({
						content: `还未登录请先去登录`,
						showCancel: false
					})
				}
				
			},
			actionsClick(url){
				this.url=url
			},
			preImg(imgs,i){
				// 预览图片
				const urls=imgs.split(';')||[]
						uni.previewImage({
							urls ,
							current :i,
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
			}
		}
	}
</script>

<style lang="scss">
	.card-actions {
			display: flex;
			flex-direction: row;
			justify-content: space-around;
			align-items: center;
			height: 45px;
			border-top: 1px #eee solid;
		}
		
		.card-actions-item {
			display: flex;
			flex-direction: row;
			align-items: center;
		}
		.card-actions-item-text {
			font-size: 12px;
			color: #666;
			margin-left: 5px;
		}

	.content {
		border-bottom:1px solid #ccc;
		padding: 10px 0;
	}
	.bz{
		color: #aaa1ce;
		padding: 5px 0;
	}
	.title {
		font-weight: bold;
		align-items: center;
		padding: 20px 0px;
		font-size: 20px;
	}

	.tips {
		color: #999999;
		font-size: 14px;
		padding: 20px 30px;
	}

	.btn-list {
		padding: 0px 30px;
	}

	.btn-list button {
		margin-bottom: 20px;
	}

	.upload-preview {
		width: 100%;
	}

	#tip {
		width: 750rpx;
		align-items: center;
	}
	.imgs{
		display: flex;
		flex-wrap: wrap;
		.img{
			width: 60px;height: 60px;margin: 10px;
		}
	}
	.uni-card .uni-card__header .uni-card__header-content .uni-card__header-content-subtitle {
		width:50px;text-align:center;background: #aaa1ce;color: #000!important;border-radius: 2px;padding: 2px;
	}
	.today{
		.uni-card .uni-card__header .uni-card__header-content .uni-card__header-content-subtitle{
			background: #b9f0ff;
		}
	}
</style>
