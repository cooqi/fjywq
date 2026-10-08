/**
 * 杯蜜本地状态仓库（store/pet）
 * 策略（对齐 code.md 7.4 本地缓存）：
 * 1. 缓存 userId、petId；
 * 2. 缓存最近一次 pet 状态到 storage，用于快速首屏展示；
 * 3. 进入页面后立即请求服务端状态，以服务端为准，回来后覆盖缓存并通过 uni.$emit 通知页面刷新。
 */
import { ERR_MSG } from '../beemore.js'

const CACHE_PET_KEY = 'beemore_pet_cache'
const CACHE_USER_KEY = 'beemore_user_id'
const CACHE_VER_KEY = 'beemore_cache_ver'
// 缓存版本：数据模型变更（数字打工人重构；workPlan/sleepPlan 作息自定义；新增饥饿值/体重；形象 ver:3 头发改为可选）时递增，旧缓存自动失效
const CACHE_VER = 'v7'

/** 读取本地 userInfo（项目统一存储于 storage，JSON 字符串） */
export function getMyUserInfo() {
	try {
		const raw = uni.getStorageSync('userInfo')
		return raw ? JSON.parse(raw) : null
	} catch (e) {
		return null
	}
}

/** 缓存最近一次服务端 pet 状态 */
export function cachePet(pet) {
	if (!pet) return
	try {
		uni.setStorageSync(CACHE_PET_KEY, JSON.stringify(pet))
		uni.setStorageSync(CACHE_VER_KEY, CACHE_VER)
		const u = getMyUserInfo()
		if (u && u._id) uni.setStorageSync(CACHE_USER_KEY, u._id)
	} catch (e) {}
}

/** 读取缓存的 pet 状态（快速首屏），无缓存或版本不匹配返回 null */
export function getCachedPet() {
	try {
		if (uni.getStorageSync(CACHE_VER_KEY) !== CACHE_VER) return null
		const raw = uni.getStorageSync(CACHE_PET_KEY)
		return raw ? JSON.parse(raw) : null
	} catch (e) {
		return null
	}
}

/** 清空本地缓存（设置页清空数据时调用） */
export function clearPetCache() {
	uni.removeStorageSync(CACHE_PET_KEY)
	uni.removeStorageSync(CACHE_USER_KEY)
}

/**
 * 统一调用云函数 beemore
 * @param {Object} data { action, ...params }
 * @returns {Promise<{code, message, data}>}
 */
export function callBeemore(data) {
	return new Promise((resolve, reject) => {
		uniCloud.callFunction({
			name: 'beemore',
			data,
			success: (res) => {
				const r = res.result || {}
				if (r.code !== 0 && r.code !== undefined) {
					// 业务错误统一提示（3001/3002 等由页面自行决定是否吞掉）
					if (r.code >= 5000 || r.code === 9001) {
						uni.showToast({ title: ERR_MSG[r.code] || r.message || '出错了', icon: 'none' })
					}
				}
				if (r.data && r.data.pet) cachePet(r.data.pet)
				resolve(r)
			},
			fail: (err) => {
				uni.showToast({ title: '网络不太顺畅，请稍后再试', icon: 'none' })
				reject(err)
			}
		})
	})
}

/**
 * 获取服务端最新状态并广播刷新
 * 页面 onShow 时调用；先展示缓存，再等待服务端结果
 */
export async function refreshPet() {
	const u = getMyUserInfo()
	const res = await callBeemore({ action: 'getStatus', userId: u ? u._id : '' })
	if (res.code === 0 && res.data && res.data.pet) {
		uni.$emit('beemore:pet-updated', res.data.pet)
	}
	return res
}

/**
 * 页面订阅 pet 状态刷新
 * @param {Function} handler (pet) => void
 */
export function onPetUpdate(handler) {
	uni.$on('beemore:pet-updated', handler)
}

export function offPetUpdate(handler) {
	uni.$off('beemore:pet-updated', handler)
}

// ================= 数字打工人便捷封装 =================
/** 结算今日工作（正常发工资 / 请假按 payCut / 旷工扣更多） */
export function settleWork(userId) {
	return callBeemore({ action: 'settleWork', userId })
}
/** 请假：type personal(事假)|sick(病假)，hours 请假时长 */
export function applyLeave(userId, type, hours, reason) {
	return callBeemore({ action: 'applyLeave', userId, type, hours, reason })
}
/** 发送聊天内容，杯蜜按状态/关键词回颜文字 */
export function chatSend(userId, text) {
	return callBeemore({ action: 'chat', userId, text })
}
/** 拉取最近聊天记录 */
export function chatHistory(userId) {
	return callBeemore({ action: 'chatHistory', userId })
}
/** 设置上班时段：普通职业 { shiftKey }（空=全部班次）；自由职业 { customShifts: [{name,start,end,weekdays}] } */
export function setWorkPlan(userId, payload) {
	return callBeemore(Object.assign({ action: 'setWorkPlan', userId }, payload))
}
/** 设置自定义睡眠时段；on=false 恢复全局默认 */
export function setSleepPlan(userId, plan) {
	return callBeemore(Object.assign({ action: 'setSleepPlan', userId }, plan))
}
/**
 * 干饭：只能在休息/空闲/请假时吃，foodKey 取自 getFoods()
 * 服务端会结算热量堆积（吃太多长胖）并写日记
 */
export function eatFood(userId, foodKey) {
	return callBeemore({ action: 'eat', userId, foodKey })
}
