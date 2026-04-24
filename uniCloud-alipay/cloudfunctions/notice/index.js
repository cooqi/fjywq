'use strict';
const db = uniCloud.database()
const dbCmd = db.command
exports.main = async (event, context) => {
	//event为客户端上传的参数
	const collection = db.collection('notice')
	let type=event.type
	let classType=event.classType 
	
	//返回数据给客户端
	// 构建灵活的查询条件
	const queryConditions = {
	  hide: dbCmd.neq('1'),
	  classType:classType
	};

	const res=await collection.where(queryConditions).orderBy("top", "desc").orderBy("is_today_important", "desc").orderBy("_id", "desc").get()
	
	return res
};
