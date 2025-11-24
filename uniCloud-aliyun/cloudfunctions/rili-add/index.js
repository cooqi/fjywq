
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('riliCalendar')
	let type=event.type
	let params=event.params 
	let res=null
	switch (type){
		case 'update':
			res = await collection.doc(params._id).update(params) 
		break;
		case 'del':
			res = await collection.doc(params).remove() 
		break;
		case 'add':
		
			res = await collection.add(params) 
		break;
		
	}

	return res
};
