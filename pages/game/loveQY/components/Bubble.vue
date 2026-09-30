<template>
	<view class="bubble-wrap" v-if="text">
		<view class="bubble">
			<text class="bubble-text">{{ text }}</text>
			<view class="bubble-tail"></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'Bubble',
	props: {
		text: { type: String, default: '' }
	}
}
</script>

<style scoped>
.bubble-wrap { display: flex; justify-content: center; margin: 10px 0; }
.bubble {
	position: relative;
	max-width: 80%;
	background: #fff;
	border-radius: 16px;
	padding: 10px 16px;
	box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}
.bubble-text { font-size: 14px; color: #555; }
.bubble-tail {
	position: absolute;
	top: -6px;
	left: 50%;
	margin-left: -6px;
	width: 0; height: 0;
	border-left: 6px solid transparent;
	border-right: 6px solid transparent;
	border-bottom: 6px solid #fff;
}
</style>
