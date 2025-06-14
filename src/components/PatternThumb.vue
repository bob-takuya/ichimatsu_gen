<template>
  <div class="pattern-thumb" :style="{ width: size + 'px', height: size + 'px' }">
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- 塗りつぶし表示 -->
      <g v-if="rendering.showFills">
        <path
          v-for="(fillPath, index) in patternPaths.fillPaths"
          :key="`fill-${index}`"
          :d="fillPath"
          fill="rgba(100, 100, 255, 0.3)"
          stroke="none"
        />
      </g>
      
      <!-- エッジ表示 -->
      <g v-if="rendering.showEdges">
        <path
          v-for="(edgePath, index) in patternPaths.edgePaths"
          :key="`edge-${index}`"
          :d="edgePath"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />
      </g>
    </svg>
    <slot name="overlay"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateRhombusTiling, tilingToRenderPaths } from '../TilingGenerator'
import { useRenderingStore } from '../store/rendering'
import type { TilingPattern } from '../TilingGenerator'

interface Props {
  pattern: TilingPattern
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 60
})

const rendering = useRenderingStore()

const patternPaths = computed(() => {
  try {
    // Generate a small preview tiling with fewer divisions for thumbnail
    const tiling = generateRhombusTiling(props.pattern.offsets, 4) // Smaller grid for preview
    return tilingToRenderPaths(tiling, 100, 100, {
      showEdges: rendering.showEdges,
      showFills: rendering.showFills
    }) // Scale to thumbnail size
  } catch (error) {
    console.warn('Error generating pattern thumb:', error)
    return { edgePaths: [], fillPaths: [] }
  }
})
</script>

<style scoped>
.pattern-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  color: var(--color-text);
}

svg {
  max-width: 100%;
  max-height: 100%;
}
</style>
