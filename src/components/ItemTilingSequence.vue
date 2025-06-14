<template>
  <div 
    class="item-tiling-sequence"
    :class="{ selected }"
    @click="$emit('select', sequence.id)"
  >
    <div class="sequence-header">
      <div class="sequence-info">
        <div class="sequence-name">{{ sequence.name }}</div>
        <div class="sequence-details">
          {{ sequence.patterns.length }} patterns
        </div>
      </div>
      
      <div class="sequence-actions">
        <Tq.InputButton 
          @click.stop="toggleExpanded" 
          subtle
          :icon="expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'"
        />
        <Tq.InputButton 
          @click.stop="$emit('delete', sequence.id)" 
          subtle
          icon="mdi:delete"
        />
      </div>
    </div>
    
    <div v-if="expanded" class="sequence-patterns">
      <div class="animation-controls">
        <Tq.InputButton 
          @click="togglePlay"
          subtle
          :icon="isGloballyPlaying && appState.selectedSequenceId === sequence.id ? 'mdi:pause' : 'mdi:play'"
          :disabled="sequence.patterns.length < 2"
        />
        <Tq.InputButton 
          @click="stopAnimation"
          subtle
          icon="mdi:stop"
          :disabled="!isGloballyPlaying || appState.selectedSequenceId !== sequence.id"
        />
        <span class="frame-info">{{ currentFrame + 1 }} / {{ sequence.patterns.length }}</span>
      </div>
      
      <div class="patterns-timeline">
        <template v-for="(pattern, index) in sequence.patterns" :key="index">
          <!-- フレーム間の挿入スロット -->
          <div
            v-if="index > 0"
            class="frame-gap"
            @click="insertFrameAt(index)"
            @mouseenter="onGapHover(index - 1, index)"
            @mouseleave="onFrameLeave"
          >
            <div class="gap-indicator">
              <Tq.InputButton
                subtle
                icon="mdi:plus"
                size="small"
                class="gap-button"
              />
            </div>
          </div>
          
          <!-- 実際のフレーム -->
          <div
            class="pattern-frame"
            :class="{ 
              active: index === currentFrame,
              playing: isGloballyPlaying && appState.selectedSequenceId === sequence.id && index === currentFrame,
              focused: focusedFrame === index
            }"
            @click="selectFrame(index)"
            @mouseenter="onFrameHover(index)"
            @mouseleave="onFrameLeave"
          >
            <PatternThumb :pattern="pattern" :size="44" />
            <div class="frame-number">{{ index + 1 }}</div>
            <Tq.InputButton
              v-if="sequence.patterns.length > 1"
              @click.stop="removeFrame(index)"
              class="remove-frame"
              subtle
              icon="mdi:close"
              size="small"
            />
          </div>
        </template>
        
        <div class="add-frame-button">
          <Tq.InputButton @click="addPattern" subtle icon="mdi:plus">
            Add Frame
          </Tq.InputButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {useTweeq} from 'tweeq'
import { useAppStateStore } from '../store/appState'
import { usePatternStore } from '../store/pattern'
import { useProjectStore } from '../store/project'
import PatternThumb from './PatternThumb.vue'
import type { ItemTilingSequence } from '../store/project'

const Tq = useTweeq()

interface Props {
  sequence: ItemTilingSequence
  selected: boolean
}

const props = defineProps<Props>()
defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const appState = useAppStateStore()
const pattern = usePatternStore()
const project = useProjectStore()

const expanded = ref(false)
const animationInterval = ref<number | null>(null)
const focusedFrame = ref<number | null>(null)

const currentFrame = computed({
  get: () => appState.currentFrame,
  set: (value) => appState.setCurrentFrame(value)
})

function toggleExpanded() {
  expanded.value = !expanded.value
}

function selectFrame(index: number) {
  currentFrame.value = index
  focusedFrame.value = index
  // 選択されたフレームのパターンを現在のパターンとして設定
  if (props.sequence.patterns[index]) {
    pattern.currentOffsets = [...props.sequence.patterns[index].offsets]
  }
}

// フレームにホバーした時の効果
function onFrameHover(index: number) {
  focusedFrame.value = index
  if (props.sequence.patterns[index]) {
    appState.hoveredPatterns = [props.sequence.patterns[index]]
  }
}

// ギャップにホバーした時の効果
function onGapHover(prevIndex: number, nextIndex: number) {
  focusedFrame.value = null
  // 前後のフレームをホバー表示
  const patterns = []
  if (props.sequence.patterns[prevIndex]) patterns.push(props.sequence.patterns[prevIndex])
  if (props.sequence.patterns[nextIndex]) patterns.push(props.sequence.patterns[nextIndex])
  appState.hoveredPatterns = patterns
}

function onFrameLeave() {
  focusedFrame.value = null
  appState.hoveredPatterns = []
}

// フレーム間に新しいフレームを挿入
function insertFrameAt(index: number) {
  const newPattern = pattern.captureCurrentPattern()
  project.insertPatternToSequence(props.sequence.id, index, newPattern)
  
  // 挿入後、新しいフレームを選択
  currentFrame.value = index
}

function addPattern() {
  const newPattern = pattern.captureCurrentPattern()
  project.addPatternToSequence(props.sequence.id, newPattern)
}

function removeFrame(index: number) {
  if (props.sequence.patterns.length <= 1) return
  project.removePatternFromSequence(props.sequence.id, index)
  
  // 現在のフレームが削除された場合の調整
  if (currentFrame.value >= props.sequence.patterns.length) {
    currentFrame.value = Math.max(0, props.sequence.patterns.length - 1)
  }
}

function togglePlay() {
  // シーケンスを選択状態にしてからアニメーション開始
  appState.selectSequence(props.sequence.id)
  
  // 現在のフレームを設定
  if (props.sequence.patterns.length > 0) {
    appState.setCurrentFrame(currentFrame.value)
  }
  
  // グローバルアニメーション制御を使用
  appState.setIsPlaying(!appState.isPlaying)
}

function startAnimation() {
  // アプリケーション全体のアニメーション制御を使用
  appState.selectSequence(props.sequence.id)
  if (props.sequence.patterns.length > 0) {
    appState.setCurrentFrame(currentFrame.value)
  }
  appState.setIsPlaying(true)
}

function stopAnimation() {
  // アプリケーション全体のアニメーション制御を使用
  appState.setIsPlaying(false)
}

// グローバルアニメーション状態を監視
const isGloballyPlaying = computed(() => appState.isPlaying)

onUnmounted(() => {
  // コンポーネントが破棄される際にアニメーションを停止
  if (appState.selectedSequenceId === props.sequence.id) {
    appState.setIsPlaying(false)
  }
})
</script>

<style scoped>
.item-tiling-sequence {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-bottom: 8px;
  background: var(--color-surface);
  transition: all 0.2s ease;
}

.item-tiling-sequence:hover {
  border-color: var(--color-border-hover);
}

.item-tiling-sequence.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-background);
}

.sequence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  cursor: pointer;
}

.sequence-info {
  flex: 1;
}

.sequence-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.sequence-details {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.sequence-actions {
  display: flex;
  gap: 4px;
}

.sequence-patterns {
  border-top: 1px solid var(--color-border);
  padding: 12px;
}

.animation-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--color-background);
  border-radius: 4px;
}

.frame-info {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-left: auto;
}

.patterns-timeline {
  display: flex;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 4px;
}

.pattern-frame {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.pattern-frame:hover {
  border-color: var(--color-border-hover);
}

.pattern-frame.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.pattern-frame.playing {
  border-color: #ff6b35;
  box-shadow: 0 0 0 2px #ff6b35, 0 0 8px rgba(255, 107, 53, 0.4);
  animation: pulseFrame 1s ease-in-out infinite alternate;
}

@keyframes pulseFrame {
  from {
    box-shadow: 0 0 0 2px #ff6b35, 0 0 8px rgba(255, 107, 53, 0.4);
  }
  to {
    box-shadow: 0 0 0 2px #ff6b35, 0 0 12px rgba(255, 107, 53, 0.6);
  }
}

.frame-number {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 10px;
  padding: 1px 3px;
  border-radius: 2px;
}

.remove-frame {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: rgba(255, 0, 0, 0.8);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pattern-frame:hover .remove-frame {
  opacity: 1;
}

.add-frame-button {
  flex-shrink: 0;
}
</style>
