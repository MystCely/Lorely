import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { createPinia } from "pinia";
import { useAuthStore } from "./stores/auth.ts";

const app = createApp(App);
const pinia = createPinia();
const auth = useAuthStore(pinia);
app.use(pinia);
app.use(router);

auth.ready.then(() => {
	app.mount("#app");
});
