<template>
	<view class="calendar">
		  <EmbedCalendar
		    :show-top-section="true"
		    :greeting-text="customGreeting"
		    :signed-dates="signedDates"
		    :weekstart="1"
		    :open="true"
			:bgcolorGreeting="bgcolorGreeting"
			@on-click="handleDateClick"
			@today-plan-click="handleTodayPlanClick"
		  />
	  </view>
	<view class="content">
		<view v-for="item in dayInfo" :key="item._id" class="info">
			<view class="date">{{item.date}}</view>
			<view class="title">{{item.title}}</view>
			<view class="bz">{{item.bz}}</view>
		</view>
		<view v-if="!dayInfo.length">当前日期暂无相青宇关信息，如需补充，请留言，待管理员审核确认添加</view>
		
	</view>
</template>

<script>
	import EmbedCalendar from '../../components/fd-EmbedCalendar/fd-EmbedCalendar.vue'
	export default {
		components: {
		  EmbedCalendar
		},
		data() {
			return {
				 userAvatar: '/static/user-avatar.png',
				  customGreeting: '豹豹杯杯儿，今天也要加油哦！',
				  //1 onlyFJY 2onlyWQ 3all
				  signedDates: [], // 已签到日期
				  allRili:[],
				  dayInfo:[],
				  bgcolorGreeting:''
			}
		},
		onLoad() {
			this.getList()
			this.useCommon()
			
		},
		onShareAppMessage: function () {
		   return {
		     title: '宇青青宇全肯定',
		     path: '/pages/cloudFunction/cloudFunction'
		   }
		 },
		 onShareTimeline: function () {
		    return {
		      title: '宇青青宇全肯定'
		    }
		  },
		methods: {
			// 日期点击事件
			    handleDateClick(dateInfo) {
			      console.log('选中日期:', dateInfo);
			      // dateInfo 包含：date, year, month, day, isToday
				  let {month, day,date}=dateInfo
				  this.getDetail(date)
			    },
			
			    // 月份变化事件
			    handleMonthChange(monthInfo) {
			      console.log('月份变化:', monthInfo);
			      // monthInfo 包含：year, month
			    },
			
			    // 今日计划点击事件
			    handleTodayPlanClick() {
			      this.getDetail()
			    },
			add() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-add',
					data: {
						product: 'uniCloud',
						create_time: Date.now()
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: `成功添加一条数据，文档id为：${res.result.id}`,
						showCancel: false
					})
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `添加数据失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			remove() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'remove'
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: res.result.msg,
						showCancel: false
					})
					console.log(res)
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `删除失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			update() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'update',
					data: {
						product: 'uni-app',
						create_time: Date.now()
					}
				}).then((res) => {
					uni.hideLoading()
					uni.showModal({
						content: res.result.msg,
						showCancel: false
					})
					console.log(res)
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `更新操作执行失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			getList() {
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-get'
				}).then((res) => {
					uni.hideLoading()
					this.allRili=JSON.parse(JSON.stringify(res.result.data))
					this.getDetail()
					const arr=res.result.data.map(item=>{
						let d=item.date.split('-')
						d.shift()
						return d.join('-')
					})
					this.signedDates= [...new Set(arr)];
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			getDetail(time) {
				const now=time?new Date(time.replace(/-/g,'/')):new Date()
		
				// 获取月份 (0-11, 0表示一月)
				const month = now.getMonth() + 1; // 需要 +1 得到实际月份
				// 获取日期 (1-31)
				const day = now.getDate();
				
				this.dayInfo=this.allRili.filter(item=>{
					const t=new Date(item.date.replace(/-/g,'/'));
					const m=t.getMonth() + 1;
					const d=t.getDate()
					console.log(time,month,day,m,d,item)
					return month===m&&day===d
					
				})
			},
			useCommon() {
				
				uniCloud.callFunction({
					name: 'welcome'
				}).then((res) => {
					let data=res.result.data[0]
					this.customGreeting=data.title || '豹豹杯杯儿，你们最棒'
					this.bgcolorGreeting=data.bgcolor
				}).catch((err) => {
					uni.showModal({
						content: `云函数use-common执行失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			toRedisPage(){
				uni.navigateTo({
					url:'/pages/cloudFunction/redis/redis'
				})
			}
		}
	}
</script>

<style lang="scss">
	.content {
		padding: 20px;
		background: #aaa1ce;
		color: #fff;
	}
	.info{
		margin: 10px 0;
		border-bottom: 1px dashed #fff;
		padding: 10px 0;
		&:last-child{
			border-bottom:none;
		}
	}
	
	.date{
		font-size: 20px;
		font-weight: bold;
	}

	
</style>