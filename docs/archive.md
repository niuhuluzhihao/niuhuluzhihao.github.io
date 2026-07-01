---
layout: page
title: 归档
---

<script setup>
import { ref, onMounted } from 'vue'
import BlogArchive from './.vitepress/theme/BlogArchive.vue'

const activeTag = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const tag = params.get('tag')
  if (tag) activeTag.value = tag
})

function updateTag(tag) {
  activeTag.value = tag
  const url = new URL(window.location.href)
  if (tag) {
    url.searchParams.set('tag', tag)
  } else {
    url.searchParams.delete('tag')
  }
  window.history.replaceState({}, '', url)
}
</script>

<BlogArchive :activeTag="activeTag" @update:activeTag="updateTag" />
