<script lang="ts" setup>
	import { ref, computed, onMounted } from "vue";
	import { X, ImagePlus } from "lucide-vue-next";
	import type { Book } from "../stores/books";

	const props = defineProps<{ book?: Book | null }>();

	const emit = defineEmits<{
		close: [];
		submit: [payload: { title: string; author: string; coverFile: File | null }];
	}>();

	const isEdit = computed(() => !!props.book);

	const title = ref(props.book?.title ?? "");
	const author = ref(props.book?.author ?? "");
	const coverFile = ref<File | null>(null);
	const coverPreview = ref(props.book?.cover_image ?? "");
	const titleInput = ref<HTMLInputElement | null>(null);

	onMounted(() => titleInput.value?.focus());

	function onCoverChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0] ?? null;
		coverFile.value = file;
		if (file) coverPreview.value = URL.createObjectURL(file);
	}

	function submit() {
		if (!title.value.trim()) return;
		emit("submit", {
			title: title.value.trim(),
			author: author.value.trim(),
			coverFile: coverFile.value,
		});
	}
</script>

<template>
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
		<div class="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-xl">
			<div class="mb-5 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-ink">{{ isEdit ? "Edit book" : "New book" }}</h2>
				<button
					aria-label="Close"
					class="rounded-md p-1 text-muted transition hover:bg-canvas hover:text-ink"
					@click="emit('close')">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="flex gap-5">
				<label
					class="group relative flex aspect-2/3 w-40 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-md bg-linear-to-br from-violet to-forest text-white/90">
					<img v-if="coverPreview" :src="coverPreview" alt="" class="absolute inset-0 h-full w-full object-cover" />
					<template v-else>
						<ImagePlus class="h-6 w-6" />
						<span class="text-sm font-medium">Add Cover</span>
					</template>

					<div
						v-if="coverPreview"
						class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100">
						<ImagePlus class="h-6 w-6" />
						<span class="text-xs font-medium">Change cover</span>
					</div>

					<input type="file" accept="image/png, image/jpeg, image/webp" class="hidden" @change="onCoverChange" />
				</label>

				<form class="flex flex-1 flex-col gap-4" @submit.prevent="submit">
					<div class="flex flex-col gap-1">
						<label class="text-sm text-muted" for="title">Title</label>
						<input
							id="title"
							v-model="title"
							autofocus
							class="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none transition focus:border-violet"
							required
							type="text" />
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-sm text-muted" for="author">Author</label>
						<input
							id="author"
							v-model="author"
							class="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none transition focus:border-violet"
							type="text" />
					</div>

					<div class="mt-auto flex justify-end gap-2">
						<button
							class="rounded-md px-4 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
							type="button"
							@click="emit('close')">
							Cancel
						</button>
						<button
							class="rounded-md bg-violet px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
							type="submit">
							{{ isEdit ? "Save" : "Create" }}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>
