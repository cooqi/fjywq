<template>
	<view class="page-container">
		<view v-if="!isAdmin" class="center">
			<view class="error-emoji">🔒</view>
			<text class="error-text">仅管理员可访问题库管理</text>
			<button class="ghost-btn" @click="goBack">返回</button>
		</view>

		<view v-else>
			<view class="toolbar">
				<input class="search" v-model="keyword" placeholder="搜索平民词 / 卧底词" @confirm="load" />
				<button class="add-btn" @click="showAdd">＋ 新增</button>
			</view>

			<view class="count-tip">共 {{ list.length }} 组词</view>

			<view v-for="q in list" :key="q._id" class="item">
				<view class="words">
					<view class="word-line">
						<text class="tag good">平民</text>
						<text class="word">{{ q.civilian_word }}</text>
					</view>
					<view class="word-line">
						<text class="tag spy">卧底</text>
						<text class="word spy">{{ q.spy_word }}</text>
					</view>
					<view class="meta">
						<text v-if="q.category" class="cat">{{ q.category }}</text>
						<text class="used">用过 {{ q.use_count || 0 }} 次</text>
						<text class="state" :class="{ off: !q.enabled }">{{ q.enabled ? '启用' : '停用' }}</text>
					</view>
				</view>
				<view class="actions">
					<view class="act" @click="toggle(q)">{{ q.enabled ? '停用' : '启用' }}</view>
					<view class="act" @click="edit(q)">编辑</view>
					<view class="act del" @click="del(q)">删除</view>
				</view>
			</view>

			<view v-if="!list.length" class="empty">还没有词条，点「＋ 新增」添加第一组吧</view>
		</view>

		<!-- 新增 / 编辑弹层：自管理固定遮罩（参照本页 flex 布局下 uni-popup 定位不稳的经验） -->
		<view class="modal-mask" v-if="showModal" @click="closeModal">
			<view class="modal" @click.stop>
				<view class="modal-title">{{ form._id ? '编辑词条' : '新增词条' }}</view>
				<view class="m-field">
					<text class="m-label">平民词</text>
					<input class="m-input" v-model="form.civilianWord" placeholder="如：月亮" maxlength="20" />
				</view>
				<view class="m-field">
					<text class="m-label">卧底词</text>
					<input class="m-input" v-model="form.spyWord" placeholder="如：太阳" maxlength="20" />
				</view>
				<view class="m-field">
					<text class="m-label">分类（可选）</text>
					<input class="m-input" v-model="form.category" placeholder="如：食物 / 动物" maxlength="12" />
				</view>
				<view class="modal-actions">
					<button class="ghost-btn" @click="closeModal">取消</button>
					<button class="save-btn" @click="save">保存</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			isAdmin: false,
			userId: '',
			userRole: '',
			list: [],
			keyword: '',
			showModal: false,
			form: { _id: '', civilianWord: '', spyWord: '', category: '' }
		}
	},
	onLoad() {
		this.loadUser()
		if (this.isAdmin) this.load()
	},
	methods: {
		loadUser() {
			const raw = uni.getStorageSync('userInfo')
			let info = {}
			if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
			this.userId = info._id || ''
			this.userRole = info.role || ''
			this.isAdmin = this.userRole === 's_admin' || this.userRole === 'admin'
		},
		call(data) {
			return uniCloud.callFunction({ name: 'wodi', data: { ...data, userId: this.userId, userRole: this.userRole } })
		},
		async load() {
			uni.showLoading({ title: '加载中...' })
			try {
				const res = await this.call({ action: 'listQuestions', keyword: this.keyword })
				uni.hideLoading()
				if (res.result.code === 0) this.list = res.result.data.list || []
				else uni.showToast({ title: res.result.msg, icon: 'none' })
			} catch (e) {
				uni.hideLoading()
				uni.showToast({ title: '加载失败', icon: 'none' })
			}
		},
		showAdd() {
			this.form = { _id: '', civilianWord: '', spyWord: '', category: '' }
			this.showModal = true
		},
		edit(q) {
			this.form = { _id: q._id, civilianWord: q.civilian_word, spyWord: q.spy_word, category: q.category || '' }
			this.showModal = true
		},
		closeModal() { this.showModal = false },
		async save() {
			const f = this.form
			if (!f.civilianWord.trim() || !f.spyWord.trim()) return uni.showToast({ title: '两个词都不能为空', icon: 'none' })
			if (f.civilianWord.trim() === f.spyWord.trim()) return uni.showToast({ title: '两个词不能相同', icon: 'none' })
			const action = f._id ? 'updateQuestion' : 'addQuestion'
			try {
				const res = await this.call({
					action,
					id: f._id,
					civilianWord: f.civilianWord,
					spyWord: f.spyWord,
					category: f.category,
					enabled: true
				})
				if (res.result.code !== 0) return uni.showToast({ title: res.result.msg, icon: 'none' })
				this.showModal = false
				uni.showToast({ title: f._id ? '已保存' : '已添加', icon: 'none' })
				this.load()
			} catch (e) {
				uni.showToast({ title: '保存失败', icon: 'none' })
			}
		},
		async toggle(q) {
			try {
				const res = await this.call({ action: 'updateQuestion', id: q._id, enabled: !q.enabled })
				if (res.result.code === 0) this.load()
				else uni.showToast({ title: res.result.msg, icon: 'none' })
			} catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
		},
		del(q) {
			uni.showModal({
				title: '确认删除',
				content: `删除「${q.civilian_word} / ${q.spy_word}」？`,
				success: async (r) => {
					if (!r.confirm) return
					const res = await this.call({ action: 'deleteQuestion', id: q._id })
					if (res.result.code === 0) this.load()
					else uni.showToast({ title: res.result.msg, icon: 'none' })
				}
			})
		},
		goBack() { uni.navigateBack() }
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx;
	box-sizing: border-box;
}
.center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 200rpx; }
.error-emoji { font-size: 90rpx; margin-bottom: 20rpx; }
.error-text { color: #f6685e; font-size: 30rpx; margin-bottom: 40rpx; }

.toolbar { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.search { flex: 1; height: 76rpx; background: #fff; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 0 24rpx; font-size: 28rpx; }
.add-btn {
	background: linear-gradient(135deg, #4facfe, #00c6fb); color: #fff; border: none;
	border-radius: 16rpx; height: 76rpx; line-height: 76rpx; padding: 0 30rpx; font-size: 28rpx;
}
.count-tip { font-size: 24rpx; color: #8a86a8; margin-bottom: 16rpx; }

.item {
	display: flex; justify-content: space-between; align-items: center;
	background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx;
	box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, .08);
}
.words { flex: 1; }
.word-line { display: flex; align-items: center; margin-bottom: 8rpx; }
.tag { font-size: 20rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 8rpx; margin-right: 12rpx; }
.tag.good { background: #2a9d8f; }
.tag.spy { background: #f6685e; }
.word { font-size: 32rpx; font-weight: bold; color: #333; }
.word.spy { color: #f6685e; }
.meta { display: flex; gap: 20rpx; font-size: 22rpx; color: #999; margin-top: 4rpx; }
.cat { background: #f2effa; color: #7a6fb0; padding: 2rpx 12rpx; border-radius: 8rpx; }
.state { color: #2a9d8f; }
.state.off { color: #bbb; }
.actions { display: flex; flex-direction: column; gap: 12rpx; }
.act { font-size: 24rpx; color: #3a6ea5; background: #eef4fb; padding: 10rpx 22rpx; border-radius: 30rpx; text-align: center; }
.act.del { color: #f6685e; background: #fdeeee; }
.empty { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }

.modal-mask {
	position: fixed; left: 0; top: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, .5); display: flex; align-items: center; justify-content: center; z-index: 999;
}
.modal { background: #fff; border-radius: 24rpx; padding: 40rpx; width: 620rpx; box-sizing: border-box; }
.modal-title { font-size: 34rpx; font-weight: bold; margin-bottom: 30rpx; text-align: center; color: #333; }
.m-field { margin-bottom: 22rpx; }
.m-label { font-size: 25rpx; color: #888; display: block; margin-bottom: 8rpx; }
.m-input { background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 12rpx; height: 80rpx; padding: 0 24rpx; font-size: 30rpx; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 20rpx; }
.modal-actions button { flex: 1; margin: 0; }
.ghost-btn { background: #fff; color: #3a6ea5; border: 2rpx solid #3a6ea5; border-radius: 44rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.save-btn { background: linear-gradient(135deg, #4facfe, #00c6fb); color: #fff; border: none; border-radius: 44rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
