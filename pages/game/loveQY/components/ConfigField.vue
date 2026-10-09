<template>
	<view class="cf-field">
		<!-- 开关 -->
		<view v-if="kind === 'bool'" class="line">
			<text class="lab">{{ f.label }}</text>
			<switch class="sw" style="transform:scale(.8)" :checked="boolVal" color="#6a5acd" @change="onBool" />
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>

		<!-- 星期多选 -->
		<view v-else-if="kind === 'weekdays'" class="line col">
			<text class="lab">{{ f.label }}</text>
			<view class="week">
				<text v-for="(wd, d) in weekLabels" :key="'w' + d" class="wd" :class="{ on: hasDay(d) }" @click="toggleDay(d)">{{ wd }}</text>
			</view>
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>

		<!-- 下拉 -->
		<view v-else-if="kind === 'select'" class="line">
			<text class="lab">{{ f.label }}</text>
			<picker class="picker" mode="selector" :range="opts" :value="selIndex" @change="onSelect">
				<view class="pick-box">{{ selLabel }}</view>
			</picker>
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>

		<!-- 时间 -->
		<view v-else-if="kind === 'time'" class="line">
			<text class="lab">{{ f.label }}</text>
			<picker class="picker" mode="time" :value="strVal" @change="onTime">
				<view class="pick-box">{{ strVal || '选择时间' }}</view>
			</picker>
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>

		<!-- 多行文案（每行一条） -->
		<view v-else-if="kind === 'lines'" class="line col">
			<text class="lab">{{ f.label }}</text>
			<textarea class="area" :value="textVal" :maxlength="-1" placeholder="每行一条" @input="onAreaInput" @blur="commitText" />
			<text class="tip">{{ (arrVal && arrVal.length ? arrVal.length + ' 条 · ' : '') + (f.tip || '失焦后生效') }}</text>
		</view>

		<!-- 数字 -->
		<view v-else-if="kind === 'int' || kind === 'num'" class="line">
			<text class="lab">{{ f.label }}</text>
			<input class="ipt num" :type="kind === 'num' ? 'digit' : 'number'" :value="numText" placeholder="0" @input="onNumInput" @blur="commitNum" @confirm="commitNum" />
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>

		<!-- 文本 / 逗号分隔 / 兜底 -->
		<view v-else class="line">
			<text class="lab">{{ f.label }}</text>
			<input class="ipt" :value="strVal" :placeholder="f.ph || ''" :maxlength="f.maxlen > 0 ? f.maxlen : -1" @input="onTextInput" @blur="commitText" />
			<text v-if="f.tip" class="tip">{{ f.tip }}</text>
		</view>
	</view>
</template>

<script>
/**
 * 通用配置字段控件：按描述表（config-meta.js 的 field）渲染输入框/开关/时间/星期/下拉/多行
 * 只负责「读某个对象上的 path、写回并触发响应式」，校验与单位换算收尾在 beemore-admin 保存时做
 */
import { readPath } from '../config-meta.js'

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default {
	name: 'ConfigField',
	props: {
		box: { type: Object, required: true },
		f: { type: Object, required: true }
	},
	data() {
		return { weekLabels: WEEK, buf: null }
	},
	computed: {
		kind() { return this.f.type || 'text' },
		raw() { return readPath(this.box, this.f.path) },
		/** 输入中优先用本地缓冲，避免数字被换算后打断打字 */
		usingBuf() { return this.buf !== null },
		boolVal() { return this.raw === true || this.raw === 'true' },
		strVal() {
			if (this.usingBuf) return this.buf
			if (this.kind === 'csv') return Array.isArray(this.raw) ? this.raw.join('，') : (this.raw || '')
			return this.raw === null || this.raw === undefined ? '' : String(this.raw)
		},
		textVal() {
			if (this.usingBuf) return this.buf
			return Array.isArray(this.raw) ? this.raw.join('\n') : (this.raw || '')
		},
		arrVal() { return Array.isArray(this.raw) ? this.raw : null },
		numText() {
			if (this.usingBuf) return this.buf
			const d = this.f.divide || 1
			if (this.raw === '' || this.raw === null || this.raw === undefined) return ''
			const n = Number(this.raw) / d
			return isFinite(n) ? String(Math.round(n * 1000000) / 1000000) : ''
		},
		opts() {
			const list = (this.f.opts || []).slice()
			const cur = this.raw === null || this.raw === undefined ? '' : String(this.raw)
			if (cur && list.indexOf(cur) < 0) list.unshift(cur)
			return list
		},
		selIndex() {
			const cur = this.raw === null || this.raw === undefined ? '' : String(this.raw)
			const i = this.opts.indexOf(cur)
			return i < 0 ? 0 : i
		},
		selLabel() { return this.opts[this.selIndex] || '未设置' }
	},
	methods: {
		/** 写回 path（中间层缺失自动补对象，并保证新增键也是响应式的） */
		setVal(val) {
			const parts = String(this.f.path).split('.')
			let cur = this.box
			for (let i = 0; i < parts.length - 1; i++) {
				const p = parts[i]
				if (cur[p] === null || cur[p] === undefined || typeof cur[p] !== 'object') this.$set(cur, p, {})
				cur = cur[p]
			}
			this.$set(cur, parts[parts.length - 1], val)
		},
		onBool(e) { this.setVal(e.detail.value) },
		onTime(e) { this.setVal(e.detail.value) },
		onSelect(e) { this.setVal(this.opts[Number(e.detail.value)] || '') },
		onTextInput(e) { this.buf = e.detail.value; this.setVal(e.detail.value) },
		onAreaInput(e) { this.buf = e.detail.value },
		commitText() {
			if (this.buf === null) return
			const v = this.buf
			this.buf = null
			if (this.kind === 'csv') this.setVal(String(v).split(/[,，、\s]+/).map(s => s.trim()).filter(s => s))
			else if (this.kind === 'lines') this.setVal(String(v).split('\n').map(s => s.trim()).filter(s => s))
			else this.setVal(v)
		},
		onNumInput(e) { this.buf = e.detail.value },
		commitNum() {
			if (this.buf === null) return
			const s = String(this.buf).trim()
			this.buf = null
			if (s === '') { this.setVal(''); return }
			const n = Number(s)
			if (!isFinite(n)) { this.setVal(''); return }
			const d = this.f.divide || 1
			this.setVal(this.kind === 'int' ? Math.round(n * d) : n * d)
		},
		hasDay(d) { return Array.isArray(this.raw) && this.raw.indexOf(d) > -1 },
		toggleDay(d) {
			const arr = Array.isArray(this.raw) ? this.raw.slice() : []
			const i = arr.indexOf(d)
			if (i > -1) arr.splice(i, 1)
			else arr.push(d)
			this.setVal(arr)
		}
	}
}
</script>

<style scoped>
.cf-field { display: block; }
.line { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 7px 0; border-bottom: 1rpx dashed #efecf8; }
.line.col { flex-direction: column; align-items: stretch; }
.lab { font-size: 13px; color: #555; width: 200rpx; flex-shrink: 0; }
.ipt { flex: 1; min-width: 160rpx; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 7px 10px; background: #fff; font-size: 14px; }
.ipt.num { max-width: 220rpx; text-align: right; }
.picker { flex: 1; }
.pick-box { border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 7px 10px; background: #fff; font-size: 14px; color: #444; }
.area { width: 100%; box-sizing: border-box; min-height: 120rpx; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px 10px; background: #fff; font-size: 13px; line-height: 1.6; }
.tip { width: 100%; font-size: 11px; color: #a89fc0; margin-left: 200rpx; }
.line.col .tip { margin-left: 0; }
.week { display: flex; flex-wrap: wrap; gap: 6px; }
.wd { font-size: 12px; padding: 4px 10px; border-radius: 8px; background: #f0eef7; color: #888; }
.wd.on { background: #6a5acd; color: #fff; }
</style>
