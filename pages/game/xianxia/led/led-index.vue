<template>
	<view class="page-container">
		<view class="hero">
			<view class="hero-icon">📱</view>
			<view class="hero-title">手机灯牌</view>
			<view class="hero-sub">演唱会现场 · 手持应援霓虹灯牌</view>
		</view>

		<button class="new-btn" @click="createNew">＋ 新建灯牌</button>

		<view v-if="list.length" class="count-tip">我的灯牌（{{ list.length }}/{{ maxItems }}）· 长按可删除</view>

		<!-- 列表 -->
		<view v-for="item in list" :key="item.id" class="board-card" @click="edit(item.id)" @longpress="askDelete(item)">
			<view class="board-preview" :style="{ background: item.bgColor }">
				<view v-for="(line, li) in previewLines(item)" :key="li" class="bp-line">
					<text v-for="(c, ci) in line" :key="ci" class="bp-char" :style="{ color: c.color }">{{ c.char }}</text>
					<text v-if="!line.length" class="bp-empty">空白</text>
				</view>
			</view>
			<view class="board-info">
				<view class="bi-name">{{ item.name }}</view>
				<view class="bi-meta">{{ modeLabel(item) }} · {{ timeAgo(item.updateTime) }}</view>
			</view>
			<view class="bi-arrow">›</view>
		</view>

		<view v-if="!list.length" class="empty">
			<view class="empty-emoji">🌙</view>
			<view class="empty-text">还没有灯牌，点上面「新建灯牌」做一个吧</view>
		</view>

		<view class="tips">
			<view class="tips-title">小提示</view>
			<view class="tips-line">· 逐字可设「字色」和「发光色」，做红字蓝光</view>
			<view class="tips-line">· 单行才能滚动；多行会自动切回静态</view>
			<view class="tips-line">· 编辑好点「全屏展示」，现场举过头顶，屏幕自动常亮</view>
		</view>
	</view>
</template>

<script>
import { loadList, removeItem, MAX_ITEMS } from '@/common/js/led-store.js'

export default {
	data() {
		return {
			list: [],
			maxItems: MAX_ITEMS
		}
	},
	onShow() {
		this.list = loadList()
	},
	onShareAppMessage() {
		return { title: '手机灯牌 · 现场应援霓虹灯', path: '/pages/game/xianxia/led/led-index' }
	},
	onShareTimeline() {
		return { title: '手机灯牌 · 现场应援霓虹灯' }
	},
	methods: {
		createNew() {
			uni.navigateTo({ url: '/pages/game/xianxia/led/led-editor' })
		},
		edit(id) {
			uni.navigateTo({ url: '/pages/game/xianxia/led/led-editor?id=' + id })
		},
		previewLines(item) {
			// 每行最多显示 8 字，最多 3 行
			return (item.lines || []).slice(0, 3).map(l => (l.chars || []).slice(0, 8))
		},
		modeLabel(item) {
			if (item.mode === 'scroll') return '滚动·' + ({ left: '左', right: '右', up: '上', down: '下' }[item.scroll.direction] || '')
			if (item.mode === 'blink') return ({ flash: '闪烁', pulse: '脉冲', rainbow: '彩虹', shimmer: '闪光' }[item.blink.effect]) || '闪烁'
			return '静态'
		},
		timeAgo(ts) {
			if (!ts) return ''
			const d = Date.now() - ts
			if (d < 60000) return '刚刚'
			if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前'
			if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前'
			return Math.floor(d / 86400000) + ' 天前'
		},
		askDelete(item) {
			uni.showModal({
				title: '删除灯牌',
				content: '确定删除「' + item.name + '」？',
				confirmColor: '#f6685e',
				success: (r) => {
					if (r.confirm) {
						this.list = removeItem(item.id)
						uni.showToast({ title: '已删除', icon: 'none' })
					}
				}
			})
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 24rpx;
	box-sizing: border-box;
}
.hero { text-align: center; padding: 40rpx 0 16rpx; }
.hero-icon {
	font-size: 76rpx; width: 140rpx; height: 140rpx; line-height: 140rpx; margin: 0 auto;
	border-radius: 50%; background: linear-gradient(135deg, #fa709a, #fee140);
	box-shadow: 0 12rpx 36rpx rgba(250, 112, 154, .4);
}
.hero-title {
	font-size: 46rpx; font-weight: bold; margin-top: 20rpx;
	background: linear-gradient(135deg, #d6336c, #a6489f);
	-webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 25rpx; color: #8a86a8; margin-top: 10rpx; letter-spacing: 2rpx; }

.new-btn {
	background: linear-gradient(135deg, #fa709a, #fee140);
	color: #fff; border-radius: 44rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; border: none; margin-top: 20rpx;
}
.count-tip { font-size: 24rpx; color: #8a86a8; margin: 28rpx 6rpx 12rpx; }

.board-card {
	display: flex; align-items: center;
	background: #fff; border-radius: 24rpx; padding: 22rpx; margin-bottom: 20rpx;
	box-shadow: 0 8rpx 26rpx rgba(102, 126, 234, .10);
}
.board-card:active { transform: scale(.99); }
.board-preview {
	width: 200rpx; height: 130rpx; border-radius: 14rpx; flex-shrink: 0;
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	padding: 8rpx; box-sizing: border-box; overflow: hidden;
}
.bp-line { display: flex; flex-direction: row; justify-content: center; line-height: 1.2; }
.bp-char { font-size: 26rpx; font-weight: bold; }
.bp-empty { font-size: 22rpx; color: #777; }
.board-info { flex: 1; margin-left: 22rpx; }
.bi-name { font-size: 30rpx; font-weight: bold; color: #4b3a8f; }
.bi-meta { font-size: 23rpx; color: #999; margin-top: 8rpx; }
.bi-arrow { font-size: 44rpx; color: #cfcfe0; }

.empty { text-align: center; padding: 80rpx 0; }
.empty-emoji { font-size: 90rpx; }
.empty-text { font-size: 27rpx; color: #8a86a8; margin-top: 16rpx; }

.tips { background: rgba(255, 255, 255, .6); border-radius: 20rpx; padding: 24rpx 28rpx; margin-top: 30rpx; }
.tips-title { font-size: 27rpx; font-weight: bold; color: #6a5aa0; margin-bottom: 10rpx; }
.tips-line { font-size: 23rpx; color: #7a76a0; line-height: 1.7; }
</style>
