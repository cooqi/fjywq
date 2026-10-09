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
					<view class="lg-item"><view class="lg-box avail"></view><text>可选</text></view>
					<view class="lg-item"><view class="lg-box selected"></view><text>已选</text></view>
					<view class="lg-item"><view class="lg-box taken"></view><text>他人</text></view>
					<view class="lg-item"><view class="lg-box mine"></view><text>我的</text></view>
					<text class="lg-admin" v-if="isAdmin && scale >= 1">点他人座位可释放</text>
					<text class="lg-warn" v-if="scale < 1">放大至100%可选座</text>
				</view>
				<view class="zoom-ctrl">
					<text class="zc-btn" @click="zoom(-0.25)">－</text>
					<text class="zc-scale">{{ Math.round(scale * 100) }}%</text>
					<text class="zc-btn" @click="zoom(0.25)">＋</text>
					<text class="zc-btn fit" @click="fitOverview">适应</text>
				</view>
			</view>

			<!-- 整场馆总览画布：分区按管理员排摆放置，支持双指捏合缩放 -->
			<scroll-view
				class="map-scroll"
				scroll-x
				scroll-y
				:style="{ height: mapH + 'px' }"
				:scroll-left="scrollLeft"
				:scroll-top="scrollTop"
				:scroll-with-animation="animateScroll"
				@scroll="onMapScroll"
				@touchstart="onCanvasTouchStart"
				@touchmove="onCanvasTouchMove"
				@touchend="onCanvasTouchEnd"
				@touchcancel="onCanvasTouchEnd"
			>
				<view class="map-canvas" :style="{width: canvasPx.w + 'rpx', height: canvasPx.h + 'rpx'}">
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
								:style="{left: seat.left + 'rpx', top: seat.top + 'rpx', width: seat.size + 'rpx', height: seat.size + 'rpx', fontSize: seat.font + 'rpx', lineHeight: seat.size + 'rpx'}"
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
			</scroll-view>

			<!-- 底部选座车 -->
			<view class="cart">
				<view class="cart-list" v-if="selectedSeats.length > 0">
					<view class="cart-seat" v-for="s in selectedSeats" :key="s.key">
						<text>{{s.label}}</text>
						<text class="cs-del" @click="removeSeat(s)">×</text>
					</view>
				</view>
				<view class="cart-seat empty" v-if="selectedSeats.length === 0">还没有选座位，点击上方座位选座</view>

				<view class="cart-remark">
					<input class="cart-remark-input" v-model="remarkInput" maxlength="100" placeholder="备注（选填，公开展示在座位上）" />
				</view>

				<view class="cart-bottom">
					<view class="cart-sum">
						<text class="cs-count">已选 {{selectedSeats.length}}{{maxSeatsPerUser > 0 ? ' / ' + maxSeatsPerUser : ''}} 座</text>
						<text class="cs-amount">合计 ¥{{totalAmount}}</text>
					</view>
					<button class="cart-submit" :disabled="selectedSeats.length === 0 || submitting" @click="confirmSubmit">确认选座</button>
				</view>
			</view>
		</block>
	</view>
</template>

<script>
	// 画布尺寸基准（rpx）：1 格 = SEAT_BASE + GAP_BASE
	const SEAT_BASE = 24
	const GAP_BASE = 4
	const CELL_BASE = SEAT_BASE + GAP_BASE
	const CANVAS_PAD = 16
	const AXIS_MIN_CELL = 22 // 格子小于该值时不显示编号轴与座位号
	const MIN_TAP_SCALE = 1 // 选座/取消选的最低缩放：小于 100% 座位太小，容易误触

	export default {
		data() {
			return {
				loading: true,
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
				totalSelected: 0,
				totalCapacity: 0,
				remarkInput: '',
				emptyText: '座位表暂未开放',
				// 占座/我的/选中，均以 `${areaId}-${row}-${col}` 为 key 的普通对象，保证 Vue3 响应式
				takenSet: {},
				mySeatSet: {},
				selectedSet: {},
				selectedSeats: [], // 选座车 [{areaId,row,col,label,price,key}]
				// 总览缩放与滚动定位
				scale: 1,
				focusIndex: -1,
				scrollLeft: 0,
				scrollTop: 0,
				lastTapKey: '',
				lastTapAt: 0,
				// 捏合缩放：手势中的基准距离/缩放与锚点格坐标，不用于渲染
				pinch: null,
				animateScroll: true,
				sl: 0,
				st: 0,
				viewW: 375,
				// 可用屏幕高度（px），用于计算画布高度
				winH: 660,
				// 画布可视区高度（px）与底部选座车高度（px），运行时量得
				mapH: 340,
				cartH: 0,
			}
		},
		computed: {
			cell() {
				return CELL_BASE * this.scale
			},
			seatSize() {
				return SEAT_BASE * this.scale
			},
			axisFont() {
				return Math.max(10, Math.round(14 * this.scale))
			},
			titleFont() {
				return Math.max(12, Math.round(18 * this.scale))
			},
			noteFont() {
				return Math.max(10, Math.round(14 * this.scale))
			},
			showAxis() {
				return this.cell >= AXIS_MIN_CELL
			},
			// 顶部分两行预留：区名 + 列号
			titleH() {
				return this.showAxis ? this.titleFont + 4 : 0
			},
			axisH() {
				return this.showAxis ? this.axisFont + 2 : 0
			},
			gutLeft() {
				return this.showAxis ? Math.round(34 * this.scale) : 0
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
			// 预处理成画布上的绝对定位分区，座位在分区容器内相对定位
			layoutAreas() {
				const cell = this.cell
				const size = this.seatSize
				const showLabel = this.showAxis
				const font = Math.max(9, Math.round(13 * this.scale))
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
				// error
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
				return `${area.name}${rText}${cText}`
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

			// ===== 缩放与定位 =====
			zoom(delta) {
				const next = Math.round((this.scale + delta) * 100) / 100
				this.scale = Math.min(Math.max(next, 0.4), 2.4)
			},

			// 让整个场馆可见（缩放比例按 rpx 计算：可视区宽度固定为 750rpx）
			fitOverview() {
				this.focusIndex = -1
				const fitW = 750 / (this.canvasGrid.w * CELL_BASE)
				const fitH = this.viewHRpx() / (this.canvasGrid.h * CELL_BASE)
				const s = Math.min(fitW, fitH, 2.4)
				this.scale = Math.round(Math.max(s, 0.4) * 100) / 100
				this.scrollTo(0, 0)
			},

			scrollTo(leftRpx, topRpx) {
				const l = Math.max(0, uni.upx2px(leftRpx))
				const t = Math.max(0, uni.upx2px(topRpx))
				// 目标值与当前一致时 scroll-view 不会重新滚动，补极小偏移触发
				this.scrollLeft = this.scrollLeft === l ? l + 0.1 : l
				this.scrollTop = this.scrollTop === t ? t + 0.1 : t
			},

			focusOverview() {
				this.fitOverview()
			},

			// ===== 双指捏合缩放 =====
			pxToRpx(px) {
				return px * 750 / (this.viewW || 375)
			},

			touchDistance(touches) {
				const dx = touches[0].clientX - touches[1].clientX
				const dy = touches[0].clientY - touches[1].clientY
				return Math.sqrt(dx * dx + dy * dy)
			},

			// 记下真实滚动量，缩放时才能把锚点算准
			onMapScroll(e) {
				const d = (e && e.detail) || {}
				this.sl = Number(d.scrollLeft) || 0
				this.st = Number(d.scrollTop) || 0
			},

			onCanvasTouchStart(e) {
				this.pinch = null
				const t = e && e.touches
				if (!t || t.length < 2) return
				const dist = this.touchDistance(t)
				if (dist < 12) return
				// 捏合期间关掉滚动动画，避免逐帧追赶延迟
				this.animateScroll = false
				const cx = (t[0].clientX + t[1].clientX) / 2
				const cy = (t[0].clientY + t[1].clientY) / 2
				const sl = this.sl
				const st = this.st
				uni.createSelectorQuery().in(this).select('.map-scroll').boundingClientRect(rect => {
					if (!rect) return
					const viewX = this.pxToRpx(cx - (rect.left || 0))
					const viewY = this.pxToRpx(cy - (rect.top || 0))
					this.pinch = {
						dist: dist,
						scale: this.scale,
						viewX: viewX,
						viewY: viewY,
						// 锚点对应的画布格坐标与缩放无关，缩放后据此回算滚动量保持锚点不动
						gridX: (this.pxToRpx(sl) + viewX - CANVAS_PAD) / this.cell,
						gridY: (this.pxToRpx(st) + viewY - CANVAS_PAD) / this.cell
					}
				}).exec()
			},

			onCanvasTouchMove(e) {
				const p = this.pinch
				if (!p) return
				const t = e && e.touches
				if (!t || t.length < 2) return
				const dist = this.touchDistance(t)
				if (dist < 12) return
				const next = Math.min(Math.max(p.scale * (dist / p.dist), 0.4), 2.4)
				const s = Math.round(next * 100) / 100
				if (s === this.scale) return
				this.scale = s
				this.scrollTo(CANVAS_PAD + p.gridX * this.cell - p.viewX, CANVAS_PAD + p.gridY * this.cell - p.viewY)
			},

			onCanvasTouchEnd(e) {
				const t = (e && e.touches) || []
				if (t.length >= 2) return
				this.pinch = null
				this.animateScroll = true
			},

			// 总览下单击分区区块选中，双击则进入并放大该区（座位自己的点击已 stop 冒泡）
			onAreaTap(idx) {
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
				// 100% 能装下就放大到 100%–200%；装不下就整区适配，但不低于 minScale（默认 0.8，再小编号轴会被隐藏）
				const floor = Number(minScale) > 0 ? Number(minScale) : 0.8
				const s = fit < 1 ? Math.max(fit, floor) : Math.min(fit, 2)
				this.scale = Math.round(s * 100) / 100
				this.centerArea(idx)
			},

			// 把指定分区滚到可视区中央（缩放改完要等 cell 更新，故放在 nextTick 里）
			centerArea(idx) {
				const area = this.areas[idx]
				if (!area) return
				this.$nextTick(() => {
					const cell = this.cell
					const viewH = this.viewHRpx()
					const w = (area.isStage ? (Number(area.stageW) || 0) : (Number(area.cols) || 0)) * cell
					const h = (area.isStage ? (Number(area.stageH) || 0) : (Number(area.rows) || 0)) * cell + this.gutTop
					const left = CANVAS_PAD + (Number(area.gridX) || 0) * cell
					const top = CANVAS_PAD + (Number(area.gridY) || 0) * cell
					// 夹紧到可滚范围，小屏下“居中”才不会跳过头留下空白
					const maxL = Math.max(0, this.canvasPx.w - 750)
					const maxT = Math.max(0, this.canvasPx.h - viewH)
					const l = Math.min(Math.max(0, left + w / 2 - 375), maxL)
					const t = Math.min(Math.max(0, top + h / 2 - viewH / 2), maxT)
					this.scrollTo(l, t)
				})
			},

			viewHRpx() {
				if (!this.viewW) return this.mapH
				return Math.round(this.mapH * 750 / this.viewW)
			},

			// 把画布坐标 (xRpx, yRpx) 滚到可视区中央，并夹紧到可滚范围
			centerPoint(xRpx, yRpx) {
				const viewH = this.viewHRpx()
				const maxL = Math.max(0, this.canvasPx.w - 750)
				const maxT = Math.max(0, this.canvasPx.h - viewH)
				this.scrollTo(
					Math.min(Math.max(0, xRpx - 375), maxL),
					Math.min(Math.max(0, yRpx - viewH / 2), maxT)
				)
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
							if (!d.seatEnabled) return
							this.concert = d.concert || {}
							this.areas = d.areas || []
							this.maxSeatsPerUser = Number(d.maxSeatsPerUser) || 0
							this.seatVersion = Number(d.seatVersion) || 1
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
				else this.scale = MIN_TAP_SCALE
				// 缩放生效后再把被点的座位挪到视线中央，方便再点一次
				this.$nextTick(() => {
					const area = this.areas[idx] || {}
					const cell = this.cell
					const x = CANVAS_PAD + (Number(area.gridX) || 0) * cell + this.gutLeft + (seat.col - 1) * cell + cell / 2
					const y = CANVAS_PAD + (Number(area.gridY) || 0) * cell + this.gutTop + (seat.row - 1) * cell + cell / 2
					this.centerPoint(x, y)
				})
				uni.showToast({ title: '已放大至 100%，请再点一次该座位', icon: 'none' })
				return false
			},

			onSeatTap(seat) {
				// 可选/已选中的座位是无确认弹窗的直接写入，先检查缩放够不够
				if ((seat.state === 'avail' || seat.state === 'selected') && !this.ensureReadableForTap(seat)) return
				if (seat.state === 'mine') {
					// 自己的座位：保存后可修改（释放后重新选）
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
					return
				}
				if (seat.state === 'taken') {
					// 备注超过 10 字已在座位上隐藏，点击弹窗看完整内容
					const rec = this.takenSet[seat.key] || {}
					if (this.isAdmin) {
						// 管理员可释放任何人的座位
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
						return
					}
					uni.showModal({
						title: seat.label,
						content: (rec.remark ? '备注：' + rec.remark + '\n' : '') + '该座位已被他人选择，如需沟通可截图发到群聊。',
						confirmText: '我知道了',
						showCancel: false
					})
					return
				}
				if (seat.state === 'selected') {
					this.removeSeat(seat)
					uni.showToast({ title: '已取消 ' + seat.label, icon: 'none' })
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
					key: seat.key
				})
				// 座位上不再印编号，回显完整座位号供确认
				uni.showToast({ title: '已选 ' + seat.label, icon: 'none' })
			},

			removeSeat(seat) {
				const next = Object.assign({}, this.selectedSet)
				delete next[seat.key]
				this.selectedSet = next
				const key = seat.key || `${seat.areaId}-${seat.row}-${seat.col}`
				this.selectedSeats = this.selectedSeats.filter(s => s.key !== key)
			},

			shortNote(note) {
				if (!note) return ''
				return note.length > 10 ? note.slice(0, 10) + '…' : note
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
				const seats = this.selectedSeats.map(s => ({ areaId: s.areaId, row: s.row, col: s.col }))
				uniCloud.callFunction({
					name: 'seat-select',
					data: {
						action: 'submit',
						concertId: this.concertId,
						seats,
						seatVersion: this.seatVersion,
						remark: (this.remarkInput || '').trim(),
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
					this.remarkInput = ''
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
}

.map-canvas {
	position: relative;
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

	/* 已选座位自动换行，全部可见，不靠左右滑动 */
	.cart-list {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 10rpx;
	}

	.cart-seat {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		background: #ede7f6;
		color: #5e35b1;
		font-size: 24rpx;
		border-radius: 24rpx;
		padding: 6rpx 16rpx;

		.cs-del {
			margin-left: 10rpx;
			font-size: 30rpx;
			color: #90a4ae;
		}

		&.empty {
			background: transparent;
			color: #999;
			padding: 8rpx 0;
		}
	}

	.cart-remark {
		margin-bottom: 8rpx;

		.cart-remark-input {
			height: 56rpx;
			background: #f5f5f5;
			border-radius: 12rpx;
			padding: 0 20rpx;
			font-size: 24rpx;
		}
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
</style>
