<template>
	<view class="page">
		<!-- 非管理员拦截 -->
		<view class="deny" v-if="!isAdmin">
			<text class="deny-icon">🔒</text>
			<text class="deny-text">仅管理员可管理档案数据</text>
			<view class="deny-btn" @click="goBack">返回</view>
		</view>

		<block v-else>
			<!-- 顶部主体切换 -->
			<view class="top-tabs">
				<view class="ttab" v-for="s in subjectOrder" :key="s" :class="{ active: currentSubject === s }" @click="switchSubject(s)">{{ subjects[s].short }}</view>
			</view>

			<!-- 分类 chips -->
			<scroll-view scroll-x class="chips">
				<view class="chip" v-for="c in categories" :key="c" :class="{ active: currentCat === c }" @click="switchCat(c)">
					{{ schemaLabel(c) }}<text class="chip-count">{{ catCount(c) }}</text>
				</view>
			</scroll-view>

			<!-- 排序工具条：仅在可拖拽分类下提供，开启后同一年份/同一时间的记录可拖拽调序 -->
			<view class="sort-toolbar">
				<view class="sort-toggle" :class="{ on: sortMode }" @click="toggleSortMode">
					<text v-if="!sortMode">↕ 拖拽排序</text>
					<text v-else>✓ 排序中·长按卡片拖动</text>
				</view>
				<text class="sort-tip" v-if="sortMode">仅在「相同年份/时间」的记录之间生效</text>
			</view>

			<!-- 列表 -->
			<scroll-view class="list-scroll" :scroll-y="!isDragging">
				<view class="list">
					<view
						class="item"
						:class="{ 'item-hidden-view': it.hidden, 'item-drag-src': isDragging && dragIndex === idx, 'item-off': sortMode && !isDragging }"
						:style="getItemStyle(idx)"
						v-for="(it, idx) in items"
						:key="it._id"
						@longpress="onSortStart($event, idx)"
						@touchmove="onSortMove"
						@touchend="onSortEnd"
					>
						<view class="drag-handle" v-if="sortMode">⠿</view>
						<view class="item-icon" v-else>{{ catIcon() }}</view>
						<view class="item-body">
							<view class="item-title-row">
								<text class="item-title">{{ itemTitle(it) }}</text>
								<text class="item-pair" v-if="it.isPair">双人</text>
								<text class="item-hidden-tag" v-if="it.hidden">🔒 已隐藏</text>
							</view>
							<text class="item-sub">{{ itemSub(it) }}</text>
							<text class="item-order" v-if="sortMode">{{ groupLabel(it) }} · 排序值 {{ it.sort || 0 }}</text>
						</view>
						<view class="item-actions" v-if="!sortMode">
							<view class="ibtn hide" @click.stop="toggleHidden(it)">{{ it.hidden ? '取消隐藏' : '隐藏' }}</view>
							<view class="ibtn edit" @click.stop="openForm('edit', it)">编辑</view>
							<view class="ibtn del" @click.stop="del(it)">删除</view>
						</view>
					</view>
					<view class="empty" v-if="!items.length">{{ sortMode ? '该分类暂无可排序数据' : '暂无数据，点击右下角 + 添加' }}</view>
				</view>
			</scroll-view>

			<!-- 新增悬浮按钮 -->
			<view class="fab" @click="openForm('add')">+</view>

			<!-- 表单弹层 -->
			<view class="mask" v-if="formVisible" @click="closeForm"></view>
			<view class="sheet" v-if="formVisible">
				<view class="sheet-head">
					<text class="sheet-title">{{ formMode === 'edit' ? '编辑' : '新增' }} · {{ canPair && pairMode ? '青宇 · ' + pairLabel : schemaLabel(currentCat) }}</text>
					<text class="sheet-close" @click="closeForm">✕</text>
				</view>
				<scroll-view scroll-y class="sheet-body">
					<!-- 单人/双人归档切换：新增与编辑均可切，双人存青宇主体 -->
					<view class="pair-row" v-if="canPair">
						<view class="pair-opt" :class="{ active: !pairMode }" @click="setPair(false)">单人 · 归{{ subjects[currentSubject].short }}</view>
						<view class="pair-opt double" :class="{ active: pairMode }" @click="setPair(true)">双人 · 归档青宇</view>
					</view>
					<view class="fg" v-for="f in formFields" :key="f.key">
						<text class="flabel">{{ f.label }}<text class="req" v-if="f.required">*</text></text>

						<picker v-if="f.type === 'select'" :range="optList(f)" range-key="label" :value="selectIndex(f)" @change="onSelect(f, $event)">
							<view class="fin">{{ optionLabel(f, formData[f.key]) || '请选择' }}</view>
						</picker>

						<!-- 字典下拉：基础项+管理员扩展，可就地新增选项 -->
						<block v-else-if="f.type === 'dict'">
							<picker :range="optionsFor(f)" :value="selectIndex(f)" @change="onSelect(f, $event)">
								<view class="fin">{{ formData[f.key] || '请选择' }}</view>
							</picker>
							<view class="dict-add">
								<view class="dict-btn" v-if="showDictKey !== f.key" @click="startAddDict(f)">＋ 新增选项</view>
								<block v-else>
									<input class="fin dict-input" v-model="newDictValue" placeholder="输入新选项名称" confirm-type="done" @confirm="addDictOption(f)" />
									<view class="dict-btn ok" @click="addDictOption(f)">保存</view>
									<view class="dict-btn" @click="cancelAddDict">取消</view>
								</block>
							</view>
						</block>

						<!-- 年份选择器 -->
						<picker v-else-if="f.type === 'year'" :range="yearOptions" :value="yearIndex(f)" @change="onYear(f, $event)">
							<view class="fin">{{ formData[f.key] || '请选择年份' }}</view>
						</picker>

						<!-- 日期选择器（与其他页面统一用 uni-datetime-picker） -->
						<uni-datetime-picker v-else-if="f.type === 'date'" type="date" v-model="formData[f.key]" />

						<!-- 多选胶囊（如歌曲参与身份：作词/作曲/编曲/演唱） -->
						<view v-else-if="f.type === 'checks'" class="checks">
							<view class="check-opt" v-for="o in f.options" :key="o" :class="{ active: hasOpt(f, o) }" @click="toggleOpt(f, o)">{{ o }}</view>
						</view>

						<!-- 图片上传（复用全局 image-upload 组件，与 rili / notice / holiday-admin 一致：
						     选图时组件内部已先走 uni.chooseImage({sizeType:['compressed']}) + canvas 二次压缩
						     （maxWidth=500 / maxHeight=800 / quality=0.6 / jpg），
						     保存时 processImages 只负责将已压缩临时文件上传云存储 -->
						<image-upload v-else-if="f.type === 'image'" :ref="'up_' + f.key" :title="f.label" optional-text="最多1张，自动压缩上传" :max-count="1" upload-path="dangan" :modelValue="formData[f.key]" />

						<textarea v-else-if="f.type === 'textarea'" class="fin area" v-model="formData[f.key]" :placeholder="f.placeholder || ''" />

						<input v-else class="fin" v-model="formData[f.key]" :placeholder="f.placeholder || ''" />
					</view>
				</scroll-view>
				<view class="sheet-foot">
					<view class="sbtn cancel" @click="closeForm">取消</view>
					<view class="sbtn save" @click="save">保存</view>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
import { isAdmin } from '@/common/js/permission.js'
import { SUBJECTS, SUBJECT_ORDER, WORK_SECTIONS, SCHEMA, DICT_BASE, PAIR_MAP } from './dangan-const.js'
import imageUpload from '@/components/image-upload/image-upload.vue'

export default {
	components: { imageUpload },
	data() {
		return {
			subjects: SUBJECTS,
			subjectOrder: SUBJECT_ORDER,
			rawList: [],
			isAdmin: false,
			userId: '',
			currentSubject: 'intersection',
			currentCat: 'works',
			formVisible: false,
			formMode: 'add',
			formId: '',
			fields: [],
			formData: {},
			pairMode: false,
			dict: {},
			showDictKey: '',
			newDictValue: '',
			// 拖拽排序相关（仅 sortMode 下生效，只允许同一年份/同一时间组内调序）
			sortMode: false,
			isDragging: false,
			dragIndex: -1,
			dragTargetIndex: -1,
			dragGroupStart: -1,
			dragGroupEnd: -1,
			dragStartY: 0,
			dragOffsetY: 0,
			dragItemPositions: []
		}
	},
	computed: {
		// 当前分类支持单人/双人归档（仅王青/冯建宇个人页下作品、商务、歌曲、活动、荣誉）
		canPair() {
			return (this.currentSubject === 'wang' || this.currentSubject === 'feng') && !!PAIR_MAP[this.currentCat]
		},
		pairLabel() {
			const cat = PAIR_MAP[this.currentCat]
			return cat ? (SCHEMA.intersection[cat] || {}).label : ''
		},
		// 表单实际字段：双人模式用青宇对应分类的字段定义
		formFields() {
			if (this.canPair && this.pairMode) return SCHEMA.intersection[PAIR_MAP[this.currentCat]].fields
			return this.fields
		},
		// 年份选项：次年 → 1970 降序
		yearOptions() {
			const ys = []
			const cur = new Date().getFullYear()
			for (let y = cur + 1; y >= 1970; y--) ys.push(String(y))
			return ys
		},
		categories() {
			return Object.keys(SCHEMA[this.currentSubject] || {})
		},
		items() {
			const pick = (subject, cat, isPair) => this.rawList
				.filter(r => r.subject === subject && r.category === cat)
				.map(r => ({ _id: r._id, sort: r.sort || 0, hidden: !!r.hidden, createTime: r.createTime || 0, isPair, data: this.normData(r) }))
			let list = pick(this.currentSubject, this.currentCat, false)
			// 单人页同步展示已归档到青宇的双人记录（编辑可切回单人）
			if (this.canPair) list = list.concat(pick('intersection', PAIR_MAP[this.currentCat], true))
			// 权重：时间/年份降序 > sort 降序（同组手动拖拽）> createTime 降序 > _id 稳定
			return list.sort((a, b) =>
				(this.sortKey(b.data) - this.sortKey(a.data)) ||
				((b.sort || 0) - (a.sort || 0)) ||
				((b.createTime || 0) - (a.createTime || 0)) ||
				String(a._id || '').localeCompare(String(b._id || ''))
			)
		}
	},
	onLoad() {
		this.checkAdmin()
		if (this.isAdmin) {
			this.loadData()
			this.loadDict()
		}
	},
	onShow() {
		this.checkAdmin()
		if (this.isAdmin && this._loaded) this.loadData()
	},
	methods: {
		checkAdmin() {
			try {
				const raw = uni.getStorageSync('userInfo')
				const info = typeof raw === 'string' ? JSON.parse(raw) : raw
				this.isAdmin = isAdmin(info)
				this.userId = info && info._id ? info._id : ''
			} catch (e) {
				this.isAdmin = false
			}
		},
		goBack() {
			uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/dangan/dangan' }) })
		},
		// 从记录自身字段解析可排序日期值：year*10000 + 月*100 + 日；无年份排末尾（与展示页一致）
		dateKey(d) {
			const s = String((d && (d.date || '')) + ' ' + (d && (d.year || '')) || '')
			let y = 0, m = 0, day = 0
			let mm = s.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/)
			if (mm) { y = +mm[1]; m = +mm[2]; day = +mm[3] }
			else {
				mm = s.match(/\d{4}/)
				if (mm) y = +mm[0]
				const md = s.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
				if (md) { m = +md[1]; day = +md[2] }
			}
			if (!y) return 99999999
			return y * 10000 + m * 100 + day
		},
		// 倒序专用：无年份的记录归一为 -1，保证降序排列时仍在末尾
		sortKey(d) {
			const k = this.dateKey(d)
			return k >= 99999999 ? -1 : k
		},
		// 兼容嵌套 data 与平铺字段两种记录结构（与展示页一致）
		normData(rec) {
			if (rec.data && typeof rec.data === 'object') return rec.data
			const skip = { _id: 1, subject: 1, category: 1, sort: 1, createTime: 1, updateTime: 1 }
			const out = {}
			Object.keys(rec).forEach(k => { if (!skip[k]) out[k] = rec[k] })
			return out
		},
		loadData() {
			uni.showLoading({ title: '加载中' })
			uniCloud.callFunction({
				name: 'dangan',
				// 传 userId 让云函数识别管理员身份，返回全量（含 hidden=true）；普通用户端不传则服务端自动过滤隐藏项
				data: { action: 'getList', userId: this.userId },
				success: (res) => {
					uni.hideLoading()
					if (res.result && res.result.code === 0) {
						this.rawList = res.result.data.list || []
						this._loaded = true
						if (!this.categories.includes(this.currentCat)) this.currentCat = this.categories[0]
					} else {
						uni.showToast({ title: (res.result && res.result.message) || '加载失败', icon: 'none' })
					}
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }) }
			})
		},
		switchSubject(s) {
			this.currentSubject = s
			// 不依赖 categories computed 的求值时序，直接从目标主体的 SCHEMA 取首项，
			// 避免 currentCat 停留在旧主体分类上导致 chip 无高亮/看似跳回默认
			const cats = Object.keys(SCHEMA[s] || {})
			this.currentCat = cats.includes(this.currentCat) ? this.currentCat : cats[0]
		},
		switchCat(c) { this.currentCat = c },
		// 切换拖拽排序模式（离开时清理拖拽态）
		toggleSortMode() {
			this.sortMode = !this.sortMode
			if (!this.sortMode) {
				this.isDragging = false
				this.dragIndex = -1
				this.dragTargetIndex = -1
				this.dragOffsetY = 0
				this.dragItemPositions = []
			}
		},
		// 当前记录所属的同年份/同时间组标签（排序时展示，便于确认分组）
		groupLabel(it) {
			const k = this.sortKey(it.data)
			if (k < 0) return '无时间'
			const y = Math.floor(k / 10000), m = Math.floor((k % 10000) / 100), d = k % 100
			return m ? `${y}-${m}${d ? '-' + d : ''}` : `${y}年`
		},
		// 拖拽时行内位移：拖拽项跟手，同组中间项让位；非拖拽态返回空
		getItemStyle(index) {
			if (!this.isDragging || this.dragIndex < 0) return ''
			const pos = this.dragItemPositions
			if (!pos || !pos.length) return ''
			if (index === this.dragIndex) {
				return `transform: translate(0, ${this.dragOffsetY}px) scale(1.01); z-index: 100; opacity: .95; box-shadow: 0 12rpx 32rpx rgba(0,0,0,.22); transition: none;`
			}
			if (index < this.dragGroupStart || index > this.dragGroupEnd) return ''
			let dy = 0
			if (this.dragTargetIndex > this.dragIndex && index > this.dragIndex && index <= this.dragTargetIndex) {
				dy = pos[index - 1].top - pos[index].top
			} else if (this.dragTargetIndex < this.dragIndex && index >= this.dragTargetIndex && index < this.dragIndex) {
				dy = pos[index + 1].top - pos[index].top
			}
			if (dy === 0) return ''
			return `transform: translate(0, ${dy}px); z-index: 2; transition: transform .2s cubic-bezier(0.2,0.8,0.3,1);`
		},
		onSortStart(e, index) {
			if (!this.sortMode) return
			const arr = this.items
			if (!arr.length) return
			const key = this.sortKey(arr[index].data)
			let gs = index, ge = index
			while (gs - 1 >= 0 && this.sortKey(arr[gs - 1].data) === key) gs--
			while (ge + 1 < arr.length && this.sortKey(arr[ge + 1].data) === key) ge++
			if (gs === ge) {
				uni.showToast({ title: '该时间组仅 1 条，无需调序', icon: 'none' })
				return
			}
			this.dragGroupStart = gs
			this.dragGroupEnd = ge
			this.isDragging = true
			this.dragIndex = index
			this.dragTargetIndex = index
			const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || {}
			this.dragStartY = touch.clientY || 0
			this.dragOffsetY = 0
			const query = uni.createSelectorQuery().in(this)
			query.selectAll('.item').boundingClientRect()
			query.exec((res) => {
				if (res && res[0]) this.dragItemPositions = res[0]
			})
			uni.vibrateShort()
		},
		onSortMove(e) {
			if (!this.isDragging || this.dragIndex < 0) return
			const touch = (e.touches && e.touches[0]) || {}
			this.dragOffsetY = (touch.clientY || 0) - this.dragStartY
			const pos = this.dragItemPositions
			if (!pos || !pos.length) return
			let target = this.dragTargetIndex
			for (let i = this.dragGroupStart; i <= this.dragGroupEnd; i++) {
				const p = pos[i]
				if (!p) continue
				if (touch.clientY >= p.top && touch.clientY <= p.bottom) { target = i; break }
			}
			if (target !== this.dragTargetIndex) {
				this.dragTargetIndex = target
				uni.vibrateShort()
			}
		},
		onSortEnd() {
			if (!this.isDragging) return
			const from = this.dragIndex, to = this.dragTargetIndex
			const changed = to !== -1 && to !== from
			this.isDragging = false
			this.dragIndex = -1
			this.dragTargetIndex = -1
			this.dragOffsetY = 0
			this.dragItemPositions = []
			if (changed) this.applyReorder(from, to)
		},
		// 将拖拽结果归一为同组递减 sort 值并持久化
		applyReorder(from, to) {
			const arr = this.items.slice()
			const dragged = arr[from]
			arr.splice(from, 1)
			arr.splice(to, 0, dragged)
			const key = this.sortKey(dragged.data)
			let gStart = -1, gEnd = -1
			arr.forEach((x, idx) => {
				if (this.sortKey(x.data) === key) {
					if (gStart === -1) gStart = idx
					gEnd = idx
				}
			})
			if (gStart === -1) return
			// 同组内按新位置从高到低赋予递降 sort（靠前者值大，与展示页 sort 降序一致）
			const updates = []
			let w = gEnd - gStart + 1
			for (let idx = gStart; idx <= gEnd; idx++) {
				updates.push({ id: arr[idx]._id, sort: w })
				w--
			}
			this.persistSorts(updates)
		},
		persistSorts(updates) {
			uni.showLoading({ title: '保存排序' })
			uniCloud.callFunction({
				name: 'dangan',
				data: { action: 'setSorts', userId: this.userId, items: updates },
				success: (res) => {
					uni.hideLoading()
					if (res.result && res.result.code === 0) {
						uni.showToast({ title: '排序已保存', icon: 'success' })
						// 本地同步 sort（整体 map 重新赋值触发响应式），避免整表重拉
						const map = {}
						updates.forEach(u => { map[u.id] = u.sort })
						this.rawList = this.rawList.map(r => (map[r._id] !== undefined ? Object.assign({}, r, { sort: map[r._id] }) : r))
					} else {
						uni.showToast({ title: (res.result && res.result.message) || '保存失败', icon: 'none' })
						this.loadData()
					}
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }); this.loadData() }
			})
		},
		schemaLabel(c) { return (SCHEMA[this.currentSubject][c] || {}).label || c },
		catIcon() { return (SCHEMA[this.currentSubject][this.currentCat] || {}).icon || '▣' },
		catCount(c) {
			let n = this.rawList.filter(r => r.subject === this.currentSubject && r.category === c).length
			if ((this.currentSubject === 'wang' || this.currentSubject === 'feng') && PAIR_MAP[c]) {
				n += this.rawList.filter(r => r.subject === 'intersection' && r.category === PAIR_MAP[c]).length
			}
			return n
		},

		itemTitle(it) {
			const d = it.data
			const c = this.currentCat
			if (c === 'stats') return `${d.value || ''}${d.unit || ''}`
			if (c === 'profile') return d.name || ''
			if (c === 'accounts' || c === 'cpAccounts') return `${d.platform || ''} · ${d.handle || ''}`
			if (c === 'brands' || c === 'doubleBrands') return d.brand || ''
			if (c === 'music' || c === 'doubleSongs') return d.song || ''
			if (c === 'events' || c === 'doubleEvents') return d.name || ''
			return d.title || d.name || d.song || d.brand || ''
		},
		itemSub(it) {
			const d = it.data
			const c = this.currentCat
			if (c === 'stats') return d.label || ''
			if (c === 'profile') return `${d.tags || ''} · ${d.fandomHex || ''}`
			if (c === 'accounts' || c === 'cpAccounts') return `粉丝 ${d.fans || '-'} · 涨粉 ${d.growth || '-'}`
			if (c === 'works') return [d.year ? d.year + '年' : '', d.workRole, d.role].filter(Boolean).join(' · ')
			if (c === 'honors') return `${d.year || ''} · ${d.org || ''}`
			if (c === 'brands' || c === 'doubleBrands') return `${d.year || ''}年 · ${d.title || ''} · ${d.status || ''}`
			if (c === 'music' || c === 'doubleSongs') {
				const cr = []
				if (d.creditWang) cr.push('王青·' + d.creditWang)
				if (d.creditFeng) cr.push('冯建宇·' + d.creditFeng)
				if (d.credit) cr.push(d.credit)
				return [d.date, d.platform].filter(Boolean).concat(cr).join(' · ')
			}
			if (c === 'events' || c === 'doubleEvents') return `${d.date || ''} · ${d.location || ''}`
			return ''
		},

		openForm(mode, it) {
			this.formMode = mode
			const cat = SCHEMA[this.currentSubject][this.currentCat]
			this.fields = cat.fields
			// 编辑双人记录时默认进入双人表单
			this.pairMode = !!(it && it.isPair)
			const fields = this.formFields
			const data = {}
			fields.forEach(f => { data[f.key] = '' })
			if (mode === 'edit' && it) {
				this.formId = it._id
				fields.forEach(f => { data[f.key] = it.data[f.key] == null ? '' : it.data[f.key] })
			} else {
				this.formId = ''
				if (this.currentCat === 'works') data.section = 'tv'
			}
			this.formData = data
			this.formVisible = true
		},
		// 切换单人/双人：重建表单并尽量保留同名字段已填内容（新增/编辑均可切）
		setPair(v) {
			if (!this.canPair || this.pairMode === v) return
			this.pairMode = v
			const old = this.formData
			const data = {}
			this.formFields.forEach(f => { data[f.key] = old[f.key] != null ? old[f.key] : '' })
			if (v && PAIR_MAP[this.currentCat] === 'works') data.section = 'tv'
			this.formData = data
			this.showDictKey = ''
		},
		closeForm() { this.formVisible = false },
		// 字典：从云 DB 拉取管理员扩展项（失败不阻断，仅用基础项）
		loadDict() {
			uniCloud.callFunction({
				name: 'dangan',
				data: { action: 'getDict' },
				success: (res) => {
					if (res.result && res.result.code === 0) this.dict = res.result.data.dict || {}
				}
			})
		},
		// 下拉选项：dict 类型合并 DICT_BASE + 云端扩展并去重；select 用静态 options
		optionsFor(f) {
			if (f.type !== 'dict') return f.options || []
			const base = DICT_BASE[f.dictKey] || []
			const extra = this.dict[f.dictKey] || []
			return Array.from(new Set(base.concat(extra)))
		},
		selectIndex(f) {
			const list = f.type === 'dict' ? this.optionsFor(f) : this.optList(f).map(o => o.value)
			const i = list.indexOf(this.formData[f.key])
			return i < 0 ? 0 : i
		},
		onSelect(f, e) {
			if (f.type === 'dict') {
				this.formData[f.key] = this.optionsFor(f)[e.detail.value]
			} else {
				const o = this.optList(f)[e.detail.value]
				this.formData[f.key] = o ? o.value : ''
			}
		},
		// select 选项归一：支持 '字符串' 或 {value,label}（如作品大类展示 label、存储 key）
		optList(f) {
			return (f.options || []).map(o => (o && typeof o === 'object') ? o : { value: String(o), label: String(o) })
		},
		optionLabel(f, v) {
			const o = this.optList(f).find(x => x.value === v)
			return o ? o.label : (v || '')
		},
		yearIndex(f) {
			const i = this.yearOptions.indexOf(String(this.formData[f.key] || ''))
			return i < 0 ? 0 : i
		},
		onYear(f, e) {
			this.formData[f.key] = this.yearOptions[e.detail.value]
		},
		// 多选胶囊：逗号串存储
		hasOpt(f, o) {
			return String(this.formData[f.key] || '').split(',').indexOf(o) > -1
		},
		toggleOpt(f, o) {
			const arr = String(this.formData[f.key] || '').split(',').filter(Boolean)
			const i = arr.indexOf(o)
			if (i > -1) arr.splice(i, 1); else arr.push(o)
			this.formData[f.key] = arr.join(',')
		},
		startAddDict(f) { this.showDictKey = f.key; this.newDictValue = '' },
		cancelAddDict() { this.showDictKey = ''; this.newDictValue = '' },
		addDictOption(f) {
			const v = String(this.newDictValue || '').trim()
			if (!v) { uni.showToast({ title: '请输入新选项', icon: 'none' }); return }
			const cur = this.optionsFor(f)
			if (cur.indexOf(v) > -1) { uni.showToast({ title: '选项已存在', icon: 'none' }); return }
			const values = cur.concat([v])
			uni.showLoading({ title: '保存中' })
			uniCloud.callFunction({
				name: 'dangan',
				data: { action: 'saveDict', userId: this.userId, key: f.dictKey, values },
				success: (res) => {
					uni.hideLoading()
					if (res.result && res.result.code === 0) {
						// 整体替换触发响应式（兼容 Vue2/Vue3）
						this.dict = Object.assign({}, this.dict, { [f.dictKey]: values })
						this.cancelAddDict()
						uni.showToast({ title: '已添加选项', icon: 'success' })
					} else {
						uni.showToast({ title: (res.result && res.result.message) || '保存失败', icon: 'none' })
					}
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }) }
			})
		},
		async save() {
			const isEdit = this.formMode === 'edit'
			const fields = this.formFields
			// 先处理图片字段：新图上传云存储、外链保留；上传失败（返回 null）则中断保存
			for (const f of fields) {
				if (f.type === 'image') {
					let el = this.$refs['up_' + f.key]
					if (Array.isArray(el)) el = el[0]
					if (el) {
						const r = await el.processImages(isEdit)
						if (r === null) return
						this.formData[f.key] = r
					}
				}
			}
			// 必填校验
			for (const f of fields) {
				if (f.required && !String(this.formData[f.key] || '').trim()) {
					uni.showToast({ title: `请填写：${f.label}`, icon: 'none' })
					return
				}
			}
			const data = {}
			fields.forEach(f => { data[f.key] = String(this.formData[f.key] || '').trim() })
			// 双人作品：两人分别饰演时自动合并进角色信息
			if (data.roleWang || data.roleFeng) {
				const parts = []
				if (data.roleWang) parts.push('王青：' + data.roleWang)
				if (data.roleFeng) parts.push('冯建宇：' + data.roleFeng)
				data.role = parts.join(' · ')
			}
			// 双人归档：写入青宇主体下的对应分类；单人保持当前主体
			const pair = this.canPair && this.pairMode
			const action = isEdit ? 'update' : 'add'
			// sort 默认同一为空（0）；编辑保留原有 sort（手动拖拽设定的值），新增一律 0
			const curSort = isEdit ? Number((this.items.find(x => x._id === this.formId) || {}).sort) || 0 : 0
			const payload = {
				action,
				userId: this.userId,
				subject: pair ? 'intersection' : this.currentSubject,
				category: pair ? PAIR_MAP[this.currentCat] : this.currentCat,
				data,
				sort: curSort
			}
			if (isEdit) payload.id = this.formId

			uni.showLoading({ title: '保存中' })
			uniCloud.callFunction({
				name: 'dangan',
				data: payload,
				success: (res) => {
					uni.hideLoading()
					if (res.result && res.result.code === 0) {
						uni.showToast({ title: isEdit ? '已更新' : (pair ? '已归档到青宇' : '已添加'), icon: 'success' })
						this.closeForm()
						// 新增双人归档后切到青宇对应分类；编辑不跳主体，仅守卫 currentCat 在新主体下无效的情况
						if (pair && !isEdit) {
							this.currentSubject = 'intersection'
							this.currentCat = PAIR_MAP[this.currentCat] || this.currentCat
						}
						const cats = Object.keys(SCHEMA[this.currentSubject] || {})
						if (!cats.includes(this.currentCat)) this.currentCat = cats[0]
						this.loadData()
					} else {
						uni.showToast({ title: (res.result && res.result.message) || '保存失败', icon: 'none' })
					}
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }) }
			})
		},
		del(it) {
			uni.showModal({
				title: '确认删除',
				content: '确定删除这条数据吗？',
				success: (r) => {
					if (!r.confirm) return
					uni.showLoading({ title: '删除中' })
					uniCloud.callFunction({
						name: 'dangan',
						data: { action: 'delete', userId: this.userId, id: it._id },
						success: (res) => {
							uni.hideLoading()
							if (res.result && res.result.code === 0) {
								uni.showToast({ title: '已删除', icon: 'success' })
								this.loadData()
							} else {
								uni.showToast({ title: (res.result && res.result.message) || '删除失败', icon: 'none' })
							}
						},
						fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }) }
					})
				}
			})
		},
		// 切换隐藏标志：admin 侧仍可见，普通用户侧 dangan.vue 不展示
		toggleHidden(it) {
			const next = !it.hidden
			uni.showLoading({ title: next ? '隐藏中' : '取消隐藏' })
			uniCloud.callFunction({
				name: 'dangan',
				data: { action: 'setHidden', userId: this.userId, id: it._id, hidden: next },
				success: (res) => {
					uni.hideLoading()
					if (res.result && res.result.code === 0) {
						uni.showToast({ title: next ? '已隐藏，普通用户不再看到' : '已取消隐藏', icon: 'success' })
						// 本地乐观更新（splice 保证响应式），避免整表重拉
						const idx = this.rawList.findIndex(r => r._id === it._id)
						if (idx > -1) {
							const updated = Object.assign({}, this.rawList[idx], { hidden: next, updateTime: Date.now() })
							this.rawList.splice(idx, 1, updated)
						}
					} else {
						uni.showToast({ title: (res.result && res.result.message) || '操作失败', icon: 'none' })
					}
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络异常', icon: 'none' }) }
			})
		}
	}
}
</script>

<style>
.page { height: 100vh; box-sizing: border-box; background: linear-gradient(135deg,#ede9fe 0%,#e0f2fe 50%,#cffafe 100%); display: flex; flex-direction: column; }

.deny { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 240rpx; gap: 24rpx; }
.deny-icon { font-size: 80rpx; }
.deny-text { font-size: 28rpx; color: #6b7280; }
.deny-btn { padding: 18rpx 48rpx; background: #0d9488; color: #fff; border-radius: 40rpx; font-size: 26rpx; }

.top-tabs { display: flex; gap: 12rpx; padding: 20rpx 24rpx; background: linear-gradient(135deg,#0d9488 0%,#31eee0 100%); flex-shrink: 0; }
.ttab { flex: 1; text-align: center; padding: 18rpx 0; font-size: 26rpx; font-weight: 700; color: rgba(255,255,255,.85); background: rgba(255,255,255,.18); border-radius: 20rpx; }
.ttab.active { background: #fff; color: #0d9488; }

.chips { white-space: nowrap; padding: 20rpx 24rpx; flex-shrink: 0; }

/* 拖拽排序工具条 */
.sort-toolbar { display: flex; align-items: center; gap: 16rpx; padding: 0 24rpx 16rpx; flex-shrink: 0; }
.sort-toggle { padding: 12rpx 26rpx; border-radius: 30rpx; font-size: 24rpx; font-weight: 700; background: #fff; border: 2rpx solid #e9d5ff; color: #6b7280; }
.sort-toggle.on { background: linear-gradient(135deg,#31eee0,#0d9488); border-color: transparent; color: #fff; }
.sort-tip { font-size: 21rpx; color: #b45309; }
.list-scroll { flex: 1; min-height: 0; }
.chip { display: inline-flex; align-items: center; gap: 8rpx; padding: 14rpx 28rpx; margin-right: 14rpx; border-radius: 32rpx; background: #fff; border: 2rpx solid #e9d5ff; font-size: 25rpx; font-weight: 700; color: #6b7280; }
.chip.active { background: linear-gradient(135deg,#31eee0,#0d9488); border-color: transparent; color: #fff; }
.chip-count { font-size: 18rpx; padding: 1rpx 12rpx; border-radius: 16rpx; background: rgba(0,0,0,.08); }
.chip.active .chip-count { background: rgba(255,255,255,.3); }

.list { padding: 0 24rpx 160rpx; display: flex; flex-direction: column; gap: 16rpx; }
.item { position: relative; background: #fff; border-radius: 20rpx; padding: 20rpx 24rpx; display: flex; align-items: center; gap: 18rpx; box-shadow: 0 4rpx 14rpx rgba(0,0,0,.05); }
.drag-handle { width: 40rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; color: #94a3b8; flex-shrink: 0; }
.item-off { border-left: 6rpx solid #31eee0; }
.item-drag-src { background: #e0f2fe; }
.item-order { display: block; font-size: 20rpx; color: #0d9488; margin-top: 6rpx; font-weight: 700; }
.item-hidden-view { background: #f8fafc; opacity: .72; }
.item-hidden-view .item-icon { background: linear-gradient(135deg,#cbd5e1,#94a3b8); }
.item-hidden-view .item-title { color: #64748b; text-decoration: line-through; text-decoration-color: rgba(100,116,139,.5); }
.item-hidden-tag { font-size: 18rpx; font-weight: 800; color: #fff; padding: 2rpx 12rpx; border-radius: 10rpx; background: #64748b; flex-shrink: 0; }
.item-icon { width: 66rpx; height: 66rpx; border-radius: 16rpx; background: linear-gradient(135deg,#5eead4,#31eee0); color: #fff; font-size: 28rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.item-body { flex: 1; min-width: 0; }
.item-title { display: block; font-size: 27rpx; font-weight: 800; color: #1e1b4b; }
.item-title-row { display: flex; align-items: center; gap: 10rpx; }
.item-pair { font-size: 18rpx; font-weight: 800; color: #fff; padding: 2rpx 12rpx; border-radius: 10rpx; background: linear-gradient(135deg,#31eee0,#9a9ad9); flex-shrink: 0; }
.item-sub { display: block; font-size: 21rpx; color: #6b7280; margin-top: 4rpx; }
.item-actions { display: flex; gap: 10rpx; flex-shrink: 0; }
.ibtn { padding: 12rpx 20rpx; border-radius: 12rpx; font-size: 22rpx; font-weight: 700; }
.ibtn.edit { background: #ede9fe; color: #6366f1; }
.ibtn.del { background: #fee2e2; color: #ef4444; }
.ibtn.hide { background: #fef3c7; color: #b45309; }
.empty { text-align: center; color: #94a3b8; font-size: 26rpx; padding: 80rpx 0; }

.fab { position: fixed; right: 40rpx; bottom: 60rpx; width: 110rpx; height: 110rpx; border-radius: 34rpx; background: linear-gradient(135deg,#31eee0,#9a9ad9); color: #fff; font-size: 60rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 10rpx 30rpx rgba(49,238,224,.5); }

.mask { position: fixed; inset: 0; background: rgba(30,27,75,.5); z-index: 90; }
.sheet { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; border-radius: 32rpx 32rpx 0 0; max-height: 82vh; z-index: 95; display: flex; flex-direction: column; overflow: hidden; }
.sheet-head { display: flex; justify-content: space-between; align-items: center; padding: 28rpx 32rpx; border-bottom: 2rpx solid #e9d5ff; flex-shrink: 0; }
.sheet-title { font-size: 30rpx; font-weight: 800; color: #1e1b4b; }
.sheet-close { font-size: 30rpx; color: #6b7280; padding: 0 10rpx; }
/* flex:1 + min-height:0 允许被压缩，内容超高时 scroll-view 才能正常滚动；max-height 作为 flex 失效时的兑底约束 */
.sheet-body { flex: 1; min-height: 0; max-height: calc(82vh - 240rpx); box-sizing: border-box; padding: 24rpx 32rpx 40rpx; }
.fg { margin-bottom: 24rpx; }
.flabel { display: block; font-size: 23rpx; font-weight: 700; color: #6b7280; margin-bottom: 10rpx; }
.req { color: #ef4444; margin-left: 6rpx; }
.fin { width: 100%; padding: 0 24rpx; border: 2rpx solid #e9d5ff; border-radius: 16rpx; font-size: 27rpx; color: #1e1b4b; background: #f8fafc; box-sizing: border-box; }
.fin.area { min-height: 150rpx; }
.sheet-foot { display: flex; gap: 20rpx; padding: 20rpx 32rpx 40rpx; border-top: 2rpx solid #e9d5ff; flex-shrink: 0; }
.sbtn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 20rpx; font-size: 28rpx; font-weight: 800; }
.sbtn.cancel { background: #f1f5f9; color: #6b7280; }
.sbtn.save { background: linear-gradient(135deg,#31eee0,#9a9ad9); color: #fff; }

.dict-add { display: flex; align-items: center; gap: 12rpx; margin-top: 12rpx; }
.dict-btn { padding: 12rpx 24rpx; border-radius: 14rpx; font-size: 22rpx; font-weight: 700; background: #ede9fe; color: #6366f1; flex-shrink: 0; }
.dict-btn.ok { background: linear-gradient(135deg,#31eee0,#0d9488); color: #fff; }
.dict-input { flex: 1; }

/* 单人/双人归档切换 */
.pair-row { display: flex; gap: 16rpx; margin-bottom: 26rpx; }
.pair-opt { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 18rpx; font-size: 24rpx; font-weight: 700; color: #6b7280; background: #f1f5f9; border: 2rpx solid transparent; }
.pair-opt.active { background: #e0f2fe; border-color: #38bdf8; color: #0369a1; }
.pair-opt.double.active { background: linear-gradient(135deg,#ede9fe,#e0f2fe); border-color: #9a9ad9; color: #6366f1; }

/* 多选胶囊（存逗号串） */
.checks { display: flex; flex-wrap: wrap; gap: 14rpx; }
.check-opt { padding: 14rpx 30rpx; border-radius: 30rpx; font-size: 24rpx; font-weight: 700; color: #6b7280; background: #f1f5f9; border: 2rpx solid transparent; }
.check-opt.active { background: linear-gradient(135deg,#31eee0,#0d9488); color: #fff; }
</style>
