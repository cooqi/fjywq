<template>
	<view class="page-container">
	<view class="calendar">
		  <EmbedCalendar
		    :show-top-section="true"
		    :greeting-text="customGreeting"
		    :signed-dates="signedDates"
		    :special-date-list="specialDateList"
		    :weekstart="1"
		    :open="true"
			:bgcolorGreeting="bgcolorGreeting"
			@on-click="handleDateClick"
			@today-plan-click="handleTodayPlanClick"
			@year-month-change="yearMonthChange"
			@month-change="MonthChange"
		  />
	  </view>
	<view class="content">
		<view class="uni-padding-wrap uni-common-mt segmented">
			<uni-segmented-control :current="current" :values="items" style-type="text"
				 @clickItem="onClickItem" />
		</view>
		
		<view v-if="current === 0" class="today">
			<view class="date">{{time}}<text class="displayText" v-if="dayText">{{dayText}}</text></view>
			<view v-for="item in dayInfo" :key="item._id" class="event-card today">
				<view :class="['title','title_'+item.type]">
					<text v-if="item.type == 2" class="lollipop-icon">🍭</text>
					{{item.title}}
				</view>
				<view class="bz" v-html="item.bz"></view>
				<view class="imgs" v-if="item.imgurl">
					<image @click="preImg(item.imgurl,index)" v-for="(img,index) in item.imgurl.split(';')" :key="index" class="img" :src="img" mode="aspectFill"></image>
				</view>
			</view>
			<view v-if="!dayInfo.length">当前日期暂无宇青当天事件，如需补充，请联系管理员，但你不一定联系得上</view>
		</view>
		<view v-if="current === 1" class="about">
			<view v-for="item in dayAboutInfo" :key="item._id" class="event-card ">
				<view class="date" v-if="item.date">
					<text v-for="(t,i) in setArr(item.date)" :key="i"><text :class="'t'+i">{{t}}</text><text v-show="i!=2">-</text></text>
					<text v-show="item.distanceInfo.displayText" class="displayText">{{item.distanceInfo.displayText}}</text>
				</view>
				<view :class="['title','title_'+item.type]">
					<text v-if="item.type == 2" class="lollipop-icon">🍭</text>
					{{item.title}}
				</view>
				<view class="bz" v-html="item.bz"></view>
				<view class="imgs" v-if="item.imgurl">
					<image @click="preImg(item.imgurl,index)" v-for="(img,index) in item.imgurl.split(';')" :key="index" class="img" :src="img" mode="aspectFill"></image>
				</view>
			</view>
			<view v-if="!dayAboutInfo.length">当前日期暂无宇青相关事件，如需补充，请联系管理员，虽然你不一定联系得上</view>
		</view>
		
		<view class="edit" @click="edit" v-if="canEditCalendar">编辑</view>
		<view class="search-btn" @click="toSearch">
			<uni-icons type="search" size="24" color="#fff"></uni-icons>
		</view>
		
	</view>

	</view>

</template>

<script>
	import EmbedCalendar from '../../components/fd-EmbedCalendar/fd-EmbedCalendar.vue'
	import {processJQLResults} from './rili.js'
	import { hasCalendarPermission } from '@/common/js/permission.js'
	export default {
		components: {
		  EmbedCalendar
		},
		data() {
			return {
				 userAvatar: '/static/user-avatar.png',
				  customGreeting: '杯杯儿，今天也要加油哦！',
				  //1 onlyFJY 2onlyWQ 3all
				  signedDates: [], // 已签到日期
				  specialDateList: [], // 特殊日期列表（包含type字段）
				  allRili:[],
				  dayInfo:[],
				  dayAboutInfo:[],
				  bgcolorGreeting:'',
				  items: ['当天事件', '相关事件'],
				  current: 0,
				time:'',
				userInfo:'',
				dayText:'',
				currentMonth: '',
				canEditCalendar: false, // 是否有日历编辑权限
			}
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
			uni.setNavigationBarTitle({
				title: this.userInfo.loveType||'宇青99'
			})
		},
		onLoad() {
			this.time=this.formatDate(new Date())
			this.getList()
			this.useCommon()
			try {
				const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
				// 检查日历编辑权限
				this.canEditCalendar = hasCalendarPermission(this.userInfo, 'add') || hasCalendarPermission(this.userInfo, 'edit')
			} catch (e) {
				// error
			}
		},
		// 页面刷新方法
		onPullDownRefresh() {
			this.getList(this.currentMonth)
			this.useCommon()
		},
		watch:{
			dayAboutInfo:{
				handler(val){
					let len= val.length
					if(len){
						this.items[1]=`相关事件(${len}条)`
					}else{
						this.items[1]='相关事件'
					}
				},
				immediate:true,
				deep:true
			}
		},
		onShareAppMessage: function () {
		   return {
		     title: '宇青青宇全肯定',
		     path: '/pages/rili/rili'
		   }
		 },
		 onShareTimeline: function () {
		    return {
		      title: '宇青青宇全肯定'
		    }
		  },
		methods: {
			edit(){
				uni.navigateTo({
					url: '/pages/edit/rili'
				});
			},
			setArr(date){
				if(!date) return [];
				let arr=date.split('-')
				return arr
			},
			
			// 日期点击事件
			    handleDateClick(dateInfo) {
			     // console.log('选中日期:', dateInfo);
			      // dateInfo 包含：date, year, month, day, isToday
				  let {month, day,date}=dateInfo
				  this.time=date
				  this.getDetail(date)
			    },
			
			    // 月份变化事件
			    handleMonthChange(monthInfo) {
			     // console.log('月份变化:', monthInfo);
			      // monthInfo 包含：year, month
				 
			    },
			
			    // 今日计划点击事件
			    handleTodayPlanClick(val) {
					
				  this.time=this.formatDate(new Date())
			      this.getDetail()
				  //获取列表
				  let m=new Date().getMonth()+1
				  this.getList(m)
			    },
				//年月切换
				yearMonthChange(val){
					let month=val.split('-')[1]	
					this.dayInfo=[]
					this.dayAboutInfo=[]
					this.current=0
					this.time=''
					this.dayText=''
					this.getList(month)
					this.useCommon()
				},
				MonthChange(val){
					this.dayInfo=[]
					this.dayAboutInfo=[]
					this.current=0
					this.time=''
					this.dayText=''
					this.getList(val.month)
					this.useCommon()
				},
			
			getList(month, year) {
				let m=month
				let y=year
				let currentMonth=new Date().getMonth() + 1
				if(!month){
					m=currentMonth;
				}
				this.currentMonth=m
				uni.showLoading({
					title: '处理中...'
				})
				uniCloud.callFunction({
					name: 'rili-get',
					data:{
						month:m,
						year:y
					}
				}).then((res) => {
					uni.hideLoading()
					this.allRili=JSON.parse(JSON.stringify(res.result.data))

					if(currentMonth===m){
						this.time=this.formatDate(new Date())
						this.getDetail()
					}
					const arr=res.result.data.map(item=>{
						let d=item.date.split('-')
						d.shift()
						return d.join('-')
					})
					this.signedDates= [...new Set(arr)];
									
					// 构建特殊日期列表（type=2的数据）
					this.specialDateList = res.result.data
						.filter(item => item.type == 2)
						.map(item => ({
							date: item.date,
							type: item.type
						}));
					console.log('特殊日期列表:', this.specialDateList);
				}).catch((err) => {
					uni.hideLoading()
					uni.showModal({
						content: `查询失败，错误信息为：${err.message}`,
						showCancel: false
					})
					console.error(err)
				})
			},
			onClickItem(e) {
				if (this.current !== e.currentIndex) {
					this.current = e.currentIndex
				}
			},
			formatDate(date) {
			  const year = date.getFullYear();
			  const month = String(date.getMonth() + 1).padStart(2, '0');
			  const day = String(date.getDate()).padStart(2, '0');
			  return `${year}-${month}-${day}`;
			},
			getDetail(time) {
				this.current=0
				const now=time?new Date(time.replace(/-/g,'/')):new Date()
				
				const year=now.getFullYear()
				// 获取月份 (0-11, 0表示一月)
				const month = now.getMonth() + 1; // 需要 +1 得到实际月份
				// 获取日期 (1-31)
				const day = now.getDate();
				
				//和今天日期相关的事件
				let data=this.allRili.filter(item=>{
					const t=new Date(item.date.replace(/-/g,'/'));
					const m=t.getMonth() + 1;
					const d=t.getDate()
					//console.log(time,month,day,m,d,item)
					const tt=this.formatDate(t)
					const nn=this.formatDate(now)
					return month===m&&day===d&&tt!=nn
					
				})
				this.dayAboutInfo=processJQLResults(data)
					
				
				//今天
				let data2=this.allRili.filter(item=>{
					const t=new Date(item.date.replace(/-/g,'/'));
					const tt=this.formatDate(t)
					const nn=this.formatDate(now)
					return tt===nn
					
				})
				this.dayInfo=processJQLResults(data2)
				this.dayText=this.dayInfo[0]?.distanceInfo.displayText||''
				if(!this.dayInfo.length&&this.dayAboutInfo.length){
					this.current=1
				}else{
					this.current=0
				}
			},
			useCommon() {
				
				uniCloud.callFunction({
					name: 'welcome',
					data:{
						type:'get'
					}
				}).then((res) => {
					let data=res.result.data[0]
					this.customGreeting=data.title || '杯杯儿，你们最棒'
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
			},
			preImg(imgs,i){
				// 预览图片
				const urls=imgs.split(';')||[]
						uni.previewImage({
							urls ,
							current :i,
							longPressActions: {
								itemList: ['发送给朋友', '保存图片', '收藏'],
								success: function(data) {
									console.log('选中了第' + (data.tapIndex + 1) + '个按钮,第' + (data.index + 1) + '张图片');
								},
								fail: function(err) {
									console.log(err.errMsg);
								}
							}
						});
			},
			toSearch(){
				uni.navigateTo({
					url: '/pages/rili/search'
				});
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 1px
}

.calendar {
	background:rgba(255, 255, 255, 0.2);
	border-radius: 24rpx;
	margin: 20rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

	.content {
		padding: 24rpx;
		background: linear-gradient(135deg, #cff8f533 0%, #e6cffc36 100%);
		border-radius: 16rpx;
		margin: 20rpx;
		box-shadow: 0 0 18rpx 7rpx rgba(0, 0, 0, 0.1);
		.title{
			font-weight: 600;
			font-size: 32rpx;
			color: #fff;
			position: relative;
			margin: 5px 0;
			&:before{
				position: absolute;
				content: '';
				width: 8rpx;
				height: 8rpx;
				border-radius: 100%;
				background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
				top: 50%;
				transform: translateY(-50%);
				left: -16rpx;
			}
		}
		.title_2{
			color: #f349ac;
		}
		
		.lollipop-icon {
			font-size: 32rpx;
			margin-right: 8rpx;
			vertical-align: middle;
		}
		.bz{
			color: #333;
		}
		.date{
			font-size: 40rpx;
			font-weight: bold;
			color: #fff;
			
		}
		.about{
			.title{
				
				&:before{
					background:transparent;
				}
			}
			.date{
				.t0{
					color: #31eee0;
				}
			}
			
		}
	}
	.event-card {
			background:linear-gradient(135deg, rgba(188, 159, 255, 0.3) 0%, rgba(145, 228, 243, 0.2) 80% ,rgba(145, 228, 243, 0.4) 90%, 	rgba(145, 228, 243, 0.8) 98%, rgba(145, 228, 243, .9) 100%);

		border-radius: 0  15px 15px 0;
		padding: 24rpx;
		margin: 16rpx 0;
		box-shadow: 0 0 8rpx 5rpx rgba(0, 0, 0, 0.06);
		border-left: 10rpx solid #8b5cf6;
		&.today{
			border-left: 10rpx solid #8bf5ee;
		background:linear-gradient(135deg, rgba(159, 255, 255, 0.3) 0%, rgba(143, 51, 248, 0.2) 80% ,rgba(143, 51, 248, 0.4) 90%, rgba(143, 51, 248, 0.8) 95%, rgba(143, 51, 248, .9) 100%);

		}
		
		&:last-child {
			margin-bottom: 0;
		}
		
		.event-title {
			font-size: 30rpx;
			font-weight: 600;
			color: #bed3f7;
			margin-bottom: 12rpx;
		}
		
		.event-bz {
			font-size: 26rpx;
			color: #718096;
			line-height: 1.6;
		}
	}
	.displayText{
		font-weight: 400;
		margin-left: 20rpx;
		font-size: 30rpx;
		color: #eff179;
	}
	.info{
		margin: 16rpx 0;
		border-bottom: 1rpx dashed rgba(139, 92, 246, 0.2);
		padding: 16rpx 0;
		&:last-child{
			border-bottom:none;
		}
	}
	.edit{
		position: fixed;
		right: 10rpx;
		bottom: 140rpx;
		border-radius: 50%;
		width: 80rpx;
		height: 80rpx;
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		color: #fff;
		font-size: 24rpx;
		line-height: 80rpx;
		text-align: center;
		box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.3);
		transition: all 0.3s ease;
		
		&:active {
			transform: scale(0.95);
		}
	}
	
	.search-btn{
		position: fixed;
		right: 10rpx;
		bottom: 40rpx;
		border-radius: 50%;
		width: 80rpx;
		height: 80rpx;
		background: linear-gradient(135deg, #8bf5ee 0%, #5dd9d1 100%);
		color: #fff;
		font-size: 24rpx;
		line-height: 80rpx;
		text-align: center;
		box-shadow: 0 8rpx 24rpx rgba(139, 245, 238, 0.3);
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		
		&:active {
			transform: scale(0.95);
		}
	}
	
	.segmented{
		margin-bottom: 30rpx;
	}

	.watermark {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 20px;
		color: #999;
	}
	.imgs{
		display: flex;
		flex-wrap: wrap;
		
		.img{
			width: 50px;height: 50px;margin: 10px;
		}
	}
</style>