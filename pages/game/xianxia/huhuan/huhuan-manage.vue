<template>
	<view class="page-container">
		<!-- ============ 模式：我的列表 ============ -->
		<view v-if="mode === 'mine'">
			<view class="tabs">
				<view class="tab" :class="{ 'tab-active': mineTab === 'created' }" @click="switchTab('created')">我发布的</view>
				<view class="tab" :class="{ 'tab-active': mineTab === 'joined' }" @click="switchTab('joined')">我申请的</view>
			</view>

			<!-- 我发布的 -->
			<view v-if="mineTab === 'created'">
				<view class="list-item" v-for="item in myListings" :key="item._id" @click="openManage(item)">
					<view class="li-main">
						<view class="li-name">{{ item.name }}</view>
						<view class="li-sub">物料码 {{ item.code }} · 已分配 {{ item.used_qty }}/{{ item.total_qty }} 份 · {{ item.applicant_cnt }} 人</view>
					</view>
					<view class="li-badge" :class="badgeClass(item.status)">{{ listingStatusText(item.status) }}</view>
				</view>
				<view class="empty-tip" v-if="!listLoading && myListings.length === 0">你还没有发布过互换</view>
			</view>

			<!-- 我申请的 -->
			<view v-if="mineTab === 'joined'">
				<view class="list-item" v-for="item in myApplies" :key="item._id" @click="openApply(item)">
					<view class="li-main">
						<view class="li-name">{{ item.listingName }}</view>
						<view class="li-sub">{{ item.qty }} 份 · 物料码 {{ item.listingCode }}</view>
					</view>
					<view class="li-badge" :class="item.status === 1 ? 'b-done' : 'b-wait'">{{ item.status === 1 ? '已互换' : '待互换' }}</view>
				</view>
				<view class="empty-tip" v-if="!listLoading && myApplies.length === 0">你还没有申请过互换</view>
			</view>
		</view>

		<!-- ============ 模式：管理单个发布 ============ -->
		<view v-else>
			<view class="loading-box" v-if="manageLoading"><text>加载中...</text></view>

			<view v-else-if="manageError" class="error-box">
				<view class="error-text">{{ manageError }}</view>
				<button class="ghost-btn" @click="backToMine">返回列表</button>
			</view>

			<view v-else>
				<!-- 发布单头部 -->
				<view class="head-card">
					<view class="head-name">{{ listing.name }}</view>
					<view class="head-stat">已申请 {{ listing.applicant_cnt }} 人 · 已分配 {{ listing.used_qty }} / {{ listing.total_qty }} 份</view>
					<view class="head-bar"><view class="head-bar-fill" :style="{ width: barWidth }"></view></view>
					<view class="head-code">物料码 {{ listing.code }}<text class="head-copy" @click="copyCode">复制</text></view>
					<view class="head-nofree" v-if="listing.allow_free === false">🚫 不接受伸手（申请需填互换物料）</view>
					<view class="head-status" v-if="listing.status !== 1">{{ listingStatusText(listing.status) }}</view>
				</view>

				<!-- 申请列表 -->
				<view class="apply-list">
					<view class="apply-item" v-for="a in applies" :key="a._id">
						<view class="ai-top">
							<view class="ai-dot" :class="a.status === 1 ? 'dot-done' : 'dot-wait'"></view>
							<view class="ai-nick">{{ a.nickname }}</view>
							<view class="ai-qty" v-if="editingId !== a._id">{{ a.qty }} 份</view>
							<view class="ai-qty" v-else>
								<input class="qty-edit" type="number" v-model="editQty" focus />
								<text class="qty-save" @click="saveQty(a)">确定</text>
								<text class="qty-cancel" @click="editingId = ''">取消</text>
							</view>
							<view class="ai-badge" :class="a.status === 1 ? 'b-done' : 'b-wait'" v-if="a.status === 1">已互换</view>
						</view>
						<view class="ai-remark" v-if="a.offer_item">互换物料：{{ a.offer_item }}</view>
						<view class="ai-remark">备注：{{ a.remark || '无' }}</view>
						<view class="ai-btns" v-if="editingId !== a._id">
							<text class="ai-btn" v-if="a.status === 0" @click="startEdit(a)">改数量</text>
							<text class="ai-btn" v-if="a.status === 0" @click="confirmSwap(a)">标记已互换</text>
							<text class="ai-btn del" @click="deleteApply(a)">删除</text>
						</view>
					</view>
					<view class="empty-tip" v-if="applies.length === 0">还没有人申请，把物料码分享给好友吧～</view>
				</view>

				<view class="btn-row">
					<button class="ghost-btn danger" @click="deleteListing">删除发布</button>
					<button class="ghost-btn" @click="backToMine">返回</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			userId: '',
			mode: 'mine', // mine | manage
			// mine
			mineTab: 'created',
			myListings: [],
			myApplies: [],
			listLoading: false,
			// manage
			listingId: '',
			listing: {},
			applies: [],
			manageLoading: false,
			manageError: '',
			editingId: '',
			editQty: ''
		}
	},
	computed: {
		barWidth() {
			const t = this.listing.total_qty || 1
			return Math.min(100, Math.round((this.listing.used_qty || 0) / t * 100)) + '%'
		}
	},
	onLoad(options) {
		const raw = uni.getStorageSync('userInfo')
		let info = {}
		if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw } catch (e) { info = {} } }
		this.userId = info._id || ''
		this.mode = options.mode || 'mine'
		if (options.tab) this.mineTab = options.tab
		if (options.listingId) this.listingId = options.listingId
		if (this.mode === 'manage') this.loadManage()
		else this.loadMine()
	},
	onShow() {
		// 从申请/发布页返回时刷新我的列表
		if (this.mode === 'mine' && this.userId) this.loadMine()
	},
	methods: {
		/* ---- 我的列表 ---- */
		switchTab(tab) { this.mineTab = tab; this.loadMine() },
		loadMine() {
			if (!this.userId) return
			this.listLoading = true
			const actions = this.mineTab === 'created' ? 'getMyListings' : 'getMyApplies'
			uniCloud.callFunction({
				name: 'exchange',
				data: { action: actions, userId: this.userId },
				success: (res) => {
					this.listLoading = false
					if (res.result.code === 0) {
						if (this.mineTab === 'created') this.myListings = res.result.data.list
						else this.myApplies = res.result.data.list
					} else uni.showToast({ title: res.result.msg, icon: 'none' })
				},
				fail: (err) => { this.listLoading = false; console.error(err); uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
		},
		openManage(item) {
			this.mode = 'manage'
			this.listingId = item._id
			this.loadManage()
		},
		openApply(item) {
			uni.navigateTo({ url: '/pages/game/xianxia/huhuan/huhuan-apply?code=' + item.listingCode })
		},
		backToMine() {
			this.mode = 'mine'
			this.mineTab = 'created'
			this.loadMine()
		},

		/* ---- 管理 ---- */
		loadManage() {
			if (!this.listingId) { this.manageError = '缺少发布单ID'; return }
			this.manageLoading = true
			this.manageError = ''
			uniCloud.callFunction({
				name: 'exchange',
				data: { action: 'getListingForManage', userId: this.userId, listingId: this.listingId },
				success: (res) => {
					this.manageLoading = false
					if (res.result.code === 0) {
						this.listing = res.result.data.listing
						this.applies = res.result.data.applies
					} else {
						this.manageError = res.result.msg
					}
				},
				fail: (err) => { this.manageLoading = false; console.error(err); this.manageError = '网络错误，请重试' }
			})
		},
		copyCode() {
			uni.setClipboardData({ data: this.listing.code, success: () => uni.showToast({ title: '已复制', icon: 'none' }) })
		},
		startEdit(a) {
			this.editingId = a._id
			this.editQty = String(a.qty)
		},
		saveQty(a) {
			const n = parseInt(this.editQty)
			if (!(n >= 1)) { uni.showToast({ title: '份数至少 1', icon: 'none' }); return }
			if (n === a.qty) { this.editingId = ''; return }
			uniCloud.callFunction({
				name: 'exchange',
				data: { action: 'updateApplyQty', userId: this.userId, applyId: a._id, qty: n },
				success: (res) => {
					if (res.result.code === 0) { uni.showToast({ title: '已调整', icon: 'none' }); this.editingId = ''; this.loadManage() }
					else uni.showToast({ title: res.result.msg, icon: 'none' })
				},
				fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
			})
		},
		deleteApply(a) {
			uni.showModal({
				title: '删除申请', content: `删除「${a.nickname}」的 ${a.qty} 份申请？删除后名额会释放。`,
				success: (r) => {
					if (!r.confirm) return
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'deleteApply', userId: this.userId, applyId: a._id },
						success: (res) => {
							if (res.result.code === 0) { uni.showToast({ title: '已删除', icon: 'none' }); this.loadManage() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
					})
				}
			})
		},
		confirmSwap(a) {
			uni.showModal({
				title: '标记已互换', content: `确认与「${a.nickname}」已完成互换？`,
				success: (r) => {
					if (!r.confirm) return
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'confirmApply', userId: this.userId, applyId: a._id },
						success: (res) => {
							if (res.result.code === 0) { uni.showToast({ title: '已标记', icon: 'none' }); this.loadManage() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
					})
				}
			})
		},
		deleteListing() {
			uni.showModal({
				title: '删除发布', content: '删除后所有申请将失效，确定删除该发布吗？',
				success: (r) => {
					if (!r.confirm) return
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'deleteListing', userId: this.userId, listingId: this.listingId },
						success: (res) => {
							if (res.result.code === 0) { uni.showToast({ title: '已删除', icon: 'none' }); this.backToMine() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
					})
				}
			})
		},

		/* ---- 文案 ---- */
		listingStatusText(s) {
			return { 1: '进行中', 2: '已满', 3: '已结束', 4: '已过期', 5: '已删除' }[s] || ''
		},
		badgeClass(s) {
			if (s === 1) return 'b-live'
			if (s === 2) return 'b-full'
			return 'b-out'
		}
	}
}
</script>

<style lang="scss">
.page-container { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 24rpx; box-sizing: border-box; }

/* tabs */
.tabs { display: flex; background: #fff; border-radius: 20rpx; overflow: hidden; margin-bottom: 22rpx; }
.tab { flex: 1; text-align: center; padding: 24rpx 0; font-size: 28rpx; color: #666; }
.tab.tab-active { background: linear-gradient(135deg, #43e97b, #38b2ac); color: #fff; font-weight: bold; }

.list-item {
	display: flex; align-items: center; justify-content: space-between;
	background: #fff; border-radius: 22rpx; padding: 26rpx 28rpx; margin-bottom: 16rpx;
	box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, .08);
}
.list-item:active { transform: scale(.99); }
.li-main { flex: 1; }
.li-name { font-size: 30rpx; font-weight: bold; color: #333; }
.li-sub { font-size: 23rpx; color: #888; margin-top: 8rpx; }
.li-badge { font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 20rpx; flex-shrink: 0; margin-left: 16rpx; }
.b-live { background: #e8f5e9; color: #2e7d32; }
.b-full { background: #fff3e0; color: #ef6c00; }
.b-out { background: #f5f5f5; color: #aaa; }
.b-wait { background: #e3f2fd; color: #1565c0; }
.b-done { background: #ede7f6; color: #5e35b1; }
.empty-tip { text-align: center; padding: 80rpx 0; color: #999; font-size: 28rpx; }

/* manage head */
.loading-box, .error-box { text-align: center; padding: 120rpx 0; color: #8a86a8; font-size: 28rpx; }
.error-text { margin-bottom: 30rpx; }
.head-card { background: #fff; border-radius: 28rpx; padding: 30rpx; box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, .10); }
.head-name { font-size: 36rpx; font-weight: bold; color: #2e8b6f; }
.head-stat { font-size: 26rpx; color: #666; margin-top: 14rpx; }
.head-bar { height: 14rpx; background: #eef0f5; border-radius: 10rpx; margin-top: 16rpx; overflow: hidden; }
.head-bar-fill { height: 100%; background: linear-gradient(90deg, #43e97b, #38b2ac); }
.head-code { font-size: 26rpx; color: #555; margin-top: 18rpx; font-family: monospace; letter-spacing: 2rpx; }
.head-copy { display: inline-block; margin-left: 16rpx; color: #38b2ac; font-size: 24rpx; text-decoration: underline; }
.head-nofree { margin-top: 14rpx; font-size: 23rpx; color: #ef6c00; background: #fff7e6; border-radius: 12rpx; padding: 12rpx 18rpx; }
.head-status { margin-top: 14rpx; font-size: 24rpx; color: #c62828; }

/* apply list */
.apply-list { margin-top: 24rpx; }
.apply-item { background: #fff; border-radius: 22rpx; padding: 26rpx 28rpx; margin-bottom: 16rpx; box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, .08); }
.ai-top { display: flex; align-items: center; }
.ai-dot { width: 18rpx; height: 18rpx; border-radius: 50%; margin-right: 14rpx; }
.dot-wait { background: #42a5f5; }
.dot-done { background: #7e57c2; }
.ai-nick { font-size: 30rpx; font-weight: bold; color: #333; flex: 1; }
.ai-qty { font-size: 28rpx; color: #2e8b6f; font-weight: bold; }
.ai-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 18rpx; margin-left: 16rpx; }
.qty-edit { width: 90rpx; height: 56rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 12rpx; text-align: center; font-size: 28rpx; display: inline-block; }
.qty-save { color: #2e8b6f; font-size: 26rpx; margin-left: 16rpx; }
.qty-cancel { color: #999; font-size: 26rpx; margin-left: 16rpx; }
.ai-remark { font-size: 24rpx; color: #777; margin-top: 12rpx; }
.ai-btns { display: flex; gap: 30rpx; margin-top: 18rpx; }
.ai-btn { font-size: 26rpx; color: #38b2ac; padding: 6rpx 0; }
.ai-btn.del { color: #c62828; }

.btn-row { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-row button { flex: 1; margin: 0; }
.ghost-btn { background: #fff; color: #2e8b6f; border: 2rpx solid #2e8b6f; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.ghost-btn.danger { color: #c62828; border-color: #c62828; }
</style>
