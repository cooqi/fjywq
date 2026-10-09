<template>
	<view class="page">
		<!-- 非管理员：只读提示 -->
		<view v-if="!isAdminUser" class="card readonly">
			<view class="big">🔒</view>
			<view class="t">仅管理员可进入「杯蜜后台管理」</view>
			<button class="back-btn" @click="goBack">返回首页</button>
		</view>

		<block v-else>
			<!-- ==================== 列表态 ==================== -->
			<view v-if="view === 'list'">
				<view class="top-bar">
					<view class="tip">共 {{ list.length }} 类配置，运行时覆盖内置默认值</view>
					<view class="top-btns">
						<button class="mini add" @click="openAdd">+ 新增配置</button>
						<button class="mini reset" @click="resetAll">恢复默认</button>
					</view>
				</view>

				<view v-if="loading" class="center-tip">加载配置……</view>

				<view v-else class="list">
					<view v-for="doc in list" :key="doc._id" class="item" :class="{ off: doc.is_active === false }" @click="openEdit(doc)">
						<view class="item-head">
							<view class="item-key">
								<text class="ic">{{ iconOf(doc.key) }}</text>
								<text class="lb">{{ labelOf(doc) }}</text>
							</view>
							<text class="status" :class="{ on: doc.is_active !== false }">{{ doc.is_active !== false ? '启用' : '停用' }}</text>
						</view>
						<view class="item-body">{{ brief(doc) }}</view>
						<view class="item-actions">
							<view class="act edit">可视化编辑</view>
							<view class="act toggle" @click.stop="toggleActive(doc)">{{ doc.is_active !== false ? '停用' : '启用' }}</view>
							<view class="act del" @click.stop="del(doc)">删除</view>
						</view>
					</view>
					<view v-if="!list.length" class="center-tip">还没有配置，点「新增配置」或重新上传 init_data.json</view>
				</view>
			</view>

			<!-- ==================== 编辑态（全屏） ==================== -->
			<view v-else class="edit-view">
				<view class="e-head">
					<text class="e-back" @click="backToList">‹ 列表</text>
					<text class="e-title">{{ iconOf(cur.key) }} {{ cur.label || cur.key || '新增配置' }}</text>
					<text class="e-save" @click="save">保存</text>
				</view>

				<!-- 可视化 / JSON 双模式 -->
				<view v-if="canVisual" class="tabs">
					<text class="tab" :class="{ on: tab === 'visual' }" @click="switchTab('visual')">可视化</text>
					<text class="tab" :class="{ on: tab === 'json' }" @click="switchTab('json')">JSON 高级</text>
				</view>
				<view v-else class="tabs one">
					<text class="tab on">JSON（该配置暂无可视化模板）</text>
				</view>

				<scroll-view scroll-y class="e-body">
					<view class="base">
						<view class="row">
							<text class="lab">配置键</text>
							<input v-if="!cur._id" class="ipt" v-model="cur.key" placeholder="英文键名，如 jobs" />
							<text v-else class="ipt key-locked">{{ cur.key }}</text>
						</view>
						<view class="row">
							<text class="lab">名称</text>
							<input class="ipt" v-model="cur.label" placeholder="中文名，如 职业与班次" />
						</view>
						<view class="row">
							<text class="lab">排序</text>
							<input class="ipt num" type="number" v-model.number="cur.sort" placeholder="数字越小越靠前" />
							<view class="sw-lab">
								<switch style="transform:scale(.8)" :checked="cur.is_active !== false" color="#6a5acd" @change="onActiveSwitch" />
								<text>启用</text>
							</view>
						</view>
					</view>

					<!-- ① JSON 模式 -->
					<block v-if="tab === 'json'">
						<view class="sec-title">配置载荷 value（JSON）</view>
						<textarea class="json-ipt" v-model="jsonStr" :maxlength="-1" placeholder="请输入 JSON 对象" />
						<view class="json-hint">结构需与云函数 constants.js 默认对齐；保存前会校验 JSON 合法性。高级模式下直接改 JSON 不会自动同步回可视化表单，切回「可视化」时会重新解析。</view>
					</block>

					<!-- ② 日程：页面自带的可视化编辑器 -->
					<block v-else-if="cur.key === 'schedule'">
						<view class="sec-title">工作班次（可多段 / 跨天）</view>
						<view v-for="(w, i) in sched.workShifts" :key="'w' + i" class="win">
							<view class="win-top">
								<text class="idx">{{ i + 1 }}</text>
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
								<text class="idx">{{ i + 1 }}</text>
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
						<view class="conflict-tip" v-if="conflicts.length">⚠️ {{ conflicts.join('；') }}，全局上班班次与睡眠时段必须错开，否则无法保存（职业自带的夜班不在此列，用户选不到它）</view>
						<view class="json-hint">这里是全局默认作息；杯蜜选了带自己班次的职业时，以职业班次为准。</view>
					</block>

					<!-- ③ 其余配置：按描述表渲染可视化表单 -->
					<block v-else-if="meta">
						<ConfigForm :key="'cf' + formKey" :sections="meta.sections" :model="form" />
						<view class="json-hint">描述表没列出的字段会原样保留；要看/改全部字段请切到「JSON 高级」。</view>
					</block>
				</scroll-view>
			</view>
		</block>

		<!-- 新增配置：选择要配哪一类（小程序 ActionSheet 最多 6 项，故用 chip 网格） -->
		<view v-if="addVisible" class="popup-mask" @click="closeAdd" @touchmove.stop.prevent>
			<view class="dialog" @click.stop>
				<view class="d-head">
					<text class="d-title">新增配置</text>
					<text class="d-close" @click="closeAdd">✕</text>
				</view>
				<scroll-view scroll-y class="d-body">
					<view class="hint">选一类开始可视化编辑；库里已有的键会直接打开它。</view>
					<view class="chip-grid">
						<view v-for="m in metaList" :key="m.key" class="chip" @click="chooseKey(m.key)">{{ m.icon }} {{ m.label }}</view>
					</view>
					<view class="sec-title">其他自定义键</view>
					<view class="row">
						<input class="ipt" v-model="addKey" placeholder="英文键名，需与云函数读取的 key 一致" />
						<button class="mini add" @click="addCustom">确定</button>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * 杯蜜后台管理：配置列表 + 全屏可视化编辑
 * 除 schedule 有专属日程编辑器外，其余配置由 config-meta.js 描述表驱动 ConfigForm 渲染，
 * 「JSON 高级」作为逃生口；保存前统一做冲突硬拦截 / 数值校验，避免管理员手写 JSON。
 */
import { isAdmin } from '@/common/js/permission.js'
import { loadBeemoreConfig, getSchedule, findSleepConflict } from './beemore.js'
import ConfigForm from './components/ConfigForm.vue'
import { CONFIG_META, getMeta, briefOf, skeletonValue, coerceConfig } from './config-meta.js'

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
	components: { ConfigForm },
	data() {
		return {
			isAdminUser: false, loading: false, list: [],
			view: 'list', // list | edit
			tab: 'visual', // visual | json
			cur: { key: '', label: '', sort: 100, is_active: true, _id: '' },
			form: {}, formKey: 0,
			sched: { workShifts: [], restWindows: [], sleep: { start: '23:00', end: '07:00', weekdays: [0, 1, 2, 3, 4, 5, 6] } },
			jsonStr: '',
			addVisible: false, addKey: '',
			weekLabels: WEEK
		}
	},
	computed: {
		meta() { return getMeta(this.cur.key) },
		/** 有描述表或日程这种专属编辑器才提供可视化 */
		canVisual() { return this.visualOf(this.cur.key) },
		metaList() { return Object.keys(CONFIG_META).map(k => ({ key: k, icon: CONFIG_META[k].icon, label: CONFIG_META[k].label })) },
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
		if (this.isAdminUser) { try { loadBeemoreConfig() } catch (e) {}; this.load() }
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
		visualOf(key) {
			if (key === 'schedule') return true
			const m = getMeta(key)
			return !!(m && m.sections && m.sections.length)
		},
		iconOf(key) { return (CONFIG_META[key] || {}).icon || '⚙️' },
		labelOf(doc) {
			const m = CONFIG_META[doc.key] || {}
			return doc.label || m.label || doc.key
		},
		brief(doc) { return briefOf(doc.key, doc.value || {}) },

		/* ---------- 打开编辑 ---------- */
		openEdit(doc) {
			this.cur = { key: doc.key, label: doc.label || '', sort: doc.sort != null ? doc.sort : 100, is_active: doc.is_active !== false, _id: doc._id }
			this.startEdit(doc.value || {})
		},
		/** value → 表单/日程缓冲，并决定默认模式 */
		startEdit(value) {
			const v = JSON.parse(JSON.stringify(value || {}))
			this.tab = this.visualOf(this.cur.key) ? 'visual' : 'json'
			let source = v
			if (this.cur.key === 'schedule') {
				this.sched = this.normalizeSched(v)
				source = this.buildSchedule()
			} else {
				this.form = v
			}
			this.jsonStr = JSON.stringify(source, null, 2)
			this.formKey++
			this.view = 'edit'
		},
		normalizeSched(v) {
			return {
				workShifts: (v.workShifts || []).map(x => ({ name: x.name || '', start: x.start || '09:00', end: x.end || '12:00', weekdays: x.weekdays || [1, 2, 3, 4, 5] })),
				restWindows: (v.restWindows || []).map(x => ({ name: x.name || '', start: x.start || '12:00', end: x.end || '13:00', weekdays: x.weekdays || [1, 2, 3, 4, 5] })),
				sleep: { start: (v.sleep && v.sleep.start) || '23:00', end: (v.sleep && v.sleep.end) || '07:00', weekdays: (v.sleep && v.sleep.weekdays) || [0, 1, 2, 3, 4, 5, 6] }
			}
		},
		/** 当前界面上的值（可视化态取表单/日程，JSON 态取解析结果） */
		currentValue() {
			if (this.tab === 'json') {
				try { return JSON.parse(this.jsonStr) } catch (e) { return {} }
			}
			return this.cur.key === 'schedule' ? this.buildSchedule() : this.form
		},
		backToList() { this.view = 'list' },

		/* ---------- 模式切换 ---------- */
		switchTab(t) {
			if (t === this.tab) return
			if (t === 'json') {
				this.jsonStr = JSON.stringify(this.currentValue(), null, 2)
				this.tab = 'json'
				return
			}
			// JSON → 可视化：先解析成功再切，失败就留在 JSON 模式，避免丢掉管理员刚改的内容
			let v
			try { v = JSON.parse(this.jsonStr) }
			catch (e) { uni.showToast({ title: 'JSON 格式有误，暂不能切换', icon: 'none' }); return }
			if (!v || typeof v !== 'object' || Array.isArray(v)) { uni.showToast({ title: 'value 需为对象', icon: 'none' }); return }
			if (this.cur.key === 'schedule') this.sched = this.normalizeSched(v)
			else this.form = v
			this.tab = 'visual'
			this.formKey++
		},

		/* ---------- 新增 ---------- */
		openAdd() { this.addKey = ''; this.addVisible = true },
		closeAdd() { this.addVisible = false },
		chooseKey(k) {
			this.addVisible = false
			const exist = this.list.find(d => d.key === k)
			if (exist) { this.openEdit(exist); uni.showToast({ title: '已存在，直接打开编辑', icon: 'none' }); return }
			this.cur = { key: k, label: CONFIG_META[k].label, sort: this.nextSort(), is_active: true, _id: '' }
			this.startEdit(skeletonValue(k))
		},
		addCustom() {
			const k = String(this.addKey || '').trim()
			if (!k) { uni.showToast({ title: '请填写英文键名', icon: 'none' }); return }
			this.addVisible = false
			const exist = this.list.find(d => d.key === k)
			if (exist) { this.openEdit(exist); return }
			this.cur = { key: k, label: '', sort: this.nextSort(), is_active: true, _id: '' }
			this.startEdit({})
		},
		nextSort() {
			const max = this.list.reduce((m, d) => Math.max(m, Number(d.sort) || 0), 0)
			return (max || 0) + 10
		},

		/* ---------- 日程小工具 ---------- */
		addShift() { this.sched.workShifts.push({ name: '新班次', start: '09:00', end: '18:00', weekdays: [1, 2, 3, 4, 5] }) },
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

		/* ---------- 保存 ---------- */
		save() {
			if (!this.cur.key) { uni.showToast({ title: '请填写配置键', icon: 'none' }); return }
			let value
			if (this.tab === 'json') {
				try { value = JSON.parse(this.jsonStr) }
				catch (e) { uni.showToast({ title: 'JSON 格式有误，请检查', icon: 'none' }); return }
				if (!value || typeof value !== 'object' || Array.isArray(value)) { uni.showToast({ title: 'value 需为对象', icon: 'none' }); return }
			} else if (this.cur.key === 'schedule') {
				// 硬拦截：夜班等班次与睡眠时段重叠时不允许保存（否则选了夜班的人永远被“睡觉”覆盖）
				if (this.conflicts.length) {
					uni.showModal({ title: '作息冲突，不能保存', content: this.conflicts.join('\n') + '\n上班和睡觉必须错开：把班次或睡眠时间改到不重叠再保存。', showCancel: false })
					return
				}
				value = this.buildSchedule()
			} else {
				const r = coerceConfig(this.meta, this.form)
				if (r.errors.length) {
					uni.showModal({ title: '还有几项没填对', content: r.errors.slice(0, 8).join('\n') + (r.errors.length > 8 ? `\n…共 ${r.errors.length} 处` : ''), showCancel: false })
					return
				}
				value = r.value
			}
			// jobs 里的班次提醒：与全局睡眠重叠的班次（如夜班）用户可以配，但杯蜜选不到（云端会自动避开/硬拦截）
			if (this.cur.key === 'jobs') {
				const msg = this.jobsConflictMsg(value)
				if (msg) {
					uni.showModal({
						title: '职业班次与睡眠重叠',
						content: msg + '\n（这样的班次用户选它会报错，领养/换职业会自动避开它。仍要保存吗？）',
						success: (r) => { if (r.confirm) this.doSave(value) }
					})
					return
				}
			}
			this.doSave(value)
		},
		/** 校验 jobs 载荷：各职业班次与生效的睡眠时段重叠则返回说明文案 */
		jobsConflictMsg(value) {
			const sched = this.cur.key === 'schedule' ? this.buildSchedule().sleep : ((getSchedule() || {}).sleep)
			if (!sched || !sched.start || !sched.end) return ''
			const bad = []
			Object.keys(value || {}).forEach(k => {
				const j = value[k] || {}
				const hits = (j.shifts || []).filter(s => s && s.start && s.end && findSleepConflict([s], sched))
				if (hits.length) bad.push(`${j.name || k}的${hits.map(s => `「${s.name || '班次'} ${s.start}-${s.end}」`).join('、')}与睡眠时段 ${sched.start}-${sched.end} 重叠`)
			})
			return bad.length ? bad.join('；') + '。这些班次和杯蜜的睡觉时间撞上了。' : ''
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
				uni.showToast({ title: r.message || '已保存', icon: 'none' })
				this.view = 'list'
				this.load()
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
.item-key { display: flex; align-items: center; gap: 6px; }
.ic { font-size: 16px; }
.lb { font-size: 14px; font-weight: bold; color: #6a5acd; }
.status { font-size: 12px; color: #bbb; }
.status.on { color: #43a047; }
.item-body { font-size: 12px; color: #666; margin: 8px 0; line-height: 1.5; }
.item-actions { display: flex; gap: 10px; border-top: 1rpx solid #f0eef7; padding-top: 8px; }
.act { font-size: 12px; color: #6a5acd; padding: 2px 10px; border-radius: 8px; background: #f4f2fb; }
.act.del { color: #e0566b; background: #fff0f2; }
/* 全屏编辑态 */
.edit-view { display: flex; flex-direction: column; height: calc(100vh - 24px); box-sizing: border-box; }
.e-head { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 14px; padding: 10px 14px; }
.e-back { font-size: 14px; color: #6a5acd; }
.e-title { flex: 1; font-size: 15px; font-weight: bold; color: #444; }
.e-save { font-size: 14px; color: #fff; background: linear-gradient(135deg, #7f9cf5, #b06ab3); border-radius: 10px; padding: 5px 16px; }
.tabs { display: flex; gap: 8px; margin: 10px 0; }
.tabs.one { justify-content: center; }
.tab { font-size: 13px; color: #8a7fb0; background: #fff; border-radius: 10px; padding: 5px 18px; }
.tab.on { color: #fff; background: #6a5acd; }
.e-body { flex: 1; background: #fff; border-radius: 14px; padding: 12px 14px; box-sizing: border-box; }
.base { padding-bottom: 6px; border-bottom: 1rpx solid #f0eef7; }
.row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.lab { font-size: 13px; color: #666; width: 70px; flex-shrink: 0; }
.ipt { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px 10px; background: #faf9ff; font-size: 14px; }
.ipt.num { max-width: 140rpx; flex: none; }
.ipt.name { flex: 1; }
.key-locked { color: #9a8fb0; background: #f4f2fb; line-height: 1.6; }
.sw-lab { display: flex; align-items: center; gap: 2px; font-size: 13px; color: #666; margin-left: auto; }
.sec-title { font-size: 14px; font-weight: bold; color: #6a5acd; margin: 16px 0 8px; }
.hint { font-size: 11px; color: #a89fc0; line-height: 1.6; margin-bottom: 8px; }
.win { background: #f7f5ff; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.win-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.idx { font-size: 11px; color: #b0a8c8; }
.rm { font-size: 12px; color: #e0566b; }
.win-time { display: flex; align-items: center; gap: 8px; }
.time-pick { background: #fff; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 6px 12px; font-size: 13px; color: #555; }
.dash { color: #999; }
.week { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.wd { font-size: 12px; padding: 4px 8px; border-radius: 8px; background: #eee; color: #888; }
.wd.on { background: #6a5acd; color: #fff; }
.cross { font-size: 11px; color: #c98b00; margin-top: 6px; display: block; }
.conflict-tip { font-size: 12px; color: #e0566b; margin-top: 8px; }
.json-ipt { width: 100%; box-sizing: border-box; min-height: 480rpx; background: #faf9ff; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 10px; font-size: 13px; font-family: monospace; }
.json-hint { font-size: 11px; color: #9a8fb0; margin-top: 8px; line-height: 1.6; }
/* 新增配置弹层 */
.popup-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; z-index: 999; background: rgba(0, 0, 0, .45); display: flex; flex-direction: column; justify-content: flex-end; }
.dialog { background: #fff; border-radius: 20px 20px 0 0; max-height: 80vh; display: flex; flex-direction: column; animation: pop-up .25s ease-out; }
@keyframes pop-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.d-head { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1rpx solid #f0eef7; }
.d-title { font-size: 16px; font-weight: bold; color: #444; }
.d-close { font-size: 18px; color: #999; padding: 0 6px; }
.d-body { padding: 12px 16px 20px; max-height: 60vh; box-sizing: border-box; }
.chip-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font-size: 13px; color: #555; background: #f4f2fb; border: 1rpx solid #e6e1f5; border-radius: 12px; padding: 7px 12px; }
</style>
