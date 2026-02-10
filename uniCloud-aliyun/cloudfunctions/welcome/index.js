'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('welcome')
	let type=event.type || ''
	switch (type){
		
		case 'get':
			const res = await collection.orderBy("_id", "desc").limit(1).get()
			return res
		break;
		case 'update':
			
			await collection.limit(1).update(event.params) 
		break;
		default:
		const res2 = await collection.orderBy("_id", "desc").limit(1).get()
		return res2
		
	}
	
};
