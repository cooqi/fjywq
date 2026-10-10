/**
 * 大头贴模块共享常量与小工具
 */

// 相框分类（value 存库，label 展示）
export const CATEGORIES = [
	{ value: 'all', label: '全部' },
	{ value: 'birthday', label: '生日' },
	{ value: 'concert', label: '演唱会' },
	{ value: 'daily', label: '日常' },
	{ value: 'festival', label: '节日' }
];

// 去掉 'all' 后的可上传分类
export const UPLOAD_CATEGORIES = CATEGORIES.filter(c => c.value !== 'all');

export function categoryLabel(value) {
	const hit = CATEGORIES.find(c => c.value === value);
	return hit ? hit.label : (value || '日常');
}

// 读取当前登录用户角色，判断是否管理员（与 wodi 一致）
export function readAdmin() {
	const raw = uni.getStorageSync('userInfo');
	let info = {};
	if (raw) { try { info = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { info = {}; } }
	const role = info.role || '';
	return {
		userId: info._id || info.userId || info.uid || '',
		userRole: role,
		isAdmin: role === 's_admin' || role === 'admin'
	};
}
