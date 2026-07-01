<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { data as postsData } from '../utils/posts.data.ts'
import { computed, onMounted, onUnmounted, nextTick, ref } from 'vue'

const { Layout } = DefaultTheme
const { frontmatter, page } = useData()

const isBlogPost = computed(() => {
  return page.value.relativePath.startsWith('posts/')
})

const currentIndex = computed(() => {
  if (!isBlogPost.value) return -1
  const url = page.value.relativePath.replace(/\.md$/, '')
  return postsData.posts.findIndex(p => p.url.endsWith(url))
})

const currentPost = computed(() => {
  const idx = currentIndex.value
  return idx >= 0 ? postsData.posts[idx] : null
})

const prevPost = computed(() => {
  const idx = currentIndex.value
  return idx >= 0 && idx < postsData.posts.length - 1 ? postsData.posts[idx + 1] : null
})

const nextPost = computed(() => {
  const idx = currentIndex.value
  return idx > 0 ? postsData.posts[idx - 1] : null
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 回到顶部
const showTop = ref(false)
function onScroll() {
  showTop.value = window.scrollY > 400
}
function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Disqus
const disqusReady = ref(false)

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  if (isBlogPost.value) {
    nextTick(() => {
      setTimeout(() => {
        const existing = document.getElementById('disqus_thread')
        if (existing && !existing.hasChildNodes()) {
          const d = document.createElement('script')
          d.src = 'https://niuhulu.disqus.com/embed.js'
          d.setAttribute('data-timestamp', String(+new Date()))
          document.head.appendChild(d)
          disqusReady.value = true
        }
      }, 500)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Layout>
    <!-- 博客文章：自定义头部 -->
    <template v-if="isBlogPost" #doc-before>
      <div class="post-header">
        <h1>{{ frontmatter.title }}</h1>
        <p v-if="frontmatter.subtitle" class="post-subtitle">{{ frontmatter.subtitle }}</p>
        <div class="post-meta-line">
          <span v-if="frontmatter.date">{{ formatDate(String(frontmatter.date)) }}</span>
          <span v-if="frontmatter.author" class="meta-dot">·</span>
          <span v-if="frontmatter.author">{{ frontmatter.author }}</span>
          <template v-if="currentPost?.readTime">
            <span class="meta-dot">·</span>
            <span>{{ currentPost.readTime }} 分钟阅读</span>
          </template>
        </div>
        <div v-if="frontmatter.tags?.length" class="post-card-tags">
          <a
            v-for="tag in frontmatter.tags"
            :key="tag"
            :href="`/archive?tag=${encodeURIComponent(tag)}`"
            class="post-tag"
          >{{ tag }}</a>
        </div>
      </div>
    </template>

    <!-- 博客文章：上一篇/下一篇 + Disqus -->
    <template v-if="isBlogPost" #doc-after>
      <nav class="post-nav">
        <a v-if="prevPost" :href="prevPost.url" class="post-nav-item is-prev">
          <span class="post-nav-label">← 上一篇</span>
          <span class="post-nav-title">{{ prevPost.title }}</span>
        </a>
        <span v-else class="post-nav-item is-empty"></span>

        <a v-if="nextPost" :href="nextPost.url" class="post-nav-item is-next">
          <span class="post-nav-label">下一篇 →</span>
          <span class="post-nav-title">{{ nextPost.title }}</span>
        </a>
        <span v-else class="post-nav-item is-empty"></span>
      </nav>

      <div class="disqus-container">
        <div id="disqus_thread"></div>
      </div>
    </template>
  </Layout>

  <!-- 回到顶部 -->
  <button
    :class="['back-to-top', { visible: showTop }]"
    aria-label="回到顶部"
    @click="scrollTop"
  >↑</button>
</template>