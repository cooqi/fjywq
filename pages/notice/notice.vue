<template>
	<view class="content-box">
		<view class="tabs">
			<uni-segmented-control :current="current" :values="items"
			 @clickItem="onClickItem" />
		 </view>
		<uni-card @click="edit(item._id)" :sub-title="item.top?'置顶':item.is_today_important==='1'?'今日关注':''" :class="[item.is_today_important==='1'?'today':'']" v-for="item in list" :key="item._id" :title="item.title"  :extra="item.type" >
		
			<!-- 倒计时显示 -->
			<view v-if="item.is_countdown === '1' && item.is_countdown_date" class="countdown-box">
				<view class="countdown-label">距离目标时间{{ item.is_countdown_date }}还有：</view>
				<view class="countdown-time">{{ getCountdown(item.is_countdown_date) }}</view>
			</view>
		
			<view class="content"  v-if="item.content">
				<view class="uni-body" user-select v-html="item.content"></view>
			</view>
			<view class="imgs" v-if="item.imgs">
				<image @click="preImg(item.imgs,index)" v-for="(img,index) in item.imgs.split(';')" class="img" :src="img" mode="aspectFill"></image>
			</view>
			<view class="uni-body bz" v-html="item.bz" v-if="item.bz"></view>
			
			<uni-link :href="item.url" :text="item.url"></uni-link>
			<view slot="actions" class="card-actions" v-if="item.type==='task'">
				<view class="card-actions-item" @click="addTask(item)">
					<uni-icons type="heart" size="18" color="pink"></uni-icons>
					<text class="card-actions-item-text">添加到我的任务</text>
				</view>
			</view>
		
		</uni-card>
		<view v-if="!list.length&&!loading" class="tips">暂无数据</view>
		<view class="edit" @click="edit()" v-if="userInfo._id==='68b547748a5c782a2b48ac30'">+</view>
		
	</view>
</template>

<script>

	export default {
		data() {
			return {
				list:[],
				url:'',
				items: ['通知公告', '存续商务','在/待播作品','演出/活动'],
				current: 0,
				loading:false,
				userInfo:{
					_id:''
				},
				timer: null // 定时器
			}
		},
		onShareAppMessage: function () {
		   return {
		     title: '宇青青宇全肯定',
		     path: '/pages/rili/rili'
		   }
		 },
		 onShareTimeline: function () {
		    return {
		      title: '宇青青宇全肯定'
		    }
		  },
		  onLoad() {
		  	this.get()
			try {
				const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
			} catch (e) {
				// error
			}
			// 启动定时器，每秒更新倒计时
			this.startCountdownTimer()
		  },
		  onUnload() {
		  	// 清除定时器
		  	if (this.timer) {
				clearInterval(this.timer)
			}
		  },
		  onPullDownRefresh() {
		  	this.get()
		  },
		methods: {
			edit(id){
				if(this.userInfo._id!=='68b547748a5c782a2b48ac30') return
				id=id||''
				uni.navigateTo({
					url:`/pages/edit/notice?id=${id}`
				});
			},
			onClickItem(e){
				if (this.current !== e.currentIndex) {
					this.current = e.currentIndex
					this.get()
				}
			},
			
			get() {
				uni.showLoading({
					title: '处理中...'
				})
				this.loading=true
				uniCloud.callFunction({
					name: 'notice',
					data:{
						type:'get',
						classType:this.current.toString()
					}
				}).then((res) => {
					uni.hideLoading()
					uni.stopPullDownRefresh();
					this.list=res.result.data
					this.loading=false
				}).catch((err) => {
					uni.hideLoading()
					uni.stopPullDownRefresh();
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					this.loading=false
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
			},
			// 计算倒计时
			getCountdown(targetDate) {
				if (!targetDate) return ''
				
				const now = new Date().getTime()
				const target = new Date(targetDate).getTime()
				const diff = target - now
				
				if (diff <= 0) {
					return '已到达目标时间'
				}
				
				const days = Math.floor(diff / (1000 * 60 * 60 * 24))
				const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
				const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
				const seconds = Math.floor((diff % (1000 * 60)) / 1000)
				
				let result = ''
				if (days > 0) {
					result += `${days}天`
				}
				if (hours > 0 || days > 0) {
					result += `${hours}小时`
				}
				if (minutes > 0 || hours > 0 || days > 0) {
					result += `${minutes}分钟`
				}
				result += `${seconds}秒`
				
				return result
			},
			// 启动倒计时定时器
			startCountdownTimer() {
				this.timer = setInterval(() => {
					// 强制更新视图
					this.$forceUpdate()
				}, 1000)
			}
		}
	}
</script>

<style lang="scss">
.content-box {
	padding: 30px 0 10px;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	min-height: 100vh;
}
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
			color: #140929;
			margin-left: 5px;
		}

	.content {
		border-bottom:1px solid #ccc;
		padding-bottom:10px ;
		color: #010a09;
	}
	.bz{
		color: #f7b606;
		padding: 5px 0;
	}
	.title {
		font-weight: bold;
		align-items: center;
		padding: 20px 0px;
		font-size: 20px;
	}

	.tips {
		color: #fff;
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
	.uni-card {
		background: linear-gradient(135deg, #ffffff60 0%, #cff8f59f 30%, #e6cffc 100%)!important;
		border:0!important;
		border-radius: 18px!important;
	}
	.uni-card__header-extra-text{
		color: #fff!important;
	}
	.uni-card .uni-card__header .uni-card__header-content .uni-card__header-content-subtitle {
		width:50px;text-align:center;background: #a9a9d9;color: #180e24!important;border-radius: 2px;padding: 2px;
	}
	.today{
		.uni-card .uni-card__header .uni-card__header-content .uni-card__header-content-subtitle{
			background: #31eee0;
			color: #0e2424!important;
		}
	}
	.tabs{
		padding: 0 10px;
		position: fixed;
		top:5px;
		left: 0;
		width: 100%;
		z-index: 99;
		
	}
	.segmented-control {
		.segmented-control__text{
			color: #3f2649!important;
		}
		.segmented-control__item {
			background: #c4aff3;
			border-color:#f7f7f7!important;
		}
		.segmented-control__item--button--active{
			background: linear-gradient(to bottom,#baf5f1,#d6ccfa )!important;
		}
		.segmented-control__item--button--first{
			border-top-left-radius: 18px!important;
			border-bottom-left-radius: 18px!important;
		}
		.segmented-control__item--button--last{
			border-top-right-radius: 18px!important;
			border-bottom-right-radius: 18px!important;
		}
	}
	
	.tips{
		text-align: center;
		color: #fff;
		padding: 20px;
	}
	.edit{
		position: fixed;
		right: 5px;bottom: 30px;border-radius: 100%;width: 38px;height: 38px;background: #aaffff;color: #926eff;font-size: 12px;line-height: 38px;text-align: center;box-shadow: 0 0 13px 5px rgba(0,0,0,.1);
	}
	
	.countdown-box {
		background: linear-gradient(135deg, #fff5e6 0%, #ffe6f0 100%);
		border-radius: 12rpx;
		padding: 20rpx;
		margin: 16rpx 0;
		border-left: 6rpx solid #ff9800;
		
		.countdown-label {
			font-size: 24rpx;
			color: #666;
			margin-bottom: 8rpx;
		}
		
		.countdown-time {
			font-size: 32rpx;
			font-weight: bold;
			color: #ff6b35;
			font-family: 'Courier New', monospace;
		}
	}
</style>
