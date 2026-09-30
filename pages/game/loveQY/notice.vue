<template>
	<view class="page">
		<view v-if="loading" class="center-tip">正在打开消息……</view>

		<view v-else-if="!list.length" class="empty">
			<view class="big">🔔</view>
			<view class="t">还没有消息～</view>
		</view>

		<view v-else>
			<view class="head">
				<text class="cnt">共 {{ list.length }} 条<text v-if="unread"> · {{ unread }} 条未读</text></text>
				<view v-if="unread" class="read-all" @click.stop="readAll">全部已读</view>
			</view>
			<view v-for="n in list" :key="n._id" class="item" :class="{ unread: !n.read }" @click="open(n)">
				<text class="i-e">{{ iconOf(n.type) }}</text>
				<view class="i-body">
					<view class="i-title">{{ n.title || titleOf(n.type) }}</view>
					<view class="i-text">{{ n.text }}</view>
					<view class="i-time">{{ fmt(n.create_date) }}</view>
				</view>
				<view v-if="!n.read" class="i-dot"></view>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'
import { fmtTime } from './beemore.js'

const ICONS = { friend_apply: '🤝', heart: '❤️' }
const TITLES = { friend_apply: '新的好友申请', heart: '收到一份关心' }

export default {
	data() { return { loading: true, userId: '', list: [], unread: 0 } },
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.load()
	},
	methods: {
		fmt: fmtTime,
		iconOf(t) { return ICONS[t] || '🔔' },
		titleOf(t) { return TITLES[t] || '消息' },
		async load() {
			this.loading = true
			const res = await callBeemore({ action: 'noticeList', userId: this.userId })
			if (res.code === 0 && res.data) {
				this.list = res.data.list || []
				this.unread = res.data.unread || 0
			}
			this.loading = false
		},
		async open(n) {
			if (!n.read) {
				await callBeemore({ action: 'noticeRead', userId: this.userId, noticeId: n._id })
				n.read = true
				this.unread = Math.max(0, this.unread - 1)
			}
			// 好友申请/送关心都跳好友页处理
			if (n.link) uni.navigateTo({ url: `/pages/game/loveQY/${n.link}` })
		},
		async readAll() {
			const res = await callBeemore({ action: 'noticeRead', userId: this.userId })
			if (res.code === 0) {
				this.list.forEach(n => { this.$set(n, 'read', true) })
				this.unread = 0
				uni.showToast({ title: '已全部标为已读', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || '操作失败', icon: 'none' })
			}
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.empty { text-align: center; margin-top: 120px; }
.big { font-size: 60px; }
.t { color: #888; margin-top: 10px; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.cnt { font-size: 13px; color: #6a5acd; }
.read-all { font-size: 13px; color: #fff; background: #6a5acd; border-radius: 12px; padding: 5px 14px; line-height: 1.3; }
.item { display: flex; align-items: flex-start; gap: 10px; background: #fff; border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; position: relative; }
.item.unread { border-left: 6px solid #ff8a8a; }
.i-e { font-size: 24px; }
.i-body { flex: 1; display: flex; flex-direction: column; }
.i-title { font-size: 14px; font-weight: bold; color: #444; }
.i-text { font-size: 13px; color: #666; margin-top: 4px; }
.i-time { font-size: 11px; color: #aaa; margin-top: 6px; }
.i-dot { width: 10px; height: 10px; border-radius: 50%; background: #f5576c; margin-top: 6px; }
</style>
