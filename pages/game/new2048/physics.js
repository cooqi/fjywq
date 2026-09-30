/**
 * 简易圆形刚体物理世界（无第三方依赖，适配小程序）
 * 重力积分 + 圆-圆碰撞（位置修正 + 冲量）+ 左右墙与地面约束
 * 低弹性高摩擦，便于堆叠；step 结束后 contacts 记录本帧相切的刚体对，供合并判定
 */
let _id = 1

export function createWorld(width, height, opts) {
	const o = opts || {}
	return {
		width,
		height,
		gravity: o.gravity || 1300, // px/s²
		restitution: o.restitution != null ? o.restitution : 0.08, // 弹性很低
		friction: o.friction != null ? o.friction : 0.82, // 地面摩擦衰减
		bodies: [],
		contacts: []
	}
}

/** data 可携带游戏字段（level、merged 等） */
export function addCircle(world, x, y, r, data) {
	const b = Object.assign({ id: _id++, x, y, vx: 0, vy: 0, r, mass: r * r, merged: false, overAt: 0 }, data || {})
	world.bodies.push(b)
	return b
}

export function removeCircle(world, b) {
	const i = world.bodies.indexOf(b)
	if (i > -1) world.bodies.splice(i, 1)
}

function integrate(world, dt) {
	const bs = world.bodies
	for (let i = 0; i < bs.length; i++) {
		const b = bs[i]
		b.vy += world.gravity * dt
		b.x += b.vx * dt
		b.y += b.vy * dt
	}
}

function wallConstraints(world) {
	const bs = world.bodies
	for (let i = 0; i < bs.length; i++) {
		const b = bs[i]
		if (b.x - b.r < 0) {
			b.x = b.r
			if (b.vx < 0) b.vx = -b.vx * world.restitution
		} else if (b.x + b.r > world.width) {
			b.x = world.width - b.r
			if (b.vx > 0) b.vx = -b.vx * world.restitution
		}
		if (b.y + b.r > world.height) {
			b.y = world.height - b.r
			if (b.vy > 0) b.vy = -b.vy * world.restitution
			b.vx *= world.friction
		}
	}
}

function resolvePair(world, a, b) {
	const dx = b.x - a.x, dy = b.y - a.y
	const minDist = a.r + b.r
	let dist = Math.sqrt(dx * dx + dy * dy)
	if (dist >= minDist) return
	if (dist < 0.001) dist = 0.001 // 完全重合时防除零
	const nx = dx / dist, ny = dy / dist
	// 位置按逆质量比例修正
	const im1 = 1 / a.mass, im2 = 1 / b.mass, ims = im1 + im2
	const overlap = minDist - dist
	a.x -= nx * overlap * (im1 / ims)
	a.y -= ny * overlap * (im1 / ims)
	b.x += nx * overlap * (im2 / ims)
	b.y += ny * overlap * (im2 / ims)
	// 法向冲量
	const rvx = b.vx - a.vx, rvy = b.vy - a.vy
	const vn = rvx * nx + rvy * ny
	if (vn < 0) {
		const j = -(1 + world.restitution) * vn / ims
		a.vx -= j * nx * im1
		a.vy -= j * ny * im1
		b.vx += j * nx * im2
		b.vy += j * ny * im2
		// 切向摩擦
		const tx = -ny, ty = nx
		const vt = rvx * tx + rvy * ty
		const jt = -vt * 0.1 / ims
		a.vx += jt * tx * im1
		a.vy += jt * ty * im1
		b.vx -= jt * tx * im2
		b.vy -= jt * ty * im2
	}
	world.contacts.push([a, b])
}

/** 固定步长推进一帧：子步积分 + 多次碰撞迭代，保证堆叠稳定 */
export function step(world, dt) {
	world.contacts.length = 0
	const sub = 2
	const h = dt / sub
	const bs = world.bodies
	for (let s = 0; s < sub; s++) {
		integrate(world, h)
		for (let iter = 0; iter < 4; iter++) {
			for (let i = 0; i < bs.length; i++) {
				for (let j = i + 1; j < bs.length; j++) {
					resolvePair(world, bs[i], bs[j])
				}
			}
			wallConstraints(world)
		}
	}
}
