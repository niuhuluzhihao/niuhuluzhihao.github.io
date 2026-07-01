<script setup lang="ts">
import { data as postsData } from '../utils/posts.data.ts'
import { computed } from 'vue'

const props = defineProps<{
  activeTag?: string
}>()

defineEmits<{
  'update:activeTag': [tag: string]
}>()

const activeTag = computed(() => props.activeTag || '')

const allTags = computed(() => postsData.allTags)

const filteredGroups = computed(() => {
  if (!activeTag.value) return postsData.yearGroups
  return postsData.yearGroups
    .map(g => ({
      year: g.year,
      posts: g.posts.filter(p => p.tags.includes(activeTag.value)),
    }))
    .filter(g => g.posts.length > 0)
})

const totalCount = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + g.posts.length, 0)
)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="archive-page">
    <header class="archive-header">
      <span class="section-kicker">Archive</span>
      <h1>文章归档</h1>
      <p class="archive-count">共 {{ totalCount }} 篇文章 · {{ allTags.length }} 个标签</p>
    </header>

    <div class="tag-filters">
      <button
        :class="['tag-filter-btn', { active: activeTag === '' }]"
        @click="$emit('update:activeTag', '')"
      >全部</button>
      <button
        v-for="tag in allTags"
        :key="tag"
        :class="['tag-filter-btn', { active: activeTag === tag }]"
        @click="$emit('update:activeTag', tag)"
      >{{ tag }}</button>
    </div>

    <div class="archive-timeline">
      <section v-for="group in filteredGroups" :key="group.year" class="archive-group">
        <h2 class="archive-year">{{ group.year }}</h2>
        <div class="archive-timeline-group">
          <div v-for="post in group.posts" :key="post.url" class="archive-post">
            <time class="archive-post-date">{{ formatDate(post.date) }}</time>
            <a class="archive-post-title" :href="post.url">{{ post.title }}</a>
          </div>
        </div>
      </section>
    </div>

    <p v-if="filteredGroups.length === 0" class="archive-empty">
      该标签下暂无文章
    </p>
  </div>
</template>