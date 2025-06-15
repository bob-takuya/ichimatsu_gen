import {whenever} from '@vueuse/core'
import {parseAEKeyframe, printAEKeyframe} from 'ae-keyframes'
import {scalar, vec2} from 'linearly'
import {uniqueId} from 'lodash'
import {defineStore} from 'pinia'
import {useTweeq} from 'tweeq'
import {computed, ref} from 'vue'

import {TilingPattern, createTilingPattern} from '@/TilingGenerator'

import {Item, useProjectStore} from './project'
import {usePatternStore, setAnimationPlaying} from './pattern'

// Global type definition
declare global {
	interface Window {
		__appState?: {
			isPlaying: any
		}
	}
}

type Selection =
	| {
			type: 'item'
			index: number
	  }
	| {
			type: 'sequencePattern'
			index: number
			patternIndex: number
			gap: boolean
	  }

export const useAppStateStore = defineStore('appState', () => {
	const Tq = useTweeq()
	const project = useProjectStore()
	const pattern = usePatternStore() // パターンストアを取得

	const selections = ref<Selection[]>([])
	const itemInsertPosition = ref<vec2>(vec2.zero)
	
	// Debug mode
	const debugMode = ref(false) // Disable debug mode by default
	
	// Animation state for external components
	const isPlaying = ref(false)
	const hoveredPatterns = ref<TilingPattern[]>([])

	// Set global reference for pattern store to check animation state
	if (typeof window !== 'undefined') {
		window.__appState = { isPlaying }
	}

	const selectedPatterns = computed<TilingPattern[]>(() => {
		return selections.value.flatMap(sel => {
			if (sel.type === 'item') {
				const item = project.items[sel.index]
				if (item.type === 'tilingSequence') {
					return item.patterns
				}
			} else if (sel.type === 'sequencePattern') {
				const item = project.items[sel.index]
				if (item.type === 'tilingSequence' && !sel.gap) {
					return [item.patterns[sel.patternIndex]]
				}
			}
			return []
		})
	})

	const copiedPatterns = ref<{
		aeKeyframeData: string
		patterns: TilingPattern[]
	} | null>(null)

	// const hoveredPatterns = ref<TilingPattern[]>([])

	// Animation state for better control
	let animationTimeoutId: number | null = null

	// Sequence and frame selection functions
	function selectSequence(sequenceId: string) {
		const sequenceIndex = project.items.findIndex(item => item.id === sequenceId)
		if (sequenceIndex !== -1) {
			selections.value = [
				{
					type: 'item',
					index: sequenceIndex,
					gap: false,
				},
			]
		}
	}

	function setCurrentFrame(frameIndex: number) {
		const selection = selections.value[0]
		if (selection && (selection.type === 'item' || selection.type === 'sequencePattern')) {
			selections.value = [
				{
					type: 'sequencePattern',
					index: selection.index,
					patternIndex: frameIndex,
					gap: false,
				},
			]
		}
	}
	let currentSequenceId: string | null = null
	let currentFrameIndex: number = 0

	// Reactive animation frame
	const currentAnimationFrame = ref(0)

	// 再生制御
	whenever(isPlaying, () => {
		// アニメーション停止時にタイマーをクリア
		if (!isPlaying.value) {
			if (animationTimeoutId !== null) {
				clearTimeout(animationTimeoutId)
				animationTimeoutId = null
			}
			return
		}

		if (selections.value.length === 0) {
			isPlaying.value = false
			return
		}

		const selection = selections.value[0]

		// アイテムまたはシーケンスパターンが選択されている場合のみ再生
		if (selection.type !== 'sequencePattern' && selection.type !== 'item') {
			isPlaying.value = false
			return
		}

		const {index} = selection
		let patternIndex = selection.type === 'sequencePattern' ? selection.patternIndex : 0

		const item = project.items[index]

		if (item.type !== 'tilingSequence') {
			isPlaying.value = false
			return
		}

		const {patterns} = item

		// パターンが1つしかない場合は再生しない
		if (patterns.length <= 1) {
			isPlaying.value = false
			return
		}

		function update() {
			if (!isPlaying.value) {
				animationTimeoutId = null
				return
			}

			patternIndex = (patternIndex + 1) % patterns.length

			// 現在のパターンのオフセットを更新
			const currentPatternData = patterns[patternIndex]
			if (currentPatternData && currentPatternData.offsets) {
				// パターンストアのcurrentOffsetsを更新して表示を変更
				pattern.updateCurrentOffsets(currentPatternData.offsets)
			}

			// 選択状態を更新してUIを同期
			selections.value = [
				{
					type: 'sequencePattern',
					index,
					patternIndex,
					gap: false,
				},
			]

			// 次のフレームの更新をスケジュール
			const frameDelay = (1000 / project.frameRate) * patterns[patternIndex].duration
			animationTimeoutId = setTimeout(update, frameDelay) as any
		}

		// 最初のフレームの更新をスケジュール
		const initialDelay = (1000 / project.frameRate) * patterns[patternIndex].duration
		animationTimeoutId = setTimeout(update, initialDelay) as any
	})

	function offsetSelection(offset: number) {
		for (const selection of selections.value) {
			if (selection.type === 'sequencePattern') {
				const item = project.items[selection.index]
				if (item.type === 'tilingSequence') {
					selection.patternIndex = scalar.mod(
						selection.patternIndex + offset,
						item.patterns.length
					)
				}
			}
		}
	}

	function offsetSelectedPatternsDuration(offset: number) {
		for (const selection of selections.value) {
			if (selection.type === 'item') {
				const item = project.items[selection.index]
				if (item?.type === 'tilingSequence') {
					for (const pattern of item.patterns) {
						pattern.duration = Math.max(1, pattern.duration + offset)
					}
				}
			} else if (selection.type === 'sequencePattern') {
				const item = project.items[selection.index]
				if (item.type === 'tilingSequence') {
					const pattern = item.patterns[selection.patternIndex]
					pattern.duration = Math.max(1, pattern.duration + offset)
				}
			}
		}
	}

	function swapSelectedPattern(offset: number) {
		const sel = selections.value[0]
		if (sel?.type !== 'sequencePattern') {
			return
		}

		const {index, patternIndex} = sel
		const item = project.items[index]
		if (item.type === 'tilingSequence') {
			const nextIndex = scalar.mod(patternIndex + offset, item.patterns.length)

			const [a, b] = [item.patterns[patternIndex], item.patterns[nextIndex]]

			item.patterns[patternIndex] = b
			item.patterns[nextIndex] = a
			selections.value = [
				{
					type: 'sequencePattern',
					index,
					patternIndex: nextIndex,
					gap: false,
				},
			]
		}
	}

	function insertPatterns(newPatterns: TilingPattern[]) {
		if (newPatterns.length === 0) return

		// パターンにパスを生成
		const patternsWithPaths = newPatterns.map(p => {
			if (!p.path) {
				return createTilingPattern(p.offsets, {
					id: p.id,
					name: p.name,
					duration: p.duration,
				})
			}
			return p
		})

		// 選択されたアイテムに追加、または新しいアイテムを作成
		if (selections.value.length > 0) {
			const sel = selections.value[0]
			if (sel.type === 'item' || sel.type === 'sequencePattern') {
				const item = project.items[sel.index]
				if (item.type === 'tilingSequence') {
					item.patterns.push(...patternsWithPaths)
					return
				}
			}
		}

		// 新しいアイテムを作成
		const newItem: Item = {
			type: 'tilingSequence',
			id: uniqueId('seq_'),
			color: '#6565f7',
			position: [...itemInsertPosition.value],
			patterns: patternsWithPaths,
		}

		project.items.push(newItem)
	}

	// Animation control function
	function setIsPlaying(playing: boolean) {
		isPlaying.value = playing
		// パターンストアにアニメーション状態を通知
		setAnimationPlaying(playing)
	}

	// Tweeqアクション登録
	Tq.actions.register([
		{
			id: 'edit',
			icon: 'material-symbols:edit',
			children: [
				{
					id: 'copy',
					bind: 'command+c',
					icon: 'ic:baseline-copy-all',
					perform: async () => {
						const keyframes = selectedPatterns.value.map((p, frame) => ({
							frame,
							value: JSON.stringify(p.offsets),
						}))

						const aeKeyframeData = printAEKeyframe({
							frameRate: project.frameRate,
							layers: [
								{
									timeRemap: keyframes as any, // Cast to avoid type issues
								},
							],
						})

						await navigator.clipboard.writeText(aeKeyframeData)

						// ディープクローン
						const patterns = JSON.parse(JSON.stringify(selectedPatterns.value))

						copiedPatterns.value = {
							aeKeyframeData,
							patterns,
						}
					},
				},
				{
					id: 'paste',
					bind: 'command+v',
					icon: 'ic:baseline-paste',
					perform: async () => {
						if (copiedPatterns.value) {
							insertPatterns(copiedPatterns.value.patterns)
						} else {
							try {
								const text = await navigator.clipboard.readText()
								const aeData = parseAEKeyframe(text)
								
								if (aeData.layers?.[0]?.timeRemap) {
									const patterns: TilingPattern[] = aeData.layers[0].timeRemap.map(
										(kf: any, index: number) => {
											try {
												const offsets = JSON.parse(kf.value)
												return createTilingPattern(offsets, {
													id: `pasted_${index}`,
													duration: 1,
												})
											} catch {
												// フォールバック: ランダムパターン
												return createTilingPattern(
													Array.from({length: 12}, () => Math.random() * 6 - 3),
													{
														id: `random_${index}`,
														duration: 1,
													}
												)
											}
										}
									)
									insertPatterns(patterns)
								}
							} catch (e) {
								console.warn('Failed to paste:', e)
							}
						}
					},
				},
				{
					id: 'selectAll',
					bind: 'command+a',
					icon: 'ic:baseline-select-all',
					perform: () => {
						selections.value = project.items.map((_, index) => ({
							type: 'item' as const,
							index,
						}))
					},
				},
				{
					id: 'delete',
					bind: 'delete',
					icon: 'ic:baseline-delete',
					perform: () => {
						// 逆順で削除してインデックスのずれを防ぐ
						const itemIndices = selections.value
							.filter(sel => sel.type === 'item')
							.map(sel => sel.index)
							.sort((a, b) => b - a)

						for (const index of itemIndices) {
							project.items.splice(index, 1)
						}

						// パターン削除
						const patternSelections = selections.value
							.filter(sel => sel.type === 'sequencePattern')
							.sort((a, b) => {
								if (a.index !== b.index) return b.index - a.index
								return (b as any).patternIndex - (a as any).patternIndex
							})

						for (const sel of patternSelections) {
							const item = project.items[sel.index]
							if (item?.type === 'tilingSequence') {
								item.patterns.splice((sel as any).patternIndex, 1)
							}
						}

						selections.value = []
					},
				},
				{
					id: 'duplicate',
					bind: 'command+d',
					icon: 'ic:baseline-copy',
					perform: () => {
						const newItems: Item[] = []
						
						for (const sel of selections.value) {
							if (sel.type === 'item') {
								const item = project.items[sel.index]
								const newItem = JSON.parse(JSON.stringify(item))
								newItem.id = uniqueId('dup_')
								newItem.position = [
									newItem.position[0] + 50,
									newItem.position[1] + 50,
								]
								newItems.push(newItem)
							}
						}

						project.items.push(...newItems)
					},
				},
			],
		},
		{
			id: 'playback',
			icon: 'mdi:play',
			children: [
				{
					id: 'play',
					bind: 'space',
					icon: 'mdi:play',
					perform: () => {
						isPlaying.value = !isPlaying.value
					},
				},
				{
					id: 'next',
					bind: 'right',
					icon: 'mdi:skip-next',
					perform: () => {
						offsetSelection(1)
					},
				},
				{
					id: 'prev',
					bind: 'left',
					icon: 'mdi:skip-previous',
					perform: () => {
						offsetSelection(-1)
					},
				},
			],
		},
		{
			id: 'duration',
			icon: 'mdi:timer',
			children: Array.from({length: 9}, (_, i) => ({
				id: `duration_${i + 1}`,
				bind: `${i + 1}`,
				label: `Duration ${i + 1}`,
				perform: () => {
					for (const selection of selections.value) {
						if (selection.type === 'sequencePattern') {
							const item = project.items[selection.index]
							if (item.type === 'tilingSequence') {
								item.patterns[selection.patternIndex].duration = i + 1
							}
						}
					}
				},
			})),
		},
		{
			id: 'adjust',
			icon: 'mdi:tune',
			children: [
				{
					id: 'increaseDuration',
					bind: 'shift+right',
					icon: 'mdi:plus',
					perform: () => offsetSelectedPatternsDuration(1),
				},
				{
					id: 'decreaseDuration',
					bind: 'shift+left',
					icon: 'mdi:minus',
					perform: () => offsetSelectedPatternsDuration(-1),
				},
				{
					id: 'swapNext',
					bind: 'shift+down',
					icon: 'mdi:arrow-down',
					perform: () => swapSelectedPattern(1),
				},
				{
					id: 'swapPrev',
					bind: 'shift+up',
					icon: 'mdi:arrow-up',
					perform: () => swapSelectedPattern(-1),
				},
			],
		},
		{
			id: 'debug',
			icon: 'mdi:bug',
			children: [
				{
					id: 'toggleDebug',
					bind: 'command+shift+d',
					label: 'Toggle Debug Mode',
					perform: () => {
						debugMode.value = !debugMode.value
					},
				},
			],
		},
	])

	// Auto-selection and variation recalculation helper
	function selectFrameAndTriggerVariations(sequenceId: string, frameIndex: number) {
		// Select the sequence first
		selectSequence(sequenceId)
		
		// Then select the specific frame
		setCurrentFrame(frameIndex)
		
		// Trigger variation recalculation by updating pattern store
		const pattern = usePatternStore()
		const sequenceIndex = project.items.findIndex(item => item.id === sequenceId)
		if (sequenceIndex !== -1) {
			const item = project.items[sequenceIndex]
			if (item.type === 'tilingSequence' && item.patterns[frameIndex]) {
				pattern.updateCurrentOffsets(item.patterns[frameIndex].offsets)
			}
		}
	}

	// Auto-scroll helper (to be used by components)
	const autoScrollCallbacks = ref<((frameIndex: number) => void)[]>([])
	
	function registerAutoScrollCallback(callback: (frameIndex: number) => void) {
		autoScrollCallbacks.value.push(callback)
		
		// Return unregister function
		return () => {
			const index = autoScrollCallbacks.value.indexOf(callback)
			if (index > -1) {
				autoScrollCallbacks.value.splice(index, 1)
			}
		}
	}
	
	function triggerAutoScroll(frameIndex: number) {
		autoScrollCallbacks.value.forEach(callback => callback(frameIndex))
	}

	// Enhanced pattern insertion with auto-selection
	function insertPatternsWithAutoSelect(newPatterns: TilingPattern[]) {
		if (newPatterns.length === 0) return

		// パターンにパスを生成
		const patternsWithPaths = newPatterns.map(p => {
			if (!p.path) {
				return createTilingPattern(p.offsets, {
					id: p.id,
					name: p.name,
					duration: p.duration,
				})
			}
			return p
		})

		// 選択されたアイテムに追加、または新しいアイテムを作成
		if (selections.value.length > 0) {
			const sel = selections.value[0]
			if (sel.type === 'item' || sel.type === 'sequencePattern') {
				const item = project.items[sel.index]
				if (item.type === 'tilingSequence') {
					// Add patterns to existing sequence
					item.patterns.push(...patternsWithPaths)
					
					// Auto-select the last added frame
					const lastFrameIndex = item.patterns.length - 1
					selectFrameAndTriggerVariations(item.id, lastFrameIndex)
					triggerAutoScroll(lastFrameIndex)
					return
				}
			}
		}

		// 新しいアイテムを作成
		const newItem: Item = {
			type: 'tilingSequence',
			id: uniqueId('seq_'),
			color: '#6565f7',
			position: [...itemInsertPosition.value],
			patterns: patternsWithPaths,
		}

		project.items.push(newItem)
		
		// Auto-select the new sequence and its last frame
		if (patternsWithPaths.length > 0) {
			const lastFrameIndex = patternsWithPaths.length - 1
			selectFrameAndTriggerVariations(newItem.id, lastFrameIndex)
			triggerAutoScroll(lastFrameIndex)
		}
	}

	return {
		selections,
		itemInsertPosition,
		selectedPatterns,
		copiedPatterns,
		hoveredPatterns,
		isPlaying,
		insertPatterns,
		insertPatternsWithAutoSelect,
		offsetSelection,
		offsetSelectedPatternsDuration,
		swapSelectedPattern,
		setIsPlaying,
		debugMode,
		selectFrameAndTriggerVariations,
		registerAutoScrollCallback,
		triggerAutoScroll,
		
		// Computed properties for sequence management
		get selectedSequenceId() {
			const sel = selections.value[0]
			if (sel?.type === 'item' || sel?.type === 'sequencePattern') {
				return project.items[sel.index]?.id || null
			}
			return null
		},
		
		get currentFrame() {
			const sel = selections.value[0]
			if (sel?.type === 'sequencePattern') {
				return sel.patternIndex
			}
			return 0
		},
		
		selectSequence(id: string | null) {
			if (id === null) {
				selections.value = []
				return
			}
			
			const index = project.items.findIndex(item => item.id === id)
			if (index !== -1) {
				selections.value = [{
					type: 'item',
					index,
				}]
			}
		},
		
		setCurrentFrame(frameIndex: number) {
			const sel = selections.value[0]
			if (sel?.type === 'sequencePattern') {
				sel.patternIndex = frameIndex
			} else if (sel?.type === 'item') {
				const item = project.items[sel.index]
				if (item?.type === 'tilingSequence' && item.patterns.length > 0) {
					selections.value = [{
						type: 'sequencePattern',
						index: sel.index,
						patternIndex: Math.max(0, Math.min(frameIndex, item.patterns.length - 1)),
						gap: false,
					}]
				}
			}
		},
	}
})
