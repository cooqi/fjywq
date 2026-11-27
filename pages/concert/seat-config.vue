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
				<view class="ph-warn" v-if="seatSelectionCount > 0">已有 {{seatSelectionCount}} 条选座记录：改动行列数或增删分区（含舞台）会清理受影响记录；只调整分区位置、编号不影响已选座位</view>
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
							<text class="mini-btn danger" @click="clearAllLayout">清空布局</text>
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
							<view class="canvas-empty" v-if="layoutBlocks.length === 0">布局已清空或还没有分区，点击上方「+ 分区」开始配置</view>
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
									<text class="af-val">{{ areaSeatCount(area) }} 座<text v-if="!area.isStage && areaInvalidCountOf(area) > 0" class="af-inv-note">（已扣无效 {{ areaInvalidCountOf(area) }}）</text></text>
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

					<view class="seat-total">座位总数：{{ seatTotalSeats }} 座（不含舞台区与无效座位）</view>
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
						<input class="color-hex" :value="seatColors[c.key]" @input="onSeatColorInput(c.key, $event)" placeholder="可自定义" maxlength="7" />
					</view>
					<text class="color-tip">选预设色或手填 #RRGGBB；留空为默认配色</text>
				</view>

				<!-- 无效座位：点格直接切换无效态；无效座位在用户端不可选择 -->
				<view class="section">
					<view class="section-head">
						<text class="section-title">无效座位</text>
						<text class="mini-btn gray" @click="clearInvalidOfArea">清除本区标记</text>
					</view>
					<view class="inv-hide-row">
						<text class="ih-label">隐藏无效座位</text>
						<switch :checked="hideInvalidSeats" color="#9e9e9e" style="transform:scale(0.8)" @change="onHideInvalidChange" />
						<text class="ih-tip">开启后用户端不显示未被占用的无效座位</text>
					</view>
					<view class="tag-tip" v-if="tagAreaList.length === 0">先在「分区配置」添加座位区（舞台/装饰区不设置无效座位）</view>
					<block v-else>
						<scroll-view class="tag-area-scroll" scroll-x>
							<view class="ta-chip" v-for="(a, ai) in tagAreaList" :key="a.index" :class="{ on: invAreaIndex === ai }" @click="switchInvArea(ai)">{{ a.name }}</view>
						</scroll-view>
						<view class="tag-grid-head" v-if="invArea">
							<text class="tgh-info">{{ invArea.name }}：无效 {{ invAreaInvalidCount }} 座 · 全场共 {{ invalidTotalCount }} 座</text>
							<view class="tgh-btns">
								<text class="tgh-btn" :class="{ paint: invPaintMode }" @click="toggleInvPaintMode">{{ invPaintMode ? '退出涂选' : '滑动涂选' }}</text>
							</view>
						</view>
						<view class="tag-last-tap" v-if="invLastTap">
							<text class="tlt-state" :class="{ off: !invLastTap.on }">{{ invLastTap.on ? '已设为无效' : '已恢复有效' }}</text>
							<text class="tlt-label">{{ invLastTap.label }}</text>
						</view>
						<view class="tag-tip" v-if="invArea && invArea.rows * invArea.cols > tagSeatLimit">该分区座位数超过 {{ tagSeatLimit }}，请先缩小行列数再设置无效座位</view>
						<scroll-view class="tag-seat-scroll" v-else-if="invArea" :scroll-x="!invPaintMode" :scroll-y="!invPaintMode">
							<view class="ts-canvas inv-grid" id="inv-grid" :style="{ width: invGridW + 'rpx', height: invGridH + 'rpx' }" @touchstart="onInvTouchStart" @touchmove="onInvTouchMove" @touchend="onInvTouchEnd" @touchcancel="onInvTouchEnd" @mousedown="onInvMouseDown" @mousemove="onInvMouseMove" @mouseup="onInvMouseUp" @mouseleave="onInvMouseUp">
								<view class="ts-corner" :style="{ width: tagAxisW + 'rpx', height: tagAxisH + 'rpx' }"></view>
								<view class="ts-col-label" v-for="c in invArea.cols" :key="'ic' + c" :style="{ left: (tagAxisW + (c - 1) * tagCell) + 'rpx', width: tagCell + 'rpx', height: tagAxisH + 'rpx', lineHeight: tagAxisH + 'rpx' }">{{ tagColLabel(c, invArea) }}</view>
								<view class="ts-row-label" v-for="r in invArea.rows" :key="'ir' + r" :style="{ top: (tagAxisH + (r - 1) * tagCell) + 'rpx', width: tagAxisW + 'rpx', height: tagCell + 'rpx', lineHeight: tagCell + 'rpx' }">{{ tagRowLabel(r, invArea) }}</view>
								<view
									class="ts-seat"
									:class="{ invalid: cell.invalid }"
									v-for="cell in invSeatCells"
									:key="cell.key"
									:style="{ left: (cell.left + 3) + 'rpx', top: (cell.top + 3) + 'rpx', width: (tagCell - 6) + 'rpx', height: (tagCell - 6) + 'rpx', background: cell.invalid ? invalidColor : '' }"
									@click="toggleInvalidSeat(cell.row, cell.col)"
								>
									<text class="ts-inv-x" v-if="cell.invalid">✕</text>
								</view>
							</view>
						</scroll-view>
						<view class="inv-tip" v-if="invPaintMode">涂选中：网格已锁定滚动，按住拖动即可批量涂选（起点有效格＝涂无效，起点无效格＝恢复）；需要滚动到其他区域时先「退出涂选」</view>
						<view class="inv-tip" v-else>点击单个座位切换无效态；点「滑动涂选」进入涂选模式后可按住拖动批量涂选；无效座位灰底显示 ✕，用户端不可选择。改动需点击底部「保存座位表」生效</view>
					</block>
				</view>

				<!-- 座位标签：多选座位批量打标；标签同时作为用户端筛选条件 -->
				<view class="section">
					<view class="section-head">
						<text class="section-title">座位标签</text>
						<text class="mini-btn" @click="addSeatTag">+ 新增标签</text>
					</view>

					<view class="tag-def-empty" v-if="seatTagDefs.length === 0">还没有标签。点击「+ 新增标签」创建后，可在下方多选座位批量打标；用户端选座页会显示标签圆点，并支持按标签筛选座位。</view>

					<!-- 标签定义：名称 + 颜色 + 使用量 -->
					<view class="tag-def" v-for="(tag, ti) in seatTagDefs" :key="tag.id">
						<view class="tag-def-line">
							<view class="color-swatch" :style="{ background: tag.color }"></view>
							<input class="tag-name-input" :value="tag.name" maxlength="8" placeholder="标签名称（最多8字）" @input="onTagNameInput(ti, $event)" />
							<text class="tag-used">已标 {{ tagUsage[tag.id] || 0 }} 座</text>
							<text class="tag-del" @click="removeSeatTag(ti)">删除</text>
						</view>
						<view class="tag-def-line">
							<view class="color-presets">
								<view class="color-preset" v-for="p in tagColorPresets" :key="p" :style="{ background: p }" @click="pickTagColor(tag, p)"></view>
							</view>
							<input class="color-hex" :value="tag.color" maxlength="7" placeholder="#RRGGBB" @input="onTagColorInput(ti, $event)" />
						</view>
					</view>

					<!-- 批量打标：分区切换 + 待应用标签 + 多选座位 -->
					<block v-if="seatTagDefs.length > 0">
						<view class="tag-sub-title">批量打标</view>
						<view class="tag-tip" v-if="tagAreaList.length === 0">先在「分区配置」添加座位区（舞台/装饰区不参与打标）</view>
						<block v-else>
							<scroll-view class="tag-area-scroll" scroll-x>
								<view class="ta-chip" v-for="(a, ai) in tagAreaList" :key="a.index" :class="{ on: tagAreaIndex === ai }" @click="switchTagArea(ai)">{{ a.name }}</view>
							</scroll-view>
							<view class="tag-apply-row" v-if="tagArea">
								<view class="tpa-chip" v-for="tag in seatTagDefs" :key="tag.id" :class="{ on: tagApply.indexOf(tag.id) > -1 }" @click="toggleApplyTag(tag.id)">
									<view class="tpa-dot" :style="{ background: tag.color }"></view>
									<text>{{ tag.name || '未命名' }}</text>
								</view>
							</view>
							<view class="tag-apply-btns" v-if="tagArea">
								<text class="tab-btn main" @click="applyTagsToSelection(true)">加入标签（已选 {{ tagSelCount }} 座）</text>
								<text class="tab-btn" @click="applyTagsToSelection(false)">移除标签</text>
								<text class="tab-btn gray" @click="clearTagsOfSelection">清空所选座位标签</text>
							</view>
							<view class="tag-grid-head" v-if="tagArea">
								<text class="tgh-info">{{ tagArea.name }}：已选 {{ tagSelCount }} 座 · 已打标 {{ tagAreaTaggedCount }} 座</text>
								<view class="tgh-btns">
									<text class="tgh-btn" @click="selectAllTagSeats">全选本区</text>
									<text class="tgh-btn gray" @click="clearTagSelection">清空选择</text>
								</view>
							</view>
							<!-- 上次点击的座位号：点击后常驻显示，避免只靠 toast 一闪而过 -->
							<view class="tag-last-tap" v-if="tagLastTap">
								<text class="tlt-state" :class="{ off: !tagLastTap.on }">{{ tagLastTap.on ? '已选中' : '已取消' }}</text>
								<text class="tlt-label">{{ tagLastTap.label }}</text>
							</view>
							<view class="tag-tip" v-if="tagArea && tagArea.rows * tagArea.cols > tagSeatLimit">该分区座位数超过 {{ tagSeatLimit }}，请先缩小行列数再批量打标</view>
							<scroll-view class="tag-seat-scroll" v-else-if="tagArea" scroll-x scroll-y>
								<view class="ts-canvas" :style="{ width: tagGridW + 'rpx', height: tagGridH + 'rpx' }">
									<view class="ts-corner" :style="{ width: tagAxisW + 'rpx', height: tagAxisH + 'rpx' }"></view>
									<view class="ts-col-label" v-for="c in tagArea.cols" :key="'tc' + c" :style="{ left: (tagAxisW + (c - 1) * tagCell) + 'rpx', width: tagCell + 'rpx', height: tagAxisH + 'rpx', lineHeight: tagAxisH + 'rpx' }">{{ tagColLabel(c) }}</view>
									<view class="ts-row-label" v-for="r in tagArea.rows" :key="'tr' + r" :style="{ top: (tagAxisH + (r - 1) * tagCell) + 'rpx', width: tagAxisW + 'rpx', height: tagCell + 'rpx', lineHeight: tagCell + 'rpx' }">{{ tagRowLabel(r) }}</view>
									<view
										class="ts-seat"
										:class="{ on: cell.on, tagged: cell.tagged }"
										v-for="cell in tagSeatCells"
										:key="cell.key"
										:style="{ left: (cell.left + 3) + 'rpx', top: (cell.top + 3) + 'rpx', width: (tagCell - 6) + 'rpx', height: (tagCell - 6) + 'rpx' }"
										@click="toggleTagSeat(cell.row, cell.col)"
									>
										<view class="ts-dot" v-if="cell.dotStyle" :style="cell.dotStyle"></view>
									</view>
								</view>
							</scroll-view>
							<view class="tag-tip">点座位可多选/取消，每次点击会提示座位号；圆点表示该座位已有标签（每座最多 3 个）。移除标签时未勾选标签则清空所选座位的全部标签；改动需点击底部「保存座位表」生效</view>
						</block>
					</block>
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
	const SEAT_COLOR_DEFAULTS = { avail: '#dfe4ea', selected: '#b39ddb', taken: '#80deea', mine: '#ffd54f', invalid: '#9e9e9e' }
	const SEAT_COLOR_DEFS = [
		{ key: 'avail', name: '可选' },
		{ key: 'selected', name: '预选' },
		{ key: 'taken', name: '锁定' },
		{ key: 'mine', name: '我的' },
		{ key: 'invalid', name: '无效座位' }
	]
	const SEAT_COLOR_PRESETS = ['#dfe4ea', '#b39ddb', '#80deea', '#ffd54f',  '#a5d6a7', '#ef9a9a', '#90caf9', '#9e9e9e']
	// 座位标签：定义上限 20 个、每座位最多 3 个；打标面板座位网格尺寸（rpx）与单区渲染上限
	const SEAT_TAG_MAX_DEFS = 20
	const SEAT_TAG_MAX_PER_SEAT = 3
	const SEAT_TAG_PRESETS = ['#ef5350', '#ffa726', '#66bb6a', '#42a5f5', '#ab47bc', '#26c6da', '#8d6e63', '#ec407a']
	const TAG_CELL = 44
	const TAG_ROW_AXIS = 64
	const TAG_COL_AXIS = 30
	const TAG_SEAT_LIMIT = 3000
	// 小程序 input 事件取值：优先 detail.value，H5 回退 target.value
	function readInputValue(e) {
		if (!e) return ''
		if (e.detail && e.detail.value != null) return String(e.detail.value)
		if (e.target && e.target.value != null) return String(e.target.value)
		return ''
	}
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
				seatColors: { avail: '', selected: '', taken: '', mine: '', invalid: '' },
				// 无效座位：分区 invalidSeats 稀疏数组 [{row,col}]；hideInvalidSeats 为用户端隐藏开关（存 Concert.hide_invalid_seats）
				hideInvalidSeats: false,
				invAreaIndex: 0,
				invLastTap: null,
				// 滑动涂选态：rect=网格视口坐标（px），intent=本次涂无效/恢复有效，moved=已拖离起点
				invPaint: null,
				// 涂选模式：开启后锁定网格滚动，拖动专用于批量涂选，彻底避开 scroll-view 手势冲突
				invPaintMode: false,
				// 座位标签：定义 [{id,name,color}]；打标为分区 seatTags 稀疏数组 [{row,col,tags}]，只存有标签的座位
				seatTagDefs: [],
				tagColorPresets: SEAT_TAG_PRESETS,
				// 批量打标面板状态：当前分区（tagAreaList 下标）、已选座位 {"row-col": true}、待应用标签 id
				tagAreaIndex: 0,
				tagSel: {},
				tagApply: [],
				// 最近点击的座位 { label, on }，常驻显示在网格上方，防止多选时点错行/列
				tagLastTap: null,
				tagCell: TAG_CELL,
				tagAxisW: TAG_ROW_AXIS,
				tagAxisH: TAG_COL_AXIS,
				tagSeatLimit: TAG_SEAT_LIMIT,
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
					const inv = Array.isArray(a.invalidSeats) ? a.invalidSeats.length : 0
					return sum + Math.max((parseInt(a.rows) || 0) * (parseInt(a.cols) || 0) - inv, 0)
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
			// ===== 座位标签 =====
			// 可打标的分区（舞台/装饰区除外）
			tagAreaList() {
				const list = []
				this.seatAreas.forEach((a, index) => {
					if (a.isStage) return
					list.push({ index, name: a.name || `分区${index + 1}` })
				})
				return list
			},
			// 当前打标分区（含行列数、自定义编号与已打标）
			tagArea() {
				if (this.tagAreaList.length === 0) return null
				const pos = Math.min(Math.max(0, this.tagAreaIndex), this.tagAreaList.length - 1)
				const item = this.tagAreaList[pos]
				const area = this.seatAreas[item.index]
				if (!area) return null
				return {
					index: item.index,
					name: item.name,
					rows: Math.min(Math.max(parseInt(area.rows) || 0, 0), 100),
					cols: Math.min(Math.max(parseInt(area.cols) || 0, 0), 100),
					rowLabelType: Number(area.rowLabelType) || 1,
					rowLabels: area.rowLabels || [],
					colLabels: area.colLabels || [],
					seatTags: Array.isArray(area.seatTags) ? area.seatTags : []
				}
			},
			// 每个标签被多少个座位使用（跨全部分区统计）
			tagUsage() {
				const map = {}
				this.seatAreas.forEach(a => {
					(Array.isArray(a.seatTags) ? a.seatTags : []).forEach(item => {
						(item.tags || []).forEach(id => { map[id] = (map[id] || 0) + 1 })
					})
				})
				return map
			},
			tagAreaTaggedCount() {
				return this.tagArea ? this.tagArea.seatTags.length : 0
			},
			// ===== 无效座位 =====
			// 无效座位生效色（供网格 :style 复用，避免每格调用方法）
			invalidColor() {
				return this.effectiveColor('invalid')
			},
			// 全场已标记无效座位总数
			invalidTotalCount() {
				return this.seatAreas.reduce((sum, a) => sum + (Array.isArray(a.invalidSeats) ? a.invalidSeats.length : 0), 0)
			},
			// 当前无效座位设置分区（复用可打标分区列表）
			invArea() {
				if (this.tagAreaList.length === 0) return null
				const pos = Math.min(Math.max(0, this.invAreaIndex), this.tagAreaList.length - 1)
				const item = this.tagAreaList[pos]
				const area = this.seatAreas[item.index]
				if (!area) return null
				return {
					index: item.index,
					name: item.name,
					rows: Math.min(Math.max(parseInt(area.rows) || 0, 0), 100),
					cols: Math.min(Math.max(parseInt(area.cols) || 0, 0), 100),
					rowLabelType: Number(area.rowLabelType) || 1,
					rowLabels: area.rowLabels || [],
					colLabels: area.colLabels || [],
					invalidSeats: Array.isArray(area.invalidSeats) ? area.invalidSeats : []
				}
			},
			invAreaInvalidCount() {
				return this.invArea ? this.invArea.invalidSeats.length : 0
			},
			invGridW() {
				return this.invArea ? this.tagAxisW + this.invArea.cols * this.tagCell + 4 : 0
			},
			invGridH() {
				return this.invArea ? this.tagAxisH + this.invArea.rows * this.tagCell + 4 : 0
			},
			// 无效座位网格单元格：点座直接切换无效态，无效座显示 ✕
			invSeatCells() {
				const area = this.invArea
				if (!area || area.rows < 1 || area.cols < 1) return []
				const invMap = {}
				area.invalidSeats.forEach(item => { invMap[item.row + '-' + item.col] = true })
				const cells = []
				for (let r = 1; r <= area.rows; r++) {
					for (let c = 1; c <= area.cols; c++) {
						const key = r + '-' + c
						cells.push({
							key,
							row: r,
							col: c,
							left: this.tagAxisW + (c - 1) * this.tagCell,
							top: this.tagAxisH + (r - 1) * this.tagCell,
							invalid: !!invMap[key]
						})
						if (cells.length >= TAG_SEAT_LIMIT) return cells
					}
				}
				return cells
			},
			tagSelCount() {
				let count = 0
				Object.keys(this.tagSel).forEach(key => { if (this.tagSel[key]) count++ })
				return count
			},
			tagGridW() {
				return this.tagArea ? this.tagAxisW + this.tagArea.cols * this.tagCell + 4 : 0
			},
			tagGridH() {
				return this.tagArea ? this.tagAxisH + this.tagArea.rows * this.tagCell + 4 : 0
			},
			// 打标网格座位单元格（含标签圆点样式）
			tagSeatCells() {
				const area = this.tagArea
				if (!area || area.rows < 1 || area.cols < 1) return []
				const tagMap = {}
				area.seatTags.forEach(item => {
					tagMap[item.row + '-' + item.col] = item.tags || []
				})
				const cells = []
				for (let r = 1; r <= area.rows; r++) {
					for (let c = 1; c <= area.cols; c++) {
						const key = r + '-' + c
						const tags = tagMap[key] || []
						cells.push({
							key,
							row: r,
							col: c,
							left: this.tagAxisW + (c - 1) * this.tagCell,
							top: this.tagAxisH + (r - 1) * this.tagCell,
							on: !!this.tagSel[key],
							tagged: tags.length > 0,
							dotStyle: this.buildTagDotStyle(tags)
						})
						if (cells.length >= TAG_SEAT_LIMIT) return cells
					}
				}
				return cells
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

			// 同 v-for 内 v-model 兼 @input 的数组 handler 风险：色值输入改为显式写回
			onSeatColorInput(key, e) {
				this.seatColors[key] = readInputValue(e)
				this.dirty = true
			},

			// ===== 座位标签 =====
			addSeatTag() {
				if (this.seatTagDefs.length >= SEAT_TAG_MAX_DEFS) {
					uni.showToast({ title: `最多 ${SEAT_TAG_MAX_DEFS} 个标签`, icon: 'none' })
					return
				}
				const idx = this.seatTagDefs.length
				this.seatTagDefs.push({
					id: 't' + Date.now().toString(36) + idx,
					name: '',
					color: SEAT_TAG_PRESETS[idx % SEAT_TAG_PRESETS.length]
				})
				this.dirty = true
			},

			pickTagColor(tag, p) {
				tag.color = p
				this.dirty = true
			},

			// 小程序端 v-for 内 v-model 与 @input 同时使用会生成数组 handler，个别基础库下输入不落库，
			// 这里改为显式处理：按索引直接写回 seatTagDefs，保证名称/颜色改动即时生效
			onTagNameInput(ti, e) {
				const tag = this.seatTagDefs[ti]
				if (!tag) return
				tag.name = readInputValue(e)
				this.dirty = true
			},

			onTagColorInput(ti, e) {
				const tag = this.seatTagDefs[ti]
				if (!tag) return
				tag.color = readInputValue(e)
				this.dirty = true
			},

			tagColorOf(id) {
				const def = this.seatTagDefs.find(t => t.id === id)
				return def ? def.color : '#ef6c00'
			},

			// 每座最多 3 个圆点：首色实心点 + box-shadow 偏移画额外圆点，避免每座多渲染节点
			buildTagDotStyle(tags) {
				if (!tags || tags.length === 0) return ''
				const colors = []
				tags.forEach(id => {
					if (colors.length < SEAT_TAG_MAX_PER_SEAT) colors.push(this.tagColorOf(id))
				})
				let style = 'background:' + colors[0] + ';'
				if (colors.length > 1) {
					const shadows = []
					for (let i = 1; i < colors.length; i++) shadows.push((i * 12) + 'rpx 0 0 0 ' + colors[i])
					style += 'box-shadow:' + shadows.join(',') + ';'
				}
				return style
			},

			tagRowLabel(row, areaRef) {
				const area = areaRef || this.tagArea
				if (!area) return String(row)
				const custom = area.rowLabels[row - 1]
				if (custom != null && String(custom).trim()) return String(custom).trim()
				return area.rowLabelType === 2 ? this.letterOf(row) : String(row)
			},

			tagColLabel(col, areaRef) {
				const area = areaRef || this.tagArea
				if (!area) return String(col)
				const custom = area.colLabels[col - 1]
				if (custom != null && String(custom).trim()) return String(custom).trim()
				return String(col)
			},

			// 打标座位的完整座位号（与用户端选座页一致：分区名 + 排号 + 列号）；areaRef 供无效座位面板复用
			tagSeatLabel(row, col, areaRef) {
				const area = areaRef || this.tagArea
				if (!area) return row + '排' + col + '号'
				const r = this.tagRowLabel(row, area)
				const c = this.tagColLabel(col, area)
				const rText = /[排座]$/.test(r) ? r : r + '排'
				const cText = /[号座]$/.test(c) ? c : c + '号'
				return area.name + ' ' + rText + cText
			},

			switchTagArea(ai) {
				this.tagAreaIndex = ai
				this.tagSel = {}
				this.tagLastTap = null
			},

			toggleTagSeat(row, col) {
				const key = row + '-' + col
				const next = Object.assign({}, this.tagSel)
				const willSelect = !next[key]
				if (willSelect) next[key] = true
				else delete next[key]
				this.tagSel = next
				// 点击即提示座位号：批量多选时防止点错行/列
				const label = this.tagSeatLabel(row, col)
				this.tagLastTap = { label, on: willSelect }
				uni.showToast({ title: (willSelect ? '选中 ' : '取消 ') + label, icon: 'none', duration: 1000 })
			},

			toggleApplyTag(id) {
				const list = this.tagApply.slice()
				const i = list.indexOf(id)
				if (i > -1) list.splice(i, 1)
				else list.push(id)
				this.tagApply = list
			},

			selectAllTagSeats() {
				const area = this.tagArea
				if (!area) return
				if (area.rows * area.cols > TAG_SEAT_LIMIT) {
					uni.showToast({ title: `超过 ${TAG_SEAT_LIMIT} 座，请缩小行列数`, icon: 'none' })
					return
				}
				const next = {}
				for (let r = 1; r <= area.rows; r++) {
					for (let c = 1; c <= area.cols; c++) next[r + '-' + c] = true
				}
				this.tagSel = next
				this.tagLastTap = null
			},

			clearTagSelection() {
				this.tagSel = {}
				this.tagLastTap = null
			},

			// 取分区打标数组（拷贝，避免直接改 computed 派生对象）
			seatTagsOfArea(idx) {
				const area = this.seatAreas[idx]
				const list = area && Array.isArray(area.seatTags) ? area.seatTags : []
				return list.map(item => ({ row: item.row, col: item.col, tags: (item.tags || []).slice() }))
			},

			setAreaSeatTags(idx, list) {
				const area = this.seatAreas[idx]
				if (!area) return
				area.seatTags = list
				this.dirty = true
			},

			// 多选座位批量加入/移除标签；移除时未勾选标签=清空这些座位的全部标签
			applyTagsToSelection(add) {
				const area = this.tagArea
				if (!area) return
				const selKeys = Object.keys(this.tagSel).filter(key => this.tagSel[key])
				if (selKeys.length === 0) {
					uni.showToast({ title: '请先点选座位', icon: 'none' })
					return
				}
				if (add && this.tagApply.length === 0) {
					uni.showToast({ title: '请先勾选要加入的标签', icon: 'none' })
					return
				}
				const map = {}
				this.seatTagsOfArea(area.index).forEach(item => { map[item.row + '-' + item.col] = item.tags })
				if (add) {
					selKeys.forEach(key => {
						const tags = map[key] || []
						this.tagApply.forEach(id => {
							if (tags.indexOf(id) < 0 && tags.length < SEAT_TAG_MAX_PER_SEAT) tags.push(id)
						})
						if (tags.length > 0) map[key] = tags
					})
				} else {
					selKeys.forEach(key => {
						const tags = map[key]
						if (!tags) return
						if (this.tagApply.length === 0) {
							delete map[key]
							return
						}
						const next = tags.filter(id => this.tagApply.indexOf(id) < 0)
						if (next.length === 0) delete map[key]
						else map[key] = next
					})
				}
				const nextList = []
				Object.keys(map).forEach(key => {
					const parts = key.split('-')
					nextList.push({ row: parseInt(parts[0]), col: parseInt(parts[1]), tags: map[key] })
				})
				this.setAreaSeatTags(area.index, nextList)
				uni.showToast({ title: add ? '已加入标签' : '已更新标签', icon: 'none' })
			},

			clearTagsOfSelection() {
				const area = this.tagArea
				if (!area) return
				const selKeys = Object.keys(this.tagSel).filter(key => this.tagSel[key])
				if (selKeys.length === 0) {
					uni.showToast({ title: '请先点选座位', icon: 'none' })
					return
				}
				const selMap = {}
				selKeys.forEach(key => { selMap[key] = true })
				const remain = this.seatTagsOfArea(area.index).filter(item => !selMap[item.row + '-' + item.col])
				if (remain.length === area.seatTags.length) {
					uni.showToast({ title: '所选座位暂无标签', icon: 'none' })
					return
				}
				this.setAreaSeatTags(area.index, remain)
				uni.showToast({ title: '已清空所选座位标签', icon: 'none' })
			},

			removeSeatTag(ti) {
				const tag = this.seatTagDefs[ti]
				if (!tag) return
				const used = this.tagUsage[tag.id] || 0
				uni.showModal({
					title: '删除标签',
					content: used > 0
						? `「${tag.name || '未命名'}」已用于 ${used} 个座位，删除后会同时清除这些座位上的该标签，确定删除吗？`
						: `确定删除标签「${tag.name || '未命名'}」吗？`,
					confirmText: '删除',
					confirmColor: '#c62828',
					success: (m) => {
						if (!m.confirm) return
						this.seatTagDefs.splice(ti, 1)
						// 全局剔除该标签的打标
						this.seatAreas.forEach(area => {
							if (!Array.isArray(area.seatTags) || area.seatTags.length === 0) return
							const next = []
							area.seatTags.forEach(item => {
								const tags = (item.tags || []).filter(id => id !== tag.id)
								if (tags.length > 0) next.push({ row: item.row, col: item.col, tags })
							})
							area.seatTags = next
						})
						this.tagApply = this.tagApply.filter(id => id !== tag.id)
						this.dirty = true
						uni.showToast({ title: '已删除标签', icon: 'none' })
					}
				})
			},

			// 行列数变化/切舞台后裁剪越界打标
			pruneAreaSeatTags(idx) {
				const area = this.seatAreas[idx]
				if (!area || !Array.isArray(area.seatTags)) return
				const rows = parseInt(area.rows) || 0
				const cols = parseInt(area.cols) || 0
				area.seatTags = area.seatTags.filter(item => item.row >= 1 && item.row <= rows && item.col >= 1 && item.col <= cols)
			},

			// 行列数变化后裁剪越界的无效座位标记
			pruneAreaInvalidSeats(idx) {
				const area = this.seatAreas[idx]
				if (!area || !Array.isArray(area.invalidSeats)) return
				const rows = parseInt(area.rows) || 0
				const cols = parseInt(area.cols) || 0
				area.invalidSeats = area.invalidSeats.filter(item => item.row >= 1 && item.row <= rows && item.col >= 1 && item.col <= cols)
			},

			// ===== 无效座位设置 =====
			// 分区无效座数（实时含未保存改动）
			areaInvalidCountOf(area) {
				return area && Array.isArray(area.invalidSeats) ? area.invalidSeats.length : 0
			},

			// 分区可选座位数 = 行列总数 - 无效座位（舞台计 0）
			areaSeatCount(area) {
				if (!area || area.isStage) return 0
				return Math.max((parseInt(area.rows) || 0) * (parseInt(area.cols) || 0) - this.areaInvalidCountOf(area), 0)
			},

			switchInvArea(ai) {
				this.invAreaIndex = ai
				this.invLastTap = null
			},

			onHideInvalidChange(e) {
				this.hideInvalidSeats = !!e.detail.value
				this.dirty = true
			},

			// 点座位直接切换无效/有效（区别于打标的两步式操作）
			toggleInvalidSeat(row, col) {
				const area = this.invArea
				if (!area) return
				const target = this.seatAreas[area.index]
				if (!target) return
				const list = Array.isArray(target.invalidSeats) ? target.invalidSeats : []
				const willInvalid = !list.some(s => s.row === row && s.col === col)
				this.setInvalidEntry(target, row, col, willInvalid)
				const label = this.tagSeatLabel(row, col, target)
				this.invLastTap = { label, on: willInvalid }
				uni.showToast({ title: (willInvalid ? '已设为无效：' : '已恢复有效：') + label, icon: 'none', duration: 1200 })
			},

			// 写回单个坐标的无效态（in-place，供点击/涂选共用）
			setInvalidEntry(target, row, col, want) {
				if (!Array.isArray(target.invalidSeats)) target.invalidSeats = []
				const list = target.invalidSeats
				const i = list.findIndex(s => s.row === row && s.col === col)
				if (want && i < 0) list.push({ row: row, col: col })
				else if (!want && i > -1) list.splice(i, 1)
				else return
				this.dirty = true
			},

			// ===== 无效座位滑动涂选 =====
			// 涂选模式：开启后 scroll-view 双向滚动锁定，拖动手势完全给涂选，彻底避开 scroll-view 抢占
			toggleInvPaintMode() {
				this.invPaintMode = !this.invPaintMode
				this.invPaint = null
				uni.showToast({ title: this.invPaintMode ? '涂选模式：按住拖动批量涂选' : '已退出涂选，网格可滚动', icon: 'none' })
			},

			// 起点格决定本次意图：有效格→涂无效，无效格→恢复有效；滑过的格子统一按意图应用
			invTouchPoint(e) {
				if (e.touches && e.touches.length) return e.touches[0]
				if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0]
				if (e.mp && e.mp.touches && e.mp.touches.length) return e.mp.touches[0]
				// H5 鼠标事件：坐标直接挂在事件对象上
				if (e.clientX != null || e.pageX != null) return e
				return null
			},

			// 异步测网格视口 rect（px）；rect 就绪后立刻补解析起点，避免 60ms 竞态死锁
			measureInvGrid() {
				uni.createSelectorQuery().in(this).select('#inv-grid').boundingClientRect().exec((res) => {
					const r = res && res[0]
					if (!this.invPaint || !r) return
					this.invPaint.rect = { left: r.left, top: r.top }
					if (this.invPaint.intent === null) this.invResolveIntent()
				})
			},

			// 触点坐标（视口 px，与 boundingClientRect/touch 同单位）→ 网格行列；rpx 常量仅在此处换算，越界返回 null
			invCellAt(x, y) {
				const p = this.invPaint
				const area = this.invArea
				if (!p || !p.rect || !area) return null
				const axisW = uni.upx2px(this.tagAxisW)
				const axisH = uni.upx2px(this.tagAxisH)
				const cellPx = uni.upx2px(this.tagCell)
				if (!cellPx) return null
				const c = Math.floor((x - p.rect.left - axisW) / cellPx) + 1
				const r = Math.floor((y - p.rect.top - axisH) / cellPx) + 1
				if (r < 1 || r > area.rows || c < 1 || c > area.cols) return null
				return { row: r, col: c }
			},

			invPaintStart(e) {
				if (!this.invPaintMode) return
				const area = this.invArea
				if (!area) return
				const t = this.invTouchPoint(e)
				if (!t) return
				// touch 坐标与 boundingClientRect 同为视口 px，不再做 upx2px 换算
				const x = t.clientX != null ? t.clientX : t.pageX
				const y = t.clientY != null ? t.clientY : t.pageY
				if (x == null || y == null) return
				this.invPaint = { rect: null, intent: null, startCell: null, last: '', moved: false, count: 0 }
				this.invPaint.startXY = { x, y }
				this.measureInvGrid()
			},

			// rect 就绪后解析起点格并定意图；起点格本身不立即应用（纯单点交给 click 切换，防双重翻转）
			invResolveIntent() {
				const p = this.invPaint
				if (!p || p.intent !== null || !p.rect) return
				const cell = this.invCellAt(p.startXY.x, p.startXY.y)
				if (!cell) return
				const target = this.seatAreas[this.invArea.index]
				if (!target) return
				const list = Array.isArray(target.invalidSeats) ? target.invalidSeats : []
				p.intent = !list.some(s => s.row === cell.row && s.col === cell.col)
				p.startCell = cell
				p.last = cell.row + '-' + cell.col
			},

			invApplyPaint(x, y) {
				const p = this.invPaint
				if (!p) return
				if (p.intent === null) this.invResolveIntent()
				if (p.intent === null) return
				const cell = this.invCellAt(x, y)
				if (!cell) return
				const target = this.seatAreas[this.invArea.index]
				if (!target) return
				const key = cell.row + '-' + cell.col
				if (p.last === key) return
				// 首次真正拖离起点时，先把起点格按意图补上
				if (!p.moved && p.startCell) {
					p.moved = true
					const sb = target.invalidSeats.length
					this.setInvalidEntry(target, p.startCell.row, p.startCell.col, p.intent)
					if (target.invalidSeats.length !== sb) p.count++
				}
				p.last = key
				const before = target.invalidSeats.length
				this.setInvalidEntry(target, cell.row, cell.col, p.intent)
				if (target.invalidSeats.length !== before) p.count++
				this.invLastTap = {
					label: this.tagSeatLabel(cell.row, cell.col, target),
					on: p.intent
				}
			},

			onInvTouchStart(e) {
				this.invPaintStart(e)
			},

			onInvTouchMove(e) {
				const p = this.invPaint
				if (!p) return
				const t = this.invTouchPoint(e)
				if (!t) return
				const x = t.clientX != null ? t.clientX : t.pageX
				const y = t.clientY != null ? t.clientY : t.pageY
				if (x == null || y == null) return
				// rect 可能因 scroll-view 内部滚动而偏移，移动中持续重测
				if (p.intent === null) this.measureInvGrid()
				this.invApplyPaint(x, y)
			},

			onInvTouchEnd() {
				const p = this.invPaint
				this.invPaint = null
				// 纯单点（未拖出第二格）不处理，交给 click 切换，避免双重翻转
				if (p && p.moved) {
					uni.showToast({ title: (p.intent ? '已涂选 ' : '已恢复 ') + p.count + ' 个座位', icon: 'none' })
				}
			},

			// H5 端鼠标事件复用同一套涂选逻辑（mousedown 复用 touch 事件的 touches 结构）
			onInvMouseDown(e) {
				this.invPaintStart(e)
			},

			onInvMouseMove(e) {
				if (!this.invPaint) return
				if (e.buttons === undefined || e.buttons > 0) this.onInvTouchMove(e)
			},

			onInvMouseUp() {
				this.onInvTouchEnd()
			},

			clearInvalidOfArea() {
				const area = this.invArea
				if (!area || area.invalidSeats.length === 0) {
					uni.showToast({ title: '该分区暂无无效座位标记', icon: 'none' })
					return
				}
				uni.showModal({
					title: '清除无效标记',
					content: `将「${area.name}」的 ${area.invalidSeats.length} 个无效座位全部恢复为可选，确定吗？`,
					success: (m) => {
						if (!m.confirm) return
						const target = this.seatAreas[area.index]
						if (target) target.invalidSeats = []
						this.invLastTap = null
						this.dirty = true
						uni.showToast({ title: '已清除', icon: 'none' })
					}
				})
			},

			validateSeatTags() {
				const nameSet = {}
				for (let i = 0; i < this.seatTagDefs.length; i++) {
					const tag = this.seatTagDefs[i]
					const name = String(tag.name || '').trim()
					const color = String(tag.color || '').trim()
					if (!name) return `第${i + 1}个标签未填写名称`
					if (name.length > 8) return `标签「${name}」名称超过 8 个字符`
					if (nameSet[name]) return `标签名称「${name}」重复`
					nameSet[name] = true
					if (!/^#[0-9a-fA-F]{6}$/.test(color)) return `标签「${name}」颜色格式应为 #RRGGBB`
				}
				return ''
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
								labelRule: a.labelRule || null,
								seatTags: a.seatTags,
								invalidSeats: a.invalidSeats
							}))
							this.seatMaxPerUser = String(d.concert.max_seats_per_user != null ? d.concert.max_seats_per_user : 6)
							// 座位配色回显：云函数始终存完整四键；与内置默认相同的视为未设置（置空），仅自定义色差才回填
							const savedColors = d.concert.seat_colors || {}
							SEAT_COLOR_DEFS.forEach(c => {
								const v = String(savedColors[c.key] || '').toLowerCase()
								this.seatColors[c.key] = (/^#[0-9a-fA-F]{6}$/.test(v) && v !== SEAT_COLOR_DEFAULTS[c.key]) ? v : ''
							})
							// 座位标签定义回显（id/名称缺失的脏数据丢弃，颜色非法回退默认橙色）
							const savedTags = Array.isArray(d.concert.seat_tags) ? d.concert.seat_tags : []
							this.seatTagDefs = savedTags.map(t => ({
								id: String(t.id || ''),
								name: String(t.name || ''),
								color: /^#[0-9a-fA-F]{6}$/.test(String(t.color || '')) ? String(t.color).toLowerCase() : '#ef6c00'
							})).filter(t => t.id && t.name)
							this.tagAreaIndex = 0
							this.tagSel = {}
							this.tagApply = []
							// 无效座位：隐藏开关回显与面板状态重置
							this.hideInvalidSeats = d.concert.hide_invalid_seats === true
							this.invAreaIndex = 0
							this.invLastTap = null
							this.invPaintMode = false
							this.invPaint = null
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
				area.seatTags = Array.isArray(area.seatTags) ? area.seatTags : []
				area.invalidSeats = Array.isArray(area.invalidSeats) ? area.invalidSeats : []
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
					labelRule: null,
					seatTags: [],
					invalidSeats: []
				}))
				this.selectedIndex = idx
				this.dirty = true
			},

			removeSeatArea(idx) {
				const area = this.seatAreas[idx]
				const doRemove = () => {
					this.seatAreas.splice(idx, 1)
					this.selectedIndex = this.seatAreas.length > 0 ? 0 : -1
					this.tagAreaIndex = 0
					this.tagSel = {}
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

			// 一键删除全部分区、舞台及所有已选座位：直接提交空布局，服务端同步清空并关闭选座
			clearAllLayout() {
				if (this.savingSeat) return
				if (this.seatAreas.length === 0 && this.seatSelectionCount === 0) {
					uni.showToast({ title: '布局已是空的', icon: 'none' })
					return
				}
				const selTip = this.seatSelectionCount > 0 ? `，并删除 ${this.seatSelectionCount} 条用户已选座位记录` : ''
				uni.showModal({
					title: '清空布局',
					content: `将删除全部 ${this.seatAreas.length} 个分区（含舞台）${selTip}，同时自动关闭选座。此操作不可撤销，确定继续吗？`,
					confirmText: '一键删除',
					confirmColor: '#c62828',
					success: (m) => {
						if (!m.confirm) return
						this.seatAreas = []
						this.selectedIndex = -1
						this.tagAreaIndex = 0
						this.tagSel = {}
						this.dirty = true
						this.saveSeatConfig(true)
					}
				})
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
					// 舞台不参与打标与无效座位设置，转为舞台时清空
					area.seatTags = []
					area.invalidSeats = []
					this.tagAreaIndex = 0
					this.tagSel = {}
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
				// 行列缩小后裁剪越界打标，并清空打标面板选择
				this.pruneAreaSeatTags(idx)
				this.pruneAreaInvalidSeats(idx)
				this.tagSel = {}
				this.invLastTap = null

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
				// 允许保存空布局（= 一键删除全部分区与舞台）；非空时逐项校验
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
				// 标签定义校验（名称非空/不重复、颜色 #RRGGBB）；保存前再裁剪一次越界打标
				const tagErr = this.validateSeatTags()
				if (tagErr) {
					uni.showToast({ title: tagErr, icon: 'none' })
					return
				}
				this.seatAreas.forEach((a, i) => {
					this.pruneAreaSeatTags(i)
					this.pruneAreaInvalidSeats(i)
				})
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
						seatTags: this.seatTagDefs.map(t => ({ id: t.id, name: String(t.name || '').trim(), color: String(t.color || '').trim().toLowerCase() })),
						hideInvalidSeats: this.hideInvalidSeats,
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
		&.danger { background: linear-gradient(135deg, #ef5350 0%, #c62828 100%); }
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

/* ===== 座位标签 ===== */
.tag-sub-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #333;
	margin: 24rpx 0 12rpx;
}

.tag-def-empty {
	font-size: 24rpx;
	color: #999;
	line-height: 1.6;
	background: #fafbfe;
	border: 1rpx dashed #d5dbe6;
	border-radius: 12rpx;
	padding: 20rpx;
}

.tag-def {
	border: 1rpx solid #eceff5;
	border-radius: 12rpx;
	padding: 14rpx 16rpx;
	margin-top: 14rpx;
	background: #fbfcff;

	.tag-def-line {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-top: 8rpx;

		&:first-child { margin-top: 0; }
	}

	.tag-name-input {
		flex: 1;
		height: 56rpx;
		background: #f5f5f5;
		border-radius: 10rpx;
		padding: 0 16rpx;
		font-size: 26rpx;
	}

	.tag-used {
		font-size: 22rpx;
		color: #8d6e63;
		background: #fff3e0;
		border-radius: 18rpx;
		padding: 6rpx 14rpx;
		flex-shrink: 0;
	}

	.tag-del {
		font-size: 22rpx;
		color: #c62828;
		background: #ffebee;
		border-radius: 18rpx;
		padding: 6rpx 16rpx;
		flex-shrink: 0;
	}
}

.tag-area-scroll {
	white-space: nowrap;
	margin-bottom: 12rpx;

	.ta-chip {
		display: inline-block;
		font-size: 24rpx;
		color: #555;
		background: #f5f6fa;
		border: 1rpx solid #e0e3ec;
		border-radius: 24rpx;
		padding: 8rpx 24rpx;
		margin-right: 12rpx;

		&.on {
			background: #e3f2fd;
			border-color: #64b5f6;
			color: #1565c0;
			font-weight: 600;
		}
	}
}

.tag-apply-row {
	display: flex;
	flex-wrap: wrap;

	.tpa-chip {
		display: inline-flex;
		align-items: center;
		gap: 8rpx;
		font-size: 22rpx;
		color: #555;
		background: #f5f6fa;
		border: 1rpx solid #e0e3ec;
		border-radius: 24rpx;
		padding: 8rpx 18rpx;
		margin: 0 12rpx 12rpx 0;

		.tpa-dot {
			width: 14rpx;
			height: 14rpx;
			border-radius: 50%;
		}

		&.on {
			background: #e3f2fd;
			border-color: #64b5f6;
			color: #1565c0;
			font-weight: 600;
		}
	}
}

.tag-apply-btns {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-bottom: 12rpx;

	.tab-btn {
		font-size: 24rpx;
		color: #1976D2;
		background: #e3f2fd;
		border-radius: 24rpx;
		padding: 10rpx 20rpx;

		&.main {
			color: #fff;
			background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
		}

		&.gray {
			color: #666;
			background: #f0f0f0;
		}
	}
}

.tag-grid-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10rpx;

	.tgh-info {
		flex: 1;
		font-size: 22rpx;
		color: #666;
		margin-right: 12rpx;
	}

	.tgh-btns { display: flex; gap: 12rpx; }

	.tgh-btn {
		font-size: 22rpx;
		color: #1976D2;
		background: #e3f2fd;
		border-radius: 18rpx;
		padding: 6rpx 16rpx;

		&.gray { color: #666; background: #f0f0f0; }
		&.paint { color: #fff; background: #7e57c2; }
	}
}

.tag-last-tap {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-bottom: 10rpx;
	font-size: 22rpx;
	color: #37474f;

	.tlt-state {
		font-size: 20rpx;
		color: #2e7d32;
		background: #e8f5e9;
		border-radius: 16rpx;
		padding: 2rpx 12rpx;

		&.off { color: #8d6e63; background: #efebe9; }
	}

	.tlt-label { font-weight: 500; }
}

.tag-tip {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-top: 10rpx;
	line-height: 1.5;

	&.warn { color: #e65100; }
}

.tag-seat-scroll {
	width: 100%;
	height: 520rpx;
	background: #fafcff;
	border: 1rpx dashed #b0bec5;
	border-radius: 12rpx;
}

.ts-canvas {
	position: relative;
}

.ts-corner {
	position: absolute;
	left: 0;
	top: 0;
	background: #f0f3f8;
	border-right: 1rpx solid #e2e8f2;
	border-bottom: 1rpx solid #e2e8f2;
}

.ts-col-label {
	position: absolute;
	top: 0;
	font-size: 18rpx;
	color: #90a4ae;
	text-align: center;
	overflow: hidden;
	white-space: nowrap;
}

.ts-row-label {
	position: absolute;
	left: 0;
	font-size: 18rpx;
	color: #90a4ae;
	text-align: center;
	overflow: hidden;
	white-space: nowrap;
}

.ts-seat {
	position: absolute;
	box-sizing: border-box;
	background: #eef1f7;
	border: 1rpx solid #d3dae6;
	border-radius: 8rpx;

	&.tagged {
		background: #fff3e0;
		border-color: #ffcc80;
	}

	&.on {
		background: #b39ddb;
		border-color: #7e57c2;
	}

	&.invalid {
		border-color: #757575;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ts-inv-x {
		font-size: 22rpx;
		line-height: 1;
		color: #ffffff;
	}

	.ts-dot {
		position: absolute;
		left: 4rpx;
		bottom: 4rpx;
		width: 10rpx;
		height: 10rpx;
		border-radius: 50%;
	}
}

/* 无效座位设置 */
.inv-hide-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 14rpx;

	.ih-label {
		font-size: 26rpx;
		color: #37474f;
		font-weight: 600;
	}

	.ih-tip {
		font-size: 22rpx;
		color: #999;
	}
}

.inv-tip {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-top: 10rpx;
	line-height: 1.5;
}

.af-inv-note {
	font-size: 20rpx;
	color: #e65100;
}
</style>
