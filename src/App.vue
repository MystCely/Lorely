<script lang="ts" setup></script>

<template>
  <div class="flex min-h-screen bg-gray-50 text-gray-900">
    <aside class="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
      <h1 class="mb-6 text-lg font-bold">Lorely</h1>
      <nav class="flex flex-col gap-1">
        <RouterLink class="rounded px-3 py-2 hover:bg-gray-100" exact-active-class="bg-gray-100 font-medium"
                    to="/">Dashboard
        </RouterLink>
        <RouterLink class="rounded px-3 py-2 hover:bg-gray-100" exact-active-class="bg-gray-100 font-medium"
                    to="/editor">Editor
        </RouterLink>
        <RouterLink class="rounded px-3 py-2 hover:bg-gray-100" exact-active-class="bg-gray-100 font-medium"
                    to="/planner">Planner
        </RouterLink>
      </nav>
    </aside>

    <main class="flex-1 p-8">
      <RouterView/>
    </main>
  </div>

</template>
