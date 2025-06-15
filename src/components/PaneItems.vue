<template>
  <div class="pane-items">
    <div class="items-header">
      <Tq.InputButton @click="addTilingSequence" icon="mdi:plus">
        Add Sequence
      </Tq.InputButton>
    </div>
    
    <div class="items-list">
      <ItemTilingSequence
        v-for="sequence in project.tilingSequences"
        :key="sequence.id"
        :sequence="sequence"
        :selected="appState.selectedSequenceId === sequence.id"
        @select="selectSequence"
        @delete="deleteSequence"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {useTweeq} from 'tweeq'
import { useProjectStore } from '../store/project'
import { useAppStateStore } from '../store/appState'
import ItemTilingSequence from './ItemTilingSequence.vue'

const Tq = useTweeq()
const project = useProjectStore()
const appState = useAppStateStore()

function addTilingSequence() {
  const sequence = project.createTilingSequence()
  appState.selectSequence(sequence.id)
}

function selectSequence(id: string) {
  appState.selectSequence(id)
}

function deleteSequence(id: string) {
  project.deleteTilingSequence(id)
  if (appState.selectedSequenceId === id) {
    appState.selectSequence(null)
  }
}
</script>

<style scoped>
.pane-items {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
}

.items-header {
  padding: 12px;
}

.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
</style>
