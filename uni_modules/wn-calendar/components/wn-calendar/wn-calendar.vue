<template>
	<view class="wn-calendar">
		
		<view class="head">
			<image @click="onChange('prev')"
				src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAY5JREFUaEPtmEtugzAQhsc3aW5SbhI2SSOVCJ+g6QmoQqWWbspRcpNyELArQojUVqmw52EswYaNH/PNP57xWEHkn4rcflgAQiu4KBC9AsXxYw2qa6CFRutdIw2ECqGirA4K4GkwWp1s26XSECiAl7KyPzxuobGdSSQhaAF6GmEIegBhCB6AS1xZMInOdifOg80KcBbDqlTvNzUXBDvAEFHwrLPtgQNCBIATQgxghIDW1JRpVhSAA0IcgLpqBwKgu3oEBKCp2mEBCKp2eICxardm5ZOdZgMwiOF+9ZgVQN9T5NkmcanY8wKw0OT77SpaAJ+L32wU8In/czVxkev32D8tpedivsaHB+jbT2VSTNMTTgEC4wMq4J4ub0VnAAXojA+gAK3xsgDK1vnjQ+qZqG5OEwmhqJt6TI6foharAtzGs54BCeN5AIgK1JTwwQMcqy9QcHfdTPhlGg/w+v4JVq3HpxLXZmSql/8bhzrE/cJF+Xbf/zEXMgwIGgCzOcXcBYDCi5g1FgUw3qOYG70C39PtD0Aq3TXKAAAAAElFTkSuQmCC"
				class="arrow left" mode="aspectFit"></image>
			<text class="t">{{headText}}</text>
			<image @click="onChange('next')"
				src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAY5JREFUaEPtmEtugzAQhsc3aW5SbhI2SSOVCJ+g6QmoQqWWbspRcpNyELArQojUVqmw52EswYaNH/PNP57xWEHkn4rcflgAQiu4KBC9AsXxYw2qa6CFRutdIw2ECqGirA4K4GkwWp1s26XSECiAl7KyPzxuobGdSSQhaAF6GmEIegBhCB6AS1xZMInOdifOg80KcBbDqlTvNzUXBDvAEFHwrLPtgQNCBIATQgxghIDW1JRpVhSAA0IcgLpqBwKgu3oEBKCp2mEBCKp2eICxardm5ZOdZgMwiOF+9ZgVQN9T5NkmcanY8wKw0OT77SpaAJ+L32wU8In/czVxkev32D8tpedivsaHB+jbT2VSTNMTTgEC4wMq4J4ub0VnAAXojA+gAK3xsgDK1vnjQ+qZqG5OEwmhqJt6TI6foharAtzGs54BCeN5AIgK1JTwwQMcqy9QcHfdTPhlGg/w+v4JVq3HpxLXZmSql/8bhzrE/cJF+Xbf/zEXMgwIGgCzOcXcBYDCi5g1FgUw3qOYG70C39PtD0Aq3TXKAAAAAElFTkSuQmCC"
				class="arrow" mode="aspectFit"></image>
		</view>
		
		<view class="labels">
			<view class="label-item" v-for="(label) in labels" :key="label">
				<text class="t">{{label}}</text>
			</view>
		</view>
		
		<view :class="['row', isBorder ? 'border' : '']" v-for="row in rows">
			<view @click="onChoose(item)" :class="[
				'day-item', 
				item.show ? 'show' : '', 
				active === item.date ? 'active' : ''
			]" v-for="(item, ind) in days.slice(row*7, (row+1)*7)" :key="item.date">
				<text class="t">{{item.label}}</text>
				<text v-if="item.data && item.data.text" class="data"
					:style="`color: ${colors[item.data.type] || '#f3a73f'};`">{{item.data.text}}</text>
			</view>
			
		</view>
	</view>
</template>

<script>
	import calendar from './calendar'
	export default {
		name: "w-calendar",
		emits: ['choose', 'change'],
		props: {
			data: {
				type: Array,
				default () {
					return []
				}
			},
			colors: {
				type: Array,
				default () {
					return ['#2979ff', '#18bc37', '#f3a73f', '#e43d33', '#8f939c']
				}
			},
			format: {
				type: String,
				default: ''
			},
			isLess: {
				type: Boolean,
				default: false
			}, 
			isBorder: {
				type: Boolean,
				default: true
			},
			isEn: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			headText() {
				if (this.format === '/') {
					return `${this.year}/${this.month}`
				} else {
					if (this.isEn) {
						return `${calendar.getEn(this.month)}, ${this.year}`
					} else {
						return `${this.year}年${this.month}月`
					}
				}
			}
		},
		data() {
			return {
				labels: this.isEn ? calendar.labels_en : calendar.labels_zh,
				active: '',
				rows: [0, 1, 2, 3, 4, 5, 6],
				days: [],
				year: '',
				month: '',
				
			};
		},
		created() {
			this.refresh()
		},
		methods: {
			refresh() {
				this.$nextTick(() => {
					const {days, year, month} = calendar.getDays(this.year, this.month, this.data, this.isLess)
					this.days = days
					this.year = year
					this.month = month + 1
				})
			},
			onChange(type) {
				this.month = type === 'prev' ? (this.month - 1) : (this.month + 1)
				this.refresh()
				this.$nextTick(() => {
					this.$emit('change', {
						year: this.year,
						month: this.month
					})
				})
			},
			onChoose(item) {
				if (!item.show) return;
				this.active = item.date
				this.$nextTick(() => {
					this.$emit('choose', {
						date: item.date,
						data: item.data
					})
				})
			}
		}
	}
</script>

<style scoped>
	.arrow {
		/* #ifndef APP-NVUE */
		box-sizing: border-box;
		/* #endif */
		padding: 4px;
		width: 22px;
		height: 22px;
		background: #f7f7f7;
		border-radius: 22px;
	}

	.arrow.left {
		transform: rotate(180deg);
	}

	.wn-calendar {
		min-width: 294px;
		background: white;
	}

	.head {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		justify-content: center;
		align-items: center;
		padding: 8px 0px;
	}

	.head .t {
		padding: 0 42px;
		font-size: 16px;
		line-height: 32px;
		color: #3a3a3a;
	}

	.labels {
		/* #ifndef APP-NVUE */
		box-sizing: border-box;
		display: flex;
		/* #endif */
		flex-direction: row;
		height: 36px;
		align-items: center;
		background: #f7f7f7;
		border-top: 1px solid #f0f0f0;
		border-bottom: 1px solid #f0f0f0;
	}

	.label-item {
		min-width: 42px;
		flex: 1;
		/* #ifndef APP-NVUE */
		display: flex;
		align-items: center;
		justify-content: center;
		/* #endif */
	}

	.label-item .t {
		font-size: 14px;
		text-align: center;
		line-height: 14px;
		color: #3a3a3a;
	}

	.row {
		/* #ifndef APP-NVUE */
		box-sizing: border-box;
		display: flex;
		/* #endif */
		flex-direction: row;
		border-bottom: 1px solid transparent;
	}
	
	.row.border {
		border-bottom: 1px solid #f0f0f0;
	}

	.day-item {
		/* #ifndef APP-NVUE */
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		/* #endif */
		flex: 1;
		justify-content: center;
		padding: 7px 0px;
		border-radius: 4px;
		height: 42px;
		min-width: 42px;
	}

	.day-item.show {}

	.day-item.active {
		background: #ededed !important;
	}

	.day-item.active .t {
		font-weight: bold !important;
	}

	.day-item .t {
		font-size: 15px;
		line-height: 15px;
		text-align: center;
		color: #909399;
	}

	.day-item.show .t {
		color: #3a3a3a;
	}

	.day-item .data {
		margin-top: 2px;
		font-size: 11px;
		line-height: 11px;
		text-align: center;
		/* #ifdef APP-NVUE */
		text-overflow: clip;
		word-wrap: anywhere;
		/* #endif */
		color: #3a3a3a;
	}
</style>