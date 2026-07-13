import {createRouter, createWebHistory} from "vue-router";
import HomeView from "../views/HomeView.vue";
import BookLayout from "../layouts/BookLayout.vue";
import EditorView from "../views/EditorView.vue";
import PlannerView from "../views/PlannerView.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {path: "/", name: "home", component: HomeView},
        {
            path: "/book/:id",
            component: BookLayout,
            children: [
                {path: "", redirect: (to) => ({name: "editor", params: {id: to.params.id}})},
                {path: "editor", name: "editor", component: EditorView},
                {path: "planner", name: "planner", component: PlannerView},
            ]
        }
    ],
});

export default router;