<script lang="ts" setup>
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";
	import { Feather } from "lucide-vue-next";

	const auth = useAuthStore();
	const router = useRouter();

	const mode = ref<"signin" | "signup" | "forgot">("signin");
	const email = ref("");
	const password = ref("");
	const errorMsg = ref("");
	const loading = ref(false);
	const resetSent = ref(false);
	const confirmSent = ref(false);

	const subtitle = { signin: "Welcome back", signup: "Create your account", forgot: "Reset your password" };
	const buttonLabel = { signin: "Sign in", signup: "Sign up", forgot: "Send reset link" };

	async function submit() {
		if (loading.value) return;
		errorMsg.value = "";
		loading.value = true;
		try {
			if (mode.value === "forgot") {
				await auth.resetPasswordForEmail(email.value);
				resetSent.value = true;
			} else if (mode.value === "signup") {
				const data = await auth.signUp(email.value, password.value);
				if (!data.session) {
					confirmSent.value = true;
				} else {
					router.push({ name: "home" });
				}
			} else {
				await auth.signIn(email.value, password.value);
				router.push({ name: "home" });
			}
		} catch (err) {
			errorMsg.value = err instanceof Error ? err.message : "Something went wrong.";
		} finally {
			loading.value = false;
		}
	}

	function setMode(next: "signin" | "signup" | "forgot") {
		mode.value = next;
		errorMsg.value = "";
		resetSent.value = false;
		confirmSent.value = false;
		email.value = "";
		password.value = "";
	}
</script>

<template>
	<div class="flex min-h-[calc(100vh-var(--nav-h))] items-center justify-center px-4">
		<div class="w-full max-w-sm rounded-lg border border-line bg-surface p-8">
			<h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
				Lorely
				<Feather class="h-6 w-6 text-violet" />
			</h1>
			<p class="mt-1 text-sm text-muted">{{ subtitle[mode] }}</p>

			<div v-if="resetSent" class="mt-6">
				<p class="text-sm text-ink">
					If an account exists for
					<span class="font-medium">{{ email }},</span>
					a reset link is on its way. Check your inbox.
				</p>
				<button
					type="button"
					@click="setMode('signin')"
					class="mt-4 cursor-pointer text-sm text-muted transition hover:text-ink">
					Back to sign in
				</button>
			</div>

			<div v-else-if="confirmSent" class="mt-6">
				<p class="text-sm text-ink">
					Almost there. We sent a confirmation link to
					<span class="font-medium">{{ email }}.</span>
					Click it to activate your account, then sign in.
				</p>
				<button
					type="button"
					@click="setMode('signin')"
					class="mt-4 cursor-pointer text-sm text-muted transition hover:text-ink">
					Back to sign in
				</button>
			</div>

			<template v-else>
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

					<div v-if="mode !== 'forgot'" class="flex flex-col gap-1">
						<div class="flex items-center justify-between">
							<label class="text-sm text-muted" for="password">Password</label>
							<button
								v-if="mode === 'signin'"
								type="button"
								@click="setMode('forgot')"
								class="cursor-pointer text-xs text-muted/60 transition hover:text-ink">
								Forgot password?
							</button>
						</div>
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
						class="mt-2 cursor-pointer rounded-md bg-violet px-4 py-2 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
						{{ loading ? "Please wait…" : buttonLabel[mode] }}
					</button>
				</form>

				<button
					v-if="mode === 'forgot'"
					type="button"
					@click="setMode('signin')"
					class="mt-4 cursor-pointer text-sm text-muted transition hover:text-ink">
					Back to sign in
				</button>
				<button
					v-else
					type="button"
					@click="setMode(mode === 'signup' ? 'signin' : 'signup')"
					class="mt-4 cursor-pointer text-sm text-muted transition hover:text-ink">
					{{ mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up" }}
				</button>
			</template>
		</div>
	</div>
</template>
