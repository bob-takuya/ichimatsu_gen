import {vec2} from 'linearly'
import {defineStore} from 'pinia'
import {reactive, toRefs, watchEffect, computed} from 'vue'

import {TilingPattern, createTilingPattern} from '@/TilingGenerator'

/**
 * アイテムビュー上の何らかのアイテム
 */
interface BaseItem {
	color: string
	id: string
	position: vec2
}

export interface ItemComment extends BaseItem {
	type: 'comment'
	content: string
}

/**
 * アイテムビュー上のタイリングパターンの連なり
 */
export interface ItemTilingSequence extends BaseItem {
	type: 'tilingSequence'
	patterns: TilingPattern[]
}

export type Item = ItemComment | ItemTilingSequence

type SemVer = `${number}.${number}.${number}`

export interface IchimatsuProject {
	version: SemVer
	frameRate: number
	items: Item[]
}

// デフォルトのタイリングパターン
const defaultPatterns: TilingPattern[] = [
	createTilingPattern([-2.0, 2.0, -2.8, 2.8, -3.0, 3.0, -2.8, 2.8, -2.0, 2.0, -1.0, 1.0], {
		id: 'pattern_1',
		name: 'Symmetric Pattern',
		duration: 2,
	}),
	createTilingPattern([-1.5, 1.8, -2.2, 2.5, -2.7, 3.2, -2.4, 2.1, -1.7, 1.9, -0.8, 0.9], {
		id: 'pattern_2',
		name: 'Variation 1',
		duration: 1,
	}),
	createTilingPattern([-3.2, 2.8, -2.1, 3.5, -2.9, 2.6, -3.1, 2.3, -2.4, 2.7, -1.2, 1.4], {
		id: 'pattern_3',
		name: 'Variation 2',
		duration: 1,
	}),
]

const defaultItems: Item[] = [
	{
		type: 'tilingSequence',
		id: 'seq_1',
		color: '#6565f7',
		position: [100, 300],
		patterns: defaultPatterns,
	},
]

export const useProjectStore = defineStore('project', () => {
	const project = reactive<IchimatsuProject>({
		version: '0.0.1',
		frameRate: 15,
		items: defaultItems,
	})

	// ローカルストレージから復元
	const savedProject = localStorage.getItem('com.baku89.ichimatsu.project')
	if (savedProject) {
		try {
			Object.assign(project, JSON.parse(savedProject))
		} catch (e) {
			console.warn('Failed to parse saved project:', e)
		}
	}

	// 自動保存
	watchEffect(() => {
		localStorage.setItem('com.baku89.ichimatsu.project', JSON.stringify(project))
	})

	return {
		...toRefs(project),
		
		// 計算プロパティ
		tilingSequences: computed(() => 
			project.items.filter((item): item is ItemTilingSequence => 
				item.type === 'tilingSequence'
			)
		),
		
		// アクション
		createTilingSequence(): ItemTilingSequence {
			const sequence: ItemTilingSequence = {
				type: 'tilingSequence',
				id: `seq_${Date.now()}`,
				color: '#6565f7',
				position: [100, 100],
				patterns: [],
			}
			project.items.push(sequence)
			return sequence
		},
		
		deleteTilingSequence(id: string) {
			const index = project.items.findIndex(item => item.id === id)
			if (index !== -1) {
				project.items.splice(index, 1)
			}
		},
		
		addPatternToSequence(sequenceId: string, pattern: TilingPattern, autoSelect = true) {
			const sequence = project.items.find(
				(item): item is ItemTilingSequence => 
					item.type === 'tilingSequence' && item.id === sequenceId
			)
			if (sequence) {
				sequence.patterns.push(pattern)
				
				// Auto-select the newly added frame
				if (autoSelect) {
					const newFrameIndex = sequence.patterns.length - 1
					return { sequenceId, frameIndex: newFrameIndex }
				}
			}
			return null
		},
		
		insertPatternToSequence(sequenceId: string, index: number, pattern: TilingPattern, autoSelect = true) {
			const sequence = project.items.find(
				(item): item is ItemTilingSequence => 
					item.type === 'tilingSequence' && item.id === sequenceId
			)
			if (sequence) {
				sequence.patterns.splice(index, 0, pattern)
				
				// Auto-select the newly inserted frame
				if (autoSelect) {
					return { sequenceId, frameIndex: index }
				}
			}
			return null
		},
		
		removePatternFromSequence(sequenceId: string, patternIndex: number) {
			const sequence = project.items.find(
				(item): item is ItemTilingSequence => 
					item.type === 'tilingSequence' && item.id === sequenceId
			)
			if (sequence && patternIndex >= 0 && patternIndex < sequence.patterns.length) {
				sequence.patterns.splice(patternIndex, 1)
			}
		},
	}
})
