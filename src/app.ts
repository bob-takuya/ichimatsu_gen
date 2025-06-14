import 'floating-vue/dist/style.css'

import FloatingVue from 'floating-vue'
import {createPinia} from 'pinia'
import {createApp} from 'vue'

import App from './components/App.vue'
import {useAppStateStore} from './store/appState'
import {useProjectStore} from './store/project'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(FloatingVue)

app.mount('#app')

// 初期化
const projectStore = useProjectStore()
const appStateStore = useAppStateStore()

// 最初のシーケンスを自動選択
if (projectStore.tilingSequences.length > 0) {
	const firstSequence = projectStore.tilingSequences[0]
	appStateStore.selectSequence(firstSequence.id)
	
	// 最初のパターンを選択
	if (firstSequence.patterns.length > 0) {
		appStateStore.setCurrentFrame(0)
	}
}

// Global test functions for browser console
;(window as any).testIchimatsu = {
	project: projectStore,
	appState: appStateStore,
	testPattern: () => {
		const { createTilingPattern } = require('./TilingGenerator')
		const testOffsets = [-2, 2, -2.5, 2.5, -3, 3, -2.5, 2.5, -2, 2, -1.5, 1.5]
		return createTilingPattern(testOffsets, { id: 'test', name: 'Test Pattern' })
	}
}
