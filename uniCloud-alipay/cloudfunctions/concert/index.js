'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
	const { action } = event;
	
	switch (action) {
		case 'getList':
			return await getConcertList(event);
		case 'getMyConcerts':
			return await getMyConcerts(event);
		case 'addMyConcert':
			return await addMyConcert(event);
		case 'deleteMyConcert':
			return await deleteMyConcert(event);
		default:
			return {
				code: -1,
				message: '未知的操作类型'
			};
	}
};

// 获取演唱会列表
async function getConcertList(event) {
	try {
		const { type, keyword } = event;
		
		let query = {};
		if (type && type !== 'all') {
			query.type = type;
		}
		if (keyword) {
			query.$or = [
				{ ychTheme: new RegExp(keyword, 'i') },
				{ yhcTheme: new RegExp(keyword, 'i') },
				{ address: new RegExp(keyword, 'i') }
			];
		}
		
		const res = await db.collection('Concert')
			.where(query)
			.orderBy('time', 'asc')
			.get();
		
		return {
			code: 0,
			message: '获取成功',
			data: res.data
		};
	} catch (err) {
		return {
			code: -1,
			message: '获取失败：' + err.message
		};
	}
}

// 获取我的演唱会记录
async function getMyConcerts(event) {
	try {
		const { userId, meetType } = event;
		
		let query = { userId };
		if (meetType) {
			query.meetType = meetType;
		}
		
		const res = await db.collection('myConcert')
			.where(query)
			.orderBy('createTime', 'desc')
			.lookup({
				from: 'Concert',
				localField: 'ConcertId',
				foreignField: '_id',
				as: 'Concert'
			})
			.get();
		
		// 处理关联数据
		const data = res.data.map(item => {
			if (item.Concert && item.Concert.length > 0) {
				item.Concert = item.Concert[0];
			}
			return item;
		});
		
		return {
			code: 0,
			message: '获取成功',
			data: data
		};
	} catch (err) {
		return {
			code: -1,
			message: '获取失败：' + err.message
		};
	}
}

// 添加我的演唱会记录
async function addMyConcert(event) {
	try {
		const { userId, ConcertId, meetType } = event;
		
		// 检查是否已存在
		const existRecord = await db.collection('myConcert')
			.where({
				userId,
				ConcertId,
				meetType
			})
			.get();
		
		if (existRecord.data.length > 0) {
			return {
				code: -1,
				message: '该场次已添加'
			};
		}
		
		// 添加记录
		const res = await db.collection('myConcert').add({
			userId,
			ConcertId,
			meetType,
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

// 删除我的演唱会记录
async function deleteMyConcert(event) {
	try {
		const { id } = event;
		
		const res = await db.collection('myConcert')
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
