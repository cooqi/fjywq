# 谁是卧底 完整实现文档（uni-app + 云开发）

> 技术栈：uni-app + 微信云开发（云函数 + 云数据库）
> 核心约束：无需登录、游戏码唯一、牌面仅获取一次、本地记录、管理员管题库

---

## 一、架构总览

```
uni-app 小程序
    │  wx.cloud.callFunction
    ↓
云函数层（Node.js）
├── spyCreateRoom   创建房间（选题 + 生成码 + 发牌）
├── spyJoinRoom     加入房间（原子领牌 + 计数）
├── spyGetRoom      查询房间（刷新人数）
└── adminQuestion   题库管理（增删改查）
    │
    ↓
云数据库
├── spy_questions   题库
└── spy_rooms       房间（含牌面）
```

**关键设计**：
- 游戏码 = 房间 `_id`（6 位数字），天然唯一
- 牌面存房间 `cards` 数组，`claimed` 标记领取
- 领牌用**事务 + 原子更新**，防止并发
- 前端本地缓存 `码 + 座位 + 牌面`，命中则不请求

---

## 二、数据库设计

### 2.1 题库 `spy_questions`

```js
{
  _id: 'xxx',
  civilianWord: '月亮',      // 好人词
  spyWord: '太阳',           // 卧底词
  category: '自然',          // 分类（可选）
  enabled: true,             // 启用状态
  useCount: 0,               // 使用次数（均衡出题）
  createTime: Date
}
```

### 2.2 房间 `spy_rooms`

```js
{
  _id: '138426',              // 游戏码，6 位数字，唯一
  code: '138426',             // 冗余字段，方便查询
  questionId: 'xxx',
  civilianWord: '月亮',
  spyWord: '太阳',
  totalPlayers: 5,            // 游戏人数
  spyCount: 1,                // 卧底人数
  cards: [                    // 牌面数组，随机顺序
    { seat: 1, word: '月亮', isSpy: false, claimed: true,  claimedAt: Date },
    { seat: 2, word: '月亮', isSpy: false, claimed: true,  claimedAt: Date },
    { seat: 3, word: '太阳', isSpy: true,  claimed: true,  claimedAt: Date },
    { seat: 4, word: '月亮', isSpy: false, claimed: false, claimedAt: null },
    { seat: 5, word: '月亮', isSpy: false, claimed: false, claimedAt: null }
  ],
  joinedCount: 3,             // 已加入人数（关键字段）
  status: 'waiting',          // waiting | playing | ended
  creatorOpenid: 'xxx',
  createTime: Date,
  expireTime: Date            // 创建后 2 小时
}
```

**索引建议**：
- `_id` 天然唯一（即游戏码）
- 加 `code` 字段冗余，方便将来按码查

---

## 三、云函数实现

### 3.1 `spyCreateRoom` — 创建房间

```js
// cloudfunctions/spyCreateRoom/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { totalPlayers, spyCount, category } = event

  // ========== 1. 参数校验 ==========
  if (!Number.isInteger(totalPlayers) || totalPlayers < 4 || totalPlayers > 12) {
    return { code: 400, msg: '游戏人数需在 4-12 之间' }
  }
  if (!Number.isInteger(spyCount) || spyCount < 1) {
    return { code: 400, msg: '卧底人数至少 1 人' }
  }
  // 卧底 < 好人（即卧底 < total/2）
  if (spyCount >= totalPlayers - spyCount) {
    return { code: 400, msg: '卧底人数必须少于好人人数' }
  }

  // ========== 2. 从题库随机选一套 ==========
  let q = db.collection('spy_questions').where({ enabled: true })
  if (category) q = q.where({ category })
  const countRes = await q.count()
  if (countRes.total === 0) {
    return { code: 400, msg: '题库为空，请联系管理员' }
  }
  const skip = Math.floor(Math.random() * countRes.total)
  const qRes = await q.skip(skip).limit(1).get()
  const question = qRes.data[0]

  // ========== 3. 随机生成牌面顺序 ==========
  // 随机选 spyCount 个位置放卧底
  const spySeats = new Set()
  while (spySeats.size < spyCount) {
    spySeats.add(Math.floor(Math.random() * totalPlayers))
  }
  const cards = []
  for (let i = 0; i < totalPlayers; i++) {
    const isSpy = spySeats.has(i)
    cards.push({
      seat: i + 1,
      word: isSpy ? question.spyWord : question.civilianWord,
      isSpy,
      claimed: false,
      claimedAt: null
    })
  }

  // 创建者自动领 1 号牌
  cards[0].claimed = true
  cards[0].claimedAt = new Date()

  // ========== 4. 生成唯一游戏码（_id 冲突重试） ==========
  const now = new Date()
  const expireTime = new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 小时
  let code = null

  for (let i = 0; i < 10; i++) {
    const c = String(Math.floor(100000 + Math.random() * 900000))
    try {
      await db.collection('spy_rooms').add({
        data: {
          _id: c,
          code: c,
          questionId: question._id,
          civilianWord: question.civilianWord,
          spyWord: question.spyWord,
          totalPlayers,
          spyCount,
          cards,
          joinedCount: 1,          // 创建者已加入
          status: 'waiting',
          creatorOpenid: OPENID,
          createTime: now,
          expireTime
        }
      })
      code = c
      break
    } catch (e) {
      // _id 冲突（房间已存在），重试
      if (e.errCode === -502001 || (e.errMsg || '').includes('duplicate')) {
        continue
      }
      throw e
    }
  }

  if (!code) {
    return { code: 500, msg: '生成游戏码失败，请重试' }
  }

  // ========== 5. 题库使用次数 +1（异步，不影响主流程） ==========
  db.collection('spy_questions').doc(question._id)
    .update({ data: { useCount: _.inc(1) } })
    .catch(() => {})

  // ========== 6. 返回 ==========
  return {
    code: 0,
    data: {
      gameCode: code,
      totalPlayers,
      spyCount,
      myCard: {
        seat: 1,
        word: cards[0].word
      }
    }
  }
}
```

### 3.2 `spyJoinRoom` — 加入房间（核心）

```js
// cloudfunctions/spyJoinRoom/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { gameCode } = event
  if (!gameCode) return { code: 400, msg: '缺少游戏码' }

  try {
    const result = await db.runTransaction(async transaction => {
      // ========== 1. 查房间 ==========
      let roomDoc
      try {
        roomDoc = await transaction.collection('spy_rooms').doc(gameCode).get()
      } catch (e) {
        throw { code: 404, msg: '房间不存在' }
      }
      if (!roomDoc || !roomDoc.data) {
        throw { code: 404, msg: '房间不存在' }
      }
      const room = roomDoc.data

      // ========== 2. 状态校验 ==========
      if (room.status !== 'waiting') {
        throw { code: 410, msg: '房间已开始或已结束' }
      }
      if (new Date(room.expireTime) < new Date()) {
        throw { code: 410, msg: '房间已过期' }
      }

      // ========== 3. 人数校验 ==========
      if (room.joinedCount >= room.totalPlayers) {
        throw { code: 403, msg: '房间人数已满' }
      }

      // ========== 4. 找下一张未领的牌 ==========
      const idx = room.cards.findIndex(c => !c.claimed)
      if (idx === -1) {
        throw { code: 403, msg: '房间人数已满' }
      }

      // ========== 5. 原子更新 ==========
      const cards = room.cards.slice()
      cards[idx] = { ...cards[idx], claimed: true, claimedAt: new Date() }
      const newJoinedCount = room.joinedCount + 1
      const newStatus = newJoinedCount >= room.totalPlayers ? 'playing' : 'waiting'

      await transaction.collection('spy_rooms').doc(gameCode).update({
        data: {
          cards,
          joinedCount: newJoinedCount,
          status: newStatus
        }
      })

      // ========== 6. 返回 ==========
      return {
        gameCode,
        seat: cards[idx].seat,
        word: cards[idx].word,
        joinedCount: newJoinedCount,
        totalPlayers: room.totalPlayers
      }
    })

    return { code: 0, data: result }

  } catch (e) {
    if (e && e.code) return e
    console.error('joinRoom error:', e)
    return { code: 500, msg: '加入失败，请重试' }
  }
}
```

### 3.3 `spyGetRoom` — 查询房间

```js
// cloudfunctions/spyGetRoom/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { gameCode } = event
  if (!gameCode) return { code: 400, msg: '缺少游戏码' }

  try {
    const doc = await db.collection('spy_rooms').doc(gameCode).get()
    if (!doc.data) return { code: 404, msg: '房间不存在' }
    const room = doc.data
    return {
      code: 0,
      data: {
        gameCode: room.code,
        totalPlayers: room.totalPlayers,
        joinedCount: room.joinedCount,
        status: room.status,
        expireTime: room.expireTime
      }
    }
  } catch (e) {
    return { code: 404, msg: '房间不存在' }
  }
}
```

### 3.4 `adminQuestion` — 题库管理

```js
// cloudfunctions/adminQuestion/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 管理员 openid 白名单（建议改从数据库读）
const ADMIN_OPENIDS = ['你的openid1', '你的openid2']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return { code: 403, msg: '无权限' }
  }

  const { action, data = {} } = event

  switch (action) {
    case 'list':   return await list(data)
    case 'add':    return await add(data)
    case 'update': return await update(data)
    case 'delete': return await del(data)
    default:       return { code: 400, msg: '未知操作' }
  }
}

async function list({ page = 1, size = 20, category, keyword }) {
  let q = db.collection('spy_questions')
  if (category) q = q.where({ category })
  if (keyword) {
    q = q.where(db.command.or([
      { civilianWord: db.RegExp({ regexp: keyword, options: 'i' }) },
      { spyWord: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]))
  }
  const [listRes, countRes] = await Promise.all([
    q.skip((page - 1) * size).limit(size).orderBy('createTime', 'desc').get(),
    q.count()
  ])
  return { code: 0, data: { list: listRes.data, total: countRes.total } }
}

async function add({ civilianWord, spyWord, category, enabled = true }) {
  if (!civilianWord || !spyWord) return { code: 400, msg: '词不能为空' }
  if (civilianWord === spyWord) return { code: 400, msg: '两个词不能相同' }

  const res = await db.collection('spy_questions').add({
    data: {
      civilianWord, spyWord,
      category: category || '',
      enabled,
      useCount: 0,
      createTime: new Date()
    }
  })
  return { code: 0, data: { _id: res._id } }
}

async function update({ _id, ...rest }) {
  if (!_id) return { code: 400, msg: '缺少 ID' }
  if (rest.civilianWord && rest.spyWord && rest.civilianWord === rest.spyWord) {
    return { code: 400, msg: '两个词不能相同' }
  }
  delete rest._id
  await db.collection('spy_questions').doc(_id).update({ data: rest })
  return { code: 0 }
}

async function del({ _id }) {
  if (!_id) return { code: 400, msg: '缺少 ID' }
  await db.collection('spy_questions').doc(_id).remove()
  return { code: 0 }
}
```

---

## 四、前端页面



### 4.2 首页 `pages/games/wodi/index.vue`

```vue
<template>
  <view class="page">
    <view class="header">
      <text class="title">谁是卧底</text>
      <text class="subtitle">创建房间或输入游戏码加入</text>
    </view>

    <button class="primary-btn" @click="goCreate">创建房间</button>

    <view class="join-section">
      <text class="label">输入 6 位游戏码</text>
      <input
        v-model="code"
        class="code-input"
        type="number"
        maxlength="6"
        placeholder="000000"
      />
      <button class="secondary-btn" @click="goJoin">加入房间</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { code: '' }
  },
  methods: {
    goCreate() {
      uni.navigateTo({ url: '/pages/games/wodi/create' })
    },
    goJoin() {
      const c = (this.code || '').trim()
      if (!/^\d{6}$/.test(c)) {
        return uni.showToast({ title: '请输入 6 位数字', icon: 'none' })
      }
      uni.navigateTo({ url: `/pages/games/wodi/room?code=${c}` })
    }
  }
}
</script>
```

### 4.3 创建房间 `pages/games/wodi/create.vue`

```vue
<template>
  <view class="page">
    <view class="field">
      <view class="field-label">
        <text>游戏人数</text>
        <text class="value">{{ totalPlayers }} 人</text>
      </view>
      <slider
        :value="totalPlayers"
        :min="4"
        :max="12"
        :step="1"
        activeColor="#5B8FF9"
        @change="onTotalChange"
      />
    </view>

    <view class="field">
      <view class="field-label">
        <text>卧底人数</text>
        <text class="value">{{ spyCount }} 人</text>
      </view>
      <slider
        :value="spyCount"
        :min="1"
        :max="maxSpy"
        :step="1"
        activeColor="#F6685E"
        @change="onSpyChange"
      />
      <text class="hint">卧底人数必须少于好人人数</text>
    </view>

    <button class="primary-btn" :disabled="creating" @click="create">
      {{ creating ? '生成中...' : '生成游戏码' }}
    </button>
  </view>
</template>

<script>
export default {
  data() {
    return {
      totalPlayers: 6,
      spyCount: 1,
      creating: false
    }
  },
  computed: {
    // 卧底 < 好人 → 卧底 < total/2
    maxSpy() {
      return Math.max(1, Math.floor((this.totalPlayers - 1) / 2))
    }
  },
  methods: {
    onTotalChange(e) {
      this.totalPlayers = e.detail.value
      if (this.spyCount > this.maxSpy) {
        this.spyCount = this.maxSpy
      }
    },
    onSpyChange(e) {
      this.spyCount = e.detail.value
    },
    async create() {
      if (this.creating) return
      this.creating = true
      uni.showLoading({ title: '生成中...', mask: true })

      try {
        const res = await wx.cloud.callFunction({
          name: 'spyCreateRoom',
          data: {
            totalPlayers: this.totalPlayers,
            spyCount: this.spyCount
          }
        })
        uni.hideLoading()
        const r = res.result
        if (r.code !== 0) {
          return uni.showToast({ title: r.msg || '生成失败', icon: 'none' })
        }

        // 缓存创建者的牌
        const d = r.data
        uni.setStorageSync(`spy_card_${d.gameCode}`, {
          gameCode: d.gameCode,
          seat: d.myCard.seat,
          word: d.myCard.word,
          joinedCount: 1,
          totalPlayers: d.totalPlayers
        })

        uni.redirectTo({ url: `/pages/games/wodi/room?code=${d.gameCode}` })
      } catch (e) {
        uni.hideLoading()
        console.error(e)
        uni.showToast({ title: '网络异常', icon: 'none' })
      } finally {
        this.creating = false
      }
    }
  }
}
</script>
```

### 4.4 房间页 `pages/games/wodi/room.vue`（核心）

```vue
<template>
  <view class="page">
    <view v-if="loading" class="center">
      <text>加载中...</text>
    </view>

    <view v-else-if="error" class="center">
      <text class="error-text">{{ error }}</text>
      <button class="secondary-btn" @click="goHome">返回首页</button>
    </view>

    <view v-else class="room">
      <!-- 游戏码 -->
      <view class="code-section">
        <text class="code-label">游戏码</text>
        <text class="code-value">{{ gameCode }}</text>
        <text class="hint">分享给好友，让 TA 输入游戏码加入</text>
      </view>

      <!-- 牌面 -->
      <view class="card-section">
        <view
          v-if="!revealed"
          class="card card-hidden"
          @click="reveal"
        >
          <text class="card-hint">点击查看牌面</text>
        </view>
        <view
          v-else
          class="card card-shown"
          @click="hide"
        >
          <text class="card-word">{{ word }}</text>
        </view>
        <text class="card-tip">{{ revealed ? '点击可隐藏' : '注意别被旁边人看到' }}</text>
      </view>

      <!-- 信息 -->
      <view class="info-section">
        <view class="info-row">
          <text>我的座位</text>
          <text class="value">{{ seat }} 号</text>
        </view>
        <view class="info-row">
          <text>已加入</text>
          <text class="value">{{ joinedCount }} / {{ totalPlayers }} 人</text>
        </view>
        <view class="info-row">
          <text>状态</text>
          <text class="value">{{ statusText }}</text>
        </view>
      </view>

      <button class="secondary-btn" @click="refresh">刷新人数</button>
      <button class="secondary-btn" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      gameCode: '',
      loading: true,
      error: '',
      word: '',
      seat: 0,
      joinedCount: 0,
      totalPlayers: 0,
      status: 'waiting',
      revealed: false
    }
  },
  computed: {
    statusText() {
      return {
        waiting: '等待中',
        playing: '游戏中',
        ended: '已结束'
      }[this.status] || '未知'
    }
  },
  onLoad(options) {
    this.gameCode = options.code
    this.init()
  },
  methods: {
    async init() {
      const cacheKey = `spy_card_${this.gameCode}`

      // 1. 优先读本地缓存
      try {
        const cached = uni.getStorageSync(cacheKey)
        if (cached && cached.word) {
          this.word = cached.word
          this.seat = cached.seat
          this.joinedCount = cached.joinedCount || 0
          this.totalPlayers = cached.totalPlayers || 0
          this.loading = false
          // 静默刷新最新人数
          this.refresh(true)
          return
        }
      } catch (e) {}

      // 2. 无缓存 → 调用云函数加入
      await this.join()
    },

    async join() {
      try {
        const res = await wx.cloud.callFunction({
          name: 'spyJoinRoom',
          data: { gameCode: this.gameCode }
        })
        const r = res.result

        if (r.code !== 0) {
          this.error = r.msg
          this.loading = false
          return
        }

        const d = r.data
        this.word = d.word
        this.seat = d.seat
        this.joinedCount = d.joinedCount
        this.totalPlayers = d.totalPlayers

        // 3. 记录到本地：游戏码 + 座位 + 牌面
        uni.setStorageSync(`spy_card_${this.gameCode}`, {
          gameCode: this.gameCode,
          seat: d.seat,
          word: d.word,
          joinedCount: d.joinedCount,
          totalPlayers: d.totalPlayers
        })

        this.loading = false
      } catch (e) {
        console.error(e)
        this.error = '加入失败，请重试'
        this.loading = false
      }
    },

    async refresh(silent = false) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'spyGetRoom',
          data: { gameCode: this.gameCode }
        })
        const r = res.result
        if (r.code === 0) {
          this.joinedCount = r.data.joinedCount
          this.totalPlayers = r.data.totalPlayers
          this.status = r.data.status

          // 更新本地缓存
          const cacheKey = `spy_card_${this.gameCode}`
          const cached = uni.getStorageSync(cacheKey) || {}
          uni.setStorageSync(cacheKey, {
            ...cached,
            joinedCount: this.joinedCount,
            totalPlayers: this.totalPlayers
          })

          if (!silent) uni.showToast({ title: '已刷新', icon: 'none' })
        }
      } catch (e) {
        if (!silent) uni.showToast({ title: '刷新失败', icon: 'none' })
      }
    },

    reveal() { this.revealed = true },
    hide() { this.revealed = false },
    goHome() { uni.reLaunch({ url: '/pages/index/index' }) }
  }
}
</script>

<style scoped>
.page { padding: 40rpx; }
.center { display: flex; flex-direction: column; align-items: center; padding-top: 200rpx; }
.error-text { color: #F6685E; margin-bottom: 40rpx; }

.code-section { text-align: center; margin-bottom: 60rpx; }
.code-label { display: block; font-size: 28rpx; color: #999; }
.code-value { display: block; font-size: 72rpx; font-weight: bold; letter-spacing: 8rpx; color: #333; margin: 16rpx 0; }
.hint { font-size: 24rpx; color: #999; }

.card-section { display: flex; flex-direction: column; align-items: center; margin: 60rpx 0; }
.card { width: 400rpx; height: 400rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; }
.card-hidden { background: linear-gradient(135deg, #5B8FF9, #3D6FE0); }
.card-hidden .card-hint { color: #fff; font-size: 32rpx; }
.card-shown { background: #fff; border: 4rpx solid #5B8FF9; }
.card-shown .card-word { font-size: 80rpx; font-weight: bold; color: #333; }
.card-tip { margin-top: 24rpx; font-size: 24rpx; color: #999; }

.info-section { background: #f7f8fa; border-radius: 16rpx; padding: 32rpx; margin-bottom: 40rpx; }
.info-row { display: flex; justify-content: space-between; padding: 16rpx 0; font-size: 30rpx; }
.info-row .value { color: #5B8FF9; font-weight: bold; }

.primary-btn, .secondary-btn { margin-top: 24rpx; }
.primary-btn { background: #5B8FF9; color: #fff; }
.secondary-btn { background: #fff; color: #5B8FF9; border: 2rpx solid #5B8FF9; }
</style>
```

### 4.5 管理后台 `pages/games/wodi/questions.vue`

```vue
<template>
  <view class="page">
    <view class="toolbar">
      <input v-model="keyword" placeholder="搜索词语" class="search" />
      <button size="mini" type="primary" @click="showAdd">新增</button>
    </view>

    <view v-for="q in list" :key="q._id" class="item">
      <view class="words">
        <text class="word">{{ q.civilianWord }}</text>
        <text class="vs">/</text>
        <text class="word spy">{{ q.spyWord }}</text>
        <text v-if="q.category" class="cat">{{ q.category }}</text>
      </view>
      <view class="actions">
        <button size="mini" @click="edit(q)">编辑</button>
        <button size="mini" type="warn" @click="del(q)">删除</button>
      </view>
    </view>

    <!-- 新增/编辑弹窗 -->
    <view v-if="showModal" class="modal-mask" @click="showModal = false">
      <view class="modal" @click.stop>
        <text class="modal-title">{{ form._id ? '编辑' : '新增' }}词条</text>
        <input v-model="form.civilianWord" placeholder="好人词（如：月亮）" />
        <input v-model="form.spyWord" placeholder="卧底词（如：太阳）" />
        <input v-model="form.category" placeholder="分类（可选）" />
        <view class="modal-actions">
          <button @click="showModal = false">取消</button>
          <button type="primary" @click="save">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      list: [],
      keyword: '',
      showModal: false,
      form: { _id: '', civilianWord: '', spyWord: '', category: '' }
    }
  },
  onLoad() { this.load() },
  methods: {
    async load() {
      const res = await wx.cloud.callFunction({
        name: 'adminQuestion',
        data: { action: 'list', data: { page: 1, size: 100, keyword: this.keyword } }
      })
      if (res.result.code === 0) {
        this.list = res.result.data.list
      } else {
        uni.showToast({ title: res.result.msg, icon: 'none' })
      }
    },
    showAdd() {
      this.form = { _id: '', civilianWord: '', spyWord: '', category: '' }
      this.showModal = true
    },
    edit(q) {
      this.form = { ...q }
      this.showModal = true
    },
    async save() {
      const f = this.form
      if (!f.civilianWord || !f.spyWord) {
        return uni.showToast({ title: '词不能为空', icon: 'none' })
      }
      if (f.civilianWord === f.spyWord) {
        return uni.showToast({ title: '两个词不能相同', icon: 'none' })
      }
      const action = f._id ? 'update' : 'add'
      const res = await wx.cloud.callFunction({
        name: 'adminQuestion',
        data: { action, data: f }
      })
      if (res.result.code !== 0) {
        return uni.showToast({ title: res.result.msg, icon: 'none' })
      }
      this.showModal = false
      this.load()
    },
    async del(q) {
      const ok = await new Promise(resolve => {
        uni.showModal({
          title: '确认删除',
          content: `删除「${q.civilianWord}/${q.spyWord}」？`,
          success: r => resolve(r.confirm)
        })
      })
      if (!ok) return
      await wx.cloud.callFunction({
        name: 'adminQuestion',
        data: { action: 'delete', data: { _id: q._id } }
      })
      this.load()
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.toolbar { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.search { flex: 1; background: #f5f5f5; padding: 16rpx; border-radius: 8rpx; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx; background: #fff; border-radius: 12rpx; margin-bottom: 16rpx; }
.words { display: flex; align-items: center; gap: 16rpx; }
.word { font-size: 32rpx; font-weight: bold; color: #333; }
.word.spy { color: #F6685E; }
.vs { color: #999; }
.cat { font-size: 22rpx; color: #999; background: #f5f5f5; padding: 4rpx 12rpx; border-radius: 8rpx; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 999; }
.modal { background: #fff; border-radius: 16rpx; padding: 40rpx; width: 600rpx; }
.modal-title { display: block; font-size: 32rpx; font-weight: bold; margin-bottom: 32rpx; text-align: center; }
.modal input { background: #f5f5f5; padding: 20rpx; border-radius: 8rpx; margin-bottom: 20rpx; }
.modal-actions { display: flex; gap: 20rpx; margin-top: 20rpx; }
.modal-actions button { flex: 1; }
</style>
```

---

## 五、关键流程说明

### 5.1 生成游戏码（含唯一性保证）

```
用户点击「生成游戏码」
   ↓
云函数 spyCreateRoom：
   1. 校验：人数 4-12、卧底 ≥1、卧底 < 好人
   2. 随机选题（skip 随机）
   3. 随机生成牌面顺序（随机选 spyCount 个位置放卧底）
   4. 循环生成 6 位数字码：
      - 尝试 add({ _id: code, ... })
      - _id 冲突 → 重试（最多 10 次）
      - 成功 → 返回
   5. 创建者自动领 1 号牌，joinedCount = 1
   ↓
返回 { gameCode, myCard }
```

**唯一性**：靠 `spy_rooms` 的 `_id` 唯一约束，**永久不删记录**，码不复用。

### 5.2 加入房间（原子领牌）

```
用户输入码 → 云函数 spyJoinRoom：
   事务开始
   ├── 查房间（doc(gameCode).get()）
   ├── 校验：状态 waiting、未过期
   ├── 校验：joinedCount < totalPlayers（否则提示"人数已满"）
   ├── 找第一张 claimed=false 的牌
   ├── 标记该牌 claimed=true
   ├── joinedCount += 1
   ├── 若 joinedCount == totalPlayers → status = 'playing'
   事务提交
   ↓
返回 { seat, word, joinedCount, totalPlayers }
```

**并发安全**：`runTransaction` 保证同一房间的加入操作串行化，不会发出同一张牌。

### 5.3 前端本地缓存策略

```
进入房间页
   ↓
读本地缓存 spy_card_{gameCode}
   ├── 有 → 直接用（座位、牌面）
   │      后台静默刷新人数
   └── 无 → 调 spyJoinRoom 领牌
          → 存入本地：{ gameCode, seat, word }
```

**本地缓存键**：`spy_card_{游戏码}`
**存储内容**：`{ gameCode, seat, word, joinedCount, totalPlayers }`

**清缓存后的行为**：会再次请求接口 → 消耗一个名额。这是用户明确接受的行为。

### 5.4 人数已满的处理

当 `joinedCount >= totalPlayers` 时，第 6 个请求返回：

```js
{ code: 403, msg: '房间人数已满' }
```

前端展示错误页 + "返回首页"按钮。

---

## 六、部署步骤



### 6.2 创建数据库集合

在云开发控制台创建：

```
spy_questions    题库
spy_rooms        房间
```

**权限设置**：
- `spy_questions`：仅管理员可读写（云函数不受限）
- `spy_rooms`：仅管理员可读写

### 6.3 上传云函数

右键 `cloudfunctions` 下的每个目录 → 「上传并部署：云端安装依赖」

需要 4 个云函数：

```
spyCreateRoom
spyJoinRoom
spyGetRoom
adminQuestion
```

### 6.4 初始化管理员

1. 在 `adminQuestion/index.js` 里配置 `ADMIN_OPENIDS`
2. 或者在云开发控制台手动插入第一条题库数据

### 6.5 测试流程

```
1. 打开首页 → 创建房间（6人，1卧底）
2. 拿到游戏码，进入房间页，看到自己的牌
3. 用另一个微信号（或开发者工具多开）输入码加入
4. 重复直到第 6 人 → 应提示"人数已满"
5. 检查云数据库 spy_rooms，确认 joinedCount 和 cards 正确
```

---

## 七、边界与异常

| 场景 | 处理 |
|---|---|
| 游戏码不存在 | 云函数查 doc 失败 → "房间不存在" |
| 房间已过期 | 校验 expireTime → "房间已过期" |
| 房间人数已满 | joinedCount >= totalPlayers → "人数已满" |
| 游戏码生成冲突 | _id 冲突重试 10 次 |
| 并发领牌 | 事务 + 原子更新，串行化 |
| 前端重复进入 | 本地缓存命中，不重复请求 |
| 清缓存后重进 | 会消耗一个名额（用户接受） |
| 卧底人数 ≥ 好人 | 创建时校验拒绝 |
| 游戏人数 < 4 或 > 12 | 创建时校验拒绝 |
| 题库为空 | 创建时校验拒绝 |
| 管理员越权 | openid 白名单校验 |
| 卧底身份泄露 | 只下发 word，不下发 isSpy |

---

## 八、一句话总结

**整套方案的核心是：用房间 `_id` 做游戏码（6 位数字天然唯一，冲突重试），用 `cards` 数组存牌（随机顺序），用 `runTransaction` 保证并发领牌安全，用 `joinedCount` 计数并在满员时拒绝，前端用 `spy_card_{码}` 做本地缓存避免重复请求。** 无需登录、无需记录用户、管理员通过白名单管理题库。



---

