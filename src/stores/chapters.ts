import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { JSONContent } from "@tiptap/vue-3";
import { supabase } from "../lib/supabaseClient";

export interface Chapter {
	id: string;
	book_id: string;
	title: string;
	content: JSONContent | null;
	position: number;
	created_at: string;
	archived_at: string | null;
	deleted_at: string | null;
}

export const useChaptersStore = defineStore("chapters", () => {
	const chapters = ref<Chapter[]>([]);

	const activeChapters = computed(() => chapters.value.filter((c) => !c.archived_at && !c.deleted_at));
	const archivedChapters = computed(() => chapters.value.filter((c) => c.archived_at && !c.deleted_at));
	const trashedChapters = computed(() => chapters.value.filter((c) => c.deleted_at));

	const now = () => new Date().toISOString();

	async function fetchChapters(bookId: string) {
		const { data, error } = await supabase
			.from("chapters")
			.select("*")
			.eq("book_id", bookId)
			.order("position", { ascending: true });
		if (error) throw error;
		chapters.value = data ?? [];
	}

	async function addChapter(bookId: string) {
		const nextPosition = chapters.value.reduce((max, c) => Math.max(max, c.position), -1) + 1;

		const { data, error } = await supabase
			.from("chapters")
			.insert({ book_id: bookId, title: `Chapter ${nextPosition + 1}`, position: nextPosition })
			.select()
			.single();
		if (error) throw error;
		chapters.value.push(data);
		return data as Chapter;
	}

	async function updateChapter(id: string, updates: { title?: string; content?: JSONContent }) {
		const { data, error } = await supabase.from("chapters").update(updates).eq("id", id).select().single();
		if (error) throw error;
		const index = chapters.value.findIndex((chapter) => chapter.id === id);
		if (index !== -1) chapters.value[index] = data;
	}

	async function setChapterState(id: string, patch: { archived_at?: string | null; deleted_at?: string | null }) {
		const { data, error } = await supabase.from("chapters").update(patch).eq("id", id).select().single();
		if (error) throw error;
		const index = chapters.value.findIndex((chapter) => chapter.id === id);
		if (index !== -1) chapters.value[index] = data;
	}

	async function archiveChapter(id: string) {
		await setChapterState(id, { archived_at: now(), deleted_at: null });
	}

	async function trashChapter(id: string) {
		await setChapterState(id, { deleted_at: now() });
	}

	async function restoreChapter(id: string) {
		await setChapterState(id, { archived_at: null, deleted_at: null });
	}

	async function deleteChapterForever(id: string) {
		const { error } = await supabase.from("chapters").delete().eq("id", id);
		if (error) throw error;
		chapters.value = chapters.value.filter((chapter) => chapter.id !== id);
	}

	function getChapter(id: string) {
		return chapters.value.find((chapter) => chapter.id === id);
	}

	return {
		chapters,
		activeChapters,
		archivedChapters,
		trashedChapters,
		fetchChapters,
		addChapter,
		updateChapter,
		archiveChapter,
		trashChapter,
		restoreChapter,
		deleteChapterForever,
		getChapter,
	};
});
