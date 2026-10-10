<template>
	<view class="page-container">
		<view class="loading-box" v-if="loading"><text>查询中...</text></view>

		<view class="error-box" v-else-if="error">
			<view class="error-icon">😕</view>
			<view class="error-text">{{ error }}</view>
			<button class="ghost-btn" @click="goHome">返回首页</button>
		</view>

		<view v-else>
			<!-- 发布单信息 -->
			<view class="listing-card">
				<view class="from-line">来自「{{ listing.name }}」的互换</view>
				<view class="listing-main">
					<image v-if="listing.image" class="listing-img" :src="listing.image" mode="aspectFill" @click="previewImg"></image>
					<view v-else class="listing-img listing-img-empty">🎁</view>
					<view class="listing-info">
						<view class="listing-name">{{ listing.name }}</view>
						<view class="listing-remain">
							剩余 <text class="remain-num">{{ listing.remaining }}</text> / {{ listing.total_qty }} 份
						</view>
					</view>
				</view>
				<view class="listing-remark" v-if="listing.remark">备注：{{ listing.remark }}</view>
				<view class="no-free-banner" v-if="listing.allow_free === false">🚫 对方不接受伸手，申请需填写用于互换的物料</view>
				<view class="status-banner" v-if="statusText">{{ statusText }}</view>
			</view>

			<!-- 已是本人发布 -->
			<view class="section-card" v-if="isOwner">
				<view class="tip-line">这是你发布的互换</view>
				<button class="primary-btn" @click="goManage">去管理申请</button>
			</view>

			<!-- 已申请 -->
			<view class="section-card" v-else-if="myApply">
				<view class="applied-box">
					<view class="applied-icon">✅</view>
					<view class="applied-text">你已申请 {{ myApply.qty }} 份</view>
					<view class="applied-status">{{ myApply.status === 1 ? '对方已标记互换' : '待对方处理' }}</view>
					<view class="applied-offer" v-if="myApply.offer_item">互换物料：{{ myApply.offer_item }}</view>
				</view>
				<button class="ghost-btn danger" @click="cancelApply">取消我的申请</button>
			</view>

			<!-- 申请表单 -->
			<view class="section-card" v-else-if="canApply">
				<view class="field">
					<text class="field-label">我的昵称</text>
					<input class="field-input" v-model="form.nickname" placeholder="线下常用圈名" maxlength="20" />
				</view>
				<view class="field">
					<text class="field-label">申请数量（发布者可能按数量调整）</text>
					<view class="stepper">
						<text class="step-btn" @click="changeQty(-1)">－</text>
						<input class="step-input" type="number" v-model="form.qty" />
						<text class="step-btn" @click="changeQty(1)">＋</text>
					</view>
				</view>
				<view class="field">
					<text class="field-label">用于互换的物料<text class="req-star" v-if="listing.allow_free === false"> *</text><text class="opt-tag" v-else>（可选）</text></text>
					<input class="field-input" v-model="form.offerItem" placeholder="如：我有B版小卡" maxlength="100" />
				</view>
				<view class="field">
					<text class="field-label">我的备注</text>
					<textarea class="field-textarea" v-model="form.remark" placeholder="如：我有B版小卡可以换" maxlength="100" />
				</view>
				<button class="primary-btn" :disabled="submitting" @click="submitApply">{{ submitting ? '提交中...' : '提交申请' }}</button>
			</view>

			<!-- 不可申请（满/过期/关闭） -->
			<view class="section-card" v-else>
				<view class="tip-line">当前无法申请</view>
				<button class="ghost-btn" @click="goHome">返回首页</button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userId: '',
			code: '',
			loading: true,
			error: '',
			isOwner: false,
			listing: { name: '', image: '', total_qty: 0, remaining: 0, remark: '', status: 1, allow_free: true },
			myApply: null,
			form: { nickname: '', qty: '1', remark: '', offerItem: '' },
			submitting: false
		}
	},
	computed: {
		statusText() {
			const s = this.listing.status
			if (s === 2) return '名额已满'
			if (s === 3) return '该互换已结束'
			if (s === 4) return '该互换已过期'
			return ''
		},
		canApply() {
			return !this.isOwner && !this.myApply && this.listing.status === 1 && this.listing.remaining > 0
		}
	},
	onLoad(options) {
		const raw = uni.getStorageSync('userInfo')
		let info = {}
		if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
		this.userId = info._id || ''
		this.form.nickname = info.nickName || ''
		this.code = (options.code || '').trim().toUpperCase()
		this.loadData()
	},
	onShareAppMessage() {
		return { title: '来跟我换物料吧：' + this.listing.name, path: '/pages/game/xianxia/huhuan/huhuan-apply?code=' + this.code }
	},
	onShareTimeline() {
		return { title: '来跟我换物料吧：' + this.listing.name }
	},
	methods: {
		loadData() {
			if (!this.code) { this.loading = false; this.error = '缺少物料码'; return }
			this.loading = true
			uniCloud.callFunction({
				name: 'exchange',
				data: { action: 'getListingByCode', code: this.code, userId: this.userId },
				success: (res) => {
					this.loading = false
					if (res.result.code === 0) {
						const d = res.result.data
						this.isOwner = d.isOwner
						this.listing = d.listing
						this.myApply = d.myApply || null
					} else {
						this.error = res.result.msg
					}
				},
				fail: (err) => {
					this.loading = false
					console.error('查询失败:', err)
					this.error = '网络错误，请重试'
				}
			})
		},
		changeQty(delta) {
			let n = parseInt(this.form.qty) || 1
			n = Math.max(1, Math.min(Math.max(1, this.listing.remaining), n + delta))
			this.form.qty = String(n)
		},
		previewImg() {
			if (this.listing.image) uni.previewImage({ urls: [this.listing.image] })
		},
		submitApply() {
			if (!this.userId) { uni.showToast({ title: '请先登录', icon: 'none' }); return }
			const nickname = (this.form.nickname || '').trim()
			if (!nickname) { uni.showToast({ title: '请填写昵称', icon: 'none' }); return }
			const qty = parseInt(this.form.qty) || 1
			if (qty < 1) { uni.showToast({ title: '数量至少 1', icon: 'none' }); return }
			if (qty > this.listing.remaining) { uni.showToast({ title: '超过剩余名额', icon: 'none' }); return }
			const offerItem = (this.form.offerItem || '').trim()
			if (this.listing.allow_free === false && !offerItem) { uni.showToast({ title: '请填写用于互换的物料', icon: 'none' }); return }

			this.submitting = true
			uniCloud.callFunction({
				name: 'exchange',
				data: {
					action: 'applyExchange', userId: this.userId, code: this.code,
					nickname, qty, remark: (this.form.remark || '').trim(), offerItem
				},
				success: (res) => {
					this.submitting = false
					if (res.result.code === 0) {
						uni.showToast({ title: '申请成功', icon: 'success' })
						this.myApply = { qty, status: 0, nickname }
						this.loadData()
					} else {
						uni.showToast({ title: res.result.msg, icon: 'none' })
						this.loadData()
					}
				},
				fail: (err) => {
					this.submitting = false
					console.error('申请失败:', err)
					uni.showToast({ title: '网络错误', icon: 'none' })
				}
			})
		},
		cancelApply() {
			if (!this.myApply) return
			uni.showModal({
				title: '取消申请', content: '确定取消这条互换申请吗？取消后可重新申请。',
				success: (r) => {
					if (!r.confirm) return
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'cancelApply', userId: this.userId, applyId: this.myApply._id },
						success: (res) => {
							if (res.result.code === 0) { uni.showToast({ title: '已取消', icon: 'none' }); this.myApply = null; this.loadData() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
					})
				}
			})
		},
		goManage() {
			uni.redirectTo({ url: '/pages/game/xianxia/huhuan/huhuan-manage?mode=manage&listingId=' + this.listing._id })
		},
		goHome() { uni.navigateBack({ delta: 1, fail: () => uni.redirectTo({ url: '/pages/game/xianxia/huhuan/huhuan' }) }) }
	}
}
</script>

<style lang="scss">
.page-container { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 24rpx; box-sizing: border-box; }

.loading-box, .error-box { text-align: center; padding: 120rpx 0; color: #8a86a8; font-size: 28rpx; }
.error-icon { font-size: 90rpx; margin-bottom: 20rpx; }
.error-text { margin-bottom: 30rpx; }

.listing-card { background: #fff; border-radius: 28rpx; padding: 30rpx; box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10); }
.from-line { font-size: 26rpx; color: #2e8b6f; font-weight: bold; margin-bottom: 20rpx; }
.listing-main { display: flex; align-items: center; }
.listing-img { width: 160rpx; height: 160rpx; border-radius: 16rpx; margin-right: 24rpx; background: #f2f2f7; }
.listing-img-empty { display: flex; align-items: center; justify-content: center; font-size: 60rpx; }
.listing-info { flex: 1; }
.listing-name { font-size: 34rpx; font-weight: bold; color: #333; }
.listing-remain { font-size: 26rpx; color: #777; margin-top: 12rpx; }
.remain-num { font-size: 34rpx; font-weight: bold; color: #fa709a; }
.listing-remark { font-size: 26rpx; color: #666; margin-top: 20rpx; line-height: 1.6; background: #f6f6fb; border-radius: 14rpx; padding: 18rpx 22rpx; }
.no-free-banner { margin-top: 20rpx; font-size: 24rpx; color: #ef6c00; background: #fff7e6; border-radius: 14rpx; padding: 16rpx 22rpx; line-height: 1.5; }
.status-banner { margin-top: 20rpx; text-align: center; font-size: 26rpx; color: #c62828; background: #fdecea; border-radius: 14rpx; padding: 16rpx; }

.section-card { background: #fff; border-radius: 28rpx; padding: 32rpx 30rpx; margin-top: 24rpx; box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10); }
.tip-line { text-align: center; font-size: 28rpx; color: #999; margin-bottom: 22rpx; }

.applied-box { text-align: center; padding: 20rpx 0 30rpx; }
.applied-icon { font-size: 70rpx; }
.applied-text { font-size: 32rpx; font-weight: bold; color: #2e8b6f; margin-top: 12rpx; }
.applied-status { font-size: 24rpx; color: #999; margin-top: 10rpx; }
.applied-offer { font-size: 26rpx; color: #2e8b6f; margin-top: 10rpx; }
.req-star { color: #c62828; }
.opt-tag { color: #bbb; font-size: 22rpx; }

.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.field-input { height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; }
.field-textarea { width: 100%; box-sizing: border-box; height: 130rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; }

.stepper { display: flex; align-items: center; gap: 20rpx; }
.step-btn { width: 88rpx; height: 84rpx; line-height: 84rpx; text-align: center; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; font-size: 40rpx; color: #2e8b6f; }
.step-btn:active { background: #eefaf3; }
.step-input { flex: 1; height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; text-align: center; font-size: 34rpx; }

.primary-btn { background: linear-gradient(135deg, #43e97b 0%, #38b2ac 100%); color: #fff; border-radius: 44rpx; height: 92rpx; line-height: 92rpx; font-size: 32rpx; border: none; &[disabled] { opacity: .6; } }
.ghost-btn { background: #fff; color: #2e8b6f; border: 2rpx solid #2e8b6f; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.ghost-btn.danger { color: #c62828; border-color: #c62828; }
</style>
