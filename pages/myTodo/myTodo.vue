<template>

	   <view class="content" v-if="!userInfo._id">
	        <view class="flex padding justify-center">
	            <button class="cu-btn round bg-red" @click="getUserInfo">立即登录</button>
	        </view>
	    </view>
	<view class="content">
		<view v-for="(item,index) in todoList" :key="item.value">
			<uni-data-checkbox  v-model="todo" max="1" multiple :localdata="[item]" @change="change" >
				<template #actions>
					<button class="mini-btn" type="warn" size="mini" @click="del(item)">删除</button>
				</template>
			</uni-data-checkbox>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				todo:[],
				userInfo:{},
				todoList:[],
				originTodoList:[],
				
			}
		},
		onLoad() {
			
			try {
				const userInfo = uni.getStorageSync('userInfo');
				console.log('userInfo',userInfo)
				this.userInfo=JSON.parse(userInfo)
				this.getUserTodoList(this.userInfo._id)
			} catch (e) {
				// error
			}
		},
		onPullDownRefresh() {
			this.getUserTodoList(this.userInfo._id)
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
		methods: {
			getUserInfo() {    
				const _this = this
			    uni.getUserProfile({desc: '用于完善会员资料',success: (result) => {
			            _this.userInfo = result.userInfo
						console.log(_this.userInfo)
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
				console.log('login',res)
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
			updateList(data){
				this.originTodoList=data
				this.todoList=data.map(item=>{
					return {text:item.title,value:item._id,disabled:item.isComplete==='1'}
				})
				this.todo=data.filter(item=>item.isComplete==='1').map(item=>item._id)
	
			},
			getUserTodoList(id){
				uni.showLoading({title: '加载中' });
				uniCloud.callFunction({
					name: 'user-todo',
					data: {
						userID: id,
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
				let res=this.originTodoList.find(item=>item._id===val)
				console.log('res',res,e)
				let data=JSON.parse(JSON.stringify(res))
				delete data._id
				data.isComplete='1'
				
				uniCloud.callFunction({
					name: 'user-todo',
					data: {
						id:val,
						data,
						type:'update',
						userID:this.userInfo._id
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
								name: 'user-todo',
								data: {
									id:item.value,
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
			pageTo(url){
				uni.navigateTo({
					url
				});
			}
		}
	}
</script>

<style lang="scss">
	.content {
		padding-bottom: 30px;
		.checklist-box{
			width: 100%;
			padding: 10px;
			&.is-checked {
				.checklist-text{
					text-decoration-line: line-through;
				}
				
			}
		}
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
		margin-top: 20px;
	}

</style>
