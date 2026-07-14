import { defineStore } from "pinia";
import { ref } from "vue";
import { supabase } from "../lib/supabaseClient";

export interface Book {
	id: string;
	title: string;
	author: string | null;
	project_id: string | null;
	cover_image: string | null;
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

	async function addBook(payload: { title: string; author: string; coverFile: File | null }) {
		let coverUrl: string | null = null;

		if (payload.coverFile) {
			const { data: userData } = await supabase.auth.getUser();
			const userId = userData.user?.id;
			if (!userId) throw new Error("Not signed in");

			const ext = payload.coverFile.name.split(".").pop();
			const path = `${userId}/${crypto.randomUUID()}.${ext}`;

			const { error: uploadError } = await supabase.storage.from("covers").upload(path, payload.coverFile);
			if (uploadError) throw uploadError;

			const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
			coverUrl = urlData.publicUrl;
		}

		const { data, error } = await supabase
			.from("books")
			.insert({ title: payload.title, author: payload.author || null, cover_image: coverUrl })
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
