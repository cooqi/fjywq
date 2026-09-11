<template>
	<view class="page-container">
		<!-- 背景极光 -->
		<view class="aurora"><view class="a1"></view><view class="a2"></view><view class="a3"></view></view>
		
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading"><text>加载中...</text></view>
		
		<!-- 票根 -->
		<view class="ticket" v-else-if="concert">
			<!-- 纹理叠层 -->
			<view class="ticket-overlay"></view>
			
			<!-- 票头 -->
			<view class="ticket-head">
				<view class="rule-line"></view>
				<view class="diamond"></view>
				<view class="head-text">
					<text class="head-cn">纪念电子票据</text>
					<text class="head-en">MEMORIAL TICKET</text>
				</view>
				<view class="diamond"></view>
				<view class="rule-line"></view>
			</view>
			
			<!-- 主券 -->
			<view class="ticket-main">
				<view class="event-row">
					<view class="rule-line short"></view>
					<text class="event-name">{{concert.ychTheme || concert.type || '演出'}}</text>
					<view class="rule-line short reverse"></view>
				</view>
				<text class="artist">{{concert.ychTheme ? (userInfo.nickName || '青宇') : (concert.type || '演出')}}</text>
				<text class="artist-en">{{concert.ychTheme ? 'ARTIST' : 'PERFORMANCE'}}</text>
				
				<view class="date-row">
					<text class="date-num">{{dateYear}}</text>
					<text class="date-dot">·</text>
					<text class="date-num">{{dateMonth}}</text>
					<text class="date-dot">·</text>
					<text class="date-num">{{dateDay}}</text>
				</view>
				<view class="divider"></view>
				
				<view class="info-grid">
					<view class="info">
						<text class="info-dt">持有者</text>
						<text class="info-dd">{{holderName}}</text>
					</view>
					<view class="info">
						<text class="info-dt">场次</text>
						<text class="info-dd">第 {{showIndex}} 场</text>
					</view>
					<view class="info">
						<text class="info-dt">地点</text>
						<text class="info-dd">{{concert.address || '未知'}}</text>
					</view>
					<view class="info">
						<text class="info-dt">出发 & 到达</text>
						<text class="info-dd">{{departureProvince}}
							<text class="tag">{{routeTag}}</text>
						</text>
					</view>
				</view>
			</view>
			
			<!-- 打孔线 + 印章 -->
			<view class="perforation">
				<view class="notch l"></view>
				<view class="perf-line"></view>
				<view class="mid-dot"></view>
				<view class="perf-line"></view>
				<view class="notch r"></view>
				<view class="stamp">
					<text class="stamp-cn">已奔赴</text>
					<text class="stamp-sub">到场看完演出</text>
				</view>
			</view>
			
			<!-- 副券 -->
			<view class="ticket-stub">
				<view class="stub-left">
					<text class="stub-label">副券 · 留存纪念</text>
					<text class="stub-no">NO.<text class="stub-num">{{showIndexStr}}</text></text>
					<view class="stub-route">
						<view class="route-arrow">
							<view class="arrow-circle"></view>
							<view class="arrow-dash"></view>
							<view class="arrow-head"></view>
						</view>
						<text class="route-text">{{departureProvince}} → {{arrivalCity}}</text>
						<text class="tag">{{routeTag}}</text>
					</view>
				</view>
				<view class="stub-right">
					<view class="barcode">
						<view v-for="(w, i) in barcodeBars" :key="i" class="bar" :style="{width: w + 'rpx'}"></view>
					</view>
					<text class="barcode-no">196927QY</text>
				</view>
			</view>
			
			<text class="ticket-foot">纪念电子票据 · 仅供收藏留念</text>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-box" v-else><text>未找到该记录</text></view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			loading: true,
			concert: null,
			userInfo: {},
			showIndex: 1,
			distance: 0,
			departureProvince: '',
			arrivalProvince: '',
			transportMode: 'plane',
			allConcerts: []
		}
	},
	computed: {
		holderName() {
			return this.userInfo.nickName || this.userInfo.name || '青宇'
		},
		dateYear() {
			if (!this.concert || !this.concert.time) return '----'
			return String(new Date(this.concert.time).getFullYear())
		},
		dateMonth() {
			if (!this.concert || !this.concert.time) return '--'
			return String(new Date(this.concert.time).getMonth() + 1).padStart(2, '0')
		},
		dateDay() {
			if (!this.concert || !this.concert.time) return '--'
			return String(new Date(this.concert.time).getDate()).padStart(2, '0')
		},
		showIndexStr() {
			return String(this.showIndex).padStart(2, '0')
		},
		arrivalCity() {
			if (!this.concert) return ''
			return this.extractCityName(this.concert.address) || this.arrivalProvince
		},
		routeTag() {
			return this.departureProvince === this.arrivalProvince ? '省内奔赴' : '跨省奔赴'
		},
		barcodeBars() {
			const seed = this.showIndex * 7 + 13
			const bars = []
			let s = seed
			for (let i = 0; i < 30; i++) {
				s = (s * 1103515245 + 12345) & 0x7fffffff
				bars.push(3 + (s % 5) * 2)
			}
			return bars
		},
		barcodeText() {
			const seed = this.showIndex * 31 + 7
			let s = seed
			const digits = []
			for (let i = 0; i < 8; i++) {
				s = (s * 1103515245 + 12345) & 0x7fffffff
				digits.push(s % 10)
			}
			return digits.join(' ')
		}
	},
	onLoad(options) {
		try {
			const userInfo = uni.getStorageSync('userInfo')
			this.userInfo = JSON.parse(userInfo)
		} catch (e) {}
		
		if (options.id) {
			this.loadDetail(options.id)
		} else if (options.payInfo) {
			try {
				const payInfo = JSON.parse(decodeURIComponent(options.payInfo))
				this.loading = false
				this.concert = {
					_id: '',
					time: payInfo.payTime || '',
					address: payInfo.adress || '',
					Province: payInfo.Province || '',
					ychTheme: payInfo.payName || '',
					yhcTheme: '',
					type: payInfo.payType || ''
				}
				this.arrivalProvince = payInfo.Province || '未知'
				this.departureProvince = this.userInfo.Province || '未设置'
				this.loadAllConcerts()
			} catch (e) {
				console.error('解析payInfo失败:', e)
				this.loading = false
			}
		} else {
			this.loading = false
		}
	},
	methods: {
		loadDetail(id) {
			this.loading = true
			uniCloud.callFunction({
				name: 'concert-admin',
				data: { action: 'getList', page: 1, pageSize: 100 },
				success: (res) => {
					this.loading = false
					if (res.result.code === 0) {
						const list = res.result.data.list || []
						this.allConcerts = list
						this.allConcerts.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0))
						const idx = this.allConcerts.findIndex(item => item._id === id)
						if (idx > -1) {
							this.concert = this.allConcerts[idx]
							this.showIndex = idx + 1
							this.arrivalProvince = this.concert.Province || '未知'
							this.departureProvince = this.userInfo.Province || '未设置'
							if (idx > 0) {
								const prev = this.allConcerts[idx - 1]
								const prevCoords = this.getCityCoords(this.extractCityName(prev.address) || prev.Province)
								const currCoords = this.getCityCoords(this.extractCityName(this.concert.address) || this.concert.Province)
								if (prevCoords && currCoords) {
									this.distance = Math.round(this.calculateDistance(prevCoords.lng, prevCoords.lat, currCoords.lng, currCoords.lat))
								}
							}
						}
					}
				},
				fail: (err) => { this.loading = false; console.error('加载失败', err) }
			})
		},
		loadAllConcerts() {
			uniCloud.callFunction({
				name: 'concert-admin',
				data: { action: 'getList', page: 1, pageSize: 100 },
				success: (res) => {
					if (res.result.code === 0) {
						const list = res.result.data.list || []
						this.allConcerts = list
						this.allConcerts.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0))
						const currAddr = this.concert.address || ''
						const currTime = this.concert.time || ''
						const idx = this.allConcerts.findIndex(item => {
							return (item.address || '') === currAddr && (item.time || '') === currTime
						})
						if (idx > -1) {
							this.showIndex = idx + 1
							if (idx > 0) {
								const prev = this.allConcerts[idx - 1]
								const prevCoords = this.getCityCoords(this.extractCityName(prev.address) || prev.Province)
								const currCoords = this.getCityCoords(this.extractCityName(this.concert.address) || this.concert.Province)
								if (prevCoords && currCoords) {
									this.distance = Math.round(this.calculateDistance(prevCoords.lng, prevCoords.lat, currCoords.lng, currCoords.lat))
								}
							}
						} else {
							this.showIndex = this.allConcerts.length + 1
						}
					}
				},
				fail: (err) => { console.error('加载演唱会列表失败', err) }
			})
		},
		extractCityName(address) {
			if (!address) return ''
			const provinces = ['北京','天津','上海','重庆','河北','山西','辽宁','吉林','黑龙江',
				'江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','海南',
				'四川','贵州','云南','陕西','甘肃','青海','台湾','内蒙古','广西','西藏','宁夏','新疆','香港','澳门']
			let city = address
			for (let p of provinces) {
				if (city.startsWith(p)) { city = city.replace(p, '').trim(); break }
			}
			const sepIdx = city.search(/[·\s（(]/)
			if (sepIdx > 0) city = city.substring(0, sepIdx)
			if (city && !city.endsWith('市') && !city.endsWith('县') && !city.endsWith('区')) city += '市'
			return city
		},
		formatDate(timeStr) {
			if (!timeStr) return '未设置'
			const d = new Date(timeStr)
			return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
		},
		getCityCoords(cityName) {
			const coords = {
				'北京':{lng:116.4,lat:39.9},'天津':{lng:117.2,lat:39.1},
				'上海':{lng:121.5,lat:31.2},'重庆':{lng:106.5,lat:29.6},
				'广州':{lng:113.3,lat:23.1},'深圳':{lng:114.1,lat:22.5},
				'杭州':{lng:120.2,lat:30.3},'南京':{lng:118.8,lat:32.1},
				'成都':{lng:104.1,lat:30.7},'武汉':{lng:114.3,lat:30.6},
				'西安':{lng:108.9,lat:34.3},'长沙':{lng:112.9,lat:28.2},
				'郑州':{lng:113.6,lat:34.8},'济南':{lng:117.0,lat:36.7},
				'青岛':{lng:120.3,lat:36.1},'大连':{lng:121.6,lat:38.9},
				'沈阳':{lng:123.4,lat:41.8},'哈尔滨':{lng:126.6,lat:45.8},
				'昆明':{lng:102.7,lat:25.0},'贵阳':{lng:106.7,lat:26.6},
				'南宁':{lng:108.3,lat:22.8},'福州':{lng:119.3,lat:26.1},
				'厦门':{lng:118.1,lat:24.5},'南昌':{lng:115.9,lat:28.7},
				'合肥':{lng:117.3,lat:31.9},'太原':{lng:112.5,lat:37.9},
				'石家庄':{lng:114.5,lat:38.0},'兰州':{lng:103.8,lat:36.1},
				'银川':{lng:106.3,lat:38.5},'西宁':{lng:101.8,lat:36.6},
				'拉萨':{lng:91.1,lat:29.6},'乌鲁木齐':{lng:87.6,lat:43.8},
				'呼和浩特':{lng:111.7,lat:40.8},'澳门':{lng:113.5,lat:22.2},
				'香港':{lng:114.2,lat:22.3},'丽水':{lng:119.9,lat:28.5},
				'襄阳':{lng:112.1,lat:32.0},'恩施':{lng:109.5,lat:30.3},
				'嘉兴':{lng:120.8,lat:30.8},'佛山':{lng:113.1,lat:23.0},
				'东莞':{lng:113.8,lat:23.0},'珠海':{lng:113.6,lat:22.3},
				'无锡':{lng:120.3,lat:31.6},'苏州':{lng:120.6,lat:31.3},
				'宁波':{lng:121.5,lat:29.9},'温州':{lng:120.7,lat:28.0},
				'常州':{lng:119.9,lat:31.8},'徐州':{lng:117.2,lat:34.2},
				'烟台':{lng:121.4,lat:37.5},'潍坊':{lng:119.2,lat:36.7},
				'洛阳':{lng:112.4,lat:34.6},'宜昌':{lng:111.3,lat:30.7},
				'株洲':{lng:113.1,lat:27.8},'桂林':{lng:110.3,lat:25.3},
				'柳州':{lng:109.4,lat:24.3},'绵阳':{lng:104.7,lat:31.5},
				'大理':{lng:100.2,lat:25.6},'丽江':{lng:100.2,lat:26.9},
				'三亚':{lng:109.5,lat:18.3},'秦皇岛':{lng:119.6,lat:39.9}
			}
			for (let city in coords) { if (cityName.includes(city)) return coords[city] }
			return null
		},
		calculateDistance(lng1, lat1, lng2, lat2) {
			const R = 6371
			const dLat = (lat2 - lat1) * Math.PI / 180
			const dLng = (lng2 - lng1) * Math.PI / 180
			const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
			return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
		}
	}
}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: #0f0a26;
	padding: 40rpx 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	position: relative;
	overflow: hidden;
}
.aurora {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; pointer-events: none;
	view { position: absolute; border-radius: 50%; filter: blur(140rpx); }
	.a1 { width: 600rpx; height: 600rpx; left: -160rpx; top: -200rpx; background: radial-gradient(circle, #6d28d9, transparent 65%); opacity: 0.5; }
	.a2 { width: 500rpx; height: 500rpx; right: -120rpx; top: 200rpx; background: radial-gradient(circle, #0ea5e9, transparent 65%); opacity: 0.3; }
	.a3 { width: 600rpx; height: 600rpx; left: 100rpx; bottom: -300rpx; background: radial-gradient(circle, #7c3aed, transparent 62%); opacity: 0.3; }
}
.loading-box, .empty-box {
	display: flex; align-items: center; justify-content: center;
	min-height: 60vh; color: rgba(225,220,255,.66); font-size: 28rpx; z-index: 2;
}

// ===== 票据卡 =====
.ticket {
	position: relative; z-index: 2; width: 100%; max-width: 700rpx;
	border-radius: 48rpx;
	border: 2rpx solid rgba(167,139,250,.32);
	background:
		radial-gradient(130% 80% at 12% 0%, rgba(124,58,237,.38) 0%, transparent 55%),
		radial-gradient(130% 90% at 88% 100%, rgba(34,211,238,.20) 0%, transparent 55%),
		linear-gradient(165deg, #2a1852 0%, #1b1038 52%, #160d30 100%);
	box-shadow: 0 60rpx 120rpx -40rpx rgba(4,2,16,.85), 0 24rpx 56rpx -28rpx rgba(109,40,217,.28);
	overflow: hidden;
}
.ticket-overlay {
	position: absolute; inset: 0; z-index: 0; pointer-events: none;
	background: repeating-linear-gradient(115deg, rgba(255,255,255,.022) 0 4rpx, transparent 4rpx 12rpx);
}

// ===== 票头 =====
.ticket-head {
	position: relative; z-index: 1; display: flex; align-items: center;
	padding: 48rpx 60rpx 0;
	.rule-line { flex: 1; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(167,139,250,.5), transparent); }
	.diamond { width: 16rpx; height: 16rpx; background: #67e8f9; transform: rotate(45deg); margin: 0 16rpx; opacity: 0.8; flex: none; }
	.head-text { text-align: center; flex: none; }
	.head-cn { display: block; font-size: 28rpx; font-weight: 700; letter-spacing: 8rpx; color: #ddd6fe; }
	.head-en { display: block; font-size: 18rpx; letter-spacing: 8rpx; color: rgba(225,220,255,.66); margin-top: 8rpx; }
}

// ===== 主券 =====
.ticket-main { position: relative; z-index: 1; padding: 52rpx 68rpx 40rpx; text-align: center; }
.event-row { display: flex; align-items: center; justify-content: center; margin-bottom: 16rpx; gap: 24rpx; }
.event-row .rule-line {
	width: 100rpx; height: 2rpx;
	background: linear-gradient(90deg, transparent, rgba(34,211,238,.7));
	&.reverse { background: linear-gradient(90deg, rgba(34,211,238,.7), transparent); }
}
.event-name { font-size: 30rpx; font-weight: 500; letter-spacing: 8rpx; color: #c7d2fe; }
.artist {
	display: block; font-size: 100rpx; font-weight: 900; line-height: 1.15; letter-spacing: 8rpx;
	background: linear-gradient(100deg, #f6f2ff 0%, #b9a9ff 42%, #8be0f7 58%, #f6f2ff 78%);
	-webkit-background-clip: text; background-clip: text; color: transparent;
	padding: 8rpx 0 4rpx;
}
.artist-en { display: block; font-size: 20rpx; letter-spacing: 10rpx; color: rgba(225,220,255,.66); margin-top: 10rpx; }
.date-row { display: flex; align-items: baseline; justify-content: center; gap: 20rpx; margin-top: 36rpx; }
.date-num { font-size: 86rpx; font-weight: 700; color: #eee9ff; letter-spacing: 4rpx; }
.date-dot { color: #67e8f9; opacity: 0.75; font-size: 36rpx; }
.divider { position: relative; z-index: 1; height: 2rpx; margin: 36rpx 0 0; background: linear-gradient(90deg, transparent, rgba(167,139,250,.4), transparent); }

// ===== 信息网格 =====
.info-grid { display: flex; flex-wrap: wrap; margin: 32rpx 0 0; }
.info {
	width: 50%; padding: 24rpx 32rpx;
	border-top: 2rpx solid rgba(167,139,250,.16);
	&:nth-child(odd) { border-right: 2rpx solid rgba(167,139,250,.16); }
	&:nth-child(-n+2) { border-top: none; }
	.info-dt { display: block; font-size: 20rpx; letter-spacing: 4rpx; color: rgba(225,220,255,.66); margin-bottom: 12rpx; }
	.info-dd { display: block; font-size: 28rpx; font-weight: 500; color: #eee9ff; letter-spacing: 2rpx; }
	.tag {
		margin-left: 12rpx; font-size: 20rpx; font-weight: 500; color: #67e8f9;
		border: 2rpx solid rgba(34,211,238,.4); border-radius: 999rpx;
		padding: 2rpx 16rpx; letter-spacing: 2rpx;
	}
}

// ===== 打孔线 =====
.perforation {
	position: relative; z-index: 2; margin: 40rpx 52rpx 0;
	display: flex; align-items: center;
	.perf-line { flex: 1; border-top: 3rpx dashed rgba(167,139,250,.4); }
	.mid-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(167,139,250,.45); margin: 0 20rpx; flex: none; }
	.notch {
		position: absolute; top: 50%; width: 52rpx; height: 52rpx; border-radius: 50%;
		transform: translateY(-50%); background: #0f0a26; border: 2rpx solid rgba(167,139,250,.3);
		&.l { left: -52rpx; }
		&.r { right: -52rpx; }
	}
}

// ===== 印章 =====
.stamp {
	position: absolute; left: 50%; top: 50%; z-index: 3;
	transform: translate(-50%, -50%) rotate(-9deg);
	padding: 24rpx 40rpx 20rpx; text-align: center; border-radius: 20rpx;
	border: 4rpx solid transparent;
	background: linear-gradient(rgba(23,14,49,.62), rgba(23,14,49,.62)) padding-box,
		linear-gradient(135deg, #22d3ee, #8b5cf6) border-box;
	box-shadow: 0 16rpx 40rpx -16rpx rgba(34,211,238,.35);
	&::after {
		content: ""; position: absolute; top: 10rpx; left: 10rpx; right: 10rpx; bottom: 10rpx;
		border: 2rpx dashed rgba(158,234,251,.5); border-radius: 12rpx;
	}
	.stamp-cn { display: block; font-size: 52rpx; font-weight: 900; letter-spacing: 8rpx;
		background: linear-gradient(180deg, #a5f3fc 0%, #8be0f7 42%, #c4b5fd 100%);
		-webkit-background-clip: text; background-clip: text; color: transparent;
	}
	.stamp-sub { display: block; margin-top: 6rpx; font-size: 18rpx; letter-spacing: 4rpx; color: #a5b4fc; }
}

// ===== 副券 =====
.ticket-stub {
	position: relative; z-index: 1; display: flex; align-items: flex-start;
	justify-content: space-between; padding: 44rpx 68rpx 40rpx; gap: 32rpx;
}
.stub-left { flex: 1; }
.stub-label { display: block; font-size: 20rpx; letter-spacing: 4rpx; color: rgba(225,220,255,.66); margin-bottom: 16rpx; }
.stub-no { display: block; font-size: 48rpx; font-weight: 700; color: #e9e2ff; letter-spacing: 4rpx; }
.stub-num { color: #67e8f9; }
.stub-route { display: flex; align-items: center; gap: 12rpx; margin-top: 16rpx; 
	.tag{
		color: #8bfae7;
	}
}
.route-arrow { display: flex; align-items: center; flex: none; }
.arrow-circle { width: 12rpx; height: 12rpx; border-radius: 50%; border: 2rpx solid #67e8f9; }
.arrow-dash { width: 60rpx; height: 0; border-top: 2rpx dashed #a78bfa; margin: 0 4rpx; }
.arrow-head { width: 0; height: 0; border-left: 10rpx solid #a78bfa; border-top: 6rpx solid transparent; border-bottom: 6rpx solid transparent; }
.route-text { font-size: 24rpx; color: #c7d2fe; }
.stub-right { display: flex; flex-direction: column; align-items: flex-end; gap: 12rpx; flex: none; }
.barcode { display: flex; align-items: flex-end; height: 80rpx; gap: 3rpx; }
.barcode .bar { height: 100%; background: rgba(239,234,255,.85); }
.barcode-no { font-size: 20rpx; letter-spacing: 4rpx; color: rgba(225,220,255,.66); }

// ===== 底部 =====
.ticket-foot {
	position: relative; z-index: 1; text-align: center;
	padding: 0 60rpx 40rpx; font-size: 20rpx; letter-spacing: 4rpx;
	color: rgba(225,220,255,.66);
}
</style>
