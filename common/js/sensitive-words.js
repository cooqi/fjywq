/**
 * 敏感词校验模块（前端专用，ESM）
 * 用法：import { checkSensitiveWords } from '@/common/js/sensitive-words.js'
 * 注：云函数无法引用本文件，answer-book 云函数内已内置同步的敏感词列表作兜底，修改时需两处同步
 */

// 基础敏感词库（覆盖辱骂、色情、违法、政治谣言等类别，可按需扩充）
export const SENSITIVE_WORDS = [
	'傻逼', '煞笔', '沙比', '妈的', '去死', '滚蛋', '王八蛋', '混蛋', '畜生', '贱人', '婊子',
	 '嫖娼', '卖淫', '赌博', '毒品', '吸毒', '枪支', '弹药', '炸药', '恐怖袭击', '暴力',
	 '强奸', '轮奸', '猥亵', '色情', '裸聊', '约炮', '一夜情',
	 '传销', '诈骗', '洗钱', '受贿', '贪污', '偷税', '漏税',
	 '法轮功', '邪教', '反政府', '政变', '暴乱', '动乱',
	 '黑客攻击', '木马病毒', '钓鱼网站', '侵犯隐私', '人肉搜索',
	 '自杀', '自残', '割腕', '轻生', '纵火', '投毒'
]

/**
 * 检查文本是否包含敏感词
 * @param {String} text 待检测文本
 * @return {Object} { hit: 是否命中, words: 命中的敏感词列表 }
 */
export function checkSensitiveWords(text) {
	const result = { hit: false, words: [] }
	if (!text || typeof text !== 'string') {
		return result
	}
	// 统一去空白，防止用空格拆分绕过
	const normalized = text.replace(/\s+/g, '')
	SENSITIVE_WORDS.forEach(word => {
		if (normalized.indexOf(word) > -1) {
			result.hit = true
			result.words.push(word)
		}
	})
	return result
}
