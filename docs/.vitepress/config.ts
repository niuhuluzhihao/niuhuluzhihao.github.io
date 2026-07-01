import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'NiuHuLu Blog',
  description: '钮祜禄的博客 - 一切只是开始',
  base: '/',
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#000000' }],
    ['meta', { name: 'keywords', content: 'NiuHuLu, 四郎的博客, NiuHuLu Blog, 博客, 个人网站, 前端, Java, 大模型' }],
    ['meta', { property: 'og:site_name', content: 'NiuHuLu Blog' }],
  ],

  themeConfig: {
    search: {
      provider: 'local',
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '归档', link: '/archive' },
      { text: '关于', link: '/about' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/niuhuluzhihao' },
    ],
    outline: {
      level: [2, 3],
      label: '目录',
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },
    lastUpdated: {
      text: '最后更新',
    },
  },

  markdown: {
    math: true,
    image: {
      lazyLoading: true,
    },
    theme: {
      light: 'one-dark-pro',
      dark: 'one-dark-pro',
    },
  },
})
