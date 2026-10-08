<template>
	<view class="page">
		<view v-if="loading" class="center-tip">正在串门……</view>

		<view v-else>
			<view class="card">
				<view class="my-code">我的杯蜜编号：<text class="code">{{ friendCode }}</text></view>
				<view class="sub">把编号分享给好友，对方申请、你同意后就能互相送关心啦～</view>
				<button class="copy-btn" @click="copyCode">复制编号</button>
			</view>

			<view class="card">
				<view class="sec">添加好友</view>
				<view class="sub">输入对方编号发送申请，需对方同意后才会成为好友</view>
				<view class="add-row">
					<input class="add-ipt" v-model="inputCode" placeholder="输入好友杯蜜编号" maxlength="6" />
					<button class="add-btn" @click="addFriend">发申请</button>
				</view>
			</view>

			<!-- 待我确认的申请 -->
			<view class="card" v-if="incoming.length">
				<view class="sec-head">
					<text class="sec">待我确认的申请</text>
					<text class="help-left">{{ incoming.length }} 条</text>
				</view>
				<view v-for="r in incoming" :key="'in-' + r.friendCode" class="f-item">
					
					<view class="f-info">
						<text class="f-n">{{ r.name }}</text>
						<text class="f-c">{{ r.friendCode }}</text>
					</view>
					<button class="f-help" @click="accept(r)">同意</button>
					<button class="f-cut" @click="reject(r)">拒绝</button>
				</view>
			</view>

			<!-- 我发出的、等待对方同意 -->
			<view class="card" v-if="outgoing.length">
				<view class="sec-head">
					<text class="sec">等待对方同意</text>
				</view>
				<view v-for="r in outgoing" :key="'out-' + r.friendCode" class="f-item">
				
					<view class="f-info">
						<text class="f-n">{{ r.name }}</text>
						<text class="f-c">{{ r.friendCode }}</text>
					</view>
					<text class="f-waiting">待同意…</text>
				</view>
			</view>

			<view class="card">
				<view class="sec-head">
					<text class="sec">好友列表</text>
					<text class="help-left">今日还能送 {{ helpLeft }} 次关心</text>
				</view>
				<view v-if="!friends.length" class="no-friend">还没有好友杯蜜，发送申请并等对方同意后就有了～</view>
				<view v-for="f in friends" :key="f.friendCode" class="f-item">
					
					<view class="f-info">
						<text class="f-n">{{ f.name }}</text>
						<text class="f-c">{{ f.friendCode }}</text>
					</view>
					<button class="f-help" :disabled="helpLeft <= 0" @click="help(f)">送关心 ❤️</button>
					<button class="f-cut" @click="cut(f)">绝交</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'

export default {
	data() {
		return { loading: true, userId: '', friendCode: '', friends: [], incoming: [], outgoing: [], helpDone: 0, inputCode: '' }
	},
	computed: {
		helpLeft() { return Math.max(0, 3 - this.helpDone) }
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
	},
	onShow() { this.load() },
	methods: {
		async load() {
			this.loading = true
			const [fRes, st] = await Promise.all([
				callBeemore({ action: 'friendList', userId: this.userId }),
				callBeemore({ action: 'getStatus', userId: this.userId })
			])
			if (fRes.code === 0 && fRes.data) {
				this.friendCode = fRes.data.friendCode || ''
				this.friends = fRes.data.friends || []
				this.incoming = fRes.data.incoming || []
				this.outgoing = fRes.data.outgoing || []
			}
			if (st.code === 0 && st.data && st.data.pet) this.helpDone = (st.data.pet.daily && st.data.pet.daily.help) || 0
			this.loading = false
		},
		copyCode() {
			uni.setClipboardData({ data: this.friendCode, success: () => uni.showToast({ title: '编号已复制', icon: 'none' }) })
		},
		async addFriend() {
			const code = (this.inputCode || '').trim().toUpperCase()
			if (code.length < 4) { uni.showToast({ title: '请输入正确编号', icon: 'none' }); return }
			const res = await callBeemore({ action: 'addFriend', userId: this.userId, friendCode: code })
			uni.showToast({ title: res.message || (res.code === 0 ? '申请已发送' : '操作失败'), icon: 'none' })
			if (res.code === 0) { this.inputCode = ''; this.load() }
		},
		async accept(r) {
			const res = await callBeemore({ action: 'acceptFriend', userId: this.userId, friendCode: r.friendCode })
			uni.showToast({ title: res.message || (res.code === 0 ? '已同意' : '操作失败'), icon: 'none' })
			if (res.code === 0) this.load()
		},
		async reject(r) {
			const res = await callBeemore({ action: 'rejectFriend', userId: this.userId, friendCode: r.friendCode })
			uni.showToast({ title: res.message || (res.code === 0 ? '已拒绝' : '操作失败'), icon: 'none' })
			if (res.code === 0) this.load()
		},
		async help(f) {
			if (this.helpLeft <= 0) { uni.showToast({ title: '今天帮满啦，明天再来', icon: 'none' }); return }
			const res = await callBeemore({ action: 'helpFriend', userId: this.userId, friendCode: f.friendCode })
			if (res.code === 0) {
				uni.showToast({ title: `已送关心给「${res.data.targetName}」`, icon: 'none' })
				this.helpDone += 1
				this.load()
			} else {
				uni.showToast({ title: res.message || '送关心失败', icon: 'none' })
			}
		},
		cut(f) {
			uni.showModal({
				title: '确认绝交',
				content: `确定要和「${f.name}」绝交吗？双方会自动解除好友关系，不会通知对方。`,
				success: async (r) => {
					if (!r.confirm) return
					const res = await callBeemore({ action: 'removeFriend', userId: this.userId, friendCode: f.friendCode })
					uni.showToast({ title: res.message || (res.code === 0 ? '已绝交' : '操作失败'), icon: 'none' })
					if (res.code === 0) this.load()
				}
			})
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.card { background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 14px; }
.sec { font-size: 15px; font-weight: bold; color: #6a5acd; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.my-code { font-size: 15px; color: #444; }
.code { font-weight: bold; color: #6a5acd; letter-spacing: 2px; }
.sub { font-size: 12px; color: #999; margin: 6px 0 10px; }
.copy-btn { background: #6a5acd; color: #fff; font-size: 13px; border-radius: 10px; line-height: 2.2; }
.add-row { display: flex; gap: 8px; margin-top: 10px; }
.add-ipt { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 6px 10px; background: #faf9ff; }
.add-btn { background: #43e97b; color: #fff; font-size: 13px; border-radius: 10px; margin: 0; padding: 0 14px; line-height: 2.2; }
.no-friend { font-size: 12px; color: #aaa; text-align: center; padding: 10px 0; }
.f-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1rpx solid #f0eef7; }
.f-item:first-of-type { border-top: none; }
.f-e { font-size: 24px; }
.f-info { flex: 1; display: flex; flex-direction: column; }
.f-n { font-size: 14px; color: #444; }
.f-c { font-size: 12px; color: #999; }
.f-help { background: #ff8a8a; color: #fff; font-size: 12px; border-radius: 10px; margin: 0; padding: 0 10px; line-height: 2; }
.f-help[disabled] { opacity: .5; }
.f-cut { background: #eee; color: #999; font-size: 12px; border-radius: 10px; margin: 0 0 0 6px; padding: 0 10px; line-height: 2; }
.f-waiting { font-size: 12px; color: #b9a8e8; }
.help-left { font-size: 12px; color: #8a7fb0; }
</style>
