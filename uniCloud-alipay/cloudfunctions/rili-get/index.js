'use strict';
const db = uniCloud.database()
exports.main = async (event, context) => {
    const collection = db.collection('riliCalendar')
     const { month ,year,search} = event // 从事件参数中获取年份和月份
      
    const allRes  = await collection.orderBy("date", "desc").limit(999).get()
    let res=allRes
    if(month && year){
        // 格式化月份和年份，确保比较时一致
          const targetYear = parseInt(year).toString()
          const targetMonth = parseInt(month).toString()
          
          // 过滤出指定年月的数据
          const filteredData = allRes.data.filter(item => {
            if (!item.date) return false
            
            // 解析日期格式 yyyy-m-d
            const dateParts = item.date.split('-')
            if (dateParts.length < 3) return false
            
            // 获取年份和月份部分并转换为数字进行比较
            const itemYear = parseInt(dateParts[0]).toString()
            const itemMonth = parseInt(dateParts[1]).toString()
            return itemYear === targetYear && itemMonth === targetMonth
          })
          res= {
            code: 200,
            data: filteredData,
            total: filteredData.length
          }
    }else if(month){
        // 格式化月份，确保比较时一致
          const targetYear = parseInt(year).toString()
          const targetMonth = parseInt(month).toString()
          
          // 过滤出指定月份的数据（不考虑年份）
          const filteredData = allRes.data.filter(item => {
            if (!item.date) return false
            
            // 解析日期格式 yyyy-m-d
            const dateParts = item.date.split('-')
            if (dateParts.length < 2) return false
            
            // 获取月份部分并转换为数字进行比较
            const itemMonth = parseInt(dateParts[1]).toString()
            return itemMonth === targetMonth
          })
          res= {
            code: 200,
            data: filteredData,
            total: filteredData.length
          }
    }else if(search){
        // 搜索功能：支持关键词和日期搜索
        let conditions = []
        
        // 如果有关键词，进行模糊搜索（title 或 bz）
        if (search.keyword) {
            const keyword = search.keyword.trim()
            if (keyword) {
                conditions.push(db.command.or([
                    {
                        title: new RegExp(keyword, 'i')
                    },
                    {
                        bz: new RegExp(keyword, 'i')
                    }
                ]))
            }
        }
        
        // 如果有日期，添加日期条件
        if (search.date) {
            const dateStr = search.date.trim()
            if (dateStr) {
                conditions.push({
                    date: dateStr
                })
            }
        }
        
        // 执行查询
        if (conditions.length > 0) {
            // 如果只有一个条件，直接使用
            if (conditions.length === 1) {
                res = await collection.where(conditions[0]).orderBy("date", "desc").get()
            } else {
                // 多个条件使用 and 连接
                res = await collection.where(db.command.and(conditions)).orderBy("date", "desc").get()
            }
        } else {
            res = allRes
        }
    }
    
    return res
};
