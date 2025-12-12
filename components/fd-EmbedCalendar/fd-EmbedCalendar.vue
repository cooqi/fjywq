<template>
	<view class="sign-calendar">
		<!--顶部区域-->
		<view class="top-section" v-if="showTopSection">
			<view class="greeting-area">
				<!-- 	<image class="avatar" :src="avatarSrc || '/static/logo.png'" mode="aspectFill"
						@error="onImageError"></image> -->
				<view class="speech-bubble" :style="{'background':bgcolorGreeting}">
					<text class="greeting-text" >{{ greetingText }}</text>
				</view>
				<!-- <view class="avatar-section">
					<text class="plan-title">宇青日历</text>
				</view> -->
				<view class="plan-section">
					<view class="plan-indicator" @click="onTodayPlanClick">今</view>
				</view>
			</view>
		</view>

		<!-- 年月显示与导航箭头 -->
		<view class="header">
			<view class="year-month-section">
				<view class="year-month">
					<view class="title" @click="changeYM">{{ y }}年 {{ m + 1 }}月</view>
				</view>

				<!-- 月/周视图切换按钮 -->
				<view class="view-toggle">
					<view class="arrow-btn" @click="turning('prev')">
						<text class="arrow-icon">‹</text>
					</view>
					<view class="toggle-item" :class="{ active: monthOpen }" @click="switchToMonth">
						月
					</view>
					<view class="toggle-item" :class="{ active: !monthOpen }" @click="switchToWeek">
						周
					</view>
					<view class="arrow-btn" @click="turning('next')">
						<text class="arrow-icon">›</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 星期行显示 -->
		<view class="week-header">
			<view v-for="(item, index) in weekDay" :key="index" class="week-item">
				{{ item }}
			</view>
		</view>

		<!-- 日历网格 -->
		<view class="calendar-grid" :class="{ 'week-view': !monthOpen }">
			<view class="grid-container" :style="{ transform: `translateY(${positionTop}rpx)` }">
				<view v-for="(item, index) in dates" :key="index" class="date-item" :class="{ 'other-month': !item.lm }"
					@click="selectOne(item, $event)">
					<view class="date-circle" :class="{
              selected: choose == `${item.year}-${item.month + 1}-${item.date}`,
              today: isToday(item.year, item.month, item.date) && item.lm,
              'special-date':
                isSigned(item.year, item.month + 1, item.date) && item.lm,
              disabled: !item.lm,
            }">
						{{ item.date }}
					</view>
				</view>
			</view>
		</view>
		
		<jpTimePicker ref='date-time' datestype="year-month" :datestring='dateString' @confirm='dateTimeChange'></jpTimePicker>
	</view>
</template>

<script>
	 import jpTimePicker from '@/components/jp-timePicker/jp-timePicker.vue'
	export default {
		name: "EmbedCalendar",
		components: {
			jpTimePicker
		},
		props: {
			// 第一列星期几
			weekstart: {
				type: Number,
				default: 7,
			},
			// 已经签到的日期
			signedDates: {
				type: Array,
				default: () => [],
			},
			// 是否展开
			open: {
				type: Boolean,
				default: true,
			},
			// 头像图片路径
			avatarSrc: {
				type: String,
				default: "",
			},
			// 问候语文本
			greetingText: {
				type: String,
				default: "我闻着饼香来到到街中央",
			},
			// 是否显示顶部区域
			showTopSection: {
				type: Boolean,
				default: true,
			},
			bgcolorGreeting: {//欢迎词背景
				type: String,
				default: "#c3ffff",
			},
		},
		data() {
			return {
				text: {
					year: "年",
					month: "月",
					week: ["一", "二", "三", "四", "五", "六", "日"],
					today: "今",
				},
				y: new Date().getFullYear(), // 年
				m: new Date().getMonth(), // 月
				dates: [], // 当前月日期集合
				positionTop: 0,
				monthOpen: true,
				choose: "",
				currentWeekIndex: 0, // 当前周的索引（用于周视图导航）
				selectedDate: null, // 当前选中的日期对象（用于周视图定位）
				dateString:''
			};
		},
		created() {
			// 获取当前日期
			let date = new Date();
			this.y = date.getFullYear();
			this.m = date.getMonth();

			this.dates = this.monthDay(this.y, this.m);

			// 根据 open 属性设置初始视图状态
			this.monthOpen = this.open;

			// 如果初始状态是周视图，需要计算位置
			if (!this.open) {
				let index = -1;
				this.dates.forEach((i, x) => {
					this.isToday(i.year, i.month, i.date) && (index = x);
				});
				this.positionTop = -((Math.ceil((index + 1) / 7) || 1) - 1) * 80;
			}
		},
		mounted() {
			let date = new Date();
			let y = date.getFullYear();
			let m = date.getMonth();
			let d = date.getDate();

			// 不设置初始选中状态，只设置定位信息
			this.choose = "";

			// 设置选中的日期对象（用于周视图定位）
			this.selectedDate = {
				year: y,
				month: m,
				date: d,
			};

			console.log("初始化完成，无选中状态");

			// 如果初始状态是周视图，更新位置
			if (!this.monthOpen) {
				this.updateWeekPosition();
			}
		},
		computed: {
			// 顶部星期栏目
			weekDay() {
				return this.text.week
					.slice(this.weekstart - 1)
					.concat(this.text.week.slice(0, this.weekstart - 1));
			},
			height() {
				return (this.dates.length / 7) * 80 + "upx";
			},
		},
		methods: {
			// 获取当前月份天数
			monthDay(y, m) {
				let firstDayOfMonth = new Date(y, m, 1).getDay(); // 当月第一天星期几
				let lastDateOfMonth = new Date(y, m + 1, 0).getDate(); // 当月最后一天
				let lastDayOfLastMonth = new Date(y, m, 0).getDate(); // 上一月的最后一天
				let dates = []; // 所有渲染日历
				let weekstart = this.weekstart == 7 ? 0 : this.weekstart; // 方便进行日期计算，默认星期从0开始
				let startDay = (() => {
					// 周初有几天是上个月的
					if (firstDayOfMonth == weekstart) {
						return 0;
					} else if (firstDayOfMonth > weekstart) {
						return firstDayOfMonth - weekstart;
					} else {
						return 7 - weekstart + firstDayOfMonth;
					}
				})();
				let endDay = 7 - ((startDay + lastDateOfMonth) % 7); // 结束还有几天是下个月的
				for (let i = 1; i <= startDay; i++) {
					dates.push({
						date: lastDayOfLastMonth - startDay + i,
						day: weekstart + i - 1 || 7,
						month: m - 1 >= 0 ? m - 1 : 12,
						year: m - 1 >= 0 ? y : y - 1,
					});
				}
				for (let j = 1; j <= lastDateOfMonth; j++) {
					dates.push({
						date: j,
						day: (j % 7) + firstDayOfMonth - 1 || 7,
						month: m,
						year: y,
						lm: true,
					});
				}
				for (let k = 1; k <= endDay; k++) {
					dates.push({
						date: k,
						day: (lastDateOfMonth + startDay + weekstart + k - 1) % 7 || 7,
						month: m + 1 <= 11 ? m + 1 : 0,
						year: m + 1 <= 11 ? y : y + 1,
					});
				}
				return dates;
			},
			// 已经签到处理
			isSigned(y, m, d) {
				let flag = false;
				if (!this.signedDates || !Array.isArray(this.signedDates)) {
					console.log('签到数组为空或不是数组:', this.signedDates);
					return flag;
				}

				const dateStr = `${m}-${d}`;
				for (let i = 0; i < this.signedDates.length; i++) {
					if (this.signedDates[i] == dateStr) {
						flag = true;
						break;
					}
				}

				// 调试信息 - 可以在控制台看到
				// console.log(`检查签到日期 ${dateStr}:`, flag, '签到数组:', this.signedDates);

				return flag;
			},
			isToday(y, m, d) {
				let date = new Date();
				return (
					y == date.getFullYear() && m == date.getMonth() && d == date.getDate()
				);
			},
			// 切换成周模式
			trgWeek() {
				this.monthOpen = !this.monthOpen;
				if (this.monthOpen) {
					this.positionTop = 0;
				} else {
					let index = -1;
					this.dates.forEach((i, x) => {
						this.isToday(i.year, i.month, i.date) && (index = x);
					});
					this.positionTop = -((Math.ceil((index + 1) / 7) || 1) - 1) * 80;
				}
			},
			// 切换到月视图
			switchToMonth() {
				if (!this.monthOpen) {
					this.monthOpen = true;
					this.positionTop = 0;
				}
			},
			// 切换到周视图
			switchToWeek() {
				if (this.monthOpen) {
					this.monthOpen = false;
					// 确保选中日期在当前月份，然后更新周位置
					this.updateSelectedDateToCurrentMonth();
					this.updateWeekPosition();
				}
			},
			// 更新周视图位置
			updateWeekPosition() {
				let index = -1;

				// 确保有合理的选中日期
				if (!this.selectedDate) {
					// 如果没有选中日期，使用今天
					let today = new Date();
					this.selectedDate = {
						year: today.getFullYear(),
						month: today.getMonth(),
						date: today.getDate(),
					};
				}

				// 确保选中日期在当前月份范围内
				this.updateSelectedDateToCurrentMonth();

				// 在当前月份数据中查找选中日期的索引
				this.dates.forEach((item, x) => {
					if (
						item.year === this.selectedDate.year &&
						item.month === this.selectedDate.month &&
						item.date === this.selectedDate.date &&
						item.lm
					) {
						// 确保是当前月的日期
						index = x;
					}
				});

				// 如果没找到，尝试找今天的日期
				if (index === -1) {
					this.dates.forEach((item, x) => {
						if (this.isToday(item.year, item.month, item.date) && item.lm) {
							index = x;
						}
					});
				}

				// 如果还是没找到，默认显示第一周
				if (index === -1) {
					index = 0;
					// 找到第一个当前月的日期
					for (let i = 0; i < this.dates.length; i++) {
						if (this.dates[i].lm) {
							index = i;
							break;
						}
					}
				}

				this.currentWeekIndex = Math.floor(index / 7);
				this.positionTop = -(this.currentWeekIndex * 80);
			},
			// 点击回调
			selectOne(i, event) {
				let date = `${i.year}-${i.month + 1}-${i.date}`;
				let selectD = new Date(date);

				// 记录选中的日期对象
				this.selectedDate = {
					year: i.year,
					month: i.month,
					date: i.date,
				};

				// 如果点击的是非当前月的日期，则跳转到对应月份
				if (selectD.getMonth() != this.m) {
					this.y = i.year;
					this.m = i.month;
					this.dates = this.monthDay(this.y, this.m);
				}

				this.choose = date;

				// 如果在周视图下，更新周位置
				if (!this.monthOpen) {
					this.updateWeekPosition();
				}

				this.$emit("on-click", {
					date: date,
					year: i.year,
					month: i.month + 1,
					day: i.date,
					isToday: this.isToday(i.year, i.month, i.date),
				});
			},
			changeYM(){
				//
				 this.$refs['date-time'].show();
			},
			 dateTimeChange(value) {
				this.$emit("year-month-change",value);
				// 如果当前显示的不是所在的月份，则跳转到的月份
				let time=value.split('-')
				this.y=time[0]
				this.m=parseInt(time[1]) - 1 
				this.dates = this.monthDay(this.y, this.m);
				// 如果在周视图下，更新周位置
				if (!this.monthOpen) {
					this.updateWeekPosition();
				}
				this.positionTop = 0;
				
				// 重要：更新选中日期到新月份的对应日期，确保周视图能正确定位
				this.updateSelectedDateToCurrentMonth();
			},
			// 上个月/周，下个月/周 - 智能导航
			turning(_action) {
				if (this.monthOpen) {
					// 月视图：按月导航
					this.turningByMonth(_action);
				} else {
					// 周视图：按周导航
					this.turningByWeek(_action);
				}
			},
			// 按月导航
			turningByMonth(_action) {
				if (_action === "next") {
					if (this.m + 1 == 12) {
						this.m = 0;
						this.y = this.y + 1;
					} else {
						this.m = this.m + 1;
					}
				} else {
					if (this.m + 1 == 1) {
						this.m = 11;
						this.y = this.y - 1;
					} else {
						this.m = this.m - 1;
					}
				}

				this.dates = this.monthDay(this.y, this.m);
				this.positionTop = 0;

				// 重要：更新选中日期到新月份的对应日期，确保周视图能正确定位
				this.updateSelectedDateToCurrentMonth();

				// 触发月份变化事件
				this.$emit("month-change", {
					year: this.y,
					month: this.m + 1
				});
			},
			// 按周导航
			turningByWeek(_action) {
				// 获取当前周的第一天
				let currentWeekFirstDay = this.getCurrentWeekFirstDay();

				if (_action === "next") {
					// 下一周：加7天
					currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() + 7);
				} else {
					// 上一周：减7天
					currentWeekFirstDay.setDate(currentWeekFirstDay.getDate() - 7);
				}

				// 检查是否需要切换月份
				let newYear = currentWeekFirstDay.getFullYear();
				let newMonth = currentWeekFirstDay.getMonth();

				if (newYear !== this.y || newMonth !== this.m) {
					// 需要切换月份
					this.y = newYear;
					this.m = newMonth;
					this.dates = this.monthDay(this.y, this.m);

					// 触发月份变化事件
					this.$emit("month-change", {
						year: this.y,
						month: this.m + 1
					});
				}

				// 更新选中的日期为新周的同一天（如果之前有选中日期）
				if (this.selectedDate) {
					let selectedWeekDay = new Date(
						this.selectedDate.year,
						this.selectedDate.month,
						this.selectedDate.date
					).getDay();
					let newSelectedDate = new Date(currentWeekFirstDay);
					newSelectedDate.setDate(
						currentWeekFirstDay.getDate() +
						(selectedWeekDay === 0 ? 6 : selectedWeekDay - 1)
					);

					this.selectedDate = {
						year: newSelectedDate.getFullYear(),
						month: newSelectedDate.getMonth(),
						date: newSelectedDate.getDate(),
					};

					// 清除选中状态，只保留定位信息
					this.choose = "";
				}

				// 更新周视图位置
				this.updateWeekPosition();
			},
			// 获取当前周的第一天（周一）
			getCurrentWeekFirstDay() {
				let referenceDate;

				if (this.selectedDate) {
					referenceDate = new Date(
						this.selectedDate.year,
						this.selectedDate.month,
						this.selectedDate.date
					);
				} else {
					referenceDate = new Date(); // 使用今天
				}

				let dayOfWeek = referenceDate.getDay();
				let daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日为0，需要减去6天到周一

				let monday = new Date(referenceDate);
				monday.setDate(referenceDate.getDate() - daysToMonday);

				return monday;
			},
			// 更新选中日期到当前月份（用于月份切换后保持合理的选中状态）
			updateSelectedDateToCurrentMonth() {
				if (!this.selectedDate) {
					// 如果没有选中日期，默认选择当前月的第一天，但不设置为选中状态
					this.selectedDate = {
						year: this.y,
						month: this.m,
						date: 1,
					};
					// 不设置choose，保持无选中状态
					return;
				}

				// 如果选中日期不在当前显示的月份中，需要调整
				if (
					this.selectedDate.year !== this.y ||
					this.selectedDate.month !== this.m
				) {
					// 获取当前月的最大天数
					let maxDate = new Date(this.y, this.m + 1, 0).getDate();
					// 保持相同的日期，但如果超出当前月的天数，则使用最后一天
					let newDate = Math.min(this.selectedDate.date, maxDate);

					this.selectedDate = {
						year: this.y,
						month: this.m,
						date: newDate,
					};
					// 清除选中状态，只保留定位信息
					this.choose = "";
				}
			},
			// 获取日期下方的显示文本（21日显示为21）
			getSubText(item) {
				if (this.isToday(item.year, item.month, item.date)) {
					return "今";
				}
				return "";
			},
			// 点击今日计划
			onTodayPlanClick() {
				this.$emit("today-plan-click");
				// 自动定位到今天的日期
				let date = new Date();
				let y = date.getFullYear();
				let m = date.getMonth();
				let d = date.getDate();

				// 如果当前显示的不是今天所在的月份，则跳转到今天的月份
				if (this.y !== y || this.m !== m) {
					this.y = y;
					this.m = m;
					this.dates = this.monthDay(this.y, this.m);
				}
				

				// 选中今天的日期（这里可以选中，因为是用户主动点击）
				this.choose = `${y}-${m + 1}-${d}`;
				this.selectedDate = {
					year: y,
					month: m,
					date: d,
				};

				// 如果在周视图下，更新周位置
				if (!this.monthOpen) {
					this.updateWeekPosition();
				}
			},
			// 图片加载错误处理
			onImageError(e) {
				console.log('头像加载失败:', e);
				// 可以在这里设置默认头像或其他处理
			},
		},
	};
</script>

<style lang="scss" scoped>
	.sign-calendar {
		width: 100%;
		background-color: #f8f9fb;
		border-radius: 24rpx;
		padding: 40rpx 30rpx;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;

		.top-section {
			margin-bottom: 30rpx;

			.greeting-area {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding: 0;

				.avatar-section {
					display: flex;
					align-items: center;
					flex: 1;

					.avatar {
						width: 110rpx;
						height: 110rpx;
						border-radius: 50%;
						background-color: white;
						border: 3rpx solid #e5e5e5;
						padding: 8rpx;
						flex-shrink: 0;
						z-index: 20;
					}

					
				}
				.speech-bubble {
						position: relative;
						background-color: white;
						border-radius: 0 50rpx 50rpx 0;
						padding: 14rpx 32rpx;
						padding-left: 40rpx;
						max-width: 80%;
						border: #e5e5e5 3rpx solid;
						left:-30rpx;
						z-index: 2;
						background: #c3ffff;

						.greeting-text {
							font-size: 26rpx;
							color: #374151;
							display: block;
							font-weight: 500;
							line-height: 1.4;
							width: 100%;
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
						}
					}
				
				.plan-section {
					display: flex;
					align-items: center;
					gap: 16rpx;
					flex-shrink: 0;

					.plan-indicator {
						width: 88rpx;
						height: 88rpx;
						background: #f4e8fd;
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 30rpx;
						font-weight: 700;
						position: relative;
						transition: all 0.4s ease;
					}
				}
			}
		}

		.arrow-btn {
			width: 60rpx;
			height: 60rpx;
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: rgba(255, 255, 255, 0.8);
			border-radius: 50%;
			cursor: pointer;
			transition: all 0.2s ease;
			box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);

			&:active {
				transform: scale(0.95);
				background-color: rgba(255, 255, 255, 1);
			}

			.arrow-icon {
				font-size: 36rpx;
				color: #666;
				font-weight: 500;
			}
		}

		.plan-title {
			font-size: 34rpx;
			font-weight: 600;
			color: #1f2937;
			letter-spacing: 1rpx;
		}

		.header {
			.year-month-section {
				display: flex;
				align-items: center;
				//gap: 40rpx;
				margin-bottom: 20rpx;
				justify-content: space-between;
				width: 100%;

				.year-month {
					display: flex;
					align-items: center;
					justify-content: center;

					.title {
						font-size: 32rpx;
						font-weight: 600;
						color: #1a1a1a;
						letter-spacing: 1rpx;
					}
				}

				.view-toggle {
					display: flex;
					justify-content: center;
					gap: 20rpx;
					align-items: center;

					.toggle-item {
						width: 74rpx;
						height: 74rpx;
						line-height: 80rpx;
						text-align: center;
						border-radius: 50%;
						font-size: 32rpx;
						font-weight: 500;
						color: #666;
						transition: all 0.3s ease;
						cursor: pointer;
						background-color: #eff1f5;

						&.active {
							background-color: #8b5cf6;
							color: white;
						}
					}
				}
			}
		}

		.week-header {
			display: flex;
			justify-content: space-around;
			padding: 20rpx 0 10rpx;

			.week-item {
				width: calc(100% / 7);
				text-align: center;
				font-size: 32rpx;
				font-weight: 700;
				color: #333;
			}
		}

		.calendar-grid {
			position: relative;
			height: 480rpx;
			/* 6行 x 80rpx */
			overflow: hidden;
			transition: height 0.3s ease;

			&.week-view {
				height: 80rpx;
			}

			.grid-container {
				display: flex;
				flex-wrap: wrap;
				transition: transform 0.3s ease;
				justify-content: space-between;

				.date-item {
					width: calc(100% / 7);
					height: 80rpx;
					display: flex;
					justify-content: center;
					align-items: center;
					position: relative;
					padding: 4rpx;

					&.other-month {
						.date-circle {
							color: #d1d5db;
						}
					}

					.date-circle {
						position: relative;
						width: 52rpx;
						height: 52rpx;
						border-radius: 50%;
						display: flex;
						justify-content: center;
						align-items: center;
						font-size: 28rpx;
						color: #3a4050;
						//font-weight: 500;
						transition: all 0.2s ease;
						cursor: pointer;
						background-color: rgba(216, 216, 216, 0.4);

						&:hover {
							background-color: rgba(139, 92, 246, 0.1);
						}

						&.selected {
							background-color: #8b5cf6;
							color: white;
							font-weight: 600;
							border: 3px solid rgba(139, 92, 246, 0.8);
							box-shadow: 0 6rpx 20rpx rgba(139, 92, 246, 0.4);
							transform: scale(1.05);
							&.today{
								&::after{
									line-height: 20px;
								}
							}
						}

						&.today {
							background-color: #8b5cf6;
							color: white;
							font-weight: 600;
							position: relative;

							&::after {
								content: "今"; //可以写字代替
								position: absolute;
								bottom: 0;
								top:0;
								left:0;
								right:0;
								margin: auto;
								font-size: 30rpx;
								line-height: 24px;
								text-align: center;
								color: white;
								//写字注释一下
								background: #c4b9f6;
								border-radius: 100%;
								
								z-index: 5;
							}

							/* 如果今天也是签到日期，需要显示绿色背景 */
							&.special-date {
								background-color: #10b981;
								/* 改为绿色 */

								&::before {
									content: "";
									position: absolute;
									top: -4rpx;
									right: -4rpx;
									width: 16rpx;
									height: 16rpx;
									background-color: #ef4444;
									border-radius: 50%;
									border: 2rpx solid white;
									z-index: 10;
									/* 确保红点在最上层 */
								}
							}
						}

						&.special-date {
							background-color: #10b981;
							/* 绿色背景 */
							color: white;
							font-weight: 600;

							&::before {
								content: "";
								position: absolute;
								top: -4rpx;
								right: -4rpx;
								width: 16rpx;
								height: 16rpx;
								background-color: #ef4444;
								border-radius: 50%;
								border: 2rpx solid white;
								z-index: 10;
								/* 确保红点在最上层 */
							}
						}

						&.disabled {
							color: rgba(41, 41, 41, 0.5);
							pointer-events: none;
							//display: none;
						}
					}
				}
			}
		}
	}
</style>