import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export const useAuthStore = defineStore("auth", () => {
	const session = ref<Session | null>(null);
	const user = computed(() => session.value?.user ?? null);

	async function init() {
		const { data } = await supabase.auth.getSession();
		session.value = data.session;

		supabase.auth.onAuthStateChange((_event, newSession) => {
			session.value = newSession;
		});
	}

	async function signUp(email: string, password: string) {
		const { error } = await supabase.auth.signUp({ email, password });
		if (error) throw error;
	}

	async function signIn(email: string, password: string) {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) throw error;
	}

	async function signOut() {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;
	}

	return { session, user, init, signUp, signIn, signOut };
});
