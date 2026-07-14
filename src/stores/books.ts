import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabaseClient";

export interface Book {
	id: string;
	title: string;
	author: string | null;
	project_id: string | null;
	cover_img: string | null;
	default_color: string | null;
	created_at: string;
}

export const useBooksStore = defineStore("books", () => {
	const books = ref<Book[]>([]);

	async function fetchBooks() {
		const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
		if (error) throw error;
		books.value = data ?? [];
	}

	async function addBook(payload: { title: string; author: string }) {
		const { data, error } = await supabase
			.from("books")
			.insert({ title: payload.title, author: payload.author || null })
			.select()
			.single();
		if (error) throw error;
		books.value.unshift(data);
	}

	function getBook(id: string) {
		return books.value.find((book) => book.id === id);
	}

	return { books, fetchBooks, addBook, getBook };
});
