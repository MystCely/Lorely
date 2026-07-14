<script lang="ts" setup>
	import { useRoute } from "vue-router";
	const route = useRoute();
</script>

<template>
	<div class="flex min-h-[calc(100vh-var(--nav-h))]">
		<aside class="w-56 shrink-0 border-r border-line bg-surface p-4">
			<nav class="flex flex-col gap-1">
				<RouterLink
					:to="`/book/${route.params.id}/editor`"
					active-class="bg-forest/10 font-medium text-forest!"
					class="rounded px-3 py-2 text-muted transition hover:bg-canvas hover:text-ink">
					Editor
				</RouterLink>
				<RouterLink
					:to="`/book/${route.params.id}/planner`"
					active-class="bg-forest/10 font-medium text-forest!"
					class="rounded px-3 py-2 text-muted transition hover:bg-canvas hover:text-ink">
					Planner
				</RouterLink>
			</nav>
		</aside>
		<main class="flex-1 p-8">
			<RouterView />
		</main>
	</div>
</template>
