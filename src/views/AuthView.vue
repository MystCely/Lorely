<script lang="ts" setup>
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";

	const auth = useAuthStore();
	const router = useRouter();

	const mode = ref<"signin" | "signup">("signin");
	const email = ref("");
	const password = ref("");
	const errorMsg = ref("");
	const loading = ref(false);

	async function submit() {
		errorMsg.value = "";
		loading.value = true;
		try {
			if (mode.value === "signup") {
				await auth.signUp(email.value, password.value);
			} else {
				await auth.signIn(email.value, password.value);
			}
			router.push({ name: "home" });
		} catch (err) {
			errorMsg.value = err instanceof Error ? err.message : "Something went wrong.";
		} finally {
			loading.value = false;
		}
	}

	function toggleMode() {
		mode.value = mode.value === "signin" ? "signup" : "signin";
		errorMsg.value = "";
	}
</script>

<template>
	<div class="flex min-h-[calc(100vh-var(--nav-h))] items-center justify-center px-4">
		<div class="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
			<h1 class="text-2xl font-bold tracking-tight text-ink">
				Lorel
				<span class="text-violet">y</span>
			</h1>
			<p class="mt-1 text-sm text-muted">
				{{ mode === "signup" ? "Create your account" : "Welcome back" }}
			</p>

			<form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
				<div class="flex flex-col gap-1">
					<label class="text-sm text-muted" for="email">Email</label>
					<input
						id="email"
						v-model="email"
						type="email"
						required
						autocomplete="email"
						class="rounded-md border border-line bg-canvas px-3 py-2 text-ink outline-none transition focus:border-violet" />
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-sm text-muted" for="password">Password</label>
					<input
						id="password"
						v-model="password"
						type="password"
						required
						autocomplete="current-password"
						class="rounded-md border border-line bg-canvas px-3 py-2 text-ink outline-none transition focus:border-violet" />
				</div>

				<p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>

				<button
					type="submit"
					:disabled="loading"
					class="mt-2 rounded-md bg-violet px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
					{{ loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in" }}
				</button>
			</form>

			<button type="button" @click="toggleMode" class="mt-4 text-sm text-muted transition hover:text-ink">
				{{ mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up" }}
			</button>
		</div>
	</div>
</template>
