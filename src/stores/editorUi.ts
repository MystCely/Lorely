import { defineStore } from "pinia";
import { ref } from "vue";

export const useEditorUiStore = defineStore("editorUi", () => {
	const chaptersCollapsed = ref(false);

	function toggleChapters() {
		chaptersCollapsed.value = !chaptersCollapsed.value;
	}

	return { chaptersCollapsed, toggleChapters };
});
