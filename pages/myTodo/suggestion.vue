<template>
	<view class="page-container">
		
		<!-- ================= 普通用户视图 ================= -->
		<template v-if="!isAdmin">
			<!-- 提交建议部分 -->
			<view class="submit-section">
				<view class="section-title">
					<uni-icons type="compose" size="20" color="#8b5cf6"></uni-icons>
					<text>我有话说</text>
				</view>
				<view class="form-box">
					<textarea 
						class="suggestion-textarea" 
						v-model="suggestionContent" 
						placeholder="请输入..."
						:maxlength="1000"
						auto-height
					/>
					<view class="word-count">{{ suggestionContent.length }}/1000</view>
					<button 
						class="submit-btn" 
						:class="{ 'is-disabled': !suggestionContent.trim() }"
						@click="submitSuggestion" 
						:disabled="!suggestionContent.trim()"
					>
						提交
					</button>
				</view>
			</view>
			
			<!-- 查看回复部分 (只显示已回复的) -->
			<view class="reply-section"  v-if="replyList.length > 0">
				<view class="section-title">
					<uni-icons type="chat" size="20" color="#8b5cf6"></uni-icons>
					<text>管理员回复</text>
				</view>
				
				
				
				<view class="reply-list">
					<view v-for="item in replyList" :key="item._id" class="reply-card">
						<view class="reply-header">
							<text class="reply-time">{{ formatTime(item.createTime) }}</text>
						</view>
						<view class="reply-content">
							<view class="question-label">我的：</view>
							<view class="question-text">{{ item.content }}</view>
							<view class="answer-label">管理员回复：</view>
							<rich-text class="answer-text" :nodes="item.answer"></rich-text>
						</view>
					</view>
				</view>
				
				
			</view>
		</template>


		<!-- ================= 管理员视图 ================= -->
		<template v-if="isAdmin">
			<view class="admin-section">
				<view class="section-title admin-title">
					<uni-icons type="gear" size="22" color="#ef4444"></uni-icons>
					<text>管理员工作台 (待处理反馈)</text>
				</view>
				
				<view v-if="loading" class="loading"><text>加载中...</text></view>
				
				<view v-else-if="replyList.length > 0" class="admin-list">
					<view v-for="item in replyList" :key="item._id" class="admin-card">
						<!-- 用户提问 -->
						<view class="user-question">
							<view class="q-header">
								<text class="q-time">{{ formatTime(item.createTime) }}</text>
							</view>
							<text class="q-content">{{ item.content }}</text>
						</view>
						
						<!-- 状态选择 -->
						<view class="status-selector">
							<text class="selector-label">处理状态：</text>
							<view class="status-tags">
								<view 
									v-for="opt in statusOptions" 
									:key="opt.value"
									class="status-tag"
									:class="{ active: item.currentStatus === opt.value }"
									:style="{ 
										borderColor: opt.color, 
										color: item.currentStatus === opt.value ? '#fff' : opt.color, 
										background: item.currentStatus === opt.value ? opt.color : 'transparent' 
									}"
									@click="selectStatus(item, opt.value)"
								>
									{{ opt.label }}
								</view>
							</view>
						</view>
						
						<!-- 回复输入 -->
						<view class="reply-input-box">
							<textarea 
								class="reply-textarea" 
								:value="item.replyText" 
								@input="item.replyText = $event.detail.value"
								placeholder="请输入回复内容..."
								maxlength="500"
							/>
						</view>
						
						<button class="admin-submit-btn" @click="submitAdminAction(item)">
							提交处理
						</button>
					</view>
				</view>
				
				<view v-else class="empty-reply">
					<uni-icons type="checkbox" size="40" color="#10b981"></uni-icons>
					<text>太棒了，暂无待处理的反馈！</text>
				</view>
			</view>
		</template>

	</view>
</template>

<script>
	import { hasSuggestionPermission } from '@/common/js/permission.js'
	
	export default {
		data() {
			return {
				suggestionContent: '',
				replyList: [],
				loading: false,
				userInfo: {},
				isAdmin: false,
				statusOptions: [
					{ value: 'todo', label: '后续处理', color: '#f59e0b' },
					{ value: 'rejected', label: '拒绝', color: '#ef4444' },
					{ value: 'Finish', label: '完成', color: '#10b981' }
				]
			}
		},
		onLoad() {
			this.checkLoginAndGetList()
		},
		onPullDownRefresh() {
			this.getReplyList()
		},
		methods: {
			checkLoginAndGetList() {
				try {
					const userInfoStr = uni.getStorageSync('userInfo')
					if (!userInfoStr) throw new Error('未登录')
					
					this.userInfo = typeof userInfoStr === 'string' ? JSON.parse(userInfoStr) : userInfoStr
					if (!this.userInfo._id) throw new Error('用户ID无效')
									
					// 判断是否有管理员权限
					this.isAdmin = hasSuggestionPermission(this.userInfo, 'reply')
					this.getReplyList()
				} catch (e) {
					uni.showModal({
						title: '提示',
						content: '请先登录后再使用',
						showCancel: false,
						success: () => uni.navigateBack()
					})
				}
			},
			
			// 普通用户提交
			submitSuggestion() {
				const content = this.suggestionContent.trim()
				if (!content) return uni.showToast({ title: '请输入内容', icon: 'none' })
				
				uni.showLoading({ title: '提交中...', mask: true })
				uniCloud.callFunction({
					name: 'suggestion',
					data: { type: 'add', userId: this.userInfo._id, content }
				}).then((res) => {
					uni.hideLoading()
					if (res.result.code === 200) {
						uni.showToast({ title: '提交成功', icon: 'success' })
						this.suggestionContent = ''
						setTimeout(() => this.getReplyList(), 500)
					} else {
						uni.showToast({ title: res.result.message || '提交失败', icon: 'none' })
					}
				}).catch(() => {
					uni.hideLoading()
					uni.showToast({ title: '网络异常', icon: 'none' })
				})
			},
			
			// 获取列表 (云函数已做好数据隔离，前端直接渲染)
			getReplyList() {
				this.loading = true
				uniCloud.callFunction({
					name: 'suggestion',
					data: { 
						type: 'getAll', 
						userId: this.userInfo._id,
						userInfo: this.userInfo // 传递用户信息用于权限判断
					}
				}).then((res) => {
					uni.stopPullDownRefresh()
					if (res.result.code === 200) {
						const list = res.result.data || []
						if (this.isAdmin) {
							// 管理员：云函数返回的已是“未回复”数据，只需初始化表单状态
							this.replyList = list.map(item => ({
								...item,
								replyText: '',
								currentStatus: item.status || 'todo'
							}))
						} else {
							// 普通用户：云函数返回的已是“自己且已回复”的数据，直接赋值
							this.replyList = list
						}
					} else {
						uni.showToast({ title: res.result.message || '查询失败', icon: 'none' })
					}
				}).catch(() => {
					uni.stopPullDownRefresh()
					uni.showToast({ title: '网络异常', icon: 'none' })
				}).finally(() => {
					this.loading = false
				})
			},
			
			// 管理员：选择状态
			selectStatus(item, status) {
				item.currentStatus = status
			},
			
			// 管理员：提交回复和状态
			submitAdminAction(item) {
				if (!item.replyText.trim() && item.currentStatus==='Finish') {
					return uni.showToast({ title: '请输入回复内容', icon: 'none' })
				}
				
				uni.showLoading({ title: '处理中...', mask: true })
				uniCloud.callFunction({
					name: 'suggestion',
					data: {
						type: 'adminReply',
						userId: this.userInfo._id, // 传入userId用于云函数权限校验
						userInfo: this.userInfo, // 传递用户信息用于角色权限判断
						id: item._id,
						answer: item.replyText.trim(),
						status: item.currentStatus
					}
				}).then((res) => {
					uni.hideLoading()
					if (res.result.code === 200) {
						uni.showToast({ title: '处理成功', icon: 'success' })
						// 延迟刷新，让该卡片从列表中移除
						setTimeout(() => this.getReplyList(), 500)
					} else {
						uni.showToast({ title: res.result.message || '处理失败', icon: 'none' })
					}
				}).catch(() => {
					uni.hideLoading()
					uni.showToast({ title: '网络异常', icon: 'none' })
				})
			},
			
			formatTime(time) {
				if (!time) return ''
				const date = new Date(time)
				const pad = (n) => String(n).padStart(2, '0')
				return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
			}
		}
	}
</script>


<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx;
	box-sizing: border-box;
}

/* 通用区块样式 */
.submit-section, .reply-section, .admin-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 24rpx;
	padding: 30rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
	
	.section-title {
		display: flex;
		align-items: center;
		gap: 12rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 24rpx;
		
		&.admin-title {
			color: #ef4444;
		}
	}
}

/* ================= 普通用户样式 ================= */
.submit-section {
	.form-box {
		.suggestion-textarea {
			width: 100%;
			min-height: 240rpx;
			padding: 20rpx;
			background: #f8f9fa;
			border: 2rpx solid #eee;
			border-radius: 12rpx;
			font-size: 28rpx;
			line-height: 1.6;
			box-sizing: border-box;
		}
		.word-count {
			text-align: right;
			font-size: 24rpx;
			color: #999;
			margin: 10rpx 0 20rpx;
		}
		.submit-btn {
			width: 100%;
			height: 88rpx;
			line-height: 88rpx;
			background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
			color: #fff;
			border-radius: 44rpx;
			font-size: 30rpx;
			font-weight: 600;
			border: none;
			box-shadow: 0 8rpx 20rpx rgba(139, 92, 246, 0.3);
			&::after { border: none; }
			&[disabled], &.is-disabled {
				opacity: 0.5;
				background: #d1d5db;
				box-shadow: none;
				color: #fff;
			}
		}
	}
}

.reply-section {
	.loading, .empty-reply {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 80rpx 0;
		color: #999;
		font-size: 28rpx;
		gap: 20rpx;
	}
	.reply-list {
		.reply-card {
			background: linear-gradient(135deg, #fff9f0 0%, #fff0f5 100%);
			border-radius: 16rpx;
			padding: 24rpx;
			margin-bottom: 20rpx;
			border-left: 6rpx solid #ff9800;
			&:last-child { margin-bottom: 0; }
			.reply-header {
				margin-bottom: 16rpx;
				.reply-time { font-size: 24rpx; color: #999; }
			}
			.reply-content {
				.question-label, .answer-label {
					font-size: 26rpx; color: #666; margin-bottom: 8rpx; font-weight: 600;
				}
				.question-text {
					font-size: 28rpx; color: #333; line-height: 1.6; margin-bottom: 20rpx;
					padding-left: 20rpx; border-left: 4rpx solid #e0e0e0;
				}
				.answer-text {
					display: block; font-size: 28rpx; color: #d84315; line-height: 1.6;
					background: rgba(255, 255, 255, 0.7); padding: 16rpx 20rpx; border-radius: 8rpx;
				}
			}
		}
	}
}

/* ================= 管理员工作台样式 ================= */
.admin-section {
	.admin-list {
		.admin-card {
			background: #fff;
			border: 2rpx solid #fee2e2;
			border-radius: 16rpx;
			padding: 24rpx;
			margin-bottom: 24rpx;
			box-shadow: 0 2rpx 10rpx rgba(239, 68, 68, 0.05);
			&:last-child { margin-bottom: 0; }
			
			.user-question {
				margin-bottom: 24rpx;
				.q-header {
					display: flex;
					justify-content: space-between;
					margin-bottom: 12rpx;
					.q-time { font-size: 24rpx; color: #999; }
				}
				.q-content {
					font-size: 30rpx;
					color: #1f2937;
					line-height: 1.6;
					font-weight: 500;
				}
			}
			
			.status-selector {
				margin-bottom: 24rpx;
				.selector-label {
					font-size: 26rpx;
					color: #6b7280;
					margin-bottom: 12rpx;
					display: block;
				}
				.status-tags {
					display: flex;
					gap: 16rpx;
					flex-wrap: wrap;
					.status-tag {
						padding: 8rpx 24rpx;
						border-radius: 30rpx;
						font-size: 24rpx;
						border: 2rpx solid;
						transition: all 0.2s;
						&.active {
							font-weight: bold;
							box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
						}
					}
				}
			}
			
			.reply-input-box {
				margin-bottom: 24rpx;
				.reply-textarea {
					width: 100%;
					min-height: 160rpx;
					padding: 16rpx;
					background: #f9fafb;
					border: 2rpx solid #e5e7eb;
					border-radius: 12rpx;
					font-size: 28rpx;
					box-sizing: border-box;
				}
			}
			
			.admin-submit-btn {
				width: 100%;
				height: 80rpx;
				line-height: 80rpx;
				background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
				color: #fff;
				border-radius: 40rpx;
				font-size: 28rpx;
				font-weight: 600;
				border: none;
				box-shadow: 0 6rpx 16rpx rgba(239, 68, 68, 0.3);
				&::after { border: none; }
			}
		}
	}
}
</style>
