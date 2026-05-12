import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
import share from './common/js/share.js'
Vue.mixin(share)

// 引入全局水印混入
import watermarkMixin from './common/js/watermark.js'
Vue.mixin(watermarkMixin) 

App.mpType = 'app'

const app = new Vue({
  ...App,share
})
app.$mount()
// #endif

// #ifdef VUE3
import {createSSRApp} from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	return {
		app
	}
}
// #endif