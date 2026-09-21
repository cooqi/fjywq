
const db = uniCloud.database()
exports.main = async (event, context) => {
	const collection = db.collection('notice')
	let type=event.type
	let params=event.params 
	let res=null
	// 拼接 imgs_path + imgs_upload → imgs，兼容旧数据
	const mergeImgs = (item) => {
		if (item.imgs_path !== undefined || item.imgs_upload !== undefined) {
			const a = (item.imgs_path || '').split(';').filter(u => u)
			const b = (item.imgs_upload || '').split(';').filter(u => u)
			item.imgs = [...new Set([...a, ...b])].join(';')
		}
		return item
	}
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
			if (res.data) res.data = res.data.map(mergeImgs)
		break;
		case 'get':
		
			res = await collection.where({
			  title: new RegExp(`.*${event.title}.*`,'i')
			}).get()
			if (res.data) res.data = res.data.map(mergeImgs)
		break;
	}

	return res
};
