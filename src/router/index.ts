import {createRouter, createWebHistory} from "vue-router";
import DashboardView from "../views/DashboardView.vue";
import EditorView from "../views/EditorView.vue";
import PlannerView from "../views/PlannerView.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: "/", name: "dashboard", component: DashboardView},
        {path: "/editor", name: "editor", component: EditorView},
        {path: "/planner", name: "planner", component: PlannerView},
    ],
});

export default router;