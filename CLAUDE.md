# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Jekyll 的静态个人技术博客，托管于 GitHub Pages。主题 fork 自 Hux Blog。内容以 AI/大模型/LLM 技术博客为主。

## 常用命令

```bash
# 安装 Ruby 依赖
bundle install

# 本地启动开发服务器（默认 http://localhost:4000）
bundle exec jekyll serve
# 或
npm start

# 开发模式（Grunt 监听 LESS/JS 变化 + Jekyll 服务器）
npm run dev

# 编译 LESS、压缩 JS、添加版权横幅
grunt

# 新建博客文章
rake post title="文章标题" subtitle="副标题"

# 监听 LESS 和 JS 文件变更并自动编译
grunt watch
```

## 构建与部署

- **CI/CD**: 推送到 `main` 分支自动触发 GitHub Actions 构建并部署到 GitHub Pages
- **工作流文件**: `.github/workflows/jekyll-gh-pages.yml`
- 无需手动构建，GitHub Actions 会自动处理 Jekyll 构建

## 项目结构

```
├── _config.yml          # Jekyll 站点配置（标题、SEO、分页、插件等）
├── Gemfile               # Ruby 依赖（jekyll, jekyll-paginate, webrick）
├── Gruntfile.js          # Grunt 任务（LESS 编译、JS 压缩、横幅添加）
├── package.json          # npm 脚本和 Grunt 插件依赖
├── Rakefile              # Rake 任务（新建文章、启动预览）
│
├── _posts/               # 博客文章（Markdown + YAML front-matter）
│   ├── 2025-03-13-标题.md
│   └── ...
│
├── _layouts/             # Liquid 页面布局模板
│   ├── default.html      # 默认布局
│   ├── post.html         # 文章页布局
│   ├── page.html         # 独立页面布局
│   └── keynote.html      # 演讲模式布局
│
├── _includes/            # Liquid 组件（可复用模板片段）
│   ├── head.html         # <head> 标签
│   ├── nav.html          # 导航栏
│   ├── footer.html       # 页脚
│   ├── intro-header.html # 页面头部
│   ├── search.html       # 搜索组件
│   ├── sns-links.html    # 社交链接
│   ├── about/            # 关于页面（中英文）
│   └── ...
│
├── less/                 # LESS 样式源文件
│   ├── hux-blog.less     # 主样式
│   ├── highlight.less    # 代码高亮
│   ├── search.less       # 搜索样式
│   └── ...
│
├── css/                  # 编译后的 CSS
├── js/                   # JavaScript 文件
├── img/                  # 图片资源
└── _doc/                 # 用户文档
    └── Manual.md         # 完整使用手册
```

## 文章规范

文章为 `_posts/` 目录下的 Markdown 文件，文件名格式为 `YYYY-MM-DD-标题.md`，包含 YAML front-matter：

```yaml
---
layout:     post
title:      "文章标题"
subtitle:   "副标题"
date:       2025-03-13 12:00:00
author:     "Hux"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - AI
    - LLM
---
```

## 关键配置说明

- **`_config.yml`**: 站点标题、SEO、分页（每页10篇）、Disqus 评论、侧边栏等
- **高亮引擎**: Rouge（Jekyll 默认），兼容 Pygments 主题
- **Markdown**: kramdown + GFM
- **分页插件**: jekyll-paginate

## 主题开发

- LESS 源文件在 `less/` 目录，编译后输出到 `css/`
- 布局模板使用 Liquid 语法，位于 `_layouts/` 和 `_includes/`
- 修改 LESS 后运行 `grunt less` 或 `grunt` 重新编译
- 修改 JS 后运行 `grunt uglify` 或 `grunt` 重新压缩
