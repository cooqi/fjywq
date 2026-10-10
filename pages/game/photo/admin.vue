<template>
	<view class="page">
		<!-- 无权限 -->
		<view v-if="checked && !isAdmin" class="forbidden">
			<text class="fb-icon">🔒</text>
			<text class="fb-text">无管理员权限</text>
		</view>

		<block v-else>
			<!-- 上传 / 编辑表单 -->
			<view class="card">
				<view class="card-title">{{ editingId ? '编辑模板' : '上传模板' }}</view>

				<view class="field">
					<text class="label">相框图片（透明 PNG，≤500KB）</text>
					<view class="upload-row">
						<view class="upload-box" @click="uploadFrame">
							<image v-if="form.frameLocal" class="up-img" :src="form.frameLocal" mode="aspectFill" />
							<text v-else class="up-hint">＋ 上传相框</text>
						</view>
						<view class="upload-box small" @click="uploadThumb">
							<image v-if="form.thumbLocal" class="up-img" :src="form.thumbLocal" mode="aspectFill" />
							<text v-else class="up-hint">缩略图<br />（可选）</text>
						</view>
					</view>
				</view>

				<view class="field">
					<text class="label">模板名称</text>
					<input class="input" v-model="form.name" placeholder="如：生日应援框" />
				</view>

				<view class="field">
					<text class="label">分类</text>
					<picker :range="uploadCats" range-key="label" @change="onCategory">
						<view class="input picker">{{ catLabel || '请选择' }}</view>
					</picker>
				</view>

				<view class="field inline">
					<text class="label">排序权重</text>
					<input class="input num" type="number" v-model="form.sort" placeholder="越大越靠前" />
				</view>

				<view class="field">
					<view class="area-head">
						<text class="label">照片显示区（相对坐标 0-1）</text>
						<text class="link" @click="useDefaultArea">用默认值</text>
					</view>
					<view class="area-grid">
						<input class="input q" type="digit" v-model="form.area.x" placeholder="X" />
						<input class="input q" type="digit" v-model="form.area.y" placeholder="Y" />
						<input class="input q" type="digit" v-model="form.area.w" placeholder="W" />
						<input class="input q" type="digit" v-model="form.area.h" placeholder="H" />
					</view>
				</view>

				<view class="form-actions">
					<button v-if="editingId" class="ghost" @click="cancelEdit">取消编辑</button>
					<button class="primary" :disabled="saving" @click="save">{{ editingId ? '保存修改' : '提交上传' }}</button>
				</view>
			</view>

			<!-- 模板列表 -->
			<view class="card">
				<view class="card-title">模板列表（含已禁用）</view>
				<view v-if="!list.length && !loading" class="list-empty">暂无模板</view>
				<view v-for="f in list" :key="f._id" class="row">
					<image v-if="f.thumbUrl || f.frameUrl" class="row-thumb" :src="f.thumbUrl || f.frameUrl" mode="aspectFill" />
					<view v-else class="row-thumb rt-empty">🖼️</view>
					<view class="row-info">
						<text class="row-name">{{ f.name }}</text>
						<text class="row-meta">{{ categoryLabel(f.category) }} · 用 {{ f.useCount || 0 }} 次 · 排序 {{ f.sort || 0 }}</text>
						<text class="row-status" :class="{ off: !f.enabled }">{{ f.enabled ? '启用中' : '已禁用' }}</text>
					</view>
					<view class="row-ops">
						<text class="op" @click="edit(f)">编辑</text>
						<text class="op" @click="toggle(f)">{{ f.enabled ? '禁用' : '启用' }}</text>
						<text class="op danger" @click="del(f)">删除</text>
					</view>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
import { UPLOAD_CATEGORIES, categoryLabel, readAdmin } from '@/common/js/photo-const.js'

export default {
	data() {
		return {
			checked: false,
			isAdmin: false,
			userId: '',
			userRole: '',
			uploadCats: UPLOAD_CATEGORIES,
			catIndex: -1,
			list: [],
			loading: false,
			saving: false,
			editingId: '',
			form: {
				name: '',
				category: '',
				sort: '100',
				frameUrl: '',     // fileID
				thumbUrl: '',     // fileID
				frameLocal: '',   // 预览用的本地临时路径
				thumbLocal: '',
				area: { x: '0.1', y: '0.1', w: '0.8', h: '0.7' }
			}
		}
	},
	computed: {
		catLabel() {
			return this.catIndex >= 0 ? this.uploadCats[this.catIndex].label : ''
		}
	},
	onLoad() {
		const u = readAdmin()
		this.isAdmin = u.isAdmin
		this.userId = u.userId
		this.userRole = u.userRole
		this.checked = true
		if (!this.isAdmin) {
			uni.showToast({ title: '无管理员权限', icon: 'none' })
			setTimeout(() => uni.navigateBack(), 800)
			return
		}
		this.loadList()
	},
	methods: {
		categoryLabel,
		adminData(action, extra) {
			return Object.assign({ action, userId: this.userId, userRole: this.userRole }, extra || {})
		},

		async loadList() {
			this.loading = true
			try {
				const res = await uniCloud.callFunction({
					name: 'photo',
					data: this.adminData('adminList', { size: 50 })
				})
				const r = res.result || {}
				if (r.code === 0) this.list = (r.data && r.data.list) || []
				else uni.showToast({ title: r.msg || '加载失败', icon: 'none' })
			} catch (e) {
				console.error(e)
				uni.showToast({ title: '网络异常', icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		onCategory(e) {
			this.catIndex = e.detail.value
			this.form.category = this.uploadCats[this.catIndex].value
		},
		useDefaultArea() {
			this.form.area = { x: '0', y: '0', w: '1', h: '1' }
		},

		// 选择图片 → 校验 → 上传云存储，返回 fileID
		pickAndUpload() {
			return new Promise((resolve, reject) => {
				uni.chooseImage({
					count: 1,
					sizeType: ['original'],
					sourceType: ['album'],
					success: async (res) => {
						const filePath = res.tempFilePaths[0]
						try {
							const info = await this.getFileInfo(filePath)
							if (info.size > 500 * 1024) {
								reject(new Error('图片超过 500KB，请压缩后上传'))
								return
							}
						} catch (e) { /* 取不到大小不阻断 */ }
						const ext = (filePath.split('.').pop() || 'png').toLowerCase()
						const cloudPath = `photo-frames/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
						try {
							const up = await uniCloud.uploadFile({ filePath, cloudPath })
							resolve({ fileID: up.fileID, local: filePath })
						} catch (e) {
							reject(new Error('上传失败，请重试'))
						}
					},
					fail: () => reject(new Error('已取消'))
				})
			})
		},
		getFileInfo(filePath) {
			return new Promise((resolve, reject) => {
				uni.getFileInfo({ filePath, success: resolve, fail: reject })
			})
		},
		async uploadFrame() {
			try {
				const r = await this.pickAndUpload()
				this.form.frameUrl = r.fileID
				this.form.frameLocal = r.local
			} catch (e) {
				if (e.message && e.message !== '已取消') uni.showToast({ title: e.message, icon: 'none' })
			}
		},
		async uploadThumb() {
			try {
				const r = await this.pickAndUpload()
				this.form.thumbUrl = r.fileID
				this.form.thumbLocal = r.local
			} catch (e) {
				if (e.message && e.message !== '已取消') uni.showToast({ title: e.message, icon: 'none' })
			}
		},

		buildArea() {
			const n = (v, d) => { const x = parseFloat(v); return isFinite(x) ? x : d }
			return {
				x: n(this.form.area.x, 0),
				y: n(this.form.area.y, 0),
				w: n(this.form.area.w, 1),
				h: n(this.form.area.h, 1)
			}
		},

		async save() {
			if (!this.form.name.trim()) return uni.showToast({ title: '请填写名称', icon: 'none' })
			if (!this.editingId && !this.form.frameUrl) return uni.showToast({ title: '请上传相框图片', icon: 'none' })
			this.saving = true
			const data = {
				name: this.form.name.trim(),
				category: this.form.category || 'daily',
				sort: parseInt(this.form.sort) || 0,
				photoArea: this.buildArea()
			}
			// 仅在本次重新上传了图片时才覆盖 URL；编辑未重传则保持原值
			if (this.form.frameUrl) data.frameUrl = this.form.frameUrl
			if (this.form.thumbUrl) data.thumbUrl = this.form.thumbUrl
			try {
				let res
				if (this.editingId) {
					res = await uniCloud.callFunction({ name: 'photo', data: this.adminData('update', { data: Object.assign({ _id: this.editingId }, data) }) })
				} else {
					res = await uniCloud.callFunction({ name: 'photo', data: this.adminData('add', { data }) })
				}
				const r = res.result || {}
				if (r.code === 0) {
					uni.showToast({ title: r.msg || '已保存', icon: 'success' })
					this.resetForm()
					this.loadList()
				} else {
					uni.showToast({ title: r.msg || '保存失败', icon: 'none' })
				}
			} catch (e) {
				console.error(e)
				uni.showToast({ title: '网络异常', icon: 'none' })
			} finally {
				this.saving = false
			}
		},

		resetForm() {
			this.editingId = ''
			this.catIndex = -1
			this.form = {
				name: '', category: '', sort: '100',
				frameUrl: '', thumbUrl: '', frameLocal: '', thumbLocal: '',
				area: { x: '0.1', y: '0.1', w: '0.8', h: '0.7' }
			}
		},

		edit(f) {
			this.editingId = f._id
			this.form.name = f.name || ''
			this.form.category = f.category || ''
			this.catIndex = this.uploadCats.findIndex(c => c.value === f.category)
			this.form.sort = String(f.sort != null ? f.sort : 100)
			// 编辑时不重新上传，沿用原 fileID（列表里已被换成临时 URL，无法回传 fileID）
			// 故只有管理员主动重新上传相框/缩略图才更新图片，否则保存时不带 frameUrl 覆盖
			this.form.frameUrl = ''
			this.form.thumbUrl = ''
			this.form.frameLocal = f.frameUrl || ''
			this.form.thumbLocal = f.thumbUrl || ''
			const a = f.photoArea || { x: 0, y: 0, w: 1, h: 1 }
			this.form.area = { x: String(a.x), y: String(a.y), w: String(a.w), h: String(a.h) }
			uni.pageScrollTo({ scrollTop: 0, duration: 200 })
		},
		cancelEdit() {
			this.resetForm()
		},

		async toggle(f) {
			const res = await uniCloud.callFunction({
				name: 'photo',
				data: this.adminData('toggle', { data: { _id: f._id, enabled: !f.enabled } })
			})
			const r = res.result || {}
			if (r.code === 0) { f.enabled = !f.enabled; uni.showToast({ title: r.msg, icon: 'none' }) }
			else uni.showToast({ title: r.msg || '操作失败', icon: 'none' })
		},

		del(f) {
			uni.showModal({
				title: '删除模板',
				content: `确定删除「${f.name}」？将同时删除云存储图片，不可恢复。`,
				confirmColor: '#fa5151',
				success: async (m) => {
					if (!m.confirm) return
					const res = await uniCloud.callFunction({
						name: 'photo',
						data: this.adminData('delete', { data: { _id: f._id } })
					})
					const r = res.result || {}
					if (r.code === 0) { uni.showToast({ title: '已删除', icon: 'success' }); this.loadList() }
					else uni.showToast({ title: r.msg || '删除失败', icon: 'none' })
				}
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx 24rpx 60rpx;
	box-sizing: border-box;
}
.forbidden { padding: 200rpx 0; display: flex; flex-direction: column; align-items: center; }
.fb-icon { font-size: 90rpx; }
.fb-text { margin-top: 20rpx; color: #8a86a8; font-size: 28rpx; }

.card {
	background: #fff;
	border-radius: 24rpx;
	padding: 28rpx 26rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 10rpx 28rpx rgba(102, 126, 234, .10);
}
.card-title { font-size: 30rpx; font-weight: bold; color: #3a6ea5; margin-bottom: 20rpx; }

.field { margin-bottom: 22rpx; }
.field.inline { display: flex; align-items: center; }
.field.inline .label { flex: none; width: 160rpx; }
.field.inline .num { flex: 1; }
.label { display: block; font-size: 25rpx; color: #6a6a86; margin-bottom: 12rpx; }
.input {
	background: #f4f5fa;
	border-radius: 14rpx;
	padding: 16rpx 20rpx;
	font-size: 27rpx;
	color: #333;
}
.picker { line-height: 1.4; }

.upload-row { display: flex; }
.upload-box {
	width: 220rpx;
	height: 290rpx;
	background: #f4f5fa;
	border: 2rpx dashed #b9bcd6;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	margin-right: 20rpx;
}
.upload-box.small { width: 160rpx; height: 210rpx; }
.up-img { width: 100%; height: 100%; }
.up-hint { font-size: 24rpx; color: #9a9ab6; text-align: center; line-height: 1.5; }

.area-head { display: flex; justify-content: space-between; align-items: center; }
.link { font-size: 24rpx; color: #4facfe; }
.area-grid { display: flex; gap: 14rpx; }
.area-grid .q { flex: 1; text-align: center; }

.form-actions { display: flex; margin-top: 10rpx; }
.form-actions button { flex: 1; margin: 0 10rpx; font-size: 28rpx; border-radius: 44rpx; line-height: 84rpx; }
.ghost { background: #f0f0f5; color: #6a6a86; }
.primary { background: linear-gradient(135deg, #fa709a, #fee140); color: #fff; }
button[disabled] { opacity: .55; }

.list-empty { color: #a0a0b8; font-size: 26rpx; text-align: center; padding: 30rpx 0; }
.row { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 2rpx solid #f0f0f5; }
.row:last-child { border-bottom: none; }
.row-thumb { width: 90rpx; height: 120rpx; border-radius: 12rpx; background: #f2f2f7; flex: none; }
.rt-empty { display: flex; align-items: center; justify-content: center; font-size: 40rpx; }
.row-info { flex: 1; padding: 0 18rpx; display: flex; flex-direction: column; }
.row-name { font-size: 27rpx; color: #333; font-weight: bold; }
.row-meta { font-size: 21rpx; color: #a0a0b8; margin-top: 6rpx; }
.row-status { font-size: 21rpx; color: #2bb673; margin-top: 4rpx; }
.row-status.off { color: #c0c0cc; }
.row-ops { display: flex; flex-direction: column; gap: 10rpx; flex: none; }
.op { font-size: 23rpx; color: #3a6ea5; text-align: center; padding: 4rpx 12rpx; }
.op.danger { color: #fa5151; }
</style>
