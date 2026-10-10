<template>
	<view class="seat-page" :style="{ paddingBottom: pagePad + 'px' }">
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading">
			<text>座位图加载中...</text>
		</view>

		<!-- 未登录/未开放 -->
		<view class="empty-box" v-else-if="!seatEnabled">
			<text class="empty-text">{{emptyText}}</text>
		</view>

		<block v-else>
			<!-- 演唱会信息（压缩成两行，高度优先留给座位画布） -->
			<view class="concert-info">
				<view class="ci-line">
					<text class="ci-title">{{concert.title || '未命名场次'}}</text>
					<text class="ci-badge" v-if="isAdmin">管理员</text>
				</view>
				<view class="ci-row" v-if="ciSub">{{ciSub}}</view>
			</view>

			<!-- 分区定位：总览 + 各分区（自动换行，不横向滚动） -->
			<view class="area-tab">
				<view class="tab-item" :class="{active: focusIndex === -1}" @click="focusOverview">
					<view class="tab-dot all"></view>
					<text class="tab-name">总览</text>
					<text class="tab-sel">已售{{totalSelected}}/{{totalCapacity}}</text>
				</view>
				<view
					class="tab-item"
					:class="{active: focusIndex === idx}"
					v-for="(area, idx) in areas"
					:key="area._id"
					@click="focusArea(idx)"
				>
					<view class="tab-dot" :style="{background: area.color}"></view>
					<text class="tab-name">{{area.name}}</text>
					<text class="tab-sel" v-if="!area.isStage">{{area.selected || 0}}/{{area.rows * area.cols}}</text>
					<text class="tab-sel" v-else>舞台</text>
					<text class="tab-price" v-if="!area.isStage">¥{{area.price}}</text>
				</view>
			</view>

			<!-- 实时统计 + 图例 + 缩放：合并为一行 -->
			<view class="stat-bar">
				<view class="legend">
					<view class="lg-item"><view class="lg-box avail" :style="{background: seatColorMap.avail}"></view><text>可选</text></view>
					<view class="lg-item"><view class="lg-box selected" :style="{background: seatColorMap.selected}"></view><text>预选</text></view>
					<view class="lg-item"><view class="lg-box taken" :style="{background: seatColorMap.taken}"></view><text>锁定</text></view>
					<view class="lg-item"><view class="lg-box mine" :style="{background: seatColorMap.mine}"></view><text>我的</text></view>
					
				</view>
				<view class="zoom-ctrl">
					<text class="zc-btn refresh" :class="{busy: refreshing}" @click="refreshSeatMap">刷新</text>
					<text class="zc-btn" @click="zoom(-0.25)">－</text>
					<text class="zc-scale">{{ Math.round(scale * 100) }}%</text>
					<text class="zc-btn" @click="zoom(0.25)">＋</text>
					<text class="zc-btn fit" @click="fitOverview">适应</text>
				</view>
			</view>

			<!-- 整场馆总览画布：座位固定按100%布局渲染，捏合缩放/拖拽平移只改外层 transform -->
			<view
				class="map-scroll"
				:style="{ height: mapH + 'px' }"
				:gs="gestureState"
				:change:gs="seatCanvas.sync"
				@touchstart="seatCanvas.start"
				@touchmove="seatCanvas.move"
				@touchend="seatCanvas.end"
				@touchcancel="seatCanvas.end"
			>
				<view class="map-canvas" :style="canvasStyle">
					<view
						class="area-block"
						:class="{ stage: area.isStage, active: focusIndex === area.index }"
						v-for="(area, ai) in layoutAreas"
						:key="area._id || ai"
						:style="areaStyle(area)"
						@click="onAreaTap(area.index)"
					>
						<!-- 分区标题（含本区已选统计）；缩到很小时退化为区块内水印 -->
						<view
							class="area-title"
							:class="{ 'no-axis': !area.showGutter }"
							v-if="!area.isStage"
							:style="{ height: area.showGutter ? area.titleH + 'rpx' : '100%', fontSize: titleFont + 'rpx' }"
						>
							<text class="at-name" :style="{ background: area.color }">{{area.name}}</text>
							<text class="at-sel">已售{{area.selected || 0}}/{{area.rows * area.cols}}</text>
						</view>

						<block v-if="!area.isStage">
							<!-- 列号 -->
							<view
								class="axis-tag col"
								v-for="(cl, ci) in area.colLabelList"
								:key="'c' + ci"
								:style="{ left: (area.gutLeft + ci * cell) + 'rpx', top: area.titleH + 'rpx', width: cell + 'rpx', height: area.axisH + 'rpx', fontSize: axisFont + 'rpx', lineHeight: area.axisH + 'rpx' }"
							>{{cl}}</view>
							<!-- 排号 -->
							<view
								class="axis-tag row"
								v-for="(rl, ri) in area.rowLabelList"
								:key="'r' + ri"
								:style="{ left: 0, top: (area.gutTop + ri * cell) + 'rpx', width: area.gutLeft + 'rpx', height: cell + 'rpx', fontSize: axisFont + 'rpx', lineHeight: cell + 'rpx' }"
							>{{rl}}</view>
							<!-- 座位 -->
							<view
								v-for="seat in area.seats"
								:key="seat.key"
								class="seat"
								:class="seat.state"
								:style="{left: seat.left + 'rpx', top: seat.top + 'rpx', width: seat.size + 'rpx', height: seat.size + 'rpx', fontSize: seat.font + 'rpx', lineHeight: seat.size + 'rpx', background: seatColorMap[seat.state], color: seatFg(seat.state)}"
								@click.stop="onSeatTap(seat)"
							></view>
							<!-- 座位备注（超过10字隐藏，点击可查看完整） -->
							<!-- <view
								v-for="seat in area.notes"
								:key="'n' + seat.key"
								class="seat-note"
								:class="seat.state"
								:style="{left: seat.left + 'rpx', top: (seat.top + seat.size + 2) + 'rpx', width: (cell * 3) + 'rpx', fontSize: noteFont + 'rpx', lineHeight: (noteFont + 6) + 'rpx'}"
								@click.stop="onSeatTap(seat)"
							>{{ shortNote(seat.note) }}</view> -->
						</block>
						<text class="stage-text" v-else :style="{fontSize: titleFont + 'rpx'}">{{area.name}}</text>
					</view>
				</view>
			</view>

			<!-- 底部选座车：每个座位单独填备注 -->
			<view class="cart">
				<view class="cart-list" v-if="selectedSeats.length > 0">
					<view class="cart-seat-row" v-for="s in selectedSeats" :key="s.key">
						<text class="cs-label">{{s.label}}</text>
						<input class="cs-remark" v-model="s.remark" maxlength="100" placeholder="备注（选填，公开展示在座位上）" />
						<text class="cs-del" @click="removeSeat(s)">×</text>
					</view>
				</view>
				<view class="cart-seat empty" v-if="selectedSeats.length === 0">还没有选座位，点击上方座位选座</view>

				<view class="cart-bottom">
					<view class="cart-sum">
						<text class="cs-count">已选 {{selectedSeats.length}}{{maxSeatsPerUser > 0 ? ' / ' + maxSeatsPerUser : ''}} 座</text>
						<text class="cs-amount">合计 ¥{{totalAmount}}</text>
					</view>
					<button class="cart-submit" :disabled="selectedSeats.length === 0 || submitting" @click="confirmSubmit">确认选座</button>
				</view>
			</view>
		</block>

		<!-- 座位操作菜单：微信小程序 showActionSheet 不支持 alertText 头部；用自带遮罩的固定弹层（避免 uni-popup 在本页 flex 容器内定位异常） -->
		<view class="seat-menu-mask" v-if="seatMenuInfo.open" @click="closeSeatMenu">
			<view class="seat-menu" @click.stop>
				<view class="sm-card">
					<view class="sm-head" v-if="seatMenuInfo.title">{{ seatMenuInfo.title }}</view>
					<view class="sm-item" v-for="(it, i) in seatMenuInfo.items" :key="i" @click="onSeatMenuTap(i)">{{ it }}</view>
				</view>
				<view class="sm-cancel" @click="closeSeatMenu">取消</view>
			</view>
		</view>
	</view>
</template>

<!-- 手势下沉到视图层：touchmove 全程 wxs 直接 setStyle，不走逻辑层 setData，拖动/捏合才能真跟手丝滑 -->
<script module="seatCanvas" lang="wxs" src="./seat-map-gesture.wxs"></script>

<script>
	// 画布尺寸基准（rpx）：1 格 = SEAT_BASE + GAP_BASE
	const SEAT_BASE = 24
	const GAP_BASE = 4
	const CELL_BASE = SEAT_BASE + GAP_BASE
	const CANVAS_PAD = 16
	const MIN_TAP_SCALE = 1 // 选座/取消选的最低缩放：小于 100% 座位太小，容易误触
	// 座位状态内置默认配色（管理员可在座位配置页覆盖，存 Concert.seat_colors）
	const DEFAULT_SEAT_COLORS = { avail: '#dfe4ea', selected: '#b39ddb', taken: '#80deea', mine: '#ffd54f' }
	const DEFAULT_SEAT_TEXT = { avail: '#37474f', selected: '#311b92', taken: '#006064', mine: '#6d4c41' }
	// 按背景感知亮度自动选前景色：深色底用白字，浅色底沿用同状态默认深色字
	function seatTextColor(bg, fallback) {
		const m = /^#([0-9a-fA-F]{6})$/.exec(bg || '')
		if (!m) return fallback
		const n = parseInt(m[1], 16)
		const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
		return lum < 0.5 ? '#ffffff' : fallback
	}

	export default {
		data() {
			return {
				loading: true,
				// 刷新中：只重拉占用状态，不整页重加载
				refreshing: false,
				submitting: false,
				concertId: '',
				userId: '',
				userNick: '',
				isAdmin: false,
				concert: {},
				areas: [],
				maxSeatsPerUser: 0,
				seatVersion: 1,
				seatEnabled: false,
				// 管理员配置的座位状态配色 {avail,selected,taken,mine}，空/非法值回退内置默认
				seatColors: {},
				totalSelected: 0,
				totalCapacity: 0,
				emptyText: '本场次不开放选座',
				// 占座/我的/选中，均以 `${areaId}-${row}-${col}` 为 key 的普通对象，保证 Vue3 响应式
				takenSet: {},
				mySeatSet: {},
				selectedSet: {},
				selectedSeats: [], // 选座车 [{areaId,row,col,label,price,key,remark}]，备注逐座独立
				// 缩放与平移：画布永远按 100% 布局，手势只改 scale/tx/ty 驱动容器 transform
				scale: 1,
				tx: 0,
				ty: 0,
				animOn: true,
				focusIndex: -1,
				lastTapKey: '',
				lastTapAt: 0,
				// 拖拽平移结束时刻（手势结束时由 wxs 回写），用于抑制拖拽后紧随的误触点击
				dragAt: 0,
				// 画布视口顶部位置（px），measureLayout 量得，捏合起始同步取锚点用
				vpTop: 0,
				viewW: 375,
				// 可用屏幕高度（px），用于计算画布高度
				winH: 660,
				// 画布可视区高度（px）与底部选座车高度（px），运行时量得
				mapH: 340,
				cartH: 0,
				// 自定义座位操作菜单：微信 showActionSheet 不支持 alertText 头部，改用自带遮罩的固定弹层
				seatMenuInfo: { open: false, title: '', items: [], seat: null, rec: null, action: '' },
			}
		},
		onShareAppMessage() {
			return {
				title: this.concert.name,
				path: '/pages/concert/seat-select?id=' + this.concertId,
				imageUrl: this.concert.coverUrl
			}
		},
		onShareTimeline() {
			return {
				title: this.concert.name || '演唱会选座'
			}
		},
		computed: {
			// 几何全部按 100% 基准渲染，缩放靠 transform 放大，不再逐帧重算座位节点
			cell() {
				return CELL_BASE
			},
			seatSize() {
				return SEAT_BASE
			},
			axisFont() {
				return 14
			},
			titleFont() {
				return 18
			},
			noteFont() {
				return 14
			},
			showAxis() {
				return true
			},
			// 顶部分两行预留：区名 + 列号
			titleH() {
				return this.titleFont + 4
			},
			axisH() {
				return this.axisFont + 2
			},
			gutLeft() {
				return 34
			},
			gutTop() {
				return this.titleH + this.axisH
			},
			// 画布格数（由所有分区包围盒得出）
			canvasGrid() {
				let w = 0
				let h = 0
				this.areas.forEach(a => {
					const cw = a.isStage ? (Number(a.stageW) || 0) : (Number(a.cols) || 0)
					const ch = a.isStage ? (Number(a.stageH) || 0) : (Number(a.rows) || 0)
					w = Math.max(w, (Number(a.gridX) || 0) + cw)
					h = Math.max(h, (Number(a.gridY) || 0) + ch)
				})
				return { w: w || 1, h: h || 1 }
			},
			canvasPx() {
				return {
					w: CANVAS_PAD * 2 + this.canvasGrid.w * this.cell + this.gutLeft,
					h: CANVAS_PAD * 2 + this.canvasGrid.h * this.cell + this.gutTop
				}
			},
			// 管理员配色覆盖内置默认；仅接受合法 #RRGGBB，其余回退默认
			seatColorMap() {
				const sc = this.seatColors || {}
				const out = {}
				Object.keys(DEFAULT_SEAT_COLORS).forEach(k => {
					out[k] = /^#[0-9a-fA-F]{6}$/.test(String(sc[k] || '')) ? sc[k] : DEFAULT_SEAT_COLORS[k]
				})
				return out
			},
			// 推给 wxs 的视图状态：缩放/平移（rpx）+ 视口与画布尺寸 + 过渡开关；每次逻辑层变更后 change:gs 触发同步
			gestureState() {
				return {
					s: this.scale,
					tx: this.tx,
					ty: this.ty,
					cw: this.canvasPx.w,
					ch: this.canvasPx.h,
					vpW: 750,
					vpH: this.viewHRpx(),
					k: 750 / (this.viewW || 375), // 事件坐标 px → rpx 换算系数
					vpTop: this.vpTop,
					min: 0.4,
					max: 2.4,
					tr: this.animOn ? 'transform 0.2s ease' : 'none'
				}
			},
			// 整块画布仅此一个动态样式：程序化定位时由逻辑层改这一条 transform，走 GPU 合成；手势期间由 wxs 在视图层覆写
			canvasStyle() {
				const st = {
					width: this.canvasPx.w + 'rpx',
					height: this.canvasPx.h + 'rpx',
					transform: 'translate3d(' + this.tx + 'rpx, ' + this.ty + 'rpx, 0) scale(' + this.scale + ')'
				}
				if (this.animOn) st.transition = 'transform 0.2s ease'
				return st
			},
			// 预处理成画布上的绝对定位分区，座位在分区容器内相对定位
			layoutAreas() {
				const cell = this.cell
				const size = this.seatSize
				const showLabel = this.showAxis
				const font = 13
				const gutLeft = this.gutLeft
				const gutTop = this.gutTop
				const titleH = this.titleH
				const axisH = this.axisH
				return this.areas.map((area, index) => {
					const isStage = !!area.isStage
					const rows = Number(area.rows) || 0
					const cols = Number(area.cols) || 0
					const block = {
						index,
						_id: area._id,
						name: area.name,
						color: area.color,
						price: area.price,
						isStage,
						rows,
						cols,
						selected: area.selected || 0,
						showGutter: showLabel,
						gutLeft,
						gutTop,
						titleH,
						axisH,
						left: CANVAS_PAD + (Number(area.gridX) || 0) * cell,
						top: CANVAS_PAD + (Number(area.gridY) || 0) * cell,
						width: isStage ? (Number(area.stageW) || 0) * cell - GAP_BASE : gutLeft + cols * cell,
						height: isStage ? (Number(area.stageH) || 0) * cell - GAP_BASE : gutTop + rows * cell,
						rowLabelList: [],
						colLabelList: [],
						seats: [],
						notes: []
					}
					if (isStage) return block

					block.rowLabelList = Array.from({ length: rows }, (v, i) => this.rowLabelOf(area, i + 1))
					block.colLabelList = Array.from({ length: cols }, (v, i) => this.colLabelOf(area, i + 1))

					const seats = []
					for (let r = 1; r <= rows; r++) {
						for (let c = 1; c <= cols; c++) {
							const key = `${area._id}-${r}-${c}`
							const mine = this.mySeatSet[key]
							const taken = this.takenSet[key]
							let state = 'avail'
							let note = ''
							if (mine) {
								state = 'mine'
								note = mine.remark || ''
							} else if (taken) {
								state = 'taken'
								note = taken.remark || ''
							} else if (this.selectedSet[key]) {
								state = 'selected'
							}
							const seat = {
								key,
								areaId: area._id,
								row: r,
								col: c,
								state,
								note,
								price: area.price,
								label: this.buildLabel(area, r, c),
								left: gutLeft + (c - 1) * cell,
								top: gutTop + (r - 1) * cell,
								size: size,
								font,
								// 只有可选座位显示编号，状态座位用颜色区分
								text: state === 'avail' && showLabel ? block.colLabelList[c - 1] : ''
							}
							seats.push(seat)
							if (note && showLabel) block.notes.push(seat)
						}
					}
					block.seats = seats
					return block
				})
			},
			// 顶部信息压缩成单行：场馆 · 场次 · 时间
			ciSub() {
				const c = this.concert || {}
				return [c.venue, c.session, c.time].filter(v => !!v).join(' · ')
			},
			totalAmount() {
				return this.selectedSeats.reduce((sum, s) => sum + (Number(s.price) || 0), 0).toFixed(2)
			},
			selectedCount() {
				return this.selectedSeats.length
			},
			// 底部选座车是 fixed 悬浮的，用 padding 把页面抬高，避开遮住座位
			pagePad() {
				return this.cartH > 0 ? this.cartH + 12 : 110
			}
		},
		// 选座车高度随已选数量变化，重新量一次布局
		watch: {
			selectedCount() {
				this.$nextTick(() => this.measureLayout())
			}
		},
		onReady() {
			this.measureLayout()
		},
		onLoad(options) {
			this.concertId = options.id || ''
			try {
				const userInfo = uni.getStorageSync('userInfo')
				const u = userInfo ? JSON.parse(userInfo) : {}
				this.userId = u._id || ''
				this.userNick = u.nickName || ''
			} catch (e) {
				
			}
			try {
				const sys = uni.getSystemInfoSync()
				this.viewW = sys.windowWidth
				this.winH = Number(sys.windowHeight) || this.winH
				// 先用经验值占位（顶部信息约 150px + 选座车约 190px），onReady 量到真实高度后校正
				this.mapH = Math.max(240, this.winH - 340)
			} catch (e) {
				// error
			}
			if (!this.concertId) {
				this.loading = false
				uni.showToast({ title: '缺少演唱会ID', icon: 'none' })
				return
			}
			// 必须登录后才能选座
			if (!this.userId) {
				this.loading = false
				this.emptyText = '请先登录后再选座'
				this.requireLogin()
				return
			}
			this.loadSeatMap()
		},
		methods: {
			// 座位前景色：根据生效背景亮度自动选白/深色，保证自定义配色下编号仍可读
			seatFg(state) {
				return seatTextColor(this.seatColorMap[state], DEFAULT_SEAT_TEXT[state] || '#37474f')
			},
			// ===== 编号展示：优先用分区自定义编号数组 =====
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

			areaStyle(area) {
				return {
					left: area.left + 'rpx',
					top: area.top + 'rpx',
					width: area.width + 'rpx',
					height: area.height + 'rpx',
					borderColor: area.color,
					background: area.isStage ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : 'transparent'
				}
			},

			// ===== 缩放与平移 =====
			zoom(delta) {
				const next = Math.round((this.scale + delta) * 100) / 100
				const s = Math.min(Math.max(next, 0.4), 2.4)
				if (s === this.scale) return
				this.animOn = true
				// 以视口中心为锚点，缩放后画面不会“跑偏”
				this.zoomTo(s, 375, this.viewHRpx() / 2)
			},

			// 缩放到 s，并保持视口 (vx, vy) 下方的画布点不动
			zoomTo(s, vx, vy) {
				const ax = (vx - this.tx) / this.scale
				const ay = (vy - this.ty) / this.scale
				this.scale = s
				this.tx = vx - ax * s
				this.ty = vy - ay * s
				this.clampView()
			},

			// 平移夹紧：不允许把画布边缘拖出视口留白；内容比视口小时贴回左上
			clampView() {
				const vpW = 750
				const vpH = this.viewHRpx()
				const cw = this.canvasPx.w * this.scale
				const ch = this.canvasPx.h * this.scale
				this.tx = cw <= vpW ? 0 : Math.min(0, Math.max(vpW - cw, this.tx))
				this.ty = ch <= vpH ? 0 : Math.min(0, Math.max(vpH - ch, this.ty))
			},

			// 让整个场馆可见（画布按 100% 尺寸布局，缩放只改 scale：可视区宽度固定 750rpx）
			fitOverview() {
				this.focusIndex = -1
				this.animOn = true
				const s = Math.min(750 / this.canvasPx.w, this.viewHRpx() / this.canvasPx.h, 2.4)
				this.scale = Math.round(Math.max(s, 0.4) * 100) / 100
				this.tx = 0
				this.ty = 0
				this.clampView()
			},

			focusOverview() {
				this.fitOverview()
			},

			// ===== 手势已下沉到 seat-map-gesture.wxs（视图层零 setData 跟手），这里只接收结束回写 =====
			// wxs 全程按 rpx 坐标系连续计算，与逻辑层 tx/ty/scale 同一套值，回写后按钮缩放/双击定位从此视角续算
			onGestureEnd(d) {
				if (!d) return
				this.scale = d.s
				this.tx = d.tx
				this.ty = d.ty
				if (d.moved) this.dragAt = Date.now()
			},

			// 拖拽手势刚结束时抑制紧随的 click，避免选座页误选/误切区
			justDragged() {
				return Date.now() - this.dragAt < 300
			},

			// 总览下单击分区区块选中，双击则进入并放大该区（座位自己的点击已 stop 冒泡）
			onAreaTap(idx) {
				if (this.justDragged()) return
				const now = Date.now()
				const key = 'area-' + idx
				if (this.lastTapKey === key && now - this.lastTapAt < 350) {
					this.lastTapKey = ''
					this.lastTapAt = 0
					this.focusArea(idx)
					return
				}
				this.lastTapKey = key
				this.lastTapAt = now
			},

			// 切到某个分区：默认放大到能看清座位，并把该区居中
			focusArea(idx, minScale) {
				const area = this.areas[idx]
				if (!area) return
				this.focusIndex = idx
				// 预留左侧排号轴与顶部区名/列号占的格数
				const cols = area.isStage ? (Number(area.stageW) || 1) : ((Number(area.cols) || 1) + 1.5)
				const rows = area.isStage ? (Number(area.stageH) || 1) : ((Number(area.rows) || 1) + 2.5)
				const fitW = 750 / (cols * CELL_BASE)
				const fitH = this.viewHRpx() / (rows * CELL_BASE)
				const fit = Math.min(fitW, fitH)
				// 100% 能装下就放大到 100%–200%；装不下就整区适配，但不低于 minScale（默认 0.8，再小字就看不清了）
				const floor = Number(minScale) > 0 ? Number(minScale) : 0.8
				const s = fit < 1 ? Math.max(fit, floor) : Math.min(fit, 2)
				this.scale = Math.round(s * 100) / 100
				this.centerArea(idx)
			},

			// 把指定分区放到视口中央（画布按 100% 布局，直接由分区中心反解平移量）
			centerArea(idx) {
				const b = this.layoutAreas[idx]
				if (!b) return
				this.animOn = true
				const s = this.scale
				this.tx = 375 - (b.left + b.width / 2) * s
				this.ty = this.viewHRpx() / 2 - (b.top + b.height / 2) * s
				this.clampView()
			},

			viewHRpx() {
				if (!this.viewW) return this.mapH
				return Math.round(this.mapH * 750 / this.viewW)
			},

			// 把画布坐标 (xRpx, yRpx) 移到视口中央，并夹紧到可平移范围
			centerPoint(xRpx, yRpx) {
				this.animOn = true
				this.tx = 375 - xRpx * this.scale
				this.ty = this.viewHRpx() / 2 - yRpx * this.scale
				this.clampView()
			},

			// 底部选座车是 fixed 的会盖住画布下沿：量它的高度，把画布高度刚好填满剩余屏幕
			measureLayout(after) {
				const q = uni.createSelectorQuery().in(this)
				q.select('.cart').boundingClientRect()
				q.select('.map-scroll').boundingClientRect()
				q.exec(res => {
					const cart = (res && res[0]) || null
					const map = (res && res[1]) || null
					if (!cart || !map) {
						if (typeof after === 'function') this.$nextTick(after)
						return
					}
					let winH = this.winH
					try {
						winH = uni.getSystemInfoSync().windowHeight || winH
					} catch (e) {}
					this.cartH = Math.round(cart.height || 0)
					// 缓存视口顶部，捏合起始时同步取锚点，不再异步查询
					this.vpTop = Math.round(map.top || 0)
					// 再减掉 pagePad 的 12px 安全边距，让整页恰好一屏不需滚动
					const h = Math.round(winH - this.cartH - (this.cartH > 0 ? 12 : 110) - (map.top || 0))
					// 量不到合理值时保底 200px，高度差小于 4px 不反复改，避免震荡
					if (h >= 200 && Math.abs(h - this.mapH) > 4) this.mapH = h
					if (typeof after === 'function') this.$nextTick(after)
				})
			},

			switchArea(idx) {
				this.focusArea(idx)
			},

			// 首次进页用 toast 告知缩放手势，避免多占一行顶部空间
			showMapHint() {
				try {
					if (uni.getStorageSync('seatMapHintShown')) return
					uni.setStorageSync('seatMapHintShown', 1)
				} catch (e) {
					return
				}
				uni.showToast({ title: '双指捏合缩放，双击分区放大', icon: 'none', duration: 2200 })
			},

			// ===== 座位图加载 =====
			loadSeatMap() {
				this.loading = true
				uniCloud.callFunction({
					name: 'seat-select',
					data: { action: 'getSeatMap', concertId: this.concertId, userId: this.userId },
					success: (res) => {
						this.loading = false
						if (res.result.code === 0) {
							const d = res.result.data
							this.seatEnabled = !!d.seatEnabled
							if (!d.seatEnabled) {
								// 未开放/已关闭：展示明确空态，页面不渲染座位图与选座车
								this.emptyText = res.result.message || '本场次不开放选座'
								return
							}
							this.concert = d.concert || {}
							this.areas = d.areas || []
							this.maxSeatsPerUser = Number(d.maxSeatsPerUser) || 0
							this.seatVersion = Number(d.seatVersion) || 1
							this.seatColors = d.seatColors || {}
							this.isAdmin = !!d.isAdmin
							this.focusIndex = -1

							const taken = {}
							;(d.taken || []).forEach(s => { taken[`${s.areaId}-${s.row}-${s.col}`] = { remark: s.remark || '', nickname: s.nickname || '' } })
							this.takenSet = taken

							const mine = {}
							;(d.mySeats || []).forEach(s => { mine[`${s.areaId}-${s.row}-${s.col}`] = { remark: s.remark || '' } })
							this.mySeatSet = mine

							this.totalSelected = Number(d.totalSelected) || 0
							this.totalCapacity = Number(d.totalCapacity) || this.areas.reduce((sum, a) => sum + (a.isStage ? 0 : (a.rows || 0) * (a.cols || 0)), 0)

							// 我的座位已从可选池剔除，清空与之冲突的暂存
							this.selectedSet = {}
							this.selectedSeats = []
							// 先量好布局再适配缩放，否则 fitOverview 会按旧高度算
							this.$nextTick(() => this.measureLayout(() => this.fitOverview()))
							// 操作提示只重进页面首次弹一次，不占用顶部高度
							this.showMapHint()
						} else {
							uni.showToast({ title: res.result.message || '加载失败', icon: 'none' })
						}
					},
					fail: (err) => {
						this.loading = false
						console.error('加载座位图失败', err)
						uni.showToast({ title: '加载失败', icon: 'none' })
					}
				})
			},

			// 手动刷新：重拉占用/我的座位/统计/配色，保留当前缩放视角与选座车；车内失效座位自动剔除
			refreshSeatMap() {
				if (this.refreshing) return
				this.refreshing = true
				uni.showLoading({ title: '刷新中', mask: true })
				uniCloud.callFunction({
					name: 'seat-select',
					data: { action: 'getSeatMap', concertId: this.concertId, userId: this.userId },
					success: (res) => {
						this.refreshing = false
						uni.hideLoading()
						if (res.result.code !== 0) {
							uni.showToast({ title: res.result.message || '刷新失败', icon: 'none' })
							return
						}
						const d = res.result.data
						if (!d.seatEnabled) {
							this.seatEnabled = false
							this.emptyText = '本场次不开放选座'
							return
						}
						// 结构性改版：格子坐标已不可信，退回整页重载（重置视图与选座车）
						if ((Number(d.seatVersion) || 1) !== this.seatVersion) {
							uni.showToast({ title: '座位表已更新，重新载入', icon: 'none' })
							this.loadSeatMap()
							return
						}
						this.concert = d.concert || this.concert
						this.areas = d.areas || []
						this.maxSeatsPerUser = Number(d.maxSeatsPerUser) || 0
						this.seatColors = d.seatColors || {}
						this.isAdmin = !!d.isAdmin

						const taken = {}
						;(d.taken || []).forEach(s => { taken[`${s.areaId}-${s.row}-${s.col}`] = { remark: s.remark || '', nickname: s.nickname || '' } })
						this.takenSet = taken

						const mine = {}
						;(d.mySeats || []).forEach(s => { mine[`${s.areaId}-${s.row}-${s.col}`] = { remark: s.remark || '' } })
						this.mySeatSet = mine

						this.totalSelected = Number(d.totalSelected) || 0
						this.totalCapacity = Number(d.totalCapacity) || this.areas.reduce((sum, a) => sum + (a.isStage ? 0 : (a.rows || 0) * (a.cols || 0)), 0)

						// 选座车清洗：已是“我的”（如其它端已下单）静默出车；被他人抢占则移除并提醒
						const lost = []
						const kept = this.selectedSeats.filter(s => {
							if (mine[s.key]) return false
							if (taken[s.key]) { lost.push(s.label); return false }
							return true
						})
						const nextSet = {}
						kept.forEach(s => { nextSet[s.key] = true })
						this.selectedSet = nextSet
						this.selectedSeats = kept

						uni.showToast({
							title: lost.length > 0 ? `已刷新，${lost.join('、')} 被抢占移出选座车` : '已刷新最新座位状态',
							icon: 'none',
							duration: lost.length > 0 ? 3000 : 1500
						})
					},
					fail: (err) => {
						this.refreshing = false
						uni.hideLoading()
						console.error('刷新座位图失败', err)
						uni.showToast({ title: '刷新失败，请稍后再试', icon: 'none' })
					}
				})
			},

			// ===== 登录引导：复用项目统一的 getUserProfile + code2Session 流程 =====
			requireLogin() {
				uni.showModal({
					title: '需要登录',
					content: '选座需登录后进行，现在登录吗？',
					confirmText: '立即登录',
					cancelText: '暂不',
					success: (m) => {
						if (m.confirm) this.getUserInfo()
						else uni.navigateBack()
					}
				})
			},
			getUserInfo() {
				uni.getUserProfile({
					desc: '用于完善会员资料',
					success: (result) => {
						this.wxLogin(result.userInfo)
					},
					fail: () => {
						uni.showModal({
							content: '暂未登录，登录后才能选座',
							showCancel: false,
							success: () => uni.navigateBack()
						})
					}
				})
			},
			wxLogin(profile) {
				uni.showLoading({ title: '登录中' })
				uni.login({
					provider: 'weixin',
					success: (res) => {
						if (!res.code) {
							uni.hideLoading()
							return
						}
						uniCloud.callFunction({
							name: 'user',
							data: {
								action: 'code2Session',
								js_code: res.code,
								user_info: profile
							},
							success: (r) => {
								uni.hideLoading()
								const u = r.result && r.result.result && r.result.result.result
								if (u && u._id) {
									uni.setStorageSync('userInfo', JSON.stringify(u))
									this.userId = u._id
									this.userNick = u.nickName || ''
									this.loadSeatMap()
								} else {
									uni.showModal({
										content: '登录失败，请重试',
										showCancel: false,
										success: () => uni.navigateBack()
									})
								}
							},
							fail: () => {
								uni.hideLoading()
								uni.showModal({ content: '登录失败，请重试', showCancel: false, success: () => uni.navigateBack() })
							}
						})
					},
					fail: () => {
						uni.hideLoading()
						uni.navigateBack()
					}
				})
			},

			// ===== 选座交互 =====
			// 选座门槛：必须放大到 100% 以上才能增删座位，避免小格子误触
			ensureReadableForTap(seat) {
				if (this.scale >= MIN_TAP_SCALE) return true
				const idx = this.areas.findIndex(a => a._id === seat.areaId)
				if (idx >= 0) this.focusArea(idx, MIN_TAP_SCALE)
				else {
					this.scale = MIN_TAP_SCALE
					this.clampView()
				}
				// 放大后把被点的座位挪到视线中央，方便再点一次
				const area = this.areas[idx] || {}
				const x = CANVAS_PAD + (Number(area.gridX) || 0) * CELL_BASE + this.gutLeft + (seat.col - 1) * CELL_BASE + CELL_BASE / 2
				const y = CANVAS_PAD + (Number(area.gridY) || 0) * CELL_BASE + this.gutTop + (seat.row - 1) * CELL_BASE + CELL_BASE / 2
				this.centerPoint(x, y)
				uni.showToast({ title: '已放大至 100%，请再点一次该座位', icon: 'none' })
				return false
			},

			onSeatTap(seat) {
				// 拖拽/捏合手势刚结束的紧随 click 一律忽略，防误选
				if (this.justDragged()) return
				// 只有可选座位是无确认弹窗直接写入选座车的，先检查缩放够不够
				if (seat.state === 'avail' && !this.ensureReadableForTap(seat)) return
				if (seat.state === 'mine') {
					// 自己的座位：菜单顶部直接展示当前备注，可修改或释放后重选
					const rec = this.mySeatSet[seat.key] || {}
					this.openSeatMenu({
						action: 'mine',
						seat: seat,
						title: seat.label + ' 备注：' + (this.clipText(rec.remark) || '无'),
						items: ['修改备注', '释放座位']
					})
					return
				}
				if (seat.state === 'taken') {
					// 备注超过 10 字已在座位上隐藏，点击弹窗看完整内容
					const rec = this.takenSet[seat.key] || {}
					if (this.isAdmin) {
						// 管理员可改任何人备注、释放任何人的座位；菜单顶部展示占座人与备注摘要
						const who = rec.nickname ? '占座人：' + this.clipText(rec.nickname) + '，' : ''
						this.openSeatMenu({
							action: 'admin',
							seat: seat,
							rec: rec,
							title: seat.label + ' ' + who + '备注：' + (this.clipText(rec.remark) || '无'),
							items: ['修改备注', '释放座位']
						})
						return
					}
					uni.showModal({
						title: seat.label,
						content: (rec.remark ? '备注：' + rec.remark + '\n' : '占座人未留备注\n') + '该座位已被他人选择，如需沟通可截图发到群聊。',
						confirmText: '我知道了',
						showCancel: false
					})
					return
				}
				if (seat.state === 'selected') {
					// 已在选座车的座位点击不取消，防误触；移除只能去选座车点 ×
					uni.showToast({ title: seat.label + ' 已在选座车，如需移除请点车里的 ×', icon: 'none' })
					return
				}
				// avail：写入选座车（重建对象保证 Vue3 响应式）
				if (this.maxSeatsPerUser > 0 && this.selectedSeats.length >= this.maxSeatsPerUser) {
					uni.showToast({ title: `最多可选 ${this.maxSeatsPerUser} 个座位`, icon: 'none' })
					return
				}
				this.selectedSet = Object.assign({}, this.selectedSet, { [seat.key]: true })
				this.selectedSeats.push({
					areaId: seat.areaId,
					row: seat.row,
					col: seat.col,
					label: seat.label,
					price: seat.price,
					key: seat.key,
					remark: ''
				})
				// 座位上不再印编号，回显完整座位号供确认
				uni.showToast({ title: '已选 ' + seat.label, icon: 'none' })
			},

			// ===== 自定义座位操作菜单（自带遮罩的固定底部弹层）=====
			openSeatMenu(cfg) {
				this.seatMenuInfo = {
					open: true,
					title: cfg.title || '',
					items: cfg.items || [],
					seat: cfg.seat || null,
					rec: cfg.rec || null,
					action: cfg.action || ''
				}
			},
			closeSeatMenu() {
				this.seatMenuInfo = Object.assign({}, this.seatMenuInfo, { open: false })
			},
			onSeatMenuTap(i) {
				const m = this.seatMenuInfo
				const seat = m.seat
				const rec = m.rec
				const action = m.action
				this.closeSeatMenu()
				if (!seat) return
				if (action === 'mine') {
					if (i === 0) this.editSeatRemark(seat)
					else if (i === 1) this.confirmReleaseMine(seat)
				} else if (action === 'admin') {
					if (i === 0) this.editSeatRemark(seat)
					else if (i === 1) this.confirmReleaseAny(seat, rec)
				}
			},

			removeSeat(seat) {
				const next = Object.assign({}, this.selectedSet)
				delete next[seat.key]
				this.selectedSet = next
				const key = seat.key || `${seat.areaId}-${seat.row}-${seat.col}`
				this.selectedSeats = this.selectedSeats.filter(s => s.key !== key)
			},

			// 释放自己的座位：二次确认后执行
			confirmReleaseMine(seat) {
				const rec = this.mySeatSet[seat.key] || {}
				uni.showModal({
					title: seat.label,
					content: (rec.remark ? '您的备注：' + rec.remark + '\n' : '') + '是否释放该座位？释放后可以重新选择其他座位。',
					confirmText: '释放座位',
					cancelText: '取消',
					success: (m) => {
						if (m.confirm) this.releaseMySeat(seat)
					}
				})
			},

			// 管理员释放任意人的座位：二次确认后执行
			confirmReleaseAny(seat, rec) {
				uni.showModal({
					title: seat.label,
					content: (rec.nickname ? '占座人：' + rec.nickname + '\n' : '') +
						(rec.remark ? '备注：' + rec.remark + '\n' : '') +
						'管理员可释放任何人的座位，释放后该座位立即变为可选。',
					confirmText: '释放座位',
					cancelText: '取消',
					success: (m) => {
						if (m.confirm) this.releaseAnySeat(seat)
					}
				})
			},

			// 修改已选座位的备注：本人改自己的，管理员可改任意人的（服务端二次校验）
			editSeatRemark(seat) {
				const rec = this.mySeatSet[seat.key] || this.takenSet[seat.key] || {}
				uni.showModal({
					title: seat.label,
					editable: true,
					placeholderText: '备注（选填，公开展示在座位上）',
					content: rec.remark || '',
					success: (m) => {
						if (!m.confirm) return
						// 低版本基础库不支持 editable，拿不到输入内容时直接返回，避免误清空
						if (m.content == null) {
							uni.showToast({ title: '当前微信版本过低，无法编辑备注', icon: 'none' })
							return
						}
						const remark = String(m.content).trim().slice(0, 100)
						uni.showLoading({ title: '保存中' })
						uniCloud.callFunction({
							name: 'seat-select',
							data: {
								action: 'updateRemark',
								concertId: this.concertId,
								seat: { areaId: seat.areaId, row: seat.row, col: seat.col },
								remark,
								userId: this.userId
							},
							success: (res) => {
								uni.hideLoading()
								if (res.result.code === 0) {
									// 同步本地缓存，座位状态与备注弹窗即时刷新
									if (this.mySeatSet[seat.key]) {
										const mine = Object.assign({}, this.mySeatSet)
										mine[seat.key] = Object.assign({}, mine[seat.key], { remark })
										this.mySeatSet = mine
									} else if (this.takenSet[seat.key]) {
										const taken = Object.assign({}, this.takenSet)
										taken[seat.key] = Object.assign({}, taken[seat.key], { remark })
										this.takenSet = taken
									}
									uni.showToast({ title: '备注已更新', icon: 'none' })
								} else if (res.result.code === 401) {
									this.requireLogin()
								} else if (res.result.code === 403) {
									// 服务端判定非本人且非管理员：同步失效本地管理员标识
									this.isAdmin = false
									uni.showToast({ title: res.result.message || '无权限修改该备注', icon: 'none' })
								} else {
									uni.showToast({ title: res.result.message || '备注保存失败', icon: 'none' })
								}
							},
							fail: () => {
								uni.hideLoading()
								uni.showToast({ title: '备注保存失败', icon: 'none' })
							}
						})
					}
				})
			},

			shortNote(note) {
				if (!note) return ''
				return note.length > 10 ? note.slice(0, 10) + '…' : note
			},

			// 菜单 alertText 只有一行展示空间，长文本截断后再展示（完整内容在修改/释放弹窗里可见）
			clipText(text, max) {
				const t = String(text || '').trim().replace(/\n/g, ' ')
				if (!t) return ''
				const m = max || 20
				return t.length > m ? t.slice(0, m) + '…' : t
			},

			// 释放自己的已选座位
			releaseMySeat(seat) {
				uniCloud.callFunction({
					name: 'seat-select',
					data: {
						action: 'releaseMine',
						concertId: this.concertId,
						seats: [{ areaId: seat.areaId, row: seat.row, col: seat.col }],
						userId: this.userId
					},
					success: (res) => {
						if (res.result.code === 0) {
							const mine = Object.assign({}, this.mySeatSet)
							delete mine[seat.key]
							this.mySeatSet = mine
							const removed = (res.result.data && res.result.data.removed) || 0
							this.totalSelected = Math.max(0, this.totalSelected - removed)
							const area = this.areas.find(a => a._id === seat.areaId)
							if (area) area.selected = Math.max(0, (area.selected || 0) - removed)
							uni.showToast({ title: '已释放，可重新选座', icon: 'none' })
						} else if (res.result.code === 401) {
							this.requireLogin()
						} else {
							uni.showToast({ title: res.result.message || '释放失败', icon: 'none' })
						}
					},
					fail: () => uni.showToast({ title: '释放失败', icon: 'none' })
				})
			},

			// 管理员释放任意人的座位
			releaseAnySeat(seat) {
				uni.showLoading({ title: '释放中' })
				uniCloud.callFunction({
					name: 'seat-select',
					data: {
						action: 'releaseAny',
						concertId: this.concertId,
						seats: [{ areaId: seat.areaId, row: seat.row, col: seat.col }],
						userId: this.userId
					},
					success: (res) => {
						uni.hideLoading()
						if (res.result.code === 0) {
							const taken = Object.assign({}, this.takenSet)
							delete taken[seat.key]
							this.takenSet = taken
							const removed = (res.result.data && res.result.data.removed) || 0
							this.totalSelected = Math.max(0, this.totalSelected - removed)
							const area = this.areas.find(a => a._id === seat.areaId)
							if (area) area.selected = Math.max(0, (area.selected || 0) - removed)
							uni.showToast({ title: removed > 0 ? '已释放该座位' : '该座位已被释放', icon: 'none' })
						} else if (res.result.code === 401) {
							this.requireLogin()
						} else if (res.result.code === 403) {
							this.isAdmin = false
							uni.showToast({ title: '管理员权限已失效，不能释放他人座位', icon: 'none' })
						} else {
							uni.showToast({ title: res.result.message || '释放失败', icon: 'none' })
						}
					},
					fail: () => {
						uni.hideLoading()
						uni.showToast({ title: '释放失败', icon: 'none' })
					}
				})
			},

			confirmSubmit() {
				if (this.selectedSeats.length === 0 || this.submitting) return
				this.submitting = true
				uni.showLoading({ title: '提交中' })
				const seats = this.selectedSeats.map(s => ({ areaId: s.areaId, row: s.row, col: s.col, remark: (s.remark || '').trim() }))
				uniCloud.callFunction({
					name: 'seat-select',
					data: {
						action: 'submit',
						concertId: this.concertId,
						seats,
						seatVersion: this.seatVersion,
						userId: this.userId
					},
					success: (res) => this.handleSubmitResult(res.result),
					fail: (err) => {
						uni.hideLoading()
						this.submitting = false
						console.error('选座提交失败', err)
						uni.showToast({ title: '提交失败，请重试', icon: 'none' })
					}
				})
			},

			handleSubmitResult(result) {
				uni.hideLoading()
				this.submitting = false
				if (!result) {
					uni.showToast({ title: '提交失败', icon: 'none' })
					return
				}
				const data = result.data || {}

				if (result.code === 0) {
					// 成功：并入“我的”（含备注），从选座车移除，并增量更新统计
					const mine = Object.assign({}, this.mySeatSet)
					let addedNow = 0
					;(data.successSeats || []).forEach(s => {
						const key = `${s.areaId}-${s.row}-${s.col}`
						if (!mine[key]) {
							addedNow++
							const area = this.areas.find(a => a._id === s.areaId)
							if (area) area.selected = (area.selected || 0) + 1
						}
						mine[key] = { remark: s.remark || '' }
						const next = Object.assign({}, this.selectedSet)
						delete next[key]
						this.selectedSet = next
					})
					this.mySeatSet = mine
					this.totalSelected += addedNow
					this.selectedSeats = []
					this.guidExpense(data)
					return
				}

				if (result.code === 401) {
					this.requireLogin()
					return
				}

				if (result.code === 409 && data.reason === 'SEAT_MAP_CHANGED') {
					uni.showModal({
						title: '座位表已更新',
						content: '管理员调整了座位表，请刷新后重新选择。',
						showCancel: false,
						success: () => this.loadSeatMap()
					})
					return
				}

				if (result.code === 409 && data.reason === 'SEAT_TAKEN') {
					// 被抢座位并入 taken，并从选座车移除
					const taken = Object.assign({}, this.takenSet)
					const selected = Object.assign({}, this.selectedSet)
					const failedKeys = {}
					;(data.failed || []).forEach(s => {
						const key = `${s.areaId}-${s.row}-${s.col}`
						taken[key] = { remark: s.remark || '' }
						delete selected[key]
						failedKeys[key] = true
					})
					this.takenSet = taken
					this.selectedSet = selected
					this.selectedSeats = this.selectedSeats.filter(s => !failedKeys[s.key])
					const labels = (data.failed || []).map(s => s.seatLabel).join('、')
					uni.showModal({
						title: '部分座位已被抢占',
						content: `以下座位刚被他人选中：${labels}。其余座位仍保留在选座车中，可重新提交。`,
						showCancel: false
					})
					return
				}

				// 其它错误（超限/限流等）
				uni.showToast({ title: result.message || '选座失败', icon: 'none' })
			},

			// 选座成功后引导记账
			guidExpense(data) {
				const seatLabels = data.seatLabels || ''
				const total = data.totalAmount
				uni.showModal({
					title: '选座成功',
					content: `已选：${seatLabels}\n合计：¥${total}\n是否记录本次消费？`,
					confirmText: '去记账',
					cancelText: '暂不',
					success: (m) => {
						if (m.confirm) {
							const url = `/pages/payRecord/edit?payType=${encodeURIComponent(this.concert.type || '演唱会')}`
								+ `&concertID=${encodeURIComponent(this.concertId)}`
								+ `&payPrice=${encodeURIComponent(total)}`
								+ `&SeatNumber=${encodeURIComponent(seatLabels)}`
							uni.navigateTo({ url })
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss" scoped>
.seat-page {
	min-height: 100vh;
	background: #f5f6fa;
	display: flex;
	flex-direction: column;
}

.loading-box,
.empty-box {
	text-align: center;
	padding: 160rpx 0;
	color: #999;
	font-size: 28rpx;
}

.concert-info {
	background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
	color: #fff;
	padding: 14rpx 24rpx;

	.ci-line {
		display: flex;
		align-items: center;
	}

	.ci-title {
		flex: 1;
		font-size: 30rpx;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ci-badge {
		flex-shrink: 0;
		margin-left: 12rpx;
		font-size: 20rpx;
		line-height: 32rpx;
		padding: 0 12rpx;
		border-radius: 16rpx;
		background: rgba(255, 255, 255, 0.25);
	}

	.ci-row {
		font-size: 22rpx;
		opacity: 0.9;
		margin-top: 4rpx;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

.area-tab {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
	background: #fff;
	padding: 10rpx 12rpx;
	border-bottom: 1rpx solid #eee;

	.tab-item {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 8rpx 22rpx;
		border-radius: 26rpx;
		background: #f2f3f7;
		/* 预置透明边框，选中时不会因多出 1rpx 边框而抖一下 */
		border: 1rpx solid transparent;

		&.active {
			background: #e3f2fd;
			border-color: #2196F3;
		}

		.tab-dot {
			width: 18rpx;
			height: 18rpx;
			border-radius: 50%;
			margin-right: 10rpx;
			flex-shrink: 0;
			background: #b0bec5;

			&.all { background: linear-gradient(135deg, #2196F3 0%, #7E57C2 100%); }
		}

		.tab-name { font-size: 26rpx; color: #333; }
		.tab-sel { font-size: 20rpx; color: #ff9800; margin-left: 8rpx; }
		.tab-price { font-size: 22rpx; color: #ff6b6b; margin-left: 10rpx; }
	}
}

.stat-bar {
	display: flex;
	align-items: center;
	background: #fff;
	padding: 8rpx 16rpx;
	border-bottom: 1rpx solid #eee;

	.legend {
		flex: 1;
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 16rpx;
		overflow: hidden;

		.lg-item {
			display: flex;
			align-items: center;
			flex-shrink: 0;
			font-size: 20rpx;
			color: #666;
		}

		.lg-admin {
			flex-shrink: 0;
			font-size: 18rpx;
			color: #ff9800;
		}

		.lg-warn {
			flex-shrink: 0;
			font-size: 18rpx;
			color: #e53935;
		}

		.lg-box {
			width: 20rpx;
			height: 20rpx;
			border-radius: 4rpx;
			margin-right: 6rpx;

			&.avail { background: #dfe4ea; }
			&.selected { background: #b39ddb; }
			&.taken { background: #80deea; }
			&.mine { background: #ffd54f; }
			&.stage { background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); }
		}
	}

	.zoom-ctrl {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 6rpx;

		.zc-btn {
			min-width: 48rpx;
			height: 44rpx;
			line-height: 44rpx;
			text-align: center;
			background: #f2f3f7;
			border-radius: 10rpx;
			font-size: 26rpx;
			color: #333;
			padding: 0 8rpx;

			&.fit {
				font-size: 22rpx;
				color: #1976D2;
				background: #e3f2fd;
				padding: 0 14rpx;
			}

			&.refresh {
				font-size: 22rpx;
				color: #2e7d32;
				background: #e8f5e9;
				padding: 0 14rpx;

				&.busy {
					opacity: 0.5;
				}
			}
		}

		.zc-scale {
			font-size: 22rpx;
			color: #666;
			min-width: 66rpx;
			text-align: center;
		}
	}
}

.map-scroll {
	/* 固定高度由 measureLayout 量得，不用 flex 拉伸，否则底部会被选座车遮住 */
	flex: none;
	width: 100%;
	height: 52vh;
	background: #fff;
	border-top: 1rpx solid #eee;
	border-bottom: 1rpx solid #eee;
	/* 自绘平移缩放：超出视口的部分靠 transform 移进来，不外泄滚动；H5 靠 touch-action 屏蔽浏览器手势 */
	touch-action: none;
	overflow: hidden;
}

.map-canvas {
	position: relative;
	/* 缩放基准点固定在左上角，tx/ty 与 scale 才能用同一套锚点公式反解 */
	transform-origin: 0 0;
	will-change: transform;
}

.area-block {
	position: absolute;
	border: 2rpx solid #dfe4ea;
	border-radius: 10rpx;
	box-sizing: border-box;

	/* 选中分区只把它标圈，不降低其他分区透明度（其他区块仍可直接点选） */
	&.active {
		border-width: 4rpx;
		box-shadow: 0 0 0 4rpx rgba(55, 71, 79, 0.16);
	}

	&.stage {
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.area-title {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		display: flex;
		align-items: center;
		white-space: nowrap;
		overflow: hidden;
		z-index: 3;
		box-sizing: border-box;

		.at-name {
			color: #fff;
			border-radius: 6rpx;
			padding: 0 8rpx;
			margin-right: 8rpx;
			flex-shrink: 0;
		}

		.at-sel { color: #ff9800; }

		// 缩小到不显示编号轴时，区名当作水印居中显示
		&.no-axis {
			justify-content: center;

			.at-name {
				background: transparent !important;
				color: rgba(55, 71, 79, 0.75);
				font-weight: bold;
			}

			.at-sel { display: none; }
		}
	}

	.stage-text {
		color: #fff;
		letter-spacing: 8rpx;
	}

	.axis-tag {
		position: absolute;
		color: #90a4ae;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		z-index: 2;

		&.row { text-align: right; padding-right: 4rpx; }
	}

	.seat {
		position: absolute;
		border-radius: 6rpx;
		text-align: center;
		color: #37474f;
		overflow: hidden;
		white-space: nowrap;

		&.avail { background: #dfe4ea; }
		&.selected { background: #b39ddb; color: #311b92; }
		&.taken { background: #80deea; color: #006064; }
		&.mine { background: #ffd54f; color: #6d4c41; }
	}

	.seat-note {
		position: absolute;
		color: #00695c;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		z-index: 2;

		&.selected { color: #4527a0; }

		&.mine { color: #ef6c00; }
	}
}

.cart {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: #fff;
	padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.08);

	/* 已选座位逐座填备注：改为一行一座，不再用胶囊换行 */
	.cart-list {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
		margin-bottom: 10rpx;
	}

	.cart-seat-row {
		display: flex;
		align-items: center;
		background: #ede7f6;
		border-radius: 12rpx;
		padding: 4rpx 12rpx;

		.cs-label {
			width: 220rpx;
			flex-shrink: 0;
			font-size: 22rpx;
			color: #5e35b1;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.cs-remark {
			flex: 1;
			height: 56rpx;
			background: #fff;
			border-radius: 8rpx;
			padding: 0 14rpx;
			font-size: 22rpx;
		}

		.cs-del {
			margin-left: 12rpx;
			font-size: 30rpx;
			color: #90a4ae;
			padding: 0 8rpx;
		}
	}

	.cart-seat.empty {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		background: transparent;
		color: #999;
		font-size: 24rpx;
		border-radius: 24rpx;
		padding: 8rpx 0;
	}

	.cart-bottom {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.cart-sum {
			display: flex;
			flex-direction: column;

			.cs-count { font-size: 24rpx; color: #666; }
			.cs-amount { font-size: 32rpx; font-weight: 600; color: #ff6b6b; }
		}

		.cart-submit {
			min-width: 220rpx;
			height: 72rpx;
			line-height: 72rpx;
			background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
			color: #fff;
			border-radius: 40rpx;
			font-size: 30rpx;
			border: none;
			margin: 0;

			&[disabled] { opacity: 0.5; }
		}
	}
}

/* 自定义座位操作菜单（微信小程序 showActionSheet 不支持 alertText 头部） */
.seat-menu-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 9999;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}
.seat-menu {
	width: 100%;
	box-sizing: border-box;
	padding: 0 20rpx calc(20rpx + env(safe-area-inset-bottom));
}
.sm-card {
	background: #ffffff;
	border-radius: 24rpx;
	overflow: hidden;
}
.sm-head {
	padding: 26rpx 24rpx;
	text-align: center;
	font-size: 26rpx;
	color: #8a86a8;
	line-height: 1.5;
	background: #fafafc;
	border-bottom: 1rpx solid #eeeeee;
}
.sm-item {
	padding: 32rpx 24rpx;
	text-align: center;
	font-size: 32rpx;
	color: #2c3e50;
	border-bottom: 1rpx solid #f0f0f0;
	&:last-child { border-bottom: none; }
	&:active { background: #f5f5f7; }
}
.sm-cancel {
	margin-top: 16rpx;
	padding: 32rpx 24rpx;
	text-align: center;
	font-size: 32rpx;
	color: #2c3e50;
	background: #ffffff;
	border-radius: 24rpx;
	&:active { background: #f5f5f7; }
}
</style>
