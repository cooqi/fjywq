
/**
 * 杯蜜后台管理：配置列表 + 全屏可视化编辑
 * 除 schedule 有专属日程编辑器外，其余配置由 config-meta.js 描述表驱动 ConfigForm 渲染，
 * 「JSON 高级」作为逃生口；保存前统一做冲突硬拦截 / 数值校验，避免管理员手写 JSON。
 * 冲突与星期的判定一律走 beemore.js 的 findSleepConflict，与云函数同一口径（空 weekdays = 每天）。
 */
const isAdmin = (u) => !!(u && (u.role === "admin" || u.role === "s_admin"))
import { loadBeemoreConfig, getSchedule, findSleepConflict } from './_beemore.mjs'
import { getMyUserInfo } from './_pet.mjs'
const ConfigForm = {}
import { CONFIG_META, getMeta, briefOf, skeletonValue, coerceConfig } from './_configmeta.mjs'

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export default {
	components: { ConfigForm },
	data() {
		return {
			isAdminUser: false, loading: false, list: [],
			view: 'list', // list | edit
			tab: 'visual', // visual | json
			cur: { key: '', label: '', sort: 100, is_active: true, _id: '' },
			form: {}, formKey: 0,
			// 刚进编辑态时的快照：用于「有未保存改动」判定与返回拦截；saving 防连点重复提交
			origJson: '', saving: false, inited: false,
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
		dirty() {
			if (this.view !== 'edit') return false
			try { return JSON.stringify(this.currentValue()) !== this.origJson } catch (e) { return true }
		},
		conflicts() {
			return this.cur.key === 'schedule' ? this.scheduleConflictsOf(this.sched) : []
		}
	},
	async onLoad() {
		this.isAdminUser = isAdmin(getMyUserInfo())
		if (!this.isAdminUser) return
		// 必须等拿到运行时配置：职业班次冲突判定依赖 getSchedule()/getJobs()，不等会漏报
		try { await loadBeemoreConfig() } catch (e) {}
		this.load()
	},
	onShow() {
		// 首次进入由 onLoad 拉取；之后每次回到列表页重拉，免得在其它页改过配置后看到旧列表
		if (!this.isAdminUser) return
		if (!this.inited) { this.inited = true; return }
		if (this.view === 'edit') return
		this.load()
	},
	methods: {
		goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/game/loveQY/loveQY' }) }) },
		/** 统一出口：网络失败也归成错误码，否则 reject 冒出来既没提示又报 unhandled rejection */
		call(data) {
			return new Promise((resolve) => {
				uniCloud.callFunction({
					name: 'beemore-config',
					data,
					success: (r) => resolve((r && r.result) || { code: -1, message: '云端没返回数据' }),
					fail: (e) => {
						console.error('beemore-config fail', data && data.action, e)
						resolve({ code: -1, message: '网络不太顺畅，没连上服务器' })
					}
				})
			})
		},
		async load() {
			this.loading = true
			const r = await this.call({ action: 'getList' })
			this.loading = false
			if (r.code === 0) this.list = Array.isArray(r.data) ? r.data : []
			else uni.showToast({ title: r.message || '列表加载失败', icon: 'none' })
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
			this.cur = { key: doc.key, label: doc.label || '', sort: doc.sort != null ? doc.sort : 100, is_active: doc.is_active === true, _id: doc._id }
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
			this.origJson = JSON.stringify(source)
			this.saving = false
			this.formKey++
			this.view = 'edit'
		},
		/** 星期数组洗一遍：非法下标丢掉；没这个字段给默认值，空数组则原样保留（空=每天） */
		daysOf(x, def) {
			if (!Array.isArray(x)) return def.slice()
			return x.map(Number).filter(n => n >= 0 && n <= 6 && Number.isFinite(n))
		},
		normalizeSched(v) {
			return {
				workShifts: (v.workShifts || []).map(x => ({ name: x.name || '', start: x.start || '09:00', end: x.end || '12:00', weekdays: this.daysOf(x.weekdays, [1, 2, 3, 4, 5]) })),
				restWindows: (v.restWindows || []).map(x => ({ name: x.name || '', start: x.start || '12:00', end: x.end || '13:00', weekdays: this.daysOf(x.weekdays, [1, 2, 3, 4, 5]) })),
				sleep: {
					start: (v.sleep && v.sleep.start) || '23:00',
					end: (v.sleep && v.sleep.end) || '07:00',
					weekdays: this.daysOf(v.sleep && v.sleep.weekdays, ALL_DAYS)
				}
			}
		},
		/** 当前界面上的值（可视化态取表单/日程，JSON 态取解析结果） */
		currentValue() {
			if (this.tab === 'json') {
				try { return JSON.parse(this.jsonStr) } catch (e) { return {} }
			}
			return this.cur.key === 'schedule' ? this.buildSchedule() : this.form
		},
		backToList() {
			if (this.saving) { uni.showToast({ title: '保存中，请稍等……', icon: 'none' }); return }
			if (!this.dirty) { this.view = 'list'; return }
			uni.showModal({
				title: '还没保存',
				content: '当前改动尚未保存，返回列表会丢掉这些修改。确定离开？',
				confirmText: '离开',
				cancelText: '继续编辑',
				success: (r) => { if (r.confirm) this.view = 'list' }
			})
		},

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
			// 键名要跟云函数读取的 key 对上，中文/空格写进去只会得一条永远不生效的配置
			if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(k)) { uni.showToast({ title: '键名需字母开头，只允许字母/数字/下划线', icon: 'none' }); return }
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
		async save() {
			if (this.saving) return
			if (!this.cur.key) { uni.showToast({ title: '请填写配置键', icon: 'none' }); return }
			let value
			if (this.tab === 'json') {
				try { value = JSON.parse(this.jsonStr) }
				catch (e) { uni.showToast({ title: 'JSON 格式有误，请检查', icon: 'none' }); return }
				if (!value || typeof value !== 'object' || Array.isArray(value)) { uni.showToast({ title: 'value 需为对象', icon: 'none' }); return }
				// 高级模式能避开可视化表单，这里的作息冲突也得拦，否则直接写一份“上班和睡觉撞车”的配置
				if (this.cur.key === 'schedule') {
					const cf = this.scheduleConflictsOf(value)
					if (cf.length) { this.blockConflict(cf); return }
				}
			} else if (this.cur.key === 'schedule') {
				// 硬拦截：全局班次与睡眠时段重叠不允许保存（否则没配自己班次的职业永远被“睡觉”覆盖）
				if (this.conflicts.length) { this.blockConflict(this.conflicts); return }
				value = this.buildSchedule()
			} else {
				const r = coerceConfig(this.meta, this.form)
				if (r.errors.length) {
					uni.showModal({ title: '还有几项没填对', content: r.errors.slice(0, 8).join('\n') + (r.errors.length > 8 ? `\n…共 ${r.errors.length} 处` : ''), showCancel: false })
					return
				}
				value = r.value
			}
			// 职业班次与睡眠重叠：夜班这类班次可以留着，但杯蜜选了会被云端拦下，所以只软提示不硬拦
			const sleep = this.cur.key === 'jobs' ? this.effectiveSleep() : (this.cur.key === 'schedule' && value ? value.sleep : null)
			const jobsMap = this.cur.key === 'jobs' ? value : (this.cur.key === 'schedule' ? this.jobsValue() : null)
			if (sleep && jobsMap) {
				const msg = this.sleepVsJobsMsg(jobsMap, sleep)
				if (msg) {
					uni.showModal({
						title: '职业班次与睡眠重叠',
						content: msg + '\n这些班次杯蜜选不到（领养/换职业时会自动避开）。仍要保存吗？',
						confirmText: '仍要保存',
						success: (r) => { if (r.confirm) this.doSave(value) }
					})
					return
				}
			}
			this.doSave(value)
		},
		blockConflict(list) {
			uni.showModal({ title: '作息冲突，不能保存', content: list.join('\n') + '\n上班和睡觉必须错开：把班次或睡眠时间改到不重叠再保存。', showCancel: false })
		},
		/** 日程载荷里与睡眠重叠的全局班次（空 weekdays 按每天算，口径同云函数） */
		scheduleConflictsOf(box) {
			const sleep = box && box.sleep
			if (!sleep || !sleep.start || !sleep.end) return []
			const out = []
			;(box.workShifts || []).forEach((w) => {
				if (!w || !w.start || !w.end) return
				if (findSleepConflict([w], sleep)) out.push(`「${w.name || '班次'} ${w.start}-${w.end}」与睡眠时段 ${sleep.start}-${sleep.end} 重叠`)
			})
			return out
		},
		/** 当前生效的全局睡眠：正在编辑 schedule 就用界面上的，否则取库里那条，再退运行时缓存 */
		effectiveSleep() {
			if (this.cur.key === 'schedule') return this.sched.sleep
			const doc = this.list.find(d => d.key === 'schedule')
			return (doc && doc.value && doc.value.sleep) || (getSchedule() || {}).sleep || null
		},
		/** 库里实际配好的职业（没配就不拿内置 JOB_MAP 比，免每存一次日程都弹内置夜班的提醒） */
		jobsValue() {
			const doc = this.list.find(d => d.key === 'jobs')
			return (doc && doc.value) || null
		},
		/** 职业班次与给定睡眠时段重叠的说明文案，无重叠返回空串 */
		sleepVsJobsMsg(jobsMap, sleep) {
			if (!jobsMap || !sleep || !sleep.start || !sleep.end) return ''
			const bad = []
			Object.keys(jobsMap).forEach(k => {
				const j = jobsMap[k]
				if (!j || typeof j !== 'object') return
				const hits = (j.shifts || []).filter(s => s && s.start && s.end && findSleepConflict([s], sleep))
				if (hits.length) bad.push(`${j.name || k}的${hits.map(s => `「${s.name || '班次'} ${s.start}-${s.end}」`).join('、')}`)
			})
			return bad.length ? bad.join('；') + ` 与睡眠时段 ${sleep.start}-${sleep.end} 重叠。` : ''
		},
		buildSchedule() {
			return {
				workShifts: this.sched.workShifts,
				restWindows: this.sched.restWindows,
				sleep: this.sched.sleep,
				// 云端在没有专属班次时用 workDays 判工作日（请假/旷工结算）：取所有全局班次星期的并集，
				// 只取第一个班次的星期会把其它班次上班的日子当成休息日
				workDays: this.workDaysOf()
			}
		},
		workDaysOf() {
			const set = []
			this.sched.workShifts.forEach((w) => {
				const days = (w.weekdays && w.weekdays.length) ? w.weekdays : ALL_DAYS // 不选 = 每天
				ALL_DAYS.forEach(d => { if (days.indexOf(d) > -1 && set.indexOf(d) < 0) set.push(d) })
			})
			return set.sort((a, b) => a - b)
		},
		async doSave(value) {
			const sort = Number(this.cur.sort)
			this.saving = true
			const r = await this.call({
				action: 'add',
				data: { key: this.cur.key, label: this.cur.label, sort: isFinite(sort) ? sort : 100, is_active: this.cur.is_active, value }
			})
			this.saving = false
			if (r.code !== 0) { uni.showToast({ title: r.message || '保存失败', icon: 'none' }); return }
			uni.showToast({ title: r.message || '已保存', icon: 'none' })
			// 刚存进去的内容就是新的基准，避免回到列表时误报“未保存”
			this.origJson = JSON.stringify(this.currentValue())
			this.view = 'list'
			await this.load()
			// 同步刷新本端运行时配置缓存（等完才准，后面的班次冲突判定依赖它）
			try { await loadBeemoreConfig() } catch (e) {}
		},

		async toggleActive(doc) {
			if (this.saving) return
			this.saving = true
			// 云端 getMap 只取 is_active === true，所以这里用 truthy 判定，没这个字段的老数据也能被启用
			const r = await this.call({ action: 'update', data: { _id: doc._id, is_active: !doc.is_active } })
			this.saving = false
			if (r.code !== 0) { uni.showToast({ title: r.message || '操作失败', icon: 'none' }); return }
			await this.load()
			// 停用/启用要同时刷本端运行时缓存，否则其它页面仍拿旧的 live 配置
			try { await loadBeemoreConfig() } catch (e) {}
		},
		del(doc) {
			uni.showModal({ title: '确认删除', content: `删除「${doc.key}」后运行时会回退到内置默认值，确定？`, confirmColor: '#e0566b', success: async (res) => {
				if (!res.confirm) return
				if (this.saving) { uni.showToast({ title: '上一条请求还在走，请稍等……', icon: 'none' }); return }
				this.saving = true
				const r = await this.call({ action: 'delete', data: { _id: doc._id } })
				this.saving = false
				if (r.code !== 0) { uni.showToast({ title: r.message || '删除失败', icon: 'none' }); return }
				uni.showToast({ title: '已删除', icon: 'none' })
				await this.load()
				try { await loadBeemoreConfig() } catch (e) {}
			} })
		},
		resetAll() {
			uni.showModal({ title: '恢复默认', content: '将清空全部自定义配置，运行时会使用内置默认值。确定？', confirmColor: '#e0566b', success: async (res) => {
				if (!res.confirm) return
				if (this.saving) { uni.showToast({ title: '上一条请求还在走，请稍等……', icon: 'none' }); return }
				this.saving = true
				uni.showLoading({ title: '清空中……' })
				const r = await this.call({ action: 'resetDefaults' })
				uni.hideLoading()
				this.saving = false
				if (r.code !== 0) { uni.showToast({ title: r.message || '操作失败', icon: 'none' }); return }
				uni.showToast({ title: r.message || '已恢复', icon: 'none' })
				await this.load()
				try { await loadBeemoreConfig() } catch (e) {}
			} })
		}
	}
}
