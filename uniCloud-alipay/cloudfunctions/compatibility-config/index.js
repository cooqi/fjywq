'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
  // event为客户端上传的参数
  // 获取type参数，支持传入多个类型，如: ['yi_tags', 'ji_tags']
  const types = event.types || ['yi_tags', 'ji_tags', 'au_titles', 'descriptions', 'au_contents', 'moments', 'fortunes'];
  
  try {
    const result = {};
    
    // 对每个类型分别查询并随机选取
    for (const type of types) {
      // 先查询该类型的总数
      const countResult = await db.collection('compatibility_config')
        .where({
          type: type,
          is_active: true
        })
        .count();
      
      const totalCount = countResult.total;
      
      if (totalCount > 0) {
        // 随机选择一个偏移量
        const randomOffset = Math.floor(Math.random() * totalCount);
        
        // 查询随机的一条记录
        const queryResult = await db.collection('compatibility_config')
          .where({
            type: type,
            is_active: true
          })
          .skip(randomOffset)
          .limit(1)
          .get();
        
        if (queryResult.data.length > 0) {
          const item = queryResult.data[0];
          
          if (type === 'au_titles') {
            // au_titles需要同时包含title和content
            result[type] = {
              title: item.title || '',
              content: item.content || ''
            };
          } else if (type === 'yi_tags' || type === 'ji_tags') {
            // 标签类：查询所有并返回数组
            const allTags = await db.collection('compatibility_config')
              .where({
                type: type,
                is_active: true
              })
              .orderBy('sort', 'asc')
              .get();
            
            result[type] = allTags.data.map(tag => tag.content || '');
          } else if (type === 'descriptions') {
            // descriptions：返回所有带分数段的描述
            const allDescriptions = await db.collection('compatibility_config')
              .where({
                type: type,
                is_active: true
              })
              .orderBy('sort', 'asc')
              .get();
            
            // 返回包含score_range的数组
            result[type] = allDescriptions.data.map(desc => ({
              score_range: desc.score_range || '',
              content: desc.content || ''
            }));
          } else if (type === 'fortunes') {
            // fortunes：返回所有带分数段的财运描述
            const allFortunes = await db.collection('compatibility_config')
              .where({
                type: type,
                is_active: true
              })
              .orderBy('sort', 'asc')
              .get();
            
            // 返回包含score_range的数组
            result[type] = allFortunes.data.map(fortune => ({
              score_range: fortune.score_range || '',
              content: fortune.content || ''
            }));
          } else if (type === 'au_contents' || type === 'moments') {
            // au_contents和moments：返回所有内容数组
            const allItems = await db.collection('compatibility_config')
              .where({
                type: type,
                is_active: true
              })
              .orderBy('sort', 'asc')
              .get();
            
            // 返回content数组
            result[type] = allItems.data.map(item => item.content || '');
          } else {
            // 其他类型：返回单条content
            result[type] = item.content || '';
          }
        } else {
          result[type] = type === 'yi_tags' || type === 'ji_tags' ? [] : '';
        }
      } else {
        result[type] = type === 'yi_tags' || type === 'ji_tags' ? [] : '';
      }
    }
    
    return {
      code: 0,
      msg: 'success',
      data: result
    };
  } catch (error) {
    console.error('获取配置数据失败:', error);
    throw new Error('获取配置数据失败: ' + error.message);
  }
};
