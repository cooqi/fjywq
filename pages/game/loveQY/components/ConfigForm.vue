<template>
	<view class="cf">
		<block v-for="(sec, si) in sections" :key="'s' + si">
			<!-- ① 平铺字段 -->
			<view v-if="!sec.type || sec.type === 'fields'" class="grp">
				<view class="grp-title">{{ sec.title }}</view>
				<view v-if="sec.hint" class="hint">{{ sec.hint }}</view>
				<ConfigField v-for="(f, fi) in (sec.fields || [])" :key="'f' + fi" :box="model" :f="f" />
			</view>

			<!-- ② 对象表：key -> 对象（职业 / 假别 / 动作 / 装扮） -->
			<view v-else-if="sec.type === 'entries'" class="grp">
				<view class="grp-title">
					<text>{{ sec.title }}</text>
					<text class="add" @click="addEntry(sec)">{{ sec.addLabel || '+ 新增' }}</text>
				</view>
				<view v-if="sec.hint" class="hint">{{ sec.hint }}</view>
				<view v-for="(k, ki) in keysOf(sec)" :key="'e' + si + ki" class="card">
					<view class="card-head">
						<text class="klab">{{ sec.keyLabel || '代号' }}</text>
						<input class="kbox" :value="keyDisplay(idk(si, k), k)" placeholder="英文代号" @input="onKeyInput(idk(si, k), $event)" @blur="commitKey(sec, k, idk(si, k))" />
						<text class="rm" @click="delEntry(sec, k)">删除</text>
					</view>
					<ConfigField v-for="(f, fi) in (sec.itemFields || [])" :key="'ef' + fi" :box="entryOf(sec, k)" :f="f" />
					<ConfigItems v-for="(ss, ssi) in (sec.itemSections || [])" :key="'es' + ssi" :sec="ss" :box="entryOf(sec, k)" />
				</view>
				<view v-if="!keysOf(sec).length" class="empty">还没有条目</view>
			</view>

			<!-- ③ 对象数组 -->
			<ConfigItems v-else-if="sec.type === 'items'" :sec="sec" :box="model" />

			<!-- ④ 文案库：key -> 字符串数组（颜文字） -->
			<view v-else-if="sec.type === 'states'" class="grp">
				<view class="grp-title">
					<text>{{ sec.title }}</text>
					<text class="add" @click="addEntry(sec)">{{ sec.addLabel || '+ 新增状态' }}</text>
				</view>
				<view v-if="sec.hint" class="hint">{{ sec.hint }}</view>
				<view v-for="(k, ki) in keysOf(sec)" :key="'st' + si + ki" class="card">
					<view class="card-head">
						<input class="kbox" :value="keyDisplay(idk(si, k), k)" placeholder="状态代号" @input="onKeyInput(idk(si, k), $event)" @blur="commitKey(sec, k, idk(si, k))" />
						<text class="kv-label">{{ (sec.labelOf || {})[k] || k }}</text>
						<text class="rm" @click="delEntry(sec, k)">删除</text>
					</view>
					<textarea class="area" :value="linesDisplay(idk(si, k), entryOf(sec, k))" :maxlength="-1" placeholder="每行一条" @input="onLinesInput(idk(si, k), $event)" @blur="commitLines(sec, k, idk(si, k))" />
				</view>
			</view>

			<!-- ⑤ 键值对：key -> 文案（明信片 / 里程碑） -->
			<view v-else-if="sec.type === 'kv'" class="grp">
				<view class="grp-title">
					<text>{{ sec.title }}</text>
					<text class="add" @click="addKv(sec)">{{ sec.addLabel || '+ 新增' }}</text>
				</view>
				<view v-if="sec.hint" class="hint">{{ sec.hint }}</view>
				<view v-for="(k, ki) in keysOf(sec)" :key="'kv' + si + ki" class="kv-row">
					<input class="kbox" :value="keyDisplay(idk(si, k), k)" :placeholder="sec.keyLabel || 'key'" @input="onKeyInput(idk(si, k), $event)" @blur="commitKey(sec, k, idk(si, k))" />
					<input class="vbox" :value="kvText(sec, k)" :placeholder="sec.valueLabel || '值'" @input="setKv(sec, k, $event.detail.value)" />
					<text class="rm" @click="delEntry(sec, k)">删</text>
				</view>
				<view v-if="!keysOf(sec).length" class="empty">还没有内容</view>
			</view>
		</block>
	</view>
</template>

<script>
/**
 * 可视化配置表单：按 config-meta.js 的描述表渲染 5 种段
 * 直接就地修改传入的 model（beemore-admin 里那份深拷贝），新增/删除/改名都用 $set/$delete 保证响应式
 */
import ConfigField from './ConfigField.vue'
import ConfigItems from './ConfigItems.vue'

export default {
	name: 'ConfigForm',
	components: { ConfigField, ConfigItems },
	props: {
		sections: { type: Array, default: () => [] },
		model: { type: Object, required: true }
	},
	data() {
		return { keyBuf: {}, linesBuf: {} }
	},
	methods: {
		idk(si, k) { return si + ':' + k },
		/** 段容器：有 path 则取（并保证存在），否则就是 model 本身 */
		containerOf(sec) {
			if (!sec.path) return this.model
			if (this.model[sec.path] === null || this.model[sec.path] === undefined || typeof this.model[sec.path] !== 'object') this.$set(this.model, sec.path, {})
			return this.model[sec.path]
		},
		keysOf(sec) { return Object.keys(this.containerOf(sec)) },
		entryOf(sec, k) {
			const c = this.containerOf(sec)
			if (c[k] === null || typeof c[k] !== 'object') this.$set(c, k, {})
			return c[k]
		},
		/* ---- key 改名 ---- */
		keyDisplay(id, k) { return this.keyBuf[id] === undefined ? k : this.keyBuf[id] },
		onKeyInput(id, e) { this.$set(this.keyBuf, id, e.detail.value) },
		commitKey(sec, k, id) {
			const raw = this.keyBuf[id]
			if (raw === undefined) return
			this.$delete(this.keyBuf, id)
			const nk = String(raw).trim()
			if (!nk || nk === k) return
			const c = this.containerOf(sec)
			if (Object.prototype.hasOwnProperty.call(c, nk)) { uni.showToast({ title: '已有同名条目', icon: 'none' }); return }
			this.$set(c, nk, c[k])
			this.$delete(c, k)
		},
		addEntry(sec) {
			const c = this.containerOf(sec)
			let i = 1
			let key = sec.newKeyPrefix ? `${sec.newKeyPrefix}${i}` : 'new' + i
			while (Object.prototype.hasOwnProperty.call(c, key)) { i++; key = (sec.newKeyPrefix || 'new') + i }
			const tpl = sec.newItem || {}
			this.$set(c, key, JSON.parse(JSON.stringify(tpl)))
		},
		delEntry(sec, k) {
			uni.showModal({
				title: '确认删除',
				content: `删除「${k}」后运行时会用内置默认值，确定？`,
				success: (r) => { if (r.confirm) this.$delete(this.containerOf(sec), k) }
			})
		},
		/* ---- 文案数组 ---- */
		linesDisplay(id, arr) {
			if (this.linesBuf[id] !== undefined) return this.linesBuf[id]
			return Array.isArray(arr) ? arr.join('\n') : ''
		},
		onLinesInput(id, e) { this.$set(this.linesBuf, id, e.detail.value) },
		commitLines(sec, k, id) {
			const v = this.linesBuf[id]
			if (v === undefined) return
			this.$delete(this.linesBuf, id)
			this.$set(this.containerOf(sec), k, String(v).split('\n').map(s => s.trim()).filter(s => s))
		},
		/* ---- 键值对 ---- */
		kvText(sec, k) {
			const v = this.containerOf(sec)[k]
			return v === null || v === undefined ? '' : String(v)
		},
		setKv(sec, k, val) { this.$set(this.containerOf(sec), k, val) },
		addKv(sec) {
			const c = this.containerOf(sec)
			let i = 1
			while (Object.prototype.hasOwnProperty.call(c, 'new' + i)) i++
			this.$set(c, 'new' + i, '')
		}
	}
}
</script>

<style scoped>
.cf { display: block; }
.grp { margin-bottom: 6px; }
.grp-title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold; color: #6a5acd; margin: 14px 0 6px; }
.add { font-size: 12px; font-weight: normal; color: #fff; background: #7f9cf5; border-radius: 8px; padding: 3px 10px; }
.hint { font-size: 11px; color: #a89fc0; line-height: 1.6; margin-bottom: 8px; }
.card { background: #f7f5ff; border: 1rpx solid #ece7f7; border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
.card-head { display: flex; align-items: center; gap: 8px; padding-bottom: 4px; border-bottom: 1rpx solid #e8e3f7; }
.klab { font-size: 12px; color: #8a7fb0; flex-shrink: 0; }
.kbox { width: 190rpx; border: 1rpx solid #e2ddf0; border-radius: 8px; padding: 5px 8px; background: #fff; font-size: 13px; color: #444; }
.vbox { flex: 1; border: 1rpx solid #e2ddf0; border-radius: 8px; padding: 6px 8px; background: #fff; font-size: 13px; }
.kv-label { font-size: 13px; color: #6a5acd; }
.rm { font-size: 12px; color: #e0566b; }
.kv-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.area { width: 100%; box-sizing: border-box; min-height: 110rpx; border: 1rpx solid #e2ddf0; border-radius: 10px; padding: 8px; background: #fff; font-size: 13px; margin-top: 6px; line-height: 1.6; }
.empty { font-size: 12px; color: #a89fc0; text-align: center; padding: 8px 0; }
</style>
