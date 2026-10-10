<template>
	<view class="page">
		<!-- 分类 Tab -->
		<scroll-view scroll-x class="tabs" :show-scrollbar="false">
			<view class="tabs-inner">
				<view
					v-for="c in categories"
					:key="c.value"
					class="tab"
					:class="{ active: c.value === category }"
					@click="switchCategory(c.value)"
				>{{ c.label }}</view>
			</view>
		</scroll-view>

		<!-- 模板网格 -->
		<view v-if="list.length" class="grid">
			<view v-for="f in list" :key="f._id" class="cell" @click="choose(f)">
				<view class="thumb-box">
					<image v-if="f.thumbUrl || f.frameUrl" class="thumb" :src="f.thumbUrl || f.frameUrl" mode="aspectFill" />
					<view v-else class="thumb thumb-empty">🖼️</view>
				</view>
				<text class="f-name">{{ f.name }}</text>
				<text class="f-meta">{{ categoryLabel(f.category) }} · {{ f.useCount || 0 }}次</text>
			</view>
		</view>

		<!-- 空态 / 加载 -->
		<view v-else-if="!loading" class="empty">
			<text class="empty-icon">📷</text>
			<text class="empty-text">暂无模板，请稍后再来</text>
		</view>
		<uni-load-more v-if="loading || list.length" :status="loadMoreStatus" />

		<!-- 管理员入口 -->
		<view v-if="isAdmin" class="admin-fab" @click="goAdmin">🛠️ 模板管理</view>
	</view>
</template>

<script>
import { CATEGORIES, categoryLabel, readAdmin } from '@/common/js/photo-const.js'

export default {
	data() {
		return {
			categories: CATEGORIES,
			category: 'all',
			list: [],
			page: 1,
			size: 20,
			total: 0,
			loading: false,
			isAdmin: false,
			userRole: '',
			userId: ''
		}
	},
	computed: {
		loadMoreStatus() {
			if (this.loading) return 'loading'
			return this.list.length >= this.total ? 'noMore' : 'more'
		}
	},
	onLoad() {
		this.loadUser()
		this.fetch(true)
	},
	onPullDownRefresh() {
		this.fetch(true).then(() => uni.stopPullDownRefresh())
	},
	onReachBottom() {
		if (this.loading || this.list.length >= this.total) return
		this.page++
		this.fetch(false)
	},
	onShareAppMessage() {
		return { title: '大头贴 · 挑个相框拍一张', path: '/pages/game/photo/home' }
	},
	onShareTimeline() {
		return { title: '大头贴 · 挑个相框拍一张' }
	},
	methods: {
		categoryLabel,
		loadUser() {
			const u = readAdmin()
			this.isAdmin = u.isAdmin
			this.userRole = u.userRole
			this.userId = u.userId
		},
		switchCategory(v) {
			if (v === this.category) return
			this.category = v
			this.fetch(true)
		},
		async fetch(reset) {
			if (reset) { this.page = 1; this.list = [] }
			this.loading = true
			try {
				const res = await uniCloud.callFunction({
					name: 'photo',
					data: {
						action: 'list',
						category: this.category === 'all' ? '' : this.category,
						page: this.page,
						size: this.size
					}
				})
				const r = res.result || {}
				if (r.code !== 0) {
					uni.showToast({ title: r.msg || '加载失败', icon: 'none' })
				} else {
					const d = r.data || {}
					this.total = d.total || 0
					this.list = reset ? (d.list || []) : this.list.concat(d.list || [])
				}
			} catch (e) {
				console.error('加载模板失败:', e)
				uni.showToast({ title: '网络异常，请重试', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		choose(f) {
			uni.navigateTo({ url: '/pages/game/photo/camera?frameId=' + f._id })
		},
		goAdmin() {
			uni.navigateTo({ url: '/pages/game/photo/admin' })
		}
	}
}
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx 24rpx 140rpx;
	box-sizing: border-box;
}
.tabs { white-space: nowrap; }
.tabs-inner { display: inline-flex; padding: 8rpx 0 4rpx; }
.tab {
	display: inline-block;
	padding: 12rpx 30rpx;
	margin-right: 16rpx;
	font-size: 27rpx;
	color: #6a6a86;
	background: rgba(255, 255, 255, .6);
	border-radius: 40rpx;
}
.tab.active {
	color: #fff;
	font-weight: bold;
	background: linear-gradient(135deg, #fa709a, #fee140);
	box-shadow: 0 6rpx 18rpx rgba(250, 112, 154, .35);
}

.grid {
	margin-top: 20rpx;
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 18rpx;
}
.cell {
	background: #fff;
	border-radius: 20rpx;
	padding: 12rpx 12rpx 16rpx;
	box-shadow: 0 8rpx 22rpx rgba(102, 126, 234, .10);
	display: flex;
	flex-direction: column;
	align-items: center;
}
.cell:active { transform: scale(.96); }
.thumb-box {
	width: 100%;
	height: 240rpx;
	border-radius: 14rpx;
	overflow: hidden;
	background: #f2f2f7;
}
.thumb { width: 100%; height: 100%; }
.thumb-empty { display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.f-name {
	margin-top: 12rpx;
	font-size: 26rpx;
	color: #333;
	font-weight: bold;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.f-meta { margin-top: 4rpx; font-size: 20rpx; color: #a0a0b8; }

.empty { padding: 140rpx 0; display: flex; flex-direction: column; align-items: center; }
.empty-icon { font-size: 90rpx; opacity: .6; }
.empty-text { margin-top: 20rpx; font-size: 27rpx; color: #8a86a8; }

.admin-fab {
	position: fixed;
	right: 30rpx;
	bottom: 40rpx;
	padding: 18rpx 32rpx;
	background: linear-gradient(135deg, #4facfe, #00f2fe);
	color: #fff;
	font-size: 26rpx;
	border-radius: 44rpx;
	box-shadow: 0 10rpx 26rpx rgba(79, 172, 254, .4);
}
</style>
