import {defineStore} from 'pinia'
import {computed, ref, watch} from 'vue'

import {TilingPattern, createTilingPattern, generateRhombusTiling, hasAdjacencyChanged, generateDirectionalVariations} from '@/TilingGenerator'

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
		-5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0
	])

	// スライダーの範囲
	const offsetRange = ref<[number, number]>([-10.0, 10.0])

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
			offsets: [-5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0, -5.0, 5.0]
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
			offsets: [-9.5, 9.2, -8.8, 9.1, -9.3, 8.9, -9.0, 9.4, -8.7, 9.3, -8.5, 8.6]
		},
	])

	// ログ機能の状態
	const isLogging = ref(false)
	const loggedFrames = ref<TilingPattern[]>([])
	const lastLoggedTiling = ref<any>(null)

	// バリエーション生成（最適化された方式：方向別変化検知）
	function generateVariations(baseOffsets: number[] = currentOffsets.value) {
		// アニメーション再生中は新しいバリエーションを生成しない
		if (isAnimationPlaying) {
			return
		}
		
		console.log('🎯 Starting optimized variation generation...')
		console.log('Base offsets:', baseOffsets.map(x => x.toFixed(2)).join(', '))
		
		// 最適化された方式：高品質なバリエーション生成
		const startTime = performance.now()
		const directionalVariations = generateDirectionalVariations(baseOffsets, 0.1, 100)
		const endTime = performance.now()
		
		console.log(`⚡ Generation completed in ${(endTime - startTime).toFixed(1)}ms`)
		console.log(`📊 Generated ${directionalVariations.length} high-quality variations`)
		
		// 統計情報の計算
		const stats = {
			totalGenerated: directionalVariations.length,
			withChanges: directionalVariations.filter(v => v.meta.foundChange).length,
			avgChangeAmount: 0,
			minRhombusCount: Infinity,
			maxRhombusCount: -Infinity,
			avgRhombusCount: 0,
			rhombusCountVariation: 0
		}
		
		if (directionalVariations.length > 0) {
			const changes = directionalVariations.map(v => Math.abs(v.meta.changeAmount as number))
			const rhombusCounts = directionalVariations.map(v => v.meta.rhombusCount as number)
			
			stats.avgChangeAmount = changes.reduce((a, b) => a + b, 0) / changes.length
			stats.minRhombusCount = Math.min(...rhombusCounts)
			stats.maxRhombusCount = Math.max(...rhombusCounts)
			stats.avgRhombusCount = rhombusCounts.reduce((a, b) => a + b, 0) / rhombusCounts.length
			stats.rhombusCountVariation = stats.maxRhombusCount - stats.minRhombusCount
		}
		
		console.log('📈 Variation Statistics:')
		console.log(`   - Patterns with changes: ${stats.withChanges}/${stats.totalGenerated}`)
		console.log(`   - Average change amount: ${stats.avgChangeAmount.toFixed(3)}`)
		console.log(`   - Rhombus count range: ${stats.minRhombusCount}-${stats.maxRhombusCount} (avg: ${stats.avgRhombusCount.toFixed(1)})`)
		console.log(`   - Pattern complexity variation: ${stats.rhombusCountVariation}`)
		
		// PatternVariationに変換（変化があるもののみ）
		console.log('🔍 Filtering variations...')
		const allVariations = directionalVariations.map((pattern) => {
			const lineIndex = pattern.meta.lineIndex as number
			const direction = pattern.meta.direction as number
			const changeAmount = pattern.meta.changeAmount as number
			const rhombusCountDiff = pattern.meta.rhombusCountDiff as number
			const foundChange = pattern.meta.foundChange as boolean
			
			console.log(`  - L${lineIndex + 1}${direction > 0 ? '+' : ''}${changeAmount.toFixed(2)}: change=${foundChange}`)
			
			// 類似度を変化量と複雑度の組み合わせで計算
			const similarity = Math.min(1.0, Math.abs(changeAmount) / 2.0 + Math.abs(rhombusCountDiff) / 20.0)
			
			return {
				...pattern,
				similarity,
				name: `L${lineIndex + 1}${direction > 0 ? '+' : ''}${changeAmount.toFixed(2)}`,
			}
		})
		
		const newVariations: PatternVariation[] = allVariations
			.filter(pattern => pattern.meta.foundChange) // 変化があるもののみ
		
		console.log(`📋 Before filtering: ${allVariations.length} variations`)
		console.log(`📋 After filtering: ${newVariations.length} variations with changes`)
		
		// 変化量でソートし、最も興味深いバリエーションを上位に
		newVariations.sort((a, b) => {
			const changeA = Math.abs(a.meta.changeAmount as number)
			const changeB = Math.abs(b.meta.changeAmount as number)
			const complexityA = Math.abs(a.meta.rhombusCountDiff as number)
			const complexityB = Math.abs(b.meta.rhombusCountDiff as number)
			
			// 変化量と複雑度の重み付け合計でソート
			const scoreA = changeA * 0.7 + complexityA * 0.3
			const scoreB = changeB * 0.7 + complexityB * 0.3
			
			return scoreB - scoreA
		})
		
		console.log(`✨ Final variations: ${newVariations.length} high-quality patterns ready`)
		
		variations.value = newVariations
	}
	
	// 現在のパターンをキャプチャして新しいTilingPatternを作成
	function captureCurrentPattern(): TilingPattern {
		return createTilingPattern([...currentOffsets.value], {
			id: `captured_${Date.now()}`,
			name: `Pattern ${Date.now()}`,
			duration: 1,
		})
	}

	// ログ機能の制御
	function startLogging() {
		isLogging.value = true
		loggedFrames.value = []
		lastLoggedTiling.value = null
		// 現在のパターンを最初のフレームとして記録
		const currentTiling = generateRhombusTiling(currentOffsets.value)
		lastLoggedTiling.value = currentTiling
		loggedFrames.value.push(captureCurrentPattern())
	}
	
	function stopLogging() {
		isLogging.value = false
	}
	
	function getLoggedFrames(): TilingPattern[] {
		return [...loggedFrames.value]
	}
	
	function clearLog() {
		loggedFrames.value = []
		lastLoggedTiling.value = null
	}
	
	// オフセット変更時のログ処理
	function checkAndLogPatternChange() {
		if (!isLogging.value) return
		
		const currentTiling = generateRhombusTiling(currentOffsets.value)
		
		if (lastLoggedTiling.value && hasAdjacencyChanged(lastLoggedTiling.value, currentTiling)) {
			// パターンが変化した場合、新しいフレームを記録
			loggedFrames.value.push(captureCurrentPattern())
			lastLoggedTiling.value = currentTiling
		}
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
		checkAndLogPatternChange() // 変更検知とログ処理を追加
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
		captureCurrentPattern,
		
		// ログ機能
		isLogging,
		startLogging,
		stopLogging,
		getLoggedFrames,
		clearLog,
		loggedFrames,
	}
})
