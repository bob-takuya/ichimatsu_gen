<script setup lang="ts">
import {ColorIcon} from '../ColorIcon'
import type {TitleBarProps} from './types'

defineProps<TitleBarProps>()

defineSlots<{
	left(): any
	center(): any
	right(): any
}>()
</script>

<template>
	<div class="TqTitleBar">
		<div class="left">
			<ColorIcon
				class="app-icon"
				:src="icon"
			/>
			<span class="app-name">{{ name }}</span>
			<slot name="left" />
		</div>
		<div class="center">
			<slot name="center" />
		</div>
		<div class="right">
			<slot name="right" />
		</div>
	</div>
</template>

<style lang="stylus" scoped>
.TqTitleBar
	--titlebar-area-height: env(titlebar-area-height, 38px)

	position fixed
	display grid
	grid-template-columns 1fr min-content 1fr
	left env(titlebar-area-x, 0)
	top env(titlebar-area-y, 0)
	width env(titlebar-area-width, 100%)
	height var(--titlebar-area-height)

	z-index 100
	user-select none
	background linear-gradient(to bottom, var(--tq-color-background), transparent)
	backdrop-filter blur(2px)
	gap var(--tq-input-gap)
	padding calc((var(--titlebar-area-height) - var(--tq-input-height)) / 2) 9px
	-webkit-app-region: drag
	app-region: drag

	@media (display-mode: window-controls-overlay)
		background \
			linear-gradient(to bottom, var(--tq-color-background) 20%, transparent), \
			linear-gradient(to right, var(--tq-color-background) 0, transparent 15%, transparent 85%, var(--tq-color-background) 100%)

.left, .center, .right
	display flex
	gap var(--tq-input-gap)

	& > *
		flex-grow 0

	& > :deep(*)
		-webkit-app-region no-drag
		app-region no-drag

.right
	justify-content flex-end

.app-icon
	height var(--tq-input-height)

.app-name
	font-family 500
	font-family var(--tq-font-heading)
	font-size calc(var(--titlebar-area-height) * .4)
	margin-right .2em
	line-height var(--tq-input-height)
</style>
