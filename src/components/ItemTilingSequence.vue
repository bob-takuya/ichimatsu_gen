<template>
  <div
    class="item-tiling-sequence"
    :class="{
      selected,
      focused: appState.selectedSequenceId === sequence.id,
      playing: isThisSequencePlaying
    }"
    @click="selectSequence"
  >
    <div class="sequence-header">
      <div class="sequence-info">
        <div class="sequence-name">Sequence {{ sequence.id }}</div>
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
          @click.stop="emit('delete', sequence.id)"
          subtle
          icon="mdi:delete"
        />
      </div>
    </div>
    
    <div v-if="expanded" class="sequence-patterns">
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
              active: index === currentFrame && appState.selectedSequenceId === sequence.id,
              playing: isThisSequencePlaying && index === currentFrame,
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
import { ref, computed, onUnmounted } from 'vue';
import { useTweeq } from 'tweeq';
import { useAppStateStore } from '../store/appState';
import { usePatternStore } from '../store/pattern';
import { useProjectStore } from '../store/project';
import PatternThumb from './PatternThumb.vue';
import type { ItemTilingSequence } from '../store/project';

const Tq = useTweeq();

interface Props {
  sequence: ItemTilingSequence;
  selected: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [id: string];
  delete: [id: string];
}>();

const appState = useAppStateStore();
const pattern = usePatternStore();
const project = useProjectStore();

const expanded = ref(true);
const focusedFrame = ref<number | null>(null);

const currentFrame = computed({
  get: () => {
    if (appState.selectedSequenceId === props.sequence.id) {
      return appState.currentFrame;
    }
    return 0;
  },
  set: (value) => {
    appState.selectSequence(props.sequence.id);
    appState.setCurrentFrame(value);
  }
});

const isGloballyPlaying = computed(() => appState.isPlaying);
const isThisSequencePlaying = computed(() => 
  isGloballyPlaying.value && appState.selectedSequenceId === props.sequence.id
);

function selectSequence() {
  appState.selectSequence(props.sequence.id);
  emit('select', props.sequence.id);
}

function toggleExpanded() {
  expanded.value = !expanded.value;
}

function selectFrame(index: number) {
  currentFrame.value = index;
  focusedFrame.value = index;
  if (props.sequence.patterns[index]) {
    pattern.currentOffsets = [...props.sequence.patterns[index].offsets];
  }
}

function onFrameHover(index: number) {
  focusedFrame.value = index;
  if (props.sequence.patterns[index]) {
    appState.hoveredPatterns = [props.sequence.patterns[index]];
  }
}

function onGapHover(prevIndex: number, nextIndex: number) {
  focusedFrame.value = null;
  const patterns = [];
  if (props.sequence.patterns[prevIndex]) patterns.push(props.sequence.patterns[prevIndex]);
  if (props.sequence.patterns[nextIndex]) patterns.push(props.sequence.patterns[nextIndex]);
  appState.hoveredPatterns = patterns;
}

function onFrameLeave() {
  focusedFrame.value = null;
  appState.hoveredPatterns = [];
}

function insertFrameAt(index: number) {
  const newPattern = pattern.captureCurrentPattern();
  project.insertPatternToSequence(props.sequence.id, index, newPattern);
  currentFrame.value = index;
}

function addPattern() {
  const newPattern = pattern.captureCurrentPattern();
  project.addPatternToSequence(props.sequence.id, newPattern);
}

function removeFrame(index: number) {
  if (props.sequence.patterns.length <= 1) return;
  project.removePatternFromSequence(props.sequence.id, index);
  if (currentFrame.value >= props.sequence.patterns.length) {
    currentFrame.value = Math.max(0, props.sequence.patterns.length - 1);
  }
}

onUnmounted(() => {
  if (appState.selectedSequenceId === props.sequence.id) {
    appState.setIsPlaying(false);
  }
});
</script>

<style scoped>
.item-tiling-sequence {
  border: 1px solid var(--tq-color-border);
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--tq-color-surface);
  transition: all 0.2s ease;
}

.item-tiling-sequence:hover {
  border-color: var(--tq-color-accent);
}

.item-tiling-sequence.selected {
  border-color: var(--tq-color-accent);
  background: var(--tq-color-accent-soft);
}

.item-tiling-sequence.focused {
  background-color: var(--tq-color-accent-soft);
  border-color: var(--tq-color-accent);
  box-shadow: 0 0 0 1px var(--tq-color-accent);
}

.item-tiling-sequence.playing {
  border-color: #ff6b35;
  box-shadow: 0 0 0 1px #ff6b35;
  background: rgba(255, 107, 53, 0.05);
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
  color: var(--tq-color-text);
  position: relative;
}

.sequence-name::before {
  content: '▶';
  margin-right: 6px;
  color: #ff6b35;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
}

.item-tiling-sequence.focused .sequence-name::before {
  opacity: 0.7;
  transform: scale(1);
}

.item-tiling-sequence.playing .sequence-name::before {
  opacity: 1;
  animation: pulse 1s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}

.sequence-details {
  font-size: 12px;
  color: var(--tq-color-text-mute);
}

.sequence-actions {
  display: flex;
  gap: 4px;
}

.sequence-patterns {
  padding: 12px;
}

.patterns-timeline {
  display: flex;
  gap: 6px;
  align-items: center;
  overflow-x: auto;
  padding: 8px 4px 12px 4px;
  background: var(--tq-color-surface);
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--tq-color-border) transparent;
}

.patterns-timeline::-webkit-scrollbar {
  height: 6px;
}

.patterns-timeline::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.patterns-timeline::-webkit-scrollbar-thumb {
  background: var(--tq-color-border);
  border-radius: 3px;
}

.patterns-timeline::-webkit-scrollbar-thumb:hover {
  background: var(--tq-color-accent);
}

.pattern-frame {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border: 1px solid var(--tq-color-border);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.15s ease;
  background: var(--tq-color-surface);
}

.pattern-frame:hover {
  border-color: var(--tq-color-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pattern-frame.active {
  border-color: var(--tq-color-accent);
  box-shadow: 0 0 0 1px var(--tq-color-accent);
  background: var(--tq-color-accent-soft);
}

.pattern-frame.playing {
  border-color: #ff6b35;
  border-width: 3px;
  box-shadow: 
    0 0 0 2px #ff6b35,
    0 0 12px rgba(255, 107, 53, 0.6),
    0 2px 8px rgba(0, 0, 0, 0.15);
  animation: playingFrame 0.8s ease-in-out infinite alternate;
  transform: scale(1.05);
  z-index: 10;
  background: rgba(255, 107, 53, 0.1);
}

@keyframes playingFrame {
  from {
    box-shadow: 
      0 0 0 2px #ff6b35,
      0 0 12px rgba(255, 107, 53, 0.6),
      0 2px 8px rgba(0, 0, 0, 0.15);
  }
  to {
    box-shadow: 
      0 0 0 3px #ff6b35,
      0 0 16px rgba(255, 107, 53, 0.8),
      0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

.frame-number {
  position: absolute;
  bottom: 2px;
  right: 2px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 4px;
  border-radius: 3px;
  backdrop-filter: blur(2px);
}

.remove-frame {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s ease;
  transform: scale(0.8);
}

.pattern-frame:hover .remove-frame {
  opacity: 1;
  transform: scale(1);
}

.remove-frame:hover {
  background: rgba(255, 0, 0, 1);
  transform: scale(1.1);
}

.add-frame-button {
  flex-shrink: 0;
  margin-left: 8px;
}

.add-frame-button button {
  border: 1px dashed var(--tq-color-border);
  border-radius: 8px;
  padding: 12px 16px;
  background: transparent;
  transition: all 0.2s ease;
}

.add-frame-button button:hover {
  border-color: var(--tq-color-accent);
  background: var(--tq-color-accent-soft);
  transform: scale(1.05);
}

.frame-gap {
  flex-shrink: 0;
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  position: relative;
}

.frame-gap:hover {
  background-color: var(--tq-color-accent-soft);
  transform: scale(1.1);
}

.gap-indicator {
  opacity: 0.4;
  transition: all 0.2s ease;
  color: var(--tq-color-text-mute);
}

.frame-gap:hover .gap-indicator {
  opacity: 1;
  color: var(--tq-color-accent);
  transform: scale(1.2);
}
</style>
