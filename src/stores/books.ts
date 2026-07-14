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

	async function uploadCover(file: File): Promise<string> {
		const { data: userData } = await supabase.auth.getUser();
		const userId = userData.user?.id;
		if (!userId) throw new Error("Not signed in");

		const ext = file.name.split(".").pop();
		const path = `${userId}/${crypto.randomUUID()}.${ext}`;

		const { error: uploadError } = await supabase.storage.from("covers").upload(path, file);
		if (uploadError) throw uploadError;

		const { data: urlData } = supabase.storage.from("covers").getPublicUrl(path);
		return urlData.publicUrl;
	}

	async function addBook(payload: { title: string; author: string; coverFile: File | null }) {
		const coverUrl = payload.coverFile ? await uploadCover(payload.coverFile) : null;

		const { data, error } = await supabase
			.from("books")
			.insert({ title: payload.title, author: payload.author || null, cover_image: coverUrl })
			.select()
			.single();
		if (error) throw error;
		books.value.unshift(data);
	}

	async function updateBook(id: string, payload: { title: string; author: string; coverFile: File | null }) {
		const updates: { title: string; author: string | null; cover_image?: string } = {
			title: payload.title,
			author: payload.author || null,
		};
		if (payload.coverFile) {
			updates.cover_image = await uploadCover(payload.coverFile);
		}

		const { data, error } = await supabase.from("books").update(updates).eq("id", id).select().single();
		if (error) throw error;

		const index = books.value.findIndex((book) => book.id === id);
		if (index !== -1) books.value[index] = data;
	}

	async function deleteBook(id: string) {
		const { error } = await supabase.from("books").delete().eq("id", id);
		if (error) throw error;
		books.value = books.value.filter((book) => book.id !== id);
	}

	function getBook(id: string) {
		return books.value.find((book) => book.id === id);
	}

	return { books, fetchBooks, addBook, updateBook, deleteBook, getBook };
});
