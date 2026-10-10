# 大头贴相框模板功能 开发需求文档 v1.0

> 技术栈：uni-app + 微信云开发（云函数 + 云数据库 + 云存储）
> 核心：**管理员上传相框模板 → 用户选择模板 → 拍照 → Canvas 合成 → 保存/分享**
> 前置约束：模板由管理员维护，用户无上传权限

---

## 一、需求拆解

### 1.1 角色与权限

| 角色 | 权限 |
|---|---|
| **普通用户** | 浏览模板列表、选择模板、拍照/选图、合成、保存、分享 |
| **管理员** | 上传模板、编辑模板信息、启用/禁用、删除模板、调整排序 |

### 1.2 核心流程

```
【管理员侧】
上传相框 PNG → 填写模板信息（名称、分类、照片区）→ 保存 → 用户可见

【用户侧】
进入大头贴 → 选择模板 → 拍照/从相册选 → 调整照片位置 → 合成 → 保存到相册 / 分享
```

### 1.3 技术选型

| 模块 | 方案 | 理由 |
|---|---|---|
| 模板存储 | 云存储（图片）+ 云数据库（元数据） | 云开发原生支持，免鉴权 |
| 图片合成 | **纯前端 Canvas** | 无后端成本，即时出图 |
| 模板管理 | 小程序内隐藏页面 + openid 白名单 | 无需单独做 web 后台 |
| 人脸定位 | MVP 不做，V2 可选接入 | 先做手动拖拽 |

---

## 二、相框模板设计规范

### 2.1 尺寸规范

**统一标准：1080 × 1440 px（3:4 竖版）**

| 项目 | 规范 |
|---|---|
| 画布尺寸 | 1080 × 1440（固定，不做多比例） |
| 格式 | PNG-24，带透明通道 |
| 大小 | ≤ 500KB（超过要压缩） |
| 安全区 | 中间镂空区域即照片显示区 |
| DPI | 72（屏幕显示足够） |

**为什么固定 3:4**：
- 手机竖屏拍摄的默认比例就是 3:4
- 固定比例让 Canvas 合成逻辑简单，不用处理各种尺寸适配
- 用户拍照时直接按 3:4 裁剪，减少调整成本

### 2.2 相框结构

```
┌─────────────────────────┐
│                         │  ← 相框装饰区（不透明）
│   ┌───────────────┐     │
│   │               │     │
│   │   照片显示区   │     │  ← 透明镂空区（photoArea）
│   │               │     │
│   └───────────────┘     │
│                         │
│      底部装饰文字        │
└─────────────────────────┘
```

### 2.3 photoArea 定义

每个模板必须定义一个**照片显示区**，用相对坐标（0-1）：

```js
photoArea: {
  x: 0.1,      // 左边距 = 画布宽 × 0.1
  y: 0.1,      // 上边距 = 画布高 × 0.1
  w: 0.8,      // 宽度 = 画布宽 × 0.8
  h: 0.7       // 高度 = 画布高 × 0.7
}
```

**作用**：用户拍的照片会**自动裁剪**到这个区域，无需手动调整。如果照片比例和区域不符，居中裁剪。

**如果模板没有 photoArea**：默认为全屏（`{x:0, y:0, w:1, h:1}`），用户照片铺满整个画布。

---

## 三、数据库设计

### 3.1 相框模板表 `photo_frames`

```js
{
  _id: 'auto',
  name: '生日应援框',           // 模板名称
  category: 'birthday',        // 分类：birthday/concert/daily/festival
  frameUrl: 'cloud://xxx/frames/xxx.png',      // 相框原图（云存储）
  thumbUrl: 'cloud://xxx/frames/xxx_thumb.png', // 缩略图（列表用）
  photoArea: {                 // 照片显示区（相对坐标 0-1）
    x: 0.1, y: 0.1, w: 0.8, h: 0.7
  },
  sort: 100,                   // 排序权重，越大越靠前
  enabled: true,               // 是否启用
  useCount: 0,                 // 使用次数（统计用）
  createTime: Date,
  updateTime: Date,
  creatorOpenid: 'xxx'         // 上传的管理员
}
```

**索引**：
- `enabled + sort`（列表查询）
- `category + enabled`（按分类筛选）

### 3.2 用户作品表 `photo_works`（可选）

**如果不需要"我的作品"功能，可以不建此表，成品只存本地相册。**

```js
{
  _id: 'auto',
  openid: 'xxx',
  frameId: 'xxx',
  frameName: '生日应援框',
  imageUrl: 'cloud://xxx/works/xxx.png',  // 成品图（云存储）
  createTime: Date
}
```

**存储成本提醒**：用户作品如果存云存储，1 万用户 × 2MB = 20GB，月成本约 20-30 元。建议：
- MVP 不存，只保存到用户相册
- 需要"我的作品"时再存，且做定期清理（保留 90 天）

---

## 四、云函数设计

### 4.1 `frameList` — 获取模板列表（用户端）

```js
// cloudfunctions/frameList/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { category, page = 1, size = 20 } = event

  let q = db.collection('photo_frames').where({ enabled: true })
  if (category) q = q.where({ category })

  const [listRes, countRes] = await Promise.all([
    q.orderBy('sort', 'desc')
     .orderBy('createTime', 'desc')
     .skip((page - 1) * size)
     .limit(size)
     .field({
       name: true, category: true,
       thumbUrl: true, frameUrl: true,
       photoArea: true, useCount: true
     })
     .get(),
    q.count()
  ])

  return {
    code: 0,
    data: {
      list: listRes.data,
      total: countRes.total
    }
  }
}
```

### 4.2 `frameAdmin` — 模板管理（管理员端）

```js
// cloudfunctions/frameAdmin/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_OPENIDS = ['admin_openid_1', 'admin_openid_2']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return { code: 403, msg: '无权限' }
  }

  const { action, data = {} } = event
  switch (action) {
    case 'list':   return await list(data)
    case 'add':    return await add(data, OPENID)
    case 'update': return await update(data)
    case 'delete': return await del(data)
    case 'toggle': return await toggle(data)
    default:       return { code: 400, msg: '未知操作' }
  }
}

// 管理员列表（含禁用项）
async function list({ page = 1, size = 20, category }) {
  let q = db.collection('photo_frames')
  if (category) q = q.where({ category })
  const [listRes, countRes] = await Promise.all([
    q.orderBy('sort', 'desc')
     .orderBy('createTime', 'desc')
     .skip((page - 1) * size).limit(size).get(),
    q.count()
  ])
  return { code: 0, data: { list: listRes.data, total: countRes.total } }
}

// 新增（前端已上传云存储，这里只写元数据）
async function add(data, openid) {
  const { name, category, frameUrl, thumbUrl, photoArea, sort = 100 } = data
  if (!name || !frameUrl) return { code: 400, msg: '名称和图片不能为空' }

  const now = new Date()
  const res = await db.collection('photo_frames').add({
    data: {
      name, category: category || 'daily',
      frameUrl, thumbUrl: thumbUrl || frameUrl,
      photoArea: photoArea || { x: 0, y: 0, w: 1, h: 1 },
      sort, enabled: true, useCount: 0,
      createTime: now, updateTime: now,
      creatorOpenid: openid
    }
  })
  return { code: 0, data: { _id: res._id } }
}

async function update(data) {
  const { _id, ...rest } = data
  if (!_id) return { code: 400, msg: '缺少 ID' }
  delete rest._id
  rest.updateTime = new Date()
  await db.collection('photo_frames').doc(_id).update({ data: rest })
  return { code: 0 }
}

// 删除：先删云存储文件，再删数据库记录
async function del({ _id }) {
  if (!_id) return { code: 400, msg: '缺少 ID' }
  const doc = await db.collection('photo_frames').doc(_id).get()
  if (!doc.data) return { code: 404, msg: '模板不存在' }

  // 删除云存储文件
  const fileList = [doc.data.frameUrl, doc.data.thumbUrl].filter(Boolean)
  if (fileList.length) {
    try { await cloud.deleteFile({ fileList }) } catch (e) {}
  }

  await db.collection('photo_frames').doc(_id).remove()
  return { code: 0 }
}

async function toggle({ _id, enabled }) {
  await db.collection('photo_frames').doc(_id).update({
    data: { enabled: !!enabled, updateTime: new Date() }
  })
  return { code: 0 }
}
```

### 4.3 `frameUseCount` — 使用次数 +1（可选）

```js
// 用户合成后异步调用，不阻塞主流程
const db = cloud.database()
const _ = db.command
await db.collection('photo_frames').doc(frameId)
  .update({ data: { useCount: _.inc(1) } })
```

---

## 五、页面设计

### 5.1 页面清单

```
pages/
├── photo/home         大头贴首页（模板列表）
├── photo/camera       拍照/选图页
├── photo/edit         编辑合成页
└── admin/frames       模板管理（管理员，隐藏入口）
```

### 5.2 首页 `photo/home`

```
┌────────────────────────────────┐
│  大头贴                         │
├────────────────────────────────┤
│  [全部] [生日] [演唱会] [日常]   │
├────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │      │  │      │  │      │  │
│  │ 模板 │  │ 模板 │  │ 模板 │  │
│  │  1   │  │  2   │  │  3   │  │
│  └──────┘  └──────┘  └──────┘  │
│  ┌──────┐  ┌──────┐  ┌──────┐  │
│  │      │  │      │  │      │  │
│  └──────┘  └──────┘  └──────┘  │
└────────────────────────────────┘
```

**交互**：
- 三列网格，每项显示缩略图 + 名称
- 点击 → 进入拍照页，带上 `frameId`
- 下拉刷新 + 触底加载
- 分类 Tab 横向滚动

### 5.3 拍照页 `photo/camera`

```
┌────────────────────────────────┐
│  ← 拍摄                         │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │      [相机预览画面]       │  │
│  │      叠加相框预览          │  │
│  │                          │  │
│  └──────────────────────────┘  │
│                                │
│  [ 从相册选 ]  [ ● 拍照 ]       │
└────────────────────────────────┘
```

**关键实现**：

```vue
<template>
  <view class="camera-page">
    <view class="preview">
      <camera
        device-position="front"
        flash="off"
        class="camera"
        @error="onCameraError"
      />
      <!-- 相框叠加预览 -->
      <image
        v-if="frame"
        :src="frame.frameUrl"
        class="frame-overlay"
        mode="aspectFit"
      />
    </view>

    <view class="actions">
      <button @click="chooseFromAlbum">从相册选</button>
      <button class="shoot-btn" @click="takePhoto">●</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { frame: null, frameId: '' }
  },
  async onLoad(options) {
    this.frameId = options.frameId
    await this.loadFrame()
  },
  methods: {
    async loadFrame() {
      const res = await wx.cloud.callFunction({
        name: 'frameList',
        data: { page: 1, size: 100 }
      })
      this.frame = res.result.data.list.find(f => f._id === this.frameId)
    },
    takePhoto() {
      const ctx = wx.createCameraContext()
      ctx.takePhoto({
        quality: 'high',
        success: res => {
          this.goEdit(res.tempImagePath)
        }
      })
    },
    chooseFromAlbum() {
      uni.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album'],
        success: res => {
          this.goEdit(res.tempFiles[0].tempFilePath)
        }
      })
    },
    goEdit(imagePath) {
      // 临时路径通过全局变量或 storage 传递
      uni.setStorageSync('temp_photo', imagePath)
      uni.navigateTo({ url: `/pages/photo/edit?frameId=${this.frameId}` })
    }
  }
}
</script>

<style scoped>
.preview {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #000;
}
.camera, .frame-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.frame-overlay {
  pointer-events: none;
  z-index: 2;
}
</style>
```

**注意**：
- `<camera>` 组件需要用户授权 `scope.camera`，在点击拍照时请求
- 相框以叠加层形式预览，让用户知道最终效果
- 相册选图不需要相机权限

### 5.4 编辑合成页 `photo/edit`

```
┌────────────────────────────────┐
│  ← 编辑                         │
├────────────────────────────────┤
│  ┌──────────────────────────┐  │
│  │                          │  │
│  │      [Canvas 预览]        │  │
│  │      照片 + 相框          │  │
│  │                          │  │
│  └──────────────────────────┘  │
│                                │
│  照片位置：[←][→][↑][↓] [缩放]  │
│  滤镜：  [原图][黑白][复古]     │
│                                │
│  [ 保存到相册 ]  [ 分享 ]       │
└────────────────────────────────┘
```

**MVP 简化**：如果 photoArea 定义准确，照片自动裁剪，用户不需要调整位置。编辑页只做预览 + 保存。

**V2 增强**：支持手动拖动、缩放、滤镜。

---

## 六、核心算法：Canvas 合成

### 6.1 合成流程

```js
async function composePhoto(frame, photoPath) {
  // 1. 获取画布尺寸
  const CANVAS_W = 1080
  const CANVAS_H = 1440

  // 2. 创建离屏 Canvas（性能关键）
  const canvas = wx.createOffscreenCanvas({
    type: '2d',
    width: CANVAS_W,
    height: CANVAS_H
  })
  const ctx = canvas.getContext('2d')

  // 3. 绘制背景（白底或透明）
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // 4. 绘制照片（裁剪到 photoArea）
  const photo = await loadImage(canvas, photoPath)
  const area = frame.photoArea || { x: 0, y: 0, w: 1, h: 1 }
  const ax = area.x * CANVAS_W
  const ay = area.y * CANVAS_H
  const aw = area.w * CANVAS_W
  const ah = area.h * CANVAS_H

  ctx.save()
  ctx.beginPath()
  ctx.rect(ax, ay, aw, ah)
  ctx.clip()
  drawImageCover(ctx, photo, ax, ay, aw, ah)  // 居中裁剪
  ctx.restore()

  // 5. 绘制相框（覆盖层）
  const frameImg = await loadImage(canvas, frame.frameUrl)
  ctx.drawImage(frameImg, 0, 0, CANVAS_W, CANVAS_H)

  // 6. 导出图片
  const tempPath = await new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      x: 0, y: 0,
      width: CANVAS_W,
      height: CANVAS_H,
      destWidth: CANVAS_W,
      destHeight: CANVAS_H,
      fileType: 'png',
      quality: 1,
      success: res => resolve(res.tempFilePath),
      fail: reject
    })
  })

  return tempPath
}

// 居中裁剪绘制（类似 CSS background-size: cover）
function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.width
  const ih = img.height
  const scale = Math.max(dw / iw, dh / ih)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (iw - sw) / 2
  const sy = (ih - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

// 加载图片（离屏 Canvas 用 createImage）
function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
```

### 6.2 关键点说明

| 点 | 说明 |
|---|---|
| **离屏 Canvas** | 用 `wx.createOffscreenCanvas`，不占用页面渲染，性能更好 |
| **clip 裁剪** | 用 `ctx.clip()` 限定照片只在 photoArea 内绘制 |
| **cover 算法** | 照片按比例放大到刚好覆盖区域，多余部分居中裁剪 |
| **图片加载** | 离屏 Canvas 用 `canvas.createImage()`，不是 `new Image()` |
| **导出** | `wx.canvasToTempFilePath` 导出临时路径 |

### 6.3 保存到相册

```js
async function saveToAlbum(tempPath) {
  // 1. 请求相册权限
  const auth = await new Promise(resolve => {
    wx.getSetting({
      success: res => resolve(res.authSetting['scope.writePhotosAlbum'])
    })
  })

  if (auth === false) {
    // 用户曾拒绝，引导去设置
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '需要相册权限',
        content: '保存图片需要授权相册权限',
        success: r => resolve(r.confirm)
      })
    })
    if (confirm) wx.openSetting()
    return
  }

  // 2. 保存
  await new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempPath,
      success: resolve,
      fail: reject
    })
  })

  wx.showToast({ title: '已保存到相册', icon: 'success' })
}
```

---

## 七、管理员后台页面

### 7.1 入口设计

**隐藏入口**：在"我的"页面连续点击版本号 5 次，或 URL 参数进入。

```js
// pages/mine/mine.vue
data() { return { versionTapCount: 0 } },
methods: {
  onVersionTap() {
    this.versionTapCount++
    if (this.versionTapCount >= 5) {
      this.versionTapCount = 0
      uni.navigateTo({ url: '/pages/admin/frames' })
    }
  }
}
```

**权限校验**：进入页面后调 `frameAdmin` 的 `list`，如果返回 403，直接提示"无权限"并返回。

### 7.2 管理页 `admin/frames`

```
┌────────────────────────────────┐
│  相框模板管理      [+ 上传模板]  │
├────────────────────────────────┤
│  ┌──────┐  生日应援框            │
│  │ 缩略 │  分类：生日             │
│  │  图  │  使用 128 次            │
│  └──────┘  [编辑][禁用][删除]    │
├────────────────────────────────┤
│  ┌──────┐  演唱会框              │
│  │ 缩略 │  ...                   │
│  └──────┘                       │
└────────────────────────────────┘
```

### 7.3 上传模板页

```
┌────────────────────────────────┐
│  ← 上传模板                     │
├────────────────────────────────┤
│  相框图片（PNG，透明背景）        │
│  ┌──────────────────────────┐  │
│  │      [点击上传]           │  │
│  └──────────────────────────┘  │
│                                │
│  缩略图（可选，不填用原图）       │
│  ┌──────────────────────────┐  │
│  │      [点击上传]           │  │
│  └──────────────────────────┘  │
│                                │
│  模板名称  [ 生日应援框    ]     │
│  分类      [ 生日 ▾ ]           │
│  排序      [ 100 ]              │
│                                │
│  照片显示区（相对坐标 0-1）       │
│  X [0.1] Y [0.1]               │
│  W [0.8] H [0.7]               │
│  [ 用默认值 ]                   │
│                                │
│         [ 保存 ]                │
└────────────────────────────────┘
```

**上传实现**：

```js
async function uploadFrame(filePath) {
  // 1. 校验格式和大小
  const fileInfo = await uni.getFileInfo({ filePath })
  if (fileInfo.size > 500 * 1024) {
    throw new Error('图片超过 500KB，请压缩')
  }

  // 2. 生成云存储路径
  const ext = filePath.split('.').pop()
  const cloudPath = `frames/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  // 3. 上传
  const res = await wx.cloud.uploadFile({ cloudPath, filePath })
  return res.fileID  // cloud://xxx/...
}
```

**photoArea 可视化编辑（V2 增强）**：

MVP 用手动输入坐标（0-1 相对值），V2 可以做一个可视化编辑器：在预览图上拖动一个矩形框，实时显示坐标。

---

## 八、边界与异常

| 场景 | 处理 |
|---|---|
| 模板列表为空 | 显示"暂无模板，请稍后再来" |
| 模板已禁用 | 列表不返回，用户访问详情时提示"模板已下架" |
| 用户拒绝相机权限 | 提示"需要相机权限"，引导去设置 |
| 用户拒绝相册权限 | 提示"需要相册权限" |
| 相框图片加载失败 | 提示"模板加载失败，请重试" |
| 照片加载失败 | 提示"照片加载失败，请重新拍摄" |
| Canvas 合成失败 | 提示"合成失败，请重试"，记录错误日志 |
| 保存相册失败 | 提示"保存失败，请检查相册权限" |
| 模板图片超过 500KB | 上传时拒绝，提示压缩 |
| 模板图片非 PNG | 上传时拒绝，提示格式 |
| 非管理员访问管理页 | 云函数返回 403，前端提示无权限 |
| 管理员删除正在被使用的模板 | 允许删除，已合成的作品不受影响 |
| 用户作品存云存储 | 可选，建议不存；若要存，做 90 天清理 |

---

## 九、工期估算

| 模块 | 人天 |
|---|---|
| 数据库设计 + 云函数（frameList / frameAdmin） | 1.5 |
| 首页（模板列表 + 分类） | 1 |
| 拍照页（相机 + 相册 + 相框叠加） | 1.5 |
| Canvas 合成算法 | 2 |
| 编辑页（预览 + 保存 + 分享） | 1.5 |
| 管理员上传页（含云存储上传） | 1.5 |
| 管理员列表页（编辑/禁用/删除） | 1 |
| 权限校验 + 隐藏入口 | 0.5 |
| 联调测试 + 真机调优 | 2 |
| **合计** | **约 12.5 人天** |

1 个前端，**约 3 周**上线。

---

## 十、避坑清单

1. ❌ 用 `<canvas>` 组件而非离屏 Canvas → 渲染慢，且页面滚动时闪烁
2. ❌ 相框尺寸不统一 → 每个模板都要单独适配，逻辑爆炸
3. ❌ 不定义 photoArea → 用户照片和相框对不上，需要手动调整
4. ❌ 照片用 `drawImage` 直接铺满 → 变形，必须用 cover 算法裁剪
5. ❌ 忘记 `ctx.clip()` → 照片会盖住相框边缘
6. ❌ 用 `new Image()` 加载 → 离屏 Canvas 要用 `canvas.createImage()`
7. ❌ 上传不校验大小 → 云存储被 10MB 的图撑爆，加载慢
8. ❌ 删除模板不删云存储文件 → 存储空间泄漏
9. ❌ 管理员权限只在前端判断 → 必须云函数校验 openid
10. ❌ 相机权限在进入页面就请求 → 用户反感，应在点击拍照时请求
11. ❌ 保存相册不做权限引导 → 用户拒绝一次就永远保存不了
12. ❌ 用户作品全存云存储 → 成本失控，MVP 只存本地相册
13. ❌ 模板列表不做分页 → 模板多了首屏加载慢
14. ❌ 相框图片用 JPG → 没有透明通道，镂空区不生效

---

## 十一、一句话总结

**这个功能的本质是"用 Canvas 把用户照片裁剪到相框镂空区，再叠加相框层导出"**。核心设计：**统一 1080×1440 画布 + 模板定义 photoArea 相对坐标 + 照片 cover 算法居中裁剪 + 离屏 Canvas 合成 + 云存储存模板 + 云数据库存元数据 + openid 白名单控权限**。三个关键点：① 相框必须是透明 PNG，尺寸统一 3:4；② photoArea 用相对坐标，让模板和画布解耦；③ 合成必须用离屏 Canvas + clip + cover，不能用组件 Canvas 直接画。

**MVP 12.5 人天，3 周上线**。用户作品不存云端（只存本地相册），避免存储成本失控。

---
