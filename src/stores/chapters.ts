import { defineStore } from "pinia";
import { ref } from "vue";
import type { JSONContent } from "@tiptap/vue-3";
import { supabase } from "../lib/supabaseClient";

export interface Chapter {
	id: string;
	book_id: string;
	title: string;
	content: JSONContent | null;
	position: number;
	created_at: string;
}

export const useChaptersStore = defineStore("chapters", () => {
	const chapters = ref<Chapter[]>([]);

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
		const nextPosition = chapters.value.length;
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

	function getChapter(id: string) {
		return chapters.value.find((chapter) => chapter.id === id);
	}

	return { chapters, fetchChapters, addChapter, updateChapter, getChapter };
});
