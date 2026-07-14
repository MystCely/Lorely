<script lang="ts" setup>
	import { ref, onMounted } from "vue";
	import { storeToRefs } from "pinia";
	import { Upload, FolderPlus, ArrowDownUp, Plus } from "lucide-vue-next";
	import { useBooksStore } from "../stores/books";
	import NewBookModal from "../components/NewBookModal.vue";

	const booksStore = useBooksStore();
	const { books } = storeToRefs(booksStore);
	const { addBook, fetchBooks } = booksStore;

	const showModal = ref(false);

	onMounted(fetchBooks);

	async function handleCreate(payload: { title: string; author: string; coverFile: File | null }) {
		await addBook(payload);
		showModal.value = false;
	}
</script>

<template>
	<div class="mx-auto max-w-6xl px-8 py-8">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<h2 class="text-xl font-semibold text-ink">Your manuscripts</h2>
				<p class="mt-1 text-sm text-muted">{{ books.length }} books</p>
			</div>
			<div class="flex items-center gap-1">
				<button
					aria-label="Import manuscript"
					class="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink">
					<Upload class="h-5 w-5" />
				</button>
				<button aria-label="New folder" class="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink">
					<FolderPlus class="h-5 w-5" />
				</button>
				<button aria-label="Sort" class="rounded-md p-2 text-muted transition hover:bg-surface hover:text-ink">
					<ArrowDownUp class="h-5 w-5" />
				</button>
			</div>
		</div>

		<div class="flex flex-wrap gap-6">
			<RouterLink v-for="book in books" :key="book.id" :to="`/book/${book.id}/editor`" class="group w-36">
				<div
					class="relative flex aspect-2/3 overflow-hidden rounded-md bg-linear-to-br from-violet to-forest shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl">
					<img
						v-if="book.cover_image"
						:src="book.cover_image"
						alt=""
						class="absolute inset-0 h-full w-full object-cover" />
				</div>
				<h3 class="mt-3 text-sm font-medium leading-tight text-ink">{{ book.title }}</h3>
				<p class="mt-1 text-xs text-muted">{{ book.author || "Unknown author" }}</p>
			</RouterLink>

			<button
				@click="showModal = true"
				class="group/add flex aspect-2/3 w-36 cursor-pointer flex-col items-center justify-center gap-2 self-start rounded-md border-2 border-dashed border-line text-muted transition hover:border-violet hover:text-ink">
				<Plus class="h-8 w-8 transition group-hover/add:scale-110" />
				<span class="text-xs">New book</span>
			</button>
		</div>

		<NewBookModal v-if="showModal" @close="showModal = false" @create="handleCreate" />
	</div>
</template>
