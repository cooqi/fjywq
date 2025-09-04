/**
 * 
 */

function getDays(year, month, data, isLess) {
	if (!Array.isArray(data)) {
		data = []
	}

	let today = new Date()
	
	let y, m
	if (typeof(year) === 'number' && year > 2000 && typeof(month) === 'number') {
		const d = new Date(year, month - 1)
		y = d.getFullYear()
		m = d.getMonth()
	} else {
		y = today.getFullYear()
		m = today.getMonth()
	}
	
	let st = new Date(y, m, 1).getDay(),
		ed = new Date(y, m + 1, 0).getDay(),
		len = new Date(y, m + 1, 0).getDate()
	
	let isfill = data.length > 0
	let days = Array.from(new Array(len), (x, i) => {
		i = i + 1
		const date = `${y}/${m+1}/${i}`
		x = null
		if (isfill) {
			x = data.find(item => item.date === date)
		}
		return {
			show: true,
			label: i,
			date,
			data: x
		}
	})
	
	let prev = new Date(y, m - 1),
		prevDate = `${prev.getFullYear()}/${prev.getMonth()+1}`,
		prevLd = new Date(y, m, 0).getDate()
	let prevDays = Array.from(new Array(st), (x, i) => {
		i = prevLd - (st - 1 - i)
		return {
			show: false,
			label: isLess ? '' : i,
			date: `${prevDate}/${i}`
		}
	})
	days = prevDays.concat(days)
	
	let next = new Date(y, m + 1),
		nextDate = `${next.getFullYear()}/${next.getMonth()+1}`
	let lened = (days.length <= 35 ? 7 : 0) + (6 - ed)
	if (isLess) {
		lened = 6 - ed
	}
	let nextDays = Array.from(new Array(lened), (x, i) => {
		i = i + 1
		return {
			show: false,
			label: isLess ? '' : i,
			date: `${nextDate}/${i}`
		}
	})
	days = days.concat(nextDays)
	
	days = days.concat(Array.from(new Array(42 - days.length), (x, i) => {
		return {
			show: false,
			label: '',
			date: `*${i}`
		}
	}))
	
	return {
		days,
		year: y,
		month: m
	}
}

function getEn (m) {
	const en = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sept',
		'Oct',
		'Nov',
		'Dec',
	]
	return en[m - 1]
}

const labels_en = [
	'Sun',
	'Mon',
	'Tues',
	'Wed',
	'Thur',
	'Fri',
	'Sat',
]

const labels_zh = [
	'日', 
	'一', 
	'二', 
	'三', 
	'四', 
	'五', 
	'六',
]

export default {
	getDays,
	getEn,
	labels_en,
	labels_zh
}