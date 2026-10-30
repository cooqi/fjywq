<template>
	<view class="page">
		<!-- 顶部状态条：杯蜜在忙/睡觉时提示留言会稍后回复 -->
		<view class="state-bar" :style="{ background: tone }">
			<text class="sb-e">{{ statusEmoji }}</text>
			<text class="sb-t">{{ stateTip }}</text>
		</view>

		<scroll-view class="msg-list" scroll-y :scroll-into-view="intoView" :scroll-top="scrollTop" scroll-with-animation>
			<view v-if="loading" class="center-tip">翻聊天记录……</view>
			<view v-else-if="!list.length" class="empty">还没有聊天记录，跟杯蜜说点什么吧～</view>

			<view v-for="(m, i) in list" :key="m._id || i" :id="'m' + i" class="msg" :class="m.role === 'user' ? 'me' : 'beemore'">
				<!-- 杯蜜头像 -->
				<view v-if="m.role !== 'user'" class="avatar">{{ petEmoji }}</view>
				<view class="bubble">
					<text class="txt">{{ m.role === 'user' ? m.text : (m.emoticon || m.text) }}</text>
					<text v-if="m.role === 'user' && m.queued" class="queued">（已送达，稍后回复）</text>
				</view>
			</view>
			<view class="list-end" id="listEnd"></view>
		</scroll-view>

		<view class="input-bar">
			<input
				class="ipt"
				v-model="draft"
				type="text"
				:maxlength="200"
				placeholder="给杯蜜发消息…"
				confirm-type="send"
				:adjust-position="true"
				@confirm="send"
			/>
			<button class="send-btn" :disabled="sending || !draft.trim()" @click="send">发送</button>
		</view>
	</view>
</template>

<script>
import { getMyUserInfo, chatSend, chatHistory } from './store/pet.js'
import { STATUS_MAP, isLocked } from './beemore.js'

export default {
	data() {
		return {
			loading: true, sending: false, userId: '',
			petEmoji: '🐥', status: 'idle',
			list: [], draft: '', intoView: '', scrollTop: 0
		}
	},
	computed: {
		statusMeta() { return STATUS_MAP[this.status] || STATUS_MAP.idle },
		statusEmoji() { return this.statusMeta.emoji },
		tone() { return this.statusMeta.tone },
		stateTip() {
			if (isLocked(this.status)) {
				return this.status === 'sleeping' ? '杯蜜睡着了，消息会醒来后回复 Zzz…' : '杯蜜正在上班，下班再联系～'
			}
			return this.statusMeta.hint
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.loadHistory()
	},
	methods: {
		async loadHistory() {
			this.loading = true
			const res = await chatHistory(this.userId)
			if (res.code === 0 && res.data) {
				this.list = res.data.list || []
				this.scrollToEnd()
			}
			this.loading = false
		},
		appendMsg(msg) {
			this.list.push(msg)
			this.$nextTick(() => this.scrollToEnd())
		},
		scrollToEnd() {
			// 先清空再设置，保证连续两次滚到同一条消息也能触发滚动
			this.intoView = ''
			this.$nextTick(() => { this.intoView = 'listEnd' })
			// 兜底：新消息（如杯蜜回复）导致内容变高后，scroll-into-view 可能因节点尚未渲染完而不生效，
			// 延迟量一下内容高度，直接用 scroll-top 压到底
			setTimeout(() => this.forceScrollBottom(), 120)
		},
		forceScrollBottom() {
			const q = uni.createSelectorQuery().in(this)
			q.select('.msg-list').boundingClientRect()
			q.select('.msg-list').node()
			q.select('#listEnd').boundingClientRect()
			q.exec((res) => {
				const box = res && res[0]
				const node = res && res[1]
				const end = res && res[2]
				if (!box || !node || !node.height || !end) return
				// 内容末尾 listEnd 在视口下方的距离，大于阈值说明还没滚到底
				const remain = end.bottom - box.bottom
				if (remain > 4) {
					// 每次 +1 避免设了相同值不触发滚动
					this.scrollTop = node.height + 1 + (this.scrollTop % 100)
				}
			})
		},
		async send() {
			const text = this.draft.trim()
			if (!text || this.sending) return
			this.sending = true
			this.draft = ''
			const now = Date.now()
			this.appendMsg({ _id: 'u' + now, role: 'user', text, queued: false, create_date: now })
			const res = await chatSend(this.userId, text)
			if (res.code === 0 && res.data) {
				const d = res.data
				this.status = d.status || this.status
				this.appendMsg({
					_id: 'b' + (now + 1), role: 'beemore', emoticon: d.reply,
					state: d.status, queued: d.queued, create_date: now + 1
				})
			} else {
				uni.showToast({ title: res.message || '发送失败', icon: 'none' })
			}
			this.sending = false
		}
	}
}
</script>

<style scoped>
/* 整页锁死一屏：禁止页面自身滚动，只允许 msg-list 内部滚动 */
.page { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: linear-gradient(180deg, #e6cffc 0%, #cff8f5 100%); }
.state-bar { flex-shrink: 0; display: flex; align-items: center; padding: 8px 14px; gap: 8px; color: #fff; font-size: 12px; }
.sb-e { font-size: 16px; }
.sb-t { flex: 1; opacity: .95; }
/* height:0 + flex:1 强制 scroll-view 在 flex 容器内正确收缩，超出内容内部滚动 */
.msg-list { flex: 1; height: 0; min-height: 0; overflow-y: auto; -webkit-overscroll-behavior: contain; overscroll-behavior: contain; padding: 12px 14px; box-sizing: border-box; }
.center-tip, .empty { text-align: center; color: #8a7fb0; font-size: 13px; margin-top: 60px; }
.msg { display: flex; align-items: flex-end; margin-bottom: 14px; }
.msg.me { flex-direction: row-reverse; }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-right: 8px; box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.bubble { max-width: 72%; padding: 10px 13px; border-radius: 16px; font-size: 15px; line-height: 1.5; word-break: break-all; }
.msg.beemore .bubble { background: #fff; color: #444; border-bottom-left-radius: 4px; }
.msg.me .bubble { background: linear-gradient(135deg, #7f9cf5, #b06ab3); color: #fff; border-bottom-right-radius: 4px; }
.txt { display: block; }
.queued { display: block; font-size: 11px; opacity: .8; margin-top: 3px; }
.list-end { height: 1px; }
/* 固定在最下方：不收缩，padding-bottom 适配刘海屏/home 条安全区 */
.input-bar { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 10px 14px calc(10px + constant(safe-area-inset-bottom)); padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -2px 10px rgba(0,0,0,.05); }
.ipt { flex: 1; background: #f2f0fa; border-radius: 20px; padding: 9px 14px; font-size: 15px; }
.send-btn { background: linear-gradient(135deg, #7f9cf5, #b06ab3); color: #fff; border-radius: 20px; font-size: 14px; padding: 0 18px; min-width: 68px; line-height: 38px; margin: 0; }
.send-btn[disabled] { opacity: .5; }
</style>
