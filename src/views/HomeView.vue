<script lang="ts" setup>
	import { ref, onMounted, onUnmounted } from "vue";
	import { storeToRefs } from "pinia";
	import { Upload, FolderPlus, ArrowDownUp, Plus, Pencil, Trash2, MoreHorizontal } from "lucide-vue-next";
	import { useBooksStore, type Book } from "../stores/books";
	import NewBookModal from "../components/NewBookModal.vue";

	const booksStore = useBooksStore();
	const { books } = storeToRefs(booksStore);
	const { addBook, updateBook, deleteBook, fetchBooks } = booksStore;

	const openMenuId = ref<string | null>(null);
	const deletingBook = ref<Book | null>(null);

	const showModal = ref(false);
	const editingBook = ref<Book | null>(null);

	const saving = ref(false);
	const submitError = ref("");

	onMounted(fetchBooks);

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") openMenuId.value = null;
	}

	onMounted(() => window.addEventListener("keydown", onKeyDown));
	onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

	function toggleMenu(id: string) {
		openMenuId.value = openMenuId.value === id ? null : id;
	}

	function openCreate() {
		editingBook.value = null;
		submitError.value = "";
		showModal.value = true;
	}

	function openEdit(book: Book) {
		editingBook.value = book;
		submitError.value = "";
		showModal.value = true;
	}

	async function confirmDelete() {
		if (!deletingBook.value) return;
		await deleteBook(deletingBook.value.id);
		deletingBook.value = null;
	}

	async function handleSubmit(payload: { title: string; author: string; coverFile: File | null }) {
		saving.value = true;
		submitError.value = "";
		try {
			if (editingBook.value) {
				await updateBook(editingBook.value.id, payload);
			} else {
				await addBook(payload);
			}
			showModal.value = false;
		} catch (err) {
			submitError.value = err instanceof Error ? err.message : "Something went wrong. Please try again.";
		} finally {
			saving.value = false;
		}
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
			<div v-for="book in books" :key="book.id" class="w-36">
				<RouterLink :to="`/book/${book.id}/editor`" class="group block">
					<div
						class="relative flex aspect-2/3 overflow-hidden rounded-md bg-linear-to-br from-grad-start to-grad-end shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl"
						:class="{ '-translate-y-1 shadow-xl': openMenuId === book.id }">
						<img
							v-if="book.cover_image"
							:src="book.cover_image"
							alt=""
							class="absolute inset-0 h-full w-full object-cover" />
						<button
							type="button"
							aria-label="Edit book"
							class="absolute right-2 top-2 cursor-pointer rounded-md bg-black/40 p-1.5 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/60 group-hover:opacity-100"
							@click.prevent.stop="openEdit(book)">
							<Pencil class="h-4 w-4" />
						</button>
					</div>
				</RouterLink>

				<div class="mt-2 flex items-start justify-between gap-1">
					<div class="min-w-0">
						<h3 class="text-sm font-medium leading-tight text-ink">{{ book.title }}</h3>
						<p class="mt-1 text-xs text-muted">{{ book.author || "Unknown author" }}</p>
					</div>

					<div class="relative shrink-0">
						<button
							type="button"
							aria-label="Book options"
							class="cursor-pointer rounded-md p-1 text-muted transition hover:bg-surface hover:text-ink"
							@click="toggleMenu(book.id)">
							<MoreHorizontal class="h-4 w-4" />
						</button>

						<div
							v-if="openMenuId === book.id"
							class="absolute left-0 top-full z-20 mt-0.5 w-32 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg">
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm text-ink transition hover:bg-canvas"
								@click="
									openEdit(book);
									openMenuId = null;
								">
								<Pencil class="h-4 w-4" />
								Edit
							</button>
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm text-ink transition hover:bg-canvas"
								@click="
									deletingBook = book;
									openMenuId = null;
								">
								<Trash2 class="h-4 w-4" />
								Delete
							</button>
						</div>
					</div>
				</div>
			</div>

			<button
				@click="openCreate()"
				class="group/add flex aspect-2/3 w-36 cursor-pointer flex-col items-center justify-center gap-2 self-start rounded-md border-2 border-dashed border-line text-muted transition hover:border-violet hover:text-ink">
				<Plus class="h-8 w-8 transition group-hover/add:scale-110" />
				<span class="text-xs">New book</span>
			</button>
		</div>

		<div v-if="openMenuId" class="fixed inset-0 z-10" @click="openMenuId = null"></div>
		<NewBookModal
			v-if="showModal"
			:book="editingBook"
			:saving="saving"
			:error="submitError"
			@close="showModal = false"
			@submit="handleSubmit" />

		<div
			v-if="deletingBook"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="deletingBook = null">
			<div class="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-ink">Delete book?</h2>
				<p class="mt-2 text-sm text-muted">Delete “{{ deletingBook.title }}”? This can’t be undone.</p>
				<div class="mt-6 flex justify-end gap-2">
					<button
						type="button"
						class="cursor-pointer rounded-full px-4 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
						@click="deletingBook = null">
						Cancel
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
						@click="confirmDelete">
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
