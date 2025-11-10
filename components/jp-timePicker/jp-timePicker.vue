<template>
	<view class="date-time-picker" v-if="visible">
		<view class="date-time-mask" @click.stop="hide"></view>
		<view class="date-time-container" @click.stop="handleEvent">
			<view class="time-picker-tool">
				<view class="cancel-btn" @click.stop="cancel">
					<text>取消</text>
				</view>
				<view class="tool-title">
					<text>选择时间</text>
				</view>
				<view class="confirm-btn" @click.stop="confirm">
					<text>确定</text>
				</view>
			</view>
			
			<picker-view class="picker-view" :indicator-style="indicatorStyleString" :value="dateTime" @change="dateTimePickerChange">
				<picker-view-column data-id='year' v-if='isShowYear'>
					<view class="item" v-for="(item,index) in years" :key="index" :style="formatDateArrays[0]==item?'color: rgb(250,80,80)':''">{{item}}年</view>
				</picker-view-column>
				<picker-view-column data-id='month' v-if='isShowMonth'>
					<view class="item" v-for="(item,index) in months" :key="index" :style="formatDateArrays[1]==item?'color: rgb(250,80,80)':''">{{item}}月</view>
				</picker-view-column>
				<picker-view-column data-id='day' v-if='isShowDay'>
					<view class="item" v-for="(item,index) in days" :key="index" :style="formatDateArrays[2]==item?'color: rgb(250,80,80)':''">{{item}}日</view>
				</picker-view-column>
			</picker-view>
		</view>
	</view>
</template>

<script>
	import {
		getOneMonthDays,
		getTimeArray,
		addZero,
		getIndexOfArray
	} from './uitls/util.js'
	export default {
		name: 'jp-timePicker',
		props: {
			startYear: {
				type: Number,
				default: 1900
			},
			endYear: {
				type: Number,
				default: new Date().getFullYear()
			},
			datestring: {
				type: String,
				default: ''
			},
			datestype: {
				type: String,
				default: 'year'
			},
		},
		data() {
			return {
				formatDateArrays:[],
				visible: false,
				dateTime: [],
				days: [],
				indicatorStyle:{ background: 'rgba(255,0,0,.1)', height: '40px',color: 'rgb(250,80,80) !important'  },
				indicatorStyleString: '',
				type: 'year',
			}
		},
		watch: {
			datestype(){
				this.type = this.datestype
			},
			indicatorStyle(val){
				this.getIndicatorStyle();
			},
			type() {
				this.initDateTime()
			},
			datestring(){
				this.initDateTime()
			}
		},
		computed: {
			years() {
				return this.initTimeData(this.endYear, this.startYear);
			},
			isShowYear() {
				return this.type !== 'time' && this.type !== 'hour-minute';
			},
			months() {
				return this.initTimeData(12, 1);
			},
			isShowMonth() {
				return this.type !== 'year' && this.type !== 'time' && this.type !== 'hour-minute';
			},
			isShowDay() {
				return this.type === 'date' || this.type === 'datetime' || this.type === 'datetime-all';
			},
			hours() {
				return this.initTimeData(23, 0);
			},
			isShowHour() {
				return this.type !== 'date' && this.type !== 'year-month' && this.type !== 'year';
			},
			minutes() {
				return this.initTimeData(59, 0);
			},
			isShowMinute() {
				return this.type !== 'date' && this.type !== 'year-month' && this.type !== 'year';
			},
			seconds() {
				return this.initTimeData(59, 0);
			},
			isShowSecond() {
				return this.type === 'datetime-all' || this.type === 'time';
			}
		},
		methods: {
			gettype(type){
				this.type = type
				},
			getIndicatorStyle(){
				if(this.indicatorStyle){
					for(let key in this.indicatorStyle){
						this.indicatorStyleString += `${key}:${this.indicatorStyle[key]};`
					}
				}
			},
			handleEvent() {
				return;
			},
			cancel() {
				this.hide();
			},
			confirm() {
				this.formatDate('confirm');
				this.hide();
			},
			show() {
				this.visible = true;
			},
			hide() {
				this.visible = false;
			},
			initDateTime() {
				let value;
				if (this.datestring.length > 0) {
					if (this.type === 'year') {
						value = new Date(this.datestring, 0);
					} else if (this.type === 'time' || this.type === 'hour-minute') {
						let date = new Date();
						let ary = this.datestring.split(':');
						ary.forEach((item, index) => {
							if (index == 0) {
								date.setHours(item)
							} else if (index == 1) {
								date.setMinutes(item)
							} else if (index == 2) {
								date.setSeconds(item)
							}
						})
						value = date;
					} else {
						value = new Date(this.datestring.replace(/-/g, '/'));
					}

				} else {
					value = new Date();
				}
				let len, timeArray, index;
				let array = getTimeArray(value);
				let [year, month, day, hour, minute, second] = array;
				this.days = this.initTimeData(getOneMonthDays(year, month-1), 1);
				let names = ['year', 'month', 'day', 'hour', 'minute', 'second'];
				switch (this.type) {
					case "date":
						len = 3;
						break;
					case "year-month":
						len = 2;
						break;
					case "year":
						len = 1;
						break;
					case "datetime":
						len = 5;
						break;
					case "datetime-all":
						len = 6;
						break;
					case "time":
						len = 3;
						break;
					case "hour-minute":
						len = 2;
						break;
				}
				timeArray = new Array(len).fill(0);
				if (this.type === 'time' || this.type === 'hour-minute') {
					names = names.slice(3);
					array = array.slice(3);
				}
				timeArray = timeArray.map((item, index) => {
					const name = names[index];
					return getIndexOfArray(array[index], this[name + 's'])
				})
				this.dateTime = timeArray;
				
				if (this.type === 'date' || this.type === 'year-month' || this.type === 'year') {
					this.formatDateArrays = this.dateTime.map((item, index) => {
						return this[names[index] + 's'][item] < 10 ? addZero(this[names[index] + 's'][item]) : this[names[index] + 's'][item];
					})
				}
				console.log(this.formatDateArrays)
			},
			initTimeData(end, start) {
				let timeArray = [];
				while (start <= end) {
					timeArray.push(start);
					start++;
				}
				return timeArray;
			},
			formatDate(type) {
				let names = ['year', 'month', 'day', 'hour', 'minute', 'second'];
				let dateString, formatDateArray = [];
				if (this.type === 'date' || this.type === 'year-month' || this.type === 'year') {
					formatDateArray = this.dateTime.map((item, index) => {
						return this[names[index] + 's'][item] < 10 ? addZero(this[names[index] + 's'][item]) : this[names[index] + 's'][item];
					})
					dateString = formatDateArray.join('-');
				} 
				if(type){
					this.$emit(type, dateString)
				}
				this.$emit('change', dateString)
			},
			dateTimePickerChange(e) {
				let columns = e.target.value;
				if (this.type === 'date' || this.type === 'datetime' || this.type === 'datetime-all') {
					this.dateTime.splice(0, 1, columns[0]);
					if (columns[0] != this.dateTime[0]) {
						this.days = this.initTimeData(getOneMonthDays(this.years[this.dateTime[0]], this.months[this.dateTime[1]]), 1);
						if (this.dateTime[1] == 1) {
							if (this.dateTime[2] === this.days.length - 1) {
								if (getOneMonthDays(this.years[columns[0]], this.dateTime[1]) < getOneMonthDays(this.years[this.dateTime[0]],this.dateTime[1])) {
									this.dateTime.splice(2, 1, this.days.length - 1)
								}
							}
						}
					} else {
						this.dateTime.splice(1, 1, columns[1]);
						this.days = this.initTimeData(getOneMonthDays(this.years[this.dateTime[0]], this.dateTime[1]), 1);
						if (columns[1] != this.dateTime[1]) {
							if (this.dateTime[1] == 1) {
								if (this.dateTime[2] === this.days.length - 1) {
									if (getOneMonthDays(this.years[columns[0]], this.dateTime[1]) < getOneMonthDays(this.years[this.dateTime[0]],
											this.dateTime[1])) {
										this.dateTime.splice(2, 1, this.days.length - 1)
									}
								}
							} else {
								if (this.dateTime[2] > this.days.length - 1) {
									this.dateTime.splice(2, 1, this.days.length - 1)
								} else {
									this.dateTime.splice(2, 1, columns[2])
								}
							}
						} else {
							this.dateTime.splice(2, 1, columns[2])
						}
					}
					if (columns.length > 2) {
						columns.splice(3).forEach((column, index) => {
							this.dateTime.splice(index + 3, 1, column);
						})
					}
				} else {
					columns.forEach((column, index) => {
						this.dateTime.splice(index, 1, column);
					})
				}
				if (!this.isShowToolBar) {
					this.formatDate();
				}
				
				let names = ['year', 'month', 'day', 'hour', 'minute', 'second'];
				this.formatDateArrays = [];
				if (this.type === 'date' || this.type === 'year-month' || this.type === 'year') {
					this.formatDateArrays = this.dateTime.map((item, index) => {
						return this[names[index] + 's'][item] < 10 ? addZero(this[names[index] + 's'][item]) : this[names[index] + 's'][item];
					})
				}
				console.log(this.formatDateArrays)
			},
		},
		mounted() {
			this.type = this.datestype
			this.getIndicatorStyle();
			this.initDateTime();
		}
	}
</script>

<style lang='scss' scoped>
	.date-time-picker {
		.date-time-mask {
			position: fixed;
			top: 0;
			bottom: 0;
			left: 0;
			right: 0;
			background-color: rgba($color: #000000, $alpha: .5);
			z-index: 998 ;
		}
		
		.jp-picker{
			background-color: #fff;display: flex;justify-content: center;align-items: center;height: 120rpx;font-size: 30rpx;
			color: rgb(250,80,80);
		}
		.jp-picker-year{
			padding: 10rpx 20rpx;border: 1px solid rgb(250,80,80);border-top-left-radius: 30rpx;border-bottom-left-radius: 30rpx;height: 30rpx;line-height: 30rpx;
		}
		.jp-picker-year-month{
			padding: 10rpx 20rpx;border-top: 1px solid rgb(250,80,80);border-bottom: 1px solid rgb(250,80,80);height: 30rpx;line-height: 30rpx;
		}
		.jp-picker-date{
			padding: 10rpx 20rpx;border: 1px solid rgb(250,80,80);border-top-right-radius: 30rpx;border-bottom-right-radius: 30rpx;height: 30rpx;line-height: 30rpx;
		}
		.jp-picker-xzr{
			background-color: rgb(250,80,80);color: #fff;
		}

		.date-time-container {
			position: fixed;
			height: 50%;
			bottom: 0;
			right: 0;
			left: 0;
			background-color: #fff;
			z-index: 1000;
			display: flex;
			flex-direction: column;

			.time-picker-tool {
				height: 80rpx;
				display: flex;
				align-items: center;
				justify-content: space-between;
				font-size: 28rpx;

				.cancel-btn {
					padding: 0 28rpx;
					box-sizing: border-box;
					color: #333;
				}

				.tool-title {
					font-weight: 500;
					font-size: 16px;
					max-width: 50%;
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}

				.confirm-btn {
					padding: 0 28rpx;
					box-sizing: border-box;
					color: rgb(250,80,80);
				}
			}

			.picker-view {
				width: 100%;
				flex: 1;

				.item {
					font-size: 34rpx;
					display: flex;
					align-items: center;
					justify-content: center;
				}
			}
		}
	}
</style>
