/**
 * 合成大西瓜：水果等级配置
 * 等级从低到高，同级相碰合成下一级；大西瓜为最高级不再合并
 * 贴图复用青宇对对碰（match.vue）的在线图；emoji/颜色作为图片加载失败的降级展示
 */
const IMG_BASE = 'https://env-00jy66xyyok3.normal.cloudstatic.cn/%E6%B8%B8%E6%88%8F/'

export const FRUITS = [
	{ name: '葡萄', emoji: '🍇', r: 15, color: '#9b6fc3', score: 2, img: IMG_BASE + 'qy1.jpg' },
	{ name: '樱桃', emoji: '🍒', r: 19, color: '#e0566b', score: 4, img: IMG_BASE + 'qy2.jpg' },
	{ name: '橘子', emoji: '🍊', r: 24, color: '#f5a623', score: 8, img: IMG_BASE + 'qy3.jpg' },
	{ name: '柠檬', emoji: '🍋', r: 29, color: '#f7d94c', score: 16, img: IMG_BASE + 'qy4.png' },
	{ name: '猕猴桃', emoji: '🥝', r: 34, color: '#7cb342', score: 32, img: IMG_BASE + 'qy5.jpg' },
	{ name: '西红柿', emoji: '🍅', r: 39, color: '#ef5350', score: 64, img: IMG_BASE + 'qy6.jpg' },
	{ name: '桃子', emoji: '🍑', r: 45, color: '#f8a5c2', score: 128, img: IMG_BASE + 'qy7.jpg' },
	{ name: '菠萝', emoji: '🍍', r: 52, color: '#e8b93e', score: 256, img: IMG_BASE + 'qy8.jpg' },
	{ name: '椰子', emoji: '🥥', r: 59, color: '#8d6e63', score: 512, img: IMG_BASE + 'qy9.png' },
	{ name: '半个西瓜', emoji: '🍉', r: 67, color: '#66bb6a', score: 1024, img: IMG_BASE + 'qy10.jpg' },
	{ name: '大西瓜', emoji: '🍉', r: 76, color: '#2e7d32', score: 2048, img: IMG_BASE + 'qy11.jpg' }
]

export const MAX_LEVEL = FRUITS.length - 1

// 待落水果只随机前 5 级，权重偏向小水果（大水果只能靠合成）
const SPAWN_WEIGHTS = [30, 26, 20, 12, 8]

export function randomSpawnLevel() {
	let total = 0
	for (const w of SPAWN_WEIGHTS) total += w
	let x = Math.random() * total
	for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
		x -= SPAWN_WEIGHTS[i]
		if (x <= 0) return i
	}
	return 0
}
