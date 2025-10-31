import {
	defineStore
} from 'pinia'

export const useUserStore = defineStore('user', {
	state: () => ({
		token: '',
		userInfo: {}
	}),
	actions: {
		setToken(token) {
			this.token = token
			uni.setStorageSync('token', token)
		},
		logout() {
			this.token = ''
			uni.removeStorageSync('token')
		}
	}
})