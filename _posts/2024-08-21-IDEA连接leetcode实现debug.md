---
layout:     post
title:      "IDEA中如何连接LeetCode（白嫖）"
date:       2024-08-21 23:10:00
author:     "NiuHuLu"
catalog: false
published: false
header-style: text
tags:
  - 前端
---

# 引言
>最近重新开始刷LeetCode,分享一下如何使用IDEA连接Leetcode并完成配置。

# 前置条件
    IDEA：2023.2.6

# 正文
## 安装LeetCode插件
1、依次按照如下顺序进行点击settings-->Plugins-->LeetCode Editor，直接下载即可。


![](https://niuhuluzhihao.github.io/picx-images-hosting/插件存储位置.58har0oyir.webp)

「插件存储位置」

2、插件下载完成之后。依次点击settings-->Tools-->leetcode Plugine,配置对应的账号密码以及模板文件

![](https://github.com/niuhuluzhihao/picx-images-hosting/raw/master/插件配置.2doml89jcz.webp)

「插件配置」

下面附上模板的结构：
```
codeFileName :
P${question.frontendQuestionId}$!velocityTool.camelCaseName(${question.titleSlug.trim()})
```


```
code Template:
${question.content}
package leetcode.editor.cn;
//Java：${question.title}
public class P${question.frontendQuestionId}$!velocityTool.camelCaseName(${question.titleSlug}){
    public static void main(String[] args) {
        Solution solution = new P$!{question.frontendQuestionId}$!velocityTool.camelCaseName(${question.titleSlug})().new Solution();
        // TO TEST
    }
    ${question.code}
}
```

```
Template Constant:
${question.title}	题目标题	示例:两数之和
${question.titleSlug}	题目标记	示例:two-sum
${question.frontendQuestionId}	题目编号
${question.content}	题目描述
${question.code}	题目代码
$!velocityTool.camelCaseName(str)	转换字符为大驼峰样式（开头字母大写）
$!velocityTool.smallCamelCaseName(str)	转换字符为小驼峰样式（开头字母小写）
$!velocityTool.snakeCaseName(str)	转换字符为蛇形样式
$!velocityTool.leftPadZeros(str,n)	在字符串的左边填充0，使字符串的长度至少为n
$!velocityTool.date()	获取当前时间
```

3、配置好之后就可以轻松实现leetcode进行debug了。

![](https://github.com/niuhuluzhihao/picx-images-hosting/raw/master/debug过程.45m1qmxks.webp)

「debug过程」
