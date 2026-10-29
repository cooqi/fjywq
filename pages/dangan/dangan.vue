<template>
	<view class="app-root" :class="shellClass">
		<!-- 顶部主体切换 + 管理入口 -->
		<view class="top-tabs-wrap">
			<view class="top-tabs">
				<view
					class="top-tab"
					v-for="s in subjectOrder"
					:key="s"
					:class="{ active: currentSubject === s, 'purple-tab': s === 'feng' }"
					@click="switchSubject(s)"
				>{{ subjects[s].short }}</view>
			</view>
		</view>
        <view class="admin-entry" v-if="isAdmin" @click="goAdmin">管理</view>

		<view class="main-content">
			<!-- ============ 青宇 ============ -->
			<view class="tab-view active" v-if="currentSubject === 'intersection'">
				<view class="intersection-header">
					<view class="intersection-title">青宇 · 青宇档案</view>
					<view class="intersection-sub">王青 × 冯建宇 合作全记录</view>
					<view class="duo-fandom">
						<view class="duo-fandom-item"><view class="duo-fandom-dot wang-color"></view><text class="duo-fandom-text">王青 · #31eee0</text></view>
						<view class="duo-fandom-sep">×</view>
						<view class="duo-fandom-item"><view class="duo-fandom-dot feng-color"></view><text class="duo-fandom-text">冯建宇 · #9a9ad9</text></view>
					</view>
					<view class="intersection-stats">
						<view class="is-item" v-for="(st, i) in statsList" :key="i">
							<view class="is-value">{{ st.value }}<text>{{ st.unit }}</text></view>
							<view class="is-label">{{ st.label }}</view>
						</view>
					</view>
				</view>

				<!-- CP 平台账号 -->
				<view class="platform-section">
					<view class="platform-section-header">
						<view class="platform-section-title cp-title">CP平台账号</view>
						<view class="platform-section-count">{{ accountsList.length }} 个</view>
					</view>
					<scroll-view scroll-x class="platform-strip">
						<view class="platform-mini cp-mini" v-for="(a, i) in accountsList" :key="i" @click="copyAccount(a.data)">
							<view class="platform-mini-icon" :class="a.data.icon || 'default'">{{ a.data.iconText }}</view>
							<view class="platform-mini-name">{{ a.data.platform }}</view>
                            <view class="platform-mini-name">{{ a.data.handle }}</view>
							<view class="platform-mini-fans">{{ a.data.fans }}</view>
							<view class="platform-mini-growth" v-if="a.data.growth">{{ a.data.growth }}</view>
						</view>
					</scroll-view>
				</view>

				<!-- 分类 chips -->
				<scroll-view scroll-x class="category-chips">
					<view class="chip" v-for="c in listCategories" :key="c" :class="{ active: currentCat === c, 'purple-chip': currentCat === c }" @click="switchCat(c)">
						{{ catLabel(c) }}<text class="chip-count">{{ catCount(c) }}</text>
					</view>
				</scroll-view>

				<!-- 作品二级 -->
				<view class="work-sections" v-if="currentCat === 'works'">
					<view class="work-section-tab" v-for="s in workSections" :key="s.key" :class="{ active: currentSection === s.key, 'purple-section': currentSection === s.key }" @click="switchSection(s.key)">
						<text>{{ s.label }}</text><text class="work-section-count">{{ sectionCount(s.key) }}</text>
					</view>
				</view>

				<view class="list-container active">
					<block v-for="(it, iidx) in displayItems" :key="it._id">
						<!-- 作品 -->
						<view class="data-card work-card" v-if="cardKind === 'work'">
							<view class="work-poster" :class="[sectionPoster(it.data.section), it.data.poster ? 'has-poster' : '']">
								<image v-if="it.data.poster" class="work-poster-img" :src="it.data.poster" mode="aspectFill"></image>
								<text v-else>{{ sectionPosterLabel(it.data.section) }}</text>
							</view>
							<view class="work-info">
								<view class="work-title">{{ it.data.title || it.data.name || '' }}</view>
								<text class="work-role" v-if="it.data.role"> {{ it.data.role }} </text>
                                <text class="meta-tag cp-tag" v-if="it.data.workRole">{{ it.data.workRole }}</text>
								<view class="work-meta">
									
									<view class="meta-tag" v-if="it.data.year">{{ it.data.year }}年</view>
									<view class="meta-tag" v-if="it.data.type">{{ it.data.type }}</view>
									<view class="meta-tag" v-if="it.data.genre">{{ it.data.genre }}</view>
									<view class="meta-tag" v-if="it.data.platform">{{ it.data.platform }}</view>
								</view>
								<view class="work-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
							</view>
						</view>
						<!-- 荣誉 -->
						<view class="data-card honor-card cp-honor" v-else-if="cardKind === 'honor'">
							<view class="honor-icon" :class="it.data.level === 'gold' ? 'gold-bg' : 'cp-bg'">{{ it.data.level === 'gold' ? '★' : '🏆' }}</view>
							<view class="honor-info">
								<view class="honor-title">{{ it.data.title }}</view>
								<view class="honor-org">{{ it.data.org }}</view>
								<view class="honor-meta">
									<view class="honor-tag cp-tag" v-if="it.data.year">{{ it.data.year }}年</view>
									<view class="honor-tag" :class="it.data.level === 'gold' ? 'gold-tag' : 'cp-tag'" v-if="it.data.category">{{ it.data.category }}</view>
									<view class="honor-tag cp-tag" v-if="it.data.together">{{ it.data.together }}</view>
								</view>
								<view class="honor-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
							</view>
						</view>
						<!-- 商务 -->
						<view class="data-card brand-card" v-else-if="cardKind === 'brand'">
							<view class="brand-header">
								<view class="brand-name">{{ it.data.brand }}</view>
								<view class="brand-status" :class="statusClass(it.data.status)" v-if="it.data.status">{{ it.data.status }}</view>
							</view>
							<view class="brand-detail">
								<view class="meta-tag" v-if="it.data.year">{{ it.data.year }}年</view>
								<view class="meta-tag" v-if="it.data.type">{{ it.data.type }}</view>
								<view class="meta-tag" v-if="it.data.title">{{ it.data.title }}</view>
								<view class="meta-tag" v-if="it.data.date">{{ it.data.date }}</view>
								<view class="meta-tag" v-if="it.data.dateWang">王青侧 {{ it.data.dateWang }}</view>
								<view class="meta-tag" v-if="it.data.dateFeng">冯建宇侧 {{ it.data.dateFeng }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.productWang">王青款 · {{ it.data.productWang }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.productFeng">冯建宇款 · {{ it.data.productFeng }}</view>
							</view>
							<view class="brand-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
						</view>
						<!-- 歌曲 -->
						<view class="data-card music-card" v-else-if="cardKind === 'music'">
							<view class="music-header">
								<view class="music-title">{{ it.data.song }}</view>
								<view class="music-platform" v-if="it.data.platform">{{ it.data.platform }}</view>
							</view>
							<view class="music-meta">
								<view class="meta-tag" v-if="it.data.date">{{ it.data.date }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.creditWang">王青 · {{ it.data.creditWang }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.creditFeng">冯建宇 · {{ it.data.creditFeng }}</view>
								<view class="meta-tag cp-tag" v-for="(cd, i) in splitCsv(it.data.credit)" :key="i">{{ cd }}</view>
								<view class="meta-tag" v-if="it.data.album">{{ it.data.album }}</view>
								<view class="meta-tag" v-if="it.data.genre">{{ it.data.genre }}</view>
							</view>
							<view class="music-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
						</view>
						<!-- 活动（时间轴） -->
						<view class="event-tl" v-else-if="cardKind === 'event'">
							<view class="tl-dot"></view>
							<view class="tl-line" v-if="iidx < displayItems.length - 1"></view>
							<view class="tl-body">
								<view class="tl-date">{{ evDateLabel(it.data) }}</view>
								<view class="tl-card">
									<view class="event-name">{{ it.data.name || '活动' }}</view>
									<view class="event-meta">
										<view class="meta-tag" v-if="it.data.type">{{ it.data.type }}</view>
										<view class="meta-tag stage-tag" :class="it.data.stage === '同台' ? 'stage-same' : 'stage-diff'" v-if="it.data.stage">{{ it.data.stage }}</view>
										<view class="meta-tag" v-if="it.data.location">📍 {{ it.data.location }}</view>
									</view>
									<view class="event-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
								</view>
							</view>
						</view>
					</block>
					<view class="empty-state" v-if="!displayItems.length"><text class="empty-state-text">暂无数据</text></view>
				</view>
			</view>

			<!-- ============ 个人（王青 / 冯建宇） ============ -->
			<view class="tab-view active" v-else>
				<view class="profile-card" :class="isPurple ? 'purple-bg' : ''" v-if="profileData">
					<view class="avatar-container"><view class="avatar-outer"><view class="avatar-inner"><image v-if="profileData.avatarImg" class="avatar-inner-img" :src="profileData.avatarImg" mode="aspectFill"></image><text v-else>{{ profileData.avatar || profileData.name }}</text></view></view></view>
					<view class="profile-name">{{ profileData.name }}</view>
					<view class="profile-tags">
						<text class="profile-tag" v-for="(t, i) in profileTags" :key="i">{{ t }}</text>
					</view>
					<view class="fandom-color-bar" v-if="profileData.fandomHex">
						<view class="fandom-color-dot" :style="{ background: profileData.fandomHex }"></view>
						<view class="fandom-color-info">
							<view class="fandom-color-label">FANDOM COLOR</view>
							<view class="fandom-color-name">应援色 · {{ profileData.fandomName }}</view>
						</view>
						<view class="fandom-color-hex">{{ profileData.fandomHex }}</view>
					</view>
					<view class="profile-bio">{{ profileData.bio }}</view>
				</view>

				<!-- 平台账号 -->
				<view class="platform-section">
					<view class="platform-section-header">
						<view class="platform-section-title" :class="isPurple ? 'purple-title' : ''">平台账号</view>
						<view class="platform-section-count">{{ accountsList.length }} 个</view>
					</view>
					<scroll-view scroll-x class="platform-strip">
						<view class="platform-mini" :class="isPurple ? 'purple-mini' : ''" v-for="(a, i) in accountsList" :key="i" @click="copyAccount(a.data)">
							<view class="platform-mini-icon" :class="a.data.icon || 'default'">{{ a.data.iconText }}</view>
							<view class="platform-mini-name">{{ a.data.platform }}</view>
							<view class="platform-mini-fans">{{ a.data.fans }}</view>
							<view class="platform-mini-growth" v-if="a.data.growth">{{ a.data.growth }}</view>
						</view>
					</scroll-view>
				</view>

				<!-- 分类 chips -->
				<scroll-view scroll-x class="category-chips">
					<view class="chip" v-for="c in listCategories" :key="c" :class="chipClass(c)" @click="switchCat(c)">
						{{ catLabel(c) }}<text class="chip-count">{{ catCount(c) }}</text>
					</view>
				</scroll-view>

				<!-- 作品二级 -->
				<view class="work-sections" v-if="currentCat === 'works'">
					<view class="work-section-tab" v-for="s in workSections" :key="s.key" :class="wsecClass(s.key)" @click="switchSection(s.key)">
						<text>{{ s.label }}</text><text class="work-section-count">{{ sectionCount(s.key) }}</text>
					</view>
				</view>

				<view class="list-container active">
					<block v-for="(it, iidx) in displayItems" :key="it._id">
						<!-- 作品 -->
						<view class="data-card work-card" :class="isPurple ? 'purple-card' : ''" v-if="cardKind === 'work'">
							<view class="work-poster" :class="[workPosterCls(it.data.section), it.data.poster ? 'has-poster' : '']">
								<image v-if="it.data.poster" class="work-poster-img" :src="it.data.poster" mode="aspectFill"></image>
								<text v-else>{{ sectionPosterLabel(it.data.section) }}</text>
							</view>
							<view class="work-info">
								<view class="work-title">{{ it.data.title || it.data.name || '' }}</view>
								<text class="work-role" :class="isPurple ? 'purple-role' : ''" v-if="it.data.role"> {{ it.data.role }} </text>
                                <text class="meta-tag cp-tag" v-if="it.data.workRole">{{ it.data.workRole }}</text>
								<view class="work-meta">
									<view class="meta-tag pair-badge" v-if="it.isPair">双人</view>
									
									<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.year">{{ it.data.year }}年</view>
									<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.type">{{ it.data.type }}</view>
									<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.genre">{{ it.data.genre }}</view>
									<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.platform">{{ it.data.platform }}</view>
								</view>
								<view class="work-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
							</view>
						</view>
						<!-- 荣誉 -->
						<view class="data-card honor-card" :class="isPurple ? 'purple-honor' : ''" v-else-if="cardKind === 'honor'">
							<view class="honor-icon" :class="honorIconCls(it.data.level)">{{ it.data.level === 'gold' ? '★' : '🏆' }}</view>
							<view class="honor-info">
								<view class="honor-title">{{ it.data.title }}</view>
								<view class="honor-org">{{ it.data.org }}</view>
								<view class="honor-meta">
									<view class="honor-tag pair-badge" v-if="it.isPair">双人</view>
									<view class="honor-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.year">{{ it.data.year }}年</view>
									<view class="honor-tag" :class="it.data.level === 'gold' ? 'gold-tag' : (isPurple ? 'purple-tag' : '')" v-if="it.data.category">{{ it.data.category }}</view>
									<view class="honor-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.together">{{ it.data.together }}</view>
								</view>
								<view class="honor-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
							</view>
						</view>
						<!-- 音乐 -->
						<view class="data-card music-card" :class="isPurple ? 'purple-card' : ''" v-else-if="cardKind === 'music'">
							<view class="music-header">
								<view class="music-title">{{ it.data.song }}</view>
								<view class="music-platform" :class="isPurple ? 'purple-platform' : ''" v-if="it.data.platform">{{ it.data.platform }}</view>
							</view>
							<view class="music-meta">
								<view class="meta-tag pair-badge" v-if="it.isPair">双人</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.date">{{ it.data.date }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.creditWang">王青 · {{ it.data.creditWang }}</view>
								<view class="meta-tag cp-tag" v-if="it.data.creditFeng">冯建宇 · {{ it.data.creditFeng }}</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-for="(cd, i) in splitCsv(it.data.credit)" :key="i">{{ cd }}</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.album">{{ it.data.album }}</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.genre">{{ it.data.genre }}</view>
							</view>
							<view class="music-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
						</view>
						<!-- 商务 -->
						<view class="data-card brand-card" :class="isPurple ? 'purple-card' : ''" v-else-if="cardKind === 'brand'">
							<view class="brand-header">
								<view class="brand-name">{{ it.data.brand }}</view>
								<view class="brand-status" :class="statusClass(it.data.status)" v-if="it.data.status">{{ it.data.status }}</view>
							</view>
							<view class="brand-detail">
								<view class="meta-tag pair-badge" v-if="it.isPair">双人</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.year">{{ it.data.year }}年</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.type">{{ it.data.type }}</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.title">{{ it.data.title }}</view>
								<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.date">{{ it.data.date }}</view>
								<view class="meta-tag" v-if="it.data.dateWang">王青： {{ it.data.dateWang }}</view>
								<view class="meta-tag" v-if="it.data.dateFeng">冯建宇： {{ it.data.dateFeng }}</view>
								<view class="meta-tag" v-if="it.data.productWang">王青款 · {{ it.data.productWang }}</view>
								<view class="meta-tag" v-if="it.data.productFeng">冯建宇款 · {{ it.data.productFeng }}</view>
							</view>
							<view class="brand-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
						</view>
						<!-- 活动（时间轴） -->
						<view class="event-tl" :class="isPurple ? 'tl-purple' : ''" v-else-if="cardKind === 'event'">
							<view class="tl-dot"></view>
							<view class="tl-line" v-if="iidx < displayItems.length - 1"></view>
							<view class="tl-body">
								<view class="tl-date">{{ evDateLabel(it.data) }}</view>
								<view class="tl-card">
									<view class="event-name">{{ it.data.name || '活动' }}</view>
									<view class="event-meta">
										<view class="meta-tag pair-badge" v-if="it.isPair">双人</view>
										<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.type">{{ it.data.type }}</view>
										<view class="meta-tag stage-tag" :class="it.data.stage === '同台' ? 'stage-same' : 'stage-diff'" v-if="it.data.stage">{{ it.data.stage }}</view>
										<view class="meta-tag" :class="isPurple ? 'purple-tag' : ''" v-if="it.data.location">📍 {{ it.data.location }}</view>
									</view>
									<view class="event-note" v-if="it.data.note">📌 {{ it.data.note }}</view>
								</view>
							</view>
						</view>
					</block>
					<view class="empty-state" v-if="!displayItems.length"><text class="empty-state-text">暂无数据</text></view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { isAdmin } from '@/common/js/permission.js'
import { SUBJECTS, SUBJECT_ORDER, WORK_SECTIONS, SCHEMA } from './dangan-const.js'
import seed from '@/uniCloud-alipay/database/dangan.init_data.json'

export default {
	data() {
		return {
			subjects: SUBJECTS,
			subjectOrder: SUBJECT_ORDER,
			workSections: WORK_SECTIONS,
			rawList: seed,
			currentSubject: 'intersection',
			currentCat: 'works',
			currentSection: 'tv',
			isAdmin: false
		}
	},
	computed: {
		isPurple() { return this.currentSubject === 'feng' },
		shellClass() {
			if (this.currentSubject === 'feng') return 'feng-shell'
			if (this.currentSubject === 'intersection') return 'intersection-shell'
			return ''
		},
		// subject -> category -> [ { _id, sort, createTime, data, isPair? } ]
		grouped() {
			const g = {}
			;(this.rawList || []).forEach(rec => {
				if (!rec || !rec.subject || !rec.category) return
				// 隐藏项二次防御：admin 切换为隐藏后，云函数已过滤；seed 未来如包含 hidden=true 也在此处理
				if (rec.hidden) return
				const s = rec.subject, c = rec.category
				if (!g[s]) g[s] = {}
				if (!g[s][c]) g[s][c] = []
				g[s][c].push({ _id: rec._id, sort: rec.sort || 0, createTime: rec.createTime || 0, data: this.normData(rec) })
			})
			// 双人归档回流：青宇的双人分类合并进王青/冯建宇对应单人分类（带「双人」标记）
			const inv = { works: 'works', doubleBrands: 'brands', doubleSongs: 'music', doubleEvents: 'events', honors: 'honors' }
			Object.keys(inv).forEach(ic => {
				const src = g.intersection && g.intersection[ic]
				if (!src || !src.length) return
				;['wang', 'feng'].forEach(s => {
					if (!g[s]) g[s] = {}
					if (!g[s][inv[ic]]) g[s][inv[ic]] = []
					src.forEach(it => g[s][inv[ic]].push({ _id: it._id, sort: it.sort, createTime: it.createTime, data: it.data, isPair: true }))
				})
			})
			return g
		},
		subjectGroup() { return this.grouped[this.currentSubject] || {} },
		profileData() {
			const arr = this.subjectGroup.profile
			return arr && arr.length ? arr[0].data : null
		},
		profileTags() {
			if (!this.profileData || !this.profileData.tags) return []
			return this.profileData.tags.split(',').map(t => t.trim()).filter(t => t)
		},
		statsList() {
			// 青宇顶部统计不再取配置，实时计算：出道年限（2015-05-15）/ 公开同台=双人活动数 / 共同创作=双人歌曲+双人作品
			if (this.currentSubject !== 'intersection') return (this.subjectGroup.stats || []).map(r => r.data)
			const g = this.grouped.intersection || {}
			const now = new Date()
			let years = now.getFullYear() - 2015
			// 未到 5月15日 周年则不满一年
			if (now.getMonth() < 4 || (now.getMonth() === 4 && now.getDate() < 15)) years--
			const songs = (g.doubleSongs || []).length
			const works = (g.works || []).length
			return [
				{ value: String(years > 0 ? years : 0), unit: '年', label: '出道至今' },
				{ value: String((g.doubleEvents || []).length), unit: '次', label: '公开同台' },
				{ value: String(songs + works), unit: '项', label: '共同创作' }
			]
		},
		accountsList() {
			return this.currentSubject === 'intersection' ? (this.subjectGroup.cpAccounts || []) : (this.subjectGroup.accounts || [])
		},
		listCategories() {
			const special = ['profile', 'stats', 'accounts', 'cpAccounts']
			return Object.keys(SCHEMA[this.currentSubject] || {}).filter(k => special.indexOf(k) === -1)
		},
		cardKind() {
			const c = this.currentCat
			if (c === 'works') return 'work'
			if (c === 'honors') return 'honor'
			if (c === 'music' || c === 'doubleSongs') return 'music'
			if (c === 'brands' || c === 'doubleBrands') return 'brand'
			if (c === 'events' || c === 'doubleEvents') return 'event'
			return 'work'
		},
		displayItems() {
			let items = this.subjectGroup[this.currentCat] || []
			if (this.currentCat === 'works') {
				items = items.filter(it => (it.data.section || 'tv') === this.currentSection)
			}
			// 时间倒序（最新在前）：
			//   1) 先按记录自身日期/年份降序（无年份排末尾）
			//   2) 同日期再按 createTime 降序（新入库优先，避免 sort 字段 100 秒回绕带来的乱序）
			//   3) 无 createTime（如本地 seed）则按 sort 降序；仍相同按 _id 字典序保证稳定
			return [...items].sort((a, b) =>
				(this.sortKey(b.data) - this.sortKey(a.data)) ||
				((b.createTime || 0) - (a.createTime || 0)) ||
				((b.sort || 0) - (a.sort || 0)) ||
				String(a._id || '').localeCompare(String(b._id || ''))
			)
		}
	},
	onLoad() {
		this.checkAdmin()
		this.loadRemote()
	},
	onShow() {
		this.checkAdmin()
		if (this._loaded) this.loadRemote()
	},
	onPullDownRefresh() {
		this.loadRemote(() => uni.stopPullDownRefresh())
	},
	onShareAppMessage() {
		return { title: '王青 & 冯建宇 · 数据档案', path: '/pages/dangan/dangan' }
	},
	onShareTimeline() {
		return { title: '王青 & 冯建宇 · 数据档案', path: '/pages/dangan/dangan' }
	},
	methods: {
		// 从记录自身字段解析可排序日期值：year*10000 + 月*100 + 日；无年份排末尾
		// 支持常见形式："2015-9-22" / "2015/9/22" / "2015.9.22" / "2015年9月22日" /
		// "2015-9" / "2015年9月" / "2015" / "10月25日"（有 year 字段则拼回） /
		// "2015-9-22 12:00" 等，末尾时间部分忽略。
		dateKey(d) {
			const dateStr = String((d && d.date) || '')
			const yearStr = String((d && d.year) || '')
			const s = (dateStr + ' ' + yearStr).trim()
			let y = 0, m = 0, day = 0
			// 1) 完整日期：年-月-日（分隔符支持 - / . 年/月）
			let mm = s.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/)
			if (mm) { y = +mm[1]; m = +mm[2]; day = +mm[3] }
			else {
				// 2) 年+月（无日）：如 "2015/9" / "2015年9月"
				mm = s.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*月?/)
				if (mm) { y = +mm[1]; m = +mm[2] }
				else {
					// 3) 仅年份
					const ym = s.match(/\d{4}/)
					if (ym) y = +ym[0]
				}
				// 4) 若尚未拿到月/日，从 "M月D日" 或 "M/D"（非 4 位年开头）补上
				if (!m && !day) {
					const md1 = s.match(/(^|[^\d])(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
					if (md1) { m = +md1[2]; day = +md1[3] }
					else {
						const md2 = s.match(/(^|[^\d])(\d{1,2})\s*[-/.]\s*(\d{1,2})(?![\d])/)
						if (md2) { m = +md2[2]; day = +md2[3] }
					}
				}
			}
			if (!y) return 99999999
			return y * 10000 + m * 100 + day
		},
		// 倒序专用：无年份的记录归一为 -1，保证降序排列时仍在末尾
		sortKey(d) {
			const k = this.dateKey(d)
			return k >= 99999999 ? -1 : k
		},
		// 兼容两类记录结构：嵌套 data 对象；或业务字段平铺在记录顶层（云端导入/手工建表常见）
		normData(rec) {
			if (rec.data && typeof rec.data === 'object') return rec.data
			const skip = { _id: 1, subject: 1, category: 1, sort: 1, createTime: 1, updateTime: 1 }
			const out = {}
			Object.keys(rec).forEach(k => { if (!skip[k]) out[k] = rec[k] })
			return out
		},
		checkAdmin() {
			try {
				const raw = uni.getStorageSync('userInfo')
				const info = typeof raw === 'string' ? JSON.parse(raw) : raw
				this.isAdmin = isAdmin(info)
			} catch (e) {
				this.isAdmin = false
			}
		},
		// 云端有数据则覆盖内置种子；云端失败/为空则保留种子，保证始终可渲染
		loadRemote(done) {
			uniCloud.callFunction({
				name: 'dangan',
				data: { action: 'getList' },
				success: (res) => {
					if (res.result && res.result.code === 0 && res.result.data.list && res.result.data.list.length) {
						this.rawList = res.result.data.list
						this._loaded = true
					}
					done && done()
				},
				fail: () => { done && done() }
			})
		},
		switchSubject(s) {
			this.currentSubject = s
			const cats = this.listCategories
			this.currentCat = cats[0] || ''
			this.currentSection = 'tv'
		},
		switchCat(c) {
			this.currentCat = c
			if (c === 'works') this.currentSection = 'tv'
		},
		switchSection(k) { this.currentSection = k },
		// 逗号串拆成数组（多人歌曲参与身份 credit 等字段展示用）
		splitCsv(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean) },
		goAdmin() { uni.navigateTo({ url: '/pages/dangan/admin' }) },
		// 点击平台账号：复制账号（优先 handle，无则用平台名）
		copyAccount(data) {
			const text = (data && (data.handle || data.platform) || '').trim()
			if (!text) {
				uni.showToast({ title: '无可复制账号', icon: 'none' })
				return
			}
			uni.setClipboardData({
				data: text,
				success: () => uni.showToast({ title: '已复制 ' + text, icon: 'none' })
			})
		},
		catLabel(c) { return (SCHEMA[this.currentSubject][c] || {}).label || c },
		catCount(c) { return (this.subjectGroup[c] || []).length },
		sectionCount(key) {
			return (this.subjectGroup.works || []).filter(it => (it.data.section || 'tv') === key).length
		},
		chipClass(c) {
			if (this.currentCat !== c) return ''
			return this.isPurple ? 'active purple-chip' : 'active'
		},
		wsecClass(key) {
			if (this.currentSection !== key) return ''
			return this.isPurple ? 'active purple-section' : 'active'
		},
		sectionPoster(key) {
			const s = WORK_SECTIONS.find(x => x.key === key)
			return s ? s.posterClass : ''
		},
		sectionPosterLabel(key) {
			const s = WORK_SECTIONS.find(x => x.key === key)
			return s ? s.posterLabel : '剧集'
		},
		// 个人页：作品海报需要 purple-bg + 大类 class
		workPosterCls(section) {
			const cls = []
			if (this.isPurple) cls.push('purple-bg')
			const s = WORK_SECTIONS.find(x => x.key === section)
			if (s && s.posterClass) cls.push(s.posterClass)
			return cls.join(' ')
		},
		honorIconCls(level) {
			if (level === 'gold') return 'gold-bg'
			return this.isPurple ? 'purple-bg' : ''
		},
		statusClass(status) {
			if (status === '存续') return 'status-active'
			if (status === '已停售') return 'status-stopped'
			return 'status-expired'
		},
		evDay(date) {
			if (!date) return '·'
			const s = String(date)
			let m = s.match(/(\d+)月(\d+)日/)
			if (m) return m[2]
			m = s.match(/\d{4}[-/](\d{1,2})[-/](\d{1,2})/)
			if (m) return m[2]
			return s.slice(0, 3)
		},
		evMonth(date) {
			if (!date) return ''
			const s = String(date)
			let m = s.match(/(\d+)月(\d+)日/)
			if (m) return m[1] + '月'
			m = s.match(/\d{4}[-/](\d{1,2})[-/](\d{1,2})/)
			if (m) return m[1] + '月'
			return s.slice(3)
		},
		// 时间轴顶部的日期标签：优先用 date，日期内未含年份时拼接 year，两者都空时回退占位符
		evDateLabel(d) {
			const date = String((d && d.date) || '').trim()
			const year = String((d && d.year) || '').trim()
			if (date && year && date.indexOf(year) === -1) return `${year} · ${date}`
			return date || year || '—'
		}
	}
}
</script>

<style>
/* ============ 主题（原型 shell 类名硬编码，避免依赖 CSS 变量注入） ============ */
.page-hint { display: none; }
.tab-view { width: 100%; }
.app-root{overflow-x: hidden;}
/* 资料卡 */
.profile-card { padding:48rpx 40rpx 40rpx; background:linear-gradient(160deg,#31eee0 0%,#14b8a6 50%,#0d9488 100%); border-radius:0 0 56rpx 56rpx; text-align:center; color:#fff; margin-bottom:28rpx; }
.profile-card.purple-bg { background:linear-gradient(160deg,#9a9ad9 0%,#818cf8 50%,#6366f1 100%); }
.avatar-container { display:flex; justify-content:center; margin-bottom:28rpx; }
.avatar-outer { width:168rpx; height:168rpx; display:flex; justify-content:center; align-items:center; border-radius:50%; background:conic-gradient(from 0deg,rgba(255,255,255,.95),rgba(255,255,255,.35),rgba(255,255,255,.95)); padding:6rpx; }
.avatar-inner { width:100%; height:100%; border-radius:50%; background:rgba(255,255,255,.25); border:4rpx solid rgba(255,255,255,.95); display:flex; justify-content:center; align-items:center; font-size:56rpx; font-weight:900; color:#fff; text-shadow:0 4rpx 12rpx rgba(13,148,136,.35); overflow:hidden; }
.avatar-inner-img { width:100%; height:100%; border-radius:50%; }
.profile-name { font-size:44rpx; font-weight:900; margin-bottom:20rpx; letter-spacing:1rpx; text-shadow:0 4rpx 16rpx rgba(13,148,136,.3); }
.profile-tags { display:flex; gap:12rpx; justify-content:center; margin-bottom:24rpx; flex-wrap:wrap; }
.profile-tag { font-size:21rpx; background:rgba(255,255,255,.28); padding:8rpx 22rpx; border-radius:24rpx; font-weight:600; border:2rpx solid rgba(255,255,255,.4); }
.fandom-color-bar { display:flex; align-items:center; justify-content:center; gap:20rpx; margin-bottom:24rpx; padding:16rpx 28rpx; background:rgba(255,255,255,.2); border-radius:24rpx; border:2rpx solid rgba(255,255,255,.3); }
.fandom-color-dot { width:44rpx; height:44rpx; border-radius:50%; border:4rpx solid rgba(255,255,255,.9); box-shadow:0 4rpx 16rpx rgba(0,0,0,.15); flex-shrink:0; }
.fandom-color-info { display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; }
.fandom-color-label { font-size:18rpx; color:rgba(255,255,255,.8); font-weight:600; letter-spacing:2rpx; }
.fandom-color-name { font-size:26rpx; font-weight:800; color:#fff; }
.fandom-color-hex { font-size:19rpx; color:rgba(255,255,255,.9); font-weight:600; margin-left:12rpx; }
.profile-bio { font-size:24rpx; line-height:1.7; color:#fff; text-align:left; padding:24rpx 28rpx; background:rgba(13,148,136,.2); border-radius:24rpx; border:2rpx solid rgba(255,255,255,.18); }
.profile-card.purple-bg .profile-bio { background:rgba(99,102,241,.22); }

/* 平台账号横滑 */
.platform-section { padding:0 0 32rpx; }
.platform-section-header { display:flex; align-items:center; justify-content:space-between; padding:0 32rpx 20rpx; }
.platform-section-title { font-size:26rpx; font-weight:800; color:#1e1b4b; display:flex; align-items:center; }
.platform-section-title::before { content:''; width:6rpx; height:26rpx; border-radius:4rpx; margin-right:12rpx; background:linear-gradient(180deg,#31eee0,#0d9488); }
.platform-section-title.purple-title::before { background:linear-gradient(180deg,#b8b8ea,#9a9ad9); }
.platform-section-title.cp-title::before { background:linear-gradient(180deg,#31eee0,#9a9ad9); }
.platform-section-count { font-size:20rpx; font-weight:700; color:#6b7280; background:rgba(255,255,255,.7); padding:4rpx 16rpx; border-radius:16rpx; border:2rpx solid #e9d5ff; }
.platform-strip { white-space:nowrap; }
.platform-mini { display:inline-flex; flex-direction:column; align-items:center; width:188rpx; background:#fff; border-radius:28rpx; padding:20rpx 16rpx 18rpx; margin-right:16rpx; border:2rpx solid rgba(49,238,224,.4); box-shadow:0 6rpx 20rpx rgba(49,238,224,.08); vertical-align:top; }
.platform-mini:active { transform:scale(.96); opacity:.9; }
.platform-mini.purple-mini { border-color:rgba(154,154,217,.4); box-shadow:0 6rpx 20rpx rgba(154,154,217,.1); }
.platform-mini.cp-mini { border-color:rgba(154,154,217,.4); box-shadow:0 6rpx 20rpx rgba(154,154,217,.1); }
.platform-mini-icon { width:64rpx; height:64rpx; border-radius:18rpx; display:flex; justify-content:center; align-items:center; color:#fff; font-size:22rpx; font-weight:900; box-shadow:0 6rpx 16rpx rgba(0,0,0,.15); }
.platform-mini-icon.weibo { background:linear-gradient(135deg,#ff4b5c,#e6162d); }
.platform-mini-icon.douyin { background:linear-gradient(135deg,#2b2b2b,#000); }
.platform-mini-icon.xhs { background:linear-gradient(135deg,#ff5a6e,#ff2442); }
.platform-mini-icon.bilibili { background:linear-gradient(135deg,#00a1d6,#0088cc); }
.platform-mini-icon.cp { background:linear-gradient(135deg,#31eee0,#9a9ad9); }
.platform-mini-icon.station { background:linear-gradient(135deg,#fbbf24,#f59e0b); }
.platform-mini-icon.default { background:linear-gradient(135deg,#94a3b8,#64748b); }
.platform-mini-name { font-size:19rpx; color:#6b7280; font-weight:600; margin-top:8rpx; white-space:nowrap; }
.platform-mini-fans { font-size:26rpx; font-weight:900; color:#0d9488; line-height:1; margin-top:6rpx; }
.platform-mini.purple-mini .platform-mini-fans { color:#6366f1; }
.platform-mini-growth { font-size:17rpx; color:#10b981; font-weight:700; margin-top:4rpx; }
.platform-mini-growth::before { content:'↑'; }

/* 分类 chips */
.category-chips { white-space:nowrap; padding:0 32rpx 28rpx; }
.chip { display:inline-flex; align-items:center; padding:16rpx 32rpx; margin-right:16rpx; border-radius:40rpx; background:#fff; border:3rpx solid #e9d5ff; font-size:25rpx; font-weight:700; color:#6b7280; white-space:nowrap; }
.chip.active { background:linear-gradient(135deg,#31eee0,#0d9488); border-color:transparent; color:#fff; box-shadow:0 8rpx 24rpx rgba(49,238,224,.4); }
.chip.active.purple-chip { background:linear-gradient(135deg,#9a9ad9,#6366f1); box-shadow:0 8rpx 24rpx rgba(154,154,217,.4); }
.chip-count { font-size:20rpx; font-weight:800; padding:2rpx 12rpx; border-radius:16rpx; background:#ccfbf1; color:#0d9488; margin-left:10rpx; min-width:30rpx; text-align:center; }
.chip.active .chip-count { background:rgba(255,255,255,.3); color:#fff; }
.chip.purple-chip .chip-count { background:#ede9fe; color:#6366f1; }

/* 二级 Tab */
.work-sections { display:flex; padding:0 32rpx; margin-bottom:28rpx; border-bottom:3rpx solid #e9d5ff; }
.work-section-tab { flex:1; text-align:center; padding:20rpx 4rpx 22rpx; font-size:23rpx; font-weight:700; color:#6b7280; position:relative; white-space:nowrap; display:flex; align-items:center; justify-content:center; gap:6rpx; }
.work-section-tab::after { content:''; position:absolute; bottom:-3rpx; left:50%; transform:translateX(-50%); width:0; height:6rpx; border-radius:6rpx 6rpx 0 0; background:linear-gradient(90deg,#31eee0,#0d9488); transition:width .3s ease; }
.work-section-tab.active { color:#0d9488; }
.work-section-tab.active::after { width:65%; }
.work-section-tab.active.purple-section { color:#6366f1; }
.work-section-tab.active.purple-section::after { background:linear-gradient(90deg,#9a9ad9,#6366f1); }
.work-section-count { display:inline-block; font-size:18rpx; padding:0 8rpx; border-radius:12rpx; background:#ccfbf1; color:#0d9488; font-weight:800; min-width:28rpx; text-align:center; line-height:28rpx; }
.work-section-tab.active .work-section-count { background:#0d9488; color:#fff; }
.work-section-tab.active.purple-section .work-section-count { background:#6366f1; color:#fff; }

/* 列表卡片 */
.list-container { display:flex; flex-direction:column; gap:20rpx; padding:0 32rpx 40rpx; }
.data-card { background:#fff; border-radius:32rpx; padding:28rpx; box-shadow:0 8rpx 32rpx rgba(49,238,224,.1); border:2rpx solid rgba(49,238,224,.2); }
.data-card.purple-card { box-shadow:0 8rpx 32rpx rgba(154,154,217,.12); border-color:rgba(154,154,217,.3); }
.meta-tag { font-size:20rpx; padding:4rpx 14rpx; border-radius:10rpx; font-weight:600; background:#ccfbf1; color:#0f766e; white-space:nowrap; margin-right:12rpx; margin-top:12rpx; }
.meta-tag.purple-tag { background:#ede9fe; color:#6b21a8; }
.meta-tag.cp-tag { background:linear-gradient(135deg,#ccfbf1,#ede9fe); color:#6366f1; }
/* 单人页里的双人记录徽标 */
.meta-tag.pair-badge, .honor-tag.pair-badge { background:linear-gradient(135deg,#31eee0,#9a9ad9); color:#fff; font-weight:800; }
/* 活动同台形式：同台青绿、不同台（拼盘）琥珀 */
.stage-tag { font-weight:800; }
.stage-tag.stage-same { background:linear-gradient(135deg,#31eee0,#0d9488); color:#fff; }
.stage-tag.stage-diff { background:#fef3c7; color:#b45309; }

/* 作品 */
.work-card { display:flex; gap:24rpx; align-items:flex-start; }
.work-poster { width:108rpx; height:144rpx; border-radius:16rpx; display:flex; justify-content:center; align-items:center; color:#fff; font-size:18rpx; font-weight:700; text-align:center; padding:8rpx; background:linear-gradient(135deg,#5eead4,#31eee0); flex-shrink:0; box-shadow:0 8rpx 24rpx rgba(49,238,224,.3); overflow:hidden; }
.work-poster-img { width:100%; height:100%; border-radius:16rpx; }
.work-poster.has-poster { padding:0; }
.work-poster.movie-bg { background:linear-gradient(135deg,#67e8f9,#31eee0); }
.work-poster.variety-bg { background:linear-gradient(135deg,#a5f3fc,#5eead4); }
.work-poster.other-bg { background:linear-gradient(135deg,#5eead4,#0d9488); }
.work-poster.upcoming-bg { background:linear-gradient(135deg,#cbd5e1,#94a3b8); }
.work-poster.purple-bg { background:linear-gradient(135deg,#b8b8ea,#9a9ad9); box-shadow:0 8rpx 24rpx rgba(154,154,217,.3); }
.work-poster.purple-bg.movie-bg { background:linear-gradient(135deg,#c4b5fd,#a78bfa); }
.work-poster.purple-bg.variety-bg { background:linear-gradient(135deg,#d8b4fe,#c084fc); }
.work-poster.purple-bg.other-bg { background:linear-gradient(135deg,#a5b4fc,#818cf8); }
.work-poster.purple-bg.upcoming-bg { background:linear-gradient(135deg,#cbd5e1,#94a3b8); }
.work-info { flex:1; min-width:0; }
.work-title { font-size:28rpx; font-weight:800; color:#1e1b4b; line-height:1.3; }
.work-role { font-size:24rpx; font-weight:600; color:#0d9488; margin-top:8rpx; }
.work-role.purple-role { color:#6366f1; }
.work-meta { display:flex; flex-wrap:wrap; }
.work-note { font-size:22rpx; color:#6b7280; line-height:1.4; margin-top:10rpx; }

/* 音乐 */
.music-card { display:flex; flex-direction:column; gap:4rpx; }
.music-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16rpx; }
.music-title { font-size:29rpx; font-weight:800; color:#1e1b4b; line-height:1.3; flex:1; min-width:0; }
.music-platform { font-size:20rpx; font-weight:700; padding:6rpx 16rpx; border-radius:12rpx; background:#ccfbf1; color:#0d9488; flex-shrink:0; white-space:nowrap; }
.music-platform.purple-platform { background:#ede9fe; color:#6366f1; }
.music-meta { display:flex; flex-wrap:wrap; }
.music-note { font-size:22rpx; color:#6b7280; line-height:1.4; padding-top:12rpx; border-top:2rpx dashed rgba(49,238,224,.3); margin-top:8rpx; }
.music-card.purple-card .music-note { border-top-color:rgba(154,154,217,.3); }

/* 商务 */
.brand-card { display:flex; flex-direction:column; }
.brand-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16rpx; }
.brand-name { font-size:29rpx; font-weight:800; color:#1e1b4b; flex:1; min-width:0; line-height:1.3; }
.brand-status { font-size:20rpx; font-weight:800; padding:6rpx 18rpx; border-radius:12rpx; flex-shrink:0; white-space:nowrap; }
.status-active { background:#dcfce7; color:#047857; }
.status-expired { background:#ccfbf1; color:#0d9488; }
.data-card.purple-card .status-expired { background:#ede9fe; color:#6366f1; }
.status-stopped { background:#fef3c7; color:#b45309; }
.brand-detail { display:flex; flex-wrap:wrap; }
.brand-note { font-size:22rpx; color:#6b7280; line-height:1.4; margin-top:8rpx; }

/* 活动时间轴 */
.event-tl { position:relative; padding-left:60rpx; }
.tl-dot { position:absolute; left:18rpx; top:34rpx; width:22rpx; height:22rpx; border-radius:50%; background:#fff; border:4rpx solid #0d9488; box-shadow:0 0 0 4rpx rgba(49,238,224,.18); z-index:2; box-sizing:border-box; }
.tl-line { position:absolute; left:28rpx; top:60rpx; bottom:-54rpx; width:4rpx; background:linear-gradient(180deg,rgba(49,238,224,.55),rgba(49,238,224,.25)); z-index:1; }
.tl-body { display:flex; flex-direction:column; min-width:0; }
.tl-date { font-size:24rpx; font-weight:800; color:#0d9488; letter-spacing:1rpx; margin-bottom:10rpx; }
.tl-card { background:#fff; border-radius:24rpx; padding:22rpx 26rpx; box-shadow:0 6rpx 24rpx rgba(49,238,224,.12); border-left:8rpx solid #31eee0; }
.event-tl.tl-purple .tl-dot { border-color:#6366f1; box-shadow:0 0 0 4rpx rgba(154,154,217,.2); }
.event-tl.tl-purple .tl-line { background:linear-gradient(180deg,rgba(154,154,217,.55),rgba(154,154,217,.25)); }
.event-tl.tl-purple .tl-date { color:#6366f1; }
.event-tl.tl-purple .tl-card { box-shadow:0 6rpx 24rpx rgba(154,154,217,.15); border-left-color:#9a9ad9; }
.event-name { font-size:28rpx; font-weight:800; color:#1e1b4b; line-height:1.3; }
.event-meta { display:flex; flex-wrap:wrap; }
.event-note { font-size:22rpx; color:#6b7280; line-height:1.4; margin-top:8rpx; }

/* 荣誉 */
.honor-card { display:flex; gap:24rpx; align-items:center; position:relative; overflow:hidden; }
.honor-card::before { content:''; position:absolute; top:0; left:0; width:8rpx; height:100%; background:linear-gradient(180deg,#31eee0,#0d9488); }
.honor-card.purple-honor::before { background:linear-gradient(180deg,#9a9ad9,#6366f1); }
.honor-card.cp-honor::before { background:linear-gradient(180deg,#31eee0,#9a9ad9); }
.honor-icon { width:88rpx; height:88rpx; border-radius:24rpx; display:flex; justify-content:center; align-items:center; color:#fff; font-size:40rpx; font-weight:900; flex-shrink:0; background:linear-gradient(135deg,#5eead4,#31eee0); box-shadow:0 8rpx 24rpx rgba(49,238,224,.3); }
.honor-icon.purple-bg { background:linear-gradient(135deg,#b8b8ea,#9a9ad9); box-shadow:0 8rpx 24rpx rgba(154,154,217,.3); }
.honor-icon.cp-bg { background:linear-gradient(135deg,#31eee0,#9a9ad9); box-shadow:0 8rpx 24rpx rgba(154,154,217,.3); }
.honor-icon.gold-bg { background:linear-gradient(135deg,#fbbf24,#f59e0b); box-shadow:0 8rpx 24rpx rgba(251,191,36,.3); }
.honor-info { flex:1; min-width:0; }
.honor-title { font-size:28rpx; font-weight:800; color:#1e1b4b; line-height:1.35; }
.honor-org { font-size:22rpx; color:#6b7280; font-weight:500; margin-top:6rpx; }
.honor-meta { display:flex; flex-wrap:wrap; }
.honor-tag { font-size:19rpx; padding:4rpx 14rpx; border-radius:10rpx; font-weight:700; background:#ccfbf1; color:#0d9488; white-space:nowrap; margin-right:12rpx; margin-top:12rpx; }
.honor-tag.purple-tag { background:#ede9fe; color:#6366f1; }
.honor-tag.gold-tag { background:#fef3c7; color:#b45309; }
.honor-tag.cp-tag { background:linear-gradient(135deg,#ccfbf1,#ede9fe); color:#6366f1; }
.honor-note { font-size:22rpx; color:#6b7280; margin-top:8rpx; }

/* 青宇头部 */
.intersection-header { background:linear-gradient(160deg,#31eee0 0%,#9a9ad9 100%); padding:44rpx 40rpx 40rpx; border-radius:0 0 56rpx 56rpx; margin-bottom:28rpx; text-align:center; color:#fff; }
.intersection-title { font-size:40rpx; font-weight:900; margin-bottom:12rpx; letter-spacing:2rpx; text-shadow:0 4rpx 16rpx rgba(13,148,136,.3); }
.intersection-sub { font-size:23rpx; color:rgba(255,255,255,.92); font-weight:500; margin-bottom:24rpx; }
.duo-fandom { display:flex; justify-content:center; align-items:center; gap:24rpx; margin-bottom:28rpx; padding:20rpx 28rpx; background:rgba(255,255,255,.2); border-radius:24rpx; border:2rpx solid rgba(255,255,255,.3); }
.duo-fandom-item { display:flex; align-items:center; gap:16rpx; }
.duo-fandom-dot { width:36rpx; height:36rpx; border-radius:50%; border:4rpx solid rgba(255,255,255,.9); box-shadow:0 4rpx 12rpx rgba(0,0,0,.15); }
.duo-fandom-dot.wang-color { background:#31eee0; }
.duo-fandom-dot.feng-color { background:#9a9ad9; }
.duo-fandom-text { font-size:23rpx; font-weight:700; color:#fff; }
.duo-fandom-sep { color:rgba(255,255,255,.5); font-size:24rpx; font-weight:700; }
.intersection-stats { display:flex; gap:20rpx; margin-top:32rpx; }
.is-item { flex:1; background:rgba(255,255,255,.2); border:2rpx solid rgba(255,255,255,.3); border-radius:24rpx; padding:20rpx 8rpx; text-align:center; }
.is-value { font-size:40rpx; font-weight:900; color:#fff; line-height:1; }
.is-value text { font-size:20rpx; font-weight:600; margin-left:2rpx; }
.is-label { font-size:19rpx; color:rgba(255,255,255,.95); margin-top:8rpx; font-weight:500; }

/* 顶部主体切换 + 管理入口 */
.top-tabs-wrap { position: sticky; top: 0; z-index: 50; display:flex; align-items:center; gap:16rpx; background:linear-gradient(135deg,#0d9488 0%,#31eee0 100%); padding:16rpx 32rpx 32rpx; }
.feng-shell .top-tabs-wrap { background:linear-gradient(135deg,#7c7cb8 0%,#9a9ad9 100%); }
.intersection-shell .top-tabs-wrap { background:linear-gradient(135deg,#31eee0 0%,#9a9ad9 100%); }
.top-tabs { flex:1; display:flex; background:rgba(255,255,255,.2); padding:8rpx; border-radius:32rpx; border:2rpx solid rgba(255,255,255,.3); }
.top-tab { flex:1; text-align:center; padding:20rpx 0; font-size:26rpx; font-weight:700; color:rgba(255,255,255,.85); border-radius:24rpx; white-space:nowrap; }
.top-tab.active { background:#fff; box-shadow:0 8rpx 28rpx rgba(13,148,136,.2); color:#0d9488; }
.top-tab.active.purple-tab { color:#6366f1; }
.admin-entry {position: fixed; top: 100rpx; right: 32rpx; padding:10rpx; font-size:26rpx; font-weight:800; color:#0d9488; background:#fff; border-radius:24rpx; box-shadow:0 8rpx 28rpx rgba(0,0,0,.12);z-index: 999;}

.main-content { background:linear-gradient(135deg,#ede9fe 0%,#e0f2fe 50%,#cffafe 100%); min-height:100vh; }

.empty-state { text-align:center; padding:100rpx 40rpx; }
.empty-state-text { font-size:26rpx; font-weight:500; color:#6b7280; }
</style>
