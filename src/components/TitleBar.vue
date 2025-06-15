<script lang="ts" setup>
import * as Tq from 'tweeq'

import {useAppStateStore} from '@/store/appState'
import {useProjectStore} from '@/store/project'

const appState = useAppStateStore()
const project = useProjectStore()
</script>

<template>
	<Tq.TitleBar name="Ichimatsu Animation" icon="icon.png">
		<template #center>
			<Tq.InputGroup>
				<Tq.InputCheckbox
					v-model="appState.isPlaying"
					:icon="appState.isPlaying ? 'mdi:pause' : 'mdi:play'"
					inlinePosition="start"
				/>
				<Tq.InputNumber
					v-model="project.frameRate"
					:precision="0"
					:min="4"
					:max="60"
					:step="1"
					:bar="false"
					suffix=" fps"
					style="width: 5em"
					inlinePosition="end"
				/>
			</Tq.InputGroup>
		</template>
	</Tq.TitleBar>
</template>
