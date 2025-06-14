import {mat2d, scalar} from 'linearly'
import {defineStore} from 'pinia'
import {useTweeq} from 'tweeq'
import {computed, ref, shallowRef} from 'vue'

import {generateRhombusTiling} from '@/TilingGenerator'

import {useAppStateStore} from './appState'
import {usePatternStore} from './pattern'
import {useProjectStore} from './project'
import {useRenderingStore} from './rendering'

interface Style {
	stroke?: string
	fill?: string
	opacity?: number
	strokeWidth?: number
}

interface Shape {
	path: string
	style: Style
}

export const useViewportStore = defineStore('viewport', () => {
	const Tq = useTweeq()
	const project = useProjectStore()
	const appState = useAppStateStore()

	const transform = shallowRef<mat2d | 'fit'>('fit')

	const onionskinCount = ref<[prevCount: number, nextCount: number]>([0, 2])
	const showOnionskin = ref(false)

	Tq.actions.register([
		{
			id: 'viewport',
			icon: 'material-symbols:preview',
			children: [
				{
					id: 'toggle_onionskin',
					icon: 'fluent-emoji-high-contrast:onion',
					bind: 'o',
					perform() {
						showOnionskin.value = !showOnionskin.value
					},
				},
				{
					id: 'fit_view',
					icon: 'material-symbols:fit-screen',
					bind: 'f',
					perform() {
						transform.value = 'fit'
					},
				},
			],
		},
	])

	const selectedShapes = computed<Shape[]>(() => {
		const shapes: Shape[] = []
		const rendering = useRenderingStore()

		// 選択されたシーケンスからのパターン表示
		for (const selection of appState.selections) {
			if (selection.type === 'sequencePattern') {
				const {patternIndex, gap} = selection

				const item = project.items[selection.index]

				if (item.type === 'tilingSequence' && !gap) {
					const pattern = item.patterns[patternIndex]
					
					// メインパターンの描画
					if (pattern.path) {
						// パスを個別の菱形に分割して描画
						const tiling = generateRhombusTiling(pattern.offsets)
						
						for (const rhombus of tiling.rhombuses) {
							// 菱形のパスを生成
							const vertices = rhombus.vertices
							if (vertices.length > 0) {
								let path = `M ${vertices[0][0]} ${vertices[0][1]}`
								for (let i = 1; i < vertices.length; i++) {
									path += ` L ${vertices[i][0]} ${vertices[i][1]}`
								}
								path += ' Z'
								
								shapes.push({
									style: {
										fill: 'none',
										stroke: 'black',
										strokeWidth: 1.5,
									},
									path,
								})
							}
						}
					}

					// オニオンスキン表示
					if (!appState.isPlaying && showOnionskin.value) {
						// 前フレーム（青）
						for (let i = 0; i < onionskinCount.value[0]; i++) {
							const index = scalar.mod(patternIndex - i - 1, item.patterns.length)
							const opacity = (1 - i / onionskinCount.value[0]) ** 1.2
							const prevPattern = item.patterns[index]

							if (prevPattern.path) {
								const tiling = generateRhombusTiling(prevPattern.offsets)
								
								for (const rhombus of tiling.rhombuses) {
									const vertices = rhombus.vertices
									if (vertices.length > 0) {
										let path = `M ${vertices[0][0]} ${vertices[0][1]}`
										for (let i = 1; i < vertices.length; i++) {
											path += ` L ${vertices[i][0]} ${vertices[i][1]}`
										}
										path += ' Z'
										
										shapes.push({
											style: {
												fill: 'none',
												stroke: `rgba(0, 0, 255, ${opacity})`,
												strokeWidth: 1,
											},
											path,
										})
									}
								}
							}
						}

						// 後フレーム（赤）
						for (let i = 0; i < onionskinCount.value[1]; i++) {
							const index = scalar.mod(patternIndex + i + 1, item.patterns.length)
							const opacity = (1 - i / onionskinCount.value[1]) ** 1.2
							const nextPattern = item.patterns[index]

							if (nextPattern.path) {
								const tiling = generateRhombusTiling(nextPattern.offsets)
								
								for (const rhombus of tiling.rhombuses) {
									const vertices = rhombus.vertices
									if (vertices.length > 0) {
										let path = `M ${vertices[0][0]} ${vertices[0][1]}`
										for (let i = 1; i < vertices.length; i++) {
											path += ` L ${vertices[i][0]} ${vertices[i][1]}`
										}
										path += ' Z'
										
										shapes.push({
											style: {
												fill: 'none',
												stroke: `rgba(255, 0, 0, ${opacity})`,
												strokeWidth: 1,
											},
											path,
										})
									}
								}
							}
						}
					}
				}
			}
		}

		// フォールバック: 選択がない場合は現在のパターンストアのパターンを表示
		if (shapes.length === 0) {
			const pattern = usePatternStore()
			const tiling = generateRhombusTiling(pattern.currentOffsets)
			
			for (const rhombus of tiling.rhombuses) {
				const vertices = rhombus.vertices
				if (vertices.length > 0) {
					let path = `M ${vertices[0][0]} ${vertices[0][1]}`
					for (let i = 1; i < vertices.length; i++) {
						path += ` L ${vertices[i][0]} ${vertices[i][1]}`
					}
					path += ' Z'
					
					shapes.push({
						style: {
							fill: 'none',
							stroke: 'black',
							strokeWidth: 1.5,
						},
						path,
					})
				}
			}
		}

		// ホバーパターンの描画
		shapes.push(
			...appState.hoveredPatterns.map(pattern => {
				const tiling = generateRhombusTiling(pattern.offsets)
				const allPaths: string[] = []
				
				for (const rhombus of tiling.rhombuses) {
					const vertices = rhombus.vertices
					if (vertices.length > 0) {
						let path = `M ${vertices[0][0]} ${vertices[0][1]}`
						for (let i = 1; i < vertices.length; i++) {
							path += ` L ${vertices[i][0]} ${vertices[i][1]}`
						}
						path += ' Z'
						allPaths.push(path)
					}
				}
				
				return {
					style: {
						fill: 'rgba(255, 0, 0, 0.3)',
						stroke: 'rgba(255, 0, 0, 0.7)',
						strokeWidth: 1,
					},
					path: allPaths.join(' '),
				}
			})
		)

		return shapes
	})

	// ゾーンストレートライン用の計算
	const zoneLines = computed(() => {
		const lines: Array<{a: number; b: number; c: number; angle_deg: number}> = []
		
		// 現在選択されているパターンのオフセットを使用
		let offsets: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // デフォルト
		
		if (appState.selections.length > 0) {
			const selection = appState.selections[0]
			if (selection.type === 'sequencePattern') {
				const item = project.items[selection.index]
				if (item.type === 'tilingSequence') {
					const pattern = item.patterns[selection.patternIndex]
					offsets = pattern.offsets
				}
			}
		}

		const anglesDeg = [15, 15, 45, 45, 75, 75, 105, 105, 135, 135, 165, 165]
		
		for (let i = 0; i < 12; i++) {
			const theta = (anglesDeg[i] * Math.PI) / 180
			lines.push({
				a: -Math.sin(theta),
				b: Math.cos(theta),
				c: offsets[i],
				angle_deg: anglesDeg[i],
			})
		}

		return lines
	})

	const shapes = computed(() => {
		return [...selectedShapes.value]
	})

	return {
		transform,
		onionskinCount,
		showOnionskin,
		shapes,
		zoneLines,
		selectedShapes,
	}
})
