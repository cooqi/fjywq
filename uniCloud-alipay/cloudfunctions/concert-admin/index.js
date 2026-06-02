'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
	const { action } = event;
	
	// 这里可以添加权限验证，只允许管理员操作
	// const isAdmin = checkAdminPermission(context)
	// if (!isAdmin) {
	//   return { code: -1, message: '无权限操作' }
	// }
	
	switch (action) {
		case 'getList':
			return await getList(event);
		case 'add':
			return await add(event);
		case 'update':
			return await update(event);
		case 'delete':
			return await deleteConcert(event);
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
