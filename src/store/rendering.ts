import {defineStore} from 'pinia'
import {ref, watch} from 'vue'

export const useRenderingStore = defineStore('rendering', () => {
	// 描画モード設定
	const showEdges = ref(true) // ひし形のエッジを表示
	const showFills = ref(false) // ひし形の中点を結んだ長方形の塗りつぶしを表示

	// 両方がOFFにならないようにする監視
	watch([showEdges, showFills], ([edges, fills]) => {
		if (!edges && !fills) {
			// 両方がOFFになった場合、エッジをONにする
			showEdges.value = true
		}
	})

	return {
		showEdges,
		showFills,
	}
})
