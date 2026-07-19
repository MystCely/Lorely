<script lang="ts" setup>
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";
	import { Eye, EyeOff, Feather, Lock } from "lucide-vue-next";

	const auth = useAuthStore();
	const router = useRouter();

	const password = ref("");
	const confirm = ref("");
	const showPassword = ref(false);
	const showConfirm = ref(false);
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
	<div class="flex min-h-[calc(100vh-var(--nav-h))] items-center justify-center px-4 py-10">
		<div class="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
			<RouterLink to="/" class="flex items-center justify-center gap-2.5">
				<span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet/15">
					<Feather class="h-6 w-6 text-violet" />
				</span>
				<span class="text-xl font-bold tracking-tight text-ink">Lorely</span>
			</RouterLink>

			<h1 class="mt-6 text-center text-3xl font-bold tracking-tight text-ink">Set a new password</h1>

			<p v-if="done" class="mt-6 text-center text-sm text-ink">
				Password updated. Please sign in with your new password.
			</p>

			<form v-else class="mt-8 flex flex-col gap-4" @submit.prevent="submit">
				<div>
					<label for="new-password" class="mb-1.5 block text-sm font-medium text-ink">New password</label>
					<div class="relative">
						<Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
						<input
							id="new-password"
							v-model="password"
							:type="showPassword ? 'text' : 'password'"
							required
							autocomplete="new-password"
							placeholder="Enter your new password"
							class="w-full rounded-2xl border border-line bg-canvas py-3.5 pl-12 pr-12 text-ink outline-none transition placeholder:text-muted focus:border-violet" />
						<button
							type="button"
							@click="showPassword = !showPassword"
							:aria-label="showPassword ? 'Hide password' : 'Show password'"
							class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted transition hover:text-ink">
							<EyeOff v-if="showPassword" class="h-5 w-5" />
							<Eye v-else class="h-5 w-5" />
						</button>
					</div>
				</div>

				<div>
					<label for="confirm-password" class="mb-1.5 block text-sm font-medium text-ink">Confirm password</label>
					<div class="relative">
						<Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
						<input
							id="confirm-password"
							v-model="confirm"
							:type="showConfirm ? 'text' : 'password'"
							required
							autocomplete="new-password"
							placeholder="Confirm your new password"
							class="w-full rounded-2xl border border-line bg-canvas py-3.5 pl-12 pr-12 text-ink outline-none transition placeholder:text-muted focus:border-violet" />
						<button
							type="button"
							@click="showConfirm = !showConfirm"
							:aria-label="showConfirm ? 'Hide password' : 'Show password'"
							class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-muted transition hover:text-ink">
							<EyeOff v-if="showConfirm" class="h-5 w-5" />
							<Eye v-else class="h-5 w-5" />
						</button>
					</div>
				</div>

				<p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>

				<button
					type="submit"
					:disabled="loading"
					class="mt-2 w-full cursor-pointer rounded-full bg-violet px-4 py-3.5 font-medium text-white transition hover:brightness-110 disabled:opacity-50">
					{{ loading ? "Please wait" : "Update password" }}
				</button>
			</form>
		</div>
	</div>
</template>
