<script lang="ts" setup>
import {initTweeq, useTweeq} from 'tweeq'

import PaneItems from './PaneItems.vue'
import PanePattern from './PanePattern.vue'
import PaneViewport from './PaneViewport.vue'
import TitleBar from './TitleBar.vue'

initTweeq('com.baku89.ichimatsu', {
	colorMode: 'light',
	accentColor: '#001280',
	grayColor: '#9494B8',
	backgroundColor: '#fcfcfc',
})

const Tq = useTweeq()
</script>

<template>
	<Tq.App>
		<template #title>
			<TitleBar />
		</template>
		<template #default>
			<Tq.PaneSplit
				name="main"
				direction="horizontal"
				:scroll="[false, false]"
			>
				<template #first>
					<Tq.PaneSplit
						name="left"
						direction="vertical"
						:scroll="[false, false]"
					>
						<template #first>
							<PaneViewport />
						</template>
						<template #second>
							<PaneItems />
						</template>
					</Tq.PaneSplit>
				</template>
				<template #second>
					<PanePattern />
				</template>
			</Tq.PaneSplit>
		</template>
	</Tq.App>
</template>

<style lang="stylus" scoped>
// スタイルはTweeqのデフォルトを使用
</style>
