<template>
	<view class="page-container">
		<!-- 权限检查 -->
		<view class="no-permission" v-if="!isAdmin">
			<text class="no-perm-text">暂无管理权限</text>
		</view>
		
		<view v-else>
			<!-- 操作栏 -->
			<view class="action-bar">
				<button class="add-btn" @click="showAddDialog">+ 新增题目</button>
			</view>
			
			<!-- 筛选区 -->
			<view class="filter-box">
				<view class="filter-row">
					<picker @change="onTypeChange" :value="filterTypeIndex" :range="typeOptions" range-key="label">
						<view class="filter-picker">{{typeOptions[filterTypeIndex].label}}</view>
					</picker>
					<picker @change="onStatusChange" :value="filterStatusIndex" :range="statusOptions" range-key="label">
						<view class="filter-picker">{{statusOptions[filterStatusIndex].label}}</view>
					</picker>
					<picker @change="onDiffChange" :value="filterDiffIndex" :range="diffOptions" range-key="label">
						<view class="filter-picker">{{diffOptions[filterDiffIndex].label}}</view>
					</picker>
				</view>
				<view class="search-row">
					<input class="search-input" v-model="keyword" placeholder="搜索题干关键词" @confirm="handleSearch" />
					<view class="search-btn" @click="handleSearch">搜索</view>
				</view>
			</view>
			
			<!-- 列表 -->
			<view class="list-box">
				<view class="list-header">
					<text class="total-text">共 {{totalCount}} 题</text>
				</view>
				
				<view class="question-item" v-for="item in questionList" :key="item._id">
					<view class="q-header">
						<view class="q-type" :class="'type-' + item.type">{{typeLabel(item.type)}}</view>
						<view class="q-status" :class="item.status === 1 ? 'status-on' : 'status-off'">
							{{item.status === 1 ? '已启用' : '草稿'}}
						</view>
						<view class="q-diff">难度 {{item.difficulty}}</view>
					</view>
					<view class="q-text">{{item.question}}</view>
					<view class="q-options">
						<text v-for="opt in item.options" :key="opt.key" class="q-opt">
							{{opt.key}}. {{opt.value}}
						</text>
					</view>
					<view class="q-answer">
						<text>答案：{{item.answer.join(', ')}}</text>
						<text class="q-category">{{item.category}}</text>
					</view>
					<view class="q-actions">
						<view class="q-action-btn edit" @click="editQuestion(item)">编辑</view>
						<view class="q-action-btn toggle" @click="toggleItem(item)">
							{{item.status === 1 ? '下架' : '启用'}}
						</view>
						<view class="q-action-btn delete" @click="deleteItem(item)">删除</view>
					</view>
				</view>
				
				<view class="empty-tip" v-if="questionList.length === 0 && !listLoading">
					暂无题目
				</view>
				
				<!-- 加载更多 -->
				<view class="load-more" v-if="questionList.length < totalCount" @click="loadMore">
					<text>加载更多</text>
				</view>
			</view>
		</view>
		
		<!-- 新增/编辑弹窗 -->
		<view class="popup-mask" v-if="showDialog" @click="closeDialog"></view>
		<view class="popup-box" v-if="showDialog">
			<view class="popup-header">
				<text class="popup-title">{{isEdit ? '编辑题目' : '新增题目'}}</text>
				<text class="popup-close" @click="closeDialog">×</text>
			</view>
			<scroll-view class="popup-body" scroll-y>
				<!-- 题干 -->
				<view class="form-group">
					<text class="form-label">题干 *</text>
					<textarea class="form-textarea" v-model="formData.question" placeholder="请输入题干内容" :maxlength="500"></textarea>
				</view>
				
				<!-- 题型 -->
				<view class="form-group">
					<text class="form-label">题型 *</text>
					<view class="type-selector">
						<view class="type-opt" :class="{'type-active': formData.type === 'single'}" @click="changeFormType('single')">单选</view>
						<view class="type-opt" :class="{'type-active': formData.type === 'multiple'}" @click="changeFormType('multiple')">多选</view>
						<view class="type-opt" :class="{'type-active': formData.type === 'judge'}" @click="changeFormType('judge')">判断</view>
						<view class="type-opt" :class="{'type-active': formData.type === 'fill'}" @click="changeFormType('fill')">填空</view>
					</view>
				</view>
				
				<!-- 选项（填空题不需要） -->
				<view class="form-group" v-if="formData.type !== 'fill'">
					<text class="form-label">选项 *</text>
					<view class="options-editor">
						<view class="option-row" v-for="(opt, idx) in formData.options" :key="idx">
							<text class="opt-key">{{opt.key}}</text>
							<input class="opt-input" v-model="opt.value" :placeholder="'选项 ' + opt.key" />
							<text class="opt-del" v-if="formData.options.length > 2 && formData.type !== 'judge'" @click="removeOption(idx)">×</text>
						</view>
					</view>
					<view class="add-option-btn" v-if="formData.options.length < 8 && formData.type !== 'judge'" @click="addOption">+ 添加选项</view>
				</view>
				
				<!-- 正确答案 -->
				<view class="form-group">
					<text class="form-label">正确答案 *</text>
					<!-- 选择题答案选择 -->
					<view class="answer-selector" v-if="formData.type !== 'fill'">
						<view 
							class="answer-opt"
							v-for="opt in formData.options"
							:key="opt.key"
							:class="{'answer-selected': formData.answer.includes(opt.key)}"
							@click="toggleAnswer(opt.key)"
						>
							{{opt.key}}
						</view>
					</view>
					<!-- 填空题答案输入 -->
					<view v-if="formData.type === 'fill'">
						<textarea class="form-textarea" v-model="fillAnswerText" placeholder="每行一个可接受的答案" :maxlength="500"></textarea>
					</view>
					<text class="form-hint" v-if="formData.type === 'single'">单选只能选一个</text>
					<text class="form-hint" v-if="formData.type === 'multiple'">多选可选多个</text>
					<text class="form-hint" v-if="formData.type === 'judge'">判断选 A 或 B</text>
					<text class="form-hint" v-if="formData.type === 'fill'">可填写多个可接受答案，每行一个</text>
				</view>
				
				<!-- 解析 -->
				<view class="form-group">
					<text class="form-label">解析</text>
					<textarea class="form-textarea" v-model="formData.analysis" placeholder="选填，答题后展示"></textarea>
				</view>
				
				<!-- 分类 -->
				<view class="form-group">
					<text class="form-label">分类 *</text>
					<input class="form-input" v-model="formData.category" placeholder="如：日常、喜好、经历" />
				</view>
				
				<!-- 难度 -->
				<view class="form-group">
					<text class="form-label">难度 (1~5)</text>
					<view class="difficulty-selector">
						<view 
							class="diff-star" 
							v-for="n in 5" 
							:key="n"
							:class="{'diff-active': n <= formData.difficulty}"
							@click="formData.difficulty = n"
						>★</view>
					</view>
				</view>
				
				<!-- 状态 -->
				<view class="form-group">
					<text class="form-label">保存状态</text>
					<view class="status-selector">
						<view class="status-opt" :class="{'status-active': formData.status === 0}" @click="formData.status = 0">草稿</view>
						<view class="status-opt" :class="{'status-active': formData.status === 1}" @click="formData.status = 1">直接启用</view>
					</view>
				</view>
				
				<button class="submit-btn" @click="submitForm" :disabled="isSubmitting">
					{{isSubmitting ? '提交中...' : (isEdit ? '保存修改' : '添加题目')}}
				</button>
			</scroll-view>
		</view>
		
		<!-- 加载 -->
		<view class="loading-mask" v-if="listLoading && questionList.length === 0">
			<text>加载中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userInfo: {},
			isAdmin: false,
			// 筛选
			typeOptions: [
				{ label: '全部题型', value: '' },
				{ label: '单选', value: 'single' },
				{ label: '多选', value: 'multiple' },
				{ label: '判断', value: 'judge' },
				{ label: '填空', value: 'fill' }
			],
			filterTypeIndex: 0,
			statusOptions: [
				{ label: '全部状态', value: '' },
				{ label: '草稿', value: '0' },
				{ label: '已启用', value: '1' }
			],
			filterStatusIndex: 0,
			diffOptions: [
				{ label: '全部难度', value: '' },
				{ label: '1', value: '1' },
				{ label: '2', value: '2' },
				{ label: '3', value: '3' },
				{ label: '4', value: '4' },
				{ label: '5', value: '5' }
			],
			filterDiffIndex: 0,
			keyword: '',
			// 列表
			questionList: [],
			totalCount: 0,
			page: 1,
			pageSize: 20,
			listLoading: false,
			// 弹窗
			showDialog: false,
			isEdit: false,
			editId: '',
			isSubmitting: false,
			fillAnswerText: '',
			formData: {
				question: '',
				type: 'single',
				options: [
					{ key: 'A', value: '' },
					{ key: 'B', value: '' }
				],
				answer: [],
				analysis: '',
				category: '',
				difficulty: 1,
				status: 0
			}
		}
	},
	onLoad() {
		const userInfo = uni.getStorageSync('userInfo')
		if (userInfo) {
			this.userInfo = JSON.parse(userInfo)
			const role = this.userInfo.role || ''
			this.isAdmin = role === 's_admin' || role === 'admin'
		}
		if (this.isAdmin) {
			this.loadList()
		}
	},
	methods: {
		typeLabel(type) {
			const map = { single: '单选', multiple: '多选', judge: '判断', fill: '填空' }
			return map[type] || type
		},
		
		// 筛选变更
		onTypeChange(e) {
			this.filterTypeIndex = e.detail.value
			this.resetAndLoad()
		},
		onStatusChange(e) {
			this.filterStatusIndex = e.detail.value
			this.resetAndLoad()
		},
		onDiffChange(e) {
			this.filterDiffIndex = e.detail.value
			this.resetAndLoad()
		},
		handleSearch() {
			this.resetAndLoad()
		},
		
		resetAndLoad() {
			this.page = 1
			this.questionList = []
			this.loadList()
		},
		
		// 加载列表
		loadList() {
			this.listLoading = true
			const data = {
				action: 'getList',
				userId: this.userInfo._id,
				userRole: this.userInfo.role,
				page: this.page,
				pageSize: this.pageSize
			}
			const type = this.typeOptions[this.filterTypeIndex].value
			const status = this.statusOptions[this.filterStatusIndex].value
			const diff = this.diffOptions[this.filterDiffIndex].value
			if (type) data.type = type
			if (status !== '') data.status = status
			if (diff !== '') data.difficulty = diff
			if (this.keyword.trim()) data.keyword = this.keyword.trim()
			
			uniCloud.callFunction({
				name: 'qa-admin',
				data: data,
				success: (res) => {
					this.listLoading = false
					if (res.result.code === 0) {
						const list = res.result.data.list || []
						if (this.page === 1) {
							this.questionList = list
						} else {
							this.questionList = this.questionList.concat(list)
						}
						this.totalCount = res.result.data.total || 0
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => {
					this.listLoading = false
					uni.showToast({ title: '加载失败', icon: 'none' })
				}
			})
		},
		
		loadMore() {
			this.page++
			this.loadList()
		},
		
		// 新增弹窗
		showAddDialog() {
			this.isEdit = false
			this.editId = ''
			this.fillAnswerText = ''
			this.formData = {
				question: '',
				type: 'single',
				options: [
					{ key: 'A', value: '' },
					{ key: 'B', value: '' }
				],
				answer: [],
				analysis: '',
				category: '',
				difficulty: 1,
				status: 0
			}
			this.showDialog = true
		},
		
		// 编辑
		editQuestion(item) {
			this.isEdit = true
			this.editId = item._id
			this.formData = {
				question: item.question,
				type: item.type,
				options: JSON.parse(JSON.stringify(item.options || [])),
				answer: [...item.answer],
				analysis: item.analysis || '',
				category: item.category || '',
				difficulty: item.difficulty || 1,
				status: item.status
			}
			// 填空题：将答案数组转为文本
			this.fillAnswerText = item.type === 'fill' ? item.answer.join('\n') : ''
			this.showDialog = true
		},
		
		closeDialog() {
			this.showDialog = false
		},
		
		// 切换题型时重置选项
		changeFormType(type) {
			this.formData.type = type
			this.formData.answer = []
			this.fillAnswerText = ''
			if (type === 'judge') {
				this.formData.options = [
					{ key: 'A', value: '正确' },
					{ key: 'B', value: '错误' }
				]
			} else if (type === 'fill') {
				this.formData.options = []
			} else {
				this.formData.options = [
					{ key: 'A', value: '' },
					{ key: 'B', value: '' }
				]
			}
		},
		
		// 选项管理
		addOption() {
			const keys = 'ABCDEFGH'
			const idx = this.formData.options.length
			if (idx < 8) {
				this.formData.options.push({ key: keys[idx], value: '' })
			}
		},
		removeOption(idx) {
			const removed = this.formData.options[idx]
			this.formData.options.splice(idx, 1)
			// 重新排列 key
			const keys = 'ABCDEFGH'
			this.formData.options.forEach((opt, i) => {
				opt.key = keys[i]
			})
			// 清理答案中被移除的 key
			this.formData.answer = this.formData.answer.filter(a => a !== removed.key)
		},
		
		// 切换答案
		toggleAnswer(key) {
			if (this.formData.type === 'single' || this.formData.type === 'judge') {
				this.formData.answer = [key]
			} else {
				const idx = this.formData.answer.indexOf(key)
				if (idx > -1) {
					this.formData.answer.splice(idx, 1)
				} else {
					this.formData.answer.push(key)
					this.formData.answer.sort()
				}
			}
		},
		
		// 提交表单
		submitForm() {
			// 校验
			if (!this.formData.question.trim()) {
				return uni.showToast({ title: '题干不能为空', icon: 'none' })
			}
			if (this.formData.type !== 'fill' && this.formData.options.some(o => !o.value.trim())) {
				return uni.showToast({ title: '选项内容不能为空', icon: 'none' })
			}
			// 填空题：将文本转换为答案数组
			if (this.formData.type === 'fill') {
				const fillAnswers = this.fillAnswerText.split('\n').map(s => s.trim()).filter(s => s)
				if (fillAnswers.length === 0) {
					return uni.showToast({ title: '请填写至少一个可接受答案', icon: 'none' })
				}
				this.formData.answer = fillAnswers
			} else if (this.formData.answer.length === 0) {
				return uni.showToast({ title: '请选择正确答案', icon: 'none' })
			}
			if (!this.formData.category.trim()) {
				return uni.showToast({ title: '请填写分类', icon: 'none' })
			}
			
			this.isSubmitting = true
			const action = this.isEdit ? 'edit' : 'add'
			const data = {
				action: action,
				userId: this.userInfo._id,
				userRole: this.userInfo.role,
				...this.formData
			}
			if (this.isEdit) {
				data.id = this.editId
			}
			
			uniCloud.callFunction({
				name: 'qa-admin',
				data: data,
				success: (res) => {
					this.isSubmitting = false
					if (res.result.code === 0) {
						uni.showToast({ title: this.isEdit ? '修改成功' : '添加成功', icon: 'success' })
						this.closeDialog()
						this.resetAndLoad()
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
					}
				},
				fail: () => {
					this.isSubmitting = false
					uni.showToast({ title: '操作失败', icon: 'none' })
				}
			})
		},
		
		// 启用/下架
		toggleItem(item) {
			const newStatus = item.status === 1 ? 0 : 1
			uniCloud.callFunction({
				name: 'qa-admin',
				data: {
					action: 'toggleStatus',
					userId: this.userInfo._id,
					userRole: this.userInfo.role,
					id: item._id,
					status: newStatus
				},
				success: (res) => {
					if (res.result.code === 0) {
						uni.showToast({ title: res.result.msg, icon: 'success' })
						this.resetAndLoad()
					}
				}
			})
		},
		
		// 删除
		deleteItem(item) {
			uni.showModal({
				title: '确认删除',
				content: '删除后无法恢复，确定删除？',
				success: (res) => {
					if (res.confirm) {
						uniCloud.callFunction({
							name: 'qa-admin',
							data: {
								action: 'delete',
								userId: this.userInfo._id,
								userRole: this.userInfo.role,
								id: item._id
							},
							success: (res2) => {
								if (res2.result.code === 0) {
									uni.showToast({ title: '已删除', icon: 'success' })
									this.resetAndLoad()
								}
							}
						})
					}
				}
			})
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx;
}

.no-permission {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 60vh;
}

.no-perm-text {
	font-size: 32rpx;
	color: #999;
}

/* 操作栏 */
.action-bar {
	margin-bottom: 20rpx;
}

.add-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 40rpx;
	height: 80rpx;
	font-size: 28rpx;
	border: none;
}

/* 筛选 */
.filter-box {
	background: #fff;
	border-radius: 20rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
}

.filter-row {
	display: flex;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.filter-picker {
	padding: 12rpx 20rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	font-size: 24rpx;
	color: #555;
}

.search-row {
	display: flex;
	gap: 12rpx;
}

.search-input {
	flex: 1;
	height: 64rpx;
	background: #f5f5f5;
	border-radius: 12rpx;
	padding: 0 20rpx;
	font-size: 26rpx;
}

.search-btn {
	padding: 0 30rpx;
	height: 64rpx;
	line-height: 64rpx;
	background: #667eea;
	color: #fff;
	border-radius: 12rpx;
	font-size: 26rpx;
}

/* 列表 */
.list-box {
	margin-bottom: 40rpx;
}

.list-header {
	margin-bottom: 16rpx;
}

.total-text {
	font-size: 24rpx;
	color: #999;
}

.question-item {
	background: #fff;
	border-radius: 20rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
}

.q-header {
	display: flex;
	gap: 12rpx;
	margin-bottom: 12rpx;
	align-items: center;
}

.q-type {
	padding: 4rpx 16rpx;
	border-radius: 10rpx;
	font-size: 20rpx;
	
	&.type-single { background: #e3f2fd; color: #1976D2; }
	&.type-multiple { background: #fff3e0; color: #e65100; }
	&.type-judge { background: #e8f5e9; color: #2e7d32; }
	&.type-fill { background: #fce4ec; color: #ad1457; }
}

.q-status {
	padding: 4rpx 12rpx;
	border-radius: 10rpx;
	font-size: 20rpx;
}

.status-on {
	background: #e8f5e9;
	color: #2e7d32;
}

.status-off {
	background: #f5f5f5;
	color: #999;
}

.q-diff {
	font-size: 20rpx;
	color: #999;
	margin-left: auto;
}

.q-text {
	font-size: 28rpx;
	color: #333;
	line-height: 1.5;
	margin-bottom: 12rpx;
}

.q-options {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 12rpx;
}

.q-opt {
	font-size: 22rpx;
	color: #666;
	background: #f8f9fa;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.q-answer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 24rpx;
	color: #333;
	margin-bottom: 16rpx;
}

.q-category {
	font-size: 22rpx;
	color: #7b1fa2;
	background: #f3e5f5;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.q-actions {
	display: flex;
	gap: 16rpx;
	border-top: 1rpx solid #f0f0f0;
	padding-top: 16rpx;
}

.q-action-btn {
	padding: 8rpx 24rpx;
	border-radius: 16rpx;
	font-size: 24rpx;
}

.q-action-btn.edit {
	background: #e3f2fd;
	color: #1976D2;
}

.q-action-btn.toggle {
	background: #fff3e0;
	color: #e65100;
}

.q-action-btn.delete {
	background: #ffebee;
	color: #c62828;
}

.empty-tip {
	text-align: center;
	padding: 80rpx 0;
	font-size: 28rpx;
	color: #999;
}

.load-more {
	text-align: center;
	padding: 24rpx;
	font-size: 26rpx;
	color: #667eea;
}

/* 弹窗 */
.popup-mask {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 998;
}

.popup-box {
	position: fixed;
	top: 10%;
	left: 5%;
	right: 5%;
	bottom: 10%;
	background: #fff;
	border-radius: 24rpx;
	z-index: 999;
	display: flex;
	flex-direction: column;
}

.popup-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.popup-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.popup-close {
	font-size: 48rpx;
	color: #999;
	line-height: 1;
}

.popup-body {
	flex: 1;
	padding: 24rpx 32rpx;
	overflow-y: auto;
}

/* 表单 */
.form-group {
	margin-bottom: 28rpx;
}

.form-label {
	font-size: 26rpx;
	color: #333;
	font-weight: 500;
	margin-bottom: 12rpx;
	display: block;
}

.form-textarea {
	width: 100%;
	min-height: 150rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	padding: 16rpx;
	font-size: 26rpx;
	box-sizing: border-box;
}

.form-input {
	height: 72rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	padding: 0 16rpx;
	font-size: 26rpx;
}

.form-hint {
	font-size: 22rpx;
	color: #999;
	margin-top: 8rpx;
	display: block;
}

/* 题型选择 */
.type-selector {
	display: flex;
	gap: 16rpx;
}

.type-opt {
	padding: 12rpx 28rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 16rpx;
	font-size: 26rpx;
	color: #666;
}

.type-active {
	border-color: #667eea;
	background: rgba(102, 126, 234, 0.1);
	color: #667eea;
}

/* 选项编辑 */
.option-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 12rpx;
}

.opt-key {
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background: #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: bold;
	color: #666;
	flex-shrink: 0;
}

.opt-input {
	flex: 1;
	height: 64rpx;
	background: #f8f9fa;
	border-radius: 12rpx;
	padding: 0 16rpx;
	font-size: 26rpx;
}

.opt-del {
	font-size: 36rpx;
	color: #c62828;
	padding: 0 12rpx;
}

.add-option-btn {
	font-size: 24rpx;
	color: #667eea;
	padding: 12rpx 0;
}

/* 答案选择 */
.answer-selector {
	display: flex;
	gap: 16rpx;
	flex-wrap: wrap;
}

.answer-opt {
	width: 64rpx;
	height: 64rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: bold;
	color: #666;
}

.answer-selected {
	border-color: #667eea;
	background: #667eea;
	color: #fff;
}

/* 难度 */
.difficulty-selector {
	display: flex;
	gap: 12rpx;
}

.diff-star {
	font-size: 40rpx;
	color: #ddd;
}

.diff-active {
	color: #ffc107;
}

/* 状态选择 */
.status-selector {
	display: flex;
	gap: 16rpx;
}

.status-opt {
	padding: 12rpx 28rpx;
	border: 2rpx solid #e8e8e8;
	border-radius: 16rpx;
	font-size: 26rpx;
	color: #666;
}

.status-active {
	border-color: #667eea;
	background: rgba(102, 126, 234, 0.1);
	color: #667eea;
}

.submit-btn {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	border-radius: 40rpx;
	height: 84rpx;
	font-size: 30rpx;
	border: none;
	margin-top: 20rpx;
}

.loading-mask {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 30rpx 50rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
	z-index: 999;
}
</style>
