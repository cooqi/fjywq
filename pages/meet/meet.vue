<template>
	<view>
		<view class="content" v-if="!userInfo._id">
		     <view class="flex padding justify-center">
		         <button class="cu-btn round bg-red" @click="getUserInfo">立即登录</button>
		     </view>
		 </view>
		<view v-else>
		<button type="primary" @click="choose" style="backgroundColor:#aaa1ce;margin: 10px;">点这里选择你参加过的青宇公开活动</button>
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
				<uni-list-chat v-for="item in my_meet" :key="item._id" :title="item.meet_info.title" :avatar="item.meet_info.img||qy" :note="item.meet_info.content"  >
					<view class="chat-custom-right">
						<text class="chat-custom-text del" @click="del(item)">删除</text>
					</view>
				</uni-list-chat>
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
			try {
				const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
				this.getUserMeetList(this.userInfo._id)
			} catch (e) {
				// error
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
					  str+="宝子，你已经见过青宇了，太让人嫉妒了"
				  }else if(len===this.meetList.length){
					  str+="长姐威武，全勤太优秀了！"
				  }else{
					  str+="你已经打败很多杯杯儿豹豹了，期待下一次见面！"
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
			                            _this.getUserTodoList(res.result.result.result._id)
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
						return {text:item.title+' '+item.time+' '+item.bz,value:item._id}
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
.tips{
	background: rgba(#aaa1ce, 0.2);
	border:2px solid #aaa1ce;
	padding: 10px;margin: 10px;border-radius: 10px;color: #aaa1ce;
}
.notice{
	color: #aaa1ce;font-size: 13px;text-align: center;margin-top: 5px;
}
.popup-content{
	padding:0 10px;
}
.del{
	font-size: 13px;color: orange
}
</style>
