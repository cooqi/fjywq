
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('riliCalendar')
	let type=event.type
	let params=event.params 
	let res=null
	switch (type){
		case 'update':
			let id=params._id
			delete params._id 
			res = await collection.doc(id).update(params) 
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
