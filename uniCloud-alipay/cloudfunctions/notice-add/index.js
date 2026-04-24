
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('notice')
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
		case 'view':
		
			res=await collection.where({_id:event.id}).get()
		break;
		case 'get':
		
			res = await collection.where({
			  title: new RegExp(`.*${event.title}.*`,'i')
			}).get()
		break;
	}

	return res
};
