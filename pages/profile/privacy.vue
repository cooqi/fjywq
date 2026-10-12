<template>
	<view class="privacy-page">
		<!-- 头部说明 -->
		<view class="header-card">
			<view class="page-title">「宇青青宇备忘录」隐私说明</view>
			<view class="page-sub">本小程序尊重并保护用户隐私。为让你了解本小程序如何处理相关信息，特作如下说明。</view>
		</view>

		<!-- 条款列表 -->
		<view class="card">
			<view class="info-block" v-for="(item, idx) in privacyItems" :key="idx">
				<view class="block-title">{{ item.title }}</view>
				<view class="block-content">
					<view v-for="(line, i) in item.lines" :key="i">{{ line }}</view>
				</view>
			</view>
		</view>

		<!-- 联系入口：跳转杯杯儿信箱 -->
		<view class="contact-card" @click="goSuggestion">
			<text class="contact-label">注销 / 咨询联系</text>
			<text class="contact-value">杯杯儿信箱 ›</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				privacyItems: [
					{
						title: '一、无需登录即可使用的功能',
						lines: [
							'本小程序的日历、资讯等核心功能无需登录即可使用。你不登录也可以正常浏览和使用这些功能。'
						]
					},
					{
						title: '二、需要登录的功能',
						lines: [
							'部分功能需要登录后使用，例如记账、答题等。登录的目的是为了识别你的小程序内身份，便于保存和管理你的记录、答题数据等内容。'
						]
					},
					{
						title: '三、登录信息说明',
						lines: [
							'1. 本小程序登录仅记录你的微信 OpenID。',
							'2. OpenID 是本小程序内的用户身份标识，不是你的微信号。',
							'3. 该 OpenID 仅作为你在本小程序内的身份证明，用于区分用户、关联和保存你的数据。',
							'4. 我们不会通过 OpenID 获取你的头像、昵称、手机号等个人信息，也不会主动请求、收集上述信息。',
							'5. 我们不会获取你的微信号，OpenID 也不能反向识别你的微信号或真实身份。'
						]
					},
					{
						title: '四、你主动填写的信息',
						lines: [
							'登录后，为方便你管理个人内容，你可以手动填写昵称、地址等信息。',
							'1. 昵称、地址等信息由你自愿填写。',
							'2. 不填写不影响任何功能使用。',
							'3. 我们不会主动获取你的昵称、地址等信息。',
							'4. 你主动填写的信息仅用于你个人管理、展示或记录，不会用于其他目的，也不会对外提供。'
						]
					},
					{
						title: '五、消费记录',
						lines: [
							'消费记录仅作为你的个人记录，方便你自行查看和管理。本小程序不对消费记录进行任何分析、用户画像、数据挖掘、营销推荐或其他商业分析。'
						]
					},
					{
						title: '六、拍照存储',
						lines: [
							'1. 你主动上传的消费或贴图的图片会存储到云端，可主动删除，删除后云端不会保留任何痕迹。',
							'2. 青宇打卡照片不会做任何存储，仅个人展示',
							'3. 小程序内被上传云端的图片都会允许删除，且不留痕，不会用于其他目的，也不会对外提供。没有删除功能的则不会被存储。'
						]
					},
					{
						title: '七、信息使用与共享',
						lines: [
							'除本说明列明的 OpenID 以及你主动填写的信息外，我们不会主动收集其他个人信息。',
							'我们不会出售、出租或非法向第三方提供你的相关信息。法律法规另有规定的除外。'
						]
					},
					{
						title: '八、数据安全',
						lines: [
							'我们会采取合理措施保护相关信息，防止未经授权的访问、泄露、篡改或丢失。'
						]
					},
					{
						title: '九、注销与删除',
						lines: [
							'如果你希望注销账号或删除相关数据，可通过「杯杯儿信箱」联系我们（见本页底部入口）。',
							'我们核实后，将删除你的相关数据。注销后，如需使用登录相关功能，需要重新登录。'
						]
					},
					{
						title: '十、未成年人使用',
						lines: [
							'如未成年人使用本小程序，建议在监护人指导下使用。'
						]
					},
					{
						title: '十一、说明更新',
						lines: [
							'本隐私说明可能会根据功能或法规要求进行更新。更新后的说明将在本小程序内公布。'
						]
					},
					{
						title: '十二、联系方式',
						lines: [
							'如你对本隐私说明有任何疑问、意见或注销需求，请通过本页底部的「杯杯儿信箱」联系我们。'
						]
					}
				]
			}
		},
		methods: {
			goSuggestion() {
				uni.navigateTo({
					url: '/pages/myTodo/suggestion'
				})
			}
		}
	}
</script>

<style lang="scss">
.privacy-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 20rpx 0 40rpx;
}

.header-card {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx 20rpx;
	padding: 40rpx 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 16rpx;
	}
	
	.page-sub {
		font-size: 26rpx;
		color: #666;
		line-height: 1.8;
		text-align: justify;
	}
}

.card {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx 20rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.info-block {
		margin-bottom: 28rpx;
		
		&:last-child {
			margin-bottom: 0;
		}
		
		.block-title {
			font-size: 28rpx;
			font-weight: bold;
			color: #333;
			margin-bottom: 12rpx;
		}
		
		.block-content {
			font-size: 26rpx;
			color: #666;
			line-height: 1.8;
			text-align: justify;
		}
	}
}

.contact-card {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx;
	padding: 28rpx 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	justify-content: space-between;
	
	.contact-label {
		font-size: 28rpx;
		color: #666;
	}
	
	.contact-value {
		font-size: 28rpx;
		color: #c62828;
		font-weight: 500;
	}
}
</style>
