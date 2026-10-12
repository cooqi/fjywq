/**
 * 档案模块共享常量
 * - SUBJECTS：三个档案主体（青宇 / 王青 / 冯建宇）的元信息与配色
 * - WORK_SECTIONS：作品分类下的二级大类
 * - SCHEMA：各主体、各分类的字段定义（管理页据此动态渲染表单，展示页据此回显）
 *
 * 数据结构：数据库每条记录 = { subject, category, sort, data:{...字段} }
 * profile / stats 等特殊分类同样按此结构存储（data 内即对应字段）。
 */

export const SUBJECTS = {
	intersection: {
		key: 'intersection',
		name: '青宇档案',
		short: '青宇',
		theme: 'cp', // 双色
		colorA: '#31eee0',
		colorB: '#9a9ad9',
		color: '#31eee0',
		colorDark: '#0d9488'
	},
	wang: {
		key: 'wang',
		name: '王青',
		short: '王青',
		theme: 'wang',
		color: '#31eee0',
		colorDark: '#0d9488',
		colorLight: '#ccfbf1'
	},
	feng: {
		key: 'feng',
		name: '冯建宇',
		short: '冯建宇',
		theme: 'feng',
		color: '#9a9ad9',
		colorDark: '#6366f1',
		colorLight: '#ede9fe'
	}
};

// 顶部 Tab 展示顺序
export const SUBJECT_ORDER = ['intersection', 'wang', 'feng'];

export const WORK_SECTIONS = [
	{ key: 'tv', label: '电视剧/网剧', posterLabel: '剧集', posterClass: '' },
	{ key: 'movie', label: '电影', posterLabel: '电影', posterClass: 'movie-bg' },
	{ key: 'variety', label: '综艺', posterLabel: '综艺', posterClass: 'variety-bg' },
	{ key: 'other', label: '其他', posterLabel: '其他', posterClass: 'other-bg' },
	{ key: 'upcoming', label: '待播', posterLabel: '待播', posterClass: 'upcoming-bg' }
];

// 每个分类：label（chip 文案）、icon（列表图标）、fields（表单字段）
// field.type 省略默认 text；可选 text / textarea / select / color / year（年份选择器）/ date（日期选择器）/ image（图片上传）/ dict（字典下拉，管理员可扩展，dictKey 指向 DICT_BASE 与云集合 dangan-dict）/ checks（多选胶囊，存逗号串）
// 单人/双人归档映射：个人页录入选“双人”时，实际写入 intersection 主体下的对应分类
export const PAIR_MAP = { works: 'works', brands: 'doubleBrands', music: 'doubleSongs', events: 'doubleEvents', honors: 'honors' };
export const DICT_BASE = {
	// 作品类型基础字典（管理页可新增，扩展项存云数据库 dangan-dict，展示时合并去重）
	worksType: ['网剧', '电视剧', '电影', '综艺', '微电影', '音乐单曲', '舞台剧', '其他'],
	// 影视作品身份基础字典
	worksRole: ['男主', '男二', '配角', '导演', '编剧', '常驻嘉宾', '主持人', '其他']
};
// 双人歌曲参与身份选项（王青/冯建宇各自多选）
const CREDIT_OPTIONS = ['作词', '作曲', '编曲', '演唱'];
export const SCHEMA = {
	intersection: {
		// stats: {
		// 	label: '顶部统计', icon: '∑', fields: [
		// 		{ key: 'value', label: '数值', placeholder: '如：11', required: true },
		// 		{ key: 'unit', label: '单位', placeholder: '如：年' },
		// 		{ key: 'label', label: '说明文字', placeholder: '如：相识至今', required: true }
		// 	]
		// },
		cpAccounts: {
			label: 'CP平台账号', icon: '☁', fields: [
				{ key: 'platform', label: '平台名称', placeholder: '如：超话 / 数据站', required: true },
				{ key: 'handle', label: '账号名称', placeholder: '如：青宇数据组' },
				{ key: 'icon', label: '图标样式', type: 'select', options: ['cp', 'station', 'weibo', 'douyin', 'xhs', 'bilibili', 'default'] },
				{ key: 'iconText', label: '图标文字', placeholder: '如：青宇 / DATA' },
				{ key: 'fans', label: '粉丝数', placeholder: '如：8.6w' },
				{ key: 'growth', label: '近30天涨粉', placeholder: '如：3200' }
			]
		},
		works: {
			label: '作品', icon: '▣', fields: [
				{ key: 'section', label: '所属大类', type: 'select', options: WORK_SECTIONS.map(s => ({ value: s.key, label: s.label })), required: true },
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '作品名称', placeholder: '如：《逆袭之爱上情敌》', required: true },
				{ key: 'poster', label: '作品图片', type: 'image' },
				{ key: 'role', label: '角色信息', placeholder: '单人作品填写，如： 池骋' },
				{ key: 'roleWang', label: '王青饰演', placeholder: '如：池骋（自动合并进角色信息）' },
				{ key: 'roleFeng', label: '冯建宇饰演', placeholder: '如：吴所畏（自动合并进角色信息）' },
				{ key: 'workRole', label: '身份', type: 'dict', dictKey: 'worksRole' },
				{ key: 'type', label: '作品类型', type: 'dict', dictKey: 'worksType' },
				{ key: 'platform', label: '播出平台', placeholder: '如：B站 / 爱奇艺' },
				{ key: 'genre', label: '题材类型', placeholder: '如：都市爱情' },
				{ key: 'note', label: '备注', type: 'textarea', placeholder: '选填' }
			]
		},
		honors: {
			label: '共同荣誉', icon: '★', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '荣誉名称', placeholder: '如：亚洲新歌榜月榜冠军', required: true },
				{ key: 'org', label: '颁发机构', placeholder: '如：亚洲新歌榜' },
				{ key: 'category', label: '奖项类别', placeholder: '如：音乐奖项 / 影视奖项' },
				{ key: 'together', label: '获得方式', type: 'select', options: ['共同获得', '各自获得'] },
				{ key: 'note', label: '备注', type: 'textarea', placeholder: '选填' },
				{ key: 'level', label: '荣誉等级', type: 'select', options: ['normal', 'gold'] }
			]
		},
		doubleBrands: {
			label: '双人商务', icon: '◆', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2025' },
				{ key: 'brand', label: '品牌名称', placeholder: '如：好望水', required: true },
				{ key: 'type', label: '品牌类型', placeholder: '如：饮料' },
				{ key: 'title', label: '商务 Title', placeholder: '如：照顾系列挚友' },
				{ key: 'date', label: '整体时间', type: 'date', placeholder: '如：2025/8/22' },
				{ key: 'dateWang', label: '王青侧时间', type: 'date' },
				{ key: 'dateFeng', label: '冯建宇侧时间', type: 'date' },
				{ key: 'productWang', label: '王青侧产品', placeholder: '如：王青同款单品' },
				{ key: 'productFeng', label: '冯建宇侧产品', placeholder: '如：冯建宇同款单品' },
				{ key: 'status', label: '状态', type: 'select', options: ['存续', '已到期', '已停售'] },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		doubleSongs: {
			label: '双人歌曲', icon: '♪', fields: [
				{ key: 'song', label: '歌曲名', placeholder: '如：《今夏》', required: true },
				{ key: 'date', label: '发布时间', type: 'date', placeholder: '如：2015/9/22' },
				{ key: 'creditWang', label: '王青参与身份', type: 'checks', options: CREDIT_OPTIONS },
				{ key: 'creditFeng', label: '冯建宇参与身份', type: 'checks', options: CREDIT_OPTIONS },
				{ key: 'album', label: '专辑', placeholder: '如：单曲' },
				{ key: 'genre', label: '类型', placeholder: '如：流行音乐' },
				{ key: 'platform', label: '平台', placeholder: '如：QQ音乐' },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		doubleEvents: {
			label: '双人活动', icon: '✦', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'type', label: '类型', placeholder: '如：见面会 / 演唱会' },
				{ key: 'date', label: '时间', type: 'date', placeholder: '如：天津 / 10月25日' },
				{ key: 'stage', label: '同台形式', type: 'select', options: ['同台', '不同台（拼盘）'] },
				{ key: 'location', label: '地点', placeholder: '如：天津红旗剧院' },
				{ key: 'name', label: '活动名称', placeholder: '如：今夏粉丝见面会', required: true },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		}
	},
	wang: {
		profile: {
			label: '个人简介', icon: '青', fields: [
				{ key: 'name', label: '姓名', placeholder: '如：王青', required: true },
				{ key: 'avatar', label: '头像文字（1-2字）', placeholder: '如：青' },
				{ key: 'avatarImg', label: '头像图片', type: 'image' },
				{ key: 'tags', label: '标签（逗号分隔）', placeholder: '如：演员,歌手,编剧' },
				{ key: 'fandomName', label: '应援色名称', placeholder: '如：青色' },
				{ key: 'fandomHex', label: '应援色色值', type: 'color', placeholder: '如：#31eee0' },
				{ key: 'bio', label: '个人简介', type: 'textarea', placeholder: '请输入个人简介', required: true }
			]
		},
		accounts: {
			label: '平台账号', icon: '☁', fields: [
				{ key: 'platform', label: '平台名称', placeholder: '如：微博', required: true },
				{ key: 'handle', label: '账号', placeholder: '如：@王青' },
				{ key: 'icon', label: '图标样式', type: 'select', options: ['weibo', 'douyin', 'xhs', 'bilibili', 'cp', 'station', 'default'] },
				{ key: 'iconText', label: '图标文字', placeholder: '如：WB / DY' },
				{ key: 'fans', label: '粉丝数', placeholder: '如：1258w' },
				{ key: 'growth', label: '近30天涨粉', placeholder: '如：2.3w' }
			]
		},
		works: {
			label: '影视综', icon: '▣', fields: [
				{ key: 'section', label: '所属大类', type: 'select', options: WORK_SECTIONS.map(s => ({ value: s.key, label: s.label })), required: true },
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '作品名称', placeholder: '如：《逆袭之爱上情敌》', required: true },
				{ key: 'poster', label: '作品图片', type: 'image' },
				{ key: 'role', label: '饰演角色', placeholder: '如： 池骋' },
				{ key: 'workRole', label: '身份', type: 'dict', dictKey: 'worksRole' },
				{ key: 'type', label: '作品类型', type: 'dict', dictKey: 'worksType' },
				{ key: 'platform', label: '播出平台', placeholder: '如：爱奇艺' },
				{ key: 'genre', label: '题材类型', placeholder: '如：都市爱情' },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		music: {
			label: '音乐', icon: '♪', fields: [
				{ key: 'song', label: '歌曲名', placeholder: '如：《Demo》', required: true },
				{ key: 'date', label: '发布时间', type: 'date', placeholder: '如：2016/3/11' },
				{ key: 'album', label: '专辑', placeholder: '如：单曲' },
				{ key: 'genre', label: '类型', placeholder: '如：流行音乐' },
				{ key: 'platform', label: '平台', placeholder: '如：QQ音乐' },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		brands: {
			label: '商务', icon: '◆', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2025' },
				{ key: 'brand', label: '品牌名称', placeholder: '如：好望水', required: true },
				{ key: 'type', label: '品牌类型', placeholder: '如：饮料' },
				{ key: 'title', label: '商务 Title', placeholder: '如：品牌挚友' },
				{ key: 'date', label: '时间', type: 'date', placeholder: '如：2025/8/14' },
				{ key: 'status', label: '状态', type: 'select', options: ['存续', '已到期', '已停售'] },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		events: {
			label: '活动', icon: '✦', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2025' },
				{ key: 'type', label: '类型', placeholder: '如：音乐节 / 演唱会' },
				{ key: 'date', label: '时间', type: 'date', placeholder: '如：10月6日' },
				{ key: 'location', label: '地点', placeholder: '如：阜阳' },
				{ key: 'name', label: '活动名称', placeholder: '如：音乐节', required: true },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		honors: {
			label: '荣誉', icon: '★', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '荣誉名称', placeholder: '如：年度最佳新人', required: true },
				{ key: 'org', label: '颁发机构', placeholder: '如：亚洲新歌榜年度盛典' },
				{ key: 'category', label: '奖项类别', placeholder: '如：音乐奖项 / 影视奖项' },
				{ key: 'note', label: '备注', type: 'textarea' },
				{ key: 'level', label: '荣誉等级', type: 'select', options: ['normal', 'gold'] }
			]
		}
	},
	feng: {
		profile: {
			label: '个人简介', icon: '宇', fields: [
				{ key: 'name', label: '姓名', placeholder: '如：冯建宇', required: true },
				{ key: 'avatar', label: '头像文字（1-2字）', placeholder: '如：宇' },
				{ key: 'avatarImg', label: '头像图片', type: 'image' },
				{ key: 'tags', label: '标签（逗号分隔）', placeholder: '如：演员,歌手' },
				{ key: 'fandomName', label: '应援色名称', placeholder: '如：紫色' },
				{ key: 'fandomHex', label: '应援色色值', type: 'color', placeholder: '如：#9a9ad9' },
				{ key: 'bio', label: '个人简介', type: 'textarea', placeholder: '请输入个人简介', required: true }
			]
		},
		accounts: {
			label: '平台账号', icon: '☁', fields: [
				{ key: 'platform', label: '平台名称', placeholder: '如：微博', required: true },
				{ key: 'handle', label: '账号', placeholder: '如：@冯建宇' },
				{ key: 'icon', label: '图标样式', type: 'select', options: ['weibo', 'douyin', 'xhs', 'bilibili', 'cp', 'station', 'default'] },
				{ key: 'iconText', label: '图标文字', placeholder: '如：WB / DY' },
				{ key: 'fans', label: '粉丝数', placeholder: '如：1056w' },
				{ key: 'growth', label: '近30天涨粉', placeholder: '如：1.9w' }
			]
		},
		works: {
			label: '影视综', icon: '▣', fields: [
				{ key: 'section', label: '所属大类', type: 'select', options: WORK_SECTIONS.map(s => ({ value: s.key, label: s.label })), required: true },
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '作品名称', placeholder: '如：《逆袭之爱上情敌》', required: true },
				{ key: 'poster', label: '作品图片', type: 'image' },
				{ key: 'role', label: '饰演角色', placeholder: '如： 吴所畏' },
				{ key: 'workRole', label: '身份', type: 'dict', dictKey: 'worksRole' },
				{ key: 'type', label: '作品类型', type: 'dict', dictKey: 'worksType' },
				{ key: 'platform', label: '播出平台', placeholder: '如：优酷' },
				{ key: 'genre', label: '题材类型', placeholder: '如：都市爱情' },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		music: {
			label: '音乐', icon: '♪', fields: [
				{ key: 'song', label: '歌曲名', placeholder: '如：《一路向南》', required: true },
				{ key: 'date', label: '发布时间', type: 'date', placeholder: '如：2016/5/15' },
				{ key: 'album', label: '专辑', placeholder: '如：单曲' },
				{ key: 'genre', label: '类型', placeholder: '如：流行音乐' },
				{ key: 'platform', label: '平台', placeholder: '如：QQ音乐' },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		brands: {
			label: '商务', icon: '◆', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2025' },
				{ key: 'brand', label: '品牌名称', placeholder: '如：好望水', required: true },
				{ key: 'type', label: '品牌类型', placeholder: '如：饮料' },
				{ key: 'title', label: '商务 Title', placeholder: '如：照顾系列挚友' },
				{ key: 'date', label: '时间', type: 'date', placeholder: '如：2025/8/22' },
				{ key: 'status', label: '状态', type: 'select', options: ['存续', '已到期', '已停售'] },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		events: {
			label: '活动', icon: '✦', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2025' },
				{ key: 'type', label: '类型', placeholder: '如：音乐节 / 演唱会' },
				{ key: 'date', label: '时间', type: 'date', placeholder: '如：10月8日' },
				{ key: 'location', label: '地点', placeholder: '如：襄阳' },
				{ key: 'name', label: '活动名称', placeholder: '如：音乐节', required: true },
				{ key: 'note', label: '备注', type: 'textarea' }
			]
		},
		honors: {
			label: '荣誉', icon: '★', fields: [
				{ key: 'year', label: '年份', type: 'year', placeholder: '如：2015' },
				{ key: 'title', label: '荣誉名称', placeholder: '如：年度最佳新人', required: true },
				{ key: 'org', label: '颁发机构', placeholder: '如：亚洲新歌榜年度盛典' },
				{ key: 'category', label: '奖项类别', placeholder: '如：音乐奖项 / 影视奖项' },
				{ key: 'note', label: '备注', type: 'textarea' },
				{ key: 'level', label: '荣誉等级', type: 'select', options: ['normal', 'gold'] }
			]
		}
	}
};

// 平台图标对应的渐变色（展示页小卡片背景）
export const PLATFORM_ICON_BG = {
	weibo: 'linear-gradient(135deg,#ff4b5c,#e6162d)',
	douyin: 'linear-gradient(135deg,#2b2b2b,#000)',
	xhs: 'linear-gradient(135deg,#ff5a6e,#ff2442)',
	bilibili: 'linear-gradient(135deg,#00a1d6,#0088cc)',
	cp: 'linear-gradient(135deg,#31eee0,#9a9ad9)',
	station: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
	default: 'linear-gradient(135deg,#94a3b8,#64748b)'
};

// 依据 SCHEMA 生成一条空数据模板（新增时用）
export function blankData(subject, category) {
	const cat = (SCHEMA[subject] && SCHEMA[subject][category]) || { fields: [] };
	const out = {};
	cat.fields.forEach(f => {
		out[f.key] = '';
	});
	return out;
}

// 主体下分类的展示顺序（chip 顺序）
export function categoryOrder(subject) {
	return Object.keys(SCHEMA[subject] || {});
}
