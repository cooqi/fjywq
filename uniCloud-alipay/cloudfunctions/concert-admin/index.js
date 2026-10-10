'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

const AREA_COLLECTION = 'seat_area';
const SELECT_COLLECTION = 'seat_selection';
// 单场座位总量上限，避免配置出超大网格导致前端卡死
const MAX_TOTAL_SEATS = 5000;
// 单个排号/列号最长字符数
const MAX_LABEL_LEN = 8;

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

// 分页取全量（云函数传统 API 的 get() 有默认条数限制）
async function getAllByPage(collectionName, where, field, pageSize = 500, maxRounds = 40) {
	const out = [];
	let page = 0;
	
	while (page < maxRounds) {
		let query = db.collection(collectionName).where(where);
		if (field) query = query.field(field);
		const res = await query.skip(page * pageSize).limit(pageSize).get();
		const list = res.data || [];
		out.push(...list);
		if (list.length < pageSize) break;
		page++;
	}
	
	return out;
}

// 生成座位展示文本，如：A区3排5号（优先使用分区自定义编号数组）
function buildSeatLabel(area, row, col) {
	const r = rowLabelOf(area, row);
	const c = colLabelOf(area, col);
	const rText = /[排座]$/.test(r) ? r : `${r}排`;
	const cText = /[号座]$/.test(c) ? c : `${c}号`;
	
	return `${(area && area.name) || ''}${rText}${cText}`;
}

function rowLabelOf(area, row) {
	const arr = (area && area.rowLabels) || [];
	const text = arr[row - 1] == null ? '' : String(arr[row - 1]).trim();
	if (text) return text;
	
	return rowLabel(area, row);
}

function colLabelOf(area, col) {
	const arr = (area && area.colLabels) || [];
	const text = arr[col - 1] == null ? '' : String(arr[col - 1]).trim();
	if (text) return text;
	
	return String(col);
}

function rowLabel(area, row) {
	if (Number(area && area.rowLabelType) === 2) {
		// 字母排号：A,B,...,Z,AA,AB...
		let n = row - 1;
		let label = '';
		do {
			label = String.fromCharCode(65 + (n % 26)) + label;
			n = Math.floor(n / 26) - 1;
		} while (n >= 0);
		return label;
	}
	return String(row);
}

// 分区在画布上占多少格（舞台区用 stageW/stageH）
function areaExtent(area) {
	const isStage = !!area.isStage;
	const w = isStage ? (Number(area.stageW) || 0) : (Number(area.cols) || 0);
	const h = isStage ? (Number(area.stageH) || 0) : (Number(area.rows) || 0);
	
	return { w, h };
}

// 由所有分区包围盒计算画布尺寸（单位：格）
function computeCanvas(areas) {
	let canvasW = 0;
	let canvasH = 0;
	(areas || []).forEach(area => {
		const extent = areaExtent(area);
		canvasW = Math.max(canvasW, (Number(area.gridX) || 0) + extent.w);
		canvasH = Math.max(canvasH, (Number(area.gridY) || 0) + extent.h);
	});
	
	return { canvasW: Math.ceil(canvasW), canvasH: Math.ceil(canvasH) };
}

// 座位区之间重叠检测（舞台/装饰区不参与）
function findOverlaps(areas) {
	const blocks = (areas || [])
		.filter(area => !area.isStage)
		.map(area => ({
			name: area.name,
			x1: Number(area.gridX) || 0,
			y1: Number(area.gridY) || 0,
			x2: (Number(area.gridX) || 0) + area.cols,
			y2: (Number(area.gridY) || 0) + area.rows
		}));
	const pairs = [];
	
	for (let i = 0; i < blocks.length; i++) {
		for (let j = i + 1; j < blocks.length; j++) {
			const a = blocks[i];
			const b = blocks[j];
			if (a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2) {
				pairs.push(`${a.name}、${b.name}`);
			}
		}
	}
	
	return pairs;
}

// 坐标取值：非负、最多精确到 0.5 格
function normalizeGrid(value) {
	const num = Number(value);
	if (!isFinite(num) || num < 0) return 0;
	if (num > 999) return 999;
	
	return Math.round(num * 2) / 2;
}

// 编号数组校验：长度必须与排/列数一致，单个编号 ≤ 8 字符，允许留空
function normalizeLabelArray(input, count, labelName, sizeName, areaName) {
	if (input == null || (Array.isArray(input) && input.length === 0)) {
		return { list: [], error: '' };
	}
	if (!Array.isArray(input)) {
		return { list: [], error: `分区「${areaName}」${labelName}格式不正确` };
	}
	if (input.length !== count) {
		return { list: [], error: `分区「${areaName}」${labelName}数量（${input.length}）与${sizeName}（${count}）不一致` };
	}
	const list = [];
	
	for (let i = 0; i < input.length; i++) {
		const text = String(input[i] == null ? '' : input[i]).trim();
		if (text.length > MAX_LABEL_LEN) {
			return { list: [], error: `分区「${areaName}」第 ${i + 1} 个${labelName}超过 ${MAX_LABEL_LEN} 个字符` };
		}
		list.push(text);
	}
	
	return { list, error: '' };
}

// 编号生成规则清洗（仅用于管理端回显与重新生成）
const LABEL_TYPES = ['number', 'letter', 'chinese', 'custom'];

function normalizeLabelRulePart(part, fallbackStart) {
	const src = part && typeof part === 'object' ? part : {};
	const type = LABEL_TYPES.indexOf(src.type) > -1 ? src.type : 'number';
	const start = type === 'letter'
		? String(src.start == null ? 'A' : src.start).slice(0, 1)
		: (isFinite(Number(src.start)) ? Number(src.start) : fallbackStart);
	const stepRaw = Number(src.step);
	const step = isFinite(stepRaw) ? Math.min(Math.max(stepRaw, -20), 20) : 1;
	const padRaw = parseInt(src.pad);
	
	return {
		type,
		start,
		step,
		prefix: String(src.prefix == null ? '' : src.prefix).slice(0, 4),
		suffix: String(src.suffix == null ? '' : src.suffix).slice(0, 4),
		pad: isFinite(padRaw) ? Math.min(Math.max(padRaw, 0), 3) : 0
	};
}

function normalizeLabelRule(rule) {
	if (!rule || typeof rule !== 'object') return null;
	
	return {
		row: normalizeLabelRulePart(rule.row, 1),
		col: normalizeLabelRulePart(rule.col, 1)
	};
}

// 座位状态配色清洗：合法 #RRGGBB 采用自定义值，非法/缺省回填内置默认（始终存完整四键，避免空对象不清除旧值）
const SEAT_COLOR_KEYS = ['avail', 'selected', 'taken', 'mine'];
// 与选座页 seat-select.vue / 配置页 seat-config.vue 内置默认保持一致
const SEAT_COLOR_FALLBACK = { avail: '#dfe4ea', selected: '#b39ddb', taken: '#80deea', mine: '#ffd54f' };

function normalizeSeatColors(input) {
	const src = input && typeof input === 'object' ? input : {};
	const out = {};
	SEAT_COLOR_KEYS.forEach(key => {
		const v = String(src[key] == null ? '' : src[key]).trim();
		out[key] = /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : SEAT_COLOR_FALLBACK[key];
	});
	
	return out;
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
			return await deleteConcert(event);
		case 'getSeatConfig':
			return await getSeatConfig(event);
		case 'saveSeatConfig':
			return await saveSeatConfig(event);
		case 'getSeatSelections':
			return await getSeatSelections(event);
		case 'releaseSeats':
			return await releaseSeats(event);
		case 'setSeatEnabled':
			return await setSeatEnabled(event);
		default:
			return {
				code: -1,
				message: '未知的操作类型'
			};
	}
};

// 获取列表（支持分页、筛选、搜索）
async function getList(event) {
	try {
		const { type, keyword, page = 1, pageSize = 20 } = event;
		
		let query = {};
		
		// 类型筛选
		if (type && type !== 'all') {
			query.type = type;
		}
		
		// 关键词搜索
		if (keyword) {
			query.$or = [
				{ ychTheme: new RegExp(keyword, 'i') },
				{ yhcTheme: new RegExp(keyword, 'i') },
				{ address: new RegExp(keyword, 'i') },
				{ Session: new RegExp(keyword, 'i') }
			];
		}
		
		// 获取总数
		const countRes = await db.collection('Concert')
			.where(query)
			.count();
		
		// 获取列表数据
		const listRes = await db.collection('Concert')
			.where(query)
			.orderBy('time', 'desc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get();
		
		return {
			code: 0,
			message: '获取成功',
			data: {
				list: listRes.data,
				total: countRes.total,
				page,
				pageSize
			}
		};
	} catch (err) {
		return {
			code: -1,
			message: '获取失败：' + err.message
		};
	}
}

// 添加
async function add(event) {
	try {
		const { data } = event;
		
		// 验证必填字段
		if (!data.type) {
			return {
				code: -1,
				message: '请选择类型'
			};
		}
		
		const res = await db.collection('Concert').add({
			type: data.type,
			ychTheme: data.ychTheme || '',
			yhcTheme: data.yhcTheme || '',
			Session: data.Session || '',
			time: data.time || '',
			address: data.address || '',
			playlist: data.playlist || '',
			bz: data.bz || '',
            Province: data.Province || '',
			img: data.img || '',
			seat_enabled: false,
			max_seats_per_user: 6,
			seat_version: 1,
			createTime: Date.now()
		});
		
		return {
			code: 0,
			message: '添加成功',
			data: res
		};
	} catch (err) {
		return {
			code: -1,
			message: '添加失败：' + err.message
		};
	}
}

// 更新
async function update(event) {
	try {
		const { data } = event;
		
		if (!data._id) {
			return {
				code: -1,
				message: '缺少ID'
			};
		}
		
		// 验证必填字段
		if (!data.type) {
			return {
				code: -1,
				message: '请选择类型'
			};
		}
		
		const res = await db.collection('Concert')
			.doc(data._id)
			.update({
				type: data.type,
				ychTheme: data.ychTheme || '',
				yhcTheme: data.yhcTheme || '',
				Session: data.Session || '',
				time: data.time || '',
				address: data.address || '',
				playlist: data.playlist || '',
				bz: data.bz || '',
				Province: data.Province || '',
				img: data.img || '',
				updateTime: Date.now()
			});
		
		return {
			code: 0,
			message: '更新成功',
			data: res
		};
	} catch (err) {
		return {
			code: -1,
			message: '更新失败：' + err.message
		};
	}
}

// 删除
async function deleteConcert(event) {
	try {
		const { id } = event;
		
		if (!id) {
			return {
				code: -1,
				message: '缺少ID'
			};
		}
		
		// 检查是否有关联的用户记录
		const relatedCount = await db.collection('myConcert')
			.where({ ConcertId: id })
			.count();
		
		if (relatedCount.total > 0) {
			return {
				code: -1,
				message: `该演唱会已有 ${relatedCount.total} 条用户记录，无法删除`
			};
		}
		
		// 已有选座记录时禁止删除，避免座位记录变成孤立数据
		const seatCount = await db.collection(SELECT_COLLECTION)
			.where({ concertId: id })
			.count();
		
		if (seatCount.total > 0) {
			return {
				code: -1,
				message: `该演唱会已有 ${seatCount.total} 条选座记录，请先在座位表里释放座位后再删除`
			};
		}
		
		const res = await db.collection('Concert')
			.doc(id)
			.remove();
		
		return {
			code: 0,
			message: '删除成功',
			data: res
		};
	} catch (err) {
		return {
			code: -1,
			message: '删除失败：' + err.message
		};
	}
}

// ========== 选座功能 ==========

// 读取座位配置（管理员配置页使用）
async function getSeatConfig(event) {
	try {
		const { concertId } = event;
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		const concertRes = await db.collection('Concert').doc(concertId).get();
		const concert = concertRes.data && concertRes.data[0];
		if (!concert) {
			return { code: -1, message: '演唱会不存在' };
		}
		
		const areas = await getAllByPage(AREA_COLLECTION, { concertId });
		areas.sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0));
		
		const areaList = areas.map(item => {
			const isStage = !!item.isStage;
			const rows = Number(item.rows) || 0;
			const cols = Number(item.cols) || 0;
			
			return {
				_id: item._id,
				name: item.name,
				rows,
				cols,
				rowLabelType: Number(item.rowLabelType) || 1,
				price: Number(item.price) || 0,
				color: item.color || '#4A90D9',
				sort: Number(item.sort) || 0,
				gridX: Number(item.gridX) || 0,
				gridY: Number(item.gridY) || 0,
				isStage,
				stageW: Number(item.stageW) || (isStage ? cols : 0),
				stageH: Number(item.stageH) || (isStage ? rows : 0),
				rowLabels: Array.isArray(item.rowLabels) ? item.rowLabels : [],
				colLabels: Array.isArray(item.colLabels) ? item.colLabels : [],
				labelRule: item.labelRule || null,
				totalSeats: isStage ? 0 : rows * cols
			};
		});
		const canvas = computeCanvas(areaList);
		const capacity = areaList.reduce((sum, item) => sum + item.totalSeats, 0);
		
		const countRes = await db.collection(SELECT_COLLECTION).where({ concertId }).count();
		
		return {
			code: 0,
			message: '获取成功',
			data: {
				concert: {
					_id: concert._id,
					type: concert.type || '',
					title: concert.ychTheme || concert.Session || concert.time || '未命名场次',
					venue: concert.yhcTheme || '',
					time: concert.time || '',
					seat_enabled: !!concert.seat_enabled,
					max_seats_per_user: Number(concert.max_seats_per_user) || 0,
					seat_version: Number(concert.seat_version) || 1,
					seat_colors: concert.seat_colors || {}
				},
				areas: areaList,
				canvasW: canvas.canvasW,
				canvasH: canvas.canvasH,
				capacity,
				selectionCount: countRes.total || 0
			}
		};
	} catch (err) {
		return { code: -1, message: '获取座位配置失败：' + err.message };
	}
}

// 保存座位配置（仅管理员）
async function saveSeatConfig(event) {
	try {
		const { concertId, areas = [], maxSeatsPerUser = 6, force = false, userId } = event;
		
		if (!(await isAdminUser(userId))) {
			console.warn('非管理员尝试保存座位表:', userId, concertId);
			return { code: 403, message: '无管理员权限' };
		}
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		const concertRes = await db.collection('Concert').doc(concertId).get();
		const concert = concertRes.data && concertRes.data[0];
		if (!concert) {
			return { code: -1, message: '演唱会不存在' };
		}
		
		// 入参校验（含画布坐标、舞台/装饰区、自定义编号）
		const normalized = [];
		const nameSet = {};
		for (let i = 0; i < areas.length; i++) {
			const item = areas[i] || {};
			const name = String(item.name || '').trim();
			const isStage = !!item.isStage;
			const rows = parseInt(item.rows);
			const cols = parseInt(item.cols);
			const price = Number(item.price);
			const color = String(item.color || '').trim();
			
			if (!name) {
				return { code: -1, message: `第${i + 1}个分区未填写名称` };
			}
			if (nameSet[name]) {
				return { code: -1, message: `分区名称「${name}」重复` };
			}
			nameSet[name] = true;
			
			let areaRows = rows;
			let areaCols = cols;
			let stageW = 0;
			let stageH = 0;
			
			if (isStage) {
				// 舞台/装饰区不渲染座位，rows/cols 与 stageW/stageH 保持一致以兼容必填校验
				stageW = Math.min(Math.max(Number(item.stageW) || 10, 1), 200);
				stageH = Math.min(Math.max(Number(item.stageH) || 2, 1), 200);
				areaCols = stageW;
				areaRows = stageH;
			} else {
				if (!(rows >= 1 && rows <= 100)) {
					return { code: -1, message: `分区「${name}」排数需在 1-100 之间` };
				}
				if (!(cols >= 1 && cols <= 100)) {
					return { code: -1, message: `分区「${name}」列数需在 1-100 之间` };
				}
			}
			
			const rowLabelsRes = isStage
				? { list: [], error: '' }
				: normalizeLabelArray(item.rowLabels, areaRows, '排号', '排数', name);
			if (rowLabelsRes.error) {
				return { code: -1, message: rowLabelsRes.error };
			}
			const colLabelsRes = isStage
				? { list: [], error: '' }
				: normalizeLabelArray(item.colLabels, areaCols, '列号', '列数', name);
			if (colLabelsRes.error) {
				return { code: -1, message: colLabelsRes.error };
			}
			
			normalized.push({
				_id: item._id || '',
				name,
				rows: areaRows,
				cols: areaCols,
				rowLabelType: Number(item.rowLabelType) === 2 ? 2 : 1,
				price: isStage ? 0 : (price > 0 ? price : 0),
				color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#4A90D9',
				sort: Number(item.sort) >= 0 ? Number(item.sort) : i,
				gridX: normalizeGrid(item.gridX),
				gridY: normalizeGrid(item.gridY),
				isStage,
				stageW,
				stageH,
				rowLabels: rowLabelsRes.list,
				colLabels: colLabelsRes.list,
				labelRule: normalizeLabelRule(item.labelRule)
			});
		}
		
		if (normalized.length === 0) {
			return { code: -1, message: '至少配置一个分区' };
		}
		
		// 座位总数不含舞台/装饰区
		const totalSeats = normalized.reduce((sum, item) => sum + (item.isStage ? 0 : item.rows * item.cols), 0);
		if (totalSeats > MAX_TOTAL_SEATS) {
			return { code: -1, message: `座位总数 ${totalSeats} 超出上限 ${MAX_TOTAL_SEATS}，请拆分为更多分区` };
		}
		
		const canvas = computeCanvas(normalized);
		if (canvas.canvasW > 300 || canvas.canvasH > 300) {
			return { code: -1, message: `画布尺寸 ${canvas.canvasW}×${canvas.canvasH} 格过大，请缩小分区或调整位置（单边上限 300 格）` };
		}
		
		const maxPerUser = parseInt(maxSeatsPerUser);
		if (!(maxPerUser >= 0 && maxPerUser <= 100)) {
			return { code: -1, message: '单人可选座位数需在 0-100 之间（0 表示不限制）' };
		}
		
		// 分区位置重叠：未确认时先拦截，可二次确认后保存
		const overlaps = findOverlaps(normalized);
		if (overlaps.length > 0 && !force) {
			return {
				code: 2,
				message: `分区位置重叠：${overlaps.join('；')}。继续保存会保留重叠布局，是否确认？`,
				data: { needConfirm: true, reason: 'OVERLAP', overlaps }
			};
		}
		
		const oldAreasRes = await db.collection(AREA_COLLECTION).where({ concertId }).get();
		const oldAreas = oldAreasRes.data || [];
		const oldMap = {};
		oldAreas.forEach(item => { oldMap[item._id] = item; });
		
		const keptIds = normalized.filter(item => item._id && oldMap[item._id]).map(item => item._id);
		const removedAreas = oldAreas.filter(item => keptIds.indexOf(item._id) === -1);
		const addedAreas = normalized.filter(item => !item._id || !oldMap[item._id]);
		const resizedAreas = normalized.filter(item => {
			const old = item._id && oldMap[item._id];
			if (!old) return false;
			
			return (Number(old.rows) || 0) !== item.rows ||
				(Number(old.cols) || 0) !== item.cols ||
				(Number(old.rowLabelType) || 1) !== item.rowLabelType ||
				!!old.isStage !== item.isStage;
		});
		
		// 编号调整不影响 (row,col) 坐标签，仅影响展示文本
		const labelChangedCount = normalized.filter(item => {
			const old = item._id && oldMap[item._id];
			if (!old) return false;
			
			return JSON.stringify(old.rowLabels || []) !== JSON.stringify(item.rowLabels) ||
				JSON.stringify(old.colLabels || []) !== JSON.stringify(item.colLabels);
		}).length;
		
		// 增删分区、改行列数都会让已有选座与网格对不上
		const structuralChanged = removedAreas.length > 0 || addedAreas.length > 0 || resizedAreas.length > 0;
		const selections = await getAllByPage(SELECT_COLLECTION, { concertId }, { areaId: true, row: true, col: true });
		
		if (structuralChanged && selections.length > 0 && !force) {
			return {
				code: 2,
				message: `该演唱会已有 ${selections.length} 条选座记录，改动行列数或新增/删除分区会清理受影响的记录，是否继续？`,
				data: { needConfirm: true, selectionCount: selections.length }
			};
		}
		
		const now = Date.now();
		const savedAreas = [];
		
		for (const item of normalized) {
			const areaDoc = {
				name: item.name,
				rows: item.rows,
				cols: item.cols,
				rowLabelType: item.rowLabelType,
				price: item.price,
				color: item.color,
				sort: item.sort,
				gridX: item.gridX,
				gridY: item.gridY,
				isStage: item.isStage,
				stageW: item.stageW,
				stageH: item.stageH,
				rowLabels: item.rowLabels,
				colLabels: item.colLabels,
				labelRule: item.labelRule
			};
			
			if (item._id && oldMap[item._id]) {
				await db.collection(AREA_COLLECTION).doc(item._id).update(Object.assign({}, areaDoc, { updateTime: now }));
				savedAreas.push(Object.assign({}, item));
			} else {
				const addRes = await db.collection(AREA_COLLECTION).add(Object.assign({
					concertId,
					createTime: now,
					updateTime: now
				}, areaDoc));
				savedAreas.push(Object.assign({}, item, { _id: addRes.id }));
			}
		}
		
		let clearedSelections = 0;
		const removeSelections = async (list) => {
			for (const seat of list) {
				await db.collection(SELECT_COLLECTION).doc(seat._id).remove();
				clearedSelections++;
			}
		};
		
		// 被删除的分区及其选座记录
		for (const area of removedAreas) {
			await db.collection(AREA_COLLECTION).doc(area._id).remove();
			await removeSelections(selections.filter(seat => seat.areaId === area._id));
		}
		
		// 行列数缩小时后越界的选座
		for (const area of resizedAreas) {
			await removeSelections(selections.filter(seat => {
				return seat.areaId === area._id && (seat.row > area.rows || seat.col > area.cols);
			}));
		}
		
		const nextVersion = structuralChanged ? (Number(concert.seat_version) || 1) + 1 : (Number(concert.seat_version) || 1);
		
		const concertUpdate = {
			max_seats_per_user: maxPerUser,
			seat_version: nextVersion,
			updateTime: now
		};
		// 首次保存座位表（该场次此前无任何分区）默认开放选座；之后开关只由配置页切换按钮控制，保存不再覆盖
		if (oldAreas.length === 0) {
			concertUpdate.seat_enabled = true;
		}
		// 旧版客户端不传 seatColors 时保持原配色不动；传了则按清洗结果整体覆盖（完整四键）
		if (event.seatColors !== undefined) {
			concertUpdate.seat_colors = normalizeSeatColors(event.seatColors);
		}
		
		await db.collection('Concert').doc(concertId).update(concertUpdate);
		
		const tips = [];
		if (clearedSelections > 0) tips.push(`同时清理了 ${clearedSelections} 条选座记录`);
		if (labelChangedCount > 0 && selections.length > 0) tips.push(`${labelChangedCount} 个分区的编号已调整（历史记录的展示文本保持不变）`);
		
		return {
			code: 0,
			message: tips.length > 0 ? `座位表已保存，${tips.join('；')}` : '座位表已保存',
			data: {
				areas: savedAreas,
				seatVersion: nextVersion,
				totalSeats,
				canvasW: canvas.canvasW,
				canvasH: canvas.canvasH,
				clearedSelections
			}
		};
	} catch (err) {
		console.error('保存座位配置失败:', err);
		return { code: -1, message: '保存座位配置失败：' + err.message };
	}
}

// 管理端查看已选座位
async function getSeatSelections(event) {
	try {
		const { concertId, userId } = event;
		
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		const areasRes = await db.collection(AREA_COLLECTION).where({ concertId }).get();
		const areaMap = {};
		(areasRes.data || []).forEach(item => { areaMap[item._id] = item; });
		
		const selections = await getAllByPage(SELECT_COLLECTION, { concertId });
		selections.sort((a, b) => {
			const seatA = (Number(a.areaId) || 0) * 100000 + (a.row || 0) * 100 + (a.col || 0);
			const seatB = (Number(b.areaId) || 0) * 100000 + (b.row || 0) * 100 + (b.col || 0);
			
			return seatA - seatB;
		});
		
		const list = selections.map(seat => {
			const area = areaMap[seat.areaId];
			
			return {
				_id: seat._id,
				areaId: seat.areaId,
				areaName: area ? area.name : '已删除分区',
				color: area ? (area.color || '#4A90D9') : '#999999',
				row: seat.row,
				col: seat.col,
				seatLabel: seat.seatLabel || buildSeatLabel(area || { name: '未知区', rowLabelType: 1 }, seat.row, seat.col),
				userId: seat.userId || '',
				nickname: seat.nickname || '',
				source: seat.source || 1,
				createTime: seat.createTime || 0
			};
		});
		
		return {
			code: 0,
			message: '获取成功',
			data: { list, total: list.length }
		};
	} catch (err) {
		return { code: -1, message: '获取选座记录失败：' + err.message };
	}
}

// 管理端释放座位
async function releaseSeats(event) {
	try {
		const { concertId, ids = [], all = false, userId } = event;
		
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		let removed = 0;
		
		if (all) {
			const list = await getAllByPage(SELECT_COLLECTION, { concertId }, null, 500, 20);
			for (const seat of list) {
				await db.collection(SELECT_COLLECTION).doc(seat._id).remove();
				removed++;
			}
		} else {
			const idList = (ids || []).filter(id => !!id);
			if (idList.length === 0) {
				return { code: -1, message: '请选择要释放的座位' };
			}
			
			// 限定在本演唱会范围内，避免误删其他场次记录
			const mineRes = await db.collection(SELECT_COLLECTION)
				.where({ concertId, _id: dbCmd.in(idList) })
				.get();
			
			for (const seat of (mineRes.data || [])) {
				await db.collection(SELECT_COLLECTION).doc(seat._id).remove();
				removed++;
			}
		}
		
		return {
			code: 0,
			message: `已释放 ${removed} 个座位`,
			data: { removed }
		};
	} catch (err) {
		console.error('释放座位失败:', err);
		return { code: -1, message: '释放座位失败：' + err.message };
	}
}

// 开放/关闭选座：只改 Concert.seat_enabled，不动座位布局、版本号与已选记录（关闭后重新开放，已选座位保留）
async function setSeatEnabled(event) {
	try {
		const { concertId, enabled = false, userId } = event;
		
		if (!(await isAdminUser(userId))) {
			return { code: 403, message: '无管理员权限' };
		}
		
		if (!concertId) {
			return { code: -1, message: '缺少演唱会ID' };
		}
		
		const concertRes = await db.collection('Concert').doc(concertId).get();
		const concert = concertRes.data && concertRes.data[0];
		if (!concert) {
			return { code: -1, message: '演唱会不存在' };
		}
		
		const next = !!enabled;
		
		// 开放前校验已配置座位分区，避免开了一张空座位表
		if (next) {
			const areaCount = await db.collection(AREA_COLLECTION).where({ concertId }).count();
			if (!(areaCount.total || 0)) {
				return { code: -1, message: '尚未配置座位表，无法开放选座' };
			}
		}
		
		await db.collection('Concert').doc(concertId).update({
			seat_enabled: next,
			updateTime: Date.now()
		});
		
		return {
			code: 0,
			message: next ? '已开放选座' : '已关闭选座',
			data: { seatEnabled: next }
		};
	} catch (err) {
		console.error('设置选座开放状态失败:', err);
		return { code: -1, message: '设置选座开放状态失败：' + err.message };
	}
}
