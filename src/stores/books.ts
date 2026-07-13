import { defineStore } from "pinia";
import { ref } from "vue";

export interface Book {
	id: number;
	title: string;
	author: string;
	wordCount: number;
}

export const useBooksStore = defineStore("books", () => {
	const books = ref<Book[]>([
		{ id: 1, title: "The Silver Thread", author: "Myst Sol", wordCount: 12400 },
		{ id: 2, title: "Northwind", author: "Myst Sol", wordCount: 3000 },
		{ id: 3, title: "Untitled Draft", author: "Myst Sol", wordCount: 0 },
	]);

	function addBook() {
		books.value.push({
			id: Date.now(),
			title: "Untitled Draft",
			author: "",
			wordCount: 0,
		});
	}

	function getBook(id: number) {
		return books.value.find((book) => book.id === id);
	}

	return { books, addBook, getBook };
});
