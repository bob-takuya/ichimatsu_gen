<script setup lang="ts">
import {useTweeq} from 'tweeq'
import {computed} from 'vue'

import PatternThumb from '@/components/PatternThumb.vue'
import {useAppStateStore} from '@/store/appState'
import {usePatternStore} from '@/store/pattern'
import {useRenderingStore} from '@/store/rendering'

const Tq = useTweeq()
const appState = useAppStateStore()
const pattern = usePatternStore()
const rendering = useRenderingStore()

// スライダーラベル
const sliderLabels = [
	'Zone 1a', 'Zone 1b', 'Zone 2a', 'Zone 2b', 
	'Zone 3a', 'Zone 3b', 'Zone 4a', 'Zone 4b',
	'Zone 5a', 'Zone 5b', 'Zone 6a', 'Zone 6b'
]

// ゾーンストレートラインの計算
const zoneLines = computed(() => {
	const angles = [15, 15, 45, 45, 75, 75, 105, 105, 135, 135, 165, 165]
	const offsets = pattern.currentOffsets
	const lines = []
	
	const range = 10 // 表示範囲
	
	for (let i = 0; i < 12; i++) {
		const angleDeg = angles[i]
		const angleRad = (angleDeg * Math.PI) / 180
		const offset = offsets[i]
		
		// 直線の法線ベクトル
		const nx = -Math.sin(angleRad)
		const ny = Math.cos(angleRad)
		
		// 直線上の任意の点を求める
		const px = nx * offset
		const py = ny * offset
		
		// 直線の方向ベクトル（法線に垂直）
		const dx = ny
		const dy = -nx
		
		// 表示範囲での直線の両端点を計算
		const t1 = -range
		const t2 = range
		
		const x1 = px + dx * t1
		const y1 = py + dy * t1
		const x2 = px + dx * t2
		const y2 = py + dy * t2
		
		// ペアごとに色を設定
		const pairIndex = Math.floor(i / 2)
		const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
		const color = colors[pairIndex % colors.length]
		
		lines.push({
			x1, y1, x2, y2,
			color,
			dashed: i % 2 === 1, // ペアの2番目は破線
			index: i,
			angle: angleDeg,
			offset
		})
	}
	
	return lines
})

// 交点の計算
const intersectionPoints = computed(() => {
	const angles = [15, 15, 45, 45, 75, 75, 105, 105, 135, 135, 165, 165]
	const offsets = pattern.currentOffsets
	const points = []
	
	for (let i = 0; i < 12; i++) {
		for (let j = i + 1; j < 12; j++) {
			if (angles[i] === angles[j]) continue
			
			const theta1 = (angles[i] * Math.PI) / 180
			const theta2 = (angles[j] * Math.PI) / 180
			
			const a1 = -Math.sin(theta1)
			const b1 = Math.cos(theta1)
			const c1 = offsets[i]
			
			const a2 = -Math.sin(theta2)
			const b2 = Math.cos(theta2)
			const c2 = offsets[j]
			
			// 連立方程式を解く
			const det = a1 * b2 - a2 * b1
			if (Math.abs(det) < 1e-10) continue
			
			const x = (b2 * c1 - b1 * c2) / det
			const y = (a1 * c2 - a2 * c1) / det
			
			// 表示範囲内のみ表示
			if (Math.abs(x) <= 10 && Math.abs(y) <= 10) {
				points.push({ x, y, lines: [i, j] })
			}
		}
	}
	
	return points
})

function onPatternClick(patternData: any) {
	appState.insertPatterns([patternData])
}

function onPatternHover(patternData: any) {
	appState.hoveredPatterns = [patternData]
}

function onPatternLeave() {
	appState.hoveredPatterns = []
}

function resetToSymmetric() {
	pattern.applyPreset('Symmetric')
}

function generateRandom() {
	const randomPattern = pattern.generateRandomPattern()
	pattern.currentOffsets = randomPattern.offsets
}

function generateSymmetric() {
	const symmetricPattern = pattern.generateSymmetricPattern()
	pattern.currentOffsets = symmetricPattern.offsets
}
</script>

<template>
	<div class="PanePattern">
		<!-- 描画モード切り替えボタン -->
		<div class="controls-section">
			<div class="section-header">
				<h3>Rendering Mode</h3>
			</div>
			<div class="render-toggles">
				<Tq.InputButtonToggle
					v-model="rendering.showEdges"
					icon="mdi:vector-polyline"
					label="Edges"
					title="Show rhombus edges"
				/>
				<Tq.InputButtonToggle
					v-model="rendering.showFills"
					icon="mdi:rectangle"
					label="Fills"
					title="Show filled rectangles at rhombus centers"
				/>
			</div>
		</div>

		<!-- スライダーコントロール -->
		<div class="controls-section">
			<div class="section-header">
				<h3>Zone Offsets</h3>
				<div class="preset-buttons">
					<Tq.InputButton
						icon="mdi:refresh"
						@click="resetToSymmetric"
						title="Reset to Symmetric"
					/>
					<Tq.InputButton
						icon="mdi:dice-6"
						@click="generateRandom"
						title="Generate Random"
					/>
					<Tq.InputButton
						icon="mdi:symmetry-horizontal"
						@click="generateSymmetric"
						title="Generate Symmetric"
					/>
				</div>
			</div>
			
			<div class="sliders-grid">
				<div 
					v-for="(offset, index) in pattern.currentOffsets" 
					:key="index"
					class="slider-item"
				>
					<label class="slider-label">{{ sliderLabels[index] }}</label>
					<Tq.InputNumber
						:modelValue="offset"
						:min="pattern.offsetRange[0]"
						:max="pattern.offsetRange[1]"
						:step="0.1"
						:precision="2"
						style="width: 100%"
						@update:modelValue="pattern.updateOffset(index, $event)"
					/>
				</div>
			</div>
		</div>

		<!-- 現在のパターンプレビュー -->
		<div class="current-pattern-section">
			<div class="section-header">
				<h3>Zone Lines Visualization</h3>
			</div>
			<div class="zone-lines-container">
				<svg 
					class="zone-lines-svg" 
					viewBox="-10 -10 20 20" 
					width="240" 
					height="240"
					xmlns="http://www.w3.org/2000/svg"
				>
					<!-- Grid -->
					<defs>
						<pattern id="grid" width="2" height="2" patternUnits="userSpaceOnUse">
							<path d="M 2 0 L 0 0 0 2" fill="none" stroke="rgba(150, 150, 150, 0.3)" stroke-width="0.1"/>
						</pattern>
					</defs>
					<rect x="-10" y="-10" width="20" height="20" fill="url(#grid)" />
					
					<!-- Zone Lines -->
					<g class="zone-lines">
						<line 
							v-for="(line, index) in zoneLines" 
							:key="index"
							:x1="line.x1" 
							:y1="line.y1" 
							:x2="line.x2" 
							:y2="line.y2"
							:stroke="line.color"
							stroke-width="0.05"
							:stroke-dasharray="line.dashed ? '0.3 0.2' : 'none'"
						/>
					</g>
					
					<!-- Intersection Points -->
					<g class="intersection-points">
						<circle 
							v-for="(point, index) in intersectionPoints" 
							:key="index"
							:cx="point.x" 
							:cy="point.y" 
							r="0.1"
							fill="red"
							opacity="0.8"
						/>
					</g>
				</svg>
			</div>
		</div>

		<!-- バリエーション表示 -->
		<div class="variations-section">
			<div class="section-header">
				<h3>Variations</h3>
				<Tq.InputButton
					icon="mdi:refresh"
					@click="pattern.generateVariations()"
					title="Regenerate Variations"
				/>
			</div>
			<div class="variations-grid">
				<PatternThumb
					v-for="variation in pattern.variations"
					:key="variation.id"
					:pattern="variation"
					:size="80"
					class="variation-thumb"
					@click="onPatternClick(variation)"
					@mouseenter="onPatternHover(variation)"
					@mouseleave="onPatternLeave"
				>
					<template #overlay>
						<div class="similarity-badge" v-if="variation.similarity">
							{{ Math.round(variation.similarity * 100) }}%
						</div>
					</template>
				</PatternThumb>
			</div>
		</div>

		<!-- プリセット -->
		<div class="presets-section">
			<div class="section-header">
				<h3>Presets</h3>
			</div>
			<div class="presets-list">
				<Tq.InputButton
					v-for="preset in pattern.presets"
					:key="preset.name"
					:label="preset.name"
					@click="pattern.applyPreset(preset.name)"
					class="preset-button"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.PanePattern
	display flex
	flex-direction column
	padding var(--tq-pane-padding)
	height 100%
	gap 1em
	overflow-y auto

.section-header
	display flex
	justify-content space-between
	align-items center
	margin-bottom 0.5em
	
	h3
		margin 0
		font-size 0.9em
		font-weight 600
		color var(--tq-color-text)

.preset-buttons
	display flex
	gap 0.25em

.controls-section
	.sliders-grid
		display grid
		grid-template-columns repeat(2, 1fr)
		gap 0.5em
		
	.slider-item
		display flex
		flex-direction column
		gap 0.25em
		
	.slider-label
		font-size 0.75em
		color var(--tq-color-text-mute)
		font-family var(--tq-font-code)

.render-toggles
	display flex
	gap 0.5em

.current-pattern-section
	.current-pattern-thumb
		margin 0 auto
		display block

.zone-lines-container
	display flex
	justify-content center
	align-items center
	padding 1em
	background var(--tq-color-input)
	border-radius var(--tq-radius-input)
	
.zone-lines-svg
	border 1px solid var(--tq-color-border)
	border-radius var(--tq-radius-input)
	background white

.variations-section
	.variations-grid
		display grid
		grid-template-columns repeat(auto-fill, minmax(80px, 1fr))
		gap 0.5em
		
	.variation-thumb
		position relative
		cursor pointer
		
		&:hover
			outline 2px solid var(--tq-color-accent-soft)
			
.similarity-badge
	position absolute
	top 2px
	right 2px
	background var(--tq-color-accent)
	color white
	font-size 0.7em
	padding 0.1em 0.3em
	border-radius 0.2em
	font-weight 600

.presets-section
	.presets-list
		display flex
		flex-wrap wrap
		gap 0.25em
		
	.preset-button
		flex 0 0 auto
		font-size 0.8em
</style>
