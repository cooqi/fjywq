<template>
	<view class="page">
		<view v-if="loading" class="center-tip">读取设置……</view>

		<view v-else-if="!pet._id" class="empty">还没有杯蜜，先去首页领养吧～</view>

		<view v-else>
			<!-- 基本资料 -->
			<view class="card">
				<view class="p-head">
					
					<view>
						<view class="p-name">{{ pet.name }}</view>
						<view class="p-sub">Lv.{{ pet.level || 1 }} · 编号 {{ pet.friendCode }}</view>
					</view>
				</view>
				<view class="info-row">
					<text>性别：{{ pet.gender || '未设置' }}</text>
					<text>年龄：{{ pet.age || 0 }}</text>
					<text>身高：{{ pet.height || 0 }}cm</text>
					<text>体重：{{ pet.weight || 0 }}kg（标准 {{ pet.weightBase || pet.weight || 0 }}kg）</text>
				</view>
				<view class="info-row">
					<text>饥饿值：{{ hungerNow }}（{{ hungerLabel }}）</text>
					<text>今日已吃：{{ mealsToday }} 顿</text>
					<text v-if="pet.overKcal > 0">热量堆积：{{ pet.overKcal }} kcal</text>
				</view>
				<view class="likes" v-if="pet.likes && pet.likes.length">喜好：{{ pet.likes.join('、') }}</view>
			</view>

			<!-- 改名 -->
			<view class="card">
				<view class="c-title">杯蜜改名</view>
				<view class="rename-row">
					<input class="rename-ipt" v-model="newName" maxlength="12" :placeholder="pet.name" />
					<button class="mini-btn" @click="doRename">保存</button>
				</view>
			</view>

			<!-- 职业 -->
			<view class="card">
				<view class="c-title">职业（上班按全局日程发日薪，旅行/请假会影响工资与心情）</view>
				<view class="chip-row">
					<view v-for="j in jobOptions" :key="j.value" class="chip" :class="{ on: pet.job === j.value }" @click="setJob(j.value)">{{ j.label }}</view>
				</view>
			</view>

			<!-- 上班时段（职业班次可选 / 自由职业自定义） -->
			<view class="card" v-if="curJob">
				<view class="c-title">上班时段</view>
				<!-- 自由职业：自定义工作时段 -->
				<block v-if="curJob.custom">
					<view class="sch-note">自由职业：自定义你的工作时间（最多 5 段），不设置则没有固定班。</view>
					<view v-for="(s, i) in workPlan.customShifts" :key="'cs' + i" class="shift-box">
						<view class="shift-top">
							<input class="shift-name" v-model="s.name" maxlength="8" placeholder="班次名称" @blur="saveCustom" />
							<text class="shift-rm" @click="removeCustomShift(i)">删除</text>
						</view>
						<view class="shift-time">
							<picker mode="time" :value="s.start" @change="onCustomTime(i, 'start', $event)"><view class="time-chip">{{ s.start }}</view></picker>
							<text class="dash">–</text>
							<picker mode="time" :value="s.end" @change="onCustomTime(i, 'end', $event)"><view class="time-chip">{{ s.end }}</view></picker>
							<text v-if="s.end <= s.start" class="cross-tag">跨天</text>
						</view>
						<view class="week-row">
							<text v-for="(wd, d) in weekLabels" :key="'cw' + d" class="wd" :class="{ on: hasDay(s.weekdays, d) }" @click="toggleCustomDay(i, d)">{{ wd }}</text>
						</view>
					</view>
					<button class="mini-btn ghost" v-if="workPlan.customShifts.length < 5" @click="addCustomShift">+ 添加工作时段</button>
				</block>
				<!-- 多班次职业：可选其一 -->
				<block v-else-if="jobShifts.length > 1">
					<view class="sch-note">这个职业有多班次，选择上班时段：</view>
					<view class="chip-row">
						<view class="chip" :class="{ on: !workPlan.shiftKey }" @click="chooseShift('')">全部班次</view>
						<view v-for="s in jobShifts" :key="s.key" class="chip" :class="{ on: workPlan.shiftKey === s.key }" @click="chooseShift(s.key)">{{ s.name }} {{ s.start }}-{{ s.end }}</view>
					</view>
				</block>
				<block v-else-if="jobShifts.length === 1">
					<view class="sch-note">固定时段：{{ jobShifts[0].name }} {{ jobShifts[0].start }} - {{ jobShifts[0].end }}</view>
				</block>
				<block v-else>
					<view class="sch-note">该职业按全局日程上班（见下方作息表）</view>
				</block>
			</view>

			<!-- 睡眠时段（可自定义覆盖全局默认） -->
			<view class="card">
				<view class="title-row">
					<text class="c-title no-mb">睡眠时段</text>
					<switch :checked="sleepPlan.on" color="#6a5acd" @change="onSleepToggle" />
				</view>
				<view class="sch-note">{{ sleepPlan.on ? '已启用自定义睡眠时段：' : '默认跟随全局作息：' + globalSleepText + '（打开开关可自定义）' }}</view>
				<block v-if="sleepPlan.on">
					<view class="shift-time">
						<picker mode="time" :value="sleepPlan.start" @change="onSleepTime('start', $event)"><view class="time-chip">入睡 {{ sleepPlan.start }}</view></picker>
						<text class="dash">–</text>
						<picker mode="time" :value="sleepPlan.end" @change="onSleepTime('end', $event)"><view class="time-chip">起床 {{ sleepPlan.end }}</view></picker>
						<text v-if="sleepPlan.end <= sleepPlan.start" class="cross-tag">跨天</text>
					</view>
					<view class="week-row">
						<text v-for="(wd, d) in weekLabels" :key="'sp' + d" class="wd" :class="{ on: hasDay(sleepPlan.weekdays, d) }" @click="toggleSleepDay(d)">{{ wd }}</text>
					</view>
				</block>
			</view>

			<!-- 当前作息（只读，来自管理员全局配置） -->
			<view class="card" v-if="schedule">
				<view class="c-title">全局作息表（管理员配置 · 只读）</view>
				<view class="sch-row" v-for="(w, i) in schedule.workShifts || []" :key="'w' + i">
					<text class="sch-tag work">💼 {{ w.name }}</text>
					<text class="sch-time">{{ w.start }} - {{ w.end }}</text>
				</view>
				<view class="sch-row" v-for="(r, i) in schedule.restWindows || []" :key="'r' + i">
					<text class="sch-tag rest">🍚 {{ r.name }}</text>
					<text class="sch-time">{{ r.start }} - {{ r.end }}</text>
				</view>
				<view class="sch-row" v-if="schedule.sleep">
					<text class="sch-tag sleep">😴 睡眠（默认）</text>
					<text class="sch-time">{{ schedule.sleep.start }} - {{ schedule.sleep.end }}</text>
				</view>
				<view class="sch-note">上班/睡觉时不能换装、交友、旅行；打扰上班会扣工资和心情～</view>
			</view>

			

			<!-- 隐私 & 关于 -->
			<view class="card">
				<view class="link" @click="showPrivacy">隐私政策</view>
				<view class="link" @click="showAbout">关于我们</view>
				<view class="link admin-link" v-if="isAdminUser" @click="goAdmin">🛠️ 杯蜜后台管理</view>
			</view>

			<!-- 清空数据 -->
			<button class="danger" @click="confirmClear">清空我的杯蜜数据</button>
			<view class="foot">电子杯蜜 V1.0 · 数字闺蜜 · 要按时吃饭 · 会生病需照顾</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo, clearPetCache } from './store/pet.js'
import { loadBeemoreConfig, getJobs, getSchedule, hungerInfo } from './beemore.js'
import { isAdmin } from '@/common/js/permission.js'

export default {
	data() {
		return {
			loading: true, userId: '', pet: {}, newName: '', schedule: null, isAdminUser: false,
			jobOptions: [{ label: '不设职业', value: '' }],
			weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
			workPlan: { shiftKey: '', customShifts: [] },
			sleepPlan: { on: false, start: '23:00', end: '07:00', weekdays: [0, 1, 2, 3, 4, 5, 6] }
		}
	},
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.isAdminUser = isAdmin(u)
		loadBeemoreConfig().then(() => {
			this.buildJobs()
			this.schedule = getSchedule()
			if (this.pet._id) this.syncPetPlan()
		})
		this.load()
	},
	computed: {
		curJob() {
			if (!this.pet.job) return null
			const jobs = getJobs() || {}
			return jobs[this.pet.job] || null
		},
		jobShifts() {
			return (this.curJob && this.curJob.shifts) || []
		},
		globalSleepText() {
			const s = this.schedule && this.schedule.sleep
			return s ? `${s.start} - ${s.end}` : '默认作息'
		},
		hungerNow() { return this.pet.hunger == null ? 35 : Math.max(0, Math.min(100, this.pet.hunger)) },
		hungerLabel() { return hungerInfo(this.hungerNow).label },
		mealsToday() { return (this.pet.daily && this.pet.daily.meals) || 0 }
	},
	methods: {
		hasDay(arr, d) { return Array.isArray(arr) && arr.indexOf(d) > -1 },
		syncPetPlan() {
			const wp = this.pet.workPlan || {}
			this.workPlan = {
				shiftKey: wp.shiftKey || '',
				customShifts: (wp.customShifts || []).map(s => ({ name: s.name || '', start: s.start || '09:00', end: s.end || '12:00', weekdays: (s.weekdays || []).slice() }))
			}
			const sp = this.pet.sleepPlan || {}
			const gs = (this.schedule && this.schedule.sleep) || { start: '23:00', end: '07:00', weekdays: [0, 1, 2, 3, 4, 5, 6] }
			this.sleepPlan = {
				on: !!sp.on,
				start: sp.start || gs.start || '23:00',
				end: sp.end || gs.end || '07:00',
				weekdays: (sp.weekdays && sp.weekdays.length ? sp.weekdays : (gs.weekdays || [0, 1, 2, 3, 4, 5, 6])).slice()
			}
		},
		buildJobs() {
			const jobs = getJobs() || {}
			this.jobOptions = [{ label: '不设职业', value: '' }].concat(
				Object.keys(jobs).map(k => ({ label: `${jobs[k].emoji || ''}${jobs[k].name}（日薪${jobs[k].salary}）`, value: k }))
			)
		},
		async load() {
			this.loading = true
			const res = await callBeemore({ action: 'getStatus', userId: this.userId })
			if (res.code === 0 && res.data && res.data.pet) { this.pet = res.data.pet; this.syncPetPlan() }
			this.loading = false
		},
		async doRename() {
			const n = (this.newName || '').trim()
			if (!n) { uni.showToast({ title: '请输入新名字', icon: 'none' }); return }
			const res = await callBeemore({ action: 'rename', userId: this.userId, name: n })
			if (res.code === 0) { this.pet.name = res.data.name; this.newName = ''; uni.showToast({ title: '改名成功', icon: 'success' }) }
			else uni.showToast({ title: res.message || '改名失败', icon: 'none' })
		},
		async setJob(job) {
			const res = await callBeemore({ action: 'setJob', userId: this.userId, job })
			if (res.code === 0) { this.pet.job = res.data.job; if (res.data.workPlan) this.pet.workPlan = res.data.workPlan; this.syncPetPlan(); uni.showToast({ title: res.message || '已更新', icon: 'none' }) }
		},
		// ---- 上班时段 ----
		async chooseShift(key) {
			const res = await callBeemore({ action: 'setWorkPlan', userId: this.userId, shiftKey: key })
			if (res.code === 0) { this.workPlan.shiftKey = res.data.workPlan.shiftKey; uni.showToast({ title: res.message || '已保存', icon: 'none' }) }
			else { uni.showToast({ title: res.message || '保存失败', icon: 'none' }); this.load() }
		},
		saveCustom() {
			return callBeemore({ action: 'setWorkPlan', userId: this.userId, customShifts: this.workPlan.customShifts }).then(res => {
				if (res.code !== 0) { uni.showToast({ title: res.message || '保存失败', icon: 'none' }); this.load() }
			})
		},
		addCustomShift() {
			if (this.workPlan.customShifts.length >= 5) return
			this.workPlan.customShifts.push({ name: '', start: '09:00', end: '12:00', weekdays: [1, 2, 3, 4, 5] })
			this.saveCustom()
		},
		removeCustomShift(i) {
			this.workPlan.customShifts.splice(i, 1)
			this.saveCustom()
		},
		onCustomTime(i, field, e) {
			this.$set(this.workPlan.customShifts[i], field, e.detail.value)
			this.saveCustom()
		},
		toggleCustomDay(i, d) {
			const s = this.workPlan.customShifts[i]
			if (!s) return
			if (!Array.isArray(s.weekdays)) this.$set(s, 'weekdays', [])
			const idx = s.weekdays.indexOf(d)
			if (idx > -1) s.weekdays.splice(idx, 1); else s.weekdays.push(d)
			this.saveCustom()
		},
		// ---- 睡眠时段 ----
		sendSleep() {
			return callBeemore({ action: 'setSleepPlan', userId: this.userId, on: this.sleepPlan.on, start: this.sleepPlan.start, end: this.sleepPlan.end, weekdays: this.sleepPlan.weekdays }).then(res => {
				if (res.code !== 0) { uni.showToast({ title: res.message || '保存失败', icon: 'none' }); this.load() }
			})
		},
		onSleepToggle(e) {
			this.sleepPlan.on = e.detail.value
			this.sendSleep()
		},
		onSleepTime(field, e) {
			this.sleepPlan[field] = e.detail.value
			this.sendSleep()
		},
		toggleSleepDay(d) {
			const arr = this.sleepPlan.weekdays
			const idx = arr.indexOf(d)
			if (idx > -1) {
				if (arr.length <= 1) { uni.showToast({ title: '至少保留一天', icon: 'none' }); return }
				arr.splice(idx, 1)
			} else arr.push(d)
			this.sendSleep()
		},
		async onNotify(e) {
			const on = e.detail.value
			const res = await callBeemore({ action: 'setNotify', userId: this.userId, on })
			if (res.code === 0) { this.pet.notifyOn = on; uni.showToast({ title: on ? '已开启提醒' : '已关闭提醒', icon: 'none' }) }
		},
		goAdmin() { uni.navigateTo({ url: '/pages/game/loveQY/beemore-admin' }) },
		showPrivacy() {
			uni.showModal({ title: '隐私政策', content: '本小程序仅记录你的杯蜜养成数据，不采集敏感个人信息，不涉及任何付费。数据可在「清空数据」中随时删除。', showCancel: false })
		},
		showAbout() {
			uni.showModal({ title: '关于我们', content: '电子杯蜜：一位住在你手机里的电子闺蜜 / 数字打工人。她会按时上班、午休、睡觉，会赚工资、会去旅行，也会饿——休息时记得带她干饭，吃太多可是会长胖的。她生病时会变瘦、不能上班，需要你去诊所照顾。全程无内购、无强制广告。', showCancel: false })
		},
		confirmClear() {
			uni.showModal({
				title: '确认清空？', content: '将删除杯蜜、日志与全部日记，且无法恢复。确定吗？',
				confirmColor: '#e0566b',
				success: async (r) => {
					if (!r.confirm) return
					const res = await callBeemore({ action: 'clearData', userId: this.userId })
					if (res.code === 0) {
						clearPetCache()
						uni.showToast({ title: '已清空', icon: 'success' })
						setTimeout(() => uni.navigateBack(), 800)
					}
				}
			})
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.empty { text-align: center; color: #888; margin-top: 100px; }
.card { background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 14px; }
.row-card { display: flex; justify-content: space-between; align-items: center; }
.p-head { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.p-emoji { font-size: 44px; }
.p-name { font-size: 18px; font-weight: bold; color: #444; }
.p-sub { font-size: 12px; color: #999; margin-top: 4px; }
.info-row { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; color: #666; }
.likes { font-size: 13px; color: #8a7fb0; margin-top: 8px; }
.c-title { font-size: 14px; color: #6a5acd; font-weight: bold; margin-bottom: 10px; }
.c-title.no-mb { margin-bottom: 0; }
.rename-row { display: flex; gap: 10px; }
.rename-ipt { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px 10px; background: #faf9ff; }
.mini-btn { background: #6a5acd; color: #fff; font-size: 13px; border-radius: 10px; margin: 0; padding: 0 16px; line-height: 2.3; }
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 6px 14px; border-radius: 20px; background: #f4f2fb; font-size: 13px; color: #666; }
.chip.on { background: #6a5acd; color: #fff; }
.sch-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1rpx solid #f4f2fb; }
.sch-tag { font-size: 13px; color: #555; }
.sch-time { font-size: 13px; color: #6a5acd; font-weight: bold; }
.sch-note { font-size: 11px; color: #9a8fb0; margin-top: 8px; line-height: 1.6; }
.title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.shift-box { border: 1rpx solid #ece7f7; border-radius: 12px; padding: 10px 12px; margin-top: 10px; background: #faf9ff; }
.shift-top { display: flex; justify-content: space-between; align-items: center; }
.shift-name { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 8px; padding: 5px 8px; background: #fff; font-size: 13px; }
.shift-rm { font-size: 12px; color: #e0566b; padding: 0 6px; }
.shift-time { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.time-chip { background: #f1edfb; border-radius: 10px; padding: 6px 12px; font-size: 13px; color: #6a5acd; font-weight: bold; }
.dash { color: #9a8fb0; }
.cross-tag { font-size: 11px; color: #e67e22; background: #fdf3e7; border-radius: 8px; padding: 2px 8px; }
.week-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.wd { width: 34px; height: 30px; line-height: 30px; text-align: center; border-radius: 8px; background: #f4f2fb; font-size: 12px; color: #999; }
.wd.on { background: #6a5acd; color: #fff; }
.mini-btn.ghost { background: #fff; color: #6a5acd; border: 1rpx dashed #6a5acd; font-size: 13px; border-radius: 10px; margin-top: 10px; line-height: 2.4; }
.link { padding: 10px 0; font-size: 14px; color: #555; border-bottom: 1rpx solid #f0eef7; }
.link:last-child { border-bottom: none; }
.danger { background: #ffe1e6; color: #e0566b; border-radius: 14px; font-size: 15px; margin-top: 6px; }
.foot { text-align: center; font-size: 12px; color: #9a8fb0; margin: 18px 0 10px; }
</style>
