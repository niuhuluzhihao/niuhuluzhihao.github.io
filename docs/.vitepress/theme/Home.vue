<script setup lang="ts">
import { data as postsData } from '../utils/posts.data.ts'
import { computed, onMounted, ref } from 'vue'

const recentPosts = computed(() => postsData.posts.slice(0, 6))
const totalPosts = computed(() => postsData.posts.length)
const totalTags = computed(() => postsData.allTags.length)

function formatDate(dateStr: string): { day: string; ym: string } {
  const d = new Date(dateStr)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    ym: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
  }
}

/* ---- scroll reveal ---- */
const cardRefs = ref<(HTMLElement | null)[]>([])

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-in')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  )
  cardRefs.value.forEach((el) => {
    if (el) observer.observe(el)
  })
})
</script>

<template>
  <div class="home">
    <!-- 个人信息区 — Editorial 排版 -->
    <section class="profile">
      <div class="profile-eyebrow">Personal Blog</div>

      <div class="profile-header">
        <div class="profile-body">
          <h1 class="profile-name">
            zhihao
            <span class="profile-alias">NiuHuLu</span>
          </h1>
          <p class="profile-role">
            大模型应用与 AI 工程化 · 算法工程师
            <span class="role-accent">@ 中兴通讯</span>
          </p>
          <p class="profile-bio">
            专注于将大模型能力落地于真实业务场景，从 Text2API 算法设计到多层 Agent 架构的智能运维系统。
            硕士毕业于哈尔滨工业大学。这里记录我的技术思考与实践。
          </p>
          <div class="profile-actions">
            <a href="/about" class="btn btn-primary">了解更多</a>
            <a href="https://github.com/niuhuluzhihao" target="_blank" class="btn btn-ghost">GitHub</a>
            <a href="mailto:maozhihao788@gmail.com" class="btn btn-ghost">Email</a>
          </div>

          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-num">{{ totalPosts }}</span>
              <span class="stat-label">篇文章</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{{ totalTags }}</span>
              <span class="stat-label">话题标签</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{{ new Date().getFullYear() - 2022 }}+</span>
              <span class="stat-label">年写作</span>
            </div>
          </div>
        </div>

        <img
          class="profile-avatar"
          src="https://github.com/niuhuluzhihao.png"
          alt="zhihao"
        />
      </div>
    </section>

    <!-- 最新文章 -->
    <section class="recent">
      <div class="recent-head">
        <div>
          <span class="section-kicker">Latest Writings</span>
          <h2>最新文章</h2>
        </div>
        <a href="/archive" class="recent-more">查看全部 →</a>
      </div>

      <div class="recent-list">
        <article
          v-for="(post, i) in recentPosts"
          :key="post.url"
          ref="cardRefs"
          class="post-card reveal"
        >
          <div class="post-card-main">
            <h3 class="post-card-title">
              <a :href="post.url">{{ post.title }}</a>
            </h3>
            <p v-if="post.subtitle" class="post-card-desc">{{ post.subtitle }}</p>
            <p v-else-if="post.excerpt" class="post-card-desc">{{ post.excerpt }}</p>
            <div class="post-card-meta">
              <div class="post-card-tags">
                <a
                  v-for="tag in post.tags"
                  :key="tag"
                  :href="`/archive?tag=${encodeURIComponent(tag)}`"
                  class="post-tag"
                >{{ tag }}</a>
              </div>
              <span v-if="post.readTime" class="post-card-readtime">{{ post.readTime }} 分钟</span>
            </div>
          </div>
          <time class="post-card-date">
            <span class="date-day">{{ formatDate(post.date).day }}</span>
            <span class="date-ym">{{ formatDate(post.date).ym }}</span>
          </time>
        </article>
      </div>
    </section>
  </div>
</template>