'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('welcome')
	const res = await collection.orderBy("_id", "desc").limit(1).get()
	return res
};
