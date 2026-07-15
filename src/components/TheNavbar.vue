<script lang="ts" setup>
	import { ref, onMounted, computed } from "vue";
	import { useRoute } from "vue-router";
	import { Sun, Moon, Settings } from "lucide-vue-next";
	import { useBooksStore } from "../stores/books";

	const isDark = ref(true);
	const route = useRoute();
	const booksStore = useBooksStore();

	const currentBook = computed(() => (route.params.id ? booksStore.getBook(String(route.params.id)) : undefined));

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
	<header class="flex h-(--nav-h) items-center justify-between border-b border-line bg-surface px-8">
		<div class="flex items-center gap-3">
			<RouterLink to="/" class="text-2xl font-bold tracking-tight text-ink">
				Lorel
				<span class="text-violet">y</span>
			</RouterLink>
			<template v-if="currentBook">
				<span class="text-lg text-muted">/</span>
				<span class="text-lg font-semibold text-ink">{{ currentBook.title }}</span>
			</template>
		</div>
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
			<div class="ml-2 h-9 w-9 rounded-full bg-linear-to-br from-grad-start to-grad-end"></div>
		</div>
	</header>
</template>
