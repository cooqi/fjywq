<template>
	<view class="about-page">
	
		
		<!-- 应用介绍 -->
		<view class="intro-section">
			<view class="section-title">应用介绍</view>
			<view class="intro-content">
				<text>本款小程序是一款专为杯杯儿打造的备忘录记录工具，帮助你记录与偶像的每一次相遇。</text>
			</view>
		</view>
		
		<!-- 数据库与统计口径说明 -->
		<view class="db-section">
			<view class="section-title">内容说明</view>
			
			<!-- 感谢信息 -->
			<view class="thanks-box">
				<view class="thanks-text">
					历史数据的录入离不开所有一胎和二胎杯杯儿的过往整理，在此感谢所有杯杯儿
				</view>
			</view>
			
			<!-- 演出场次数据库 -->
			<view class="info-block">
				<view class="block-title">演出场次数据库</view>
				<view class="block-content">
					<text>包含2025年至今的全部已举办/官宣/报批的演唱会、音乐节、拼盘演唱会。未来更多场次信息及歌单会持续更新同步。</text>
					<text class="mt-20">综艺、线下商务、接送机等见面暂不纳入统计。取消场次不纳入统计。具体展示以当前数据库中的记录为准。</text>
				</view>
			</view>
			
			<!-- 歌单统计说明 -->
			<view class="info-block">
				<view class="block-title">统计说明</view>
				<view class="block-content">
					<text>演唱会/音乐节数据主要是统计有消费记录产生的数据，其他数据暂不做统计</text>
				</view>
			</view>
			
			<!-- 首页数据统计口径 -->
			<view class="info-block">
				<view class="block-title">数据统计规则</view>
				<view class="block-content">
					<text>「足迹」统计演出日期在今天及以前的已参加场次；</text>
				</view>
			</view>
		</view>
		
		<!-- 联系我们 -->
		<view class="contact-section">
			<view class="section-title">联系我们</view>
			<view class="contact-info">
				<view class="contact-item">
					<view class="contact-label">意见反馈</view>
					<view class="contact-value" @click="goToSuggestion">杯杯儿信箱</view>
				</view>
			</view>
		</view>
		
		<!-- 底部版权 -->
		<view class="footer">
			<view class="copyright">© 2025 宇青青宇备忘录 版权所有</view>
			<view class="slogan">记录每一次美好的相遇</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				
			}
		},
		methods: {
			goToSuggestion() {
				uni.navigateTo({
					url: '/pages/myTodo/suggestion'
				})
			}
		}
	}
</script>

<style lang="scss">
.about-page {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding-bottom: 40rpx;
}

// Logo区域
.logo-section {
	text-align: center;
	padding: 80rpx 40rpx 60rpx;
	
	.app-logo {
		width: 160rpx;
		height: 160rpx;
		border-radius: 32rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
	}
	
	.app-name {
		font-size: 48rpx;
		font-weight: bold;
		color: #c62828;
		margin-bottom: 12rpx;
	}
	
	.app-version {
		font-size: 24rpx;
		color: #999;
	}
}

// 区块标题
.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	padding: 0 30rpx;
	margin-bottom: 20rpx;
	position: relative;
	
	&::before {
		content: '';
		position: absolute;
		left: 30rpx;
		top: 50%;
		transform: translateY(-50%);
		width: 6rpx;
		height: 28rpx;
		background: #c62828;
		border-radius: 3rpx;
	}
	
	padding-left: 50rpx;
}

// 应用介绍
.intro-section {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx 20rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.intro-content {
		font-size: 28rpx;
		color: #666;
		line-height: 1.8;
		text-align: justify;
	}
}

// 数据库说明区块
.db-section {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx 20rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	// 感谢信息
	.thanks-box {
		background: #fff8e1;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 24rpx;
		
		.thanks-text {
			font-size: 26rpx;
			color: #666;
			line-height: 1.8;
			margin-bottom: 16rpx;
		}
		
		.thanks-list {
			.thanks-item {
				font-size: 24rpx;
				color: #999;
				line-height: 1.8;
				text-align: center;
			}
		}
	}
	
	// 信息区块
	.info-block {
		margin-bottom: 24rpx;
		
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
			
			.mt-20 {
				display: block;
				margin-top: 20rpx;
			}
		}
	}
}

// 联系信息
.contact-section {
	background: #fff;
	border-radius: 24rpx;
	margin: 0 30rpx 20rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.contact-info {
		.contact-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 20rpx 0;
			
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
	}
}

// 底部版权
.footer {
	text-align: center;
	padding: 40rpx 30rpx;
	
	.copyright {
		font-size: 24rpx;
		color: #999;
		margin-bottom: 12rpx;
	}
	
	.slogan {
		font-size: 26rpx;
		color: #c62828;
		font-style: italic;
	}
}
</style>
