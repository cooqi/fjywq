<template>
	<view class="page-container">
	

	   <view class="content" v-if="!userInfo._id">
	        <view class="flex padding justify-center">
	            <button class="cu-btn round bg-red" @click="getUserInfo">立即登录</button>
	        </view>
	    </view>
	<view class="content">
		<!-- 添加待办 -->
		<view v-if="userInfo._id" class="add-box">
			<input class="add-input" type="text" v-model="newTodoTitle" maxlength="30"
				placeholder="请输入待办内容（未办理最多10条）" placeholder-class="add-placeholder" />
			<button class="add-btn" type="primary" size="mini" @click="addTodo">添加</button>
		</view>
		<view v-for="item in todoList" :key="item.value">
			<uni-data-checkbox  v-model="todo" max="1" multiple :localdata="[item]" @change="change" >
				<template #actions>
					<button class="mini-btn" type="warn" size="mini" @click="del(item)">删除</button>
				</template>
			</uni-data-checkbox>
		</view>
	</view>
	
	<!-- 我有话说按钮 -->
	<!-- <view v-if="userInfo._id" class="suggestion-btn" @click="goToSuggestion">
		<text>我有话说</text>
	</view> -->
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
				newTodoTitle:'',
				
			}
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo');
				console.log('userInfo',userInfo)
				this.userInfo=JSON.parse(userInfo)
				if(this.userInfo._id){
					this.getUserTodoList(this.userInfo._id)
				}else{
					this.getUserInfo()
				}
		
		},
		
		onPullDownRefresh() {
			this.getUserTodoList(this.userInfo._id)
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
										_this.userInfo=res.result.result.result
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
			addTodo(){
				const title=(this.newTodoTitle||'').trim()
				if(!title){
					uni.showToast({title:'请输入待办内容',icon:'none'})
					return
				}
				// 未办理数量前端预校验，最多10条
				const uncompleted=this.originTodoList.filter(item=>item.isComplete==='0').length
				if(uncompleted>=10){
					uni.showToast({title:'未办理待办已达10条上限，请先完成后再添加',icon:'none'})
					return
				}
				uni.showLoading({title:'加载中',mask:true});
				uniCloud.callFunction({
					name:'user-todo',
					data:{
						type:'add',
						userID:this.userInfo._id,
						title
					},
					success:(res)=>{
						uni.hideLoading();
						const r=res.result
						if(r&&r.code){
							uni.showToast({title:r.message||'添加失败',icon:'none'})
							return
						}
						this.newTodoTitle=''
						this.updateList(r.data)
					},
					fail:(err)=>{
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
			},
			// 跳转到建议页面
			goToSuggestion() {
				uni.navigateTo({
					url: '/pages/myTodo/suggestion'
				})
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 1px
}
	.content {
		padding-bottom: 30px;
		.add-box{
			display: flex;
			align-items: center;
			margin: 10px 10px 15px;
			padding: 10px;
			background: rgba(255, 255, 255, 0.7);
			border-radius: 16rpx;
			box-shadow: 0 4rpx 16rpx rgba(139, 92, 246, 0.1);
			.add-input{
				flex: 1;
				height: 64rpx;
				line-height: 64rpx;
				font-size: 28rpx;
				padding: 0 20rpx;
				background: #ffffff;
				border-radius: 12rpx;
				border: 1rpx solid #e0d5f7;
			}
			.add-btn{
				margin-left: 16rpx;
				flex-shrink: 0;
			}
		}
		.add-placeholder{
			color: #b3a6cc;
			font-size: 26rpx;
		}
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
	
	.suggestion-btn {
		position: fixed;
		right: 20rpx;
		bottom: 30rpx;
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		color: #fff;
		padding: 20rpx 40rpx;
		border-radius: 50rpx;
		font-size: 28rpx;
		box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.3);
		transition: all 0.3s ease;
		z-index: 99;
		
		&:active {
			transform: scale(0.95);
		}
	}

</style>
