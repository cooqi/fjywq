'use strict';
/**
 * 大头贴相框模板 photo 云函数（uniCloud-alipay）
 * 参照 wodi / exchange：单函数 + action 路由，统一返回 { code, msg, data }，code=0 成功。
 * 微信云开发文档已适配本项目：
 *   - 权限：不用 openid 白名单，改用 userId + userRole（s_admin / admin）门控管理员操作；
 *   - 存储：模板 PNG 由前端 uniCloud.uploadFile 直传云存储（存 fileID），
 *           列表/详情读取时服务端用 uniCloud.getTempFileURL 换成临时 https URL 再下发；
 *           删除时服务端用 uniCloud.deleteFile 一并清理云存储文件，避免空间泄漏。
 *   - 无事务：本模块无并发抢占，直接读写即可。
 * 用户端：list（分页+分类）/ get（单个）/ incUse（合成后使用次数 +1，best-effort）
 * 管理端：adminList / add / update / delete / toggle
 */
const db = uniCloud.database();

const FRAMES = 'photo_frames';

function now() { return Date.now(); }
function ok(data, msg) { return { code: 0, msg: msg || 'ok', data }; }
function fail(msg) { return { code: -1, msg: msg || '操作失败' }; }

// photoArea 归一化：确保是 {x,y,w,h} 且都在 0-1 之间，非法则回退全屏
function normalizeArea(area) {
	const full = { x: 0, y: 0, w: 1, h: 1 };
	if (!area || typeof area !== 'object') return full;
	const num = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
	const x = num(area.x, 0);
	const y = num(area.y, 0);
	const w = num(area.w, 1);
	const h = num(area.h, 1);
	// 防止超出右/下边界
	return { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) };
}

// 把 cloud:// 的 fileID 批量换成临时 https URL（就地替换 rows 的 frameUrl / thumbUrl）
async function resolveUrls(rows) {
	const ids = [];
	rows.forEach(r => {
		if (r.frameUrl && /^cloud:\/\//.test(r.frameUrl)) ids.push(r.frameUrl);
		if (r.thumbUrl && /^cloud:\/\//.test(r.thumbUrl)) ids.push(r.thumbUrl);
	});
	if (!ids.length) return rows;
	try {
		const res = await uniCloud.getTempFileURL({ fileList: Array.from(new Set(ids)) });
		const map = {};
		(res.fileList || []).forEach(f => { if (f.tempFileURL) map[f.fileID] = f.tempFileURL; });
		rows.forEach(r => {
			if (map[r.frameUrl]) r.frameUrl = map[r.frameUrl];
			if (map[r.thumbUrl]) r.thumbUrl = map[r.thumbUrl];
		});
	} catch (e) {
		console.warn('getTempFileURL 失败：', e);
	}
	return rows;
}

exports.main = async (event, context) => {
	const { action } = event;
	try {
		switch (action) {
			case 'list':   return await list(event);
			case 'get':    return await getOne(event);
			case 'incUse': return await incUse(event);
			// ===== 模板管理（管理员） =====
			case 'adminList':
			case 'add':
			case 'update':
			case 'delete':
			case 'toggle':
				return await adminRouter(action, event);
			default:
				return fail('未知操作: ' + action);
		}
	} catch (err) {
		console.error('photo 错误:', err);
		return fail(err.message || '服务器错误');
	}
};

/* ================= 用户端：模板列表 ================= */
async function list(event) {
	const category = String(event.category || '').trim();
	const page = Math.max(1, parseInt(event.page) || 1);
	const size = Math.min(50, Math.max(1, parseInt(event.size) || 20));

	let where = { enabled: true };
	if (category) where.category = category;

	const col = db.collection(FRAMES);
	const [listRes, countRes] = await Promise.all([
		col.where(where)
			.orderBy('sort', 'desc')
			.orderBy('create_date', 'desc')
			.skip((page - 1) * size)
			.limit(size)
			.field({ name: true, category: true, thumbUrl: true, frameUrl: true, photoArea: true, useCount: true })
			.get(),
		col.where(where).count()
	]);

	const rows = await resolveUrls(listRes.data || []);
	return ok({ list: rows, total: countRes.total, page, size });
}

/* ================= 用户端：单个模板 ================= */
async function getOne(event) {
	const id = event.id;
	if (!id) return fail('缺少模板 ID');
	const res = await db.collection(FRAMES).doc(id).get();
	const row = res.data && res.data[0];
	if (!row) return fail('模板不存在');
	if (row.enabled === false) return fail('模板已下架');
	const [r] = await resolveUrls([row]);
	return ok({ frame: r });
}

/* ================= 用户端：使用次数 +1（best-effort） ================= */
async function incUse(event) {
	const id = event.id;
	if (!id) return fail('缺少模板 ID');
	try {
		await db.collection(FRAMES).doc(id).update({ useCount: db.command.inc(1) });
	} catch (e) {}
	return ok({});
}

/* ================= 管理端路由（role 门控） ================= */
async function adminRouter(action, event) {
	const { userId, userRole } = event;
	if (!userId || !userRole || !['s_admin', 'admin'].includes(userRole)) {
		return fail('无管理员权限');
	}
	switch (action) {
		case 'adminList': return await adminList(event);
		case 'add':       return await add(event);
		case 'update':    return await update(event);
		case 'delete':    return await del(event);
		case 'toggle':    return await toggle(event);
	}
}

async function adminList(event) {
	const category = String(event.category || '').trim();
	const page = Math.max(1, parseInt(event.page) || 1);
	const size = Math.min(50, Math.max(1, parseInt(event.size) || 20));
	let where = {};
	if (category) where.category = category;
	const col = db.collection(FRAMES);
	const [listRes, countRes] = await Promise.all([
		col.where(where).orderBy('sort', 'desc').orderBy('create_date', 'desc')
			.skip((page - 1) * size).limit(size).get(),
		col.where(where).count()
	]);
	const rows = await resolveUrls(listRes.data || []);
	return ok({ list: rows, total: countRes.total });
}

async function add(event) {
	const d = event.data || {};
	const name = String(d.name || '').trim();
	const frameUrl = String(d.frameUrl || '').trim();
	if (!name) return fail('模板名称不能为空');
	if (!frameUrl) return fail('相框图片不能为空');
	const t = now();
	const row = {
		name,
		category: String(d.category || 'daily').trim(),
		frameUrl,
		thumbUrl: String(d.thumbUrl || '').trim() || frameUrl,
		photoArea: normalizeArea(d.photoArea),
		sort: parseInt(d.sort) || 0,
		enabled: d.enabled !== false,
		useCount: 0,
		create_date: t,
		update_date: t,
		creator_user_id: event.userId || ''
	};
	const res = await db.collection(FRAMES).add(row);
	return ok({ _id: res.id }, '已添加');
}

async function update(event) {
	const d = event.data || {};
	const id = d._id || d.id;
	if (!id) return fail('缺少 ID');
	const patch = { update_date: now() };
	if (d.name !== undefined) patch.name = String(d.name).trim();
	if (d.category !== undefined) patch.category = String(d.category).trim();
	if (d.frameUrl !== undefined) patch.frameUrl = String(d.frameUrl).trim();
	if (d.thumbUrl !== undefined) patch.thumbUrl = String(d.thumbUrl).trim();
	if (d.photoArea !== undefined) patch.photoArea = normalizeArea(d.photoArea);
	if (d.sort !== undefined) patch.sort = parseInt(d.sort) || 0;
	if (d.enabled !== undefined) patch.enabled = !!d.enabled;
	await db.collection(FRAMES).doc(id).update(patch);
	return ok({}, '已修改');
}

// 删除：先删云存储文件，再删数据库记录（避免存储泄漏）
async function del(event) {
	const id = event.data && (event.data._id || event.data.id);
	if (!id) return fail('缺少 ID');
	let doc;
	try { doc = await db.collection(FRAMES).doc(id).get(); } catch (e) { doc = null; }
	const row = doc && doc.data && doc.data[0];
	if (!row) return fail('模板不存在');

	const fileList = [row.frameUrl, row.thumbUrl]
		.filter(Boolean)
		.filter(u => /^cloud:\/\//.test(u));
	if (fileList.length) {
		try { await uniCloud.deleteFile({ fileList }); } catch (e) {}
	}
	await db.collection(FRAMES).doc(id).remove();
	return ok({}, '已删除');
}

async function toggle(event) {
	const d = event.data || {};
	const id = d._id || d.id;
	if (!id) return fail('缺少 ID');
	await db.collection(FRAMES).doc(id).update({
		enabled: !!d.enabled,
		update_date: now()
	});
	return ok({}, d.enabled ? '已启用' : '已禁用');
}
