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
			@year-month-change="yearMonthChange"
			@month-change="yearMonthChange"
		  />
	  </view>
	<view class="content">
		<view class="uni-padding-wrap uni-common-mt segmented">
			<uni-segmented-control :current="current" :values="items" style-type="text"
				 @clickItem="onClickItem" />
		</view>
		
		<view v-if="current === 0" class="today">
			<view class="date">{{time}}</view>
			<view v-for="item in dayInfo" :key="item._id" class="info">
				
				<view class="title">{{item.title}}</view>
				<view class="bz" v-html="item.bz"></view>
			</view>
			<view v-if="!dayInfo.length">当前日期暂无青宇当天事件，如需补充，请联系管理员，如不认识管理员请小红书发帖带上tag#宇青青宇备忘录#，管理员看到后会核实添加</view>
		</view>
		<view v-if="current === 1" class="about">
			<view v-for="item in dayAboutInfo" :key="item._id" class="info">
				<view class="date" v-if="item.date">
					<text v-for="(t,i) in setArr(item.date)" :key="i"><text :class="'t'+i">{{t}}</text><text v-show="i!=2">-</text></text>
					<text v-show="item.distanceInfo.displayText" class="displayText">{{item.distanceInfo.displayText}}</text>
				</view>
				<view class="title">{{item.title}}</view>
				<view class="bz" v-html="item.bz"></view>
			</view>
			<view v-if="!dayAboutInfo.length">当前日期暂无青宇相关事件，如需补充，请联系管理员，如不认识管理员请小红书发帖带上tag#宇青青宇备忘录#，管理员看到后会核实添加</view>
		</view>
		
		
	</view>
</template>

<script>
	import EmbedCalendar from '../../components/fd-EmbedCalendar/fd-EmbedCalendar.vue'
	import {processJQLResults} from './rili.js'
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
				  allRili:[],
				  dayInfo:[],
				  dayAboutInfo:[],
				  bgcolorGreeting:'',
				  items: ['当天事件', '相关事件'],
				  current: 0,
				time:''
			}
		},
		onLoad() {
			this.getList()
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
				  this.getDetail(date)
			    },
			
			    // 月份变化事件
			    handleMonthChange(monthInfo) {
			     // console.log('月份变化:', monthInfo);
			      // monthInfo 包含：year, month
			    },
			
			    // 今日计划点击事件
			    handleTodayPlanClick() {
			      this.getDetail()
			    },
				//年月切换
				yearMonthChange(){
					this.dayInfo=[]
					this.dayAboutInfo=[]
					this.current=0
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
					//console.log(res)
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
					//console.log(res)
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
					//console.log('arr',arr)
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
				this.time=year+'-'+month+'-'+day
				
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
					
				
				this.dayInfo=this.allRili.filter(item=>{
					const t=new Date(item.date.replace(/-/g,'/'));
					const m=this.formatDate(t)
					const n=this.formatDate(now)
					//console.log(1,m,n)
					return m===n
					
				})
				if(!this.dayInfo.length&&this.dayAboutInfo.length){
					this.current=1
				}else{
					this.current=0
				}
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
		.title{
			font-weight: 600;
			color: #926eff;
			position: relative;
			&:before{
				position: absolute;
				content: '';
				width:5px;
				height: 5px;
				border-radius: 100%;
				background:#926eff ;
				top:0;
				bottom: 0;
				margin: auto;
				left: -7px;
			}
		}
		.date{
			font-size: 20px;
			font-weight: bold;
			
		}
		.about{
			.title{
				
				&:before{
					background:transparent ;
				}
			}
			.date{
				.t0{
					color: #aaffff;
				}
			}
			.displayText{
				font-weight: 100;
				margin-left: 20px;
				font-size: 14px;
				color: #aaffff;
			}
		}
	}
	.info{
		margin: 10px 0;
		border-bottom: 1px dashed #fff;
		padding: 10px 0;
		&:last-child{
			border-bottom:none;
		}
	}
	
	.segmented{
		margin-bottom: 15px;;
	}

	
</style>