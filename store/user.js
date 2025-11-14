import {
	defineStore
} from 'pinia'
import {
	storeUser,
	getUser
} from './userUtil.js'
import {
	api
} from '../utils/api.js'

export const useUserStore = defineStore('user', {
	state: () => ({
		token: '',
		userInfo: {}
	}),
	getters: {
		patientId: (state) => state.userInfo?.patientId || null,
		isLoggedIn: (state) => !!state.token && !!(state.userInfo?.patientId)
	},
	actions: {
		hydrate() {
			try {
				const token = uni.getStorageSync('token');
				if (token) this.token = token;
				const info = getUser();
				if (info) this.userInfo = info;
				const acc = uni.getStorageSync('account');
				if (acc && (!this.userInfo || !this.userInfo.account)) {
					this.userInfo = { ...(this.userInfo || {}), account: acc };
				}
			} catch (_) {}
		},
		setToken(token) {
			this.token = token || ''
			if (token) uni.setStorageSync('token', token)
			else uni.removeStorageSync('token')
		},
		setUser(info) {
			if (info) {
				// 持久化 account 便于后续通过接口换取 patientId
				const acc = info.account || this.userInfo?.account || uni.getStorageSync('account');
				if (acc) uni.setStorageSync('account', acc);
				storeUser(info)
				const normalized = getUser()
				this.userInfo = acc ? { ...(normalized || {}), account: acc } : (normalized || {})
			} else {
				this.userInfo = {}
				uni.removeStorageSync('user')
				uni.removeStorageSync('userInfo')
				uni.removeStorageSync('account')
			}
		},
		async ensurePatientId() {
			// 已有 patientId 直接返回
			if (this.userInfo?.patientId) return this.userInfo.patientId;
			const account = this.userInfo?.account || uni.getStorageSync('account');
			if (account) {
				try {
					const res = await api.get('/user/patient-id', {
						account
					});
					// API.md: { code:200, msg: 'success', data: 'PAT0001' }
					if ((res.statusCode === 200 || res.statusCode === 201) && res.data) {
						const code = res.data.code ?? res.data.status ?? 200;
						const pid = res.data.data;
						if ((code === 200 || code === '200') && pid) {
							this.setUser({ ...(this.userInfo || {}), account, patientId: pid });
							return pid;
						}
					}
				} catch (_) { /* ignore and fallback */ }
			}
			// 兼容其他“当前患者”接口
			const candidates = ['/api/patients/me', '/api/patient/me', '/api/patients/current'];
			for (const url of candidates) {
				try {
					const res = await api.get(url);
					if (res.statusCode === 200 && res.data) {
						const p = res.data.data || res.data;
						const pid = p?.patientId || p?.id || p?.patient?.id;
						if (pid) {
							this.setUser({ ...(this.userInfo || {}), patientId: pid });
							return pid;
						}
					}
				} catch (_) {}
			}
			return null;
		},
		logout() {
			this.token = ''
			this.userInfo = {}
			uni.removeStorageSync('token')
			uni.removeStorageSync('user')
			uni.removeStorageSync('userInfo')
			uni.removeStorageSync('account')
		}
	}
})