# 优化
# 演唱会选座 · 多分区自由排版（总览模式）补充开发文档

> 版本：v1.1
> 变更点：座位表从「按分区 Tab 切换查看」升级为「**整场馆总览 + 分区手动排版**」。管理员可为每个分区设置任意位置，用户端在一个画布上看到整个场馆的座位分布。

---

## 一、需求升级说明

### 1.1 变化对比

| 项 | v1.0 | v1.1（本次） |
|---|---|---|
| 分区布局 | 按 `sort` 上下垂直堆叠 | 每个分区有 `grid_x / grid_y`，自由摆放 |
| 用户端视图 | 分区 Tab 切换 | 单一画布总览，可缩放拖拽 |
| 管理端配置 | 填表单 | 可视化拖拽排版 |
| 适用场景 | 简单长方形场馆 | 体育场、剧院、不规则场馆（含环形/岛式舞台） |

### 1.2 核心概念

- **格（Cell）**：座位的坐标单位，1 格 = 1 个座位占位。
- **座位尺寸**：固定 `seatW × seatH`（默认 36rpx × 36rpx），格间距 `gap`（默认 8rpx）。
- **分区原点**：`(gridX, gridY)`，表示分区左上角所在的格坐标，允许小数（用于微调）。
- **分区占位**：`cols × rows` 格。
- **画布尺寸**：由所有分区包围盒计算得出，`canvasW = max(gridX + cols) * cellW`，`canvasH` 同理。

---

## 二、坐标系统

```
画布（scroll-view 双轴滚动）
┌──────────────────────────────────────────────────────┐
│                                                       │
│   (0,0)                                               │
│     ┌──────────────┐              ┌──────────────┐    │
│     │  A区 10×20    │              │  B区 8×15     │    │
│     │   gridX=0    │              │  gridX=26    │    │
│     │   gridY=0    │              │  gridY=2     │    │
│     └──────────────┘              └──────────────┘    │
│                                                       │
│              ┌────────────────────────┐               │
│              │      VIP区 6×30         │               │
│              │   gridX=8  gridY=14     │               │
│              └────────────────────────┘               │
│                                                       │
│            ┌─────────────────────┐                    │
│            │     C区 8×20         │                    │
│            │   gridX=12 gridY=24  │                    │
│            └─────────────────────┘                    │
│                          ▲                            │
│                    舞台 / 屏幕区（虚拟分区）             │
└──────────────────────────────────────────────────────┘
```

**单个座位在画布上的像素位置：**

```js
px = (area.gridX + col - 1) * (seatW + gap)
py = (area.gridY + row - 1) * (seatH + gap)
```

**分区在画布上的尺寸：**

```js
areaW = area.cols * (seatW + gap) - gap
areaH = area.rows * (seatH + gap) - gap
```

---

## 三、数据库变更

```sql
ALTER TABLE `seat_area`
  ADD COLUMN `grid_x`    DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '分区左上角X坐标(格)',
  ADD COLUMN `grid_y`    DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '分区左上角Y坐标(格)',
  ADD COLUMN `is_stage`  TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否为舞台/虚拟装饰区(不渲染座位)',
  ADD COLUMN `stage_w`   DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '虚拟区宽度(格)，is_stage=1时生效',
  ADD COLUMN `stage_h`   DECIMAL(6,2) NOT NULL DEFAULT 0 COMMENT '虚拟区高度(格)，is_stage=1时生效',
  DROP INDEX `idx_concert`,
  ADD INDEX `idx_concert_sort` (`concert_id`, `sort`);
```

> `is_stage=1` 用于画布上显示舞台/屏幕/入口等非座位装饰，帮助用户定位（用户端只展示不可点击）。

**画布元信息**（可选，缓存到演唱会表，避免每次遍历分区计算）：

```sql
ALTER TABLE `concert`
  ADD COLUMN `seat_canvas_w` DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '画布总宽(格)',
  ADD COLUMN `seat_canvas_h` DECIMAL(8,2) NOT NULL DEFAULT 0 COMMENT '画布总高(格)';
```

---

## 四、接口变更

### 4.1 获取座位配置（v1.1）

```

```

```json
{
  "concertId": 1,
  "seatEnabled": true,
  "seatVersion": 2,
  "maxSeatsPerUser": 6,
  "seatW": 36,
  "seatH": 36,
  "gap": 8,
  "canvasW": 42.0,
  "canvasH": 36.0,
  "areas": [
    {
      "id": 10,
      "name": "A区",
      "rows": 10, "cols": 20,
      "gridX": 0, "gridY": 0,
      "rowLabelType": 1,
      "price": 880.00,
      "color": "#4A90D9",
      "isStage": false
    },
    {
      "id": 11,
      "name": "VIP区",
      "rows": 6, "cols": 30,
      "gridX": 8, "gridY": 14,
      "rowLabelType": 1,
      "price": 1280.00,
      "color": "#E6A23C",
      "isStage": false
    },
    {
      "id": 99,
      "name": "舞台",
      "gridX": 12, "gridY": 22,
      "stageW": 20, "stageH": 2,
      "isStage": true
    }
  ]
}
```

### 4.2 保存座位配置（管理端）

```json

{
  "areas": [
    {
      "id": 10,
      "name": "A区",
      "rows": 10, "cols": 20,
      "gridX": 0, "gridY": 0,
      "rowLabelType": 1,
      "price": 880.00,
      "color": "#4A90D9",
      "isStage": false,
      "sort": 0
    }
  ],
  "maxSeatsPerUser": 6,
  "force": false
}
```

服务端保存时自动重算 `canvasW / canvasH` 并写入 `concert`。

### 4.3 已选座位接口（保持不变）

```

```

返回中的 `row / col` 是**分区内相对坐标**，前端按 `gridX/gridY` 换算成画布坐标。

---

## 五、管理端：可视化拖拽排版页

### 5.1 页面结构

```
pages/admin/seat-config
┌───────────────────────────────────────────────────┐
│  顶部工具栏：  [新增分区] [新增舞台] [适应屏幕] [保存] │
├──────────┬────────────────────────────────────────┤
│          │                                        │
│  分区列表 │         拖拽画布（可缩放）               │
│          │                                        │
│ · A区     │     ┌──────────┐                       │
│ · VIP区   │     │  A区      │        ┌────────┐     │
│ · C区     │     └──────────┘        │ VIP区  │     │
│ · 舞台    │                         └────────┘     │
│          │                                        │
│          │         ┌─────────────────┐            │
│          │         │      舞台         │            │
│          │         └─────────────────┘            │
│          │                                        │
├──────────┴────────────────────────────────────────┤
│  右侧属性面板（选中分区时展开）：                       │
│  名称 / 行数 / 列数 / 行号类型 / 价格 / 颜色 / X / Y    │
└───────────────────────────────────────────────────┘
```

### 5.2 拖拽交互

**拖拽实现（原生小程序的方案）：**

```js
// 长按进入拖拽
onBlockLongPress(e) {
  const id = e.currentTarget.dataset.id
  this.setData({ draggingId: id, dragStart: null })
  wx.vibrateShort()
},

onCanvasTouchStart(e) {
  if (!this.data.draggingId) return
  const t = e.touches[0]
  const area = this.getArea(this.data.draggingId)
  this.setData({
    dragStart: {
      pageX: t.pageX, pageY: t.pageY,
      originX: area.gridX, originY: area.gridY
    }
  })
},

onCanvasTouchMove(e) {
  if (!this.data.draggingId || !this.data.dragStart) return
  const t = e.touches[0]
  const scale = this.data.scale           // 当前缩放比
  const cell = (this.data.seatW + this.data.gap) * scale

  let dx = (t.pageX - this.data.dragStart.pageX) / cell
  let dy = (t.pageY - this.data.dragStart.pageY) / cell

  let nx = this.data.dragStart.originX + dx
  let ny = this.data.dragStart.originY + dy

  // 吸附：按住吸附键或默认四舍五入到 0.5 格
  nx = Math.round(nx * 2) / 2
  ny = Math.round(ny * 2) / 2

  // 边界限制
  nx = Math.max(0, nx); ny = Math.max(0, ny)

  this.updateArea(this.data.draggingId, { gridX: nx, gridY: ny })
  this.showAlignGuides(this.data.draggingId)   // 显示对齐辅助线
},

onCanvasTouchEnd() {
  this.setData({ draggingId: null, dragStart: null })
  this.hideAlignGuides()
}
```

### 5.3 对齐吸附与辅助线

- **网格吸附**：默认吸附到 0.5 格（可切换 1 格）。
- **智能对齐**：拖动时实时检测其他分区的边缘，若在 ±0.3 格范围内，自动吸附并显示红色辅助线。

```js
showAlignGuides(dragId) {
  const cur = this.getArea(dragId)
  const guides = []  // { type: 'v'|'h', pos: 格坐标 }

  this.data.areas.forEach(a => {
    if (a.id === dragId) return
    // 左边缘对齐：cur.gridX ≈ a.gridX
    if (Math.abs(cur.gridX - a.gridX) < 0.3) {
      guides.push({ type: 'v', pos: a.gridX })
      cur.gridX = a.gridX  // 吸附
    }
    // 右边缘对齐：cur.gridX+cols ≈ a.gridX+a.cols
    if (Math.abs((cur.gridX + cur.cols) - (a.gridX + a.cols)) < 0.3) {
      guides.push({ type: 'v', pos: a.gridX + a.cols })
      cur.gridX = a.gridX + a.cols - cur.cols
    }
    // 顶边 / 底边同理...
  })

  this.setData({ alignGuides: guides })
}
```

### 5.4 分区编辑器（属性面板）

选中分区后底部弹出：

| 字段 | 组件 | 说明 |
|---|---|---|
| 名称 | input | 必填，≤ 8 字 |
| 排数 | number | 1 ~ 99 |
| 列数 | number | 1 ~ 99 |
| 排号类型 | picker | 数字 / 字母 |
| 票价 | number | 元 |
| 颜色 | color-picker | 建议 6 种预设色 + 自定义 |
| X 坐标 | number | 可手动微调 |
| Y 坐标 | number | 可手动微调 |
| 删除 | button | 有选座记录时二次确认 |

### 5.5 画布缩放

- 双指捏合：`scale` 范围 `[0.2, 2.0]`
- 「适应屏幕」按钮：根据画布包围盒自动计算 `scale` 让整个场馆可见
- 缩放时以双指中心为锚点平移 `scrollLeft / scrollTop`

```js
calcFitScale() {
  const { canvasW, canvasH, seatW, gap, viewW, viewH } = this.data
  const totalW = canvasW * (seatW + gap)
  const totalH = canvasH * (seatW + gap)
  const s = Math.min(viewW / totalW, viewH / totalH, 1)
  return Math.max(s, 0.2)
}
```

### 5.6 常用布局模板（提高管理员效率）

提供一键套用模板：

| 模板 | 布局 |
|---|---|
| 一字型 | 所有分区同 Y，横向排列 |
| 剧院式 | 舞台在上，VIP 居中，两侧普通区 |
| 体育场四面台 | 舞台居中，四角分区环绕 |
| 三面台 | 舞台在上，左/中/右三块 |

模板只是预填 `gridX/gridY/rows/cols`，管理员仍可手动微调。

---

## 六、用户端：总览渲染

### 6.1 页面结构

```
pages/seat/select
┌─────────────────────────────────────────┐
│  周杰伦嘉年华演唱会 · 武汉体育中心          │
├─────────────────────────────────────────┤
│  [图例] ●可选 ●已选 ●我的 ●不可选          │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ scroll-view (双轴滚动 + 缩放)       │  │
│  │                                    │  │
│  │   ┌──────┐          ┌──────┐       │  │
│  │   │ A区  │          │ B区   │       │  │
│  │   └──────┘          └──────┘       │  │
│  │                                    │  │
│  │        ┌──────────────┐            │  │
│  │        │    VIP区      │            │  │
│  │        └──────────────┘            │  │
│  │                                    │  │
│  │            ┌─────┐                 │  │
│  │            │舞台  │                 │  │
│  │            └─────┘                 │  │
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ 已选：A区3排5号, A区3排6号   合计 ¥1760  │
│           [ 确认选座 ]                   │
└─────────────────────────────────────────┘
```

### 6.2 渲染数据结构

前端把配置预处理成「画布上的绝对定位元素数组」，交给 `scroll-view` 渲染：

```js
buildCanvasItems(config) {
  const { seatW, seatH, gap } = config
  const cellW = seatW + gap
  const cellH = seatH + gap

  return config.areas.map(area => {
    const isStage = area.isStage
    const w = isStage
      ? area.stageW * cellW - gap
      : area.cols * cellW - gap
    const h = isStage
      ? area.stageH * cellH - gap
      : area.rows * cellH - gap

    return {
      id: area.id,
      name: area.name,
      isStage,
      color: area.color,
      left: area.gridX * cellW,
      top:  area.gridY * cellH,
      width: w,
      height: h,
      // 座位在分区内部用相对定位，避免生成几千个绝对定位节点
      seats: isStage ? [] : buildSeats(area)
    }
  })
}
```

**性能关键**：分区用绝对定位容器，座位在容器内用 `flex / 相对定位`，避免每个座位都计算绝对坐标。2000 座也只需要 2000 个 `view` + 少量容器。

### 6.3 座位状态渲染

```wxml
<scroll-view scroll-x scroll-y class="canvas-wrap"
  style="transform: scale({{scale}})">
  <view class="canvas" style="width:{{canvasW}}px;height:{{canvasH}}px">

    <block wx:for="{{items}}" wx:key="id">
      <!-- 分区容器 -->
      <view class="area {{item.isStage ? 'stage' : ''}}"
        style="left:{{item.left}}px;top:{{item.top}}px;
               width:{{item.width}}px;height:{{item.height}}px;
               border-color:{{item.color}}">
        <view class="area-name">{{item.name}}</view>

        <!-- 座位（非舞台） -->
        <block wx:if="{{!item.isStage}}">
          <view wx:for="{{item.seats}}" wx:for-item="row" wx:for-index="r"
                wx:key="r" class="seat-row">
            <view wx:for="{{row}}" wx:for-item="seat" wx:key="c"
                  class="seat seat-{{seat.state}}"
                  data-area="{{item.id}}"
                  data-row="{{seat.row}}"
                  data-col="{{seat.col}}"
                  data-label="{{seat.label}}"
                  bindtap="onSeatTap">
              {{seat.col}}
            </view>
          </view>
        </block>

      </view>
    </block>

    <!-- 对齐辅助线（仅管理端） -->

  </view>
</scroll-view>
```

### 6.4 已选座位查询优化

`takenSet` 用扁平 Map 存储，key = `${areaId}-${row}-${col}`：

```js
// 拉取已选座位后
const takenMap = {}
res.seats.forEach(s => {
  takenMap[`${s.areaId}-${s.row}-${s.col}`] = s.mine ? 'mine' : 'taken'
})
this.setData({ takenMap })
```

座位渲染时通过 `state = takenMap[key] || 'available'` 决定样式，**避免遍历数组 O(n²)**。

### 6.5 大画布滚动体验

- `scroll-view` 的 `enhanced` 模式开启（iOS 惯性滑动更顺滑）
- 初始进入自动定位到画布中心：
  ```js
  const offsetX = (canvasW - viewW) / 2
  const offsetY = (canvasH - viewH) / 2
  this.setData({ scrollLeft: Math.max(0, offsetX), scrollTop: Math.max(0, offsetY) })
  ```
- 双指缩放使用 `movable-area / movable-view` 或自研手势（推荐自研，可控性高）

---

## 七、关键代码片段

### 7.1 服务端：保存配置时重算画布

```java
@Transactional
public void saveSeatConfig(Long concertId, SeatConfigDTO dto) {
    List<SeatArea> areas = dto.getAreas();

    double maxX = 0, maxY = 0;
    for (SeatArea a : areas) {
        double w = a.getIsStage() == 1 ? a.getStageW() : a.getCols();
        double h = a.getIsStage() == 1 ? a.getStageH() : a.getRows();
        maxX = Math.max(maxX, a.getGridX() + w);
        maxY = Math.max(maxY, a.getGridY() + h);
    }

    // 保存分区
    seatAreaMapper.deleteByConcertId(concertId);
    areas.forEach(a -> { a.setConcertId(concertId); seatAreaMapper.insert(a); });

    // 更新演唱会元信息
    Concert c = new Concert();
    c.setId(concertId);
    c.setSeatEnabled(1);
    c.setSeatCanvasW(maxX);
    c.setSeatCanvasH(maxY);
    c.setSeatVersion(c.getSeatVersion() + 1); // 版本号自增，触发客户端刷新
    concertMapper.updateById(c);
}
```

### 7.2 前端：座位点击逻辑（v1.1 与 v1.0 一致）

```js
onSeatTap(e) {
  const { area, row, col, label } = e.currentTarget.dataset
  const key = `${area}-${row}-${col}`
  const state = this.data.takenMap[key]

  // 已被占用 → 引导截图
  if (state === 'taken') {
    return this.showTakenModal({ area, row, col, label })
  }
  // 我的座位 → 不可取消
  if (state === 'mine') {
    return wx.showToast({ title: '这是您已选中的座位', icon: 'none' })
  }

  // 可选座位 → 切换选座车
  const selected = this.data.selectedMap[key]
  if (selected) {
    delete this.data.selectedMap[key]
    this.removeFromCart(key)
  } else {
    if (this.data.maxSeatsPerUser > 0 &&
        this.data.cart.length >= this.data.maxSeatsPerUser) {
      return wx.showToast({ title: `最多可选 ${this.data.maxSeatsPerUser} 个座位`, icon: 'none' })
    }
    this.addToCart({ area, row, col, label, key })
  }
  this.refreshSeatStates()
}
```

### 7.3 前端：批量局部刷新座位状态

```js
refreshSeatStates() {
  const patch = {}
  Object.keys(this.data.selectedMap).forEach(k => {
    const [area, row, col] = k.split('-')
    patch[`stateMap.${area}.${row}.${col}`] = 'selected'
  })
  // ... 还原取消选中的
  this.setData(patch)
}
```

> 若座位数量极大（> 3000），建议改为 **Canvas 渲染**：一次性绘制座位矩阵，点击时通过 `(x,y) → (row,col)` 反算。可参考 v1.0 文档「6.1 座位图渲染方案」中的 Canvas 分支。

---

## 八、边界与异常（新增）

| 场景 | 处理 |
|---|---|
| 分区重叠 | 管理端拖拽时若与其他分区重叠，红色高亮警告；保存时校验并阻止（除非开启「允许重叠」） |
| 分区超出画布 | 自动扩展 `canvasW/canvasH`，无需限制，但管理端应给出提示 |
| 画布过大（>5000 格） | 提示管理员拆分或缩小布局；用户端 Canvas 方案兜底 |
| 分区名重复 | 保存时校验同一演唱会内名称唯一 |
| 舞台/装饰区被误删 | 删除时二次确认，不涉及选座记录 |
| 管理员拖动后未保存就退出 | 离开页面拦截（`onUnload` 弹窗） |
| 手机端拖拽精度差 | 提供 X/Y 数字输入框做精细调整 |
| 缩放后点击偏移 | 所有点击坐标必须除以 `scale` 还原到画布坐标系 |

---

## 九、管理端交互细节补充

### 9.1 分区在管理画布上的渲染

管理端不需要渲染真实座位（性能），而是把分区渲染成**带颜色的矩形块 + 名称 + 行列数**：

```
┌────────────────────┐
│  A区                │
│  10排 × 20列        │
│  ¥880              │
└────────────────────┘
```

- 选中态：边框加粗 + 四角显示缩放手柄
- 拖动手柄：整体拖动
- 拖右下角：调整 `cols/rows`（实时显示格数）

### 9.2 快捷键 / 辅助按钮

- `↑↓←→` 按 0.5 格微调选中分区
- 「水平对齐」「垂直对齐」「等间距分布」按钮（多选时可用）
- 「撤销 / 重做」（维护操作栈，最多 20 步）

### 9.3 保存前预览

保存前弹出「用户端预览」，用同一个渲染组件以只读模式展示，避免配错。

---

## 十、验收标准（v1.1 追加）

1. 管理员在管理端可拖动任意分区到画布任意位置，保存后位置持久化。
2. 拖动时与相邻分区边缘对齐会显示辅助线并自动吸附。
3. 管理员新增「舞台」虚拟区，用户端画布上正确显示为不可点击的装饰块。
4. 用户端在总览模式下可看到全部已配置分区，位置与管理员配置一致。
5. 双指缩放、单指拖动、点击座位互不干扰，缩放后点击命中准确。
6. 2000 座总览页在 iPhone 12 上首次渲染 < 1.5s，滑动无明显卡顿。
7. 分区重叠保存时被拦截并提示具体分区名。
8. 已发布（有选座记录）的演唱会被拖动修改位置后，已选座位仍能正确渲染在新位置。
9. 管理员未保存就退出页面时弹出「放弃更改」确认。
10. 用户端「适应屏幕」按钮点击后整个场馆完整可见。

---

## 十一、开发排期追加（相对 v1.0）

| 阶段 | 内容 | 追加工时 |
|---|---|---|
| P0 | DB 变更（grid_x/grid_y/stage）+ 接口改造 | 0.5d |
| P0 | 管理端拖拽画布 + 属性面板 | 3d |
| P0 | 对齐吸附与辅助线 | 1d |
| P1 | 用户端总览渲染改造（含缩放） | 2d |
| P1 | 大画布性能优化（Canvas 兜底可选） | 1.5d |
| P2 | 布局模板、撤销重做、预览 | 1.5d |
| — | **追加合计** | **约 9.5 人日** |

---


# 座位号自定义
# 演唱会选座 · 座位编号自定义补充开发文档

> 版本：v1.2
> 变更点：座位号不再由「列号 = 1,2,3...」隐式生成，改为**支持自定义编号**（如 A区单数 1,3,5,7 / B区双数 2,4,6,8）。排号同样支持自定义。

---

## 一、需求场景

真实场馆中，座位编号往往不是简单的自然序列，常见情况：

| 场景 | 示例 |
|---|---|
| 单双号分侧 | A区（左）编号 1,3,5,7...；B区（右）编号 2,4,6,8... |
| 从中间向两边 | 中间为 1号，左右递增 |
| 带前缀 | `A1, A2, A3` 或 `1号, 2号` |
| 排号字母 | A排、B排、C排 |
| 中文序号 | 一排、二排、三排 |
| 跳号 | 1-10, 15-20（中间有过道） |
| 倒序 | 从后往前 20,19,18... |

**设计原则**：座位的**唯一标识仍是 `(areaId, row, col)` 网格坐标**，编号只是**显示层的字符串**。这样既能保证并发选座逻辑不变，又能灵活展示任意编号。

---

## 二、编号模型

每个分区独立维护两个数组：

```js
{
  rowLabels: ["1排", "2排", "3排", ...],   // 长度 = rows
  colLabels: ["1", "3", "5", "7", ...]     // 长度 = cols
}
```

- **数组下标 i** 对应网格的第 `i+1` 排 / 第 `i+1` 列。
- 数组元素是**显示字符串**，可含任意字符。
- 长度必须严格等于 `rows / cols`，由服务端校验。
- 允许重复（跨分区可重复，同分区内建议唯一，但不强制）。

用户端点击座位时，展示的是 `colLabels[col-1]`，提交给服务端的是 `col`（数字）。

---

## 三、数据库变更

```sql
ALTER TABLE `seat_area`
  ADD COLUMN `row_labels` JSON NULL COMMENT '排号显示数组，长度=rows，如["1排","2排"]',
  ADD COLUMN `col_labels` JSON NULL COMMENT '列号显示数组，长度=cols，如["1","3","5"]',
  ADD COLUMN `label_rule` JSON NULL COMMENT '编号生成规则（用于回显和重新生成）';
```

`label_rule` 示例（用于管理端回显，不影响渲染）：

```json
{
  "row": { "type": "number", "start": 1, "step": 1, "prefix": "", "suffix": "排", "pad": 0 },
  "col": { "type": "number", "start": 1, "step": 2, "prefix": "", "suffix": "",  "pad": 0 }
}
```

> 若不想引入 JSON 字段，也可用 TEXT 存 JSON 字符串，兼容性更好。MySQL 5.7+ 推荐用 JSON。

---

## 四、接口变更

### 4.1 座位配置接口（返回编号数组）

```
GET /api/concert/{concertId}/seat-config
```

```json
{
  "areas": [
    {
      "id": 10,
      "name": "A区",
      "rows": 10,
      "cols": 20,
      "gridX": 0, "gridY": 0,
      "rowLabels": ["1排","2排","3排","4排","5排","6排","7排","8排","9排","10排"],
      "colLabels": ["1","3","5","7","9","11","13","15","17","19","21","23","25","27","29","31","33","35","37","39"],
      "price": 880.00,
      "color": "#4A90D9",
      "isStage": false
    },
    {
      "id": 11,
      "name": "B区",
      "rows": 10, "cols": 20,
      "gridX": 22, "gridY": 0,
      "rowLabels": ["1排","2排", "..."],
      "colLabels": ["2","4","6","8","10","12","14","16","18","20","22","24","26","28","30","32","34","36","38","40"],
      "price": 880.00,
      "color": "#67C23A",
      "isStage": false
    }
  ]
}
```

### 4.2 保存座位配置（管理端）

```json
POST /api/admin/concert/{concertId}/seat-config
{
  "areas": [
    {
      "id": 10,
      "name": "A区",
      "rows": 10, "cols": 20,
      "gridX": 0, "gridY": 0,
      "rowLabels": ["1排","2排","..."],
      "colLabels": ["1","3","5","..."],
      "labelRule": { "row": {...}, "col": {...} },
      "price": 880.00,
      "color": "#4A90D9",
      "isStage": false
    }
  ],
  "maxSeatsPerUser": 6,
  "force": false
}
```

**服务端校验**：

- `rowLabels.length === rows`，`colLabels.length === cols`，不满足直接 400。
- 单个编号长度 ≤ 8 字符。
- 编号不允许空字符串。
- 同分区内 `colLabels` 若有重复，返回警告（非阻塞），管理端可二次确认。

### 4.3 选座提交接口（不变）

```json
POST /api/concert/{concertId}/seat-select
{
  "seatVersion": 3,
  "seats": [
    { "areaId": 10, "row": 3, "col": 5 },   // 注意：这里传网格坐标，不传编号
    { "areaId": 10, "row": 3, "col": 6 }
  ]
}
```

**关键**：所有内部逻辑都用 `row / col` 网格坐标，编号只在展示层使用。已选座位表 `seat_selection` 无需变更，仍存 `row_no / col_no`，仅 `seat_label` 字段冗余时用编号拼接（如 `A区 3排 5号`）。

### 4.4 已选座位接口（不变）

返回 `row / col`，前端渲染时用 `area.colLabels[col-1]` 转成显示编号。

---

## 五、管理端 UI

### 5.1 属性面板新增「编号设置」区块

在分区编辑面板中，新增两个折叠区块：

```
┌─────────────────────────────────────────────┐
│  排号设置                                    │
│  ┌─────────────────────────────────────┐    │
│  │ 类型:  [数字 ▾]                      │    │
│  │ 起始:  [1]      步长: [1]            │    │
│  │ 前缀:  [ ]      后缀: [排]           │    │
│  │ 补零:  [关]                          │    │
│  │ [ 批量生成 ]  [ 手动编辑 ]           │    │
│  └─────────────────────────────────────┘    │
│  预览: 1排, 2排, 3排, 4排, 5排...            │
├─────────────────────────────────────────────┤
│  列号设置                                    │
│  ┌─────────────────────────────────────┐    │
│  │ 类型:  [数字 ▾]                      │    │
│  │ 起始:  [1]      步长: [2]            │    │
│  │ 前缀:  [ ]      后缀: [ ]            │    │
│  │ 补零:  [关]                          │    │
│  │ [ 批量生成 ]  [ 手动编辑 ]  [导入]   │    │
│  └─────────────────────────────────────┘    │
│  预览: 1, 3, 5, 7, 9, 11, 13...             │
└─────────────────────────────────────────────┘
```

### 5.2 批量生成逻辑

```js
function generateLabels(rule, count) {
  const { type, start, step, prefix, suffix, pad } = rule
  const arr = []
  for (let i = 0; i < count; i++) {
    let v
    if (type === 'number') {
      v = start + i * step
      if (pad > 0) v = String(v).padStart(pad, '0')
    } else if (type === 'letter') {
      // 起始字母 + i*step 个字母
      const base = start.toString().charCodeAt(0)
      v = String.fromCharCode(base + i * step)
    } else if (type === 'chinese') {
      v = toChineseNumber(start + i * step)
    }
    arr.push(`${prefix || ''}${v}${suffix || ''}`)
  }
  return arr
}
```

**支持的类型**：

| type | 说明 | start 示例 |
|---|---|---|
| `number` | 阿拉伯数字 | `1` |
| `letter` | 英文字母 | `"A"` |
| `chinese` | 中文数字 | `1` → 一、二、三 |
| `custom` | 自定义序列 | 手动填 |

### 5.3 手动编辑模式

点击「手动编辑」弹出可滚动列表，每一行是「第 N 列 → [编号输入框]」：

```
第 1 列  → [ 1  ]
第 2 列  → [ 3  ]
第 3 列  → [ 5  ]
第 4 列  → [ 7  ]
...
```

也支持「粘贴导入」：用户粘贴 `1,3,5,7,9` 或每行一个，自动拆分。

### 5.4 列数变化时的处理

当管理员修改 `cols` 时，弹出提示：

```
列数已从 20 改为 25，编号数组需同步处理：
  ○ 按当前规则重新生成（推荐）
  ○ 保留前 20 个，后 5 个留空
  ○ 手动编辑
```

选择后更新 `colLabels`。

### 5.5 一键「单双号」快捷模板

在列号设置区提供快捷按钮：

- 【全单数】→ start=1, step=2
- 【全双数】→ start=2, step=2
- 【自然序】→ start=1, step=1
- 【倒序】→ start=cols, step=-1

点击后立即生成并预览。

---

## 六、用户端展示

### 6.1 渲染时使用编号

之前渲染座位的伪代码：

```wxml
<view class="seat" ...>{{seat.col}}</view>
```

改为：

```js
// buildSeats(area) 时
buildSeats(area) {
  const rows = []
  for (let r = 1; r <= area.rows; r++) {
    const row = []
    for (let c = 1; c <= area.cols; c++) {
      row.push({
        row: r,
        col: c,
        rowLabel: area.rowLabels[r - 1],   // 显示用
        colLabel: area.colLabels[c - 1],   // 显示用
        state: 'available'
      })
    }
    rows.push(row)
  }
  return rows
}
```

```wxml
<view class="seat seat-{{seat.state}}"
  data-row="{{seat.row}}" data-col="{{seat.col}}"
  data-row-label="{{seat.rowLabel}}"
  data-col-label="{{seat.colLabel}}"
  bindtap="onSeatTap">
  {{seat.colLabel}}
</view>
```

### 6.2 排号轴显示

左侧排号轴读 `rowLabels`：

```wxml
<view class="row-axis">
  <view wx:for="{{area.rowLabels}}" wx:key="index" class="row-label">
    {{item}}
  </view>
</view>
```

### 6.3 选座车 / 已选列表展示

`label` 拼接规则：

```js
seatLabel = `${area.name} ${area.rowLabels[row-1]} ${area.colLabels[col-1]}号`
// 例：A区 3排 5号
```

如果 `colLabels` 本身已带"号"后缀（如 `5号`），拼接时判断避免重复：

```js
function buildLabel(area, row, col) {
  const r = area.rowLabels[row - 1]
  const c = area.colLabels[col - 1]
  const cSuffix = /[号座]$/.test(c) ? '' : '号'
  return `${area.name} ${r} ${c}${cSuffix}`
}
```

### 6.4 弹窗提示文案（点击已被选座位）

```
该座位（A区 3排 5号）已被他人选择
如需沟通，可截图发到群聊
[保存座位图] [我知道了]
```

保存的图片中，座位编号显示的是用户看到的编号（`colLabels`）。

---

## 七、关键代码

### 7.1 服务端保存校验

```java
private void validateLabels(SeatArea area) {
    List<String> rows = area.getRowLabels();
    List<String> cols = area.getColLabels();

    if (rows == null || rows.size() != area.getRows()) {
        throw new BizException("排号数量与排数不一致");
    }
    if (cols == null || cols.size() != area.getCols()) {
        throw new BizException("列号数量与列数不一致");
    }
    for (String s : rows) {
        if (StringUtils.isBlank(s) || s.length() > 8) {
            throw new BizException("排号格式不正确");
        }
    }
    for (String s : cols) {
        if (StringUtils.isBlank(s) || s.length() > 8) {
            throw new BizException("列号格式不正确");
        }
    }
    // 同分区内列号重复 → 仅警告
    Set<String> set = new HashSet<>(cols);
    if (set.size() < cols.size()) {
        log.warn("分区 {} 存在重复列号", area.getName());
    }
}
```

### 7.2 中文数字生成

```js
const CN = ['零','一','二','三','四','五','六','七','八','九']
function toChineseNumber(n) {
  if (n < 10) return CN[n]
  if (n < 20) return '十' + (n === 10 ? '' : CN[n - 10])
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return CN[tens] + '十' + (ones === 0 ? '' : CN[ones])
}
```

### 7.3 已选座位记录冗余标签

`seat_selection.seat_label` 存的是**提交时的显示标签**：

```java
String label = String.format("%s %s %s",
    area.getName(),
    area.getRowLabels().get(row - 1),
    area.getColLabels().get(col - 1));
```

> 若管理员后续修改了编号规则，历史记录的 `seat_label` 保持不变（避免历史订单错乱），但 `row_no / col_no` 不变，渲染时仍能定位。

---

## 八、边界与异常

| 场景 | 处理 |
|---|---|
| 编号数组长度与行/列数不一致 | 保存时 400 拒绝 |
| 管理员只填了前几个编号，后面留空 | 允许，留空的座位**仍可点击**，但显示为空字符串（建议禁止提交，前端提示补全） |
| 编号含 emoji / 特殊字符 | 允许，长度按字符计（≤ 8） |
| 编号重复 | 同分区内警告，跨分区允许 |
| 管理员修改了编号，但已有选座记录 | 提示：「已存在 N 个选座记录，修改编号后新选座将使用新编号，历史记录不受影响」 |
| 编号过长导致座位撑开 | 座位宽度固定，超出部分 `text-overflow: ellipsis`，`title` 或长按查看完整编号 |
| 用户切换设备后看到不同编号 | 不可能，编号来自服务端配置 |
| 座位图上同时显示编号和图标（如已选勾选） | 已选座位优先显示勾，编号通过弹窗查看；或编号下方加小圆点标记 |

---

## 九、用户端样式建议

- 座位内编号字号 `20rpx`，小但可读
- 编号位数 > 2 时，字号自动缩小（`class="small"`）
- 已选 / 已占座位可隐藏编号，只显示状态色 + 勾/叉
- 排号轴字号 `24rpx`，加粗

```css
.seat {
  font-size: 20rpx;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seat.small { font-size: 16rpx; }
.seat.selected, .seat.taken { color: transparent; }  /* 状态座位隐藏编号 */
```

---

## 十、验收标准（v1.2 追加）

1. A区列号设置为 `start=1, step=2`，保存后用户端 A区第一排显示 1,3,5,7,9... 且座位可正常选中。
2. B区列号设置为 `start=2, step=2`，用户端 B区显示 2,4,6,8,10...。
3. 排号设置为字母（A,B,C...），左侧排号轴正确显示 A、B、C。
4. 排号设置为中文（一、二、三），正确显示。
5. 列号数组长度与 `cols` 不匹配时，保存被拒绝并提示。
6. 手动编辑第 5 列编号为 `VIP`，用户端第 5 列显示 VIP。
7. 修改列数后选择「按当前规则重新生成」，编号数组同步更新。
8. 已存在选座记录的分区修改编号规则，历史记录标签不变，新选座使用新编号。
9. 选座车展示的标签为 `A区 3排 5号`（使用自定义编号，不是 col=5 的原始值）。
10. 保存到相册的座位图中，被点击座位显示的编号与用户看到的编号一致。

---

## 十一、开发排期追加（相对 v1.1）

| 阶段 | 内容 | 追加工时 |
|---|---|---|
| P0 | DB 增加 `row_labels / col_labels / label_rule` + 保存校验 | 0.5d |
| P0 | 管理端编号批量生成器 + 手动编辑面板 | 1.5d |
| P0 | 用户端渲染改造（读取编号数组） | 0.5d |
| P1 | 中文数字、字母、倒序、单双号快捷模板 | 0.5d |
| P1 | 列数变化联动处理 + 历史记录兼容 | 0.5d |
| P2 | 编号导入粘贴、重复警告 | 0.5d |
| — | **追加合计** | **约 4 人日** |

---

## 十二、扩展


- **分段编号**：一个分区内分左右两段，各自独立编号（如左 1-10，右 11-20）
- **按字母+数字组合**：`A1-A20, B1-B20` 自动分行
- **从中间向两侧编号**：配置中心列，左右分别递增/递减


---
