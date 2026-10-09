<template>
	<view class="ci">
		<view class="grp-title">
			<text>{{ sec.title }}</text>
			<text class="add" @click="addItem">+ 新增</text>
		</view>
		<view v-if="sec.hint" class="hint">{{ sec.hint }}</view>

		<view v-for="(it, i) in arr" :key="'it' + i" class="card">
			<view class="card-head">
				<text class="idx">{{ i + 1 }}</text>
				<text class="ttl">{{ titleOf(it, i) }}</text>
				<text class="mv" @click="move(i, -1)">↑</text>
				<text class="mv" @click="move(i, 1)">↓</text>
				<text class="rm" @click="removeItem(i)">删除</text>
			</view>
			<ConfigField v-for="(f, fi) in (sec.itemFields || [])" :key="'if' + fi" :box="it" :f="f" />
		</view>

		<view v-if="!arr.length" class="empty">还没有内容，点上方「+ 新增」</view>
	</view>
</template>

<script>
/**
 * 数组型配置段渲染器（foods.list / travel_places.list / 职业班次 shifts 等通用）
 * 直接操作传入的容器对象：新增/删除/上下移都用 $set 保证小程序端响应式
 */
import ConfigField from './ConfigField.vue'

export default {
	name: 'ConfigItems',
	components: { ConfigField },
	props: {
		sec: { type: Object, required: true },
		box: { type: Object, required: true }
	},
	computed: {
		arr() {
			const a = this.box ? this.box[this.sec.path] : null
			return Array.isArray(a) ? a : []
		}
	},
	methods: {
		titleOf(it, i) {
			const f = this.sec.titleField || this.sec.nameField
			const v = f ? it[f] : null
			if (Array.isArray(v)) return v.join('、') || `第 ${i + 1} 项`
			if (v) return String(v)
			if (it && it.key) return String(it.key)
			return `第 ${i + 1} 项`
		},
		ensureArr() {
			if (!Array.isArray(this.box[this.sec.path])) this.$set(this.box, this.sec.path, [])
			return this.box[this.sec.path]
		},
		addItem() {
			const tpl = this.sec.newItem || {}
			this.ensureArr().push(JSON.parse(JSON.stringify(tpl)))
		},
		removeItem(i) {
			const arr = this.ensureArr()
			arr.splice(i, 1)
			this.$set(this.box, this.sec.path, arr.slice())
		},
		move(i, dir) {
			const arr = this.ensureArr()
			const j = i + dir
			if (j < 0 || j >= arr.length) return
			const tmp = arr[i]
			this.$set(arr, i, arr[j])
			this.$set(arr, j, tmp)
		}
	}
}
</script>

<style scoped>
.ci { margin-bottom: 14px; }
.grp-title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold; color: #6a5acd; margin: 12px 0 6px; }
.add { font-size: 12px; font-weight: normal; color: #fff; background: #7f9cf5; border-radius: 8px; padding: 3px 10px; }
.hint { font-size: 11px; color: #a89fc0; line-height: 1.6; margin-bottom: 8px; }
.card { background: #f7f5ff; border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
.card-head { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; border-bottom: 1rpx solid #e8e3f7; }
.idx { font-size: 11px; color: #b0a8c8; }
.ttl { flex: 1; font-size: 14px; font-weight: bold; color: #555; }
.mv { font-size: 13px; color: #6a5acd; padding: 0 6px; background: #ece8fa; border-radius: 6px; }
.rm { font-size: 12px; color: #e0566b; }
.empty { font-size: 12px; color: #a89fc0; text-align: center; padding: 10px 0; }
</style>
