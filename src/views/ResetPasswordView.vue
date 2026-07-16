<script lang="ts" setup>
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";

	const auth = useAuthStore();
	const router = useRouter();

	const password = ref("");
	const confirm = ref("");
	const errorMsg = ref("");
	const loading = ref(false);
	const done = ref(false);

	async function submit() {
		errorMsg.value = "";
		if (password.value.length < 6) {
			errorMsg.value = "Password must be at least 6 characters.";
			return;
		}
		if (password.value !== confirm.value) {
			errorMsg.value = "Passwords do not match.";
			return;
		}
		loading.value = true;
		try {
			await auth.updatePassword(password.value);
			await auth.signOut();
			done.value = true;
			setTimeout(() => router.push({ name: "login" }), 1500);
		} catch (err) {
			errorMsg.value = err instanceof Error ? err.message : "Something went wrong";
		} finally {
			loading.value = false;
		}
	}
</script>

<template>
	<div class="flex min-h-[calc(100vh-var(--nav-h))] items-center justify-center px-4">
		<div class="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
			<h1 class="text-xl font-bold tracking-tight text-ink">Set a new password</h1>
			<p v-if="done" class="mt-6 text-sm text-ink">Password updated. Please sign in with your new password.</p>

			<form v-else class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
				<div class="flex flex-col gap-1">
					<label class="text-sm text-muted" for="new-password">New password</label>
					<input
						id="new-password"
						v-model="password"
						type="password"
						required
						autocomplete="new-password"
						class="rounded-md border border-line bg-canvas px-3 py-2 text-ink outline-none transition focus:border-violet" />
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-sm text-muted" for="confirm-password">Confirm password</label>
					<input
						id="confirm-password"
						v-model="confirm"
						type="password"
						required
						autocomplete="new-password"
						class="rounded-md border border-line bg-canvas px-3 py-2 text-ink outline-none transition focus:border-violet" />
				</div>

				<p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>

				<button
					type="submit"
					:disabled="loading"
					class="mt-2 cursor-pointer rounded-md bg-violet px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
					{{ loading ? "Please wait" : "Update password" }}
				</button>
			</form>
		</div>
	</div>
</template>
