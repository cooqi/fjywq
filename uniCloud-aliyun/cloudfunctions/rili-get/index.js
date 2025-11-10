'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('riliCalendar')
	const res = await collection.orderBy("date", "desc").limit(999).get()
	return res
};
