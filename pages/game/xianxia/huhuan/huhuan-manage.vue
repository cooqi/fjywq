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
					<view class="li-badge" :class="item.status === 1 ? 'b-done' : item.status === 2 ? 'b-out' : 'b-wait'">{{ item.status === 1 ? '已互换' : item.status === 2 ? '已取消' : '待互换' }}</view>
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
					<view class="head-status" v-if="listing.status !== 1 && listing.status !== 5">{{ listingStatusText(listing.status) }}</view>
					<view class="cancelled-banner" v-if="listing.status === 5">🚫 该发布已取消，申请者查看时会看到「已取消」提示</view>
					<button class="primary-btn restore-btn" v-if="listing.status === 5" :disabled="restoring" @click="doRestore">{{ restoring ? '恢复中...' : '恢复并继续互换' }}</button>
				</view>

				<!-- 编辑发布信息（已取消的先恢复后再编辑） -->
				<view class="add-apply-bar" v-if="listing.status !== 5" @click="toggleListingEdit">
					<text v-if="!listingEditVisible">✎ 编辑发布信息</text>
					<text v-else>收起编辑 ▲</text>
				</view>
				<view class="add-form" v-if="listingEditVisible && listing.status !== 5">
					<view class="field">
						<text class="field-label">物料名称 <text class="req-star">*</text></text>
						<input class="field-input" v-model="listingForm.name" maxlength="40" />
						<view class="edit-img-tip">图片不在此处修改，如需换图请重新发布</view>
					</view>
					<view class="field">
						<text class="field-label">互换总份数（已分配 {{ listing.used_qty }} 份）</text>
						<input class="field-input" type="number" v-model="listingForm.totalQty" />
					</view>
					<view class="field">
						<text class="field-label">公开备注</text>
						<textarea class="field-textarea" v-model="listingForm.remark" placeholder="申请者可见" maxlength="200" />
					</view>
					<view class="field switch-field">
						<text class="field-label">允许伸手（可不提供互换物料）</text>
						<switch :checked="listingForm.allowFree" color="#38b2ac" @change="onAllowFreeChange" />
					</view>
					<button class="ghost-btn add-submit" :disabled="savingListing" @click="saveListing">{{ savingListing ? '保存中...' : '保存修改' }}</button>
				</view>

			<!-- 申请列表（已取消的单不展示申请，提供恢复入口） -->
				<view class="apply-list" v-if="listing.status !== 5">
					<!-- 发布者自行添加申请（线下代客登记） -->
					<view class="add-apply-bar" @click="toggleAddForm">
						<text v-if="!showAddForm">＋ 添加申请（线下补录）</text>
						<text v-else>收起 ▲</text>
					</view>
					<view class="add-form" v-if="showAddForm">
						<view class="field">
							<text class="field-label">对方昵称 <text class="req-star">*</text></text>
							<input class="field-input" v-model="addForm.nickname" placeholder="对方线下常用圈名" maxlength="20" />
						</view>
						<view class="field">
							<text class="field-label">份数（剩余 {{ addQtyMax }} 份）</text>
							<view class="stepper">
								<text class="step-btn" @click="changeAddQty(-1)">－</text>
								<input class="step-input" type="number" v-model="addForm.qty" />
								<text class="step-btn" @click="changeAddQty(1)">＋</text>
							</view>
						</view>
						<view class="field">
							<text class="field-label">互换物料（可选）</text>
							<input class="field-input" v-model="addForm.offerItem" placeholder="如：对方用B版小卡来换" maxlength="100" />
						</view>
						<view class="field">
							<text class="field-label">备注（可选）</text>
							<textarea class="field-textarea" v-model="addForm.remark" placeholder="登记说明，如现场沟通情况" maxlength="100" />
						</view>
						<view class="field">
							<text class="field-label">我的备注（仅自己可见，可选）</text>
							<textarea class="field-textarea note-textarea" v-model="addForm.note" placeholder="给自己记的私密备注" maxlength="100" />
						</view>
						<button class="ghost-btn add-submit" :disabled="adding" @click="submitOwnerAdd">{{ adding ? '提交中...' : '确认添加' }}</button>
					</view>

					<view class="apply-item" v-for="a in applies" :key="a._id">
						<view class="ai-top">
							<view class="ai-dot" :class="a.status === 1 ? 'dot-done' : 'dot-wait'"></view>
							<view class="ai-nick">{{ a.nickname }}</view>
							<text class="ai-src" v-if="a.source === 'owner'">补录</text>
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
						<!-- 发布者私密备注（与申请者的备注不是同一个，仅自己可见） -->
						<view class="ai-remark ai-owner" v-if="editingNoteId !== a._id">我的备注（仅你可见）：{{ a.owner_note || '无' }}</view>
						<view class="ai-note-edit" v-else>
							<textarea class="note-textarea" v-model="editNote" placeholder="给自己记的备注，申请者看不到" maxlength="100" :auto-height="false" />
							<view class="note-btn-row">
								<text class="qty-save" @click="saveNote(a)">确定</text>
								<text class="qty-cancel" @click="editingNoteId = ''">取消</text>
							</view>
						</view>
						<view class="ai-btns" v-if="editingId !== a._id">
							<text class="ai-btn" v-if="a.status === 0" @click="startEdit(a)">改数量</text>
							<text class="ai-btn" v-if="a.status === 0" @click="confirmSwap(a)">标记已互换</text>
							<text class="ai-btn" v-if="editingNoteId !== a._id" @click="startNote(a)">{{ a.owner_note ? '改我的备注' : '加我的备注' }}</text>
							<text class="ai-btn del" @click="deleteApply(a)">删除</text>
						</view>
					</view>
					<view class="empty-tip" v-if="applies.length === 0">还没有人申请，把物料码分享给好友吧～</view>
				</view>

				<view class="btn-row">
					<button class="ghost-btn danger" v-if="listing.status !== 5" @click="deleteListing">取消发布</button>
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
			editQty: '',
			editingNoteId: '',
			editNote: '',
			savingNote: false,
			// 发布者补录申请
			showAddForm: false,
			adding: false,
			addForm: { nickname: '', qty: '1', offerItem: '', remark: '', note: '' },
			// 编辑发布 / 恢复
			listingEditVisible: false,
			savingListing: false,
			restoring: false,
			listingForm: { name: '', totalQty: '', remark: '', allowFree: true }
		}
	},
	computed: {
		barWidth() {
			const t = this.listing.total_qty || 1
			return Math.min(100, Math.round((this.listing.used_qty || 0) / t * 100)) + '%'
		},
		addQtyMax() {
			return Math.max(0, (this.listing.total_qty || 0) - (this.listing.used_qty || 0))
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
		toggleAddForm() {
			this.showAddForm = !this.showAddForm
			if (this.showAddForm) this.addForm = { nickname: '', qty: '1', offerItem: '', remark: '', note: '' }
		},
		changeAddQty(delta) {
			let n = parseInt(this.addForm.qty) || 1
			n = Math.max(1, Math.min(Math.max(1, this.addQtyMax), n + delta))
			this.addForm.qty = String(n)
		},
		submitOwnerAdd() {
			if (this.adding) return
			const nickname = (this.addForm.nickname || '').trim()
			if (!nickname) { uni.showToast({ title: '请填写对方昵称', icon: 'none' }); return }
			const qty = parseInt(this.addForm.qty) || 1
			if (qty < 1) { uni.showToast({ title: '份数至少 1', icon: 'none' }); return }
			if (qty > this.addQtyMax) { uni.showToast({ title: `剩余名额仅 ${this.addQtyMax} 份`, icon: 'none' }); return }
			this.adding = true
			uniCloud.callFunction({
				name: 'exchange',
				data: {
					action: 'ownerAddApply', userId: this.userId, listingId: this.listingId,
					nickname, qty,
					offerItem: (this.addForm.offerItem || '').trim(),
					remark: (this.addForm.remark || '').trim(),
					note: (this.addForm.note || '').trim()
				},
				success: (res) => {
					this.adding = false
					if (res.result.code === 0) {
						uni.showToast({ title: '已添加', icon: 'success' })
						this.showAddForm = false
						this.loadManage()
					} else uni.showToast({ title: res.result.msg, icon: 'none' })
				},
				fail: (err) => { this.adding = false; console.error('添加申请失败:', err); uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
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
		startNote(a) {
			this.editingNoteId = a._id
			this.editNote = a.owner_note || ''
		},
		saveNote(a) {
			if (this.savingNote) return
			this.savingNote = true
			uniCloud.callFunction({
				name: 'exchange',
				data: { action: 'setApplyNote', userId: this.userId, applyId: a._id, note: (this.editNote || '').trim() },
				success: (res) => {
					this.savingNote = false
					if (res.result.code === 0) {
						uni.showToast({ title: '已保存', icon: 'none' })
						a.owner_note = res.result.data.owner_note
						this.editingNoteId = ''
					} else uni.showToast({ title: res.result.msg, icon: 'none' })
				},
				fail: (err) => { this.savingNote = false; console.error('保存备注失败:', err); uni.showToast({ title: '网络错误', icon: 'none' }) }
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
				title: '取消发布', content: '取消后所有申请将失效（申请者会看到已取消），之后可恢复并再次编辑。确定取消吗？',
				success: (r) => {
					if (!r.confirm) return
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'deleteListing', userId: this.userId, listingId: this.listingId },
						success: (res) => {
							if (res.result.code === 0) { uni.showToast({ title: '已取消', icon: 'none' }); this.listingEditVisible = false; this.loadManage() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: () => uni.showToast({ title: '网络错误', icon: 'none' })
					})
				}
			})
		},
		doRestore() {
			if (this.restoring) return
			uni.showModal({
				title: '恢复发布', content: '恢复后发布单继续生效，被联动取消的申请也会一并还原。确定恢复吗？',
			success: (r) => {
					if (!r.confirm) return
					this.restoring = true
					uniCloud.callFunction({
						name: 'exchange',
						data: { action: 'restoreListing', userId: this.userId, listingId: this.listingId },
						success: (res) => {
							this.restoring = false
							if (res.result.code === 0) { uni.showToast({ title: '已恢复', icon: 'success' }); this.loadManage() }
							else uni.showToast({ title: res.result.msg, icon: 'none' })
						},
						fail: (err) => { this.restoring = false; console.error('恢复失败:', err); uni.showToast({ title: '网络错误', icon: 'none' }) }
					})
				}
			})
		},
		toggleListingEdit() {
			this.listingEditVisible = !this.listingEditVisible
			if (this.listingEditVisible) {
				this.listingForm = {
					name: this.listing.name || '',
					totalQty: String(this.listing.total_qty || 1),
					remark: this.listing.remark || '',
					allowFree: this.listing.allow_free !== false
				}
			}
		},
		onAllowFreeChange(e) { this.listingForm.allowFree = e.detail.value },
		saveListing() {
			if (this.savingListing) return
			const name = (this.listingForm.name || '').trim()
			if (!name) { uni.showToast({ title: '请填写物料名称', icon: 'none' }); return }
			const totalQty = parseInt(this.listingForm.totalQty) || 0
			if (totalQty < 1) { uni.showToast({ title: '数量至少 1', icon: 'none' }); return }
			if (totalQty < (this.listing.used_qty || 0)) { uni.showToast({ title: `不能小于已分配的 ${this.listing.used_qty} 份`, icon: 'none' }); return }
			this.savingListing = true
			uniCloud.callFunction({
				name: 'exchange',
				data: {
					action: 'updateListing', userId: this.userId, listingId: this.listingId,
					name, totalQty,
					remark: (this.listingForm.remark || '').trim(),
					allowFree: this.listingForm.allowFree
				},
				success: (res) => {
					this.savingListing = false
					if (res.result.code === 0) {
						uni.showToast({ title: '已保存', icon: 'success' })
						this.listingEditVisible = false
						this.loadManage()
					} else uni.showToast({ title: res.result.msg, icon: 'none' })
				},
				fail: (err) => { this.savingListing = false; console.error('保存发布失败:', err); uni.showToast({ title: '网络错误', icon: 'none' }) }
			})
		},

		/* ---- 文案 ---- */
		listingStatusText(s) {
			return { 1: '进行中', 2: '已满', 3: '已结束', 4: '已过期', 5: '已取消' }[s] || ''
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
.cancelled-banner { margin-top: 14rpx; font-size: 25rpx; color: #c62828; background: #fdecea; border-radius: 14rpx; padding: 16rpx 20rpx; line-height: 1.5; }
.restore-btn { margin-top: 20rpx; background: linear-gradient(135deg, #43e97b 0%, #38b2ac 100%); color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none; &[disabled] { opacity: .6; } }
.edit-img-tip { font-size: 22rpx; color: #bbb; margin-top: 8rpx; }
.switch-field { display: flex; align-items: center; justify-content: space-between; }
.switch-field .field-label { margin-bottom: 0; }

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
.ai-src { font-size: 20rpx; color: #8d6e63; background: #efebe9; border-radius: 14rpx; padding: 3rpx 12rpx; margin-right: 12rpx; flex-shrink: 0; }
.ai-remark.ai-owner { color: #b07cc6; }
.ai-note-edit { margin-top: 12rpx; }
.note-textarea { width: 100%; box-sizing: border-box; height: 110rpx; background: #faf5ff; border: 2rpx solid #eadcf5; border-radius: 14rpx; padding: 16rpx 20rpx; font-size: 26rpx; }
.note-btn-row { display: flex; justify-content: flex-end; gap: 26rpx; margin-top: 10rpx; }
.ai-btns { display: flex; gap: 30rpx; margin-top: 18rpx; }
.ai-btn { font-size: 26rpx; color: #38b2ac; padding: 6rpx 0; }
.ai-btn.del { color: #c62828; }

/* 发布者补录申请表单 */
.add-apply-bar { background: #fff; border: 2rpx dashed #38b2ac; border-radius: 22rpx; padding: 24rpx; text-align: center; font-size: 28rpx; color: #2e8b6f; margin-bottom: 16rpx; }
.add-apply-bar:active { background: #eefaf3; }
.add-form { background: #fff; border-radius: 22rpx; padding: 28rpx; margin-bottom: 16rpx; box-shadow: 0 6rpx 20rpx rgba(102, 126, 234, .08); }
.field { margin-bottom: 24rpx; }
.field-label { font-size: 26rpx; color: #666; display: block; margin-bottom: 12rpx; }
.req-star { color: #c62828; }
.field-input { height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 0 24rpx; font-size: 30rpx; }
.field-textarea { width: 100%; box-sizing: border-box; height: 130rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; }
.stepper { display: flex; align-items: center; gap: 20rpx; }
.step-btn { width: 88rpx; height: 84rpx; line-height: 84rpx; text-align: center; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; font-size: 40rpx; color: #2e8b6f; }
.step-btn:active { background: #eefaf3; }
.step-input { flex: 1; height: 84rpx; background: #f6f6fb; border: 2rpx solid #e6e6f0; border-radius: 16rpx; text-align: center; font-size: 34rpx; }
.add-submit { margin-top: 6rpx; &[disabled] { opacity: .6; } }

.btn-row { display: flex; gap: 20rpx; margin-top: 30rpx; }
.btn-row button { flex: 1; margin: 0; }
.ghost-btn { background: #fff; color: #2e8b6f; border: 2rpx solid #2e8b6f; border-radius: 44rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.ghost-btn.danger { color: #c62828; border-color: #c62828; }
</style>
