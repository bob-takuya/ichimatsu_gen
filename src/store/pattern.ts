import {defineStore} from 'pinia'
import {computed, ref, watch} from 'vue'

import {TilingPattern, createTilingPattern} from '@/TilingGenerator'

// アニメーション状態を管理するための参照
let isAnimationPlaying = false

// グローバル関数でアニメーション状態を設定
export function setAnimationPlaying(playing: boolean) {
	isAnimationPlaying = playing
}

export interface PatternVariation extends TilingPattern {
	similarity?: number
}

export const usePatternStore = defineStore('pattern', () => {
	// 現在の12個のオフセット値
	const currentOffsets = ref<number[]>([
		-2.0, 2.0, -2.8, 2.8, -3.0, 3.0, -2.8, 2.8, -2.0, 2.0, -1.0, 1.0
	])

	// スライダーの範囲
	const offsetRange = ref<[number, number]>([-5.0, 5.0])

	// 現在のパターン
	const currentPattern = computed<TilingPattern>(() => {
		return createTilingPattern(currentOffsets.value, {
			id: 'current',
			name: 'Current Pattern',
			duration: 1,
		})
	})

	// パターンバリエーション（類似パターンの候補）
	const variations = ref<PatternVariation[]>([])

	// パターン生成のプリセット
	const presets = ref<Array<{name: string; offsets: number[]}>>([
		{
			name: 'Symmetric',
			offsets: [-2.0, 2.0, -2.8, 2.8, -3.0, 3.0, -2.8, 2.8, -2.0, 2.0, -1.0, 1.0]
		},
		{
			name: 'Random Seed 1',
			offsets: [-1.5, 1.8, -2.2, 2.5, -2.7, 3.2, -2.4, 2.1, -1.7, 1.9, -0.8, 0.9]
		},
		{
			name: 'Random Seed 2',
			offsets: [-3.2, 2.8, -2.1, 3.5, -2.9, 2.6, -3.1, 2.3, -2.4, 2.7, -1.2, 1.4]
		},
		{
			name: 'Minimal',
			offsets: [-0.5, 0.5, -0.8, 0.8, -1.0, 1.0, -0.8, 0.8, -0.5, 0.5, -0.3, 0.3]
		},
		{
			name: 'Extreme',
			offsets: [-4.5, 4.2, -3.8, 4.1, -4.3, 3.9, -4.0, 4.4, -3.7, 4.3, -3.5, 3.6]
		},
	])

	// バリエーション生成
	function generateVariations(baseOffsets: number[] = currentOffsets.value, count: number = 8) {
		// アニメーション再生中は新しいバリエーションを生成しない
		if (isAnimationPlaying) {
			return
		}
		
		const newVariations: PatternVariation[] = []

		// 基本パターンをわずかに変化させたバリエーション
		for (let i = 0; i < count; i++) {
			const variation = baseOffsets.map(offset => {
				const noise = (Math.random() - 0.5) * 1.0 // ±0.5の範囲でノイズ
				return Math.max(-5, Math.min(5, offset + noise))
			})

			const pattern = createTilingPattern(variation, {
				id: `variation_${i}`,
				name: `Variation ${i + 1}`,
				duration: 1,
			})

			// 簡単な類似度計算（ユークリッド距離の逆数）
			const distance = Math.sqrt(
				baseOffsets.reduce((sum, val, idx) => sum + Math.pow(val - variation[idx], 2), 0)
			)
			const similarity = 1 / (1 + distance)

			newVariations.push({
				...pattern,
				similarity,
			})
		}

		// 類似度順にソート
		newVariations.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

		variations.value = newVariations
	}

	// ランダムパターン生成
	function generateRandomPattern(): TilingPattern {
		const randomOffsets = Array.from({length: 12}, () => 
			Math.random() * (offsetRange.value[1] - offsetRange.value[0]) + offsetRange.value[0]
		)
		
		return createTilingPattern(randomOffsets, {
			id: `random_${Date.now()}`,
			name: 'Random Pattern',
			duration: 1,
		})
	}

	// 対称パターン生成
	function generateSymmetricPattern(): TilingPattern {
		const baseValues = Array.from({length: 6}, () => 
			Math.random() * (offsetRange.value[1] - offsetRange.value[0]) + offsetRange.value[0]
		)
		
		// 対称性を保つ
		const symmetricOffsets = [
			baseValues[0], -baseValues[0],
			baseValues[1], -baseValues[1],
			baseValues[2], -baseValues[2],
			-baseValues[1], baseValues[1],
			-baseValues[0], baseValues[0],
			baseValues[3], -baseValues[3],
		]
		
		return createTilingPattern(symmetricOffsets, {
			id: `symmetric_${Date.now()}`,
			name: 'Symmetric Pattern',
			duration: 1,
		})
	}

	// グラデーションパターン生成
	function generateGradientPattern(steps: number = 12): TilingPattern[] {
		const startOffsets = [...currentOffsets.value]
		const endOffsets = generateRandomPattern().offsets
		
		const patterns: TilingPattern[] = []
		
		for (let i = 0; i < steps; i++) {
			const t = i / (steps - 1)
			const interpolatedOffsets = startOffsets.map((start, idx) => 
				start + (endOffsets[idx] - start) * t
			)
			
			patterns.push(createTilingPattern(interpolatedOffsets, {
				id: `gradient_${i}`,
				name: `Gradient Step ${i + 1}`,
				duration: 1,
			}))
		}
		
		return patterns
	}

	// オフセット値の更新
	function updateOffset(index: number, value: number) {
		if (index >= 0 && index < 12) {
			currentOffsets.value[index] = value
		}
	}

	// 外部からオフセットを更新する関数
	function updateCurrentOffsets(newOffsets: number[]) {
		if (newOffsets.length === 12) {
			currentOffsets.value = [...newOffsets]
		}
	}

	// 現在のオフセットを取得
	function getCurrentOffsets() {
		return [...currentOffsets.value]
	}

	// プリセットの適用
	function applyPreset(presetName: string) {
		const preset = presets.value.find(p => p.name === presetName)
		if (preset) {
			currentOffsets.value = [...preset.offsets]
		}
	}

	// 現在のパターンをプリセットとして保存
	function saveAsPreset(name: string) {
		presets.value.push({
			name,
			offsets: [...currentOffsets.value],
		})
	}

	// オフセットが変更されたら自動的にバリエーションを再生成
	watch(currentOffsets, () => {
		generateVariations()
	}, {deep: true})

	// 初期化
	generateVariations()

	return {
		currentOffsets,
		offsetRange,
		currentPattern,
		variations,
		presets,
		generateVariations,
		generateRandomPattern,
		generateSymmetricPattern,
		generateGradientPattern,
		updateOffset,
		updateCurrentOffsets,
		getCurrentOffsets,
		applyPreset,
		saveAsPreset,
		
		// 現在のパターンをキャプチャして新しいTilingPatternを作成
		captureCurrentPattern(): TilingPattern {
			return createTilingPattern([...currentOffsets.value], {
				id: `captured_${Date.now()}`,
				name: `Pattern ${Date.now()}`,
				duration: 1,
			})
		},
	}
})
