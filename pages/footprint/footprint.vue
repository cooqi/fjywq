<template>
	<view class="page-container">
		<!-- 未登录状态 -->
		<view class="login-tip" v-if="!userInfo._id">
			<text>请先登录后查看足迹</text>
		</view>
		
		<!-- 已登录状态 -->
		<view class="content-box" v-else>
			<!-- 地图路线区域 -->
			<view class="map-section" v-if="routeData.length > 0">
				<canvas canvas-id="routeMap" id="routeMap" class="route-canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
				<view class="map-actions">
					<button class="action-btn save-img" @click="saveMapImage">保存图片</button>
					<button class="action-btn play-dynamic" @click="playDynamicRoute">▶ 看动态版</button>
				</view>
			</view>
			<view class="stats-section">
			<!-- 统计信息 -->
			<view class="stats-box">
				<view class="stat-item">
					<view class="stat-value">{{provinceList.length}}</view>
					<view class="stat-label">去过的省份</view>
				</view>
				<view class="stat-item">
					<view class="stat-value">{{totalConcerts}}</view>
					<view class="stat-label">参加场次</view>
				</view>
			</view>
			
			
			
			<!-- 省份列表 -->
			<view class="province-list">
				<view class="list-title">足迹详情</view>
				
				<view 
					class="province-item"
					v-for="(province, index) in provinceList"
					:key="index"
					@click="showProvinceDetail(province)"
				>
					<view class="province-info">
						<view class="province-name">{{province.name}}</view>
						<view class="province-count">{{province.count}} 场</view>
					</view>
					<view class="province-cities">
						<text v-for="(city, cIndex) in province.cities" :key="cIndex" class="city-tag">
							{{city}}
						</text>
					</view>
				</view>
				
				<!-- 空状态 -->
				<view class="empty-box" v-if="provinceList.length === 0 && !loading">
					<view class="empty-icon">🗺️</view>
					<text class="empty-text">还没有足迹记录</text>
					<text class="empty-desc">参加演唱会或音乐节后会自动生成足迹</text>
				</view>
			</view>

			</view>
		</view>
		
		<!-- 加载中 -->
		<view class="loading-box" v-if="loading">
			<text>加载中...</text>
		</view>
		
		<!-- 省份详情弹窗 -->
		<view class="popup-mask" v-if="showDetailPopup" @click="closePopup"></view>
		<view class="popup-box" v-if="showDetailPopup">
			<view class="popup-header">
				<text class="popup-title">{{currentProvince ? currentProvince.name : ''}}</text>
				<text class="popup-close" @click="closePopup">×</text>
			</view>
			<view class="popup-body">
				<view class="popup-subtitle">共 {{currentProvince ? currentProvince.count : 0}} 场</view>
				<view 
					class="record-item" 
					v-for="(record, rIdx) in (currentProvince ? currentProvince.records : [])" 
					:key="rIdx"
				>
					<view class="record-info">
						<view class="record-type-tag">{{record.payType}}</view>
						<view class="record-city">{{record.city}}</view>
						<view class="record-time">{{formatRecordTime(record.payTime)}}</view>
					</view>
					<view class="record-actions">
						<view class="action-btn detail-btn" @click="goConcertDetail(record)">查看详情</view>
						<view class="action-btn ticket-btn" @click="goTicketCard(record)">生成票根</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import chinaSimpleGeo from './china-simple.json'
	export default {
		data() {
			return {
				userInfo: {},
				loading: false,
				provinceList: [], // 省份列表
				totalConcerts: 0, // 总场次
				totalDistance: 0, // 总里程
				routeData: [], // 路线数据 [{city, time, lng, lat}]
				canvasWidth: 680,
				canvasHeight: 500,
				chinaGeo: null, // 中国地图 GeoJSON 数据
				bgImagePath: '', // 缓存的静态背景图路径
				isAnimating: false, // 是否正在动画
				animationTimer: null,
				// 省份详情弹窗
				showDetailPopup: false,
				currentProvince: null
			}
		},
		onLoad() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.loadFootprint()
				}
			}
			// 加载简化版中国地图 GeoJSON
			this.loadChinaGeo()
		},
		onShow() {
			const userInfo = uni.getStorageSync('userInfo')
			if (userInfo) {
				this.userInfo = JSON.parse(userInfo)
				if (this.userInfo._id) {
					this.loadFootprint()
				}
			}
		},
		onUnload() {
			if (this.animationTimer) {
				clearInterval(this.animationTimer)
				this.animationTimer = null
			}
		},
		methods: {
			// 测量容器尺寸并绘制
			measureAndDraw() {
				const query = uni.createSelectorQuery().in(this)
				query.select('#routeMap').boundingClientRect((rect) => {
					if (!rect) {
						console.error('canvas 元素未找到')
						return
					}
					console.log('canvas 容器尺寸:', rect.width, 'x', rect.height)
					this.canvasWidth = Math.round(rect.width)
					this.canvasHeight = Math.round(rect.height)
					// 等待尺寸生效后缓存背景，再绘制路线
					setTimeout(() => {
						this.cacheStaticBackground(() => {
							this.drawRouteMap()
						})
					}, 100)
				}).exec()
			},
			
			// 加载中国地图 GeoJSON
			loadChinaGeo() {
				this.chinaGeo = chinaSimpleGeo
				console.log('中国地图 GeoJSON 加载完成, 省份数:', this.chinaGeo.features.length)
			},
			
			// 加载足迹数据
			loadFootprint() {
				if (!this.userInfo._id) return
				
				this.loading = true
				
				// 查询用户的演唱会/音乐节消费记录
				uniCloud.callFunction({
					name: 'pay-record',
					data: {
						type: 'get',
						userId: this.userInfo._id,
						payType: ['演唱会', '音乐节', '见面会']
					},
					success: (res) => {
						this.loading = false
						if (res.result.code === 0 && res.result.data) {
							const records = res.result.data || []
							this.totalConcerts = records.length
							
							// 处理数据，按省份分组
							this.processFootprintData(records)
						}
					},
					fail: (err) => {
						this.loading = false
						console.error('加载足迹失败:', err)
						uni.showToast({
							title: '加载失败',
							icon: 'none'
						})
					}
				})
			},
			
			// 处理足迹数据
			processFootprintData(records) {
				const provinceMap = {}
				const routePoints = []
				let totalDist = 0
				
				// 按时间排序
				const sortedRecords = records.sort((a, b) => {
					return new Date(a.payTime || 0) - new Date(b.payTime || 0)
				})
				
				sortedRecords.forEach(record => {
					// 从地址中提取省份信息
					let province = ''
					let city = ''
					
					if (record.Province) {
						province = record.Province
						city = record.adress || '未知城市'
					} else if (record.adress) {
						const address = record.adress
						province = this.extractProvince(address)
						city = this.extractCity(address)
					}
					
					if (!province) province = '未知省份'
					if (!city) city = '未知城市'
					
					// 添加到省份映射
					if (!provinceMap[province]) {
						provinceMap[province] = {
							name: province,
							count: 1,
							cities: new Set([city]),
							records: []
						}
					} else {
						provinceMap[province].count++
						provinceMap[province].cities.add(city)
					}
					// 存储记录详情
					provinceMap[province].records.push({
						_id: record._id,
						concertID: record.concertID || '',
						city: city,
						payTime: record.payTime || '',
						adress: record.adress || '',
						Province: record.Province || province,
						payName: record.payName || '',
						payType: record.payType || ''
					})
					
					// 收集路线点
					const coords = this.getCityCoords(city)
					if (coords) {
						routePoints.push({
							city: city,
							time: record.payTime || '',
							lng: coords.lng,
							lat: coords.lat
						})
						
						// 计算距离
						if (routePoints.length > 1) {
							const prev = routePoints[routePoints.length - 2]
							totalDist += this.calculateDistance(prev.lng, prev.lat, coords.lng, coords.lat)
						}
					}
				})
				
				this.provinceList = Object.values(provinceMap).map(item => ({
					...item,
					cities: Array.from(item.cities),
					records: item.records
				})).sort((a, b) => b.count - a.count)
				
				this.routeData = routePoints
				this.totalDistance = Math.round(totalDist)
				
				console.log('足迹数据:', this.provinceList)
				console.log('路线数据:', this.routeData)
				
				// 绘制地图（v-if 后 canvas 需要时间渲染）
				setTimeout(() => {
					this.measureAndDraw()
				}, 300)
			},
			
			// 从地址中提取省份
			extractProvince(address) {
				if (!address) return ''
				
				// 匹配常见的省份名称
				const provinces = [
					'北京', '天津', '上海', '重庆',
					'河北', '山西', '辽宁', '吉林', '黑龙江',
					'江苏', '浙江', '安徽', '福建', '江西', '山东',
					'河南', '湖北', '湖南', '广东', '海南',
					'四川', '贵州', '云南', '陕西', '甘肃', '青海',
					'台湾', '内蒙古', '广西', '西藏', '宁夏', '新疆', '香港', '澳门'
				]
				
				for (let province of provinces) {
					if (address.includes(province)) {
						return province
					}
				}
				
				return ''
			},
			
			// 从地址中提取城市
			extractCity(address) {
				if (!address) return ''
				
				// 简单的城市提取：去掉省份后的部分
				const province = this.extractProvince(address)
				if (province) {
					return address.replace(province, '').trim()
				}
				
				return address
			},
			
			// 显示省份详情
			showProvinceDetail(province) {
				this.currentProvince = province
				this.showDetailPopup = true
			},
			
			// 关闭弹窗
			closePopup() {
				this.showDetailPopup = false
				this.currentProvince = null
			},
			
			// 格式化记录时间
			formatRecordTime(timeStr) {
				if (!timeStr) return ''
				const d = new Date(timeStr)
				if (isNaN(d.getTime())) return timeStr
				const y = d.getFullYear()
				const m = String(d.getMonth() + 1).padStart(2, '0')
				const day = String(d.getDate()).padStart(2, '0')
				return `${y}-${m}-${day}`
			},
			
			// 跳转演唱会详情
			goConcertDetail(record) {
				if (record.concertID) {
					uni.navigateTo({
						url: '/pages/concert/detail?id=' + record.concertID
					})
				} else {
					// 没有关联演唱会，通过地址信息跳转
					const params = encodeURIComponent(JSON.stringify({
						adress: record.adress,
						Province: record.Province,
						payTime: record.payTime,
						payName: record.payName,
						payType: record.payType
					}))
					uni.navigateTo({
						url: '/pages/concert/detail?payInfo=' + params
					})
				}
			},
			
			// 生成票根
			goTicketCard(record) {
				if (record.concertID) {
					uni.navigateTo({
						url: '/pages/footprint/detail?id=' + record.concertID + '&mode=ticket'
					})
				} else {
					const params = encodeURIComponent(JSON.stringify({
						adress: record.adress,
						Province: record.Province,
						payTime: record.payTime,
						payName: record.payName,
						payType: record.payType
					}))
					uni.navigateTo({
						url: '/pages/footprint/detail?payInfo=' + params + '&mode=ticket'
					})
				}
			},
			
			// 获取城市坐标
			getCityCoords(cityName) {
				const cityCoords = {
					'北京': {lng: 116.4, lat: 39.9},
					'天津': {lng: 117.2, lat: 39.1},
					'上海': {lng: 121.5, lat: 31.2},
					'重庆': {lng: 106.5, lat: 29.6},
					'广州': {lng: 113.3, lat: 23.1},
					'深圳': {lng: 114.1, lat: 22.5},
					'杭州': {lng: 120.2, lat: 30.3},
					'南京': {lng: 118.8, lat: 32.1},
					'成都': {lng: 104.1, lat: 30.7},
					'武汉': {lng: 114.3, lat: 30.6},
					'西安': {lng: 108.9, lat: 34.3},
					'长沙': {lng: 112.9, lat: 28.2},
					'郑州': {lng: 113.6, lat: 34.8},
					'济南': {lng: 117.0, lat: 36.7},
					'青岛': {lng: 120.3, lat: 36.1},
					'大连': {lng: 121.6, lat: 38.9},
					'沈阳': {lng: 123.4, lat: 41.8},
					'哈尔滨': {lng: 126.6, lat: 45.8},
					'昆明': {lng: 102.7, lat: 25.0},
					'贵阳': {lng: 106.7, lat: 26.6},
					'南宁': {lng: 108.3, lat: 22.8},
					'福州': {lng: 119.3, lat: 26.1},
					'厦门': {lng: 118.1, lat: 24.5},
					'南昌': {lng: 115.9, lat: 28.7},
					'合肥': {lng: 117.3, lat: 31.9},
					'太原': {lng: 112.5, lat: 37.9},
					'石家庄': {lng: 114.5, lat: 38.0},
					'兰州': {lng: 103.8, lat: 36.1},
					'银川': {lng: 106.3, lat: 38.5},
					'西宁': {lng: 101.8, lat: 36.6},
					'拉萨': {lng: 91.1, lat: 29.6},
					'乌鲁木齐': {lng: 87.6, lat: 43.8},
					'呼和浩特': {lng: 111.7, lat: 40.8},
					'澳门': {lng: 113.5, lat: 22.2},
					'香港': {lng: 114.2, lat: 22.3},
					'丽水': {lng: 119.9, lat: 28.5},
					'襄阳': {lng: 112.1, lat: 32.0},
					'恩施': {lng: 109.5, lat: 30.3},
					'嘉兴': {lng: 120.8, lat: 30.8},
					'佛山': {lng: 113.1, lat: 23.0},
					'东莞': {lng: 113.8, lat: 23.0},
					'珠海': {lng: 113.6, lat: 22.3},
					'无锡': {lng: 120.3, lat: 31.6},
					'苏州': {lng: 120.6, lat: 31.3},
					'宁波': {lng: 121.5, lat: 29.9},
					'温州': {lng: 120.7, lat: 28.0},
					'常州': {lng: 119.9, lat: 31.8},
					'徐州': {lng: 117.2, lat: 34.2},
					'烟台': {lng: 121.4, lat: 37.5},
					'潍坊': {lng: 119.2, lat: 36.7},
					'洛阳': {lng: 112.4, lat: 34.6},
					'宜昌': {lng: 111.3, lat: 30.7},
					'株洲': {lng: 113.1, lat: 27.8},
					'桂林': {lng: 110.3, lat: 25.3},
					'柳州': {lng: 109.4, lat: 24.3},
					'绵阳': {lng: 104.7, lat: 31.5},
					'大理': {lng: 100.2, lat: 25.6},
					'丽江': {lng: 100.2, lat: 26.9},
					'三亚': {lng: 109.5, lat: 18.3},
					'秦皇岛': {lng: 119.6, lat: 39.9}
				}
				
				// 先尝试直接匹配
				for (let city in cityCoords) {
					if (cityName === city) return cityCoords[city]
				}
				// 再尝试包含匹配（处理“深圳世界之窗”→“深圳”、“湖北省恩施”→“恩施”）
				for (let city in cityCoords) {
					if (cityName.includes(city)) return cityCoords[city]
				}
				// 反向包含（城市名包含了输入，如输入“恩施”但字典有“恩施市”）
				for (let city in cityCoords) {
					if (city.includes(cityName)) return cityCoords[city]
				}
				
				console.warn('未找到城市坐标:', cityName)
				return null
			},
			
			// 计算两点间距离（Haversine公式）
			calculateDistance(lng1, lat1, lng2, lat2) {
				const R = 6371 // 地球半径(km)
				const dLat = (lat2 - lat1) * Math.PI / 180
				const dLng = (lng2 - lng1) * Math.PI / 180
				const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
					Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
					Math.sin(dLng/2) * Math.sin(dLng/2)
				const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
				return R * c
			},
			
			// 缓存静态背景（背景+网格+地图+水印）为图片
			cacheStaticBackground(callback) {
				const ctx = uni.createCanvasContext('routeMap', this)
				const W = this.canvasWidth
				const H = this.canvasHeight
				const toX = (lng) => ((lng - 73) / (135 - 73)) * W
				const toY = (lat) => ((53 - lat) / (53 - 18)) * H
				
				// 背景
				ctx.setFillStyle('#e8f8f5')
				ctx.fillRect(0, 0, W, H)
				// 网格
				ctx.setStrokeStyle('rgba(100, 140, 160, 0.15)')
				ctx.setLineWidth(0.5)
				for (let lng = 80; lng <= 130; lng += 10) {
					const x = toX(lng)
					ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
				}
				for (let lat = 20; lat <= 50; lat += 5) {
					const y = toY(lat)
					ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
				}
				// 地图
				this.drawChinaMap(ctx, W, H, toX, toY)
				// 水印
				ctx.setFillStyle('rgba(0,0,0,0.06)')
				ctx.setFontSize(14)
				ctx.setTextAlign('right')
				ctx.fillText('FOOTPRINT MAP', W - 16, H - 14)
				
				ctx.draw(false, () => {
					uni.canvasToTempFilePath({
						canvasId: 'routeMap',
						success: (res) => {
							this.bgImagePath = res.tempFilePath
							console.log('静态背景已缓存')
							callback && callback()
						},
						fail: () => {
							console.log('缓存失败，使用直接绘制模式')
							callback && callback()
						}
					}, this)
				})
			},
			
			// 绘制航线图（分层：缓存背景 + 动态路线）
			drawRouteMap(progress = 1) {
				if (this.routeData.length === 0) return
				
				const ctx = uni.createCanvasContext('routeMap', this)
				const W = this.canvasWidth
				const H = this.canvasHeight
				const toX = (lng) => ((lng - 73) / (135 - 73)) * W
				const toY = (lat) => ((53 - lat) / (53 - 18)) * H
				
				// === 背景层：优先使用缓存 ===
				if (this.bgImagePath) {
					ctx.drawImage(this.bgImagePath, 0, 0, W, H)
				} else {
					ctx.setFillStyle('#e8f8f5')
					ctx.fillRect(0, 0, W, H)
					ctx.setStrokeStyle('rgba(100, 140, 160, 0.15)')
					ctx.setLineWidth(0.5)
					for (let lng = 80; lng <= 130; lng += 10) {
						const x = toX(lng)
						ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
					}
					for (let lat = 20; lat <= 50; lat += 5) {
						const y = toY(lat)
						ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
					}
					this.drawChinaMap(ctx, W, H, toX, toY)
				}
				
				// === 动态层：航线弧线 ===
				const segmentsToDraw = Math.floor((this.routeData.length - 1) * progress)
				// 航线颜色（rgba格式，方便调透明度）
				const routeColors = [
					{main: '#00d4ff', glow: 'rgba(0, 212, 255, 0.18)'},
					{main: '#00e5a0', glow: 'rgba(0, 229, 160, 0.18)'},
					{main: '#ff6b9d', glow: 'rgba(255, 107, 157, 0.18)'},
					{main: '#ffc857', glow: 'rgba(255, 200, 87, 0.18)'},
					{main: '#a78bfa', glow: 'rgba(167, 139, 250, 0.18)'}
				]
				
				for (let i = 0; i < segmentsToDraw && i < this.routeData.length - 1; i++) {
					const s = this.routeData[i]
					const e = this.routeData[i + 1]
					const x1 = toX(s.lng), y1 = toY(s.lat)
					const x2 = toX(e.lng), y2 = toY(e.lat)
					const colorSet = routeColors[i % routeColors.length]
					
					// 计算弧线控制点
					const midX = (x1 + x2) / 2
					const midY = (y1 + y2) / 2
					const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2) || 1
					const arcHeight = Math.min(dist * 0.25, 80)
					const ddx = x2 - x1, ddy = y2 - y1
					const nx = -ddy / dist, ny = ddx / dist
					const cpX = midX + nx * arcHeight
					const cpY = midY + ny * arcHeight
					
					// 外发光（宽线 + 半透明色）
					ctx.beginPath()
					ctx.setStrokeStyle(colorSet.glow)
					ctx.setLineWidth(8)
					ctx.moveTo(x1, y1)
					ctx.quadraticCurveTo(cpX, cpY, x2, y2)
					ctx.stroke()
					
					// 主线（用短划线模拟虚线，兼容小程序）
					this.drawDashedArc(ctx, x1, y1, cpX, cpY, x2, y2, colorSet.main, 2, [6, 4])
					
					// 弧线中点小箭头
					const t = 0.5
					const arrowX = (1-t)*(1-t)*x1 + 2*(1-t)*t*cpX + t*t*x2
					const arrowY = (1-t)*(1-t)*y1 + 2*(1-t)*t*cpY + t*t*y2
					const tanX = 2*(1-t)*(cpX-x1) + 2*t*(x2-cpX)
					const tanY = 2*(1-t)*(cpY-y1) + 2*t*(y2-cpY)
					const tanLen = Math.sqrt(tanX**2 + tanY**2) || 1
					const ux = tanX/tanLen, uy = tanY/tanLen
					const aSize = 5
					ctx.beginPath()
					ctx.setFillStyle(colorSet.main)
					ctx.moveTo(arrowX + ux*aSize, arrowY + uy*aSize)
					ctx.lineTo(arrowX - uy*aSize*0.6 - ux*aSize*0.3, arrowY + ux*aSize*0.6 - uy*aSize*0.3)
					ctx.lineTo(arrowX + uy*aSize*0.6 - ux*aSize*0.3, arrowY - ux*aSize*0.6 - uy*aSize*0.3)
					ctx.closePath()
					ctx.fill()
				}
				
				// === 5. 城市标记点（机场样式） ===
				const pointsToShow = Math.min(segmentsToDraw + 1, this.routeData.length)
				for (let i = 0; i < pointsToShow; i++) {
					const p = this.routeData[i]
					const x = toX(p.lng), y = toY(p.lat)
					const isFirst = (i === 0)
					const isLast = (i === pointsToShow - 1 && progress >= 1)
					
					// 脉冲光晕
					ctx.beginPath()
					ctx.arc(x, y, 14, 0, 2 * Math.PI)
					ctx.setFillStyle(isFirst ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 107, 157, 0.12)')
					ctx.fill()
					
					// 外圈
					ctx.beginPath()
					ctx.arc(x, y, 7, 0, 2 * Math.PI)
					ctx.setFillStyle(isFirst ? '#e8f8f5' : '#e8f8f5')
					ctx.fill()
					ctx.beginPath()
					ctx.arc(x, y, 7, 0, 2 * Math.PI)
					ctx.setStrokeStyle(isFirst ? '#00d4ff' : '#ff6b9d')
					ctx.setLineWidth(2)
					ctx.stroke()
					
					// 内圈小圆点
					ctx.beginPath()
					ctx.arc(x, y, 3, 0, 2 * Math.PI)
					ctx.setFillStyle(isFirst ? '#00d4ff' : '#ff6b9d')
					ctx.fill()
					
					// 序号标签
					ctx.setFillStyle('#333')
					ctx.setFontSize(9)
					ctx.setTextAlign('center')
					ctx.fillText((i+1).toString(), x, y + 3)
					
					// 城市名称
					ctx.setFillStyle('rgba(50,50,50,0.85)')
					ctx.setFontSize(11)
					ctx.setTextAlign('center')
					ctx.fillText(p.city, x, y - 18)
				}
				
				ctx.draw()
			},
			
			// 绘制虚线弧线（兼容小程序，手动采样）
			drawDashedArc(ctx, x1, y1, cpX, cpY, x2, y2, color, lineWidth, dashPattern) {
				const steps = 40
				const dashLen = dashPattern[0]
				const gapLen = dashPattern[1]
				const cycleLen = dashLen + gapLen
				
				// 采样所有点
				const points = []
				for (let i = 0; i <= steps; i++) {
					const t = i / steps
					const px = (1-t)*(1-t)*x1 + 2*(1-t)*t*cpX + t*t*x2
					const py = (1-t)*(1-t)*y1 + 2*(1-t)*t*cpY + t*t*y2
					points.push({x: px, y: py})
				}
				
				// 计算累计距离，按 dash 模式绘制
				let totalDist = 0
				let drawing = true
				let segStart = 0
				
				ctx.beginPath()
				ctx.setStrokeStyle(color)
				ctx.setLineWidth(lineWidth)
				ctx.moveTo(points[0].x, points[0].y)
				
				for (let i = 1; i < points.length; i++) {
					const dx = points[i].x - points[i-1].x
					const dy = points[i].y - points[i-1].y
					const d = Math.sqrt(dx*dx + dy*dy)
					const prevDist = totalDist
					totalDist += d
					
					// 检查是否跨越了 dash/gap 边界
					const prevPhase = prevDist % cycleLen
					const currPhase = totalDist % cycleLen
					
					if (prevPhase < dashLen && currPhase >= dashLen) {
						// 从 dash 进入 gap：画到边界，停止
						const ratio = (dashLen - prevPhase) / d
						const bx = points[i-1].x + dx * ratio
						const by = points[i-1].y + dy * ratio
						ctx.lineTo(bx, by)
						ctx.stroke()
						drawing = false
						ctx.beginPath()
						ctx.moveTo(bx, by)
					} else if (prevPhase >= dashLen && currPhase < dashLen) {
						// 从 gap 进入 dash：移动到边界，开始画
						const ratio = (cycleLen - prevPhase) / d
						const bx = points[i-1].x + dx * ratio
						const by = points[i-1].y + dy * ratio
						ctx.stroke()
						ctx.beginPath()
						ctx.moveTo(bx, by)
						drawing = true
					}
					
					if (drawing) {
						ctx.lineTo(points[i].x, points[i].y)
					} else {
						ctx.moveTo(points[i].x, points[i].y)
					}
				}
				ctx.stroke()
			},
			
			// 绘制中国地图（基于 GeoJSON）
			drawChinaMap(ctx, W, H, toX, toY) {
				if (!this.chinaGeo || !this.chinaGeo.features) return
				
				ctx.setStrokeStyle('rgba(100, 160, 220, 0.4)')
				ctx.setLineWidth(0.8)
				ctx.setFillStyle('rgba(180, 160, 220, 0.3)')
				
				this.chinaGeo.features.forEach(feature => {
					const geom = feature.geometry
					const polygons = geom.type === 'Polygon' 
						? [geom.coordinates] 
						: geom.coordinates
					
					polygons.forEach(polygon => {
						polygon.forEach(ring => {
							if (ring.length < 3) return
							ctx.beginPath()
							ring.forEach((coord, idx) => {
								const x = toX(coord[0])
								const y = toY(coord[1])
								if (idx === 0) ctx.moveTo(x, y)
								else ctx.lineTo(x, y)
							})
							ctx.closePath()
							ctx.fill()
							ctx.stroke()
						})
					})
				})
			},
			
			// 保存地图图片
			saveMapImage() {
				uni.canvasToTempFilePath({
					canvasId: 'routeMap',
					success: (res) => {
						uni.saveImageToPhotosAlbum({
							filePath: res.tempFilePath,
							success: () => {
								uni.showToast({
									title: '保存成功',
									icon: 'success'
								})
							},
							fail: (err) => {
								console.error('保存失败', err)
								uni.showToast({
									title: '保存失败',
									icon: 'none'
								})
							}
						})
					},
					fail: (err) => {
						console.error('生成图片失败', err)
						uni.showToast({
							title: '生成失败',
							icon: 'none'
						})
					}
				}, this)
			},
			
			// 播放动态路线
			playDynamicRoute() {
				if (this.isAnimating) return
				
				this.isAnimating = true
				let progress = 0
				const totalPoints = this.routeData.length
				const duration = Math.max(2000, totalPoints * 600) // 每个点 0.6 秒
				const interval = 100
				const step = interval / duration
				
				this.animationTimer = setInterval(() => {
					progress += step
					if (progress >= 1) {
						progress = 1
						clearInterval(this.animationTimer)
						this.isAnimating = false
					}
					this.drawRouteMap(progress)
				}, interval)
			}
		}
	}
</script>

<style lang="scss">
.page-container {
	min-height: 100vh;
	background: linear-gradient(180deg, #cff8f5 0%, #e6cffc 100%);
	
}
.stats-section{
	padding: 20rpx;
}
.login-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 60vh;
	font-size: 28rpx;
	color: #999;
}

.content-box {
	padding-bottom: 40rpx;
}

// 统计信息
.stats-box {
	display: flex;
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
	
	.stat-item {
		flex: 1;
		text-align: center;
		
		&:not(:last-child) {
			border-right: 1rpx solid #f0f0f0;
		}
		
		.stat-value {
			font-size: 56rpx;
			font-weight: bold;
			color: #c62828;
			margin-bottom: 12rpx;
		}
		
		.stat-label {
			font-size: 26rpx;
			color: #666;
		}
	}
}

// 地图路线区域
.map-section {
	
	
	margin-bottom: 30rpx;
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 24rpx;
		text-align: center;
	}
	
	.route-canvas {
		width: 100%;
		height: 500rpx;
		display: block;
		border-radius: 16rpx;
		background: #e8f8f5;
	}
	
	.map-actions {
		display: flex;
		gap: 20rpx;
		margin: 24rpx;
		
		.action-btn {
			flex: 1;
			height: 80rpx;
			border-radius: 40rpx;
			font-size: 28rpx;
			border: none;
			
			&.save-img {
				background: linear-gradient(135deg, #ff6b9d 0%, #c62828 100%);
				color: #fff;
			}
			
			&.play-dynamic {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: #fff;
			}
		}
	}
}

// 省份列表
.province-list {
	.list-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 24rpx;
		padding-left: 12rpx;
		border-left: 6rpx solid #c62828;
	}
	
	.province-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		
		&:active {
			background: #f5f5f5;
		}
		
		.province-info {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16rpx;
			
			.province-name {
				font-size: 32rpx;
				font-weight: bold;
				color: #333;
			}
			
			.province-count {
				font-size: 28rpx;
				color: #c62828;
				font-weight: 500;
			}
		}
		
		.province-cities {
			display: flex;
			flex-wrap: wrap;
			gap: 12rpx;
			
			.city-tag {
				background: #fff8e1;
				color: #666;
				font-size: 24rpx;
				padding: 8rpx 16rpx;
				border-radius: 8rpx;
			}
		}
	}
	
	.empty-box {
		text-align: center;
		padding: 100rpx 0;
		
		.empty-icon {
			font-size: 100rpx;
			margin-bottom: 24rpx;
		}
		
		.empty-text {
			font-size: 28rpx;
			color: #999;
			display: block;
			margin-bottom: 12rpx;
		}
		
		.empty-desc {
			font-size: 24rpx;
			color: #bbb;
			display: block;
		}
	}
}

// 加载中
.loading-box {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: rgba(0, 0, 0, 0.7);
	color: #fff;
	padding: 30rpx 50rpx;
	border-radius: 16rpx;
	font-size: 28rpx;
}

// 省份详情弹窗
.popup-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 998;
}

.popup-box {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 680rpx;
	max-height: 75vh;
	background: #fff;
	border-radius: 24rpx;
	z-index: 99999;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	
	.popup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 28rpx 32rpx;
		border-bottom: 1rpx solid #f0f0f0;
		
		.popup-title {
			font-size: 34rpx;
			font-weight: bold;
			color: #333;
		}
		
		.popup-close {
			font-size: 48rpx;
			color: #999;
			line-height: 1;
			padding: 0 10rpx;
		}
	}
	
	.popup-body {
		overflow-y: auto;
		padding: 24rpx 32rpx;
		
		.popup-subtitle {
			font-size: 26rpx;
			color: #999;
			margin-bottom: 24rpx;
		}
		
		.record-item {
			background: #f9f9f9;
			border-radius: 16rpx;
			padding: 24rpx;
			margin-bottom: 20rpx;
			
			&:last-child {
				margin-bottom: 0;
			}
			
			.record-info {
				display: flex;
				align-items: center;
				gap: 16rpx;
				margin-bottom: 20rpx;
				
				.record-type-tag {
					padding: 6rpx 16rpx;
					border-radius: 16rpx;
					font-size: 22rpx;
					background: #ffe0e6;
					color: #c62828;
					flex-shrink: 0;
				}
				
				.record-city {
					font-size: 30rpx;
					font-weight: 500;
					color: #333;
				}
				
				.record-time {
					font-size: 24rpx;
					color: #999;
					margin-left: auto;
				}
			}
			
			.record-actions {
				display: flex;
				gap: 16rpx;
				
				.action-btn {
					flex: 1;
					height: 64rpx;
					display: flex;
					align-items: center;
					justify-content: center;
					border-radius: 32rpx;
					font-size: 26rpx;
					
					&:active {
						opacity: 0.8;
					}
				}
				
				.detail-btn {
					background: #e3f2fd;
					color: #1976D2;
				}
				
				.ticket-btn {
					background: linear-gradient(135deg, #ff6b9d 0%, #c62828 100%);
					color: #fff;
				}
			}
		}
	}
}
</style>
