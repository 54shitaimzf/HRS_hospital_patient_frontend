import App from './App'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import Vue from 'vue'
import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'


Vue.component('uni-icons', uniIcons)
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif




// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import uniIcons from '@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue'
export function createApp() {
	const app = createSSRApp(App)
	app.component('uni-icons', uniIcons)
	return {
		app
	}
}
// #endif