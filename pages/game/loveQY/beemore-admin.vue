<template>
	<view class="page">
		<!-- 非管理员：只读提示 -->
		<view v-if="!isAdminUser" class="card readonly">
			<view class="big">🔒</view>
			<view class="t">仅管理员可进入「杯蜜后台管理」</view>
			<button class="back-btn" @click="goBack">返回首页</button>
		</view>

		<view v-else>
			<view class="top-bar">
				<view class="tip">共 {{ list.length }} 类配置，运行时覆盖内置默认值</view>
				<view class="top-btns">
					<button class="mini add" @click="addNew">+ 新增配置</button>
					<button class="mini reset" @click="resetAll">恢复默认</button>
				</view>
			</view>

			<view v-if="loading" class="center-tip">加载配置……</view>

			<view v-else class="list">
				<view v-for="doc in list" :key="doc._id" class="item" :class="{ off: doc.is_active === false }">
					<view class="item-head" @click="openEdit(doc)">
						<view class="item-key">
							<text class="k">{{ doc.key }}</text>
							<text class="lb">{{ doc.label || '' }}</text>
						</view>
						<text class="status" :class="{ on: doc.is_active !== false }">{{ doc.is_active !== false ? '启用' : '停用' }}</text>
					</view>
					<view class="item-body" @click="openEdit(doc)">{{ brief(doc) }}</view>
					<view class="item-actions">
						<view class="act edit" @click="openEdit(doc)">编辑</view>
						<view class="act toggle" @click="toggleActive(doc)">{{ doc.is_active !== false ? '停用' : '启用' }}</view>
						<view class="act del" @click="del(doc)">删除</view>
					</view>
				</view>
				<view v-if="!list.length" class="center-tip">还没有配置，点「新增配置」或重新上传 init_data.json</view>
			</view>
		</view>

		<!-- 编辑弹窗（自绘遮罩，不依赖 uni-popup） -->
		<view v-if="popupVisible" class="popup-mask" @click="close" @touchmove.stop.prevent>
			<view class="dialog" @click.stop>
				<view class="d-head">
					<text class="d-title">编辑「{{ cur.key }}」</text>
					<text class="d-close" @click="close">✕</text>
				</view>

				<scroll-view scroll-y class="d-body">
					<view class="row">
						<text class="lab">配置键 key</text>
						<input v-if="!cur._id" class="ipt" v-model="cur.key" placeholder="英文键名，如 jobs（保存后不可修改）" />
						<text v-else class="ipt key-locked">{{ cur.key }}</text>
					</view>
					<view class="row">
						<text class="lab">名称 label</text>
						<input class="ipt" v-model="cur.label" placeholder="中文名，如 作息日程" />
					</view>
					<view class="row">
						<text class="lab">排序 sort</text>
						<input class="ipt" type="number" v-model.number="cur.sort" placeholder="数字越小越靠前" />
					</view>

					<!-- 结构化日程编辑 -->
					<block v-if="mode === 'schedule'">
						<view class="sec-title">工作班次（可多段 / 跨天）</view>
						<view v-for="(w, i) in sched.workShifts" :key="'w' + i" class="win">
							<view class="win-top">
								<input class="ipt name" v-model="w.name" placeholder="班次名，如 早班" />
								<text class="rm" @click="rmArr(sched.workShifts, i)">删除</text>
							</view>
							<view class="win-time">
								<picker mode="time" :value="w.start" @change="setTime(w, 'start', $event)">
									<view class="time-pick">开始 {{ w.start }}</view>
								</picker>
								<text class="dash">–</text>
								<picker mode="time" :value="w.end" @change="setTime(w, 'end', $event)">
									<view class="time-pick">结束 {{ w.end }}</view>
								</picker>
							</view>
							<view class="week">
								<text v-for="(wd, d) in weekLabels" :key="'wd' + d" class="wd" :class="{ on: w.weekdays.indexOf(d) > -1 }" @click="toggleDay(w.weekdays, d)">{{ wd }}</text>
							</view>
							<text v-if="w.end <= w.start" class="cross">跨天班次（结束次日）</text>
						</view>
						<button class="mini add" @click="addShift">+ 添加班次</button>

						<view class="sec-title">休息窗口</view>
						<view v-for="(r, i) in sched.restWindows" :key="'r' + i" class="win">
							<view class="win-top">
								<input class="ipt name" v-model="r.name" placeholder="如 午休" />
								<text class="rm" @click="rmArr(sched.restWindows, i)">删除</text>
							</view>
							<view class="win-time">
								<picker mode="time" :value="r.start" @change="setTime(r, 'start', $event)">
									<view class="time-pick">开始 {{ r.start }}</view>
								</picker>
								<text class="dash">–</text>
								<picker mode="time" :value="r.end" @change="setTime(r, 'end', $event)">
									<view class="time-pick">结束 {{ r.end }}</view>
								</picker>
							</view>
							<view class="week">
								<text v-for="(wd, d) in weekLabels" :key="'rwd' + d" class="wd" :class="{ on: r.weekdays.indexOf(d) > -1 }" @click="toggleDay(r.weekdays, d)">{{ wd }}</text>
							</view>
						</view>
						<button class="mini add" @click="addRest">+ 添加休息段</button>

						<view class="sec-title">睡眠时段（支持跨天）</view>
						<view class="win">
							<view class="win-time">
								<picker mode="time" :value="sched.sleep.start" @change="setTime(sched.sleep, 'start', $event)">
									<view class="time-pick">入睡 {{ sched.sleep.start }}</view>
								</picker>
								<text class="dash">–</text>
								<picker mode="time" :value="sched.sleep.end" @change="setTime(sched.sleep, 'end', $event)">
									<view class="time-pick">起床 {{ sched.sleep.end }}</view>
								</picker>
							</view>
							<view class="week">
								<text v-for="(wd, d) in weekLabels" :key="'swd' + d" class="wd" :class="{ on: sched.sleep.weekdays.indexOf(d) > -1 }" @click="toggleDay(sched.sleep.weekdays, d)">{{ wd }}</text>
							</view>
						</view>
						<view class="conflict-tip" v-if="conflicts.length">⚠️ {{ conflicts.join('；') }}</view>
					</block>

					<!-- JSON 编辑（其余配置整块 value） -->
					<block v-else>
						<view class="sec-title">配置载荷 value（JSON）</view>
						<textarea class="json-ipt" v-model="jsonStr" :maxlength="-1" placeholder="请输入 JSON 对象，如：{ name: 示例 }" />
						<view class="json-hint">结构需与云函数 constants.js 默认对齐；保存前会校验 JSON 合法性。jobs 支持 shifts（多班次，用户可选其一）与 custom:true（自由职业，用户自定义工作时间）。</view>
					</block>
				</scroll-view>

				<view class="d-foot">
					<label class="switch-lab">
						<switch style="transform:scale(.8)" :checked="cur.is_active !== false" color="#6a5acd" @change="onActiveSwitch" />
						<text>启用</text>
					</label>
					<button class="save-btn" @click="save">保存</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { isAdmin } from '@/common/js/permission.js'
import { loadBeemoreConfig } from './beemore.js'

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function toMin(str) {
	const p = String(str || '0:0').split(':')
	return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0)
}
// 时段拆成不跨天的区间数组（分钟）
function segs(start, end) {
	const s = toMin(start), e = toMin(end)
	if (e > s) return [[s, e]]
	if (e === s) return [[0, 1440]]
	return [[s, 1440], [0, e]] // 跨天
}
function overlap(a, b) {
	for (const [as, ae] of a) {
		for (const [bs, be] of b) {
			if (as < be && bs < ae) return true
		}
	}
	return false
}

export default {
	data() {
		return {
			isAdminUser: false, loading: false, list: [],
			popupVisible: false,
			cur: { key: '', label: '', sort: 100, is_active: true },
			mode: 'json',
			sched: { workShifts: [], restWindows: [], sleep: { start: '23:00', end: '07:00', weekdays: [0, 1, 2, 3, 4, 5, 6] } },
			jsonStr: '',
			weekLabels: WEEK
		}
	},
	computed: {
		conflicts() {
			const out = []
			const sleepSegs = segs(this.sched.sleep.start, this.sched.sleep.end)
			const dayHit = (days) => days.some(d => this.sched.sleep.weekdays.indexOf(d) > -1)
			this.sched.workShifts.forEach((w) => {
				if (dayHit(w.weekdays || []) && overlap(sleepSegs, segs(w.start, w.end))) {
					out.push(`「${w.name || '班次'}」与睡眠时段重叠`)
				}
			})
			return out
		}
	},
	onLoad() {
		try {
			const raw = uni.getStorageSync('userInfo')
			this.isAdminUser = isAdmin(raw ? JSON.parse(raw) : null)
		} catch (e) { this.isAdminUser = false }
		if (this.isAdminUser) this.load()
	},
	methods: {
		goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/game/loveQY/loveQY' }) }) },
		call(data) {
			return new Promise((resolve, reject) => {
				uniCloud.callFunction({ name: 'beemore-config', data, success: r => resolve(r.result || {}), fail: reject })
			})
		},
		async load() {
			this.loading = true
			const r = await this.call({ action: 'getList' })
			this.list = (r.code === 0 && r.data) ? r.data : []
			this.loading = false
		},
		brief(doc) {
			const v = doc.value || {}
			if (doc.key === 'schedule') {
				const w = (v.workShifts || []).map(x => `${x.name || ''}${x.start}-${x.end}`).join('、')
				return '班次：' + (w || '无') + (v.sleep ? ` ｜ 睡眠 ${v.sleep.start}-${v.sleep.end}` : '')
			}
			const keys = Object.keys(v)
			return keys.length ? `${keys.length} 项：${keys.slice(0, 6).join('、')}${keys.length > 6 ? '…' : ''}` : '空对象'
		},

		/* ---------- 编辑 ---------- */
		openEdit(doc) {
			this.cur = { key: doc.key, label: doc.label || '', sort: doc.sort != null ? doc.sort : 100, is_active: doc.is_active !== false, _id: doc._id }
			if (doc.key === 'schedule') {
				this.mode = 'schedule'
				const v = JSON.parse(JSON.stringify(doc.value || {}))
				this.sched = {
					workShifts: (v.workShifts || []).map(x => ({ name: x.name || '', start: x.start || '09:00', end: x.end || '12:00', weekdays: x.weekdays || [1, 2, 3, 4, 5] })),
					restWindows: (v.restWindows || []).map(x => ({ name: x.name || '', start: x.start || '12:00', end: x.end || '13:00', weekdays: x.weekdays || [1, 2, 3, 4, 5] })),
					sleep: { start: (v.sleep && v.sleep.start) || '23:00', end: (v.sleep && v.sleep.end) || '07:00', weekdays: (v.sleep && v.sleep.weekdays) || [0, 1, 2, 3, 4, 5, 6] }
				}
			} else {
				this.mode = 'json'
				this.jsonStr = JSON.stringify(doc.value || {}, null, 2)
			}
			this.popupVisible = true
		},
		addNew() {
			this.cur = { key: '', label: '', sort: 100, is_active: true, _id: '' }
			this.mode = 'json'
			this.jsonStr = '{}'
			this.popupVisible = true
		},
		close() { this.popupVisible = false },
		addShift() { this.sched.workShifts.push({ name: '新班次', start: '09:00', end: '12:00', weekdays: [1, 2, 3, 4, 5] }) },
		addRest() { this.sched.restWindows.push({ name: '休息', start: '12:00', end: '13:00', weekdays: [1, 2, 3, 4, 5] }) },
		rmArr(arr, i) { arr.splice(i, 1) },
		setTime(obj, field, e) { obj[field] = e.detail.value },
		onActiveSwitch(e) { this.cur.is_active = e.detail.value },
		toggleDay(days, d) {
			const idx = days.indexOf(d)
			if (idx > -1) days.splice(idx, 1)
			else days.push(d)
			this.$forceUpdate()
		},

		async save() {
			if (!this.cur.key) { uni.showToast({ title: '请填写配置键 key', icon: 'none' }); return }
			let value
			if (this.mode === 'schedule') {
				if (this.conflicts.length) {
					uni.showModal({ title: '日程冲突', content: this.conflicts.join('\n') + '\n仍要保存吗？', success: (r) => { if (r.confirm) this.doSave(this.buildSchedule()) } })
					return
				}
				value = this.buildSchedule()
			} else {
				try { value = JSON.parse(this.jsonStr) }
				catch (e) { uni.showToast({ title: 'JSON 格式有误，请检查', icon: 'none' }); return }
				if (!value || typeof value !== 'object' || Array.isArray(value)) { uni.showToast({ title: 'value 需为对象', icon: 'none' }); return }
			}
			this.doSave(value)
		},
		buildSchedule() {
			return {
				workShifts: this.sched.workShifts,
				restWindows: this.sched.restWindows,
				sleep: this.sched.sleep,
				workDays: (this.sched.workShifts[0] && this.sched.workShifts[0].weekdays) || [1, 2, 3, 4, 5]
			}
		},
		async doSave(value) {
			const sort = Number(this.cur.sort)
			const r = await this.call({
				action: 'add',
				data: { key: this.cur.key, label: this.cur.label, sort: isFinite(sort) ? sort : 100, is_active: this.cur.is_active, value }
			})
			if (r.code === 0) {
				uni.showToast({ title: r.message || '已保存', icon: 'none' }); this.close(); this.load()
				// 同步刷新本端运行时配置缓存，其他页面无需重进小程序即生效
				try { loadBeemoreConfig() } catch (e) {}
			} else uni.showToast({ title: r.message || '保存失败', icon: 'none' })
		},

		async toggleActive(doc) {
			const r = await this.call({ action: 'update', data: { _id: doc._id, is_active: doc.is_active === false } })
			if (r.code === 0) this.load()
			else uni.showToast({ title: r.message || '操作失败', icon: 'none' })
		},
		del(doc) {
			uni.showModal({ title: '确认删除', content: `删除「${doc.key}」后运行时会回退到内置默认值，确定？`, success: async (res) => {
				if (!res.confirm) return
				const r = await this.call({ action: 'delete', data: { _id: doc._id } })
				if (r.code === 0) { uni.showToast({ title: '已删除', icon: 'none' }); this.load() }
			} })
		},
		resetAll() {
			uni.showModal({ title: '恢复默认', content: '将清空全部自定义配置，运行时会使用内置默认值。确定？', confirmColor: '#e0566b', success: async (res) => {
				if (!res.confirm) return
				const r = await this.call({ action: 'resetDefaults' })
				if (r.code === 0) { uni.showToast({ title: r.message || '已恢复', icon: 'none' }); this.load() }
			} })
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f3f1fa; padding: 12px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; font-size: 13px; margin: 60px 0; }
.card { background: #fff; border-radius: 16px; padding: 18px; }
.readonly { text-align: center; margin-top: 100px; }
.big { font-size: 60px; }
.t { color: #666; margin: 14px 0; }
.back-btn { background: #6a5acd; color: #fff; border-radius: 12px; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px 12px; }
.tip { font-size: 12px; color: #8a7fb0; }
.top-btns { display: flex; gap: 8px; }
.mini { font-size: 12px; border-radius: 10px; margin: 0; padding: 0 12px; line-height: 2.2; }
.mini.add { background: #6a5acd; color: #fff; }
.mini.reset { background: #ffe1e6; color: #e0566b; }
.list { display: flex; flex-direction: column; gap: 10px; }
.item { background: #fff; border-radius: 14px; padding: 12px 14px; }
.item.off { opacity: .6; }
.item-head { display: flex; justify-content: space-between; align-items: center; }
.k { font-size: 15px; font-weight: bold; color: #6a5acd; }
.lb { font-size: 12px; color: #999; margin-left: 8px; }
.status { font-size: 12px; color: #bbb; }
.status.on { color: #43a047; }
.item-body { font-size: 12px; color: #666; margin: 8px 0; line-height: 1.5; }
.item-actions { display: flex; gap: 10px; border-top: 1rpx solid #f0eef7; padding-top: 8px; }
.act { font-size: 12px; color: #6a5acd; padding: 2px 10px; border-radius: 8px; background: #f4f2fb; }
.act.del { color: #e0566b; background: #fff0f2; }
/* 弹窗 */
.popup-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 999; background: rgba(0, 0, 0, .45); display: flex; flex-direction: column; justify-content: flex-end; }
.dialog { background: #fff; border-radius: 20px 20px 0 0; max-height: 86vh; display: flex; flex-direction: column; animation: pop-up .25s ease-out; }
@keyframes pop-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.d-head { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1rpx solid #f0eef7; }
.d-title { font-size: 16px; font-weight: bold; color: #444; }
.d-close { font-size: 18px; color: #999; padding: 0 6px; }
.d-body { padding: 12px 16px; height: 60vh; box-sizing: border-box; }
.row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.lab { font-size: 13px; color: #666; width: 90px; flex-shrink: 0; }
.ipt { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px 10px; background: #faf9ff; font-size: 14px; }
.key-locked { color: #9a8fb0; background: #f4f2fb; line-height: 1.6; }
.sec-title { font-size: 14px; font-weight: bold; color: #6a5acd; margin: 16px 0 8px; }
.win { background: #f7f5ff; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.win-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.win-top .name { flex: 1; }
.rm { font-size: 12px; color: #e0566b; }
.win-time { display: flex; align-items: center; gap: 8px; }
.time-pick { background: #fff; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 6px 12px; font-size: 13px; color: #555; }
.dash { color: #999; }
.week { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.wd { font-size: 12px; padding: 4px 8px; border-radius: 8px; background: #eee; color: #888; }
.wd.on { background: #6a5acd; color: #fff; }
.cross { font-size: 11px; color: #c98b00; margin-top: 6px; display: block; }
.conflict-tip { font-size: 12px; color: #e0566b; margin-top: 8px; }
.json-ipt { width: 100%; box-sizing: border-box; min-height: 320rpx; background: #faf9ff; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 10px; font-size: 13px; font-family: monospace; }
.json-hint { font-size: 11px; color: #9a8fb0; margin-top: 6px; }
.d-foot { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1rpx solid #f0eef7; }
.switch-lab { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #666; }
.save-btn { background: linear-gradient(135deg, #7f9cf5, #b06ab3); color: #fff; border-radius: 12px; font-size: 15px; min-width: 160px; margin: 0; }
</style>
