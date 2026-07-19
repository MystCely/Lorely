<script lang="ts" setup>
	import { ref, onMounted, onUnmounted, computed } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { Feather, Sun, Moon, Settings, LogOut } from "lucide-vue-next";
	import { useBooksStore } from "../stores/books";
	import { useAuthStore } from "../stores/auth";

	const isDark = ref(true);
	const menuOpen = ref(false);
	const route = useRoute();
	const router = useRouter();
	const booksStore = useBooksStore();
	const auth = useAuthStore();

	const currentBook = computed(() => (route.params.id ? booksStore.getBook(String(route.params.id)) : undefined));
	const showAccountControls = computed(
		() => !!auth.session && route.name !== "login" && route.name !== "reset-password",
	);

	function setTheme(dark: boolean) {
		document.documentElement.classList.toggle("dark", dark);
		localStorage.setItem("theme", dark ? "dark" : "light");
		isDark.value = dark;
	}

	async function handleSignOut() {
		menuOpen.value = false;
		await auth.signOut();
		router.push({ name: "login" });
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") menuOpen.value = false;
	}

	onMounted(() => {
		const saved = localStorage.getItem("theme");
		setTheme(saved ? saved === "dark" : true);
		window.addEventListener("keydown", onKeyDown);
	});

	onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
</script>

<template>
	<header
		class="sticky top-0 z-40 flex h-(--nav-h) items-center justify-between border-b border-line bg-surface/30 px-8 backdrop-blur-xl">
		<div class="flex items-center gap-3">
			<RouterLink to="/" class="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
				Lorely
				<Feather class="h-6 w-6 text-violet" />
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
				class="cursor-pointer rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink">
				<Sun v-if="isDark" class="h-5 w-5" />
				<Moon v-else class="h-5 w-5" />
			</button>

			<button
				v-if="showAccountControls"
				aria-label="Settings"
				class="cursor-pointer rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink">
				<Settings class="h-5 w-5" />
			</button>

			<div v-if="showAccountControls" class="relative">
				<button
					type="button"
					aria-label="Account menu"
					class="ml-2 block h-9 w-9 cursor-pointer rounded-full bg-linear-to-br from-grad-start to-grad-end transition hover:opacity-90"
					@click="menuOpen = !menuOpen"></button>

				<div
					v-if="menuOpen"
					class="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
					<p class="truncate border-b border-line px-3 py-2 text-xs text-muted">{{ auth.user?.email }}</p>
					<button
						type="button"
						class="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-ink transition hover:bg-canvas"
						@click="handleSignOut">
						<LogOut class="h-4 w-4" />
						Sign out
					</button>
				</div>
			</div>
		</div>

		<div v-if="menuOpen" class="fixed inset-0 z-10" @click="menuOpen = false"></div>
	</header>
</template>
