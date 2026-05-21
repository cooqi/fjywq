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
        // 过滤出指定日期的数据
        res=await collection.where(search).get()
    }
    
    return res
};
