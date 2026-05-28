<template>
	<view class="page-container">
		<view class="content" v-if="!userInfo._id">
		     <view class="flex padding justify-center">
		         <button class="cu-btn round bg-red" @click="getUserInfo">立即登录</button>
		     </view>
		 </view>
		<view v-else>
		<button type="primary" @click="choose" style="backgroundColor:#aaa1ce;margin: 10px;">点这里选择你参加过的宇青公开活动</button>
		<view class="tips">{{tips}}</view>
		<uni-popup ref="popup" background-color="#fff" type="bottom" border-radius="10px 10px 0 0">
			<view class="popup-content" >
				<view v-for="(item,index) in meetList" :key="item.value">
					<uni-data-checkbox  v-model="value" max="1" multiple :localdata="[item]" @change="change" :disabled="value.indexOf(item.value)>-1">
						
					</uni-data-checkbox>
				</view>
				<view class="notice">如缺少场次，请联系我们补充</view>
			</view>
		</uni-popup>
		<uni-list :border="true">
		
				<uni-list-item v-for="item in my_meet" :key="item._id" :title="item.meet_info.title" thumb-size="lg" :thumb="item.meet_info.img||qy" :note="item.meet_info.content"  >
					
					
					<template v-slot:footer>
					<view class="chat-custom-right">
						<text class="chat-custom-text del" @click="del(item)">删除</text>
					</view>
					</template>
				</uni-list-item>
		</uni-list>
		</view>
	</view>
</template>

<script>
	import qy from '@/static/userImg/qy.jpg'
	export default {
		data() {
			return {
				meetList:[],
				my_meet:[],
				qy,
				userInfo:{},
				value:[]
			}
		},
		onLoad() {
			this.getList()
			const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
				if(this.userInfo._id){
					this.getUserMeetList(this.userInfo._id)
				}else{
					this.getUserInfo()
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
		  onPullDownRefresh() {
		  	this.getUserMeetList(this.userInfo._id)
		  },
		  computed:{
			  tips(){
				  
				  let len =this.my_meet.length
				  let str=`你已点亮${len}场见面会；`;
				 
				  if(len===0){
					   str="宝子你还未点亮任何见面场次，请添加，如果我们缺少你看得场次，请联系我们！"
				  }else if(len>0&&len<3){
					  str+="宝子，你已经见过宇青了，太让人嫉妒了"
				  }else if(len===this.meetList.length){
					  str+="长姐威武，全勤太优秀了！"
				  }else{
					  str+="你已经打败很多杯杯儿了，期待下一次见面！"
				  }
				  return str
			  }
		  },
		methods: {
			choose(){
				this.$refs.popup.open()
			},
			getUserInfo() {
				const _this = this
			    uni.getUserProfile({desc: '用于完善会员资料',success: (result) => {
			            _this.userInfo = result.userInfo
			            _this.wxLogin()
			        },fail: () => {
			            uni.hideLoading();
			            uni.showModal({content: '获取用户信息失败',showCancel: false
			            })
			        }
			    })
			},
			wxLogin() {
				const _this = this
			    uni.showLoading({title: '加载中' });
			
			    uni.login({provider: 'weixin',success: (res) => {            // 获取 code
			
			            if(res.code) {
			                uniCloud.callFunction({
								name: 'user',
								data: {
									action: 'code2Session',
									js_code: res.code,
									user_info: _this.userInfo,
								},
								success: (res) => {
									console.log('云函数返回的值：：：：', res.result)
			                        uni.hideLoading();
									if(res.result.result.result._id) {
			                            uni.setStorageSync('userInfo', JSON.stringify(res.result.result.result))
										_this.userInfo=res.result.result.result
			                            _this.getUserMeetList(res.result.result.result._id)
			                        }
			                    },fail: (err) => {
			                        uni.hideLoading();
									console.log('云函数调用失败',err)
			                    }
			                })
			            }
			        }
			    })
			},
			getList() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'meet'
				}).then((res) => {
					uni.hideLoading()
					this.meetList=res.result.data.map(item=>{
						let bz=item.bz||''
						return {text:item.title+' '+item.time+' '+bz,value:item._id}
					})
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			updateList(data){
				this.my_meet=data.map(item=>{
					let info=item.meetID[0]
					info.content=`${info.time} ${info.address} ${info.bz||''}`
					item.meet_info=info
					return item
				})
				this.value=this.my_meet.map(item=>item.meet_info._id)
			},
			getUserMeetList(userid){
				uni.showLoading({title: '加载中' });
				uniCloud.callFunction({
					name: 'user-meet',
					data: {
						userID: userid,
						type:'get'
					},
					success: (res) => {
				        uni.hideLoading();
						uni.stopPullDownRefresh();
						this.updateList(res.result.data)
				    },fail: (err) => {
				        uni.hideLoading();
						uni.stopPullDownRefresh();
						console.log('云函数调用失败',err)
				    }
				})
			},
			change(e){
				console.log(e)
				let val=e.detail.value[0]
				
				uni.showLoading({title: '加载中',mask:true });
				
				
				uniCloud.callFunction({
					name: 'user-meet',
					data: {
						userID: this.userInfo._id,
						meetID:val,
						type:'add'
					},
					success: (res) => {
				        uni.hideLoading();
						this.updateList(res.result.data)
				    },fail: (err) => {
				        uni.hideLoading();
						console.log('云函数调用失败',err)
				    }
				})
			},
			del(item){
				const _this=this
				uni.showModal({
					title: '提示',
					content: '确认删除',
					success: function (res) {
						if (res.confirm) {
							uni.showLoading({title: '加载中',mask:true });
							uniCloud.callFunction({
								name: 'user-meet',
								data: {
									id:item._id,
									type:'del',
									userID:_this.userInfo._id
								},
								success: (res) => {
							        uni.hideLoading();
									_this.updateList(res.result.data)
							    },fail: (err) => {
							        uni.hideLoading();
									console.log('云函数调用失败',err)
							    }
							})
						} else if (res.cancel) {
							console.log('用户点击取消');
						}
					}
				});
				
			},
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(135deg, #f8cff1 0%, #b4ecd2 100%);
	padding: 20rpx;
}

// 选择按钮样式优化
button[type="primary"] {
	background: linear-gradient(135deg, #aaa1ce 0%, #9b8fbf 100%);
	border: none;
	border-radius: 24rpx;
	padding: 24rpx;
	font-size: 30rpx;
	font-weight: 600;
	color: #fff;
	box-shadow: 0 8rpx 24rpx rgba(170, 161, 206, 0.4);
	transition: all 0.3s ease;
	
	&:active {
		transform: scale(0.98);
		box-shadow: 0 4rpx 12rpx rgba(170, 161, 206, 0.3);
	}
}

// 提示框样式优化
.tips {
	background: rgba(255, 255, 255, 0.9);
	backdrop-filter: blur(10rpx);
	border-radius: 16rpx;
	padding: 24rpx;
	margin: 20rpx 0;
	color: #666;
	font-size: 26rpx;
	line-height: 1.6;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	border-left: 6rpx solid #aaa1ce;
}

// 弹出层内容优化
.popup-content {
	padding: 20rpx;
	max-height: 70vh;
	overflow-y: auto;
}

// 注意事项样式优化
.notice {
	color: #999;
	font-size: 24rpx;
	text-align: center;
	padding: 24rpx 0;
	background: linear-gradient(135deg, rgba(170, 161, 206, 0.05) 0%, rgba(170, 161, 206, 0.1) 100%);
	border-radius: 12rpx;
	margin-top: 16rpx;
}

// 列表项优化
.uni-list-item {
	background: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(10rpx);
	border-radius: 16rpx;
	margin: 12rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
	
	&:active {
		transform: scale(0.98);
	}
}

// 删除按钮样式优化
.chat-custom-right {
	display: flex;
	align-items: center;
}

.del {
	font-size: 24rpx;
	color: #ff6b6b;
	font-weight: 500;
	padding: 8rpx 16rpx;
	background: rgba(255, 107, 107, 0.1);
	border-radius: 12rpx;
	transition: all 0.3s ease;
	
	&:active {
		background: rgba(255, 107, 107, 0.2);
	}
}

// 未登录状态优化
.flex {
	margin-top: 200rpx;
}

.cu-btn {
	width: 280rpx;
	border-radius: 40rpx;
	box-shadow: 0 8rpx 24rpx rgba(255, 0, 0, 0.3);
}
</style>
