<script setup lang="ts">
import {vec2} from 'linearly'
import * as Tq from 'tweeq'
import {computed, shallowRef, ref, onMounted, onUnmounted} from 'vue'

import {useAppStateStore} from '@/store/appState'
import {usePatternStore} from '@/store/pattern'
import {useRenderingStore} from '@/store/rendering'
import {generateRhombusTiling, tilingToRenderPaths} from '@/TilingGenerator'

const appState = useAppStateStore()
const pattern = usePatternStore()
const rendering = useRenderingStore()

const paneSize = shallowRef<vec2>([0, 0])
const viewportContainer = ref<HTMLElement>()

// Viewport size detection using ResizeObserver
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
	if (!viewportContainer.value) return
	
	// Initial size
	const rect = viewportContainer.value.getBoundingClientRect()
	paneSize.value = [rect.width, rect.height]
	
	// Set up ResizeObserver for dynamic size updates
	resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect
			paneSize.value = [width, height]
		}
	})
	
	resizeObserver.observe(viewportContainer.value)
})

onUnmounted(() => {
	if (resizeObserver) {
		resizeObserver.disconnect()
		resizeObserver = null
	}
})

// Viewport dimensions
const viewportWidth = computed(() => paneSize.value[0] || 800)
const viewportHeight = computed(() => paneSize.value[1] || 600)

// 現在のパターンのパスデータ生成
const currentPatternPaths = computed(() => {
	try {
		const tiling = generateRhombusTiling(pattern.currentOffsets)
		// 中央配置用に標準サイズで生成
		return tilingToRenderPaths(tiling, 400, 400, {
			showEdges: rendering.showEdges,
			showFills: rendering.showFills
		})
	} catch (error) {
		console.warn('Failed to generate current pattern paths:', error)
		return { edgePaths: [], fillPaths: [] }
	}
})

// ホバーされたパターンのパスデータ生成
const hoveredPatternsPaths = computed(() => {
	if (appState.hoveredPatterns.length === 0) return []
	
	return appState.hoveredPatterns.map((pattern, index) => {
		try {
			const tiling = generateRhombusTiling(pattern.offsets)
			const paths = tilingToRenderPaths(tiling, 400, 400, {
				showEdges: rendering.showEdges,
				showFills: rendering.showFills
			})
			return {
				...paths,
				opacity: 0.4 - (index * 0.1) // 複数の候補がある場合は透明度を調整
			}
		} catch (error) {
			console.warn('Failed to generate hovered pattern paths:', error)
			return { edgePaths: [], fillPaths: [], opacity: 0 }
		}
	}).filter(item => item.edgePaths.length > 0 || item.fillPaths.length > 0)
})

// スケール計算
const patternScale = computed(() => {
	const minSize = Math.min(paneSize.value[0], paneSize.value[1])
	return Math.max(0.5, minSize * 0.0015) // 最小スケールを設定し、適切なサイズに調整
})

// デバッグ表示の切り替え
const toggleDebug = () => {
	appState.debugMode = !appState.debugMode
}
</script>

<template>
	<div class="PaneViewport">
		<!-- Fixed viewport container without ZUI interactions -->
		<div 
			class="viewport-container"
			ref="viewportContainer"
		>
			<!-- Info toggle button -->
			<div class="debug-toggle" @click="toggleDebug">
				<Tq.InputButton 
					:icon="appState.debugMode ? 'mdi:information' : 'mdi:information-outline'"
					:label="appState.debugMode ? 'Info On' : 'Info Off'"
					:title="appState.debugMode ? 'Hide info panel' : 'Show info panel'"
					size="small"
					subtle
				/>
			</div>
			
			<div class="viewport-debug" v-if="appState.debugMode" @click="toggleDebug">
				<div>Selected Sequence: {{ appState.selectedSequenceId }}</div>
				<div>Current Frame: {{ appState.currentFrame }}</div>
				<div>Pattern Offsets: {{ pattern.currentOffsets.slice(0, 4) }}...</div>
				<div>Hovered Patterns: {{ appState.hoveredPatterns.length }}</div>
				<div class="debug-hint">Click to toggle</div>
			</div>
			
			<svg
				:width="viewportWidth"
				:height="viewportHeight"
				class="viewport-svg"
				xmlns="http://www.w3.org/2000/svg"
			>
				<!-- 12角形の中心をペインの中央に配置（スケール付き） -->
				<g :transform="`translate(${viewportWidth/2}, ${viewportHeight/2}) scale(${patternScale})`">
					<!-- 現在のタイリングパターン -->
					<g class="current-pattern" transform="translate(-200, -200)">
						<!-- 塗りつぶし表示 -->
						<g v-if="rendering.showFills" class="fill-patterns">
							<path
								v-for="(fillPath, index) in currentPatternPaths.fillPaths"
								:key="`fill-${index}`"
								:d="fillPath"
								fill="rgba(100, 100, 255, 0.3)"
								stroke="none"
							/>
						</g>
						
						<!-- エッジ表示 -->
						<g v-if="rendering.showEdges" class="edge-patterns">
							<path
								v-for="(edgePath, index) in currentPatternPaths.edgePaths"
								:key="`edge-${index}`"
								:d="edgePath"
								fill="none"
								stroke="black"
								stroke-width="1"
								vector-effect="non-scaling-stroke"
							/>
						</g>
					</g>

					<!-- ホバーされたパターン（候補） -->
					<g class="hovered-patterns" transform="translate(-200, -200)">
						<g
							v-for="(item, itemIndex) in hoveredPatternsPaths"
							:key="itemIndex"
							:opacity="item.opacity"
						>
							<!-- 塗りつぶし表示 -->
							<g v-if="rendering.showFills && item.fillPaths.length > 0" class="fill-patterns">
								<path
									v-for="(fillPath, index) in item.fillPaths"
									:key="`hover-fill-${itemIndex}-${index}`"
									:d="fillPath"
									fill="rgba(255, 100, 100, 0.2)"
									stroke="none"
								/>
							</g>
							
							<!-- エッジ表示 -->
							<g v-if="rendering.showEdges && item.edgePaths.length > 0" class="edge-patterns">
								<path
									v-for="(edgePath, index) in item.edgePaths"
									:key="`hover-edge-${itemIndex}-${index}`"
									:d="edgePath"
									fill="none"
									stroke="blue"
									stroke-width="1"
									vector-effect="non-scaling-stroke"
								/>
							</g>
						</g>
					</g>
				</g>
			</svg>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.PaneViewport
	height 100%
	background #f5f5f5
	position relative

.viewport-container
	width 100%
	height 100%
	position relative
	overflow hidden

.debug-toggle
	position absolute
	top 10px
	right 10px
	z-index 20

.viewport-svg
	width 100%
	height 100%

.current-pattern
	path
		vector-effect non-scaling-stroke

.hovered-patterns
	path
		vector-effect non-scaling-stroke

.viewport-debug
	position absolute
	top 0
	left 0
	padding 10px
	background rgba(255, 255, 255, 0.9)
	border-bottom-right-radius 5px
	border-top-right-radius 5px
	box-shadow 0 2px 8px rgba(0, 0, 0, 0.2)
	font-size 12px
	color #333
	z-index 10
	font-family monospace
	cursor pointer
	transition all 0.2s ease
	
	&:hover
		background rgba(255, 255, 255, 0.95)
		
	.debug-hint
		font-size 10px
		color #666
		margin-top 4px
</style>
