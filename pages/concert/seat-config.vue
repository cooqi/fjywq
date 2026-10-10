<template>
	<view class="seat-config-page">
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading">
			<text>座位配置加载中...</text>
		</view>

		<block v-else>
			<!-- 头部信息 -->
			<view class="page-header">
				<view class="ph-title">{{concertTitle}}</view>
				<view class="ph-status">
					<text class="status-tag on" v-if="seatEnabled">已开放选座</text>
					<text class="status-tag off" v-else>不开放选座</text>
					<text class="status-toggle" :class="{off: !seatEnabled}" @click="toggleSeatEnabled">{{seatEnabled ? '关闭选座' : '开放选座'}}</text>
					<text class="ph-version">座位表版本：v{{seatVersion}}</text>
				</view>
				<view class="ph-meta">
					<text class="ph-meta-item">共 {{seatAreas.length}} 个分区</text>
					<text class="ph-meta-item">{{seatTotalSeats}} 座</text>
					<text class="ph-meta-item">画布 {{canvasGrid.w}}×{{canvasGrid.h}} 格</text>
				</view>
				<view class="ph-warn" v-if="seatSelectionCount > 0">已有 {{seatSelectionCount}} 条选座记录：改动行列数或增删分区会清理受影响记录；只调整分区位置、编号不影响已选座位</view>
			</view>

			<view class="content">
				<!-- 基本信息 -->
				<view class="section">
					<view class="section-title">通用设置</view>
					<view class="meta-row">
						<text class="meta-label">每人可选座位数（0 为不限）</text>
						<input class="meta-input" type="number" v-model="seatMaxPerUser" placeholder="例如：6" />
					</view>
				</view>

				

				<!-- 布局总览：整场馆一张画布，分区可拖拽摆位 -->
				<view class="section">
					<view class="section-head">
						<text class="section-title">布局总览</text>
						<view class="head-btns">
							<text class="mini-btn" @click="addSeatArea(false)">+ 分区</text>
							<text class="mini-btn purple" @click="addSeatArea(true)">+ 舞台</text>
							<text class="mini-btn gray" @click="autoLayout">自动排布</text>
						</view>
					</view>

					<view class="canvas-toolbar">
						<text class="ct-btn" @click="zoom(-0.2)">－</text>
						<text class="ct-scale">{{ Math.round(previewScale * 100) }}%</text>
						<text class="ct-btn" @click="zoom(0.2)">＋</text>
						<text class="ct-btn fit" @click="fitCanvas">适应屏幕</text>
						<text class="ct-info">直接拖动色块摆位（自动吸附 0.5 格）</text>
					</view>

					<scroll-view class="layout-scroll" scroll-x scroll-y>
						<view
							class="layout-canvas"
							:style="{ width: canvasPx.w + 'rpx', height: canvasPx.h + 'rpx' }"
							@touchmove="onDragTouchMove"
							@touchend="moveDragEnd"
							@touchcancel="moveDragEnd"
						>
							<!-- 对齐辅助线 -->
							<view
								class="align-guide"
								:class="g.type"
								v-for="(g, gi) in alignGuides"
								:key="'g' + gi"
								:style="guideStyle(g)"
							></view>
							<!-- 分区 / 舞台色块 -->
							<view
								class="layout-block"
								:class="{ stage: item.isStage, active: selectedIndex === item.index, overlap: item.overlap, dragging: dragIndex === item.index }"
								v-for="(item, idx) in layoutBlocks"
								:key="item.key || idx"
								:style="blockStyle(item)"
								@touchstart="onBlockTouchStart(item, $event)"
								@touchmove.stop.prevent="onDragTouchMove"
								@touchend.stop.prevent="moveDragEnd"
								@touchcancel.stop.prevent="moveDragEnd"
								@mousedown="onBlockMouseDown(item, $event)"
								@mousemove.stop.prevent="onDragTouchMove"
								@mouseup.prevent="moveDragEnd"
								@mouseleave="moveDragEnd"
								@click="selectArea(item.index)"
							>
								<text class="lb-name">{{item.name}}</text>
								<text class="lb-sub" v-if="!item.isStage">{{item.rows}}排×{{item.cols}}列</text>
								<text class="lb-sub" v-else>舞台 {{item.stageW}}×{{item.stageH}}</text>
								<text class="lb-pos" v-if="selectedIndex === item.index">X{{item.gridX}} Y{{item.gridY}}</text>
							</view>
							<view class="canvas-empty" v-if="layoutBlocks.length === 0">还没有分区，点击上方「+ 分区」开始配置</view>
						</view>
					</scroll-view>
					<view class="overlap-warn" v-if="overlapTips.length > 0">位置重叠：{{overlapTips.join('；')}}（保存时需确认）</view>
				</view>

				<!-- 分区列表 -->
				<view class="section">
					<view class="section-head">
						<text class="section-title">分区配置</text>
						<view class="add-area-btn" @click="addSeatArea(false)">+ 新增分区</view>
					</view>

					<view class="area-card" v-for="(area, idx) in seatAreas" :key="idx" :class="{ active: selectedIndex === idx }" @click="selectArea(idx)">
						<view class="area-card-head">
							<view class="area-color-dot" :style="{background: area.color}"></view>
							<text class="area-index">分区 {{idx + 1}}{{area.isStage ? ' · 舞台/装饰区' : ''}}</text>
							<text class="area-del" @click.stop="removeSeatArea(idx)">删除</text>
						</view>

						<view class="area-row">
							<view class="area-field grow">
								<text class="af-label">名称</text>
								<input class="af-input" v-model="area.name" :placeholder="area.isStage ? '如：主舞台' : '如：VIP区'" />
							</view>
							<view class="area-field">
								<text class="af-label">颜色</text>
								<input class="af-input" v-model="area.color" placeholder="#4A90D9" />
							</view>
							<view class="area-field type-chk" @click.stop="toggleStage(idx)">
								<text class="af-label">类型</text>
								<view class="af-switch">
									<view class="sw-box" :class="{on: area.isStage}"><view class="sw-dot"></view></view>
									<text class="sw-text">{{area.isStage ? '舞台' : '座位区'}}</text>
								</view>
							</view>
						</view>

						<!-- 座位区：行列与票价 -->
						<block v-if="!area.isStage">
							<view class="area-row">
								<view class="area-field">
									<text class="af-label">排数</text>
									<input class="af-input" type="number" v-model="area.rows" @blur="onSizeChange(idx, 'rows')" placeholder="1-100" />
								</view>
								<view class="area-field">
									<text class="af-label">列数</text>
									<input class="af-input" type="number" v-model="area.cols" @blur="onSizeChange(idx, 'cols')" placeholder="1-100" />
								</view>
								<view class="area-field">
									<text class="af-label">票价</text>
									<input class="af-input" type="digit" v-model="area.price" placeholder="0" />
								</view>
							</view>
							<view class="area-row">
								<view class="area-field">
									<text class="af-label">默认排号</text>
									<picker class="af-picker" @change="onRowLabelChange(idx, $event)" :value="area.rowLabelType - 1" :range="rowLabelTypes">
										<view class="af-picker-val">{{ rowLabelTypes[area.rowLabelType - 1] }}</view>
									</picker>
								</view>
								<view class="area-field">
									<text class="af-label">排序</text>
									<input class="af-input" type="number" v-model="area.sort" placeholder="序号" />
								</view>
								<view class="area-field total-seats">
									<text class="af-label">小计</text>
									<text class="af-val">{{ (area.rows||0) * (area.cols||0) }} 座</text>
								</view>
							</view>
						</block>

						<!-- 舞台/装饰区：占位格数 -->
						<block v-else>
							<view class="area-row">
								<view class="area-field">
									<text class="af-label">宽（格）</text>
									<input class="af-input" type="number" v-model="area.stageW" placeholder="如：20" />
								</view>
								<view class="area-field">
									<text class="af-label">高（格）</text>
									<input class="af-input" type="number" v-model="area.stageH" placeholder="如：2" />
								</view>
								<view class="area-field total-seats">
									<text class="af-label">说明</text>
									<text class="af-val">不渲染座位</text>
								</view>
							</view>
						</block>

						<!-- 画布坐标，便于精细调整 -->
						<view class="area-row">
							<view class="area-field">
								<text class="af-label">X 坐标（格）</text>
								<view class="stepper">
									<text class="st-btn" @click.stop="stepGrid(idx, 'gridX', -0.5)">－</text>
									<input class="st-input" type="digit" v-model="area.gridX" @blur="normalizeGridField(idx, 'gridX')" />
									<text class="st-btn" @click.stop="stepGrid(idx, 'gridX', 0.5)">＋</text>
								</view>
							</view>
							<view class="area-field">
								<text class="af-label">Y 坐标（格）</text>
								<view class="stepper">
									<text class="st-btn" @click.stop="stepGrid(idx, 'gridY', -0.5)">－</text>
									<input class="st-input" type="digit" v-model="area.gridY" @blur="normalizeGridField(idx, 'gridY')" />
									<text class="st-btn" @click.stop="stepGrid(idx, 'gridY', 0.5)">＋</text>
								</view>
							</view>
						</view>

						<!-- 排号 / 列号自定义 -->
						<view class="label-toggle" v-if="!area.isStage" @click.stop="toggleLabelPanel(idx)">
							<text>{{area.showLabelPanel ? '收起编号设置' : '排号 / 列号自定义（可选）'}}</text>
							<text class="lt-tag" v-if="hasCustomLabel(idx)">已自定义</text>
						</view>

						<view class="label-panel" v-if="!area.isStage && area.showLabelPanel">
							<view class="lr-group" v-for="kind in labelKinds" :key="kind.key">
								<view class="lr-title">
									<text>{{kind.title}}</text>
									<text class="lr-count" :class="{bad: labelCountMismatch(idx, kind.key)}">
										已填 {{ labelList(idx, kind.key).length }} / 需 {{ kind.key === 'row' ? (area.rows || 0) : (area.cols || 0) }}
									</text>
								</view>
								<view class="lr-row">
									<picker class="lr-picker" @change="onLabelTypeChange(idx, kind.key, $event)" :value="labelTypeIndex(area.labelRule[kind.key].type)" :range="labelTypeNames">
										<view class="af-picker-val">{{ labelTypeNames[labelTypeIndex(area.labelRule[kind.key].type)] }}</view>
									</picker>
									<input class="lr-input" v-model="area.labelRule[kind.key].start" placeholder="起始" />
									<input class="lr-input" v-model="area.labelRule[kind.key].step" placeholder="步长" />
									<input class="lr-input" v-model="area.labelRule[kind.key].prefix" placeholder="前缀" />
									<input class="lr-input" v-model="area.labelRule[kind.key].suffix" placeholder="后缀" />
								</view>
								<view class="lr-row btns">
									<text class="lr-btn main" @click="generateLabels(idx, kind.key)">批量生成</text>
									<block v-if="kind.key === 'col'">
										<text class="lr-btn" @click="quickLabels(idx, 'odd')">全单号</text>
										<text class="lr-btn" @click="quickLabels(idx, 'even')">全双号</text>
										<text class="lr-btn" @click="quickLabels(idx, 'desc')">倒序</text>
									</block>
									<text class="lr-btn" @click="toggleLabelEdit(idx, kind.key)">手动编辑</text>
									<text class="lr-btn gray" @click="clearLabels(idx, kind.key)">清除</text>
								</view>
								<view class="lr-edit" v-if="area.editingKind === kind.key">
									<textarea class="lr-textarea" v-model="area.editText" :placeholder="kind.key === 'row' ? '每行一个或逗号分隔，如：1排,2排,3排' : '例如：1,3,5,7,9 或每行一个'" />
									<view class="lr-row btns">
										<text class="lr-btn main" @click="applyLabelEditText(idx, kind.key)">应用（共 {{kind.key === 'row' ? area.rows : area.cols}} 个）</text>
										<text class="lr-btn gray" @click="cancelLabelEdit(idx)">取消</text>
									</view>
								</view>
								<view class="lr-preview">预览：{{ labelPreview(idx, kind.key) }}</view>
							</view>
							<view class="lr-tip">编号只做展示，座位唯一标识仍是「第几排第几列」；清空后恢复默认序号</view>
						</view>
					</view>

					<view class="empty-area" v-if="seatAreas.length === 0">暂无分区，点击上方“+ 新增分区”</view>

					<view class="seat-total">座位总数：{{ seatTotalSeats }} 座（不含舞台区）</view>
				</view>

				<!-- 座位状态配色：管理员自定义，留空则用内置默认 -->
				<view class="section">
					<view class="section-head">
						<text class="section-title">座位颜色</text>
						<text class="mini-btn gray" @click="resetSeatColors">恢复默认</text>
					</view>
					<view class="color-row" v-for="c in seatColorDefs" :key="c.key">
						<view class="color-swatch" :style="{ background: effectiveColor(c.key) }"></view>
						<text class="color-name">{{ c.name }}</text>
						<view class="color-presets">
							<view
								class="color-preset"
								v-for="p in colorPresets"
								:key="p"
								:style="{ background: p }"
								@click="pickSeatColor(c.key, p)"
							></view>
						</view>
						<input class="color-hex" v-model="seatColors[c.key]" @input="dirty = true" placeholder="可自定义" maxlength="7" />
					</view>
					<text class="color-tip">选预设色或手填 #RRGGBB；留空为默认配色</text>
				</view>

				<!-- 已选座位管理 -->
				<view class="section">
					<view class="section-head" @click="toggleSeatSelections">
						<text class="section-title">已选座位（{{seatSelectionCount}}）</text>
						<text class="sel-toggle">{{ showSelections ? '收起' : (seatLoadedSelections ? '展开' : '查看') }}</text>
					</view>
					<view class="seat-sel-list" v-if="showSelections">
						<view class="sel-toolbar" v-if="seatSelections.length > 0">
							<text class="sel-release-all" @click="releaseAllSeats">全部释放</text>
						</view>
						<view class="sel-item" v-for="sel in seatSelections" :key="sel._id">
							<view class="area-color-dot" :style="{background: sel.color}"></view>
							<view class="sel-info">
								<text class="sel-label">{{sel.seatLabel}}</text>
								<text class="sel-user">{{ sel.nickname || sel.userId || '用户' }}</text>
							</view>
							<text class="sel-release" @click="releaseSeat(sel)">释放</text>
						</view>
						<view class="sel-empty" v-if="seatSelections.length === 0">暂无选座记录</view>
					</view>
				</view>
			</view>

			<!-- 底部操作栏 -->
			<view class="footer-bar">
				<button class="footer-btn back" @click="goBack">返回</button>
				<button class="footer-btn save" :disabled="savingSeat" @click="saveSeatConfig(false)">保存座位表</button>
			</view>
		</block>
	</view>
</template>

<script>
	// 座位状态内置默认配色（与选座页 seat-select.vue 保持一致；留空/非法均回退此默认）
	const SEAT_COLOR_DEFAULTS = { avail: '#dfe4ea', selected: '#b39ddb', taken: '#80deea', mine: '#ffd54f' }
	const SEAT_COLOR_DEFS = [
		{ key: 'avail', name: '可选' },
		{ key: 'selected', name: '预选' },
		{ key: 'taken', name: '锁定' },
		{ key: 'mine', name: '我的' }
	]
	const SEAT_COLOR_PRESETS = ['#dfe4ea', '#b39ddb', '#80deea', '#ffd54f',  '#a5d6a7', '#ef9a9a', '#90caf9']
	// 预览画布：1 格基准边长（rpx），再乘 previewScale 缩放
	const PREVIEW_CELL = 24
	const CANVAS_PAD = 20
	const VIEW_W = 690
	const VIEW_H = 460
	const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

	export default {
		data() {
			return {
				loading: true,
				savingSeat: false,
				concertId: '',
				concertTitle: '',
				seatEnabled: false,
				seatVersion: 1,
				seatMaxPerUser: '6',
				seatColorDefs: SEAT_COLOR_DEFS,
				colorPresets: SEAT_COLOR_PRESETS,
				// 座位状态配色：空字符串表示用默认，保存时只提交合法 #RRGGBB
				seatColors: { avail: '', selected: '', taken: '', mine: '' },
				seatAreas: [],
				seatSelectionCount: 0,
				seatSelections: [],
				seatLoadedSelections: false,
				showSelections: false,
				rowLabelTypes: ['数字', '字母'],
				labelTypes: ['number', 'letter', 'chinese', 'custom'],
				labelTypeNames: ['数字', '字母', '中文', '自定义'],
				labelKinds: [{ key: 'row', title: '排号设置' }, { key: 'col', title: '列号设置' }],
				userInfo: {},
				// 排版
				selectedIndex: -1,
				previewScale: 1,
				dragging: null, // {index, startX, startY, originX, originY, moved}
				lastTouchAt: 0,
				alignGuides: [],
				dirty: false,
				allowLeave: false
			}
		},
		computed: {
			seatTotalSeats() {
				return this.seatAreas.reduce((sum, a) => {
					if (a.isStage) return sum
					return sum + (parseInt(a.rows) || 0) * (parseInt(a.cols) || 0)
				}, 0)
			},
			cellSize() {
				return PREVIEW_CELL * this.previewScale
			},
			// 每个分区在画布上占多少格
			blockExtent() {
				return this.seatAreas.map(a => {
					const isStage = !!a.isStage
					return {
						cols: isStage ? (Number(a.stageW) || 0) : (parseInt(a.cols) || 0),
						rows: isStage ? (Number(a.stageH) || 0) : (parseInt(a.rows) || 0)
					}
				})
			},
			canvasGrid() {
				let w = 0
				let h = 0
				this.seatAreas.forEach((a, i) => {
					const ext = this.blockExtent[i]
					w = Math.max(w, (Number(a.gridX) || 0) + ext.cols)
					h = Math.max(h, (Number(a.gridY) || 0) + ext.rows)
				})
				return { w: Math.ceil(w), h: Math.ceil(h) }
			},
			canvasPx() {
				return {
					w: CANVAS_PAD * 2 + this.canvasGrid.w * this.cellSize,
					h: CANVAS_PAD * 2 + this.canvasGrid.h * this.cellSize
				}
			},
			// 座位区之间的重叠检测（舞台区不参与）
			overlapSet() {
				const blocks = this.seatAreas.map((a, i) => {
					if (a.isStage) return null
					const ext = this.blockExtent[i]
					const x = Number(a.gridX) || 0
					const y = Number(a.gridY) || 0
					return { i, name: a.name || `分区${i + 1}`, x1: x, y1: y, x2: x + ext.cols, y2: y + ext.rows }
				}).filter(Boolean)
				const set = {}
				const tips = []
				for (let m = 0; m < blocks.length; m++) {
					for (let n = m + 1; n < blocks.length; n++) {
						const a = blocks[m]
						const b = blocks[n]
						if (a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2) {
							set[a.i] = true
							set[b.i] = true
							tips.push(`${a.name} 与 ${b.name}`)
						}
					}
				}
				return { set, tips }
			},
			overlapTips() {
				return this.overlapSet.tips
			},
			layoutBlocks() {
				const cell = this.cellSize
				const set = this.overlapSet.set
				return this.seatAreas.map((a, idx) => {
					const ext = this.blockExtent[idx]
					const gridX = Number(a.gridX) || 0
					const gridY = Number(a.gridY) || 0
					return {
						key: a._id || ('new' + idx),
						index: idx,
						isStage: !!a.isStage,
						name: a.name || (a.isStage ? '舞台' : `分区${idx + 1}`),
						rows: parseInt(a.rows) || 0,
						cols: parseInt(a.cols) || 0,
						stageW: Number(a.stageW) || 0,
						stageH: Number(a.stageH) || 0,
						gridX,
						gridY,
						overlap: !!set[idx],
						left: CANVAS_PAD + gridX * cell,
						top: CANVAS_PAD + gridY * cell,
						width: Math.max(ext.cols * cell - 2, 26),
						height: Math.max(ext.rows * cell - 2, 22)
					}
				})
			},
			// 当前正在拖拽的分区（已位移）
			dragIndex() {
				return this.dragging && this.dragging.moved ? this.dragging.index : -1
			}
		},
		onLoad(options) {
			this.concertId = options.id || ''
			try {
				const userInfo = uni.getStorageSync('userInfo')
				this.userInfo = userInfo ? JSON.parse(userInfo) : {}
			} catch (e) {
				// error
			}
			if (!this.concertId) {
				this.loading = false
				uni.showToast({ title: '缺少演唱会ID', icon: 'none' })
				return
			}
			this.loadSeatConfig()
		},
		// 有未保存改动时拦截返回
		onBackPress() {
			if (this.dirty && !this.allowLeave) {
				uni.showModal({
					title: '放弃更改',
					content: '座位表有未保存的改动，确定离开吗？',
					confirmText: '放弃',
					cancelText: '继续编辑',
					success: (m) => {
						if (m.confirm) {
							this.allowLeave = true
							uni.navigateBack()
						}
					}
				})
				return true
			}
			return false
		},
		methods: {
			defaultRule(type, suffix) {
				return { type, start: 1, step: 1, prefix: '', suffix, pad: 0 }
			},

			// 生效配色：合法自定义值优先，否则用内置默认（与选座页回退规则一致）
			effectiveColor(key) {
				const v = String(this.seatColors[key] || '').trim()
				return /^#[0-9a-fA-F]{6}$/.test(v) ? v : SEAT_COLOR_DEFAULTS[key]
			},

			pickSeatColor(key, p) {
				this.seatColors[key] = p
				this.dirty = true
			},

			resetSeatColors() {
				SEAT_COLOR_DEFS.forEach(c => { this.seatColors[c.key] = '' })
				this.dirty = true
				uni.showToast({ title: '已恢复默认配色，保存后生效', icon: 'none' })
			},

			loadSeatConfig() {
				this.loading = true
				uniCloud.callFunction({
					name: 'concert-admin',
					data: { action: 'getSeatConfig', concertId: this.concertId },
					success: (res) => {
						this.loading = false
						if (res.result.code === 0) {
							const d = res.result.data
							this.concertTitle = d.concert.title || '未命名场次'
							this.seatEnabled = !!d.concert.seat_enabled
							this.seatVersion = d.concert.seat_version || 1
							this.seatAreas = (d.areas || []).map(a => this.decorateArea({
								_id: a._id,
								name: a.name,
								rows: a.rows,
								cols: a.cols,
								rowLabelType: a.rowLabelType,
								price: a.price,
								color: a.color,
								sort: a.sort,
								gridX: a.gridX,
								gridY: a.gridY,
								isStage: !!a.isStage,
								stageW: a.stageW,
								stageH: a.stageH,
								rowLabels: a.rowLabels || [],
								colLabels: a.colLabels || [],
								labelRule: a.labelRule || null
							}))
							this.seatMaxPerUser = String(d.concert.max_seats_per_user != null ? d.concert.max_seats_per_user : 6)
							// 座位配色回显：云函数始终存完整四键；与内置默认相同的视为未设置（置空），仅自定义色差才回填
							const savedColors = d.concert.seat_colors || {}
							SEAT_COLOR_DEFS.forEach(c => {
								const v = String(savedColors[c.key] || '').toLowerCase()
								this.seatColors[c.key] = (/^#[0-9a-fA-F]{6}$/.test(v) && v !== SEAT_COLOR_DEFAULTS[c.key]) ? v : ''
							})
							this.seatSelectionCount = d.selectionCount || 0
							// 配置变更后已选记录需重新拉取
							this.seatLoadedSelections = false
							this.seatSelections = []
							this.showSelections = false
							this.selectedIndex = this.seatAreas.length > 0 ? 0 : -1
							this.dirty = false
							this.fitCanvas()
							uni.setNavigationBarTitle({ title: '座位表配置 - ' + this.concertTitle })
						} else {
							uni.showToast({ title: res.result.message || '加载失败', icon: 'none' })
						}
					},
					fail: (err) => {
						this.loading = false
						console.error('加载座位配置失败', err)
						uni.showToast({ title: '加载失败', icon: 'none' })
					}
				})
			},

			// 补齐编号规则与面板 UI 字段
			decorateArea(area) {
				const rule = area.labelRule || {}
				area.rowLabelType = Number(area.rowLabelType) || 1
				area.gridX = Number(area.gridX) || 0
				area.gridY = Number(area.gridY) || 0
				area.stageW = Number(area.stageW) || (area.isStage ? (parseInt(area.cols) || 10) : 0)
				area.stageH = Number(area.stageH) || (area.isStage ? (parseInt(area.rows) || 2) : 0)
				area.rowLabels = Array.isArray(area.rowLabels) ? area.rowLabels : []
				area.colLabels = Array.isArray(area.colLabels) ? area.colLabels : []
				area.labelRule = {
					row: Object.assign(this.defaultRule('number', '排'), rule.row || {}),
					col: Object.assign(this.defaultRule('number', ''), rule.col || {})
				}
				area.showLabelPanel = false
				area.editingKind = ''
				area.editText = ''
				return area
			},

			addSeatArea(isStage) {
				const idx = this.seatAreas.length
				const colors = ['#4A90D9', '#E6A23C', '#67C23A', '#F56C6C', '#9C27B0', '#00BCD4']
				this.seatAreas.push(this.decorateArea({
					_id: '',
					name: isStage ? '舞台' : '',
					rows: isStage ? 2 : 10,
					cols: isStage ? 20 : 20,
					rowLabelType: 1,
					price: 0,
					color: isStage ? '#667eea' : colors[idx % colors.length],
					sort: idx,
					gridX: this.canvasGrid.w,
					gridY: 0,
					isStage: !!isStage,
					stageW: isStage ? 20 : 0,
					stageH: isStage ? 2 : 0,
					rowLabels: [],
					colLabels: [],
					labelRule: null
				}))
				this.selectedIndex = idx
				this.dirty = true
			},

			removeSeatArea(idx) {
				const area = this.seatAreas[idx]
				const doRemove = () => {
					this.seatAreas.splice(idx, 1)
					this.selectedIndex = this.seatAreas.length > 0 ? 0 : -1
					this.dirty = true
				}
				if (area && !area.isStage && this.seatSelectionCount > 0) {
					uni.showModal({
						title: '删除分区',
						content: `删除「${area.name || '未命名分区'}」会同时清理该区的选座记录，确定删除吗？`,
						confirmText: '删除',
						success: (m) => { if (m.confirm) doRemove() }
					})
					return
				}
				doRemove()
			},

			selectArea(idx) {
				this.selectedIndex = idx
			},

			toggleStage(idx) {
				const area = this.seatAreas[idx]
				area.isStage = !area.isStage
				if (area.isStage) {
					area.stageW = Number(area.stageW) || parseInt(area.cols) || 20
					area.stageH = Number(area.stageH) || 2
					area.rowLabels = []
					area.colLabels = []
					area.showLabelPanel = false
					area.editingKind = ''
				}
				this.dirty = true
			},

			onRowLabelChange(idx, e) {
				this.seatAreas[idx].rowLabelType = Number(e.detail.value) + 1
				this.dirty = true
			},

			// ===== 画布排版：拖拽、缩放、辅助线 =====
			// 色块上用 catchtouchmove 阻止冒泡，拖拽时不会带动 scroll-view 滚动
			pickPoint(e) {
				const t = (e && e.touches && e.touches[0]) || (e && e.changedTouches && e.changedTouches[0]) || e || {}
				return { x: Number(t.clientX) || 0, y: Number(t.clientY) || 0 }
			},

			startDrag(item, x, y) {
				if (!item) return
				this.selectedIndex = item.index
				// 上一次手势的 touchend 可能因中断没触发，这里直接覆盖，避免拖不动
				this.dragging = {
					index: item.index,
					startX: x,
					startY: y,
					originX: Number(item.gridX) || 0,
					originY: Number(item.gridY) || 0,
					moved: false
				}
			},

			onBlockTouchStart(item, e) {
				this.lastTouchAt = Date.now()
				const p = this.pickPoint(e)
				this.startDrag(item, p.x, p.y)
			},

			// H5 浏览器预览下鼠标不会触发 touch 事件，用 mouse 补齐
			onBlockMouseDown(item, e) {
				if (Date.now() - this.lastTouchAt < 800) return
				const p = this.pickPoint(e)
				this.startDrag(item, p.x, p.y)
			},

			onDragTouchMove(e) {
				if (!this.dragging) return
				const p = this.pickPoint(e)
				this.moveDrag(p.x, p.y)
			},

			moveDrag(x, y) {
				const drag = this.dragging
				if (!drag) return
				const dx = x - drag.startX
				const dy = y - drag.startY
				// 3px 内视为点击，不搬色块
				if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
				const cell = this.cellSize
				if (!cell) return
				// rpx → px，把像素位移换算成格数
				const cellPx = uni.upx2px(cell)
				if (!cellPx) return
				const area = this.seatAreas[drag.index]
				if (!area) return
				const ext = this.blockExtent[drag.index]
				if (!drag.moved) {
					drag.moved = true
					uni.vibrateShort({ fail: () => {} })
				}
				let nx = drag.originX + dx / cellPx
				let ny = drag.originY + dy / cellPx

				// 默认吸附 0.5 格
				nx = Math.max(0, Math.round(nx * 2) / 2)
				ny = Math.max(0, Math.round(ny * 2) / 2)

				// 与其他座位区边缘智能对齐（0.4 格内吸附并显示辅助线）
				const guides = []
				if (!area.isStage) {
					this.seatAreas.forEach((other, i) => {
						if (i === drag.index || other.isStage) return
						const oExt = this.blockExtent[i]
						const ox = Number(other.gridX) || 0
						const oy = Number(other.gridY) || 0
						if (Math.abs(nx - ox) < 0.4) { guides.push({ type: 'v', pos: ox }); nx = ox }
						if (Math.abs((nx + ext.cols) - (ox + oExt.cols)) < 0.4) {
							guides.push({ type: 'v', pos: ox + oExt.cols })
							nx = ox + oExt.cols - ext.cols
						}
						if (Math.abs(ny - oy) < 0.4) { guides.push({ type: 'h', pos: oy }); ny = oy }
						if (Math.abs((ny + ext.rows) - (oy + oExt.rows)) < 0.4) {
							guides.push({ type: 'h', pos: oy + oExt.rows })
							ny = oy + oExt.rows - ext.rows
						}
					})
				}

				area.gridX = Math.max(0, Math.round(nx * 2) / 2)
				area.gridY = Math.max(0, Math.round(ny * 2) / 2)
				this.alignGuides = guides
			},

			moveDragEnd() {
				if (this.dragging && this.dragging.moved) this.dirty = true
				this.dragging = null
				this.alignGuides = []
			},

			guideStyle(g) {
				const cell = this.cellSize
				if (g.type === 'v') {
					return { left: (CANVAS_PAD + g.pos * cell) + 'rpx', top: '0', width: '2rpx', height: this.canvasPx.h + 'rpx' }
				}
				return { top: (CANVAS_PAD + g.pos * cell) + 'rpx', left: '0', height: '2rpx', width: this.canvasPx.w + 'rpx' }
			},

			blockStyle(item) {
				return {
					left: item.left + 'rpx',
					top: item.top + 'rpx',
					width: item.width + 'rpx',
					height: item.height + 'rpx',
					background: item.isStage ? 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' : this.hexToRgba(item.color, 0.35),
					borderColor: item.color
				}
			},

			hexToRgba(hex, alpha) {
				const h = String(hex || '').replace('#', '')
				if (h.length !== 6) return `rgba(74,144,217,${alpha})`
				const r = parseInt(h.substr(0, 2), 16)
				const g = parseInt(h.substr(2, 2), 16)
				const b = parseInt(h.substr(4, 2), 16)
				return `rgba(${r},${g},${b},${alpha})`
			},

			zoom(delta) {
				const next = Math.round((this.previewScale + delta) * 10) / 10
				this.previewScale = Math.min(Math.max(next, 0.3), 2)
			},

			// 让整个场馆可见
			fitCanvas() {
				if (this.canvasGrid.w <= 0 || this.canvasGrid.h <= 0) {
					this.previewScale = 1
					return
				}
				const fitW = VIEW_W / (this.canvasGrid.w * PREVIEW_CELL)
				const fitH = VIEW_H / (this.canvasGrid.h * PREVIEW_CELL)
				const s = Math.min(fitW, fitH, 2)
				this.previewScale = Math.round(Math.max(s, 0.3) * 10) / 10
			},

			stepGrid(idx, field, delta) {
				const area = this.seatAreas[idx]
				const next = (Number(area[field]) || 0) + delta
				area[field] = Math.max(0, Math.round(next * 2) / 2)
				this.dirty = true
			},

			normalizeGridField(idx, field) {
				const area = this.seatAreas[idx]
				const num = Number(area[field])
				area[field] = isFinite(num) && num >= 0 ? Math.round(num * 2) / 2 : 0
				this.dirty = true
			},

			// 一键横向排开，避免重叠（舞台区排在座位区下方）
			autoLayout() {
				const seatList = this.seatAreas.filter(a => !a.isStage)
				const stageList = this.seatAreas.filter(a => a.isStage)
				const gap = 2
				let x = 0
				seatList.forEach(a => {
					a.gridX = x
					a.gridY = 0
					x += (parseInt(a.cols) || 0) + gap
				})
				const maxRows = seatList.reduce((m, a) => Math.max(m, parseInt(a.rows) || 0), 0)
				let sx = 0
				stageList.forEach(a => {
					a.gridX = sx
					a.gridY = maxRows + 2
					sx += (Number(a.stageW) || 0) + gap
				})
				this.dirty = true
				this.fitCanvas()
				uni.showToast({ title: '已按横向顺序排布，可再微调', icon: 'none' })
			},

			// ===== 行列数变化时同步编号数组 =====
			onSizeChange(idx, field) {
				const area = this.seatAreas[idx]
				let count = parseInt(area[field]) || 0
				if (count < 1) count = 1
				if (count > 100) count = 100
				area[field] = count
				this.dirty = true

				const key = field === 'rows' ? 'rowLabels' : 'colLabels'
				const list = area[key] || []
				if (list.length === 0 || list.length === count) return
				uni.showActionSheet({
					itemList: ['按当前规则重新生成编号', '保留已有编号，末尾留空', '清空自定义编号'],
					success: (r) => {
						if (r.tapIndex === 0) {
							this.generateLabels(idx, field === 'rows' ? 'row' : 'col')
						} else if (r.tapIndex === 1) {
							const next = list.slice(0, count)
							while (next.length < count) next.push('')
							area[key] = next
						} else {
							area[key] = []
						}
					}
				})
			},

			// ===== 自定义编号 =====
			labelTypeIndex(type) {
				const i = this.labelTypes.indexOf(type)
				return i > -1 ? i : 0
			},

			onLabelTypeChange(idx, kind, e) {
				const area = this.seatAreas[idx]
				const type = this.labelTypes[Number(e.detail.value)]
				area.labelRule[kind].type = type
				if (type === 'letter') {
					if (!isNaN(Number(area.labelRule[kind].start))) area.labelRule[kind].start = 'A'
				} else if (!isFinite(Number(area.labelRule[kind].start))) {
					area.labelRule[kind].start = 1
				}
				this.dirty = true
			},

			labelList(idx, kind) {
				const area = this.seatAreas[idx]
				return area[kind === 'row' ? 'rowLabels' : 'colLabels'] || []
			},

			labelNeed(idx, kind) {
				const area = this.seatAreas[idx]
				return kind === 'row' ? (parseInt(area.rows) || 0) : (parseInt(area.cols) || 0)
			},

			labelCountMismatch(idx, kind) {
				const list = this.labelList(idx, kind)
				if (list.length === 0) return false
				return list.length !== this.labelNeed(idx, kind)
			},

			hasCustomLabel(idx) {
				return this.labelList(idx, 'row').length > 0 || this.labelList(idx, 'col').length > 0
			},

			toggleLabelPanel(idx) {
				const area = this.seatAreas[idx]
				area.showLabelPanel = !area.showLabelPanel
				this.selectedIndex = idx
			},

			letterOf(index) {
				// 1→A、26→Z、27→AA
				let n = index - 1
				let label = ''
				do {
					label = String.fromCharCode(65 + (n % 26)) + label
					n = Math.floor(n / 26) - 1
				} while (n >= 0)
				return label
			},

			toChinese(n) {
				if (!isFinite(n) || n <= 0) return String(n)
				if (n < 10) return CN_NUM[n]
				if (n < 20) return '十' + (n === 10 ? '' : CN_NUM[n - 10])
				if (n < 100) {
					const ones = n % 10
					return CN_NUM[Math.floor(n / 10)] + '十' + (ones === 0 ? '' : CN_NUM[ones])
				}
				return String(n)
			},

			genLabels(rule, count) {
				const out = []
				const type = rule.type || 'number'
				for (let i = 0; i < count; i++) {
					let v = ''
					if (type === 'letter') {
						const code = String(rule.start || 'A').toUpperCase().charCodeAt(0)
						const base = isFinite(code) ? code - 65 : 0
						let pos = base + i * (Number(rule.step) || 1)
						if (pos < 0) pos = 0
						v = this.letterOf(pos + 1)
					} else if (type === 'chinese') {
						v = this.toChinese((Number(rule.start) || 1) + i * (Number(rule.step) || 1))
					} else {
						let num = String((Number(rule.start) || 1) + i * (Number(rule.step) || 1))
						const pad = parseInt(rule.pad) || 0
						if (pad > 0 && num.length < pad) num = ('000' + num).slice(-pad)
						v = num
					}
					out.push(`${rule.prefix || ''}${v}${rule.suffix || ''}`)
				}
				return out
			},

			generateLabels(idx, kind) {
				const area = this.seatAreas[idx]
				const count = this.labelNeed(idx, kind)
				if (count < 1) {
					uni.showToast({ title: '请先填写排数和列数', icon: 'none' })
					return
				}
				if (area.labelRule[kind].type === 'custom') {
					uni.showToast({ title: '自定义类型请用手动编辑录入', icon: 'none' })
					return
				}
				const list = this.genLabels(area.labelRule[kind], count)
				const tooLong = list.find(t => t.length > 8)
				if (tooLong) {
					uni.showToast({ title: `编号「${tooLong}」超过 8 个字符，请缩短前后缀`, icon: 'none' })
					return
				}
				area[kind === 'row' ? 'rowLabels' : 'colLabels'] = list
				area.editingKind = ''
				this.dirty = true
				uni.showToast({ title: `已生成 ${count} 个${kind === 'row' ? '排号' : '列号'}`, icon: 'none' })
			},

			quickLabels(idx, mode) {
				const area = this.seatAreas[idx]
				const cols = parseInt(area.cols) || 0
				if (cols < 1) {
					uni.showToast({ title: '请先填写列数', icon: 'none' })
					return
				}
				const rule = area.labelRule.col
				if (mode === 'desc') {
					// 倒序 = 反转当前列号，保留刚生成的单/双号等结果；没有有效编号时才按 cols…1 重建
					const list = (area.colLabels || []).slice(0, cols)
					if (list.length === cols && list.some(t => String(t).trim() !== '')) {
						list.reverse()
						area.colLabels = list
						this.syncRuleFromLabels(rule, list)
						uni.showToast({ title: '已倒序当前列号', icon: 'none' })
					} else {
						rule.type = 'number'
						rule.start = cols
						rule.step = -1
						area.colLabels = this.genLabels(rule, cols)
						uni.showToast({ title: '已生成倒序列号', icon: 'none' })
					}
					area.editingKind = ''
					this.dirty = true
					return
				}
				rule.type = 'number'
				if (mode === 'odd') { rule.start = 1; rule.step = 2 }
				else { rule.start = 2; rule.step = 2 }
				area.colLabels = this.genLabels(rule, cols)
				area.editingKind = ''
				this.dirty = true
			},

			// 用编号数组反推生成规则：倒序后保持单/双号步长，“批量生成”不会又变回升序
			syncRuleFromLabels(rule, list) {
				const nums = list.map(t => {
					const m = String(t).match(/-?\d+(?:\.\d+)?/)
					return m ? Number(m[0]) : NaN
				})
				const step = nums.length > 1 ? nums[1] - nums[0] : -1
				const uniform = step !== 0 && nums.every((n, i) => isFinite(n) && n === nums[0] + i * step)
				if (uniform) {
					rule.type = 'number'
					rule.start = nums[0]
					rule.step = step
				} else {
					// 非等差（手动混编）标记为自定义，避免再点批量生成把倒序结果冲掉
					rule.type = 'custom'
				}
			},

			toggleLabelEdit(idx, kind) {
				const area = this.seatAreas[idx]
				if (area.editingKind === kind) {
					area.editingKind = ''
					return
				}
				const list = this.labelList(idx, kind)
				area.editText = list.length > 0 ? list.join(',') : ''
				area.editingKind = kind
			},

			applyLabelEditText(idx, kind) {
				const area = this.seatAreas[idx]
				const count = this.labelNeed(idx, kind)
				const parts = String(area.editText || '').split(/[\n\r,，、;；\t]+/).map(t => t.trim()).filter(t => t !== '')
				if (parts.length !== count) {
					uni.showToast({ title: `编号 ${parts.length} 个，与${kind === 'row' ? '排数' : '列数'} ${count} 不一致`, icon: 'none' })
					return
				}
				const tooLong = parts.find(t => t.length > 8)
				if (tooLong) {
					uni.showToast({ title: `编号「${tooLong}」超过 8 个字符`, icon: 'none' })
					return
				}
				area[kind === 'row' ? 'rowLabels' : 'colLabels'] = parts
				area.labelRule[kind].type = 'custom'
				area.editingKind = ''
				this.dirty = true
				uni.showToast({ title: '已应用编号', icon: 'none' })
			},

			cancelLabelEdit(idx) {
				this.seatAreas[idx].editingKind = ''
			},

			clearLabels(idx, kind) {
				const area = this.seatAreas[idx]
				area[kind === 'row' ? 'rowLabels' : 'colLabels'] = []
				area.editingKind = ''
				this.dirty = true
			},

			labelPreview(idx, kind) {
				const list = this.labelList(idx, kind)
				if (list.length === 0) {
					const area = this.seatAreas[idx]
					if (kind === 'row') {
						return Number(area.rowLabelType) === 2 ? '未设置，默认 A、B、C…' : '未设置，默认 1、2、3…'
					}
					return '未设置，默认 1、2、3…'
				}
				return list.slice(0, 6).join('、') + (list.length > 6 ? ' …' : '')
			},

			// ===== 保存 =====
			validateAreas() {
				if (this.seatAreas.length === 0) return '至少配置一个分区'
				for (let i = 0; i < this.seatAreas.length; i++) {
					const a = this.seatAreas[i]
					const name = String(a.name || '').trim()
					if (!name) return `第${i + 1}个分区未填写名称`
					if (a.isStage) {
						if (!(Number(a.stageW) >= 1) || !(Number(a.stageH) >= 1)) return `「${name}」需填写舞台宽高（格）`
						continue
					}
					const rows = parseInt(a.rows) || 0
					const cols = parseInt(a.cols) || 0
					if (rows < 1 || cols < 1) return `分区「${name}」需填写排数和列数`
					if (this.labelList(i, 'row').length > 0 && this.labelList(i, 'row').length !== rows) {
						return `分区「${name}」排号数量与排数不一致，请重新生成或清空`
					}
					if (this.labelList(i, 'col').length > 0 && this.labelList(i, 'col').length !== cols) {
						return `分区「${name}」列号数量与列数不一致，请重新生成或清空`
					}
				}
				return ''
			},

			saveSeatConfig(force = false) {
				if (this.savingSeat) return
				const errMsg = this.validateAreas()
				if (errMsg) {
					uni.showToast({ title: errMsg, icon: 'none' })
					return
				}
				// 配色格式前端先拦一道（非法且非空才报错），服务端 normalizeSeatColors 会再清洗一次
				const badColor = SEAT_COLOR_DEFS.find(c => {
					const v = String(this.seatColors[c.key] || '').trim()
					return v !== '' && !/^#[0-9a-fA-F]{6}$/.test(v)
				})
				if (badColor) {
					uni.showToast({ title: badColor.name + '颜色格式应为 #RRGGBB', icon: 'none' })
					return
				}
				this.savingSeat = true
				uni.showLoading({ title: '保存中' })
				uniCloud.callFunction({
					name: 'concert-admin',
					data: {
						action: 'saveSeatConfig',
						concertId: this.concertId,
						areas: this.seatAreas,
						maxSeatsPerUser: this.seatMaxPerUser,
						seatColors: this.seatColors,
						force,
						userId: this.userInfo._id
					},
					success: (res) => {
						uni.hideLoading()
						this.savingSeat = false
						if (res.result.code === 0) {
							uni.showToast({ title: res.result.message || '保存成功', icon: 'none' })
							this.loadSeatConfig()
						} else if (res.result.code === 2) {
							// 结构变更或位置重叠，需二次确认
							uni.showModal({
								title: '确认修改',
								content: res.result.message,
								success: (m) => {
									if (m.confirm) this.saveSeatConfig(true)
								}
							})
						} else {
							uni.showToast({ title: res.result.message || '保存失败', icon: 'none' })
						}
					},
					fail: (err) => {
						uni.hideLoading()
						this.savingSeat = false
						console.error('保存座位表失败', err)
						uni.showToast({ title: '保存失败', icon: 'none' })
					}
				})
			},

			// ===== 开放/关闭选座 =====
			// 只改 Concert.seat_enabled：关闭后用户端看不到选座入口，选座页展示「本场次不开放选座」；不动座位布局与已选记录
			toggleSeatEnabled() {
				const next = !this.seatEnabled
				if (next && this.seatAreas.length === 0) {
					uni.showToast({ title: '请先配置并保存座位表', icon: 'none' })
					return
				}
				const doToggle = () => {
					uniCloud.callFunction({
						name: 'concert-admin',
						data: { action: 'setSeatEnabled', concertId: this.concertId, enabled: next, userId: this.userInfo._id },
						success: (res) => {
							if (res.result.code === 0) {
								this.seatEnabled = next
								uni.showToast({ title: next ? '已开放选座' : '已关闭选座', icon: 'none' })
							} else {
								uni.showToast({ title: res.result.message || '操作失败', icon: 'none' })
							}
						},
						fail: () => uni.showToast({ title: '操作失败', icon: 'none' })
					})
				}
				if (next) {
					doToggle()
					return
				}
				uni.showModal({
					title: '关闭选座',
					content: '关闭后用户将看不到选座入口，选座页提示「本场次不开放选座」；已选座位记录保留，重新开放后继续有效。确定关闭吗？',
					confirmText: '关闭选座',
					success: (m) => { if (m.confirm) doToggle() }
				})
			},

			// ===== 已选座位管理 =====
			toggleSeatSelections() {
				if (this.showSelections) {
					this.showSelections = false
					return
				}
				if (this.seatLoadedSelections) {
					this.showSelections = true
					return
				}
				uni.showLoading({ title: '加载中' })
				uniCloud.callFunction({
					name: 'concert-admin',
					data: { action: 'getSeatSelections', concertId: this.concertId, userId: this.userInfo._id },
					success: (res) => {
						uni.hideLoading()
						if (res.result.code === 0) {
							this.seatSelections = res.result.data.list || []
							this.seatSelectionCount = res.result.data.total || this.seatSelections.length
							this.seatLoadedSelections = true
							this.showSelections = true
						} else {
							uni.showToast({ title: res.result.message || '加载失败', icon: 'none' })
						}
					},
					fail: (err) => {
						uni.hideLoading()
						console.error('加载选座记录失败', err)
						uni.showToast({ title: '加载失败', icon: 'none' })
					}
				})
			},

			releaseSeat(sel) {
				uni.showModal({
					title: '释放座位',
					content: `确定释放「${sel.seatLabel}」吗？`,
					success: (m) => {
						if (!m.confirm) return
						uniCloud.callFunction({
							name: 'concert-admin',
							data: {
								action: 'releaseSeats',
								concertId: this.concertId,
								ids: [sel._id],
								userId: this.userInfo._id
							},
							success: (res) => {
								if (res.result.code === 0) {
									const i = this.seatSelections.findIndex(s => s._id === sel._id)
									if (i > -1) this.seatSelections.splice(i, 1)
									this.seatSelectionCount = Math.max(0, this.seatSelectionCount - 1)
									uni.showToast({ title: '已释放', icon: 'none' })
								} else {
									uni.showToast({ title: res.result.message || '释放失败', icon: 'none' })
								}
							},
							fail: () => uni.showToast({ title: '释放失败', icon: 'none' })
						})
					}
				})
			},

			releaseAllSeats() {
				uni.showModal({
					title: '全部释放',
					content: '确定释放本场所有已选座位吗？此操作不可撤销。',
					success: (m) => {
						if (!m.confirm) return
						uni.showLoading({ title: '处理中' })
						uniCloud.callFunction({
							name: 'concert-admin',
							data: {
								action: 'releaseSeats',
								concertId: this.concertId,
								all: true,
								userId: this.userInfo._id
							},
							success: (res) => {
								uni.hideLoading()
								if (res.result.code === 0) {
									this.seatSelections = []
									this.seatSelectionCount = 0
									uni.showToast({ title: res.result.message || '已释放', icon: 'none' })
								} else {
									uni.showToast({ title: res.result.message || '释放失败', icon: 'none' })
								}
							},
							fail: () => { uni.hideLoading(); uni.showToast({ title: '释放失败', icon: 'none' }) }
						})
					}
				})
			},

			goBack() {
				uni.navigateBack()
			}
		}
	}
</script>

<style lang="scss">
.seat-config-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding-bottom: 180rpx;
}

.loading-box {
	text-align: center;
	padding: 160rpx 0;
	color: #999;
	font-size: 28rpx;
}

.page-header {
	background: #fff;
	margin: 20rpx 30rpx;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);

	.ph-title { font-size: 32rpx; font-weight: bold; color: #333; }

	.ph-status {
		display: flex;
		align-items: center;
		margin-top: 16rpx;

		.status-tag {
			font-size: 22rpx;
			padding: 6rpx 18rpx;
			border-radius: 20rpx;
			margin-right: 16rpx;

			&.on { background: #e8f5e9; color: #2e7d32; }
			&.off { background: #f0f0f0; color: #888; }
		}

		.status-toggle {
			font-size: 22rpx;
			padding: 6rpx 18rpx;
			border-radius: 20rpx;
			margin-right: 16rpx;
			background: #e3f2fd;
			color: #1565c0;
			&.off { background: #fff3e0; color: #ef6c00; }
		}

		.ph-version { font-size: 24rpx; color: #999; }
	}

	.ph-meta {
		display: flex;
		flex-wrap: wrap;
		margin-top: 12rpx;

		.ph-meta-item {
			font-size: 22rpx;
			color: #1976D2;
			background: #e3f2fd;
			border-radius: 8rpx;
			padding: 6rpx 14rpx;
			margin-right: 12rpx;
		}
	}

	.ph-warn {
		font-size: 24rpx;
		color: #e65100;
		background: #fff3e0;
		border-radius: 12rpx;
		padding: 12rpx 16rpx;
		margin-top: 16rpx;
	}
}

.content { padding: 0 30rpx; }

.section {
	background: #fff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.section-title { font-size: 28rpx; font-weight: 600; color: #333; }

	.head-btns { display: flex; gap: 12rpx; }

	.mini-btn {
		font-size: 22rpx;
		color: #fff;
		background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
		border-radius: 20rpx;
		padding: 8rpx 18rpx;

		&.purple { background: linear-gradient(135deg, #7E57C2 0%, #5E35B1 100%); }
		&.gray { background: #90a4ae; }
	}

	.meta-row {
		display: flex;
		align-items: center;
		justify-content: space-between;

		.meta-label { font-size: 26rpx; color: #666; flex: 1; margin-right: 20rpx; }

		.meta-input {
			width: 200rpx;
			height: 72rpx;
			background: #f5f5f5;
			border-radius: 12rpx;
			padding: 0 24rpx;
			font-size: 28rpx;
			text-align: right;
		}
	}

	/* 座位状态配色编辑 */
	.color-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 16rpx;

		.color-swatch {
			width: 44rpx;
			height: 44rpx;
			border-radius: 8rpx;
			border: 1rpx solid rgba(0, 0, 0, 0.12);
			flex-shrink: 0;
		}

		.color-name {
			font-size: 26rpx;
			color: #666;
			width: 64rpx;
			flex-shrink: 0;
		}

		.color-presets {
			display: flex;
			gap: 8rpx;
			flex: 1;
			flex-wrap: wrap;

			.color-preset {
				width: 40rpx;
				height: 40rpx;
				border-radius: 8rpx;
				border: 1rpx solid rgba(0, 0, 0, 0.08);
			}
		}

		.color-hex {
			width: 160rpx;
			height: 56rpx;
			background: #f5f5f5;
			border-radius: 10rpx;
			padding: 0 12rpx;
			font-size: 24rpx;
			flex-shrink: 0;
		}
	}

	.color-tip {
		display: block;
		margin-top: 12rpx;
		font-size: 22rpx;
		color: #999;
	}

	.add-area-btn {
		font-size: 26rpx;
		color: #fff;
		background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
		border-radius: 24rpx;
		padding: 10rpx 24rpx;
	}

	/* 布局总览画布 */
	.canvas-toolbar {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 12rpx;

		.ct-btn {
			width: 56rpx;
			height: 52rpx;
			line-height: 52rpx;
			text-align: center;
			background: #f2f3f7;
			border-radius: 10rpx;
			font-size: 28rpx;
			color: #333;

			&.fit {
				width: auto;
				padding: 0 18rpx;
				font-size: 24rpx;
				color: #1976D2;
				background: #e3f2fd;
			}
		}

		.ct-scale {
			font-size: 24rpx;
			color: #666;
			min-width: 78rpx;
			text-align: center;
		}

		.ct-info {
			flex: 1;
			text-align: right;
			font-size: 20rpx;
			color: #999;
		}
	}

	.layout-scroll {
		width: 100%;
		height: 460rpx;
		background: #fafcff;
		border: 1rpx dashed #b0bec5;
		border-radius: 12rpx;
	}

	.layout-canvas { position: relative; }

	.align-guide {
		position: absolute;
		background: #ff5252;
		z-index: 5;

		&.v { top: 0; }
		&.h { left: 0; }
	}

	.layout-block {
		position: absolute;
		border: 2rpx solid #4A90D9;
		border-radius: 6rpx;
		box-sizing: border-box;
		overflow: hidden;
		padding: 4rpx 6rpx;

		&.active {
			border-width: 4rpx;
			box-shadow: 0 0 14rpx rgba(33, 150, 243, 0.6);
		}

		&.overlap {
			border-color: #ff5252;
			background: rgba(255, 82, 82, 0.25);
		}

		&.dragging {
			z-index: 5;
			border-width: 4rpx;
			box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.3);
		}

		&.stage { color: #fff; text-align: center; }

		.lb-name {
			display: block;
			font-size: 20rpx;
			line-height: 26rpx;
			color: #1a237e;
		}

		&.stage .lb-name { color: #fff; }

		.lb-sub {
			display: block;
			font-size: 16rpx;
			line-height: 22rpx;
			color: #607d8b;
		}

		&.stage .lb-sub { color: rgba(255, 255, 255, 0.85); }

		.lb-pos {
			display: block;
			font-size: 16rpx;
			color: #e65100;
		}
	}

	.canvas-empty {
		position: absolute;
		left: 30rpx;
		top: 30rpx;
		font-size: 24rpx;
		color: #aaa;
	}

	.overlap-warn {
		font-size: 22rpx;
		color: #c62828;
		margin-top: 10rpx;
	}

	.area-card {
		background: #fafafa;
		border: 1rpx solid #eee;
		border-radius: 16rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;

		&.active { border-color: #2196F3; background: #f4faff; }

		.area-card-head {
			display: flex;
			align-items: center;
			margin-bottom: 16rpx;

			.area-index {
				flex: 1;
				font-size: 28rpx;
				font-weight: 600;
				color: #333;
				margin-left: 12rpx;
			}

			.area-del {
				font-size: 24rpx;
				color: #c62828;
				padding: 6rpx 16rpx;
			}
		}

		.area-row {
			display: flex;
			gap: 16rpx;
			margin-bottom: 12rpx;

			.area-field {
				flex: 1;
				min-width: 0;

				&.grow { flex: 2; }
				&.type-chk { flex: 1.2; }

				&.total-seats { display: flex; flex-direction: column; }

				.af-label {
					display: block;
					font-size: 22rpx;
					color: #999;
					margin-bottom: 6rpx;
				}

				.af-input {
					height: 64rpx;
					background: #fff;
					border: 1rpx solid #e0e0e0;
					border-radius: 10rpx;
					padding: 0 16rpx;
					font-size: 26rpx;
				}

				.af-picker-val {
					height: 64rpx;
					line-height: 64rpx;
					background: #fff;
					border: 1rpx solid #e0e0e0;
					border-radius: 10rpx;
					padding: 0 16rpx;
					font-size: 26rpx;
				}

				.af-val {
					height: 64rpx;
					line-height: 64rpx;
					font-size: 26rpx;
					color: #2196F3;
				}

				.af-switch {
					display: flex;
					align-items: center;
					height: 64rpx;

					.sw-box {
						width: 60rpx;
						height: 34rpx;
						border-radius: 17rpx;
						background: #cfd8dc;
						position: relative;

						.sw-dot {
							position: absolute;
							left: 4rpx;
							top: 4rpx;
							width: 26rpx;
							height: 26rpx;
							border-radius: 50%;
							background: #fff;
						}

						&.on {
							background: #7E57C2;

							.sw-dot { left: 30rpx; }
						}
					}

					.sw-text {
						font-size: 22rpx;
						color: #666;
						margin-left: 12rpx;
					}
				}

				.stepper {
					display: flex;
					align-items: center;
					background: #fff;
					border: 1rpx solid #e0e0e0;
					border-radius: 10rpx;
					overflow: hidden;

					.st-btn {
						width: 58rpx;
						height: 60rpx;
						line-height: 60rpx;
						text-align: center;
						background: #f2f3f7;
						font-size: 28rpx;
						color: #1976D2;
					}

					.st-input {
						flex: 1;
						height: 60rpx;
						text-align: center;
						font-size: 26rpx;
					}
				}
			}
		}
	}

	.label-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: #eef2f7;
		border-radius: 10rpx;
		padding: 14rpx 18rpx;
		font-size: 24rpx;
		color: #1976D2;
		margin-top: 6rpx;

		.lt-tag {
			font-size: 20rpx;
			color: #fff;
			background: #ff9800;
			border-radius: 8rpx;
			padding: 2rpx 10rpx;
		}
	}

	.label-panel {
		background: #fff;
		border: 1rpx solid #e3e8ef;
		border-radius: 12rpx;
		padding: 16rpx;
		margin-top: 12rpx;

		.lr-group {
			padding-bottom: 16rpx;
			margin-bottom: 16rpx;
			border-bottom: 1rpx dashed #e0e0e0;

			&:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
		}

		.lr-title {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 24rpx;
			color: #333;
			margin-bottom: 10rpx;

			.lr-count {
				font-size: 20rpx;
				color: #4caf50;

				&.bad { color: #e53935; }
			}
		}

		.lr-row {
			display: flex;
			align-items: center;
			gap: 10rpx;
			margin-bottom: 10rpx;
			flex-wrap: wrap;

			.lr-picker { min-width: 150rpx; }

			.lr-input {
				flex: 1;
				min-width: 96rpx;
				height: 60rpx;
				background: #f7f8fa;
				border: 1rpx solid #e0e0e0;
				border-radius: 10rpx;
				padding: 0 12rpx;
				font-size: 24rpx;
			}

			.lr-btn {
				font-size: 22rpx;
				color: #1976D2;
				background: #e3f2fd;
				border-radius: 10rpx;
				padding: 10rpx 16rpx;

				&.main {
					background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
					color: #fff;
				}

				&.gray { background: #eceff1; color: #78909c; }
			}
		}

		.lr-edit {
			margin-bottom: 10rpx;

			.lr-textarea {
				width: 100%;
				height: 140rpx;
				background: #f7f8fa;
				border: 1rpx solid #e0e0e0;
				border-radius: 10rpx;
				padding: 12rpx;
				font-size: 24rpx;
				box-sizing: border-box;
			}
		}

		.lr-preview {
			font-size: 22rpx;
			color: #666;
			background: #fafafa;
			border-radius: 10rpx;
			padding: 10rpx 12rpx;
		}

		.lr-tip {
			font-size: 20rpx;
			color: #999;
			margin-top: 12rpx;
		}
	}

	.empty-area {
		text-align: center;
		color: #999;
		font-size: 26rpx;
		padding: 30rpx 0;
	}

	.seat-total {
		text-align: right;
		font-size: 26rpx;
		color: #2196F3;
		margin-top: 10rpx;
	}

	.sel-toggle {
		font-size: 26rpx;
		color: #2196F3;
	}

	.seat-sel-list {
		background: #fafafa;
		border-radius: 12rpx;
		padding: 12rpx;

		.sel-toolbar {
			display: flex;
			justify-content: flex-end;
			margin-bottom: 10rpx;

			.sel-release-all {
				font-size: 24rpx;
				color: #c62828;
				padding: 6rpx 16rpx;
			}
		}

		.sel-item {
			display: flex;
			align-items: center;
			background: #fff;
			border-radius: 10rpx;
			padding: 14rpx 16rpx;
			margin-bottom: 10rpx;

			.sel-info {
				flex: 1;
				margin-left: 14rpx;
				display: flex;
				flex-direction: column;

				.sel-label { font-size: 26rpx; color: #333; }
				.sel-user { font-size: 22rpx; color: #999; }
			}

			.sel-release {
				font-size: 24rpx;
				color: #c62828;
				padding: 6rpx 16rpx;
			}
		}

		.sel-empty {
			text-align: center;
			color: #999;
			font-size: 24rpx;
			padding: 24rpx 0;
		}
	}
}

.area-color-dot {
	width: 28rpx;
	height: 28rpx;
	border-radius: 50%;
	flex-shrink: 0;
	border: 1rpx solid rgba(0, 0, 0, 0.1);
}

.footer-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	gap: 20rpx;
	background: #fff;
	padding: 16rpx 30rpx calc(16rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.08);
	z-index:9;

	.footer-btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		border: none;
		border-radius: 40rpx;
		font-size: 30rpx;
		margin: 0;

		&.back { background: #f5f5f5; color: #666; }

		&.save {
			background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
			color: #fff;

			&[disabled] { opacity: 0.5; }
		}
	}
}
</style>
