# 小程序「手机灯牌」功能开发文档

> 版本：v1.0
> 目标：在现有小程序（如演唱会选座/应援小程序）中新增「手机灯牌」互动工具模块。
> 核心能力：经典文字滚动 / 点阵LED质感、多参数自定义、双指缩放、横竖屏切换、一键保存相册。
> 适用场景：演唱会应援、生日祝福、粉丝线下互动。

---

## 一、需求拆解与决策确认

结合你提供的截图和文案，梳理出以下功能清单，并补齐隐藏的细节：

| 模块 | 功能点 | 补充决策 |
|---|---|---|
| 输入 | 多行文本 | 限制最多 30 字符，支持换行，过滤不支持的 emoji（点阵模式下无法渲染复杂表情） |
| 模式 | 经典模式 / 点阵LED | 两套渲染引擎，用户可随时切换 |
| 样式 | 字号、字重、颜色、光晕强度 | 字号 10~40，字重 100~900，颜色预设 8 色 + 自定义，光晕 0~100% |
| 动画 | 滚动方向、速度 | 向左/向右/静止，速度 0~100 |
| 手势 | 双指捏合缩放字号 | 缩放范围 10~40，缩放时显示实时字号提示 |
| 布局 | 横竖屏一键切换 | 推荐使用 CSS transform 旋转，兼容性更好，避免小程序页面重新加载 |
| 输出 | 一键保存到相册 | 需处理授权、离屏 Canvas 绘制、高清导出（2倍图/3倍图） |
| 交互 | 底部控制面板 | 输入框、模式切换、滑杆、颜色选择、保存按钮 |

---

## 二、页面结构与 UI 设计

```
pages/light-board/index
┌─────────────────────────────────────────────┐
│  [< 返回]        手机灯牌         [分享]    │
├─────────────────────────────────────────────┤
│                                             │
│           全屏预览区（黑底）                  │
│                                             │
│         ╭───────────────────────╮           │
│         │   生日快乐 ❤️ 🎉      │           │
│         │   （文字/点阵渲染）     │           │
│         ╰───────────────────────╯           │
│                                             │
│              [横竖屏切换按钮]                │
├─────────────────────────────────────────────┤
│  文字内容：[输入框...............]           │
│                                             │
│  模式：[ 经典滚动 ] [ 点阵LED ]              │
│                                             │
│  字号： [——●——————] 19                       │
│  字重： [——————●——] 70                       │
│  速度： [——●——————] 中                       │
│  方向： [←向左滚动] [向右滚动→] [静止]        │
│  颜色： 🔴🟠🟢🔵⚪🩷💚🟣（8色 + 自定义）      │
│  光晕： [————●————] 50%                      │
│                                             │
│  [    保存到相册    ]  [  关闭  ]             │
└─────────────────────────────────────────────┘
```

**关键布局说明**：
- 预览区占满屏幕（或最大高度），底部控制面板可折叠（点击收起/展开），保证横屏时的沉浸感。
- 横屏模式下，控制面板自动隐藏，点击屏幕任意位置唤出。

---

## 三、核心技术实现

### 3.1 经典模式：纯文字 + 光晕渐变

**实现方式**：CSS `text-shadow` + 渐变动画。

```css
.classic-text {
  font-size: 19px;
  font-weight: 70;
  color: #ff00ff;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.8),
               0 0 20px rgba(255, 0, 255, 0.6),
               0 0 40px rgba(255, 0, 255, 0.4);
  animation: scroll-left 5s linear infinite;
}

@keyframes scroll-left {
  from { transform: translateX(100%); }
  to   { transform: translateX(-100%); }
}
```

**速度调节**：将 `animation-duration` 与速度滑杆反向映射（速度越大，持续时间越短）。

### 3.2 点阵模式：真实 LED 点阵质感（核心难点）

**不能直接使用普通字体**，需要用 Canvas 解析文字像素点，再绘制成发光圆点。

#### 3.2.1 点阵字库方案

| 方案 | 优点 | 缺点 | 推荐度 |
|---|---|---|---|
| A. 预置点阵字库 JSON | 渲染快、无依赖 | 生僻字不支持，体积大 | ⭐⭐⭐⭐ |
| B. Canvas 解析普通字体像素 | 支持所有字体 | 需要截取像素，可能失真 | ⭐⭐⭐ |
| C. 在线 API 返回点阵数据 | 字库全 | 需网络、延迟高 | ⭐⭐ |

**推荐方案 A**：使用 16x16 或 24x24 点阵字库（常见汉字+字母+数字），按需加载。

```json
// 点阵字库示例（"生"字的 16x16 点阵）
{
  "生": [
    "0000000000000000",
    "0000010000000000",
    "0000010000000000",
    "0000111111111000",
    "0000010000010000",
    "0000010000010000",
    "0001111111111110",
    "0000010000000000",
    // ... 共16行
  ]
}
```

#### 3.2.2 Canvas 绘制逻辑

```js
function drawLedText(ctx, text, options) {
  const { fontSize, color, glow, dotSize = 2, gap = 1 } = options
  const matrix = textToMatrix(text) // 查表得到点阵二维数组

  const rows = matrix.length
  const cols = matrix[0].length
  const cellW = dotSize + gap
  const cellH = dotSize + gap

  ctx.clearRect(0, 0, canvasW, canvasH)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (matrix[r][c] === '1') {
        const x = c * cellW
        const y = r * cellH

        // 绘制发光点
        ctx.beginPath()
        ctx.arc(x + dotSize / 2, y + dotSize / 2, dotSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = glow // 光晕强度
        ctx.fill()
      }
    }
  }
}
```

**滚动动画**：使用 `requestAnimationFrame` 不断偏移 Canvas 的 `translateX`，实现平滑滚动。

```js
let offsetX = 0
function animate() {
  offsetX -= speed
  if (offsetX < -totalWidth) offsetX = canvasW
  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.save()
  ctx.translate(offsetX, 0)
  drawLedText(ctx, text, options)
  ctx.restore()
  requestAnimationFrame(animate)
}
```

> **性能优化**：点阵密集时（如 24x24 x 20字），每帧重绘可能卡顿。建议：
> 1. 将文字预先绘制到离屏 Canvas。
> 2. 滚动时只 `drawImage` 离屏 Canvas，不逐点重绘。
> 3. 低端机自动降级点阵密度（16x16）。

### 3.3 双指捏合缩放字号

```js
// 监听 touchstart / touchmove / touchend
let startDistance = 0
let startFontSize = 19

onTouchStart(e) {
  if (e.touches.length === 2) {
    startDistance = getDistance(e.touches[0], e.touches[1])
    startFontSize = this.data.fontSize
  }
}

onTouchMove(e) {
  if (e.touches.length === 2) {
    const distance = getDistance(e.touches[0], e.touches[1])
    const scale = distance / startDistance
    let newSize = Math.round(startFontSize * scale)
    newSize = Math.max(10, Math.min(40, newSize)) // 限制范围
    this.setData({ fontSize: newSize })
  }
}
```

**注意**：缩放中心点应为双指中心，避免文字跳动。如果是 Canvas 渲染，需同步更新 Canvas 绘制参数。

### 3.4 横竖屏一键切换

**方案 A（推荐）**：CSS `transform` 旋转整个预览区。

```css
.landscape {
  transform: rotate(90deg);
  transform-origin: center center;
  width: 100vh;
  height: 100vw;
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: -50vw;
  margin-left: -50vh;
}
```

**方案 B**：小程序配置 `"pageOrientation": "auto"`，让微信底层处理旋转。缺点：部分机型横屏后底部面板可能被遮挡，且切换时会触发页面 `onResize`，需要重新计算布局。

**推荐**：先用方案 A（CSS 旋转），稳定且兼容性好。横竖屏状态保存在 `localStorage`，下次进入自动恢复。

### 3.5 一键保存到相册

**流程**：
1. 创建一个离屏 Canvas（尺寸为当前预览区大小 × 2 倍图）。
2. 根据当前模式（经典/点阵）在离屏 Canvas 上重新绘制当前帧（停止动画，绘制静态图）。
3. `wx.canvasToTempFilePath` 导出临时文件。
4. `wx.saveImageToPhotosAlbum` 保存。

```js
async function saveToAlbum() {
  // 1. 创建离屏 Canvas
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: W * 2, height: H * 2 })
  const ctx = canvas.getContext('2d')

  // 2. 绘制背景
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W * 2, H * 2)

  // 3. 根据模式绘制
  if (mode === 'classic') {
    drawClassicText(ctx, text, options)
  } else {
    drawLedText(ctx, text, options) // 静态绘制，不加滚动偏移
  }

  // 4. 导出并保存
  const tempFilePath = await new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      success: res => resolve(res.tempFilePath),
      fail: reject
    })
  })

  try {
    await wx.saveImageToPhotosAlbum({ filePath: tempFilePath })
    wx.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (err) {
    // 处理授权拒绝
    if (err.errMsg.includes('auth deny')) {
      wx.showModal({
        title: '提示',
        content: '需要您授权保存图片到相册，是否去设置？',
        success: res => {
          if (res.confirm) wx.openSetting()
        }
      })
    }
  }
}
```

**细节**：
- 保存时可以添加**水印**（如小程序名称、二维码），用于传播。
- 保存前先 `wx.showLoading`，防止用户重复点击。
- 如果是滚动中的灯牌，保存的是**当前帧**（静态图），或者提供“保存为 GIF”选项（需引入第三方库，成本较高，可后期迭代）。

---

## 四、数据结构与状态管理

```js
data: {
  text: '生日快乐',
  mode: 'classic', // 'classic' | 'led'
  fontSize: 19,
  fontWeight: 70,
  speed: 50, // 0~100
  direction: 'left', // 'left' | 'right' | 'static'
  color: '#ff00ff',
  glow: 50, // 0~100
  isLandscape: false,
  showPanel: true
}
```

**状态持久化**：使用 `wx.setStorageSync('lightboard_config', config)`，用户下次进入时恢复上次的配置。

---

## 五、接口设计（可选，用于云端保存配置）

如果希望用户跨设备同步灯牌配置，或保存历史记录：

```
POST /api/light-board/save
Body: {
  text, mode, fontSize, fontWeight, speed, direction, color, glow
}

GET /api/light-board/list?openid=xxx
```



---

## 六、性能优化与边界处理

| 场景 | 处理 |
|---|---|
| 文字过长 | 限制 30 字符，超出部分截断并 toast 提示 |
| 点阵模式下输入 emoji | 过滤掉，提示“点阵模式暂不支持表情” |
| 双指缩放与滚动冲突 | 缩放时暂停滚动动画，松手后恢复 |
| 低端机点阵卡顿 | 检测 `wx.getSystemInfoSync().benchmarkLevel`，低于阈值自动使用 16x16 点阵 |
| 保存相册授权拒绝 | 引导打开设置页 `wx.openSetting` |
| 横屏切换时布局错乱 | 切换时隐藏控制面板，旋转完成后重新计算 Canvas 尺寸 |
| 退出页面未保存配置 | `onUnload` 时自动保存当前配置到本地 |
| 分享到朋友圈 | 由于微信限制，小程序无法直接分享朋友圈，但可以保存图片后让用户手动发朋友圈 |
| 长时间停留息屏 | 使用 `wx.setKeepScreenOn({ keepScreenOn: true })` 保持屏幕常亮 |

---

## 七、验收标准

1. 输入文字后，经典模式正常滚动，光晕效果可见。
2. 切换到点阵模式，文字呈现真实 LED 点阵质感，发光效果可调。
3. 拖动字号滑杆，文字大小实时变化；双指捏合也能缩放字号，范围 10~40。
4. 切换颜色，文字颜色和光晕同步变化。
5. 点击「横竖屏切换」，预览区旋转 90 度，内容完整显示。
6. 点击「保存到相册」，图片成功保存，包含当前灯牌效果（高清、无模糊）。
7. 退出后重新进入，保留上次的配置。
8. 点阵模式在 2000 元安卓机上滚动流畅（≥ 30fps）。
9. 保存相册时若用户拒绝授权，弹出引导设置弹窗。
10. 横屏时控制面板自动隐藏，点击屏幕可唤出。

---

## 八、开发排期建议

| 阶段 | 内容 | 工时 |
|---|---|---|
| P0 | 页面框架 + 经典模式（CSS 滚动 + 光晕） | 1d |
| P0 | 点阵模式（点阵字库 + Canvas 绘制 + 滚动） | 2d |
| P0 | 控制面板（输入、滑杆、颜色、方向） | 1d |
| P1 | 双指捏合缩放 | 0.5d |
| P1 | 横竖屏切换 | 0.5d |
| P1 | 保存到相册（离屏 Canvas + 授权处理） | 1d |
| P2 | 配置持久化、性能优化、低端机降级 | 1d |
| P2 | 水印、分享引导、屏幕常亮 | 0.5d |
| — | **合计** | **约 7.5 人日** |

---

