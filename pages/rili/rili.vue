<template>
	<view class="page-container">
	<view class="calendar">
		  <EmbedCalendar
			ref="calendar"
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
			<view class="date" @click.stop="navigateToDate(time)">{{time}}<text class="displayText" v-if="dayText">{{dayText}}</text></view>
			<view v-for="item in dayInfo" :key="item._id" class="event-card today" @click="navigateToDate(item.date)">
				<view :class="['title','title_'+item.type]"  @click.stop="editItem(item)">
					<text v-if="item.type == 2" class="lollipop-icon">🍭</text>
					{{item.title}}
				</view>
				<view class="bz">
					<template v-for="(seg, si) in parseBz(item.bz)">
						<text v-if="seg.isDate" :key="'d-'+si" class="inline-date" @click.stop="navigateToDate(seg.text)">{{seg.text}}</text>
						<text v-else :key="'t-'+si">{{seg.text}}</text>
					</template>
				</view>
				<view class="related-dates" v-if="item.relatedDates" @click.stop>
					<text class="related-dates-label">📅 关联日期</text>
					<view class="related-dates-tags">
						<text class="related-date-tag" v-for="(d,di) in item.relatedDates.split(',')" :key="di" @click="navigateToDate(d)">{{d}}</text>
					</view>
				</view>
				<view class="imgs" v-if="item.imgurl" @click.stop>
					<image @click="preImg(item.imgurl,index)" v-for="(img,index) in item.imgurl.split(';')" :key="index" class="img" :src="img" mode="aspectFill"></image>
				</view>
			</view>
			<view v-if="!dayInfo.length">当前日期暂无宇青当天事件，如需补充，请联系管理员，但你不一定联系得上</view>
		</view>
		<view v-if="current === 1" class="about">
			<view v-for="item in dayAboutInfo" :key="item._id" class="event-card "  >
				<view class="date" v-if="item.date" @click.stop="navigateToDate(item.date)">
					<text v-for="(t,i) in setArr(item.date)" :key="i" ><text :class="'t'+i">{{t}}</text><text v-show="i!=2">-</text></text>
					<text v-show="item.distanceInfo.displayText" class="displayText">{{item.distanceInfo.displayText}}</text>
				</view>
				<view :class="['title','title_'+item.type]" @click="editItem(item)">
					<text v-if="item.type == 2" class="lollipop-icon">🍭</text>
					{{item.title}}
				</view>
				<view class="bz">
					<template v-for="(seg, si) in parseBz(item.bz)">
						<text v-if="seg.isDate" :key="'d-'+si" class="inline-date" @click.stop="navigateToDate(seg.text)">{{seg.text}}</text>
						<text v-else :key="'t-'+si">{{seg.text}}</text>
					</template>
				</view>
				<view class="related-dates" v-if="item.relatedDates" @click.stop>
					<text class="related-dates-label">📅 关联日期</text>
					<view class="related-dates-tags">
						<text class="related-date-tag" v-for="(d,di) in item.relatedDates.split(',')" :key="di" @click="navigateToDate(d)">{{d}}</text>
					</view>
				</view>
				<view class="imgs" v-if="item.imgurl" @click.stop>
					<image @click="preImg(item.imgurl,index)" v-for="(img,index) in item.imgurl.split(';')" :key="index" class="img" :src="img" mode="aspectFill"></image>
				</view>
			</view>
			<view v-if="!dayAboutInfo.length">当前日期暂无宇青相关事件，如需补充，请联系管理员，虽然你不一定联系得上</view>
		</view>
		
		<view class="edit" @click="edit" v-if="canEditCalendar">编辑</view>
		<view class="holiday-admin-btn" @click="toHolidayAdmin" v-if="isAdminUser">🎨</view>
		<view class="search-btn" @click="toSearch">
			<uni-icons type="search" size="24" color="#fff"></uni-icons>
		</view>
		
	</view>
	
	<!-- 节日祝福弹窗 -->
	<uni-popup ref="holidayPopup" type="center" :mask-click="true" :safe-area="true">
		<view class="holiday-popup" v-if="currentHoliday">
			<view class="holiday-popup-bg" v-if="currentHoliday.bgImage" :style="{backgroundImage: 'url(' + currentHoliday.bgImage + ')'}"></view>
			<view class="holiday-popup-overlay"></view>
			<view class="holiday-popup-content">
				<view class="holiday-popup-emoji">{{currentHoliday.emoji}}</view>
				<view class="holiday-popup-title">{{currentHoliday.name}}</view>
				<view class="holiday-popup-deco">
					<text>{{currentHoliday.emojiLeft}} {{currentHoliday.emojiRight}}</text>
				</view>
				<view class="holiday-popup-remark">
					<text class="remark-text">{{currentHoliday.remark}}</text>
				</view>
			</view>
		</view>
	</uni-popup>

</view>

</template>

<script>
	import EmbedCalendar from '../../components/fd-EmbedCalendar/fd-EmbedCalendar.vue'
	import {processJQLResults} from './rili.js'
	import { hasCalendarPermission, isAdmin } from '@/common/js/permission.js'
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
				currentHoliday: null, // 当前节日配置（从数据库获取）
				isAdminUser: false, // 是否为管理员
			}
		},
		computed: {},
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
			this.getHolidayConfig()
			try {
				const userInfo = uni.getStorageSync('userInfo');
				this.userInfo=JSON.parse(userInfo)
				// 检查日历编辑权限
				this.canEditCalendar = hasCalendarPermission(this.userInfo, 'add') || hasCalendarPermission(this.userInfo, 'edit')
				this.isAdminUser = isAdmin(this.userInfo)
			} catch (e) {
				// error
			}
		},
		// 页面刷新方法
		onPullDownRefresh() {
			Promise.all([
				this.getList(this.currentMonth),
				this.useCommon(),
				this.getHolidayConfig()
			]).finally(() => {
				uni.stopPullDownRefresh()
			})
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
			},
			currentHoliday(val) {
				if(val) {
					// 数据变化后等待组件渲染完成再打开弹窗
					this.$nextTick(() => {
						setTimeout(() => {
							if(this.$refs.holidayPopup) {
								this.$refs.holidayPopup.open()
							}
						}, 300)
					})
				}
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
			// 从数据库获取今日节日配置
			getHolidayConfig() {
				return uniCloud.callFunction({
					name: 'holiday-config',
					data: { action: 'getToday' }
				}).then((res) => {
					if(res.result.code === 0 && res.result.data) {
						this.currentHoliday = res.result.data
					} else {
						this.currentHoliday = null
					}
				}).catch((err) => {
					console.error('获取节日配置失败:', err)
					this.currentHoliday = null
				})
			},
			// 关闭节日弹窗
			closeHolidayPopup() {
				if(this.$refs.holidayPopup) {
					this.$refs.holidayPopup.close()
				}
			},
			// 跳转节日装饰管理页
			toHolidayAdmin() {
				uni.navigateTo({
					url: '/pages/rili/holiday-admin'
				})
			},
			edit(){
				uni.navigateTo({
					url: '/pages/edit/rili'
				});
			},
			editItem(item){
				if(!this.canEditCalendar) return
				uni.navigateTo({
					url: '/pages/edit/rili?itemData=' + encodeURIComponent(JSON.stringify(item))
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
				return uniCloud.callFunction({
					name: 'rili-get',
					data:{
						month:m,
						year:y
					}
				}).then(async (res) => {
					uni.hideLoading()
					this.allRili=JSON.parse(JSON.stringify(res.result.data))

					await this.convertImageUrls(this.allRili)

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
			async convertImageUrls(dataList) {
				const cloudFileIDs = []
				const urlMap = {}
				
				dataList.forEach((item, index) => {
					if (item.imgurl) {
						const fileIDs = item.imgurl.split(';').filter(img => img)
						fileIDs.forEach(fileID => {
							if (fileID.startsWith('cloud://')) {
								cloudFileIDs.push(fileID)
							} else {
								urlMap[fileID] = fileID
							}
						})
					}
				})
				
				if (cloudFileIDs.length === 0) return
				
				try {
					const urlRes = await uniCloud.getTempFileURL({
						fileList: cloudFileIDs
					})
					
					urlRes.fileList.forEach(item => {
						urlMap[item.fileID] = item.tempFileURL || item.fileID
					})
					
					dataList.forEach(item => {
						if (item.imgurl) {
							const fileIDs = item.imgurl.split(';').filter(img => img)
							const tempUrls = fileIDs.map(fileID => urlMap[fileID] || fileID)
							item.imgurl = tempUrls.join(';')
						}
					})
				} catch (err) {
					console.error('获取图片临时URL失败:', err)
				}
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
				
				return uniCloud.callFunction({
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
			},
			parseBz(bz) {
				if(!bz) return [{text:'', isDate:false}]
				const segments = []
				const regex = /【(\d{4}-\d{1,2}-\d{1,2})】/g
				let lastIndex = 0
				let match
				while((match = regex.exec(bz)) !== null) {
					if(match.index > lastIndex) {
						segments.push({text: bz.slice(lastIndex, match.index), isDate: false})
					}
					segments.push({text: match[1], isDate: true})
					lastIndex = match.index + match[0].length
				}
				if(lastIndex < bz.length) {
					segments.push({text: bz.slice(lastIndex), isDate: false})
				}
				return segments.length ? segments : [{text: bz, isDate: false}]
			},
			async navigateToDate(dateStr) {
				if(!dateStr) return
				const parts = dateStr.split('-')
				if(parts.length !== 3) return
				const year = parseInt(parts[0])
				const month = parseInt(parts[1])
				const day = parseInt(parts[2])
				const formattedDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
				
				// 跳转日历到目标月份
				const cal = this.$refs.calendar
				if(cal) {
					cal.y = year
					cal.m = month - 1
					cal.dates = cal.monthDay(cal.y, cal.m)
					cal.choose = `${year}-${month}-${day}`
				}
				
				this.time = formattedDate
				
				// 如果月份变了，需要先重新加载该月数据，再展示详情
				if(this.currentMonth !== month) {
					await this.getList(month, year)
				}
				this.getDetail(formattedDate)
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	padding: 1px;
	position: relative;
	overflow: hidden;
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
			white-space: pre-wrap;
			word-break: break-word;
			line-height: 1.6;
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
					color: #7de6df;
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
		position: relative;
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
	.event-card-hover {
		opacity: 0.85;
		transform: scale(0.98);
	}
	.displayText{
		font-weight: 400;
		margin-left: 20rpx;
		font-size: 30rpx;
		color: #f5f795;
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
	
	.holiday-admin-btn{
		position: fixed;
		right: 10rpx;
		bottom: 240rpx;
		border-radius: 50%;
		width: 80rpx;
		height: 80rpx;
		background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
		color: #fff;
		font-size: 36rpx;
		line-height: 80rpx;
		text-align: center;
		box-shadow: 0 8rpx 24rpx rgba(255, 154, 158, 0.3);
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
	.inline-date {
		color: #4facfe;
		background: rgba(79, 172, 254, 0.1);
		padding: 2rpx 12rpx;
		border-radius: 8rpx;
		border: 1rpx solid rgba(79, 172, 254, 0.3);
		font-size: 28rpx;
		margin: 0 4rpx;
	}
	.related-dates {
		margin-top: 16rpx;
		padding-top: 16rpx;
		border-top: 1rpx dashed rgba(139, 92, 246, 0.2);
		
		.related-dates-label {
			font-size: 24rpx;
			color: #8b5cf6;
			margin-bottom: 12rpx;
			display: block;
		}
		
		.related-dates-tags {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;
		}
		
		.related-date-tag {
			font-size: 24rpx;
			color: #8b5cf6;
			background: rgba(139, 92, 246, 0.1);
			padding: 6rpx 16rpx;
			border-radius: 20rpx;
			border: 1rpx solid rgba(139, 92, 246, 0.25);
		}
	}
	.imgs{
		display: flex;
		flex-wrap: wrap;
		
		.img{
			width: 50px;height: 50px;margin: 10px;
		}
	}

/* 节日祝福弹窗 */
.holiday-popup {
	width: 560rpx;
	border-radius: 32rpx;
	text-align: center;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
	position: relative;
	overflow: hidden;
	min-height: 400rpx;
}

/* 背景图层 */
.holiday-popup-bg {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	z-index: 1;
}

/* 半透明遮罩，保证文字可读 */
.holiday-popup-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.35);
	z-index: 2;
}

/* 内容层 */
.holiday-popup-content {
	position: relative;
	z-index: 3;
	    height: 70vh;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
}

.holiday-popup-emoji {
	font-size: 100rpx;
	margin-bottom: 24rpx;
	animation: holidayBounce 1s ease-in-out infinite;
}

.holiday-popup-title {
	font-size: 36rpx;
	font-weight: 700;
	color: #fff;
	margin-bottom: 16rpx;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

.holiday-popup-deco {
	font-size: 40rpx;
	margin-bottom: 40rpx;
	opacity: 0.9;
}


.holiday-popup-remark{
	width: 90%;
	text-align: center;
	line-height: 160%;
	margin: 0 auto;
	background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
	color: #fff;
	border-radius: 36rpx;
	font-size: 28rpx;
	font-weight: 500;
	box-shadow: 0 8rpx 24rpx rgba(139, 92, 246, 0.3);
	padding: 16rpx 32rpx;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
}

@keyframes holidayBounce {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.1); }
}
</style>