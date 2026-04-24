'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const collection = db.collection('user-todo')
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
		let res={}
			if(!event.userID){
				res = {
					code: 401,
					message: '还未登录'
				}
				return res
			}
			const data=await collection.where({userID:event.userID,taskID:event.taskID}).get()
			
			if(data.data.length>=1){
				res = {
					code: 405,
					message: '你已添加过这个任务，请勿重复添加'
				}
				return res
			}
			const data2=await collection.where({userID:event.userID,isComplete:'0'}).get()
			
			if(data2.data.length>=5){
				res = {
					code: 406,
					message: '你超过5条任务还未完成，请先完成已添加任务后再继续添加'
				}
				return res
			}
			
			await collection.add({
						  isComplete: '0',
						  userID:event.userID,
						  title:event.title,
						  taskID:event.taskID
			}) 
		break;
		
	}
	//返回数据给客户端
	const res=await collection.where({userID:event.userID}).limit(50).orderBy("_id", "desc").get()
	return res
};
