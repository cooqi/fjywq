# 灯牌小程序 设计文档 v1.0

> 定位：演唱会现场手持 LED 应援灯牌
> 技术：uni-app + 微信小程序原生渲染（不依赖云函数，纯本地）
> 核心：**静态适配屏幕 / 动态滚动闪烁 / 逐字上色发光 / 多行禁滚动**

---

## 一、需求拆解与关键决策

### 1.1 需求矩阵

| 维度 | 选项 | 约束 |
|---|---|---|
| **模式** | 静态 / 动态 | - |
| **动态** | 滚动 / 闪烁 | - |
| **滚动** | 方向（上下左右）+ 循环开关 | **多行禁用** |
| **闪烁** | 效果（闪/脉冲/彩虹/闪光）+ 目标（文字闪/背景闪） | - |
| **字体大小** | 适应 / 小 / 中 / 大 / 再大 + 手动微调 | **全局统一，不支持逐字** |
| **颜色** | 逐字设颜色 + 逐字设发光色 | 颜色和发光色独立 |
| **行数** | 单行 / 多行 | **多行禁止滚动** |

### 1.2 三个关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 渲染方式 | **DOM + CSS Animation**（不用 Canvas） | 灯牌文字量小（< 50 字），DOM 够用；逐字上色、发光、动画都更简单 |
| 字体自适应 | **Canvas measureText 二分查找** | 精确，中英文混排也准 |
| 动画实现 | **CSS Animation**（不用 rAF） | 交给合成层，不阻塞 JS，省电 |

### 1.3 屏向假设

**竖屏**。灯牌是手持举过头顶，竖屏是主流。横屏作为"进阶选项"在设置里提供（旋转 90° 渲染）。

---

## 二、数据模型

```js
// 灯牌配置对象（一个完整的灯牌）
{
  id: 'uuid',
  name: '未命名灯牌',
  updateTime: 1728000000,

  // 内容
  lines: [
    {
      chars: [
        { char: '手', color: '#FF0066', glow: '#FF0066' },
        { char: '机', color: '#00D4FF', glow: '#00D4FF' }
      ]
    },
    {
      chars: [
        { char: '灯', color: '#FFD700', glow: '#FFD700' },
        { char: '牌', color: '#00FF88', glow: '#00FF88' }
      ]
    }
  ],

  // 背景
  bgColor: '#000000',

  // 字体大小
  fontSize: {
    preset: 'fit',        // fit | small | medium | large | xlarge | custom
    value: null,          // preset=custom 时的 px 值
    actual: 0             // 运行时计算出的实际 px（不存库）
  },

  // 模式
  mode: 'static',         // static | scroll | blink

  // 滚动参数
  scroll: {
    direction: 'left',    // left | right | up | down
    loop: true,           // true 循环 | false 单次
    speed: 5              // 1-10，对应 10s-2s 一圈
  },

  // 闪烁参数
  blink: {
    target: 'text',       // text | bg | both
    effect: 'flash',      // flash | pulse | rainbow | shimmer
    speed: 500            // 毫秒
  }
}
```

**存储**：`uni.setStorageSync('lanban_list', [...])`，最多存 20 个灯牌方案。不依赖服务端。

---

## 三、页面结构

```
pages/
├── index/index          首页（我的灯牌列表 + 新建）
├── editor/editor        编辑器（核心）
└── display/display      全屏展示
```

### 3.1 编辑器布局（参考截图）

```
┌────────────────────────────────┐
│        预览区（实时渲染）        │
│        手机灯牌                 │
│                                │
├────────────────────────────────┤
│  [文字] [颜色] [大小] [效果]     │  ← 顶部 Tab
├────────────────────────────────┤
│  当前 Tab 对应的编辑面板         │
│                                │
│  ┌──────────────────────────┐  │
│  │ 色板 / 滑杆 / 选项网格    │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

**四个 Tab 的职责**：

| Tab | 内容 |
|---|---|
| **文字** | 多行输入、添加/删除行、每行文字编辑、逐字上色入口 |
| **颜色** | 背景色、默认字色、默认发光色、批量应用 |
| **大小** | 适应 / 小 / 中 / 大 / 再大 / 自定义滑杆 |
| **效果** | 静态 / 滚动 / 闪烁 + 各自子选项 |

---

## 四、核心算法

### 4.1 字体自适应（二分查找 + measureText）

```js
// utils/fitFontSize.js
let _ctx = null
function getCtx() {
  if (_ctx) return _ctx
  // 用离屏 canvas 测量
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: 1, height: 1 })
  _ctx = canvas.getContext('2d')
  return _ctx
}

/**
 * 测量一组文字在指定字号下的宽高
 * @param {Array} lines  形如 [{chars:[{char:'手'},...]}, ...]
 * @param {Number} fontSize
 * @returns {{maxW:Number, totalH:Number}}
 */
export function measure(lines, fontSize) {
  const ctx = getCtx()
  ctx.font = `${fontSize}px -apple-system, "PingFang SC", sans-serif`

  let maxW = 0
  for (const line of lines) {
    const text = line.chars.map(c => c.char).join('')
    const w = ctx.measureText(text).width
    if (w > maxW) maxW = w
  }
  // 行高 1.2，字间距不算（CSS 处理）
  const totalH = lines.length * fontSize * 1.2
  return { maxW, totalH }
}

/**
 * 二分查找最大可用字号
 * @param {Number} containerW  容器宽（px）
 * @param {Number} containerH  容器高（px）
 * @param {Array}  lines
 * @param {Number} padding     边距（px），默认 40
 */
export function findFitFontSize(containerW, containerH, lines, padding = 40) {
  const W = containerW - padding * 2
  const H = containerH - padding * 2

  let lo = 12
  let hi = Math.min(W, H)  // 上限：屏幕短边
  let best = lo

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const { maxW, totalH } = measure(lines, mid)

    if (maxW <= W && totalH <= H) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

/**
 * 根据 preset 计算实际字号
 */
export function resolveFontSize(preset, customValue, containerW, containerH, lines) {
  const fitSize = findFitFontSize(containerW, containerH, lines)
  switch (preset) {
    case 'fit':    return fitSize
    case 'small':  return Math.round(fitSize * 0.4)
    case 'medium': return Math.round(fitSize * 0.6)
    case 'large':  return Math.round(fitSize * 0.8)
    case 'xlarge': return Math.round(fitSize * 0.95)
    case 'custom': return customValue || fitSize
    default:       return fitSize
  }
}
```

**为什么用二分**：中英文混排、标点、数字宽度不同，线性公式不准。二分 20 次内必收敛，性能可忽略。

### 4.2 容器尺寸获取

```js
// editor.vue
async getContainerSize() {
  return new Promise(resolve => {
    const query = uni.createSelectorQuery().in(this)
    query.select('#preview-area').boundingClientRect(rect => {
      resolve({ w: rect.width, h: rect.height })
    }).exec()
  })
}
```

### 4.3 逐字渲染

```vue
<!-- 渲染单行 -->
<view class="line">
  <text
    v-for="(c, i) in line.chars"
    :key="i"
    class="char"
    :style="charStyle(c)"
  >{{ c.char }}</text>
</view>
```

```js
charStyle(c) {
  const glow = c.glow || c.color
  return {
    color: c.color,
    // 多层 text-shadow 做发光
    textShadow: [
      `0 0 0.05em ${glow}`,
      `0 0 0.1em ${glow}`,
      `0 0 0.2em ${glow}`,
      `0 0 0.4em ${glow}`,
      `0 0 0.8em ${glow}`
    ].join(', ')
  }
}
```

**关键点**：

- 每个字符是独立 `<text>`，可以独立设 `color` 和 `textShadow`
- 发光色和字色分离（截图里的"发光颜色"独立设置）
- 多层 shadow 叠加出霓虹灯管效果

---

## 五、动画实现

### 5.1 滚动（单行专用）

**多行时禁用滚动**——这是硬约束，UI 上直接不显示该选项。

```vue
<view v-if="mode === 'scroll' && lines.length === 1" class="scroll-wrap">
  <view class="scroll-track" :class="scrollClass" :style="scrollStyle">
    <text v-for="(c, i) in lines[0].chars" :key="i" :style="charStyle(c)">{{ c.char }}</text>
  </view>
</view>
```

```css
.scroll-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.scroll-track {
  display: inline-flex;
  white-space: nowrap;
  will-change: transform;
}

/* 左滚 */
.scroll-left {
  animation: scrollLeft linear infinite;
  animation-duration: var(--dur, 5s);
}
@keyframes scrollLeft {
  from { transform: translateX(100vw); }
  to   { transform: translateX(-100%); }
}

/* 右滚 */
.scroll-right {
  animation: scrollRight linear infinite;
  animation-duration: var(--dur, 5s);
}
@keyframes scrollRight {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100vw); }
}

/* 上滚 */
.scroll-up {
  animation: scrollUp linear infinite;
  animation-duration: var(--dur, 5s);
}
@keyframes scrollUp {
  from { transform: translateY(100vh); }
  to   { transform: translateY(-100%); }
}

/* 下滚同理 */
```

```js
computed: {
  scrollClass() {
    const loop = this.config.scroll.loop ? 'infinite' : '1'
    return `scroll-${this.config.scroll.direction}`
  },
  scrollStyle() {
    // speed 1-10 → duration 10s-2s
    const dur = 12 - this.config.scroll.speed
    return {
      '--dur': `${dur}s`,
      animationIterationCount: this.config.scroll.loop ? 'infinite' : '1'
    }
  }
}
```

**循环设置**：

| loop | 行为 |
|---|---|
| true | 无限循环，滑出后再进来 |
| false | 单次，滑完停住 |

**方向**：left / right / up / down。

**注意**：竖向滚动用 `translateY`，横向用 `translateX`，两者不共用 keyframes。

### 5.2 闪烁

```js
blinkClass() {
  const { target, effect } = this.config.blink
  return [
    `blink-effect-${effect}`,
    `blink-target-${target}`
  ].join(' ')
}
```

```css
/* ===== 效果 ===== */

/* 1. 闪烁：硬切 */
@keyframes flash {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.blink-effect-flash {
  animation: flash var(--blink-dur, 1s) step-end infinite;
}

/* 2. 脉冲：呼吸 */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}
.blink-effect-pulse {
  animation: pulse var(--blink-dur, 1s) ease-in-out infinite;
}

/* 3. 彩虹：逐字色相旋转（用 filter 更省） */
@keyframes rainbow {
  from { filter: hue-rotate(0deg); }
  to   { filter: hue-rotate(360deg); }
}
.blink-effect-rainbow {
  animation: rainbow var(--blink-dur, 2s) linear infinite;
}

/* 4. 闪光：白色高光扫过 */
.blink-effect-shimmer {
  position: relative;
}
.blink-effect-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 30%,
    rgba(255,255,255,.8) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: shimmer var(--blink-dur, 1.5s) linear infinite;
  mix-blend-mode: overlay;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* ===== 目标 ===== */
.blink-target-text .line { animation-fill-mode: both; }
.blink-target-bg { animation-fill-mode: both; }  /* 应用在容器上 */
.blink-target-both { animation-fill-mode: both; }
```

**目标应用**：

```js
// 计算动画类应该挂在哪个元素上
computed: {
  // 文字闪 → 挂在 .line 上
  textBlinkClass() {
    if (this.mode !== 'blink') return ''
    const t = this.config.blink.target
    if (t === 'bg') return ''
    return `blink-effect-${this.config.blink.effect}`
  },
  // 背景闪 → 挂在容器上
  bgBlinkClass() {
    if (this.mode !== 'blink') return ''
    const t = this.config.blink.target
    if (t === 'text') return ''
    return `blink-effect-${this.config.blink.effect}`
  }
}
```

**闪烁速度**：`--blink-dur` 由 `config.blink.speed` 决定，范围 200ms - 2000ms。

---

## 六、编辑器 Tab 实现

### 6.1 文字 Tab

```
┌────────────────────────────────┐
│  第 1 行  [ 手机灯牌      ]  ✕  │
│  第 2 行  [ 应援口号      ]  ✕  │
│  [ + 添加一行 ]                 │
├────────────────────────────────┤
│  逐字编辑                       │
│  ┌──┐┌──┐┌──┐┌──┐              │
│  │手││机││灯││牌│              │
│  └──┘└──┘└──┘└──┘              │
│   ↑ 点击某个字，下方出现：       │
│   字色 [色板]  发光 [色板]       │
└────────────────────────────────┘
```

**交互**：

- 输入文字后，自动拆成 `chars`，新增字符用默认色
- 删除字符时，从末尾删
- 点击某个字符 → 高亮 → 底部色板变成"该字的字色/发光色"
- 未选中字符时，色板作用于**所有字符**

**多行添加**：

```js
addLine() {
  if (this.config.lines.length >= 6) {
    return uni.showToast({ title: '最多 6 行', icon: 'none' })
  }
  this.config.lines.push({ chars: [] })
}
```

**切到多行时**：

```js
watch: {
  'config.lines.length'(n) {
    // 多行 → 强制切回静态
    if (n > 1 && this.config.mode === 'scroll') {
      this.config.mode = 'static'
      uni.showToast({ title: '多行不支持滚动，已切回静态', icon: 'none' })
    }
  }
}
```

### 6.2 颜色 Tab

```
┌────────────────────────────────┐
│  背景色                         │
│  [■][■][■][■][■][■][■][■]      │
│                                │
│  默认字色                       │
│  [■][■][■][■][■][■][■][■]      │
│                                │
│  默认发光色                     │
│  [■][■][■][■][■][■][■][■]      │
│                                │
│  [ 应用到所有文字 ]              │
└────────────────────────────────┘
```

**色板**（参考截图）：黑、白、红、绿、黄、蓝、粉、紫、青、橙 + 自定义取色器。

```js
const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00CC00',
  '#FFD700', '#0066FF', '#FF69B4', '#9933FF',
  '#00FFFF', '#FF8800', '#00FF88', '#FF0066'
]
```

### 6.3 大小 Tab

```
┌────────────────────────────────┐
│  [适应] [小] [中] [大] [再大]    │
│                                │
│  ─────────●──────────           │  ← 自定义滑杆
│  当前: 120px                    │
└────────────────────────────────┘
```

**逻辑**：

```js
onPresetChange(preset) {
  this.config.fontSize.preset = preset
  this.recalcFontSize()
}

async recalcFontSize() {
  const { w, h } = await this.getContainerSize()
  const size = resolveFontSize(
    this.config.fontSize.preset,
    this.config.fontSize.value,
    w, h,
    this.config.lines
  )
  this.actualFontSize = size
  this.config.fontSize.actual = size
}
```

**监听变化重算**：文字变、行数变、preset 变 → 重算。

### 6.4 效果 Tab

```
┌────────────────────────────────┐
│  [ 无 ] [ 多彩 ] [ 滚动 ] [ 闪烁 ]│
│  [ 脉冲 ] [ 彩虹 ] [ 闪光 ]      │
├────────────────────────────────┤
│  （选中滚动时）                  │
│  方向  [←] [→] [↑] [↓]          │
│  循环  [开 ●] [关 ○]            │
│  速度  ──────●──────             │
├────────────────────────────────┤
│  （选中闪烁时）                  │
│  目标  [文字闪] [背景闪] [都闪]   │
│  效果  [闪] [脉冲] [彩虹] [闪光]  │
│  速度  ──────●──────             │
├────────────────────────────────┤
│  （多行时）滚动选项灰显           │
│  ⚠ 多行不支持滚动                │
└────────────────────────────────┘
```

**映射关系**：

| 选项 | mode | effect |
|---|---|---|
| 无 | static | - |
| 多彩 | static | 逐字随机色（一次性生成） |
| 滚动 | scroll | - |
| 闪烁 | blink | flash |
| 脉冲 | blink | pulse |
| 彩虹 | blink | rainbow |
| 闪光 | blink | shimmer |

**多彩**是静态效果，但会重置所有字符颜色为随机色：

```js
applyMulticolor() {
  const colors = ['#FF0066', '#00D4FF', '#FFD700', '#00FF88', '#FF8800', '#9933FF']
  this.config.lines.forEach(line => {
    line.chars.forEach(c => {
      const color = colors[Math.floor(Math.random() * colors.length)]
      c.color = color
      c.glow = color
    })
  })
}
```

---

## 七、全屏展示页

```
┌────────────────────────────────┐
│                                │
│                                │
│         手机灯牌                │  ← 全屏，无导航栏
│                                │
│                                │
│                                │
│  [退出全屏]（3 秒后自动隐藏）    │
└────────────────────────────────┘
```

**进入方式**：编辑器预览区点击 → 全屏。

**关键设置**：

```js
onLoad() {
  // 保持屏幕常亮
  wx.setKeepScreenOn({ keepScreenOn: true })

  // 隐藏导航栏
  uni.hideNavigationBarLoading()
  // 在 pages.json 里设置 "navigationStyle": "custom"
}

onUnload() {
  wx.setKeepScreenOn({ keepScreenOn: false })
}
```

**亮度**：默认最大。可选加一个亮度调节（用 CSS `filter: brightness()` 模拟，或用 `wx.setScreenBrightness`）。

**退出**：右上角小按钮，点击 3 秒后淡出，再点屏幕任意处唤出。

---

## 八、边界与异常

| 场景 | 处理 |
|---|---|
| 文字为空 | 预览区显示占位"请输入文字" |
| 单行超长 | 静态模式下自动缩小字号直到适应；超出一定长度提示"文字过长" |
| 多行 + 滚动 | 强制切静态，Toast 提示 |
| 多行 + 文字超多 | 字号缩到最小 12px，仍超出则允许裁剪 |
| 屏幕旋转 | 竖屏为主，横屏可选（设置里切换） |
| 字符数 > 100 | 限制每行最多 50 字 |
| 行数 > 6 | 拒绝添加 |
| 中文 + emoji | measureText 对 emoji 宽度估算可能不准，用二分法兜底 |
| 字号算出来 < 12px | 强制 12px，并提示"内容过多" |
| 存储超限 | localStorage 单方案 < 10KB，20 个方案足够 |
| 低端机动画卡顿 | 彩虹/闪光效果提供"性能模式"降级为简单闪烁 |

---

## 九、工期估算

| 模块 | 人天 |
|---|---|
| 首页 + 灯牌列表 | 1 |
| 编辑器框架（4 个 Tab） | 1.5 |
| 文字输入 + 逐字拆分 + 逐字上色 | 1.5 |
| 字体自适应算法 | 1 |
| 颜色面板 + 色板 | 0.5 |
| 大小面板 + 滑杆 | 0.5 |
| 效果面板（静态/多彩/滚动/闪烁） | 2 |
| CSS 动画（滚动 4 方向 + 闪烁 4 效果） | 1.5 |
| 全屏展示页 | 1 |
| 本地存储 + 列表管理 | 0.5 |
| 联调测试 + 真机调优 | 2 |
| **合计** | **约 13 人天** |

1 个前端，**约 3 周**上线。无后端依赖，纯本地，部署成本几乎为零。

---

## 十、避坑清单

1. ❌ 用 Canvas 渲染文字 → 逐字上色、发光、动画全部要手写，成本翻 5 倍
2. ❌ 用固定公式算字号 → 中英混排、标点宽度不同，一定不准
3. ❌ 逐字 `text-shadow` 只写一层 → 没有霓虹感，必须 4-5 层叠加
4. ❌ 多行还允许滚动 → 用户明确要求禁止，UI 上要硬拦截
5. ❌ 滚动用 JS `setInterval` 改 `left` → 掉帧、耗电，必须用 CSS transform
6. ❌ 忘记 `will-change: transform` → 动画不触发 GPU 合成，低端机卡
7. ❌ 循环模式用 `translateX(100%)` → 相对父容器宽度，超长文本不对；应该用 `100vw`
8. ❌ 闪烁用 `animation-timing-function: linear` → 视觉上不"闪"，硬切要用 `step-end`
9. ❌ 全屏不设常亮 → 看几秒就息屏，用户骂街
10. ❌ 色板不给"自定义" → 追星应援色千变万化，必须支持取色器
11. ❌ 逐字颜色和发光色绑死 → 用户想要"红字蓝光"就做不了
12. ❌ 文字超长不提示 → 用户输入 200 字，缩到 3px 完全看不清
13. ❌ 不限制方案数量 → localStorage 写爆，整个小程序存储崩
14. ❌ 效果切换不重置旧动画 → 从滚动切闪烁，两个 class 同时存在，视觉错乱

---

## 十一、一句话总结

**灯牌小程序的本质是"把一段文字渲染成全屏发光霓虹灯，并提供可控的动态效果"**。核心设计：**Canvas 二分查找算字号 + DOM 逐字渲染 + text-shadow 多层叠加做发光 + CSS Animation 做滚动和闪烁 + 多行硬禁滚动**。三个关键点：① 字体自适应必须用 `measureText` 二分而非公式；② 逐字颜色和发光色独立存储、独立渲染；③ 滚动方向用不同 keyframes，循环用 `animation-iteration-count` 控制，闪烁的"硬切"用 `step-end`。

**无后端、纯本地、无登录**，1 人 3 周可上线。

