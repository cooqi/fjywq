'use strict';

exports.main = async (event, context) => {
  const db = uniCloud.database();
  
  try {
    // 查询所有启用的塔罗牌
    const cardsResult = await db.collection('tarot_cards')
      .where({
        card_type: 'tarot_card',
        is_active: true
      })
      .orderBy('sort', 'asc')
      .get();
    
    if (cardsResult.data.length === 0) {
      throw new Error('暂无塔罗牌数据');
    }
    
    // 根据日期随机选择一个每日问题
    const questionsResult = await db.collection('tarot_cards')
      .where({
        card_type: 'daily_question',
        is_active: true
      })
      .get();
    
    let dailyQuestion = '';
    if (questionsResult.data.length > 0) {
      // 使用日期作为种子，确保同一天显示同一个问题
      const today = new Date();
      const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const randomIndex = daySeed % questionsResult.data.length;
      dailyQuestion = questionsResult.data[randomIndex].content || '';
    }
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        cards: cardsResult.data,
        dailyQuestion: dailyQuestion
      }
    };
  } catch (error) {
    console.error('获取塔罗牌数据失败:', error);
    throw new Error('获取塔罗牌数据失败: ' + error.message);
  }
};
