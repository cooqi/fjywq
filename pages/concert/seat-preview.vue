<template>
	<view class="roster-page">
		<!-- 加载骨架：微光扫过的表格残影 -->
		<view class="skeleton" v-if="loading">
			<view class="sk-banner"></view>
			<view class="sk-bar"></view>
			<view class="sk-grid">
				<view class="sk-row" v-for="i in 7" :key="i" :style="{animationDelay: (i * 90) + 'ms'}">
					<view class="sk-cell head"></view>
					<view class="sk-cell" v-for="j in 5" :key="j"></view>
				</view>
			</view>
			<text class="sk-text">名单载入中…</text>
		</view>

		<!-- 未开放 / 加载失败 -->
		<view class="state-box" v-else-if="!seatEnabled">
			<view class="state-doc">
				<view class="sd-line" v-for="i in 3" :key="i"></view>
			</view>
			<text class="state-text">{{emptyText}}</text>
			<button class="state-btn" @click="goSeatMap">返回选座图</button>
		</view>

		<block v-else>
			<!-- 场次横幅：靛紫渐变 + 表格网格暗纹 -->
			<view class="banner">
				<view class="bn-grid"></view>
				<view class="bn-glow"></view>
				<view class="bn-top">
					<view class="bn-titles">
						<text class="bn-title">{{concert.title || '未命名场次'}}</text>
						<text class="bn-sub" v-if="bnSub">{{bnSub}}</text>
					</view>
					<view class="bn-actions">
						<text class="bn-btn" :class="{busy: refreshing}" @click="refresh">刷新</text>
						<text class="bn-btn solid" @click="goSeatMap">选座图</text>
					</view>
				</view>
				<view class="bn-stats">
					<view class="stat">
						<text class="st-num">{{totalSelected}}</text>
						<text class="st-lab">已占座位</text>
					</view>
					<view class="stat">
						<text class="st-num">{{totalCapacity}}</text>
						<text class="st-lab">总座位</text>
					</view>
					<view class="stat">
						<text class="st-num mine">{{mineCount}}</text>
						<text class="st-lab">我的</text>
					</view>
					<view class="occ">
						<view class="occ-bar">
							<view class="occ-fill" :style="{width: occPercent + '%'}"></view>
						</view>
						<text class="occ-text">占用率 {{occPercent}}%</text>
					</view>
				</view>
			</view>

			<!-- 编辑栏：名称框 + fx + 选中单元格完整内容 -->
			<view class="fx-bar">
				<view class="fx-name" :class="{on: !!selected}">{{selRef || '—'}}</view>
				<text class="fx-icon">fx</text>
				<scroll-view class="fx-content" scroll-x :show-scrollbar="false">
					<text class="fx-text" :class="{ph: !selText}">{{selText || '点击单元格，这里显示完整昵称与备注'}}</text>
				</scroll-view>
			</view>

			<!-- 工具行：筛选 / 字号 / 复制名单 -->
			<view class="toolbar">
				<view class="tb-search" :class="{focused: searchFocused}">
					<view class="tb-icon"></view>
					<input
						class="tb-input"
						v-model="keyword"
						placeholder="筛选昵称 / 备注"
						placeholder-class="tb-ph"
						confirm-type="search"
						@focus="onSearchFocus"
						@blur="searchFocused = false"
					/>
					<text class="tb-hit" v-if="keyword.trim()">{{searchResults.length}}中</text>
					<text class="tb-clear" v-if="keyword" @click="clearSearch">×</text>
				</view>
				<view class="tb-font">
					<text class="tf-btn" :class="{off: fontScale <= 0.8}" @click="stepFont(-1)">A−</text>
					<text class="tf-val">{{Math.round(fontScale * 100)}}%</text>
					<text class="tf-btn" :class="{off: fontScale >= 1.4}" @click="stepFont(1)">A＋</text>
				</view>
				<text class="tb-copy" @click="copyRoster">复制名单</text>
			</view>
			<view class="toolbar2">
				<view class="legend">
					<view class="lg"><view class="dot taken" :style="{background: seatColorMap.taken}"></view><text>他人</text></view>
					<view class="lg"><view class="dot mine" :style="{background: seatColorMap.mine}"></view><text>我的</text></view>
					<view class="lg"><view class="dot hit"></view><text>命中</text></view>
				</view>
				<view class="tg-empty" :class="{on: showEmptyNo}" @click="showEmptyNo = !showEmptyNo">
					<view class="tg-track"><view class="tg-knob"></view></view>
					<text>空座编号</text>
				</view>
			</view>

			<!-- 工作表：行列冻结的 Excel 网格 -->
			<view class="sheet-wrap">
				<!-- 搜索结果面板：悬浮在表格上方，点「定位」切到对应分区并滚动居中 -->
				<view class="ss-panel" v-if="searchOpen && keyword.trim()">
					<view class="ssp-head">
						<text>匹配到 {{searchResults.length}} 个座位</text>
						<text class="ssp-close" @click="searchOpen = false">收起</text>
					</view>
					<scroll-view class="ssp-list" scroll-y :show-scrollbar="false" v-if="searchResults.length > 0">
						<view class="ssp-item" v-for="it in searchResults" :key="it.key" @click="locateResult(it)">
							<view class="ssp-dot" :style="{background: it.mine ? seatColorMap.mine : seatColorMap.taken}"></view>
							<view class="ssp-main">
								<view class="ssp-line1">
									<text class="ssp-label">{{it.label}}</text>
									<text class="ssp-state" :class="it.mine ? 'mine' : 'taken'">{{it.mine ? '我的' : '已占'}}</text>
								</view>
								<view class="ssp-line2">
									<text class="ssp-nick"><text v-for="(p, pi) in hitParts(it.nickname)" :key="'n' + pi" :class="{hit: p.hit}">{{p.t}}</text></text>
									<text class="ssp-remark" v-if="it.remark"><text v-for="(p, pi) in hitParts(it.remark)" :key="'r' + pi" :class="{hit: p.hit}">{{p.t}}</text></text>
									<text class="ssp-remark none" v-else>未留备注</text>
								</view>
							</view>
							<text class="ssp-go">定位</text>
						</view>
					</scroll-view>
					<view class="ssp-empty" v-else>
						<text>没有找到匹配的座位</text>
						<text class="ssp-empty-sub">试试其他昵称或备注关键词</text>
					</view>
				</view>
				<scroll-view
					class="sheet-scroll"
					scroll-x scroll-y
					:show-scrollbar="false"
					:scroll-left="scrollLeft"
					:scroll-top="scrollTop"
					scroll-with-animation
					@click="searchOpen = false"
				>
					<view class="sheet" :key="curAreaId" :style="{fontSize: cellFont + 'rpx'}">
						<view class="s-row s-head">
							<view class="s-cell s-corner">排＼号</view>
							<view class="s-cell s-colh" v-for="(cl, ci) in curCols" :key="'c' + ci">{{cl}}</view>
						</view>
						<view
							class="s-row"
							v-for="(rw, ri) in sheetRows"
							:key="'r' + ri"
							:style="{animationDelay: Math.min(ri * 28, 280) + 'ms'}"
						>
							<view class="s-cell s-rowh">{{rw.label}}</view>
							<view
								class="s-cell s-seat"
								v-for="c in rw.cells"
								:key="c.col"
								:id="'seat-cell-' + c.row + '-' + c.col"
								:class="seatClass(c)"
								:style="seatStyle(c)"
								@click="tapCell(c)"
							>
								<block v-if="c.occ">
									<text class="se-mine" v-if="c.occ.mine">我</text>
									<text class="se-main" :class="{only: c.remarkOnly}">{{c.main}}</text>
									<text class="se-sub" v-if="c.sub" :style="{fontSize: (cellFont - 4) + 'rpx'}">{{c.sub}}</text>
								</block>
								<text class="se-empty" v-else-if="showEmptyNo">{{c.label}}</text>
							</view>
						</view>
					</view>
				</scroll-view>
				<view class="sheet-empty" v-if="curArea && curArea.selected === 0">
					<text>本区暂无占座</text>
				</view>
				<view class="sheet-hint">
					<text>点击单元格看完整信息 · 再点一次可复制该条</text>
				</view>
			</view>

			<!-- 工作表标签：每个分区一张表 -->
			<view class="tabs">
				<scroll-view class="tabs-scroll" scroll-x :show-scrollbar="false">
					<view class="tabs-inner">
						<view
							class="tab"
							v-for="a in seatAreas"
							:key="a._id"
							:class="{active: a._id === curAreaId}"
							@click="switchArea(a._id)"
						>
							<view class="tab-dot" :style="{background: a.color}"></view>
							<text class="tab-name">{{a.name}}</text>
							<text class="tab-n">{{a.selected}}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</block>
	</view>
</template>

<script>
	// 座位状态默认配色（与选座页一致，管理员可在座位配置页覆盖）
	const DEFAULT_SEAT_COLORS = { avail: '#dfe4ea', selected: '#b39ddb', taken: '#80deea', mine: '#ffd54f' }

	// #RRGGBB → rgba，用于已占单元格的浅色底
	function hexToRgba(hex, alpha) {
		const m = /^#([0-9a-fA-F]{6})$/.exec(hex || '')
		if (!m) return 'rgba(128, 222, 234, ' + alpha + ')'
		const n = parseInt(m[1], 16)
		return 'rgba(' + (n >> 16) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alpha + ')'
	}

	export default {
		data() {
			return {
				loading: true,
				refreshing: false,
				concertId: '',
				userId: '',
				concert: {},
				areas: [],
				seats: [],
				seatColors: {},
				seatEnabled: false,
				emptyText: '本场次不开放选座',
				totalSelected: 0,
				totalCapacity: 0,
				curAreaId: '',
				// 选中单元格 {areaId,row,col}；编辑栏展示其完整信息
				selected: null,
				keyword: '',
				searchFocused: false,
				// 搜索结果面板开关（与选座页一致：有关键词即展开，点定位/表格即收起）
				searchOpen: false,
				// 表格滚动定位：scroll-view 受控偏移 + 定位脉冲高亮
				scrollLeft: 0,
				scrollTop: 0,
				locateKey: '',
				locTimer: null,
				locSeq: 0,
				lastLocate: null,
				fontScale: 1,
				showEmptyNo: true
			}
		},
		onLoad(options) {
			this.concertId = options.id || ''
			try {
				const userInfo = uni.getStorageSync('userInfo')
				const u = userInfo ? JSON.parse(userInfo) : {}
				this.userId = u._id || ''
			} catch (e) {}
			if (!this.concertId) {
				this.loading = false
				this.emptyText = '缺少演唱会ID'
				return
			}
			this.loadRoster()
		},
		// 横竖屏旋转（pageOrientation: auto）后视口尺寸变化，把上次定位的格子重新居中
		onResize() {
			if (!this.lastLocate) return
			const t = this.lastLocate
			this.$nextTick(() => { setTimeout(() => this.scrollToCell(t.row, t.col), 150) })
		},
		onShareAppMessage() {
			return {
				title: (this.concert.title || '演唱会') + ' · 座位名单',
				path: '/pages/concert/seat-preview?id=' + this.concertId
			}
		},
		computed: {
			bnSub() {
				const c = this.concert || {}
				return [c.venue, c.session, c.time].filter(v => !!v).join(' · ')
			},
			occPercent() {
				if (!this.totalCapacity) return 0
				return Math.min(100, Math.round(this.totalSelected * 100 / this.totalCapacity))
			},
			mineCount() {
				return this.seats.filter(s => s.mine).length
			},
			seatColorMap() {
				const sc = this.seatColors || {}
				const out = {}
				Object.keys(DEFAULT_SEAT_COLORS).forEach(k => {
					out[k] = /^#[0-9a-fA-F]{6}$/.test(String(sc[k] || '')) ? sc[k] : DEFAULT_SEAT_COLORS[k]
				})
				return out
			},
			// 占座索引：`${areaId}-${row}-${col}` → 记录
			occMap() {
				const map = {}
				this.seats.forEach(s => { map[`${s.areaId}-${s.row}-${s.col}`] = s })
				return map
			},
			// 非舞台分区 + 解析好的行列编号（自定义编号优先，回退默认规则）
			seatAreas() {
				return this.areas
					.filter(a => !a.isStage && a.rows > 0 && a.cols > 0)
					.map(a => Object.assign({}, a, {
						rowLabelList: Array.from({ length: a.rows }, (v, i) => this.rowLabelOf(a, i + 1)),
						colLabelList: Array.from({ length: a.cols }, (v, i) => this.colLabelOf(a, i + 1))
					}))
			},
			curArea() {
				return this.seatAreas.find(a => a._id === this.curAreaId) || this.seatAreas[0] || null
			},
			curCols() {
				return this.curArea ? this.curArea.colLabelList : []
			},
			cellFont() {
				return Math.round(22 * this.fontScale)
			},
			// 当前分区逐格预处理：展示文案按「微信用户→仅备注，否则昵称+备注」规则生成，
			// 筛选命中标记与淡出也在这里算好，模板只做渲染
			sheetRows() {
				const area = this.curArea
				if (!area) return []
				const kw = String(this.keyword || '').trim().toLowerCase()
				return area.rowLabelList.map((rl, ri) => ({
					label: rl,
					cells: area.colLabelList.map((cl, ci) => {
						const row = ri + 1
						const col = ci + 1
						const occ = this.occMap[`${area._id}-${row}-${col}`] || null
						let main = ''
						let sub = ''
						let remarkOnly = false
						let hit = false
						let dim = false
						if (occ) {
							const nick = String(occ.nickname || '').trim()
							remarkOnly = !nick || nick === '微信用户'
							main = remarkOnly ? (occ.remark || '未留备注') : nick
							sub = remarkOnly ? '' : (occ.remark || '')
							if (kw) {
								hit = nick.toLowerCase().indexOf(kw) >= 0 || String(occ.remark || '').toLowerCase().indexOf(kw) >= 0
								dim = !hit
							}
						} else if (kw) {
							dim = true
						}
						return { row, col, label: cl, occ, main, sub, remarkOnly, hit, dim }
					})
				}))
			},
			// 全场搜索：跨分区按昵称/备注匹配，结果按分区→排→号排序，供面板一键定位
			searchResults() {
				const kw = String(this.keyword || '').trim().toLowerCase()
				if (!kw) return []
				const out = []
				this.seatAreas.forEach(area => {
					this.seats.forEach(s => {
						if (s.areaId !== area._id) return
						const nickname = String(s.nickname || '').trim()
						const remark = String(s.remark || '')
						if (nickname.toLowerCase().indexOf(kw) < 0 && remark.toLowerCase().indexOf(kw) < 0) return
						out.push({
							key: `${s.areaId}-${s.row}-${s.col}`,
							areaId: s.areaId,
							row: s.row,
							col: s.col,
							nickname: nickname || '微信用户',
							remark,
							mine: !!s.mine,
							label: this.buildLabel(area, s.row, s.col)
						})
					})
				})
				return out
			},
			selRef() {
				const s = this.selected
				if (!s) return ''
				const area = this.seatAreas.find(a => a._id === s.areaId)
				if (!area) return ''
				return area.name + '!' + this.colLabelOf(area, s.col) + this.rowLabelOf(area, s.row)
			},
			selText() {
				const s = this.selected
				if (!s) return ''
				const area = this.seatAreas.find(a => a._id === s.areaId)
				if (!area) return ''
				const label = this.buildLabel(area, s.row, s.col)
				const occ = this.occMap[`${s.areaId}-${s.row}-${s.col}`]
				if (!occ) return label + ' · 空座'
				const nick = String(occ.nickname || '').trim()
				const remarkOnly = !nick || nick === '微信用户'
				const who = remarkOnly ? ('备注：' + (occ.remark || '未留备注')) : ('昵称：' + nick + (occ.remark ? '　备注：' + occ.remark : '　备注：未留'))
				return label + (occ.mine ? '（我的）' : '') + ' · ' + who
			}
		},
		watch: {
			// 切换分区后若选中格不在本区，清空编辑栏
			curAreaId() {
				if (this.selected && this.selected.areaId !== this.curAreaId) this.selected = null
			},
			// 有关键词就展开结果面板，清空即收起
			keyword(v) {
				this.searchOpen = !!String(v || '').trim()
			}
		},
		methods: {
			// ===== 编号规则：与选座页/云函数保持一致 =====
			rowLabelOf(area, row) {
				const arr = area.rowLabels || []
				const text = arr[row - 1] == null ? '' : String(arr[row - 1])
				if (text) return text
				if (Number(area.rowLabelType) === 2) {
					let n = row - 1
					let label = ''
					do {
						label = String.fromCharCode(65 + (n % 26)) + label
						n = Math.floor(n / 26) - 1
					} while (n >= 0)
					return label
				}
				return String(row)
			},
			colLabelOf(area, col) {
				const arr = area.colLabels || []
				const text = arr[col - 1] == null ? '' : String(arr[col - 1])
				return text || String(col)
			},
			buildLabel(area, row, col) {
				const r = this.rowLabelOf(area, row)
				const c = this.colLabelOf(area, col)
				const rText = /[排座]$/.test(r) ? r : `${r}排`
				const cText = /[号座]$/.test(c) ? c : `${c}号`
				return `${area.name} ${rText}${cText}`
			},

			// ===== 数据加载 =====
			loadRoster() {
				this.loading = true
				uniCloud.callFunction({
					name: 'seat-select',
					data: { action: 'getRoster', concertId: this.concertId, userId: this.userId },
					success: (res) => {
						this.loading = false
						if (res.result.code === 0) {
							this.applyData(res.result.data)
						} else {
							this.emptyText = res.result.message || '加载失败'
							uni.showToast({ title: this.emptyText, icon: 'none' })
						}
					},
					fail: (err) => {
						this.loading = false
						this.emptyText = '加载失败，请返回重试'
						console.error('加载座位名单失败', err)
					}
				})
			},
			applyData(d) {
				this.seatEnabled = !!d.seatEnabled
				if (!d.seatEnabled) {
					this.emptyText = '本场次不开放选座'
					return
				}
				this.concert = d.concert || {}
				this.areas = d.areas || []
				this.seats = d.seats || []
				this.seatColors = d.seatColors || {}
				this.totalSelected = Number(d.totalSelected) || 0
				this.totalCapacity = Number(d.totalCapacity) || 0
				// 保留当前分区（若仍存在），否则落到第一张表
				const ids = this.seatAreas.map(a => a._id)
				if (ids.indexOf(this.curAreaId) < 0) this.curAreaId = ids[0] || ''
				// 选中格若已失效（被释放）则清空
				if (this.selected && !this.occMap[`${this.selected.areaId}-${this.selected.row}-${this.selected.col}`]) {
					this.selected = null
				}
			},
			refresh() {
				if (this.refreshing) return
				this.refreshing = true
				uniCloud.callFunction({
					name: 'seat-select',
					data: { action: 'getRoster', concertId: this.concertId, userId: this.userId },
					success: (res) => {
						this.refreshing = false
						if (res.result.code === 0) {
							this.applyData(res.result.data)
							uni.showToast({ title: '已刷新最新名单', icon: 'none', duration: 1200 })
						} else {
							uni.showToast({ title: res.result.message || '刷新失败', icon: 'none' })
						}
					},
					fail: () => {
						this.refreshing = false
						uni.showToast({ title: '刷新失败，请稍后再试', icon: 'none' })
					}
				})
			},

			// ===== 表格交互 =====
			seatClass(c) {
				const cls = []
				if (c.occ) cls.push(c.occ.mine ? 'mine' : 'taken')
				if (c.hit) cls.push('hit')
				if (c.dim) cls.push('dim')
				if (this.locateKey === `${c.row}-${c.col}`) cls.push('locate')
				const s = this.selected
				if (s && this.curArea && s.areaId === this.curArea._id && s.row === c.row && s.col === c.col) cls.push('sel')
				return cls
			},
			seatStyle(c) {
				if (!c.occ) return {}
				const base = c.occ.mine ? this.seatColorMap.mine : this.seatColorMap.taken
				return { background: hexToRgba(base, c.occ.mine ? 0.32 : 0.24) }
			},
			tapCell(c) {
				if (!this.curArea) return
				const areaId = this.curArea._id
				const prev = this.selected
				// 再次点击已选中的占座格 → 弹完整信息，可一键复制该条
				if (prev && prev.areaId === areaId && prev.row === c.row && prev.col === c.col && c.occ) {
					this.showCellDetail(c)
					return
				}
				this.selected = { areaId, row: c.row, col: c.col }
			},
			showCellDetail(c) {
				const occ = c.occ
				const label = this.buildLabel(this.curArea, c.row, c.col)
				const nick = String(occ.nickname || '').trim() || '微信用户'
				const remark = occ.remark || '未留备注'
				const line = label + '：' + (nick === '微信用户' ? ('备注 ' + remark) : (nick + '（备注：' + remark + '）'))
				uni.showModal({
					title: label + (occ.mine ? '（我的）' : ''),
					content: '昵称：' + nick + '\n备注：' + remark + '\n状态：' + (occ.mine ? '我的座位' : '他人已占'),
					confirmText: '复制该条',
					cancelText: '关闭',
					success: (m) => {
						if (m.confirm) {
							uni.setClipboardData({
								data: line,
								success: () => uni.showToast({ title: '已复制该条信息', icon: 'none' })
							})
						}
					}
				})
			},
			switchArea(id) {
				if (this.curAreaId === id) return
				this.curAreaId = id
			},
			stepFont(d) {
				const next = Math.round((this.fontScale + d * 0.1) * 10) / 10
				this.fontScale = Math.min(1.4, Math.max(0.8, next))
			},

			// ===== 搜索定位（参考选座页：结果面板 → 切分区 → 滚动居中 → 脉冲高亮） =====
			onSearchFocus() {
				this.searchFocused = true
				if (String(this.keyword || '').trim()) this.searchOpen = true
			},
			clearSearch() {
				this.keyword = ''
				this.searchOpen = false
			},
			// 把文本按命中关键词切成片段，供结果列表高亮展示命中部分
			hitParts(text) {
				const t = String(text || '')
				const kw = String(this.keyword || '').trim().toLowerCase()
				if (!t) return [{ t: '', hit: false }]
				if (!kw) return [{ t, hit: false }]
				const parts = []
				const lower = t.toLowerCase()
				let i = 0
				let idx = lower.indexOf(kw)
				while (idx >= 0) {
					if (idx > i) parts.push({ t: t.slice(i, idx), hit: false })
					parts.push({ t: t.slice(idx, idx + kw.length), hit: true })
					i = idx + kw.length
					idx = lower.indexOf(kw, i)
				}
				if (i < t.length) parts.push({ t: t.slice(i), hit: false })
				return parts
			},
			// 点击搜索结果：收起面板，切到目标分区工作表，选中该格并滚动居中，脉冲高亮几秒
			locateResult(it) {
				this.searchOpen = false
				this.curAreaId = it.areaId
				this.selected = { areaId: it.areaId, row: it.row, col: it.col }
				this.lastLocate = { row: it.row, col: it.col }
				this.locateKey = `${it.row}-${it.col}`
				if (this.locTimer) clearTimeout(this.locTimer)
				this.locTimer = setTimeout(() => { this.locateKey = '' }, 2600)
				// 分区表按 curAreaId 重建，等渲染完再量位置
				this.$nextTick(() => { setTimeout(() => this.scrollToCell(it.row, it.col), 120) })
			},
			// 量目标格与视口的相对位置，算出让它居中所需的 scrollLeft/scrollTop
			scrollToCell(row, col) {
				const q = uni.createSelectorQuery().in(this)
				q.select('#seat-cell-' + row + '-' + col).boundingClientRect()
				q.select('.sheet-scroll').boundingClientRect()
				q.select('.sheet-scroll').scrollOffset()
				q.exec((res) => {
					const cell = res[0]
					const view = res[1]
					const off = res[2]
					if (!cell || !view || !off) return
					const left = Math.max(0, off.scrollLeft + (cell.left - view.left) - (view.width - cell.width) / 2)
					const top = Math.max(0, off.scrollTop + (cell.top - view.top) - (view.height - cell.height) / 2)
					// 受控值相同不会再次触发滚动，交替加 0.1px 微扰保证重复定位同一格也生效
					this.locSeq++
					const nudge = (this.locSeq % 2) * 0.1
					this.scrollLeft = left + nudge
					this.scrollTop = top + nudge
				})
			},

			// ===== 复制全场名单（按分区分组，座位号排序） =====
			copyRoster() {
				if (this.seats.length === 0) {
					uni.showToast({ title: '还没有人占座', icon: 'none' })
					return
				}
				const lines = []
				this.seatAreas.forEach(area => {
					const list = this.seats
						.filter(s => s.areaId === area._id)
						.sort((a, b) => (a.row - b.row) || (a.col - b.col))
					if (list.length === 0) return
					lines.push('【' + area.name + '】已占 ' + list.length + ' / ' + (area.rows * area.cols))
					list.forEach(s => {
						const nick = String(s.nickname || '').trim()
						const remark = s.remark || ''
						let who
						if (!nick || nick === '微信用户') {
							who = '备注：' + (remark || '未留备注')
						} else {
							who = nick + (remark ? '（备注：' + remark + '）' : '')
						}
						lines.push(this.buildLabel(area, s.row, s.col) + '：' + who + (s.mine ? '〔我〕' : ''))
					})
					lines.push('')
				})
				uni.setClipboardData({
					data: lines.join('\n').trim(),
					success: () => uni.showToast({ title: '全场名单已复制', icon: 'none' })
				})
			},

			goSeatMap() {
				const url = '/pages/concert/seat-select?id=' + this.concertId
				const pages = getCurrentPages()
				const prev = pages.length > 1 ? pages[pages.length - 2] : null
				if (prev && prev.route === 'pages/concert/seat-select') {
					uni.navigateBack()
				} else {
					uni.redirectTo({ url })
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
/* 配色：靛紫演出主色 + Excel 绿选中色 + 青/琥珀座位语义色 + 冷灰纸面中性色 */
$ink: #1e293b;
$paper: #eef0f4;
$line: #d8dce2;
$green: #21a366;
$green-deep: #107c41;
$violet: #5b21b6;
$red: #ef4444;

.roster-page {
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: $paper;
	overflow: hidden;
}

/* ===== 加载骨架 ===== */
.skeleton {
	flex: 1;
	padding: 24rpx;

	.sk-banner {
		height: 180rpx;
		border-radius: 20rpx;
		background: linear-gradient(135deg, #c7c9d9 0%, #b6b9cf 100%);
		position: relative;
		overflow: hidden;
	}
	.sk-bar {
		height: 64rpx;
		border-radius: 12rpx;
		background: #dcdfe6;
		margin: 20rpx 0;
	}
	.sk-grid {
		background: #fff;
		border-radius: 16rpx;
		padding: 16rpx;
	}
	.sk-row {
		display: flex;
		gap: 10rpx;
		margin-bottom: 10rpx;
		animation: skPulse 1.2s ease-in-out infinite alternate;
	}
	.sk-cell {
		flex: 1;
		height: 88rpx;
		border-radius: 8rpx;
		background: #eceef2;
		&.head { flex: none; width: 90rpx; background: #e2e5ea; }
	}
	.sk-text {
		display: block;
		text-align: center;
		margin-top: 28rpx;
		font-size: 24rpx;
		color: #94a3b8;
	}
}
@keyframes skPulse {
	from { opacity: 0.55; }
	to { opacity: 1; }
}

/* ===== 空态 ===== */
.state-box {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60rpx;

	.state-doc {
		width: 120rpx;
		height: 150rpx;
		border-radius: 12rpx;
		background: #fff;
		border: 2rpx solid $line;
		box-shadow: 0 12rpx 32rpx rgba(30, 41, 59, 0.08);
		padding: 26rpx 20rpx;
		box-sizing: border-box;
		margin-bottom: 32rpx;

		.sd-line {
			height: 10rpx;
			border-radius: 5rpx;
			background: #e2e8f0;
			margin-bottom: 16rpx;
			&:nth-child(2) { width: 70%; }
			&:nth-child(3) { width: 45%; }
		}
	}
	.state-text {
		font-size: 28rpx;
		color: #64748b;
		margin-bottom: 40rpx;
	}
	.state-btn {
		background: linear-gradient(135deg, #312e81 0%, $violet 100%);
		color: #fff;
		font-size: 28rpx;
		border-radius: 40rpx;
		padding: 0 60rpx;
		height: 76rpx;
		line-height: 76rpx;
		border: none;
	}
}

/* ===== 场次横幅 ===== */
.banner {
	position: relative;
	background: linear-gradient(135deg, #312e81 0%, $violet 55%, #7c3aed 100%);
	padding: 22rpx 28rpx 24rpx;
	overflow: hidden;
	flex-shrink: 0;

	/* 表格网格暗纹：呼应 Excel 主题 */
	.bn-grid {
		position: absolute;
		top: 0; right: 0; bottom: 0; left: 0;
		background-image:
			repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0 1rpx, transparent 1rpx 44rpx),
			repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 1rpx, transparent 1rpx 44rpx);
		pointer-events: none;
	}
	.bn-glow {
		position: absolute;
		width: 420rpx;
		height: 420rpx;
		right: -140rpx;
		top: -220rpx;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(167,139,250,0.5) 0%, rgba(167,139,250,0) 70%);
		pointer-events: none;
	}
	.bn-top {
		position: relative;
		display: flex;
		align-items: flex-start;
	}
	.bn-titles {
		flex: 1;
		min-width: 0;
	}
	.bn-title {
		display: block;
		font-size: 34rpx;
		font-weight: 700;
		color: #f5f3ff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.bn-sub {
		display: block;
		font-size: 22rpx;
		color: rgba(237, 233, 254, 0.85);
		margin-top: 6rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.bn-actions {
		flex-shrink: 0;
		display: flex;
		gap: 12rpx;
		margin-left: 16rpx;
	}
	.bn-btn {
		font-size: 22rpx;
		color: #ede9fe;
		background: rgba(255, 255, 255, 0.16);
		border: 1rpx solid rgba(255, 255, 255, 0.3);
		border-radius: 26rpx;
		padding: 8rpx 24rpx;
		transition: opacity 0.2s ease;

		&.solid {
			background: #fff;
			color: $violet;
			font-weight: 600;
			border-color: #fff;
		}
		&.busy { opacity: 0.5; }
		&:active { opacity: 0.7; }
	}
	.bn-stats {
		position: relative;
		display: flex;
		align-items: center;
		margin-top: 22rpx;
		gap: 36rpx;
	}
	.stat {
		display: flex;
		flex-direction: column;

		.st-num {
			font-size: 40rpx;
			font-weight: 700;
			color: #fff;
			line-height: 1.1;
			font-variant-numeric: tabular-nums;
			&.mine { color: #fcd34d; }
		}
		.st-lab {
			font-size: 20rpx;
			color: rgba(237, 233, 254, 0.8);
			margin-top: 4rpx;
		}
	}
	.occ {
		flex: 1;
		min-width: 0;
		margin-left: 8rpx;

		.occ-bar {
			height: 12rpx;
			border-radius: 6rpx;
			background: rgba(255, 255, 255, 0.2);
			overflow: hidden;
		}
		.occ-fill {
			height: 100%;
			border-radius: 6rpx;
			background: linear-gradient(90deg, #34d399 0%, #a7f3d0 100%);
			transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
		}
		.occ-text {
			display: block;
			font-size: 20rpx;
			color: rgba(237, 233, 254, 0.85);
			margin-top: 8rpx;
			text-align: right;
		}
	}
}

/* ===== 编辑栏（Excel 名称框 + fx） ===== */
.fx-bar {
	display: flex;
	align-items: center;
	background: #fff;
	border-bottom: 1rpx solid $line;
	padding: 10rpx 16rpx;
	flex-shrink: 0;

	.fx-name {
		flex-shrink: 0;
		max-width: 240rpx;
		height: 52rpx;
		line-height: 52rpx;
		padding: 0 16rpx;
		border: 1rpx solid $line;
		border-radius: 8rpx;
		font-size: 22rpx;
		color: #64748b;
		background: #f8fafc;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		box-sizing: border-box;

		&.on {
			color: $green-deep;
			border-color: $green;
			background: #f0fdf4;
			font-weight: 600;
		}
	}
	.fx-icon {
		flex-shrink: 0;
		font-size: 24rpx;
		font-style: italic;
		font-weight: 700;
		color: $green;
		padding: 0 16rpx;
	}
	.fx-content {
		flex: 1;
		min-width: 0;
		height: 52rpx;
		white-space: nowrap;
	}
	.fx-text {
		font-size: 24rpx;
		color: $ink;
		line-height: 52rpx;
		&.ph { color: #94a3b8; }
	}
}

/* ===== 工具行 ===== */
.toolbar {
	display: flex;
	align-items: center;
	gap: 12rpx;
	padding: 12rpx 16rpx 6rpx;
	flex-shrink: 0;

	.tb-search {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		height: 60rpx;
		background: #fff;
		border: 2rpx solid $line;
		border-radius: 30rpx;
		padding: 0 18rpx;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;

		&.focused {
			border-color: $green;
			box-shadow: 0 0 0 4rpx rgba(33, 163, 102, 0.12);
		}
	}
	.tb-icon {
		flex-shrink: 0;
		width: 20rpx;
		height: 20rpx;
		border: 3rpx solid #94a3b8;
		border-radius: 50%;
		position: relative;
		margin-right: 14rpx;

		&::after {
			content: '';
			position: absolute;
			right: -6rpx;
			bottom: -7rpx;
			width: 3rpx;
			height: 9rpx;
			background: #94a3b8;
			border-radius: 2rpx;
			transform: rotate(-45deg);
		}
	}
	.tb-input {
		flex: 1;
		min-width: 0;
		height: 60rpx;
		font-size: 24rpx;
		color: $ink;
	}
	.tb-ph { color: #94a3b8; font-size: 24rpx; }
	.tb-hit {
		flex-shrink: 0;
		font-size: 20rpx;
		color: $green-deep;
		background: #dcfce7;
		border-radius: 16rpx;
		padding: 2rpx 12rpx;
		margin-left: 8rpx;
	}
	.tb-clear {
		flex-shrink: 0;
		font-size: 32rpx;
		color: #94a3b8;
		padding: 0 4rpx 0 10rpx;
		line-height: 1;
	}
	.tb-font {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		background: #fff;
		border: 2rpx solid $line;
		border-radius: 30rpx;
		height: 60rpx;
		padding: 0 6rpx;

		.tf-btn {
			font-size: 24rpx;
			font-weight: 700;
			color: $violet;
			padding: 0 14rpx;
			line-height: 56rpx;
			&.off { color: #cbd5e1; }
			&:active { opacity: 0.6; }
		}
		.tf-val {
			font-size: 20rpx;
			color: #64748b;
			min-width: 64rpx;
			text-align: center;
			font-variant-numeric: tabular-nums;
		}
	}
	.tb-copy {
		flex-shrink: 0;
		height: 60rpx;
		line-height: 60rpx;
		font-size: 24rpx;
		font-weight: 600;
		color: #fff;
		background: linear-gradient(135deg, $green 0%, $green-deep 100%);
		border-radius: 30rpx;
		padding: 0 26rpx;
		box-shadow: 0 6rpx 16rpx rgba(16, 124, 65, 0.25);
		transition: transform 0.15s ease;
		&:active { transform: scale(0.95); }
	}
}
.toolbar2 {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6rpx 20rpx 10rpx;
	flex-shrink: 0;

	.legend {
		display: flex;
		align-items: center;
		gap: 20rpx;

		.lg {
			display: flex;
			align-items: center;
			font-size: 20rpx;
			color: #64748b;
		}
		.dot {
			width: 18rpx;
			height: 18rpx;
			border-radius: 4rpx;
			margin-right: 6rpx;
			&.hit { background: $red; }
		}
	}
	.tg-empty {
		display: flex;
		align-items: center;
		font-size: 20rpx;
		color: #64748b;

		.tg-track {
			width: 56rpx;
			height: 30rpx;
			border-radius: 15rpx;
			background: #cbd5e1;
			position: relative;
			margin-right: 10rpx;
			transition: background 0.2s ease;
		}
		.tg-knob {
			position: absolute;
			top: 3rpx;
			left: 3rpx;
			width: 24rpx;
			height: 24rpx;
			border-radius: 50%;
			background: #fff;
			box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.2);
			transition: transform 0.2s ease;
		}
		&.on {
			color: $green-deep;
			.tg-track { background: $green; }
			.tg-knob { transform: translateX(26rpx); }
		}
	}
}

/* ===== 工作表网格 ===== */
.sheet-wrap {
	flex: 1;
	min-height: 0;
	position: relative;
	margin: 0 16rpx;
	background: #fff;
	border: 1rpx solid $line;
	border-radius: 14rpx 14rpx 0 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}
.sheet-scroll {
	flex: 1;
	min-height: 0;
	width: 100%;
	white-space: nowrap;

	/* H5 滚动条沿用表格绿；小程序端 show-scrollbar=false 隐藏原生滚动条 */
	&::-webkit-scrollbar { width: 10rpx; height: 10rpx; }
	&::-webkit-scrollbar-track { background: #f1f5f9; }
	&::-webkit-scrollbar-thumb { background: #86c7a5; border-radius: 5rpx; }
	&::-webkit-scrollbar-thumb:hover { background: $green; }
	&::-webkit-scrollbar-corner { background: #f1f5f9; }
}
.sheet {
	display: inline-block;
	min-width: 100%;
	border-top: 1rpx solid $line;
	border-left: 1rpx solid $line;
}
.s-row {
	display: flex;
	animation: rowIn 0.32s ease both;
}
@keyframes rowIn {
	from { opacity: 0; transform: translateY(10rpx); }
	to { opacity: 1; transform: translateY(0); }
}
.s-cell {
	box-sizing: border-box;
	border-right: 1rpx solid $line;
	border-bottom: 1rpx solid $line;
	flex-shrink: 0;
}
.s-corner, .s-rowh {
	width: 96rpx;
	background: #f3f2f1;
	color: #64748b;
	font-size: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	text-align: center;
}
.s-corner {
	position: sticky;
	left: 0;
	top: 0;
	z-index: 30;
	height: 64rpx;
	font-size: 20rpx;
	color: #94a3b8;
	background: #e9e7e4;
}
.s-colh {
	position: sticky;
	top: 0;
	z-index: 20;
	width: 176rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f3f2f1;
	color: #475569;
	font-size: 22rpx;
	font-weight: 600;
}
.s-rowh {
	position: sticky;
	left: 0;
	z-index: 10;
	height: 116rpx;
	font-weight: 600;
}
.s-seat {
	position: relative;
	width: 176rpx;
	height: 116rpx;
	padding: 8rpx 10rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
	background: #fff;
	overflow: hidden;
	transition: opacity 0.25s ease, box-shadow 0.15s ease;

	.se-mine {
		position: absolute;
		top: 0;
		right: 0;
		font-size: 16rpx;
		line-height: 1;
		color: #fff;
		background: #f59e0b;
		padding: 4rpx 8rpx;
		border-radius: 0 0 0 10rpx;
		z-index: 2;
	}
	.se-main {
		display: block;
		font-weight: 600;
		color: $ink;
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;

		/* 微信用户：仅备注，用青蓝斜体区分“这是备注不是昵称” */
		&.only {
			color: #0e7490;
			font-style: italic;
			font-weight: 500;
		}
	}
	.se-sub {
		display: block;
		color: #64748b;
		line-height: 1.3;
		margin-top: 4rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.se-empty {
		color: #cbd5e1;
		font-size: 20rpx;
		text-align: center;
		width: 100%;
	}

	&.mine .se-main { color: #92400e; }
	&.mine .se-main.only { color: #0e7490; }
	&.dim { opacity: 0.28; }
	&.hit {
		box-shadow: inset 0 0 0 3rpx $red;
		opacity: 1;
	}
	/* Excel 式选中：绿框 + 右下角填充柄小方块 */
	&.sel {
		box-shadow: inset 0 0 0 4rpx $green;
		opacity: 1;
		z-index: 5;

		&::after {
			content: '';
			position: absolute;
			right: 0;
			bottom: 0;
			width: 12rpx;
			height: 12rpx;
			background: $green;
			border: 2rpx solid #fff;
			box-sizing: border-box;
		}
	}
	&.hit.sel { box-shadow: inset 0 0 0 4rpx $green, inset 0 0 0 7rpx rgba(239, 68, 68, 0.55); }
	/* 搜索定位：绿框→红框脉冲三次后自动消退 */
	&.locate {
		z-index: 6;
		animation: locatePulse 0.85s ease-in-out 3;
	}
	&:active { filter: brightness(0.96); }
}
@keyframes locatePulse {
	0%, 100% { box-shadow: inset 0 0 0 4rpx $green; }
	50% { box-shadow: inset 0 0 0 6rpx $red, 0 0 20rpx rgba(239, 68, 68, 0.55); }
}
.sheet-empty {
	position: absolute;
	top: 100rpx;
	left: 50%;
	transform: translateX(-50%);
	background: rgba(30, 41, 59, 0.78);
	color: #fff;
	font-size: 22rpx;
	border-radius: 26rpx;
	padding: 10rpx 30rpx;
	pointer-events: none;
	z-index: 40;
}
.sheet-hint {
	flex-shrink: 0;
	text-align: center;
	font-size: 20rpx;
	color: #94a3b8;
	background: #f8fafc;
	border-top: 1rpx solid $line;
	padding: 8rpx 0;
}

/* ===== 搜索结果面板（悬浮在表格上方，不挤占网格高度） ===== */
.ss-panel {
	position: absolute;
	top: 10rpx;
	left: 10rpx;
	right: 10rpx;
	max-height: 76%;
	display: flex;
	flex-direction: column;
	background: #fff;
	border: 1rpx solid $line;
	border-radius: 14rpx;
	box-shadow: 0 16rpx 48rpx rgba(30, 41, 59, 0.22);
	z-index: 60;
	overflow: hidden;
}
.ssp-head {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14rpx 20rpx;
	font-size: 22rpx;
	color: #64748b;
	background: #f8fafc;
	border-bottom: 1rpx solid $line;
}
.ssp-close {
	color: $green-deep;
	font-weight: 600;
	padding: 0 8rpx;
}
.ssp-list {
	flex: 1;
	min-height: 0;
	max-height: 480rpx;
}
.ssp-item {
	display: flex;
	align-items: center;
	padding: 14rpx 20rpx;
	border-bottom: 1rpx solid #eef1f5;
	&:active { background: #f0fdf4; }
}
.ssp-dot {
	flex-shrink: 0;
	width: 18rpx;
	height: 18rpx;
	border-radius: 4rpx;
	margin-right: 14rpx;
}
.ssp-main {
	flex: 1;
	min-width: 0;
}
.ssp-line1 {
	display: flex;
	align-items: center;
	gap: 10rpx;
}
.ssp-label {
	font-size: 24rpx;
	font-weight: 700;
	color: $ink;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ssp-state {
	flex-shrink: 0;
	font-size: 18rpx;
	line-height: 28rpx;
	padding: 0 10rpx;
	border-radius: 12rpx;
	&.mine { color: #92400e; background: #fef3c7; }
	&.taken { color: #0e7490; background: #cffafe; }
}
.ssp-line2 {
	display: flex;
	gap: 12rpx;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #475569;
	white-space: nowrap;
	overflow: hidden;

	.hit { color: $red; font-weight: 700; }
}
.ssp-nick {
	flex-shrink: 0;
	max-width: 45%;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ssp-remark {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	color: #64748b;
	&.none { color: #b6c2d2; }
}
.ssp-go {
	flex-shrink: 0;
	margin-left: 14rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #fff;
	background: linear-gradient(135deg, $green 0%, $green-deep 100%);
	border-radius: 22rpx;
	padding: 6rpx 22rpx;
	box-shadow: 0 4rpx 12rpx rgba(16, 124, 65, 0.25);
}
.ssp-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	padding: 40rpx 0;
	font-size: 24rpx;
	color: #64748b;
}
.ssp-empty-sub {
	font-size: 20rpx;
	color: #94a3b8;
}

/* ===== 工作表标签 ===== */
.tabs {
	flex-shrink: 0;
	background: #e4e7ec;
	border-top: 1rpx solid $line;
	padding: 10rpx 12rpx calc(10rpx + env(safe-area-inset-bottom));
}
.tabs-scroll {
	width: 100%;
	white-space: nowrap;

	&::-webkit-scrollbar { height: 6rpx; }
	&::-webkit-scrollbar-track { background: transparent; }
	&::-webkit-scrollbar-thumb { background: #b9c0ca; border-radius: 3rpx; }
}
.tabs-inner {
	display: inline-flex;
	align-items: flex-end;
	gap: 6rpx;
}
.tab {
	display: inline-flex;
	align-items: center;
	height: 64rpx;
	padding: 0 24rpx;
	border-radius: 12rpx 12rpx 0 0;
	background: #d6dae1;
	border: 1rpx solid #c6ccd4;
	border-bottom: none;
	color: #64748b;
	transition: background 0.2s ease, color 0.2s ease;

	.tab-dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		margin-right: 10rpx;
	}
	.tab-name {
		font-size: 24rpx;
		max-width: 200rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tab-n {
		font-size: 20rpx;
		margin-left: 10rpx;
		background: rgba(100, 116, 139, 0.15);
		border-radius: 14rpx;
		padding: 0 12rpx;
		line-height: 32rpx;
		font-variant-numeric: tabular-nums;
	}
	&.active {
		background: #fff;
		color: $green-deep;
		font-weight: 700;
		border-top: 5rpx solid $green;
		height: 70rpx;
		box-shadow: 0 -4rpx 12rpx rgba(16, 124, 65, 0.1);

		.tab-n { background: #dcfce7; color: $green-deep; }
	}
	&:active { opacity: 0.8; }
}

/* ===== 横屏（pageOrientation: auto）：rpx 随长边变大，改用 px 压缩头部/工具/标签，把高度留给表格 ===== */
@media (orientation: landscape) {
	.banner {
		padding: 8px 14px 10px;

		.bn-title { font-size: 16px; }
		.bn-sub { font-size: 11px; margin-top: 2px; }
		.bn-btn { font-size: 11px; padding: 3px 12px; border-radius: 13px; }
		.bn-stats { margin-top: 6px; gap: 18px; }
		.stat {
			.st-num { font-size: 18px; }
			.st-lab { font-size: 10px; margin-top: 1px; }
		}
		.occ {
			.occ-bar { height: 6px; border-radius: 3px; }
			.occ-text { font-size: 10px; margin-top: 2px; }
		}
	}
	.fx-bar {
		padding: 4px 8px;

		.fx-name { height: 26px; line-height: 24px; font-size: 11px; max-width: 130px; padding: 0 8px; }
		.fx-icon { font-size: 12px; padding: 0 8px; }
		.fx-content { height: 26px; }
		.fx-text { font-size: 12px; line-height: 26px; }
	}
	.toolbar {
		padding: 4px 8px 2px;
		gap: 6px;

		.tb-search { height: 30px; border-radius: 15px; padding: 0 10px; }
		.tb-icon { width: 10px; height: 10px; border-width: 2px; margin-right: 7px; }
		.tb-input { height: 30px; font-size: 12px; }
		.tb-hit { font-size: 10px; padding: 1px 6px; }
		.tb-clear { font-size: 16px; }
		.tb-font {
			height: 30px; border-radius: 15px;
			.tf-btn { font-size: 12px; line-height: 26px; padding: 0 7px; }
			.tf-val { font-size: 10px; min-width: 32px; }
		}
		.tb-copy { height: 30px; line-height: 30px; font-size: 12px; padding: 0 13px; border-radius: 15px; }
	}
	.toolbar2 {
		padding: 2px 10px 4px;

		.legend { gap: 10px; .lg { font-size: 10px; } .dot { width: 9px; height: 9px; margin-right: 3px; } }
		.tg-empty {
			font-size: 10px;
			.tg-track { width: 28px; height: 15px; margin-right: 5px; }
			.tg-knob { width: 12px; height: 12px; top: 1.5px; left: 1.5px; }
			&.on .tg-knob { transform: translateX(13px); }
		}
	}
	.sheet-wrap { margin: 0 8px; border-radius: 8px 8px 0 0; }
	.sheet { font-size: 11px !important; }
	.s-corner, .s-rowh { width: 48px; font-size: 11px; }
	.s-corner { height: 30px; font-size: 10px; }
	.s-colh { width: 88px; height: 30px; font-size: 11px; }
	.s-rowh { height: 56px; }
	.s-seat {
		width: 88px;
		height: 56px;
		padding: 4px 5px;

		.se-mine { font-size: 8px; padding: 2px 4px; }
		.se-sub { font-size: 9px !important; margin-top: 2px; }
		.se-empty { font-size: 10px; }
	}
	.sheet-hint { font-size: 10px; padding: 3px 0; }
	.ss-panel {
		top: 6px; left: 6px; right: 6px; border-radius: 8px;

		.ssp-head { padding: 5px 10px; font-size: 11px; }
		.ssp-list { max-height: 46vh; }
		.ssp-item { padding: 5px 10px; }
		.ssp-dot { width: 9px; height: 9px; margin-right: 7px; }
		.ssp-label { font-size: 12px; }
		.ssp-state { font-size: 9px; line-height: 14px; padding: 0 5px; }
		.ssp-line2 { font-size: 11px; margin-top: 1px; gap: 6px; }
		.ssp-go { font-size: 11px; padding: 2px 11px; margin-left: 7px; }
		.ssp-empty { padding: 16px 0; font-size: 12px; }
		.ssp-empty-sub { font-size: 10px; }
	}
	.tabs {
		padding: 4px 6px calc(4px + env(safe-area-inset-bottom));

		.tab {
			height: 30px; padding: 0 12px; border-radius: 6px 6px 0 0;
			.tab-dot { width: 7px; height: 7px; margin-right: 5px; }
			.tab-name { font-size: 12px; max-width: 110px; }
			.tab-n { font-size: 10px; line-height: 16px; padding: 0 6px; margin-left: 5px; }
			&.active { height: 33px; border-top-width: 3px; }
		}
	}
}
</style>