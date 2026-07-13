<script lang="ts" setup>
	import { ref, onMounted } from "vue";
	import { Sun, Moon, Settings } from "lucide-vue-next";

	const isDark = ref(true);

	function setTheme(dark: boolean) {
		document.documentElement.classList.toggle("dark", dark);
		localStorage.setItem("theme", dark ? "dark" : "light");
		isDark.value = dark;
	}

	onMounted(() => {
		const saved = localStorage.getItem("theme");
		setTheme(saved ? saved === "dark" : true);
	});
</script>

<template>
	<header class="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
		<RouterLink to="/" class="text-lg font-bold tracking-tight text-ink">
			Lorel
			<span class="text-violet">y</span>
		</RouterLink>
		<div class="flex items-center gap-1">
			<button
				@click="setTheme(!isDark)"
				aria-label="Toggle theme"
				class="rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink">
				<Sun v-if="isDark" class="h-5 w-5" />
				<Moon v-else class="h-5 w-5" />
			</button>
			<button aria-label="Settings" class="rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink">
				<Settings class="h-5 w-5" />
			</button>
			<div class="ml-2 h-8 w-8 rounded-full bg-linear-to-br from-violet to-forest"></div>
		</div>
	</header>
</template>
