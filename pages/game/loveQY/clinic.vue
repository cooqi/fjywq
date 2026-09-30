<template>
	<view class="page">
		<view v-if="loading" class="center-tip">进入诊所……</view>

		<view v-else-if="!visitable" class="empty">
			<view class="big">🩺</view>
			<view class="t">{{ notSickText }}</view>
			<button class="back" @click="goHome">回首页</button>
		</view>

		<view v-else class="clinic">
			<view class="head">
				<text class="doc">🩺 医生：{{ doctorText }}</text>
				<text class="reason">诊断原因：{{ reason }}</text>
				<text class="sub">完成下面 3 步护理，杯蜜就会好起来（不收费）</text>
			</view>

			<view class="tasks">
				<view v-for="(t, i) in tasks" :key="t.key" class="care" :class="stateClass(t, i)">
					<view class="c-left">
						<text class="c-e">{{ t.emoji }}</text>
						<text class="c-n">{{ t.name }}</text>
					</view>
					<view class="c-right">
						<text v-if="isDone(t)" class="c-tag done">已完成</text>
						<text v-else-if="!canTap(t, i)" class="c-tag wait">{{ gateText(t, i) }}</text>
						<button v-else class="c-btn" @click="doCare(t)">开始护理</button>
					</view>
				</view>
			</view>

			<view class="wait-tip">相邻护理间隔 {{ intervalText }}，请耐心等候，也可以陪杯蜜聊聊天缓解难受～</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'
import { fmtCountdown } from './beemore.js'

export default {
	data() {
		return {
			loading: true,
			visitable: false,
			notSickText: '',
			reason: '',
			doctor: {},
			tasks: [],
			care: { done: [], lastCareAt: 0 },
			intervalMs: 600000,
			userId: '',
			now: Date.now(),
			timer: null
		}
	},
	computed: {
		doctorText() {
			if (this.doctor && this.doctor.from === 'self') return '你的杯蜜就是医生，护理提速～'
			if (this.doctor && this.doctor.doctors > 0) return `诊所有 ${this.doctor.doctors} 位医生值班`
			return '暂无医生值班，外聘需 30 杯蜜币'
		},
		intervalText() {
			return fmtCountdown(this.intervalMs) || `${Math.round(this.intervalMs / 60000)} 分钟`
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.visit()
		this.timer = setInterval(() => { this.now = Date.now() }, 1000)
	},
	onUnload() { if (this.timer) clearInterval(this.timer) },
	methods: {
		async visit() {
			this.loading = true
			const res = await callBeemore({ action: 'clinicVisit', userId: this.userId })
			if (res.code === 0 && res.data) {
				if (!res.data.visitable) {
					this.visitable = false
					this.notSickText = res.message || '杯蜜状态不错，不用调养'
				} else {
					this.visitable = true
					this.reason = res.data.reason
					this.doctor = res.data.doctor || {}
					this.tasks = res.data.tasks || []
					this.care = res.data.care || { done: [], lastCareAt: 0 }
					this.intervalMs = res.data.intervalMs || 600000
				}
			} else if (res.code === 1001) {
				this.notSickText = '请先登录后再来诊所'
				this.visitable = false
			}
			this.loading = false
		},
		isDone(t) { return (this.care.done || []).includes(t.key) },
		prevDone(i) { return i === 0 || this.isDone(this.tasks[i - 1]) },
		remain() { return this.intervalMs - (this.now - (this.care.lastCareAt || 0)) },
		canTap(t, i) {
			if (this.isDone(t) || !this.prevDone(i)) return false
			// 第一个任务或已过间隔
			if ((this.care.done || []).length === 0) return true
			return this.remain() <= 0
		},
		gateText(t, i) {
			if (!this.prevDone(i)) return '待上一步'
			if (!this.isDone(t) && (this.care.done || []).length > 0 && this.remain() > 0) return '等待 ' + fmtCountdown(this.remain())
			return '待进行'
		},
		stateClass(t, i) {
			if (this.isDone(t)) return 'is-done'
			if (!this.prevDone(i)) return 'is-lock'
			return ''
		},
		async doCare(t) {
			const res = await callBeemore({ action: 'clinicCare', userId: this.userId, taskKey: t.key })
			if (res.code === 0) {
				if (res.data.finished) {
					uni.showModal({ title: '护理完成 🌱', content: '杯蜜进入恢复中，健康 +30、互动 +20，再陪陪她吧！', showCancel: false, success: () => this.goHome() })
					return
				}
				this.care = res.data.care || this.care
				uni.showToast({ title: `${t.name}完成啦`, icon: 'none' })
				// 刷新（可能触发等待间隔）
			} else if (res.code === 3001) {
				uni.showToast({ title: '还没到护理时间，稍等一下～', icon: 'none' })
			} else {
				uni.showToast({ title: res.message || '暂时不能护理', icon: 'none' })
			}
		},
		goHome() { uni.navigateBack() }
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #d6f0ff 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #6f86b0; margin-top: 120px; }
.empty { text-align: center; margin-top: 100px; }
.big { font-size: 64px; }
.t { color: #666; margin: 14px 0; }
.back { background: #6a5acd; color: #fff; border-radius: 12px; font-size: 15px; margin-top: 20px; }
.head { background: #fff; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.doc { font-size: 14px; color: #4a6fd6; font-weight: bold; }
.reason { font-size: 14px; color: #e0566b; }
.sub { font-size: 12px; color: #999; }
.care { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 14px; padding: 14px; margin-bottom: 10px; }
.care.is-done { opacity: .7; }
.care.is-lock { opacity: .5; }
.c-left { display: flex; align-items: center; gap: 10px; }
.c-e { font-size: 26px; }
.c-n { font-size: 15px; color: #444; font-weight: bold; }
.c-btn { background: #43e97b; color: #fff; font-size: 13px; border-radius: 10px; margin: 0; padding: 0 14px; line-height: 2.1; }
.c-tag { font-size: 12px; }
.c-tag.done { color: #43a047; }
.c-tag.wait { color: #c98b00; }
.wait-tip { font-size: 12px; color: #8a7fb0; text-align: center; margin-top: 10px; line-height: 1.6; }
</style>
