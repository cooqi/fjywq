'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	
	const collection = db.collection('meet')
	const res = await collection.orderBy("time", "desc").get()
	return res
};
