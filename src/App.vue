<script lang="ts" setup>
	import TheNavbar from "./components/TheNavbar.vue";
</script>

<template>
	<div class="min-h-screen bg-canvas text-ink">
		<TheNavbar />
		<RouterView />
	</div>
</template>
