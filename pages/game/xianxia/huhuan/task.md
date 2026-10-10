# 物料互换功能 增量设计文档 v3.1

> **本版新增**：登录强制、消息通知、伸手模式、互换物料填写。
> 基于 v3.0 互换模型扩展，未提及部分沿用 v3.0。

---

---

## 1. 登录要求

### 1.1 强制登录点

| 操作 | 是否需要登录 |
|---|---|
| 浏览首页 / 公开物料 | 否 |
| 凭码查询（看信息） | **是** |
| 提交申请 | 是 |
| 发布互换 | 是 |
| 查看我的申请 / 我的发布 | 是 |
| 查看通知 | 是 |

### 1.2 登录流程

```
未登录访问需登录页面
   ↓
跳转微信授权 → 手机号绑定（首次）
   ↓
回到原页面
```

**关键**：凭码查询也要登录。原因：
- 防止脚本枚举码
- B 的身份需要绑定（用于消息推送和申请记录）
- 避免匿名骚扰

**未登录时**：码页显示"登录后查看详情"，不展示任何发布内容。

---

## 2. 发布类型（新增）

### 2.1 三种类型

| 类型 | 含义 | B 需要提供物料 |
|---|---|---|
| **仅互换** | 必须互相交换 | 是（必填） |
| **仅伸手** | 单方面赠送，不要求对方给 | 否 |
| **两者皆可** | B 自己选伸手还是互换 | 互换时必填 |


完整流程
物料库（用户的资产，长期存在）
   ├── 物料1  A版小卡
   ├── 物料2  B版小卡
   ├── 物料3  专辑海报
   ├── 物料4  应援手幅
   └── 物料5  签名照
        ↓ 发布互换时勾选
   发布单（引用物料ID） + 物料码
        ↓
   勾选了 1、2、3 → 这个发布单只放这 3 件


   【A 发布】
1. 填物料名称、图片、互换数量、备注、有效期
2. 提交 → 生成物料码 K7M2P9QX
3. 复制码 / 分享卡片

【B 申请】
4. 输入码 / 扫码
5. 看到 A 的发布信息 + 剩余名额
6. 填：昵称、数量（默认1）、备注
7. 提交 → 进入 A 的申请列表

【A 管理】
8. 打开「我发布的」→ 看到申请列表
9. 可操作：
   - 修改某人的数量
   - 删除某人的申请
   - 标记「已互换」
10. 名额变动实时同步给 B

### 2.2 发布页变更
```
┌────────────────────────────────┐
│  物料名称  [ A版小卡         ]   │
│  图片      [ + 上传 ]           │
│  互换数量  [ 5 ]  + -           │
│                                │
│  互换方式  ● 仅互换             │
│           ○ 仅伸手             │
│           ○ 两者皆可            │
│                                │
│  备注      [ 想换B版，内场B区 ]  │
│  有效期    [ 7天 ▾ ]            │
├────────────────────────────────┤
│         [ 生成物料码 ]          │
└────────────────────────────────┘
```

### 2.3 展示差异

**凭码查询时**，B 看到的方式标签不同：

| 类型 | B 侧展示 |
|---|---|
| 仅互换 | 标签「互换」+ 必填互换物料表单 |
| 仅伸手 | 标签「伸手」+ 提示"直接领取，无需提供物料" |
| 两者皆可 | 单选「我要互换 / 我伸手」 |

---

## 3. 互换物料填写（B 侧）

### 3.1 三种来源

B 申请互换时，必须说明自己拿什么换。三种填写方式：

| 来源 | 说明 | 需要什么前置 |
|---|---|---|
| **从物料库选** | 如果产品有物料库，从自己的库里挑 | 物料库功能（可选） |
| **从我的发布单选** | 引用自己已发布的互换单 | 有进行中的发布 |
| **手填** | 直接输入名称、数量、备注 | 无 |

**产品策略**：

- 如果已做物料库（v2.1）→ 三种都开
- 如果只做了互换发布（v3.0）→ 只开「发布单 + 手填」
- **最小可用**：先只做「手填」+「从我的发布单选」

### 3.2 申请页结构

```
┌────────────────────────────────┐
│  来自 @小明 的互换              │
├────────────────────────────────┤
│  ┌────┐  A版小卡               │
│  │ 图 │  剩余 3 / 5 份 · 互换   │
│  └────┘                        │
├────────────────────────────────┤
│  我的昵称  [ 小红           ]   │
│  申请数量  [ 1 ]  + -           │
│                                │
│  我拿什么换  ← 互换时必填        │
│  ┌──────────────────────────┐  │
│  │ ○ 手填                    │  │
│  │   名称 [ B版小卡      ]   │  │
│  │   数量 [ 1 ]              │  │
│  │   备注 [ 全新未拆      ]   │  │
│  │                          │  │
│  │ ○ 从我的发布单选          │  │
│  │   [ 选择发布单 → ]        │  │
│  └──────────────────────────┘  │
│                                │
│  我的备注  [ 内场B区可面交  ]   │
├────────────────────────────────┤
│         [ 提交申请 ]            │
└────────────────────────────────┘
```

### 3.3 从"我的发布单"选择

点击后弹出自己进行中的发布单列表：

```
┌────────────────────────────────┐
│  选择我的发布单                 │
├────────────────────────────────┤
│  ○ K7M2P9QX · A版小卡 x2        │
│  ○ X8N3Q4WR · 专辑海报 x1       │
│  ○ ...                          │
└────────────────────────────────┘
```

选中后，B 的申请里记录 `ref_listing_id`，A 可以看到 B 的发布单详情。

**注意**：这只是**引用**，不是自动建立双向关系。A 想看 B 的发布单，点进去即可。

### 3.4 数据结构

```javascript
// 互换物料信息（存 exchange_apply 表）
my_material: {
  source: 1,           // 1手填 2物料库 3发布单
  ref_id: null,        // 物料库/发布单的 ID
  name: "B版小卡",      // 快照名称
  image: "...",        // 快照图片（如有）
  qty: 1,
  remark: "全新未拆",
  code: null           // 如果来自发布单，存码方便跳转
}
```

**为什么存快照**：B 的物料库/发布单后来被删了，A 仍能看到当时 B 提供的物料。

---

## 4. 消息通知（新增）

### 4.1 B 需要看到的消息

| 事件 | 通知内容 | 触发 |
|---|---|---|
| A 修改了份数 | "对方将你的份数调整为 X 份" | A 改数量 |
| A 删除了申请 | "对方删除了你的申请" | A 删除 |
| A 删除了发布单 | "对方删除了发布，本次互换失效" | A 删发布 |
| A 确认了互换 | "对方已确认互换，记得面交" | A 标记 |
| A 修改了发布信息 | "对方更新了发布信息" | A 编辑发布 |

### 4.2 通知触达位置

**两个地方都要有**：

**① 全局消息中心**

```
┌────────────────────────────────┐
│  消息                           │
├────────────────────────────────┤
│  ● 小明 将你的份数调整为 2 份    │
│     A版小卡 · 10分钟前          │
│  ────────────────────────────  │
│  ○ 小红 确认了你的申请           │
│     B版小卡 · 2小时前           │
│  ────────────────────────────  │
│  ○ 系统 你的发布已过期           │
│     专辑海报 · 昨天              │
└────────────────────────────────┘
```

**② "我发起的申请"列表里的状态标记**

```
┌────────────────────────────────┐
│  我发起的申请                   │
├────────────────────────────────┤
│  ⚠ 与 @小明 的互换              │
│     A版小卡 · 1 份              │
│     对方已将份数调整为 2 份  ← 变更提示
│     [ 查看详情 ]                │
├────────────────────────────────┤
│  ✕ 与 @小刚 的互换              │
│     B版小卡 · 1 份              │
│     对方已删除本次互换           │
│     [ 删除记录 ]                │
└────────────────────────────────┘
```

### 4.3 通知表

```sql
CREATE TABLE notice (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id      BIGINT NOT NULL,        -- 接收者
  type         VARCHAR(30) NOT NULL,   -- apply_qty_changed / apply_deleted / listing_deleted / apply_confirmed / listing_updated
  title        VARCHAR(100),
  content      VARCHAR(300),
  ref_type     VARCHAR(20),            -- apply / listing
  ref_id       BIGINT,
  is_read      TINYINT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_read (user_id, is_read, created_at)
);
```

**订阅消息**（微信）：

- 申请被确认 → 发一条（用户授权过才发）
- 申请被删除 → 发一条
- 发布被删除 → 发一条
- 一天最多 1 条，避免骚扰

---

## 5. 数据模型变更

```sql
-- 发布单：新增互换方式
ALTER TABLE exchange_listing ADD COLUMN exchange_mode TINYINT DEFAULT 1;
-- 1仅互换 2仅伸手 3两者皆可

-- 申请记录：新增互换物料信息
ALTER TABLE exchange_apply ADD COLUMN apply_type TINYINT DEFAULT 1;
-- 1互换 2伸手（当发布为"两者皆可"时，B 自己选）

ALTER TABLE exchange_apply ADD COLUMN my_material JSON;
-- { source, ref_id, name, image, qty, remark, code }
-- 仅当 apply_type = 1（互换）时有值

-- 通知表（新增，见上）

-- 申请记录：新增编辑痕迹（用于展示"对方修改过"）
ALTER TABLE exchange_apply ADD COLUMN edited_at DATETIME;
ALTER TABLE exchange_apply ADD COLUMN edit_count INT DEFAULT 0;
```

**冗余字段更新**：

- `exchange_apply.my_material` 是 JSON，MySQL 5.7+ 支持，不需要额外表
- 如果需要按互换物料筛选，再抽独立表（暂不需要）

---

## 6. 接口变更

### 6.1 发布接口

```javascript
POST /api/exchange/listing/create
{
  "name": "A版小卡",
  "image": "https://...",
  "totalQty": 5,
  "exchangeMode": 1,        // 新增：1仅互换 2仅伸手 3两者皆可
  "remark": "...",
  "expireDays": 7
}
```

### 6.2 凭码查询接口

```javascript
GET /api/exchange/code/K7M2P9QX

// 响应
{
  "listingId": 123,
  "owner": { "id": 456, "nickname": "小明", "avatar": "..." },
  "name": "A版小卡",
  "image": "...",
  "totalQty": 5,
  "usedQty": 3,
  "availableQty": 2,
  "exchangeMode": 1,
  "exchangeModeText": "仅互换",
  "remark": "...",
  "expireAt": "...",
  "alreadyApplied": false,
  "myApplyStatus": null     // 如果已申请，返回状态
}
```

### 6.3 申请接口

```javascript
POST /api/exchange/apply
{
  "code": "K7M2P9QX",
  "nickname": "小红",
  "qty": 1,
  "applyType": 1,           // 1互换 2伸手
  "myMaterial": {           // applyType=1 时必填
    "source": 1,            // 1手填 2物料库 3发布单
    "refId": null,
    "name": "B版小卡",
    "qty": 1,
    "remark": "全新未拆"
  },
  "remark": "内场B区可面交"
}

// 服务端校验（在 v3.0 基础上新增）
// 1. listing.exchange_mode 是否允许该 applyType
//    - mode=1（仅互换），applyType 必须 = 1
//    - mode=2（仅伸手），applyType 必须 = 2
//    - mode=3（两者皆可），applyType 1 或 2 均可
// 2. applyType=1 时，myMaterial.name 不能为空
// 3. applyType=1 且 source=3 时，refId 必须是当前用户的有效发布单
```

### 6.4 通知接口

```
GET    /api/notice/list                通知列表
POST   /api/notice/read                标记已读（单条/全部）
GET    /api/notice/unread-count        未读数
```

### 6.5 我发起的申请

```javascript
GET /api/exchange/apply/mine

// 响应新增字段
{
  "list": [
    {
      "id": 2001,
      "listingName": "A版小卡",
      "ownerNickname": "小明",
      "qty": 2,
      "applyType": 1,
      "myMaterial": { ... },
      "status": 0,
      "statusText": "待处理",
      "hasChange": true,          // 是否有变更提示
      "changeTip": "对方已将份数调整为 2 份",
      "editedAt": "...",
      "createdAt": "..."
    }
  ]
}
```

---

## 7. 关键逻辑

### 7.1 申请时校验互换物料

```javascript
async function applyExchange(userId, data) {
  return await db.transaction(async (trx) => {
    const listing = await trx('exchange_listing')
      .where({ code: data.code, status: ['in', [1, 2]] })
      .forUpdate()
      .first();

    if (!listing) throw new BizError('LISTING_NOT_FOUND');
    if (listing.user_id === userId) throw new BizError('CANNOT_APPLY_SELF');
    if (new Date(listing.expire_at) < new Date()) {
      throw new BizError('LISTING_EXPIRED');
    }

    // 1. 校验申请类型 vs 发布类型
    const applyType = data.applyType || 1;
    if (listing.exchange_mode === 1 && applyType !== 1) {
      throw new BizError('MODE_MISMATCH', '该发布仅支持互换');
    }
    if (listing.exchange_mode === 2 && applyType !== 2) {
      throw new BizError('MODE_MISMATCH', '该发布仅支持伸手');
    }

    // 2. 互换时必须提供物料
    if (applyType === 1) {
      if (!data.myMaterial?.name?.trim()) {
        throw new BizError('MATERIAL_REQUIRED', '请填写你要互换的物料');
      }
      if (data.myMaterial.source === 3 && data.myMaterial.refId) {
        const refListing = await trx('exchange_listing')
          .where({ id: data.myMaterial.refId, user_id: userId, status: ['in', [1, 2]] })
          .first();
        if (!refListing) throw new BizError('REF_LISTING_INVALID');
        data.myMaterial.code = refListing.code;
        data.myMaterial.name = data.myMaterial.name || refListing.name;
        data.myMaterial.image = data.myMaterial.image || refListing.image;
      }
    }

    // 3. 幂等
    const exist = await trx('exchange_apply')
      .where({ listing_id: listing.id, applicant_id: userId })
      .whereIn('status', [0, 1])
      .first();
    if (exist) throw new BizError('ALREADY_APPLIED');

    // 4. 库存校验（同 v3.0）
    const qty = Math.max(1, parseInt(data.qty) || 1);
    if (listing.used_qty + qty > listing.total_qty) {
      throw new BizError('QTY_NOT_ENOUGH');
    }
    if (listing.applicant_cnt + 1 > listing.total_qty) {
      throw new BizError('APPLICANT_FULL');
    }

    // 5. 创建申请
    await trx('exchange_apply').insert({
      listing_id: listing.id,
      owner_id: listing.user_id,
      applicant_id: userId,
      nickname: data.nickname,
      qty,
      apply_type: applyType,
      my_material: applyType === 1 ? JSON.stringify(data.myMaterial) : null,
      remark: data.remark,
      status: 0
    });

    // 6. 更新发布单计数
    await trx('exchange_listing').where({ id: listing.id }).update({
      used_qty: listing.used_qty + qty,
      applicant_cnt: listing.applicant_cnt + 1,
      status: (listing.used_qty + qty) >= listing.total_qty ? 2 : 1
    });

    // 7. 通知 A
    await mq.send('notice', {
      userId: listing.user_id,
      type: 'new_apply',
      content: `${data.nickname} ${applyType === 1 ? '想和你互换' : '伸手了'} ${qty} 份`
    });

    return { ok: true };
  });
}
```

### 7.2 修改份数 → 发通知

```javascript
async function updateQty(applyId, ownerId, newQty) {
  return await db.transaction(async (trx) => {
    const apply = await trx('exchange_apply')
      .where({ id: applyId, owner_id: ownerId, status: 0 })
      .forUpdate()
      .first();
    if (!apply) throw new BizError('NOT_FOUND');

    const listing = await trx('exchange_listing')
      .where({ id: apply.listing_id })
      .forUpdate()
      .first();

    if (newQty < 1) throw new BizError('QTY_TOO_SMALL');

    const delta = newQty - apply.qty;
    const newUsed = listing.used_qty + delta;
    if (newUsed > listing.total_qty) {
      throw new BizError('QTY_NOT_ENOUGH', `最多还能加 ${listing.total_qty - listing.used_qty} 份`);
    }

    await trx('exchange_apply').where({ id: applyId }).update({
      qty: newQty,
      edited_at: new Date(),
      edit_count: trx.raw('edit_count + 1')
    });

    await trx('exchange_listing').where({ id: listing.id }).update({
      used_qty: newUsed,
      status: newUsed >= listing.total_qty ? 2 : 1
    });

    // 通知 B（关键）
    await mq.send('notice', {
      userId: apply.applicant_id,
      type: 'apply_qty_changed',
      title: listing.name,
      content: `对方将你的份数从 ${apply.qty} 份调整为 ${newQty} 份`,
      refType: 'apply',
      refId: applyId
    });

    return { ok: true };
  });
}
```

### 7.3 删除申请 → 发通知

```javascript
async function deleteApply(applyId, ownerId) {
  return await db.transaction(async (trx) => {
    const apply = await trx('exchange_apply')
      .where({ id: applyId, owner_id: ownerId })
      .whereIn('status', [0, 1])
      .forUpdate()
      .first();
    if (!apply) throw new BizError('NOT_FOUND');

    const listing = await trx('exchange_listing')
      .where({ id: apply.listing_id })
      .forUpdate()
      .first();

    await trx('exchange_apply').where({ id: applyId }).update({
      status: 2,
      deleted_at: new Date()
    });

    const newUsed = Math.max(0, listing.used_qty - apply.qty);
    const newCnt = Math.max(0, listing.applicant_cnt - 1);
    await trx('exchange_listing').where({ id: listing.id }).update({
      used_qty: newUsed,
      applicant_cnt: newCnt,
      status: 1
    });

    // 通知 B
    await mq.send('notice', {
      userId: apply.applicant_id,
      type: 'apply_deleted',
      title: listing.name,
      content: '对方删除了你的申请',
      refType: 'apply',
      refId: applyId
    });

    return { ok: true };
  });
}
```

### 7.4 删除发布单 → 批量通知

```javascript
async function deleteListing(listingId, ownerId) {
  return await db.transaction(async (trx) => {
    const listing = await trx('exchange_listing')
      .where({ id: listingId, user_id: ownerId, status: ['in', [1, 2]] })
      .forUpdate()
      .first();
    if (!listing) throw new BizError('NOT_FOUND');

    // 软删发布
    await trx('exchange_listing').where({ id: listingId }).update({
      status: 5,
      deleted_at: new Date()
    });

    // 失效所有 PENDING 申请
    const affected = await trx('exchange_apply')
      .where({ listing_id: listingId, status: 0 })
      .update({ status: 2, deleted_at: new Date() })
      .returning(['id', 'applicant_id']);

    // 批量通知
    if (affected.length) {
      await mq.send('notice.batch', {
        type: 'listing_deleted',
        title: listing.name,
        content: '对方删除了发布，本次互换失效',
        userIds: affected.map(r => r.applicant_id)
      });
    }

    return { ok: true, affected: affected.length };
  });
}
```

### 7.5 修改发布信息 → 通知（可选）

A 修改了名称/数量/备注，是否通知 B？两种策略：

| 策略 | 说明 | 推荐 |
|---|---|---|
| 不通知 | 改动小，避免打扰 | 改备注时 |
| 通知 | 影响 B 的判断 | 改名称/数量时 |

**折中**：只在**数量减少**（可能影响已申请的人）时通知，其余不通知。

---

## 8. 页面清单（v3.1）

| # | 页面 | 变更 |
|---|---|---|
| 1 | 发布页 | + 互换方式选择 |
| 2 | 物料码展示页 | - |
| 3 | 凭码查询页 | + 登录校验 + 方式标签 |
| 4 | 申请页 | + 互换物料填写 |
| 5 | 从发布单选择页 | **新增** |
| 6 | A 的申请列表（todolist） | + 显示 B 提供的物料 + 伸手/互换标签 |
| 7 | 我发起的申请 | + 状态变更提示 |
| 8 | 消息中心 | **新增** |
| 9 | 通知详情 | **新增**（可选） |

---

## 9. A 的申请列表展示（更新）

```
┌────────────────────────────────────┐
│  ← A版小卡互换                      │
│  互换 · 已申请 4 人 · 5/5 份         │
├────────────────────────────────────┤
│  ○ 小红        1 份    [互换] [已互换]│
│    提供：B版小卡 x1（全新）          │
│    备注：我有B版小卡                 │
│    [ 改数量 ] [ 删除 ]              │
├────────────────────────────────────┤
│  ○ 小刚        2 份    [伸手]        │
│    备注：送你，不用还                │
│    [ 改数量 ] [ 删除 ]              │
├────────────────────────────────────┤
│  ○ 小美        1 份    [互换] [已互换]│
│    提供：发布单 K7M2P9QX →          │
│    备注：B版换A版                    │
│    [ 改数量 ] [ 删除 ]              │
└────────────────────────────────────┘
```

**关键展示**：

- `[互换]` / `[伸手]` 标签
- 互换时显示 B 提供的物料（名称 + 数量 + 备注）
- 如果 B 提供了发布单，显示码和跳转入口

---

## 10. 边界与异常

| 场景 | 处理 |
|---|---|
| 未登录点凭码查询 | 跳登录，登录后回原页 |
| 仅互换发布，B 选伸手 | 拒绝，"该发布仅支持互换" |
| 仅伸手发布，B 选互换 | 拒绝，"该发布仅支持伸手" |
| 互换时 myMaterial.name 为空 | 拒绝，"请填写你要互换的物料" |
| B 引用的发布单已过期 | 拒绝，"你选择的发布单已失效" |
| A 改份数后 B 没看消息 | 下次打开"我的申请"看到变更提示 |
| A 删了发布，B 的记录 | 状态显示"发布已删除"，可删除记录 |
| 消息重复推送 | 通知用 `ref_id + type` 去重 |
| 订阅消息次数用完 | 降级为站内消息 |
| A 修改发布数量减少 | 如果导致 `used_qty > total_qty`，拒绝修改 |

**最后一条要展开**：A 想把 total_qty 从 5 改成 3，但已有申请占了 5 份 → 拒绝。必须先删申请。

```javascript
async function updateListingQty(listingId, ownerId, newTotal) {
  const listing = await db('exchange_listing')
    .where({ id: listingId, user_id: ownerId })
    .first();
  if (newTotal < listing.used_qty) {
    throw new BizError('QTY_BELOW_USED', `已有 ${listing.used_qty} 份被申请，请先处理申请`);
  }
  // ...
}
```

---

## 11. 工期增量

| 模块 | 增量人天 |
|---|---|
| 登录校验（全局拦截） | 0.5 |
| 互换方式（发布 + 申请） | 1 |
| 互换物料填写（含发布单选择） | 1.5 |
| 消息通知（站内 + 订阅） | 1.5 |
| 我发起的申请状态展示 | 0.5 |
| 联调测试 | 1 |
| **v3.0 基础** | 8 |
| **v3.1 合计** | **约 14 人天** |

1 个全栈，**3 周内上线**。

---

## 12. 避坑清单（v3.1 新增）

1. ❌ 凭码查询不做登录校验 → 脚本枚举
2. ❌ 互换模式不校验类型 → 伸手的人也能申请"仅互换"的单
3. ❌ 互换物料只存 ID 不存快照 → B 的发布单删了，A 看不到提供的是什么
4. ❌ A 改份数不发通知 → B 不知道自己的申请变了
5. ❌ A 删发布单不通知 → B 一直等一个不存在的互换
6. ❌ 消息不做去重 → A 连点删除，B 收到 5 条
7. ❌ 订阅消息不控制频次 → 用户取关，后续全废
8. ❌ A 把 total_qty 改小到低于 used_qty → 数据不一致
9. ❌ 互换和伸手共用一个状态机 → 无法区分
10. ❌ 引用发布单不校验有效性 → B 引用了一个自己已删的发布单

---
