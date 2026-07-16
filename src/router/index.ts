import AuthView from "../views/AuthView.vue";
import { useAuthStore } from "../stores/auth.ts";
import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import BookLayout from "../layouts/BookLayout.vue";
import EditorView from "../views/EditorView.vue";
import PlannerView from "../views/PlannerView.vue";
import ResetPasswordView from "../views/ResetPasswordView.vue";

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: "/", name: "home", component: HomeView },
		{ path: "/login", name: "login", component: AuthView },
		{ path: "/reset-password", name: "reset-password", component: ResetPasswordView },
		{
			path: "/book/:id",
			component: BookLayout,
			children: [
				{ path: "", redirect: (to) => ({ name: "editor", params: { id: to.params.id } }) },
				{ path: "editor", name: "editor", component: EditorView },
				{ path: "planner", name: "planner", component: PlannerView },
			],
		},
	],
});

router.beforeEach((to) => {
	const auth = useAuthStore();

	if (!auth.session && to.name !== "login" && to.name !== "reset-password") {
		return { name: "login" };
	}
	if (auth.session && to.name === "login") {
		return { name: "home" };
	}
});

export default router;
