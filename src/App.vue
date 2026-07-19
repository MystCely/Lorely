<script lang="ts" setup>
	import { computed } from "vue";
	import { useRoute } from "vue-router";
	import TheNavbar from "./components/TheNavbar.vue";

	const route = useRoute();
	const isAuthPage = computed(() => route.name === "login" || route.name === "reset-password");
</script>

<template>
	<div class="relative min-h-screen bg-canvas text-ink">
		<div
			class="pointer-events-none fixed inset-x-0 z-0 h-80"
			:class="isAuthPage ? 'app-glow-bottom bottom-0' : 'app-glow top-0'"></div>
		<div class="relative z-10">
			<TheNavbar />
			<RouterView />
		</div>
	</div>
</template>
