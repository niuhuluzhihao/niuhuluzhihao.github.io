import { createContentLoader } from 'vitepress'

/** 标签大小写归一化映射 */
const TAG_NORMALIZE: Record<string, string> = {
  llm: 'LLM',
  'Functioning call': 'Function Call',
  'Function call': 'Function Call',
  'functioning call': 'Function Call',
}

function normalizeTag(tag: string): string {
  return TAG_NORMALIZE[tag] ?? TAG_NORMALIZE[tag.toLowerCase()] ?? tag
}

export interface Post {
  title: string
  subtitle?: string
  date: string
  author: string
  tags: string[]
  url: string
  excerpt?: string
  readTime?: number
  mathjax?: boolean
  catalog?: boolean
  published?: boolean
}

/** 按中文 ~350 字/分钟 估算阅读时长（分钟，最小 1） */
function estimateReadTime(src?: string): number {
  if (!src) return 1
  const text = src.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`~\-!\[\]()]/g, ' ')
  const cjk = (text.match(/[一-龥]/g) || []).length
  const words = (text.match(/[a-zA-Z0-9]+/g) || []).length
  return Math.max(1, Math.round(cjk / 350 + words / 200))
}

interface YearGroup {
  year: number
  posts: Post[]
}

interface PostsData {
  posts: Post[]
  yearGroups: YearGroup[]
  allTags: string[]
}

export default createContentLoader('posts/*.md', {
  excerpt: true,
  includeSrc: true,
  transform(raw): PostsData {
    const posts: Post[] = raw
      .map((item) => ({
        title: item.frontmatter.title as string,
        subtitle: item.frontmatter.subtitle as string | undefined,
        date: (item.frontmatter.date as string) || extractDateFromPath(item.url),
        author: (item.frontmatter.author as string) || 'NiuHuLu',
        tags: ((item.frontmatter.tags as string[]) || [])
          .map(normalizeTag)
          .filter((t, i, arr) => arr.indexOf(t) === i),
        url: item.url.replace(/\.md$/, ''),
        excerpt: item.excerpt?.replace(/\n/g, ' ').slice(0, 200),
        readTime: estimateReadTime(item.src),
        mathjax: item.frontmatter.mathjax as boolean | undefined,
        published: item.frontmatter.published as boolean | undefined,
      }))
      .filter((p) => p.published !== false)
      .sort((a, b) => (b.date > a.date ? 1 : -1))

    // 按年分组
    const yearMap = new Map<number, Post[]>()
    for (const post of posts) {
      const year = new Date(post.date).getFullYear()
      if (!yearMap.has(year)) yearMap.set(year, [])
      yearMap.get(year)!.push(post)
    }

    const yearGroups: YearGroup[] = [...yearMap.entries()]
      .sort(([a], [b]) => b - a)
      .map(([year, posts]) => ({ year, posts }))

    // 所有标签（去重排序）
    const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort()

    return { posts, yearGroups, allTags }
  },
})

/** 从文件路径提取日期，如 posts/2022-06-30-slug -> 2022-06-30 */
function extractDateFromPath(url: string): string {
  const match = url.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : '2020-01-01'
}
