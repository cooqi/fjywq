<template>
	<view class="page">
		<view v-if="loading" class="center-tip">翻开日记……</view>

		<view v-else-if="!list.length" class="empty">
			<view class="big">📔</view>
			<view class="t">还没有日记，去陪陪杯蜜吧～</view>
		</view>

		<view v-else>
			<view class="d-title">{{ petName }} 的成长日记</view>
			<view class="timeline">
				<view v-for="d in list" :key="d._id" class="node">
					<view class="dot" :style="{ background: colorOf(d.type) }"></view>
					<view class="node-body">
						<view class="node-text">{{ iconOf(d.type) }} {{ d.text }}</view>
						<view class="node-time">{{ fmt(d.create_date) }}</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { callBeemore, getMyUserInfo } from './store/pet.js'
import { fmtTime } from './beemore.js'

const ICONS = { adopt: '🐣', sick: '🤒', recover: '🌱', heal: '💊', friend: '🤝', cut: '💔', work: '💼', salary: '💰', travel: '🎒', unlock: '🎁', notify: '🔔', interact: '💬', eat: '🍚', fat: '⚖️', thin: '🥺' }
const COLORS = { adopt: '#43e97b', sick: '#f5576c', recover: '#4facfe', heal: '#4facfe', friend: '#fa709a', cut: '#f5576c', work: '#f6a54a', salary: '#f6a54a', travel: '#fa709a', unlock: '#b06ab3', notify: '#c9c9d4', interact: '#7f9cf5', eat: '#ffb454', fat: '#f6a54a', thin: '#4facfe' }

export default {
	data() { return { loading: true, list: [], petName: '', userId: '' } },
	onLoad() {
		const u = getMyUserInfo()
		this.userId = u ? u._id : ''
		this.load()
	},
	methods: {
		fmt: fmtTime,
		iconOf(t) { return ICONS[t] || '•' },
		colorOf(t) { return COLORS[t] || '#c9c9d4' },
		async load() {
			this.loading = true
			const res = await callBeemore({ action: 'diary', userId: this.userId })
			if (res.code === 0 && res.data) {
				this.list = res.data.list || []
				this.petName = res.data.petName || '杯蜜'
			}
			this.loading = false
		}
	}
}
</script>

<style scoped>
.page { min-height: 100vh; background: linear-gradient(180deg, #fff6e6 0%, #e6cffc 100%); padding: 16px; box-sizing: border-box; }
.center-tip { text-align: center; color: #8a7fb0; margin-top: 120px; }
.empty { text-align: center; margin-top: 120px; }
.big { font-size: 60px; }
.t { color: #888; margin-top: 10px; }
.d-title { font-size: 18px; font-weight: bold; color: #6a5acd; text-align: center; margin: 6px 0 18px; }
.timeline { position: relative; padding-left: 8px; }
.node { position: relative; padding-left: 26px; padding-bottom: 18px; }
.node::before { content: ''; position: absolute; left: 7px; top: 14px; bottom: -4px; width: 2rpx; background: #d9d0ef; }
.node:last-child::before { display: none; }
.dot { position: absolute; left: 2px; top: 4px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; }
.node-body { background: #fff; border-radius: 12px; padding: 12px 14px; }
.node-text { font-size: 14px; color: #444; }
.node-time { font-size: 11px; color: #aaa; margin-top: 6px; }
</style>
