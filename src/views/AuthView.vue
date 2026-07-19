<script lang="ts" setup>
	import { ref } from "vue";
	import { useRouter } from "vue-router";
	import { useAuthStore } from "../stores/auth";
	import { Eye, EyeOff, Feather, Mail, Lock, Check } from "lucide-vue-next";

	const auth = useAuthStore();
	const router = useRouter();

	const mode = ref<"signin" | "signup" | "forgot">("signin");
	const email = ref("");
	const password = ref("");
	const confirm = ref("");
	const showPassword = ref(false);
	const showConfirm = ref(false);
	const rememberMe = ref(false);
	const agreeTerms = ref(false);
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
				if (password.value.length < 6) {
					errorMsg.value = "Password must be at least 6 characters.";
					return;
				}
				if (password.value !== confirm.value) {
					errorMsg.value = "Passwords do not match.";
					return;
				}
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
		confirm.value = "";
		showPassword.value = false;
		showConfirm.value = false;
		agreeTerms.value = false;
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

			<h1 class="mt-6 text-center text-3xl font-bold tracking-tight text-ink">{{ subtitle[mode] }}</h1>

			<div v-if="resetSent" class="mt-6 text-center">
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

			<div v-else-if="confirmSent" class="mt-6 text-center">
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
				<form class="mt-8 flex flex-col gap-4" @submit.prevent="submit">
					<div>
						<label for="email" class="mb-1.5 block text-sm font-medium text-ink">Email</label>
						<div class="relative">
							<Mail class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
							<input
								id="email"
								v-model="email"
								type="email"
								required
								autocomplete="email"
								placeholder="Enter your email"
								class="w-full rounded-2xl border border-line bg-canvas py-3.5 pl-12 pr-4 text-ink outline-none transition placeholder:text-muted focus:border-violet" />
						</div>
					</div>

					<div v-if="mode !== 'forgot'">
						<label for="password" class="mb-1.5 block text-sm font-medium text-ink">Password</label>
						<div class="relative">
							<Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
							<input
								id="password"
								v-model="password"
								:type="showPassword ? 'text' : 'password'"
								required
								autocomplete="current-password"
								placeholder="Enter your password"
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

					<div v-if="mode === 'signup'">
						<label for="confirm" class="mb-1.5 block text-sm font-medium text-ink">Confirm password</label>
						<div class="relative">
							<Lock class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
							<input
								id="confirm"
								v-model="confirm"
								:type="showConfirm ? 'text' : 'password'"
								required
								autocomplete="new-password"
								placeholder="Confirm your password"
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

					<div v-if="mode === 'signin'" class="flex items-center justify-between px-1">
						<label class="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
							<input type="checkbox" v-model="rememberMe" class="peer sr-only" />
							<span
								class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line bg-canvas transition peer-checked:border-violet peer-checked:bg-violet peer-focus-visible:ring-2 peer-focus-visible:ring-violet/50">
								<Check v-show="rememberMe" class="h-3.5 w-3.5 text-white" />
							</span>
							Remember me
						</label>
						<button
							type="button"
							@click="setMode('forgot')"
							class="cursor-pointer text-sm text-violet transition hover:brightness-110">
							Forgot password?
						</button>
					</div>

					<label
						v-else-if="mode === 'signup'"
						class="flex cursor-pointer select-none items-center gap-2 px-1 text-sm text-muted">
						<input type="checkbox" v-model="agreeTerms" class="peer sr-only" />
						<span
							class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line bg-canvas transition peer-checked:border-violet peer-checked:bg-violet peer-focus-visible:ring-2 peer-focus-visible:ring-violet/50">
							<Check v-show="agreeTerms" class="h-3.5 w-3.5 text-white" />
						</span>
						<span>
							I agree to the
							<a href="#" @click.prevent class="text-violet transition hover:brightness-110">Terms of Service</a>
						</span>
					</label>

					<p v-if="errorMsg" class="text-sm text-red-400">{{ errorMsg }}</p>

					<button
						type="submit"
						:disabled="loading || (mode === 'signup' && !agreeTerms)"
						class="mt-2 w-full cursor-pointer rounded-full bg-violet px-4 py-3.5 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
						{{ loading ? "Please wait…" : buttonLabel[mode] }}
					</button>
				</form>

				<template v-if="mode !== 'forgot'">
					<div class="mt-6 flex items-center gap-3">
						<div class="h-px flex-1 bg-line"></div>
						<span class="text-xs text-muted">Or continue with</span>
						<div class="h-px flex-1 bg-line"></div>
					</div>

					<div class="mt-5 flex justify-center gap-4">
						<button
							type="button"
							aria-label="Continue with Google"
							class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line transition hover:bg-canvas">
							<svg viewBox="0 0 24 24" class="h-5 w-5">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
							</svg>
						</button>
						<button
							type="button"
							aria-label="Continue with Apple"
							class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line transition hover:bg-canvas">
							<svg viewBox="0 0 24 24" class="h-5 w-5 fill-ink">
								<path
									d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.72-1.04-2.75-4.13zM14.53 4.6c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.59 3.03-1.46z" />
							</svg>
						</button>
						<button
							type="button"
							aria-label="Continue with Facebook"
							class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-line transition hover:bg-canvas">
							<svg viewBox="0 0 24 24" class="h-5 w-5">
								<path
									fill="#1877F2"
									d="M24 12c0-6.63-5.37-12-12-12S0 5.37 0 12c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08V12h3.05V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38C19.61 22.95 24 17.99 24 12z" />
							</svg>
						</button>
					</div>
				</template>

				<p v-if="mode === 'forgot'" class="mt-6 text-center">
					<button
						type="button"
						@click="setMode('signin')"
						class="cursor-pointer text-sm text-muted transition hover:text-ink">
						Back to sign in
					</button>
				</p>
				<p v-else class="mt-6 text-center text-sm text-muted">
					{{ mode === "signup" ? "Already have an account?" : "Don't have an account?" }}
					<button
						type="button"
						@click="setMode(mode === 'signup' ? 'signin' : 'signup')"
						class="ml-1 cursor-pointer font-semibold text-violet transition hover:brightness-110">
						{{ mode === "signup" ? "Sign in" : "Create an account" }}
					</button>
				</p>
			</template>
		</div>
	</div>
</template>
