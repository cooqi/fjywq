'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const collection = db.collection('notice')
	console.log(event, context)
	let type=event.type
	switch (type){
		case 'update':
			await collection.doc(event.id).update(event.data) 
		break;
		case 'del':
			await collection.doc(event.id).remove() 
		break;
		case 'add':
		
			await collection.add({
						  title:event.title,
						  bz:event.bz,
						  url:event.url,
						  type:event.type
			}) 
		break;
		
	}
	//返回数据给客户端
	const res=await collection.orderBy("top", "desc").orderBy("_id", "desc").get()
	return res
};
