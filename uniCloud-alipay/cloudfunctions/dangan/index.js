'use strict';
const db = uniCloud.database();
const COLLECTION = 'dangan';
const DICT_COLLECTION = 'dangan-dict';

// 服务端二次校验管理员权限（不信任前端传入的 role）
async function isAdminUser(userId) {
	if (!userId) return false;
	try {
		const res = await db.collection('user-info').doc(userId).get();
		const user = res.data && res.data[0];
		if (!user) return false;
		return ['s_admin', 'admin'].includes(user.role);
	} catch (err) {
		console.error('管理员校验失败:', err);
		return false;
	}
}

exports.main = async (event, context) => {
	const { action } = event;

	switch (action) {
		case 'getList':
			return await getList(event);
		case 'add':
			return await add(event);
		case 'update':
			return await update(event);
		case 'delete':
			return await remove(event);
		case 'setHidden':
			return await setHidden(event);
		case 'getDict':
			return await getDict(event);
		case 'saveDict':
			return await saveDict(event);
		default:
			return { code: -1, message: '未知的操作类型' };
	}
};

// 获取档案数据：
//   非管理员（未传 userId 或身份不是 s_admin/admin）→ 自动过滤 hidden=true 的记录，不下发到普通用户
//   管理员 → 返回全量，包含 hidden 字段，供 admin 页可预览与管理隐藏项
async function getList(event) {
	try {
		const admin = await isAdminUser(event && event.userId);
		const out = [];
		let page = 0;
		const pageSize = 500;
		// 分页取全量，规避 get() 默认条数限制
		while (page < 40) {
			const res = await db.collection(COLLECTION)
				.orderBy('sort', 'asc')
				.skip(page * pageSize)
				.limit(pageSize)
				.get();
			const list = res.data || [];
			if (admin) {
				out.push(...list);
			} else {
				for (const r of list) { if (!r.hidden) out.push(r); }
			}
			if (list.length < pageSize) break;
			page++;
		}
		return { code: 0, message: '获取成功', data: { list: out, total: out.length, adminView: !!admin } };
	} catch (err) {
		return { code: -1, message: '获取失败：' + err.message };
	}
}

// 新增（仅管理员）
async function add(event) {
	try {
		const { userId, subject, category, data = {}, sort = 0, hidden } = event;
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!subject || !category) {
			return { code: -1, message: '缺少主体或分类' };
		}
		const now = Date.now();
		const res = await db.collection(COLLECTION).add({
			subject,
			category,
			sort: Number(sort) || 0,
			hidden: !!hidden,
			data,
			createTime: now,
			updateTime: now
		});
		return { code: 0, message: '添加成功', data: { id: res.id } };
	} catch (err) {
		return { code: -1, message: '添加失败：' + err.message };
	}
}

// 更新（仅管理员）
async function update(event) {
	try {
		const { userId, id, subject, category, data = {}, sort = 0 } = event;
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!id) {
			return { code: -1, message: '缺少ID' };
		}
		const payload = { updateTime: Date.now() };
		if (subject !== undefined) payload.subject = subject;
		if (category !== undefined) payload.category = category;
		if (sort !== undefined) payload.sort = Number(sort) || 0;
		// 隐藏标志：仅当显式传入时才覆盖，避免普通字段保存把已隐藏项反默打开
		if (event.hidden !== undefined) payload.hidden = !!event.hidden;
		payload.data = data;
		await db.collection(COLLECTION).doc(id).update(payload);
		return { code: 0, message: '更新成功' };
	} catch (err) {
		return { code: -1, message: '更新失败：' + err.message };
	}
}

// 删除（仅管理员）
async function remove(event) {
	try {
		const { userId, id } = event;
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!id) {
			return { code: -1, message: '缺少ID' };
		}
		await db.collection(COLLECTION).doc(id).remove();
		return { code: 0, message: '删除成功' };
	} catch (err) {
		return { code: -1, message: '删除失败：' + err.message };
	}
}

// 切换隐藏标志（仅管理员）：隐藏后普通用户在 dangan.vue 中看不到，admin.vue 中仍可见与管理
async function setHidden(event) {
	try {
		const { userId, id, hidden } = event;
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!id) {
			return { code: -1, message: '缺少ID' };
		}
		await db.collection(COLLECTION).doc(id).update({
			hidden: !!hidden,
			updateTime: Date.now()
		});
		return { code: 0, message: hidden ? '已隐藏' : '已取消隐藏' };
	} catch (err) {
		return { code: -1, message: '操作失败：' + err.message };
	}
}

// 获取字典（公开读，前端与 DICT_BASE 合并去重）
async function getDict() {
	try {
		const res = await db.collection(DICT_COLLECTION).limit(100).get();
		const dict = {};
		(res.data || []).forEach(d => {
			if (d.key) dict[d.key] = Array.isArray(d.values) ? d.values : [];
		});
		return { code: 0, message: '获取成功', data: { dict } };
	} catch (err) {
		return { code: -1, message: '获取字典失败：' + err.message };
	}
}

// 保存字典（仅管理员，按 key 整体覆盖 upsert）
async function saveDict(event) {
	try {
		const { userId, key, values } = event;
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		if (!key) {
			return { code: -1, message: '缺少字典键' };
		}
		if (!Array.isArray(values)) {
			return { code: -1, message: '字典值必须为数组' };
		}
		// 去空去重，限制单字典容量
		const clean = Array.from(new Set(values.map(v => String(v || '').trim()).filter(v => v)));
		if (clean.length > 200) {
			return { code: -1, message: '字典选项过多（上限200）' };
		}
		const now = Date.now();
		const exist = await db.collection(DICT_COLLECTION).where({ key }).limit(1).get();
		if (exist.data && exist.data.length) {
			await db.collection(DICT_COLLECTION).doc(exist.data[0]._id).update({ values: clean, updateTime: now });
		} else {
			await db.collection(DICT_COLLECTION).add({ key, values: clean, createTime: now, updateTime: now });
		}
		return { code: 0, message: '保存成功', data: { values: clean } };
	} catch (err) {
		return { code: -1, message: '保存字典失败：' + err.message };
	}
}
