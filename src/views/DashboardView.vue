<script lang="ts" setup>
import {ref} from "vue";

const books = ref([
  {id: 1, title: "The Silver Thread", wordCount: 12400, color: "from-slate-500 to-slate-700"},
  {id: 2, title: "Northwind", wordCount: 3000, color: "from-sky-500 to-indigo-600"},
  {id: 3, title: "Untitled Draft", wordCount: 0, color: "from-gray-400 to-gray-600"},
]);

function addBook() {
  books.value.push({
    id: Date.now(),
    title: "Untitled Draft",
    wordCount: 0,
    color: "from-emerald-500 to-teal-700",
  });
}
</script>

<template>
  <div>
    <h2 class="text-xl font-semibold">Dashboard</h2>
    <p class="mt-2 text-gray-600">Your books</p>

    <div class="mt-6 flex flex-wrap gap-6">
      <div v-for="book in books" :key="book.id"
           class="group w-36 cursor-pointer">
        <div
            :class="book.color"
            class="flex aspect-2/3 items-end rounded-md bg-linear-to-br p-3 shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl">
          <h3 class="text-sm font-semibold leading-tight text-white drop-shadow">{{ book.title }}</h3>
        </div>

        <p class="mt-2 text-xs text-gray-500">{{ book.wordCount.toLocaleString() }} words</p>
      </div>

      <button
          class="group/add flex aspect-2/3 w-36 cursor-pointer flex-col items-center justify-center gap-2 self-start rounded-md border-2 border-dashed border-gray-300 text-gray-400 transition hover:border-gray-500 hover:bg-gray-50 hover:text-gray-600"
          @click="addBook">
        <svg
            class="h-8 w-8 transition group-hover/add:scale-110"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-xs leading-none">New Book</span>
      </button>
    </div>
  </div>
</template>