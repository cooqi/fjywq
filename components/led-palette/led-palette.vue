<template>
	<view class="palette">
		<view v-for="(c, i) in colors" :key="i" class="pal-sw" :style="{ background: c }" @click="$emit('pick', c)"></view>
		<view class="pal-sw pal-sw-custom" @click="pickCustom"><text>＋</text></view>
	</view>
</template>

<script>
export default {
	name: 'led-palette',
	props: {
		colors: { type: Array, default: () => [] }
	},
	methods: {
		pickCustom() {
			uni.showModal({
				title: '自定义颜色',
				editable: true,
				placeholderText: '#RRGGBB',
				success: (r) => {
					if (!r.confirm) return
					let v = (r.content || '').trim()
					if (v && v[0] !== '#') v = '#' + v
					if (/^#[0-9a-fA-F]{6}$/.test(v)) this.$emit('pick', v)
					else uni.showToast({ title: '格式应为 #RRGGBB', icon: 'none' })
				}
			})
		}
	}
}
</script>

<style lang="scss">
.palette { display: flex; flex-wrap: wrap; }
.pal-sw { width: 60rpx; height: 60rpx; border-radius: 12rpx; margin: 8rpx; border: 2rpx solid rgba(0, 0, 0, .12); }
.pal-sw:active { transform: scale(.9); }
.pal-sw-custom { display: flex; align-items: center; justify-content: center; background: #f2f2f7; color: #666; font-size: 34rpx; border-style: dashed; }
</style>
