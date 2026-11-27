'use strict';
/**
 * 物料互换 exchange 云函数
 * A 发布「物料 + 互换数量 N」生成物料码；B 凭码填「昵称 + 数量 + 备注」申请；
 * A 在申请列表里管理（改数量 / 删除 / 标记已互换 / 添加仅自己可见的备注）。
 * B 申请后可继续修改自己的备注（待处理状态下）；A 也可自行补录申请（线下代客登记）。
 * 核心约束：申请人数 ≤ N、总份数 ≤ N。用条件原子自增防超卖（不依赖事务）。
 * 返回统一格式：{ code, msg, data }，code=0 成功。
 */
const db = uniCloud.database();
const dbCmd = db.command;

const LISTING = 'exchange_listing';
const APPLY = 'exchange_apply';

// 申请状态
const AP_PENDING = 0; // 待处理
const AP_CONFIRMED = 1; // 已互换
const AP_DELETED = 2; // 已删除
// 发布单状态
const LS_ACTIVE = 1; // 进行中
const LS_FULL = 2; // 已满
const LS_CLOSED = 3; // 已关闭
const LS_EXPIRED = 4; // 已过期
const LS_DELETED = 5; // 已删除

// 物料码字符集（去掉易混淆 0/O/1/I）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LEN = 8;
function genCode() {
	let code = '';
	for (let i = 0; i < CODE_LEN; i++) {
		code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
	}
	return code;
}

function now() {
	return Date.now();
}

exports.main = async (event, context) => {
	const { action, userId } = event;
	try {
		switch (action) {
			// 发布侧
			case 'createListing':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await createListing(userId, event);
			case 'getMyListings':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await getMyListings(userId);
			case 'getListingForManage':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await getListingForManage(event.listingId, userId);
			case 'deleteListing':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await deleteListing(event.listingId, userId);
			case 'restoreListing':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await restoreListing(event.listingId, userId);
			case 'updateListing':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await updateListing(event.listingId, userId, event);
			// 申请侧
			case 'getListingByCode':
				return await getListingByCode((event.code || '').trim().toUpperCase(), userId);
			case 'applyExchange':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await applyExchange(userId, event);
			case 'getMyApplies':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await getMyApplies(userId);
			case 'cancelApply':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await softDeleteApply(event.applyId, userId, true);
			case 'updateApplyRemark':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await updateApplyRemark(event.applyId, userId, event.remark);
			// A 管理申请
			case 'updateApplyQty':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await updateApplyQty(event.applyId, userId, event.qty);
			case 'deleteApply':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await softDeleteApply(event.applyId, userId, false);
			case 'ownerAddApply':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await ownerAddApply(userId, event);
			case 'confirmApply':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await confirmApply(event.applyId, userId);
			case 'setApplyNote':
				if (!userId) return { code: -1, msg: '请先登录' };
				return await setApplyNote(event.applyId, userId, event.note);
			default:
				return { code: -1, msg: '未知操作: ' + action };
		}
	} catch (err) {
		console.error('exchange 错误:', err);
		return { code: -1, msg: err.message || '服务器错误' };
	}
};

/* ============ 发布 ============ */
async function createListing(userId, event) {
	const name = String(event.name || '').trim();
	const image = String(event.image || '').trim();
	const remark = String(event.remark || '').trim().slice(0, 200);
	const allowFree = event.allowFree !== false; // 默认允许伸手，兼容旧客户端不传
	const totalQty = parseInt(event.totalQty);
	let expireDays = parseInt(event.expireDays);

	if (!name) return { code: -1, msg: '请填写物料名称' };
	if (name.length > 40) return { code: -1, msg: '名称最多 40 字' };
	if (!(totalQty >= 1)) return { code: -1, msg: '互换数量至少 1' };
	if (totalQty > 999) return { code: -1, msg: '互换数量过大' };
	if (!(expireDays >= 1)) expireDays = 7;
	if (expireDays > 90) expireDays = 90;

	// 生成唯一码（最多重试 10 次；已取消的旧单也占码，避免同码多单）
	let code = '';
	for (let i = 0; i < 10; i++) {
		const c = genCode();
		const exist = await db.collection(LISTING).where({ code: c }).count();
		if (exist.total === 0) { code = c; break; }
	}
	if (!code) return { code: -1, msg: '物料码生成失败，请重试' };

	const t = now();
	const addRes = await db.collection(LISTING).add({
		user_id: userId,
		code,
		name,
		image,
		total_qty: totalQty,
		used_qty: 0,
		applicant_cnt: 0,
		remark,
		allow_free: allowFree,
		expire_at: t + expireDays * 24 * 60 * 60 * 1000,
		status: LS_ACTIVE,
		create_date: t,
		update_date: t
	});
	return { code: 0, msg: 'ok', data: { listingId: addRes.id, code } };
}

async function getMyListings(userId) {
	// 顺带把过期但未标记的发布单刷新一下
	await autoExpireByUser(userId);
	// 含已取消（软删）的单，便于发布者恢复/再次编辑
	const res = await db.collection(LISTING)
		.where({ user_id: userId })
		.orderBy('create_date', 'desc')
		.limit(100)
		.get();
	const list = (res.data || []).map(item => {
		const expired = item.expire_at && item.expire_at < now();
		let showStatus = item.status;
		if (expired && (item.status === LS_ACTIVE || item.status === LS_FULL)) showStatus = LS_EXPIRED;
		return {
			_id: item._id,
			code: item.code,
			name: item.name,
			image: item.image || '',
			total_qty: item.total_qty,
			used_qty: item.used_qty || 0,
			applicant_cnt: item.applicant_cnt || 0,
			status: showStatus,
			create_date: item.create_date
		};
	});
	return { code: 0, msg: 'ok', data: { list } };
}

// A 的申请列表（管理页）
async function getListingForManage(listingId, userId) {
	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return { code: -1, msg: '发布单不存在' };
	if (listing.user_id !== userId) return { code: -1, msg: '无权查看该发布单' };
	// 已取消的单也允许进管理页（可恢复）

	const aRes = await db.collection(APPLY)
		.where({ listing_id: listingId, status: dbCmd.in([AP_PENDING, AP_CONFIRMED]) })
		.orderBy('applied_at', 'asc')
		.limit(200)
		.get();
	const applies = (aRes.data || []).map(a => ({
		_id: a._id,
		applicant_id: a.applicant_id,
		nickname: a.nickname,
		qty: a.qty,
		remark: a.remark || '',
		owner_note: a.owner_note || '', // 仅发布者可见，只在管理接口返回
		source: a.source || 'user', // owner = 发布者自行补录
		offer_item: a.offer_item || '',
		status: a.status,
		applied_at: a.applied_at
	}));

	const expired = listing.expire_at && listing.expire_at < now();
	let showStatus = listing.status;
	if (expired && (listing.status === LS_ACTIVE || listing.status === LS_FULL)) showStatus = LS_EXPIRED;

	return {
		code: 0,
		msg: 'ok',
		data: {
			listing: {
				_id: listing._id,
				code: listing.code,
				name: listing.name,
				image: listing.image || '',
				total_qty: listing.total_qty,
				used_qty: listing.used_qty || 0,
				applicant_cnt: listing.applicant_cnt || 0,
				remark: listing.remark || '',
				allow_free: listing.allow_free !== false,
				status: showStatus,
				expire_at: listing.expire_at
			},
			applies
		}
	};
}

async function deleteListing(listingId, userId) {
	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return { code: -1, msg: '发布单不存在' };
	if (listing.user_id !== userId) return { code: -1, msg: '无权删除该发布单' };
	if (listing.status === LS_DELETED) return { code: 0, msg: '已是取消状态', data: {} };

	await db.collection(LISTING).doc(listingId).update({ status: LS_DELETED, update_date: now() });
	// 软删其下所有有效申请：逐条记录原状态，供恢复时还原
	const aRes = await db.collection(APPLY)
		.where({ listing_id: listingId, status: dbCmd.in([AP_PENDING, AP_CONFIRMED]) })
		.limit(200).get();
	const t = now();
	for (const a of (aRes.data || [])) {
		await db.collection(APPLY).doc(a._id).update({
			status: AP_DELETED, deleted_at: t,
			prev_status: a.status, cancel_reason: 'listing_cancelled'
		});
	}
	return { code: 0, msg: '已取消', data: {} };
}

// A 恢复已取消的发布单：连同被联动取消的申请一并还原
async function restoreListing(listingId, userId) {
	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return { code: -1, msg: '发布单不存在' };
	if (listing.user_id !== userId) return { code: -1, msg: '无权操作该发布单' };
	if (listing.status !== LS_DELETED) return { code: 0, msg: '无需恢复', data: {} };

	const aRes = await db.collection(APPLY)
		.where({ listing_id: listingId, status: AP_DELETED, cancel_reason: 'listing_cancelled' })
		.limit(200).get();
	for (const a of (aRes.data || [])) {
		await db.collection(APPLY).doc(a._id).update({
			status: a.prev_status === AP_CONFIRMED ? AP_CONFIRMED : AP_PENDING,
			cancel_reason: '', prev_status: ''
		});
	}

	const expired = listing.expire_at && listing.expire_at < now();
	const used = listing.used_qty || 0;
	let target = used >= listing.total_qty ? LS_FULL : LS_ACTIVE;
	if (expired) target = LS_EXPIRED;
	await db.collection(LISTING).doc(listingId).update({ status: target, update_date: now() });
	return { code: 0, msg: '已恢复', data: { status: target } };
}

// A 编辑发布内容（已取消的先恢复后再编辑）
async function updateListing(listingId, userId, event) {
	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return { code: -1, msg: '发布单不存在' };
	if (listing.user_id !== userId) return { code: -1, msg: '无权编辑该发布单' };
	if (listing.status === LS_DELETED) return { code: -1, msg: '发布已取消，请先恢复后再编辑' };

	const upd = {};
	if (event.name !== undefined) {
		const name = String(event.name).trim();
		if (!name) return { code: -1, msg: '请填写物料名称' };
		if (name.length > 40) return { code: -1, msg: '名称最多 40 字' };
		upd.name = name;
	}
	if (event.image !== undefined) upd.image = String(event.image).trim();
	if (event.remark !== undefined) upd.remark = String(event.remark).trim().slice(0, 200);
	if (event.allowFree !== undefined) upd.allow_free = event.allowFree !== false;
	if (event.totalQty !== undefined) {
		const tq = parseInt(event.totalQty);
		if (!(tq >= 1)) return { code: -1, msg: '互换数量至少 1' };
		if (tq > 999) return { code: -1, msg: '互换数量过大' };
		if (tq < (listing.used_qty || 0)) return { code: -1, msg: `不能小于已分配的 ${listing.used_qty} 份` };
		upd.total_qty = tq;
	}
	if (Object.keys(upd).length === 0) return { code: 0, msg: '无修改', data: {} };
	upd.update_date = now();
	await db.collection(LISTING).doc(listingId).update(upd);
	// 总量调整后刷新满员/进行中原状
	await refreshFullStatus(listingId);
	return { code: 0, msg: '已保存', data: {} };
}

/* ============ 申请 ============ */
// B 凭码查询（公开信息 + 剩余名额 + 是否已申请）
async function getListingByCode(code, userId) {
	if (!code) return { code: -1, msg: '请输入物料码' };
	// 不排除已取消单：让申请者能看到「已取消」提示
	const res = await db.collection(LISTING).where({ code }).limit(1).get();
	const listing = res.data && res.data[0];
	if (!listing) return { code: -1, msg: '物料码无效' };

	const expired = listing.expire_at && listing.expire_at < now();
	let showStatus = listing.status;
	if (expired && (listing.status === LS_ACTIVE || listing.status === LS_FULL)) showStatus = LS_EXPIRED;

	const remaining = Math.max(0, listing.total_qty - (listing.used_qty || 0));

	let myApply = null;
	if (userId) {
		const mRes = await db.collection(APPLY)
			.where({ listing_id: listing._id, applicant_id: userId, status: dbCmd.in([AP_PENDING, AP_CONFIRMED]) })
			.limit(1).get();
		let m = mRes.data && mRes.data[0];
		let applyCancelled = false;
		// 发布单已取消：取被联动取消的申请，向本人提示「已取消」
		if (!m && listing.status === LS_DELETED) {
			const cRes = await db.collection(APPLY)
				.where({ listing_id: listing._id, applicant_id: userId, status: AP_DELETED, cancel_reason: 'listing_cancelled' })
				.orderBy('deleted_at', 'desc').limit(1).get();
			m = cRes.data && cRes.data[0];
			if (m) applyCancelled = true;
		}
		if (m) {
			myApply = { _id: m._id, qty: m.qty, status: applyCancelled ? 2 : m.status, nickname: m.nickname, remark: m.remark || '', offer_item: m.offer_item || '' };
		}
	}

	return {
		code: 0,
		msg: 'ok',
		data: {
			isOwner: !!userId && listing.user_id === userId,
			listing: {
				_id: listing._id,
				code: listing.code,
				name: listing.name,
				image: listing.image || '',
				total_qty: listing.total_qty,
				used_qty: listing.used_qty || 0,
				remaining,
				remark: listing.remark || '',
				allow_free: listing.allow_free !== false, // 旧数据无此字段视为允许
				status: showStatus,
				expire_at: listing.expire_at
			},
			myApply
		}
	};
}

// 防超卖核心：条件原子自增
async function applyExchange(userId, event) {
	const code = (event.code || '').trim().toUpperCase();
	const nickname = String(event.nickname || '').trim().slice(0, 20);
	const remark = String(event.remark || '').trim().slice(0, 100);
	const offerItem = String(event.offerItem || '').trim().slice(0, 100);
	const qty = Math.max(1, parseInt(event.qty) || 1);

	if (!code) return { code: -1, msg: '请输入物料码' };
	if (!nickname) return { code: -1, msg: '请填写昵称' };

	const res = await db.collection(LISTING).where({ code, status: dbCmd.neq(LS_DELETED) }).limit(1).get();
	const listing = res.data && res.data[0];
	if (!listing) return { code: -1, msg: '物料码无效或已被删除' };
	if (listing.user_id === userId) return { code: -1, msg: '不能申请自己发布的互换' };
	if (listing.expire_at && listing.expire_at < now()) return { code: -1, msg: '该互换已过期' };
	if (listing.status === LS_CLOSED) return { code: -1, msg: '该互换已结束' };

	// 幂等：已有效申请则拒绝
	const exist = await db.collection(APPLY)
		.where({ listing_id: listing._id, applicant_id: userId, status: dbCmd.in([AP_PENDING, AP_CONFIRMED]) })
		.count();
	if (exist.total > 0) return { code: -1, msg: '你已申请过，如需修改请先取消' };

	// 不允许伸手：必须填写用于互换的物料
	if (listing.allow_free === false && !offerItem) return { code: -1, msg: '对方不接受伸手，请填写用于互换的物料' };

	// 条件原子自增：仅当 used_qty + qty <= total 才命中
	const cap = listing.total_qty - qty;
	if (cap < 0) return { code: -1, msg: '申请份数超过总名额' };
	const upd = await db.collection(LISTING)
		.where({ _id: listing._id, used_qty: dbCmd.lte(cap) })
		.update({ used_qty: dbCmd.inc(qty), applicant_cnt: dbCmd.inc(1), update_date: now() });
	if (!upd || upd.updated === 0) {
		const remain = Math.max(0, listing.total_qty - (listing.used_qty || 0));
		return { code: -1, msg: remain > 0 ? `名额不足，仅剩 ${remain} 份` : '名额已满' };
	}

	// 写申请记录
	const t = now();
	let addRes;
	try {
		addRes = await db.collection(APPLY).add({
			listing_id: listing._id,
			owner_id: listing.user_id,
			applicant_id: userId,
			nickname,
			qty,
			remark,
			offer_item: offerItem,
			status: AP_PENDING,
			applied_at: t
		});
	} catch (e) {
		// 写申请失败，回滚名额
		await db.collection(LISTING).where({ _id: listing._id })
			.update({ used_qty: dbCmd.inc(-qty), applicant_cnt: dbCmd.inc(-1), update_date: now() });
		throw e;
	}

	// 刷新满员状态
	await refreshFullStatus(listing._id);
	return { code: 0, msg: '申请成功', data: { applyId: addRes.id } };
}

// A（发布者）自行补录一条申请：线下换物时代客登记，不关联申请人账号
async function ownerAddApply(userId, event) {
	const listingId = String(event.listingId || '').trim();
	const nickname = String(event.nickname || '').trim().slice(0, 20);
	const remark = String(event.remark || '').trim().slice(0, 100);
	const note = String(event.note || '').trim().slice(0, 100); // 发布者私密备注
	const offerItem = String(event.offerItem || '').trim().slice(0, 100);
	const qty = Math.max(1, parseInt(event.qty) || 1);

	if (!listingId) return { code: -1, msg: '缺少发布单' };
	if (!nickname) return { code: -1, msg: '请填写对方昵称' };

	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing || listing.status === LS_DELETED) return { code: -1, msg: '发布单不存在' };
	if (listing.user_id !== userId) return { code: -1, msg: '无权操作该发布单' };

	// 防超卖：与 applyExchange 同样的条件原子自增
	const cap = listing.total_qty - qty;
	if (cap < 0) return { code: -1, msg: '数量超过总名额' };
	const upd = await db.collection(LISTING)
		.where({ _id: listing._id, used_qty: dbCmd.lte(cap) })
		.update({ used_qty: dbCmd.inc(qty), applicant_cnt: dbCmd.inc(1), update_date: now() });
	if (!upd || upd.updated === 0) {
		const remain = Math.max(0, listing.total_qty - (listing.used_qty || 0));
		return { code: -1, msg: remain > 0 ? `名额不足，仅剩 ${remain} 份` : '名额已满' };
	}

	const t = now();
	let addRes;
	try {
		addRes = await db.collection(APPLY).add({
			listing_id: listing._id,
			owner_id: userId,
			applicant_id: '', // 补录记录无申请人账号
			source: 'owner',
			nickname,
			qty,
			remark,
			owner_note: note,
			offer_item: offerItem,
			status: AP_PENDING,
			applied_at: t
		});
	} catch (e) {
		// 写申请失败，回滚名额
		await db.collection(LISTING).where({ _id: listing._id })
			.update({ used_qty: dbCmd.inc(-qty), applicant_cnt: dbCmd.inc(-1), update_date: now() });
		throw e;
	}

	await refreshFullStatus(listing._id);
	return { code: 0, msg: '已添加申请', data: { applyId: addRes.id } };
}

async function getMyApplies(userId) {
	// 除有效申请外，一并取回因发布取消而被联动取消的申请（用于展示「已取消」）
	const aRes = await db.collection(APPLY)
		.where(dbCmd.or([
			{ applicant_id: userId, status: dbCmd.in([AP_PENDING, AP_CONFIRMED]) },
			{ applicant_id: userId, status: AP_DELETED, cancel_reason: 'listing_cancelled' }
		]))
		.orderBy('applied_at', 'desc')
		.limit(100)
		.get();
	const applies = aRes.data || [];
	// 关联发布单名称
	const ids = applies.map(a => a.listing_id).filter(Boolean);
	const nameMap = {};
	if (ids.length) {
		const lRes = await db.collection(LISTING).where({ _id: dbCmd.in(ids) }).get();
		(lRes.data || []).forEach(l => { nameMap[l._id] = { name: l.name, code: l.code, owner: l.user_id }; });
	}
	const list = applies.map(a => ({
		_id: a._id,
		listing_id: a.listing_id,
		nickname: a.nickname,
		qty: a.qty,
		status: a.status === AP_DELETED ? 2 : a.status, // 2 = 已取消（发布方取消联动）
		applied_at: a.applied_at,
		listingName: (nameMap[a.listing_id] && nameMap[a.listing_id].name) || '（发布单已删除）',
		listingCode: (nameMap[a.listing_id] && nameMap[a.listing_id].code) || ''
	}));
	return { code: 0, msg: 'ok', data: { list } };
}

/* ============ A 管理申请 ============ */
async function updateApplyQty(applyId, ownerId, newQty) {
	newQty = parseInt(newQty);
	if (!(newQty >= 1)) return { code: -1, msg: '份数至少 1，如需取消请删除申请' };

	const aRes = await db.collection(APPLY).doc(applyId).get();
	const apply = aRes.data && aRes.data[0];
	if (!apply || apply.status === AP_DELETED) return { code: -1, msg: '申请不存在' };
	if (apply.owner_id !== ownerId) return { code: -1, msg: '无权修改该申请' };
	if (apply.status === AP_CONFIRMED) return { code: -1, msg: '已互换的申请不能修改份数' };

	const lRes = await db.collection(LISTING).doc(apply.listing_id).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return { code: -1, msg: '发布单不存在' };

	const delta = newQty - apply.qty;
	if (delta === 0) return { code: 0, msg: 'ok', data: {} };
	const newUsed = (listing.used_qty || 0) + delta;
	if (newUsed > listing.total_qty) {
		const room = listing.total_qty - (listing.used_qty || 0);
		return { code: -1, msg: `超出总额，最多还能加 ${Math.max(0, room)} 份` };
	}

	// 条件原子：增大时校验 used_qty <= total - delta
	if (delta > 0) {
		const cap = listing.total_qty - delta;
		const upd = await db.collection(LISTING)
			.where({ _id: listing._id, used_qty: dbCmd.lte(cap) })
			.update({ used_qty: dbCmd.inc(delta), update_date: now() });
		if (!upd || upd.updated === 0) return { code: -1, msg: '名额不足，无法增加份数' };
	} else {
		await db.collection(LISTING).doc(listing._id)
			.update({ used_qty: dbCmd.inc(delta), update_date: now() });
	}
	await db.collection(APPLY).doc(applyId).update({ qty: newQty });
	await refreshFullStatus(listing._id);
	return { code: 0, msg: '已调整份数', data: { qty: newQty } };
}

// A 删除 / B 取消：均由 softDeleteApply 处理
async function softDeleteApply(applyId, userId, byApplicant) {
	const aRes = await db.collection(APPLY).doc(applyId).get();
	const apply = aRes.data && aRes.data[0];
	if (!apply || apply.status === AP_DELETED) return { code: -1, msg: '申请不存在' };
	if (byApplicant) {
		if (apply.applicant_id !== userId) return { code: -1, msg: '无权取消该申请' };
	} else {
		if (apply.owner_id !== userId) return { code: -1, msg: '无权删除该申请' };
	}

	await db.collection(APPLY).doc(applyId).update({ status: AP_DELETED, deleted_at: now() });
	// 释放名额
	await db.collection(LISTING).doc(apply.listing_id)
		.update({
			used_qty: dbCmd.inc(-apply.qty),
			applicant_cnt: dbCmd.inc(-1),
			update_date: now()
		});
	await refreshFullStatus(apply.listing_id);
	return { code: 0, msg: byApplicant ? '已取消申请' : '已删除申请', data: {} };
}

async function confirmApply(applyId, ownerId) {
	const aRes = await db.collection(APPLY).doc(applyId).get();
	const apply = aRes.data && aRes.data[0];
	if (!apply || apply.status === AP_DELETED) return { code: -1, msg: '申请不存在' };
	if (apply.owner_id !== ownerId) return { code: -1, msg: '无权操作该申请' };
	if (apply.status === AP_CONFIRMED) return { code: 0, msg: '已是已互换状态', data: {} };

	await db.collection(APPLY).doc(applyId).update({ status: AP_CONFIRMED, confirmed_at: now() });
	return { code: 0, msg: '已标记互换', data: {} };
}

// B 申请后修改自己的备注（仅待处理状态可改）
async function updateApplyRemark(applyId, userId, remark) {
	remark = String(remark || '').trim().slice(0, 100);
	const aRes = await db.collection(APPLY).doc(applyId).get();
	const apply = aRes.data && aRes.data[0];
	if (!apply || apply.status === AP_DELETED) return { code: -1, msg: '申请不存在' };
	if (apply.applicant_id !== userId) return { code: -1, msg: '无权修改该申请' };
	if (apply.status === AP_CONFIRMED) return { code: -1, msg: '已互换的申请不能修改备注' };

	await db.collection(APPLY).doc(applyId).update({ remark, remark_update_at: now() });
	return { code: 0, msg: '备注已保存', data: { remark } };
}

// A 给申请添加仅自己可见的备注（与申请者的 remark 相互独立）
async function setApplyNote(applyId, ownerId, note) {
	note = String(note || '').trim().slice(0, 100);
	const aRes = await db.collection(APPLY).doc(applyId).get();
	const apply = aRes.data && aRes.data[0];
	if (!apply || apply.status === AP_DELETED) return { code: -1, msg: '申请不存在' };
	if (apply.owner_id !== ownerId) return { code: -1, msg: '无权操作该申请' };

	await db.collection(APPLY).doc(applyId).update({ owner_note: note });
	return { code: 0, msg: '已保存', data: { owner_note: note } };
}

/* ============ 辅助 ============ */
// 根据当前 used/total 刷新满员/回退状态（不影响关闭/过期/删除）
async function refreshFullStatus(listingId) {
	const lRes = await db.collection(LISTING).doc(listingId).get();
	const listing = lRes.data && lRes.data[0];
	if (!listing) return;
	if (listing.status === LS_CLOSED || listing.status === LS_DELETED || listing.status === LS_EXPIRED) return;
	const used = listing.used_qty || 0;
	const target = used >= listing.total_qty ? LS_FULL : LS_ACTIVE;
	if (target !== listing.status) {
		await db.collection(LISTING).doc(listingId).update({ status: target });
	}
}

// 把某用户过期且仍进行中/已满的发布单标记为已过期
async function autoExpireByUser(userId) {
	const t = now();
	try {
		await db.collection(LISTING)
			.where({ user_id: userId, expire_at: dbCmd.lt(t), status: dbCmd.in([LS_ACTIVE, LS_FULL]) })
			.update({ status: LS_EXPIRED, update_date: t });
	} catch (e) {
		console.error('autoExpire 失败:', e);
	}
}
