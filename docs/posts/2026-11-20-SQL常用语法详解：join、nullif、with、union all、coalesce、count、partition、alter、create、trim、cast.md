---
title: "SQL 常用语法详解：join、nullif、with、union all、coalesce、count、partition、alter、create、trim、cast"
subtitle: "从原理到易错点，配可运行的小例子"
author: "NiuHuLu"
tags:
  - SQL
  - Spark SQL
  - 数仓
---

# SQL 常用语法详解：join、nullif、with、union all、coalesce、count、partition、alter、create、trim、cast

这些语法是日常写 SQL 用得最多的：**join（表连接）、nullif（值规范化）、with（CTE）、union all（垂直合并）、coalesce（取第一个非空值）、count（计数）、partition（分组开窗）、alter / create（建表改表）、trim（去空白）、cast（类型转换）**。每个都从原理讲起，配小例子，最后汇总成协同用法和易错点清单。

---

## 一、join：按键配对，把两张表拼在一起

### 1.1 基本原理

join 的语义一句话：**左边表的每一行，去右边表里找"join 键值相同"的行，找到几行就配出几对**。

```sql
-- 语法
FROM 表A a
JOIN 表B b ON a.某字段 = b.某字段
```

### 1.2 最简单的例子

**客户表 customers：**

| user_no | name |
|---------|------|
| U1 | 张三 |
| U2 | 李四 |

**订单表 orders：**

| user_no | order_id |
|---------|----------|
| U1 | D001 |
| U1 | D002 |
| U2 | D003 |

```sql
SELECT c.user_no, c.name, o.order_id
FROM customers c
JOIN orders o ON c.user_no = o.user_no;
```

配对过程：

```text
张三（U1）→ orders 里找 user_no=U1 → 找到 D001、D002 两行 → 配出 2 对
李四（U2）→ orders 里找 user_no=U2 → 找到 D003 一行     → 配出 1 对
```

**结果（3 行）：**

| user_no | name | order_id |
|---------|------|----------|
| U1 | 张三 | D001 |
| U1 | 张三 | D002 |
| U2 | 李四 | D003 |

注意：**张三的姓名出现了两次**——因为他有 2 个订单。这不是数据重复，是 join 的数学必然：**结果行数 = 左边每行匹配到的右边行数之和**。

### 1.3 关键认知：join 键的粒度决定"什么被复制"

换个场景就看出区别。订单表里每条订单记录了"下单时的客服"和"收货城市"：

**orders 扩展版：**

| user_no | order_id | city |
|---------|----------|------|
| U1 | D001 | 北京 |
| U1 | D002 | 上海 |

现在想给订单标注客户等级，客户表里张三是 VIP：

```sql
-- 按用户维度配：一个用户一条等级信息
JOIN customer_level l ON o.user_no = l.user_no
-- 张三是 VIP → D001 标上 VIP，D002 也标上 VIP（每个订单都要知道客户等级，合理 ✅）

-- 改成按城市配（假设等级表是按城市统计的）
JOIN city_level l ON o.city = l.city
-- 北京的等级只会标在 D001 上
```

**同一个"标注"动作，join 键选 user_no 还是选 city，复制的结果完全不同。** 写 join 之前先问自己：这个信息属于什么粒度？属于"人"就按人的键连，属于"订单"就按订单的键连。**用错粒度的键，要么信息被错误复制、要么该有的行没配上**——这是实际工作里最常见的 join 事故。

### 1.4 inner join vs left join

| 类型 | 语义 | 左边某行在右边配不上时 |
|------|------|----------------------|
| `JOIN`（inner join） | 只保留配对成功的行 | **整行丢弃** |
| `LEFT JOIN`（左连接） | 以左表为基准 | 保留该行，右边字段全部填 NULL |

```sql
-- 客户表里加一个没下过单的 U3 王五

-- inner join：王五没订单，被丢弃 → 结果只有 3 行
SELECT c.name, o.order_id
FROM customers c
JOIN orders o ON c.user_no = o.user_no;

-- left join：王五保留，订单号显示 NULL → 结果 4 行
SELECT c.name, o.order_id
FROM customers c
LEFT JOIN orders o ON c.user_no = o.user_no;
```

left join 结果：

| name | order_id |
|------|----------|
| 张三 | D001 |
| 张三 | D002 |
| 李四 | D003 |
| 王五 | **NULL** |

**什么时候用 left join**：左表是"主数据"（人、订单这类不能丢的实体），右表是"补充信息"（有没有都行）。

### 1.5 多表链式 join

```sql
SELECT ...
FROM orders o
LEFT JOIN customers c ON o.user_no = c.user_no      -- 补客户信息
LEFT JOIN products  p ON o.product_id = p.product_id -- 补商品信息
LEFT JOIN payments  pay ON o.order_id = pay.order_id; -- 补支付信息
```

每多一个 left join 多拼一批列。**注意行数**：任何一个右表如果按 join 键不是唯一的（比如一个订单多笔支付），行数就会翻倍膨胀——多表 join 后行数对不上预期时，先逐个检查每个右表的键唯一性。

---

## 二、nullif：把"特定值"变成 NULL

### 2.1 语法与语义

```sql
nullif(值, 目标值)
-- 值 = 目标值  → 返回 NULL
-- 值 ≠ 目标值 → 返回 值 本身
```

最常见的目标值是空字符串 `''`——**把空串规范化成 NULL**。

### 2.2 例子

```sql
SELECT nullif('操作中断', '') AS a,   -- '操作中断'（不等于空串，原样返回）
       nullif('',        '') AS b,   -- NULL（等于空串）
       nullif('   ',     '') AS c,   -- '   '（注意：三个空格 ≠ 空串！）
       nullif(NULL,      '') AS d;   -- NULL
```

实战中几乎总是配合 `trim`（去首尾空格）一起用：

```sql
nullif(trim(remark), '') AS remark_clean
```

| 输入 remark | trim 后 | nullif(x, '') 结果 |
|------------|--------|-------------------|
| `'操作中断'` | `'操作中断'` | `'操作中断'` |
| `'  '` | `''` | **NULL** |
| `''` | `''` | **NULL** |
| `NULL` | `NULL` | `NULL` |

### 2.3 为什么需要它：空串和 NULL 是两种"没有"

| | 空字符串 `''` | `NULL` |
|---|-------------|--------|
| 含义 | 字段有值，值是空文本（往往是脏数据） | 字段没有值（语义上的"无"） |
| `WHERE x IS NULL` 能筛到吗 | ❌ 筛不到 | ✅ 能 |
| 参与计算 `x + 1` | 正常算 | 结果为 NULL |

把 `''` 和 `'   '` 统一成 NULL 后，`WHERE x IS NULL` 才能正确筛出全部"没有值"的行，`COUNT(x)` 也会正确忽略它们。**这是入库/清洗阶段最标准的空值规范化动作。**

另一个常见用法——**避免除零**：

```sql
amount / nullif(qty, 0) AS unit_price
-- qty = 0 时 nullif 返回 NULL，除法结果为 NULL（而不是报错）
```

---

## 三、with（CTE）：给中间结果起名字

### 3.1 语法

```sql
WITH 名字1 AS (
    SELECT ...
),
名字2 AS (            -- 可以引用名字1
    SELECT ... FROM 名字1
),
名字3 AS (            -- 可以引用名字1、名字2
    SELECT ...
)
SELECT ... FROM 名字3;   -- 主查询
```

CTE = Common Table Expression（公用表表达式）。**作用：把一步计算包装成有名字的临时结果，后面的步骤按名字引用**——像编程里的变量。

### 3.2 例子：三层接力

需求：找出消费额排前 10 的用户，再查他们的订单明细。

不写 CTE 的版本（子查询嵌套，难读）：

```sql
SELECT o.*
FROM orders o
JOIN (
    SELECT user_no, SUM(amount) AS total
    FROM orders
    GROUP BY user_no
    ORDER BY total DESC
    LIMIT 10
) top10 ON o.user_no = top10.user_no;
```

CTE 版本（每步有名字，像流水线）：

```sql
WITH user_total AS (                  -- 第一步：每人消费总额
    SELECT user_no, SUM(amount) AS total
    FROM orders
    GROUP BY user_no
),
top10 AS (                            -- 第二步：取前 10
    SELECT user_no, total
    FROM user_total
    ORDER BY total DESC
    LIMIT 10
)
SELECT o.*, t.total                   -- 第三步：回查订单明细
FROM orders o
JOIN top10 t ON o.user_no = t.user_no;
```

### 3.3 CTE 的三个价值

1. **可读**：每个 CTE 一个语义（"算总额"→"取前十"→"回查明细"），长 SQL 变成流水线说明书
2. **复用**：同一个中间结果多处引用时不用复制粘贴子查询
3. **可调试**：想看中间结果，把单个 CTE 抠出来单独跑 `SELECT * FROM user_total LIMIT 10`

### 3.4 经典套路：CTE + row_number 去重

上游表一个键多条记录（比如订单被多次更新）时，"按业务键保留最新一条"的标准姿势：

```sql
WITH ranked AS (
    SELECT *,
           row_number() OVER (
               PARTITION BY order_id              -- 按订单分组
               ORDER BY updated_at DESC           -- 组内按更新时间倒排（最新在前）
           ) AS rn
    FROM orders
)
SELECT * FROM ranked WHERE rn = 1;                 -- 每组只留第 1 名
```

三步曲：**开窗编号 → 取 rn=1 → 得到去重表**。数仓 ETL 里出现频率最高的模式。

### 3.5 注意

- CTE **只在同一条语句内有效**，下一条 SQL 不能引用（要跨语句就落临时表）
- 版本较老的 MySQL（< 8.0）不支持 CTE，用子查询替代

---

## 四、union all：把结构相同的表上下摞

### 4.1 语法与语义

```sql
SELECT 列1, 列2 FROM 表A
UNION ALL
SELECT 列1, 列2 FROM 表B
```

把两段查询结果**竖着拼接**：A 的行在上，B 的行在下。

**例子：**

```sql
SELECT '手机' AS channel, order_id FROM mobile_orders
UNION ALL
SELECT '网页' AS channel, order_id FROM web_orders;
```

| channel | order_id |
|---------|----------|
| 手机 | D001 |
| 手机 | D002 |
| 网页 | D003 |
| 网页 | D004 |

### 4.2 union all vs union

| 写法 | 去重 | 性能 |
|------|------|------|
| `UNION ALL` | **不去重**，全部保留 | 快（无需跨段洗牌） |
| `UNION` | 两段合并后去重（完全相同的行只留一条） | 慢（要 shuffle/排序） |

**确定两段数据不重复（或重复无害）时，优先 union all。**

```sql
-- union 的典型场景：合并两份可能有交集的名单后去重
SELECT user_no FROM vip_list
UNION                    -- 去重：同时出现在两份名单的人只留一条
SELECT user_no FROM white_list;

-- union all 的典型场景：两段数据天然不重叠（不同日期/不同来源），硬去重浪费性能
SELECT * FROM orders_2024
UNION ALL                -- 历史分区按天拆表，不可能重复
SELECT * FROM orders_2025;
```

### 4.3 进阶用法：不同实体的行堆进同一张表（互补占位）

两类结构相似但内容互斥的数据共用一张表时，用 `CAST(NULL AS 类型)` 占位对齐：

```sql
-- 把"商品行"和"赠品行"堆进同一张明细表，同一行要么是商品要么是赠品
SELECT
    order_id,
    product_name,
    price,
    CAST(NULL AS string) AS gift_name,      -- 商品行：赠品列占位
    CAST(NULL AS int)    AS gift_value
FROM order_products

UNION ALL

SELECT
    order_id,
    CAST(NULL AS string) AS product_name,   -- 赠品行：商品列占位
    CAST(NULL AS decimal) AS price,
    gift_name,
    gift_value
FROM order_gifts;
```

| order_id | product_name | price | gift_name | gift_value |
|----------|-------------|-------|-----------|-----------|
| O1 | 手机壳 | 39.00 | NULL | NULL |
| O1 | NULL | NULL | 贴膜 | 10 |
| O1 | NULL | NULL | 挂绳 | 5 |

**设计意图**：商品和赠品本没有一一对应关系，硬拼在同一行会错位；垂直堆叠 + 互补填 NULL，下游按列判别（`WHERE product_name IS NOT NULL` 数商品，`WHERE gift_name IS NOT NULL` 数赠品），行数 = 真实明细数。

### 4.4 两个注意点

1. **两段的列数、列类型、列序必须一致**——类型不一致时 Spark 会直接报错，用 `CAST(NULL AS 类型)` 对齐
2. **最终列名以第一段为准**——第一段叫 `product_name`，第二段同位置列即使起别名也会被忽略

---

## 五、coalesce：从左到右取第一个非空值

### 5.1 语法与语义

```sql
coalesce(值1, 值2, 值3, ...)
-- 值1 非空 → 返回值1
-- 值1 为空 → 看值2 …… 依此类推
-- 全为空   → 返回 NULL
```

相当于编程里的 `a ?? b ?? c`（空值合并运算符）。

### 5.2 例子：多渠道联系方式取优先级

**user_contact 表：**

| user_no | mobile | phone | email |
|---------|--------|-------|-------|
| U1 | 138... | NULL | a@x.com |
| U2 | NULL | 010... | NULL |
| U3 | NULL | NULL | NULL |

```sql
SELECT user_no,
       coalesce(mobile, phone, email, '无联系方式') AS best_contact
FROM user_contact;
```

| user_no | best_contact |
|---------|--------------|
| U1 | 138...（手机优先） |
| U2 | 010...（没手机用座机） |
| U3 | 无联系方式（全空走兜底） |

### 5.3 常见用法速查

```sql
-- 1. null 参与计算会传染（null + 1 = null），先兜底
coalesce(amount, 0) + 100

-- 2. 聚合时忽略 null
SUM(coalesce(price, 0))

-- 3. 显示层占位
coalesce(remark, '暂无备注')

-- 4. 判断"任一渠道有值"
coalesce(mobile, phone, email) IS NOT NULL

-- 5. 与 nullif 配对：先把空串规范成 null，再兜底
coalesce(nullif(trim(nickname), ''), '未设置昵称')
```

### 5.4 coalesce vs ifnull/nvl

各数据库都有简化版（只支持两个参数）：

| 通用 | MySQL | Oracle/Hive | 参数个数 |
|------|-------|-------------|---------|
| `COALESCE(a, b, c...)` | `IFNULL(a, b)` | `NVL(a, b)` | coalesce 任意个，简化版只有 2 个 |

**写跨库兼容的 SQL 用 coalesce**（它是 SQL 标准）；只在单库环境且只有两个参数时可以用简化版。

### 5.5 一个语义陷阱

coalesce 只负责"取第一个非空"，**不负责判断兜底值是否语义正确**：

```sql
-- 想取"订单的发货单号"，发货单没生成时退回订单号
coalesce(ship_no, order_no) AS tracking_no
```

如果下游把 `tracking_no` 一律当发货单号做物流跟踪，order_no 兜底进去的那些行就会查无此单——**工具正确 ≠ 语义正确，兜底策略要业务确认**。

---

## 六、count：数数，但有好几种数法

### 6.1 四种写法的区别

```sql
SELECT
    COUNT(*)                 AS cnt_all,     -- 数行数（含 NULL 行）
    COUNT(user_no)           AS cnt_user,    -- 数 user_no 非 NULL 的行数
    COUNT(1)                 AS cnt_one,     -- 同 COUNT(*)，数行数
    COUNT(DISTINCT user_no)  AS cnt_distinct -- user_no 去重后计数（NULL 也被忽略）
FROM orders;
```

**例子数据：**

| order_id | user_no |
|----------|---------|
| D001 | U1 |
| D002 | U1 |
| D003 | NULL |
| D004 | U2 |

```sql
SELECT COUNT(*) AS a, COUNT(user_no) AS b, COUNT(DISTINCT user_no) AS c FROM orders;
```

| a（行数） | b（非空值数） | c（去重人数） |
|-----------|--------------|--------------|
| 4 | 3 | 2 |

### 6.2 关键差异表

| 写法 | NULL 行 | 重复值 | 典型用途 |
|------|--------|--------|---------|
| `COUNT(*)` | ✅ 计入 | ✅ 计入 | 数总行数（多少条记录） |
| `COUNT(列)` | ❌ 忽略 | ✅ 计入 | 数"该字段有值"的行数 |
| `COUNT(DISTINCT 列)` | ❌ 忽略 | ❌ 去重 | 数"有多少个不同的值"（多少人） |

**最容易踩的坑：把"数订单"和"数客户"搞混。**

```sql
-- ❌ 错：一个客户 3 张订单，"客户数"被数成 3
SELECT COUNT(user_no) AS 客户数 FROM orders;

-- ✅ 对：客户数要按人去重
SELECT COUNT(DISTINCT user_no) AS 客户数 FROM orders;
```

反过来也一样：数订单时千万别手滑加 DISTINCT，订单数会莫名变少。

### 6.3 count + group by：分组计数

```sql
-- 每个客户的订单数
SELECT user_no, COUNT(*) AS order_cnt
FROM orders
GROUP BY user_no;
```

| user_no | order_cnt |
|---------|-----------|
| U1 | 2 |
| U2 | 1 |

注意 **`GROUP BY` 之后 SELECT 里只能出现"分组键 + 聚合函数"**——`SELECT user_no, amount, COUNT(*)` 会报错（amount 不是分组键也不是聚合，每组里有多个 amount 不知道取哪个）。

### 6.4 条件计数：count(case when ...)

"每个客户的退款订单数和总订单数一起数"：

```sql
SELECT
    user_no,
    COUNT(*) AS total_cnt,
    COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refunded_cnt
FROM orders
GROUP BY user_no;
```

原理：`CASE WHEN ... THEN 1 END` 不命中时返回 NULL，而 **COUNT(列) 忽略 NULL**——所以只有退款的行被数进 refunded_cnt。这个"条件计数"模式是报表 SQL 的主力写法，也可以写成 `SUM(CASE WHEN ... THEN 1 ELSE 0 END)`（效果等价）。

---

## 七、partition（开窗）：分组但不折叠行

### 7.1 它和 group by 的本质区别

**group by 把组"折叠"成一行；partition by 保留每一行，只是给每行标注"组内信息"。**

```sql
-- group by：4 行订单 → 折叠成 2 行（每组一行）
SELECT user_no, COUNT(*) FROM orders GROUP BY user_no;

-- partition by：4 行订单 → 还是 4 行，每行多一列"该客户的订单总数"
SELECT
    order_id, user_no, amount,
    COUNT(*) OVER (PARTITION BY user_no) AS user_order_cnt
FROM orders;
```

partition 版结果：

| order_id | user_no | amount | user_order_cnt |
|----------|---------|--------|----------------|
| D001 | U1 | 100 | 2 |
| D002 | U1 | 200 | 2 |
| D004 | U2 | 300 | 1 |
| D003 | NULL | 50 | 1 |

**一句话区分：想"每组一行汇总"用 group by；想"每行带上组内统计/排名"用 partition by。**

### 7.2 标准语法结构

```sql
函数(...) OVER (
    PARTITION BY 分组键        -- 按什么分组（可省略 = 全表一组）
    ORDER BY 排序键            -- 组内按什么排序（排名类函数必须；聚合类可省）
)
```

### 7.3 常用开窗函数一览

```sql
SELECT
    order_id, user_no, amount,
    -- ── 排名类 ──
    ROW_NUMBER() OVER (PARTITION BY user_no ORDER BY amount DESC) AS rn,       -- 1,2,3 严格连号
    RANK()       OVER (PARTITION BY user_no ORDER BY amount DESC) AS rnk,      -- 并列同名次，跳号
    DENSE_RANK() OVER (PARTITION BY user_no ORDER BY amount DESC) AS drnk,     -- 并列同名次，不跳号
    -- ── 聚合类（组内聚合但不折叠行）──
    SUM(amount)  OVER (PARTITION BY user_no) AS user_total,          -- 该客户累计金额
    AVG(amount)  OVER (PARTITION BY user_no) AS user_avg,            -- 该客户平均单价
    -- ── 取值类 ──
    LAG(amount)  OVER (PARTITION BY user_no ORDER BY order_date) AS prev_amt,   -- 上一行的值
    LEAD(amount) OVER (PARTITION BY user_no ORDER BY order_date) AS next_amt    -- 下一行的值
FROM orders;
```

金额并列时三兄弟的差别（两个并列第 2 名）：

| ROW_NUMBER | RANK | DENSE_RANK |
|-----------|------|------------|
| 1, 2, 3, 4（强制唯一） | 1, 2, 2, 4（并列跳号） | 1, 2, 2, 3（并列不跳号） |

### 7.4 最常用的套路：partition + row_number 去重取最新

第三章 CTE 提过这个三步曲，这里完整展开：

```sql
-- 需求：订单表一个订单多条更新记录，每个订单只要最新一条
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY order_id          -- ① 按订单分组
               ORDER BY updated_at DESC       -- ② 组内最新在前
           ) AS rn
    FROM orders
)
SELECT * FROM ranked WHERE rn = 1;            -- ③ 每组取第 1 名
```

执行画面（订单 O1 有 3 条更新记录）：

| order_id | updated_at | amount | rn |
|----------|-----------|--------|----|
| O1 | 11-03 | 300 | **1** ← 留下 |
| O1 | 11-02 | 200 | 2 |
| O1 | 11-01 | 100 | 3 |

**为什么不用 group by + max**：`GROUP BY order_id, MAX(updated_at)` 只能拿到最新时间，拿不到"最新那一行的其他列"（amount 等）。开窗编号是"按组取整行"的标准答案。

### 7.5 进阶：组内 TopN

```sql
-- 每个客户金额最高的 2 笔订单
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY user_no ORDER BY amount DESC) AS rn
    FROM orders
)
SELECT * FROM ranked WHERE rn <= 2;
```

group by 做不到"组内取前 N 行"（它只能折叠成一行），这是 partition 的独门能力。

---

## 八、create / alter：建表与改表

### 8.1 create table：建表

**基础版：**

```sql
CREATE TABLE users (
    user_no     VARCHAR(32)   COMMENT '用户号',
    name        VARCHAR(64)   COMMENT '姓名',
    level       VARCHAR(16)   COMMENT '客户等级',
    reg_date    DATE          COMMENT '注册日期'
);
```

**数仓分区表版（Hive/Spark 风格）：**

```sql
CREATE TABLE IF NOT EXISTS dw.orders (
    order_id     STRING        COMMENT '订单号',
    user_no      STRING        COMMENT '用户号',
    amount       DECIMAL(18,2) COMMENT '金额',
    status       STRING        COMMENT '订单状态'
)
COMMENT '订单明细表'
PARTITIONED BY (pday STRING COMMENT '分区日期，yyyyMMdd')  -- ← 分区列
STORED AS ORC;                                             -- ← 列式存储格式
```

数仓建表三件套说明：

| 部分 | 作用 |
|------|------|
| `IF NOT EXISTS` | 表已存在时不报错（幂等，重跑脚本安全） |
| `PARTITIONED BY (pday)` | 按日期分区：每天一个子目录，查询带分区条件只扫当天数据，**大表性能的生命线** |
| `STORED AS ORC/PARQUET` | 列式存储 + 压缩，比文本格式省空间且查询快 |

**分区表写入：**

```sql
-- 静态分区：写死分区值
INSERT OVERWRITE TABLE dw.orders PARTITION (pday = '20261119')
SELECT ...;

-- 动态分区：分区值由数据里的列决定（需先开启动态分区配置）
INSERT OVERWRITE TABLE dw.orders PARTITION (pday)
SELECT ..., order_date AS pday FROM ...;
```

`INSERT OVERWRITE` = 覆盖写（重跑当天任务不产生重复数据，数仓每日任务的标准写法）；`INSERT INTO` = 追加写。

### 8.2 alter：改表

**加列（最常用）：**

```sql
ALTER TABLE dw.orders
ADD COLUMNS (pay_channel STRING COMMENT '支付渠道');
```

**改列名 / 改类型 / 改注释（一箭三雕的语法）：**

```sql
ALTER TABLE dw.orders
CHANGE COLUMN amount order_amount DECIMAL(20,2) COMMENT '订单总金额';
--               ↑旧名    ↑新名        ↑新类型            ↑新注释
```

**改表名：**

```sql
ALTER TABLE dw.orders RENAME TO dw.orders_v2;
```

**删除/替换列（Spark 语法，危险操作）：**

```sql
-- 删除一列
ALTER TABLE dw.orders DROP COLUMNS (pay_channel);

-- 整体替换列定义（一次性重排全部列，慎用）
ALTER TABLE dw.orders REPLACE COLUMNS (
    order_id STRING COMMENT '订单号',
    user_no  STRING COMMENT '用户号',
    amount   DECIMAL(18,2) COMMENT '金额'
);
```

### 8.3 上线必知：create if not exists 不会给已存在的表加列

**这是数仓事故高发点**：线上表已经存在 4 列，你改了脚本加了第 5 列，重新执行 `CREATE TABLE IF NOT EXISTS`——**不会报错，也不会加列**（"已存在就跳过"）。此时直接跑新版写入，会因列数不匹配报 `INSERT_COLUMN_ARITY_MISMATCH`。

**正确流程（加列上线三步）：**

```sql
-- ① 线上表先手动执行 ALTER 加列
ALTER TABLE dw.orders ADD COLUMNS (pay_channel STRING COMMENT '支付渠道');

-- ② 确认表结构（列数对了）
DESC dw.orders;

-- ③ 再跑新版的 INSERT（列数匹配才能写入）
```

顺序不能反：必须先 ALTER 再跑新 ETL，且两者在同一个上线窗口切换——新表 5 列、老 ETL 写 4 列同样会炸。

### 8.4 drop / truncate（了解即可，慎用）

```sql
DROP TABLE dw.orders;                          -- 删表（表+数据+元数据全没）
TRUNCATE TABLE dw.orders;                      -- 清空数据，保留表结构
ALTER TABLE dw.orders DROP PARTITION (pday='20261119');  -- 只删某天的分区（重跑前常用）
```

数仓日常最常用的是 `DROP PARTITION` + 重写：当天数据有问题，删掉当天分区再重跑任务。

---

## 九、trim：去掉首尾空白

### 9.1 语法与语义

```sql
trim(值)          -- 去掉首尾的空格（含制表符等空白字符）
ltrim(值)         -- 只去左边的
rtrim(值)         -- 只去右边的
```

**只动首尾，中间的不动**：

```sql
SELECT trim('  张三  ') AS a,   -- '张三'
       trim('张 三')    AS b,   -- '张 三'（中间的空格保留）
       ltrim('  x ')    AS c,   -- 'x '
       rtrim('  x ')    AS d;   -- '  x'
```

### 9.2 为什么需要它：脏数据配不上的元凶

上游录入的数据经常带首尾空格，肉眼看不出来，但 **join 和比较是逐字符比的**：

| 表 A 的 user_no | 表 B 的 user_no | 相等吗 |
|----------------|----------------|--------|
| `'U1'` | `'U1 '`（尾部多个空格） | ❌ 不相等 |

```sql
-- 没洗数据：尾部空格导致 join 不上，订单莫名丢失
SELECT ... FROM a JOIN b ON a.user_no = b.user_no;

-- 洗过再 join：配上了
SELECT ... FROM a JOIN b ON trim(a.user_no) = trim(b.user_no);
```

这就是为什么数仓 SQL 里 join 键、分区条件、去重键周围总是包着一层 `trim(...)`——**防御上游的空格脏数据**。

### 9.3 黄金搭档：trim + nullif（空值规范化一条龙）

```sql
nullif(trim(remark), '') AS remark_clean
```

执行顺序从内到外：

```text
'  '（两个空格）
  → trim   → ''      （去掉空白后剩空串）
  → nullif → NULL    （空串规范化成 NULL）

' 正常值 '
  → trim   → '正常值'
  → nullif → '正常值'（不等于空串，原样通过）
```

**一行解决三类脏值**：首尾空格、纯空白字符串、空串。这是清洗字符串列的标准姿势，数仓 ETL 里出现频率极高。

### 9.4 注意

- trim **只处理首尾**，想去中间空格用 `replace(x, ' ', '')`（慎用，会把所有空格都杀掉）
- trim **不能把 NULL 变干净**：`trim(NULL)` 还是 NULL（配合 coalesce 用）
- trim 不改变长度固定的类型显示（如 CHAR 定长填充），只影响字符串内容本身

---

## 十、cast：类型转换

### 10.1 语法与语义

```sql
cast(值 AS 目标类型)
-- 转得动 → 返回转换后的值
-- 转不动 → 返回 NULL（Spark/Hive）或报错（MySQL 严格模式）
```

```sql
SELECT cast('123'      AS int)      AS a,   -- 123（字符串转数字）
       cast(123        AS string)   AS b,   -- '123'
       cast('12.5'     AS decimal(10,2)) AS c, -- 12.50
       cast('2026-11-19' AS date)   AS d,   -- 日期 2026-11-19
       cast('abc'      AS int)      AS e;   -- NULL（转不动）
```

### 10.2 为什么需要它：类型不对，SQL 就"不对劲"

类型问题引发的三大症状：

**① 隐式转换的坑：字符串比较数字**

```sql
-- amount 是字符串类型 '9', '10', '100'
SELECT * FROM orders WHERE amount > 15;
-- 字符串比较是逐字符的：'9' > '15'（'9'>'1'）→ 错误命中！
-- 先 cast 再比：
SELECT * FROM orders WHERE cast(amount AS double) > 15;
```

**② join 键类型不一致：配不上**

```sql
-- 表 A 的 id 是 bigint，表 B 的 id 是 string
JOIN b ON a.id = b.id
-- 类型不同可能隐式转换失败或性能崩盘，显式统一：
JOIN b ON cast(a.id AS string) = b.id
```

**③ union all 列类型不齐：直接报错**

```sql
-- 一段是 int，一段是 decimal → Spark 报错；占位对齐必须 cast
SELECT ..., cast(null as int) AS cnt FROM a
UNION ALL
SELECT ..., cnt FROM b
```

（第四章 union all 占位写法里的 `CAST(NULL AS 类型)` 就是它的应用。）

### 10.3 数仓里最常见的 cast 场景

```sql
-- 1. 洗 join 键：类型统一 + 去空格，双保险（数仓出现频率最高的组合）
JOIN b ON trim(cast(a.user_no AS string)) = trim(b.user_no)

-- 2. 分区字段转日期比较
WHERE to_date(cast('${pday}' AS string), 'yyyyMMdd') = to_date(time_connection)

-- 3. decimal → int 是四舍五入（Spark 规则 ROUND_HALF_UP）
SELECT cast(85.50 AS int);   -- 86（不是截断成 85！）
SELECT cast(85.49 AS int);   -- 85

-- 4. null 占位对齐（union all 两段结构统一）
cast(null as string) AS empty_col
```

### 10.4 cast vs 隐式转换：为什么推荐显式写

不写 cast 时数据库会自动转（隐式转换），但规则因库而异、且出错时难排查：

| | 隐式转换 | 显式 cast |
|---|---------|----------|
| 可读性 | 看不出类型假设 | 意图明确 |
| 跨库一致性 | 各家规则不同 | 行为统一 |
| 出错时 | 静默给错数/错结果 | 定位到具体表达式 |
| 性能 | join 列隐式转换可能导致**全表扫描**（索引失效） | 提前转好，索引可用 |

**经验法则：join 键、where 条件里的跨类型比较、union all 对齐——这三处必写显式 cast，其他随意。**

### 10.5 注意

- `cast('abc' AS int)` 在 Spark/Hive 得 NULL，在 MySQL 严格模式直接**报错**——跨库脚本要知道差异
- 小数转整数是**四舍五入不是截断**（Spark: `cast(85.5 as int) = 86`），要截断用 `floor()` / `truncate()`
- cast 不改变原表数据，只影响当前表达式的值
- 字符串转日期要给格式：`to_date(cast(x AS string), 'yyyyMMdd')`（Spark 写法）

---

## 十一、综合：语法协同完成一个真实任务

需求：合并两个渠道的订单，标注客户等级，取每人最新一单，输出联系渠道。

```sql
WITH all_orders AS (                                  -- ④ union all：两渠道订单堆一起
    SELECT order_id, user_no, amount, updated_at,
           'app' AS channel
    FROM app_orders
    UNION ALL
    SELECT order_id, user_no, amount, updated_at,
           'web' AS channel
    FROM web_orders
),
ranked AS (                                           -- ③ with + row_number：每人最新一单
    SELECT *,
           row_number() OVER (
               PARTITION BY user_no
               ORDER BY updated_at DESC
           ) AS rn
    FROM all_orders
),
latest_order AS (
    SELECT * FROM ranked WHERE rn = 1
)
SELECT
    l.user_no,
    l.order_id,
    l.amount,
    c.level,                                          -- ① join：补客户等级
    coalesce(l.channel, '未知') AS channel            -- ⑤ coalesce：兜底
FROM latest_order l
LEFT JOIN customers c ON l.user_no = c.user_no        -- ① left join：没等级的客户也保留
WHERE nullif(trim(l.user_no), '') IS NOT NULL;        -- ② nullif：剔掉空串脏数据
```

每个语法的定位一句话：

| 语法 | 一句话定位 |
|------|-----------|
| `JOIN ... ON` | 按键配对；**键的粒度决定信息怎么复制** |
| `LEFT JOIN` | 左表为基准，配不上保留行填 NULL——主数据不丢 |
| `NULLIF(x, '')` | 空串/特定脏值规范化成 NULL |
| `WITH ... AS` | 中间结果起名字，长 SQL 变流水线，可复用可调试 |
| `UNION ALL` | 结构相同的两段结果上下摞，不去重、性能好 |
| `COALESCE(a, b, c)` | 取第一个非空值，兜底/优先级选择的标准写法 |
| `COUNT(*) / COUNT(列) / COUNT(DISTINCT 列)` | 数行 / 数非空 / 数去重——数什么先想清楚 |
| `PARTITION BY` | 分组但不折叠行，组内排名/取最新/TopN 的基础 |
| `CREATE TABLE ... PARTITIONED BY` | 建表；数仓表必带分区和列式存储 |
| `ALTER TABLE ADD COLUMNS` | 加列；线上表变更唯一安全路径 |
| `TRIM(x)` | 去首尾空白；join 前洗键的标配 |
| `CAST(x AS 类型)` | 显式类型转换；join 键对齐 / union 占位 / 比较前必写 |

---

## 十二、易错点清单

1. **join 键粒度选错**：一对多的键会让行数膨胀；先想清楚"这个信息属于什么粒度"，属于人就按人的键连，属于订单就按订单的键连
2. **NULL 传染**：`NULL + 1 = NULL`、`NULL = NULL` 返回 NULL（不是 true）——判断用 `IS NULL`，计算先 `coalesce`
3. **空串 ≠ NULL**：`WHERE x IS NULL` 捞不到空串，入库前 `nullif(trim(x), '')` 统一
4. **union all 列对齐**：两段列数/类型/列序必须一致，占位用 `CAST(NULL AS 类型)`；列名以第一段为准
5. **union vs union all**：需要跨段去重才用 union，否则白付一次 shuffle 的代价
6. **coalesce 兜底值的语义**：工具只管"取非空"，兜底值对不对要业务确认（拿订单号兜底发货单号做物流查询就是事故）
7. **Spark/Hive 里 NULL 的排序**：`ORDER BY x DESC` 时 NULL 排最后——去重保留"有真实值的行"时可以利用这个特性（NULL 那些行天然排后面）
8. **CTE 只在同一条语句内有效**：跨语句复用要落临时表；MySQL < 8.0 不支持 CTE
9. **多表 join 后行数异常**：逐个检查每个右表按 join 键是否唯一，一个不唯一就全盘膨胀
10. **数客户用了 count(列)**：订单表里数人头必须 `COUNT(DISTINCT user_no)`，直接 COUNT 会把多单客户重复计数
11. **group by 想取"最新一行的其他列"**：`MAX(updated_at)` 只能拿时间拿不到整行——改用 `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC)` 取 rn=1
12. **改了建表脚本就以为线上表变了**：`CREATE TABLE IF NOT EXISTS` 对已存在的表**零效果**，加列必须单独执行 `ALTER TABLE ADD COLUMNS`，且 ALTER 和新 ETL 同窗口上线
13. **分区表全表扫描**：查询大表不带分区条件（`WHERE pday='xxx'`），每天的任务变成全历史扫描
14. **join 不上却看不出原因**：先查首尾空格（`trim` 再 join）和类型不一致（`cast` 成同一类型再 join）——90% 的"配不上"是这两个
15. **小数转整数以为是截断**：`cast(85.5 as int)` 是四舍五入得 86；要截断用 `floor()`
16. **隐式转换让索引失效**：join 列类型不一致时数据库对整列做隐式转换，可能全表扫描——跨类型比较显式 `cast` 提前转好
