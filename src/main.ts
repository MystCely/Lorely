import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { useAuthStore } from "./stores/auth.ts";

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

useAuthStore(pinia)
	.init()
	.then(() => {
		app.mount("#app");
	});
