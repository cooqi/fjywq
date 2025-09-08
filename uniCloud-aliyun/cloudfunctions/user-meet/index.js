'use strict';
const db = uniCloud.database()
const dbJQL = uniCloud.databaseForJQL()
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const collection = db.collection('user-meet')
	let type=event.type
	switch (type){
		case 'update':
			await collection.where({userID:event.userID}).update({meetID:event.meetID}) 
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
			const data=await collection.where({userID:event.userID,meetID:event.meetID}).get()
			
			if(data.data.length>=1){
				res = {
					code: 405,
					message: '你已添加过这次见面会，请勿重复添加'
				}
				return res
			}
			
			
			await collection.add({
						  userID:event.userID,
						  meetID:event.meetID
			}) 
		break;
		
	}
	//返回数据给客户端
	const userMeet = dbJQL.collection('user-meet').where({userID:event.userID}).getTemp() // 注意结尾的方法是getTemp，对order表过滤得到临时表
	const res = await dbJQL.collection(userMeet, 'meet').orderBy("_id", "desc").get() // 将获取的order表的临时表和book表进行联表查询

	return res
};
