/**
 * 权限控制工具类
 * 角色定义：
 * - s_admin: 超级管理员（拥有所有权限）
 * - admin: 管理员（拥有大部分增删改权限）
 * - user: 普通用户（仅查看和操作自己的数据）
 */

// 角色常量
export const ROLES = {
	SUPER_ADMIN: 's_admin',  // 超级管理员
	ADMIN: 'admin',          // 管理员
	USER: 'user'             // 普通用户
}

// 登录页（profile 为 tabBar 页）与回跳地址存储 key
const LOGIN_PAGE = '/pages/profile/profile'
const LOGIN_REDIRECT_KEY = 'login_redirect_url'
// tabBar 页面路径（回跳时判断用 switchTab 还是 navigateTo）
const TABBAR_PATHS = [
	'/pages/rili/rili',
	'/pages/notice/notice',
	'/pages/dangan/dangan',
	'/pages/profile/profile',
	'/pages/game/game'
]

/**
 * 获取当前页面完整路径（含 query 参数），用于登录后回跳
 * @returns {String} 形如 '/pages/xxx/xxx?a=1&b=2'，无页面时返回 ''
 */
export function getCurrentPageRoute() {
	try {
		const pages = getCurrentPages()
		if (!pages || !pages.length) return ''
		const cur = pages[pages.length - 1]
		const route = cur.route || (cur.$page && cur.$page.route) || ''
		if (!route) return ''
		const path = '/' + String(route).replace(/^\/+/, '')
		const opts = (cur.$page && cur.$page.options) || cur.options || {}
		const qs = Object.keys(opts)
			.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(opts[k])}`)
			.join('&')
		return qs ? `${path}?${qs}` : path
	} catch (e) {
		return ''
	}
}

/**
 * 跳转到登录页，并记录来源页面，登录成功后可回跳
 * （profile 是 tabBar，switchTab 无法带 query，故用 storage 暂存当前页地址）
 * @param {String} [redirectUrl] 指定回跳地址；不传则自动取当前页
 */
export function goLogin(redirectUrl) {
	const from = redirectUrl || getCurrentPageRoute()
	// 仅记录非登录页本身，避免登录后回到登录页空转
	if (from && from.indexOf(LOGIN_PAGE) !== 0) {
		uni.setStorageSync(LOGIN_REDIRECT_KEY, from)
	}
	uni.switchTab({
		url: LOGIN_PAGE,
		fail: () => { uni.redirectTo({ url: LOGIN_PAGE }) }
	})
}

/**
 * 取出并清除登录回跳地址（登录成功后由 profile 页调用）
 * @returns {String} 待回跳的页面地址，无则返回 ''
 */
export function consumeLoginRedirect() {
	const url = uni.getStorageSync(LOGIN_REDIRECT_KEY) || ''
	if (url) uni.removeStorageSync(LOGIN_REDIRECT_KEY)
	return url
}

/**
 * 登录成功后回跳来源页：tabBar 页用 switchTab，普通页用 navigateTo/redirectTo
 * @returns {Boolean} 是否执行了回跳
 */
export function backToLoginRedirect() {
	const url = consumeLoginRedirect()
	if (!url) return false
	const path = url.split('?')[0]
	if (TABBAR_PATHS.indexOf(path) > -1) {
		// tabBar 页不支持 query，只切到该页
		uni.switchTab({ url: path, fail: () => uni.redirectTo({ url }) })
	} else {
		uni.navigateTo({ url, fail: () => uni.redirectTo({ url }) })
	}
	return true
}

/**
 * 获取用户角色
 * @param {Object} userInfo - 用户信息对象
 * @returns {String} 用户角色
 */
export function getUserRole(userInfo) {
	if (!userInfo) return ROLES.USER
	return userInfo.role || ROLES.USER
}

/**
 * 检查是否为超级管理员
 * @param {Object} userInfo - 用户信息对象
 * @returns {Boolean}
 */
export function isSuperAdmin(userInfo) {
	return getUserRole(userInfo) === ROLES.SUPER_ADMIN
}

/**
 * 检查是否为管理员（包括超级管理员）
 * @param {Object} userInfo - 用户信息对象
 * @returns {Boolean}
 */
export function isAdmin(userInfo) {
	const role = getUserRole(userInfo)
	return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN
}

/**
 * 检查是否有编辑权限（日历模块）
 * admin 只有新增权限，s_admin 有所有权限
 * @param {Object} userInfo - 用户信息对象
 * @param {String} action - 操作类型：add(新增), edit(编辑), delete(删除), view(查看)
 * @returns {Boolean}
 */
export function hasCalendarPermission(userInfo, action) {
	const role = getUserRole(userInfo)
	
	// 超级管理员拥有所有权限
	if (role === ROLES.SUPER_ADMIN) {
		return true
	}
	
	// 管理员只有新增权限
	if (role === ROLES.ADMIN) {
		return action === 'add'
	}
	
	// 普通用户无编辑权限
	return false
}

/**
 * 检查是否有建议管理权限
 * @param {Object} userInfo - 用户信息对象
 * @param {String} action - 操作类型：reply(回复), view(查看)
 * @returns {Boolean}
 */
export function hasSuggestionPermission(userInfo, action) {
	const role = getUserRole(userInfo)
	
	// 超级管理员和管理员都有回复权限
	if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
		return true
	}
	
	// 普通用户只能查看自己已回复的建议
	if (action === 'view') {
		return true
	}
	
	return false
}

/**
 * 检查是否有演唱会管理权限
 * @param {Object} userInfo - 用户信息对象
 * @param {String} action - 操作类型：add, edit, delete, view
 * @returns {Boolean}
 */
export function hasConcertPermission(userInfo, action) {
	return isAdmin(userInfo)
}

/**
 * 检查是否有消费记录操作权限（只能操作自己的记录）
 * @param {Object} userInfo - 用户信息对象
 * @param {String} recordUserId - 记录所属用户ID
 * @param {String} action - 操作类型
 * @returns {Boolean}
 */
export function hasPayRecordPermission(userInfo, recordUserId, action) {
	const role = getUserRole(userInfo)
	
	// 超级管理员可以操作所有记录
	if (role === ROLES.SUPER_ADMIN) {
		return true
	}
	
	// 管理员和普通用户只能操作自己的记录
	return userInfo._id === recordUserId
}

/**
 * 获取用户权限描述（用于调试）
 * @param {Object} userInfo - 用户信息对象
 * @returns {Object} 权限描述对象
 */
export function getPermissionInfo(userInfo) {
	const role = getUserRole(userInfo)
	return {
		userId: userInfo._id || '',
		role: role,
		isSuperAdmin: role === ROLES.SUPER_ADMIN,
		isAdmin: isAdmin(userInfo),
		permissions: {
			calendar: {
				add: hasCalendarPermission(userInfo, 'add'),
				edit: hasCalendarPermission(userInfo, 'edit'),
				delete: hasCalendarPermission(userInfo, 'delete'),
				view: hasCalendarPermission(userInfo, 'view')
			},
			suggestion: {
				reply: hasSuggestionPermission(userInfo, 'reply'),
				view: hasSuggestionPermission(userInfo, 'view')
			},
			concert: {
				manage: hasConcertPermission(userInfo, 'manage')
			}
		}
	}
}
