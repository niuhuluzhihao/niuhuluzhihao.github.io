---
title: "详解Dockerfile"
subtitle: "Dockerfile构建镜像完全指南"
date: 2023-06-06 23:10:00
author: "NiuHuLu"
outline: false
published: true
tags:
  - docker
  - 云原生
---

# 详解Dockerfile

## 什么是 Dockerfile

Dockerfile 是一个用来构建/定制镜像的文本文件，文本内容包含了一条条构建镜像所需的指令和说明，是一种被 Docker 程序解释的脚本，每条指令对应 Linux 下面的一条命令。Docker 程序将这些 Dockerfile 指令翻译成真正的 Linux 命令。

Dockerfile 有自己的书写格式和支持的命令，Docker 程序解决这些命令间的依赖关系，类似于 Makefile。Docker 程序将读取 Dockerfile，根据指令生成定制的 image。当我们需要定制自己额外的需求时，只需在 Dockerfile 上添加或者修改指令，重新生成 image 即可，省去了敲命令的麻烦。

Dockerfile 中的每一条指令构建一层，因此每一条指令的内容，就是描述该层应当如何构建。

## Dockerfile 指令详解

| 指令 | 说明 |
|------|------|
| `FROM` | 指定所创建镜像的基础镜像 |
| `MAINTAINER` | 指定维护者信息 |
| `RUN` | 运行命令 |
| `CMD` | 指定启动容器时默认执行的命令 |
| `LABEL` | 指定生成镜像的元数据标签信息 |
| `EXPOSE` | 声明镜像内服务所监听的端口 |
| `ENV` | 指定环境变量 |
| `ADD` | 复制指定的 `<src>` 路径下的内容到容器中的 `<dest>` 路径下，`<src>` 可以为 URL；如果为 tar 文件，会自动解压到 `<dest>` 路径下 |
| `COPY` | 复制本地主机的 `<src>` 路径下的内容到容器中的 `<dest>` 路径下；一般情况下推荐使用 COPY 而不是 ADD |
| `ENTRYPOINT` | 指定镜像的默认入口 |
| `VOLUME` | 创建数据挂载点 |
| `USER` | 指定运行容器时的用户名或 UID |
| `WORKDIR` | 配置工作目录 |
| `ARG` | 指定镜像内使用的参数（例如版本号信息等） |
| `ONBUILD` | 配置当前所创建的镜像作为其他镜像的基础镜像时，所执行的创建操作的命令 |
| `STOPSIGNAL` | 容器退出的信号 |
| `HEALTHCHECK` | 如何进行健康检查，以具体什么指令作为健康检查的标准 |
| `SHELL` | 指定使用 SHELL 时的默认 SHELL 类型 |

Dockerfile 一般分为四部分：基础镜像信息、维护者信息、镜像操作指令和容器启动时执行指令，`#` 为 Dockerfile 中的注释。可以用以下通俗的解释：

- `FROM`: 这个镜像的妈妈是谁
- `MAINTAINER`: 谁负责维护
- `RUN`: 功能
- `ADD`: 给它点创业基金
- `WORKDIR`: 设置当前工作目录
- `VOLUME`: 持久化
- `EXPOSE`: 对外端口
- `CMD`: 指定容器启动后要干的事情

---

### FROM 指定基础镜像

所谓定制镜像，就是以一个镜像为基础，在其上进行定制。而 `FROM` 就是指定基础镜像，因此一个 Dockerfile 中 `FROM` 是必备的指令，并且必须是第一条指令。

在 Docker Hub 上有非常多的高质量的官方镜像，有可以直接拿来使用的服务类的镜像，如 `nginx`、`redis`、`mongo`、`mysql` 等；也有一些方便开发、构建、运行各种语言应用的镜像，如 `node`、`openjdk`、`python` 等。可以在其中寻找一个最符合我们最终目标的镜像为基础镜像进行定制。

如果没有找到对应服务的镜像，官方镜像中还提供了一些更为基础的操作系统镜像，如 `ubuntu`、`debian`、`centos` 等，这些操作系统的软件库为我们提供了更广阔的扩展空间。

除了选择现有镜像为基础镜像外，Docker 还存在一个特殊的镜像，名为 `scratch`。这个镜像是虚拟的概念，并不实际存在，它表示一个空白的镜像。如果你以 `scratch` 为基础镜像的话，意味着你不以任何镜像为基础，接下来所写的指令将作为镜像第一层开始存在。

---

### RUN 指令

`RUN` 指令是用来执行命令行命令的。由于命令行的强大能力，`RUN` 指令在定制镜像时是最常用的指令之一。其格式有两种：

- **shell 格式**：`RUN <命令>`，就像直接在命令行中输入的命令一样
- **exec 格式**：`RUN ["可执行文件", "参数1", "参数2"]`，这更像是函数调用中的格式

**例子**：

```dockerfile
FROM ubuntu:focal
RUN apt-get update
RUN apt-get install -y gcc libc6-dev make
RUN wget -O redis.tar.gz "http://download.redis.io/releases/redis-3.2.5.tar.gz"
RUN mkdir -p /usr/src/redis
RUN tar -xzf redis.tar.gz -C /usr/src/redis --strip-components=1
RUN make -C /usr/src/redis
RUN make -C /usr/src/redis install
```

以上案例中，每一个 `RUN` 的行为，都会新建立一层，在其上执行这些命令，执行结束后，commit 这一层的修改，构成新的镜像。所以上面的这种写法，一共创建了 7 层镜像。这是完全没有意义的，而且很多运行时不需要的东西，都被装进了镜像里，比如编译环境、更新的软件包等等。结果就是产生非常臃肿、非常多层的镜像，不仅仅增加了构建部署的时间，也很容易出错。这是很多初学 Docker 的人常犯的一个错误。

**正确的写法应该是这样**：

```dockerfile
FROM ubuntu:focal
RUN buildDeps='gcc libc6-dev make' \
    && apt-get update \
    && apt-get install -y $buildDeps \
    && wget -O redis.tar.gz "http://download.redis.io/releases/redis-3.2.5.tar.gz" \
    && mkdir -p /usr/src/redis \
    && tar -xzf redis.tar.gz -C /usr/src/redis --strip-components=1 \
    && make -C /usr/src/redis \
    && make -C /usr/src/redis install \
    && rm -rf /var/lib/apt/lists/* \
    && rm redis.tar.gz \
    && rm -r /usr/src/redis \
    && apt-get purge -y --auto-remove $buildDeps
```

首先，之前所有的命令只有一个目的，就是编译、安装 redis 可执行文件。因此没有必要建立很多层，这只是一层的事情。因此，这里没有使用很多个 `RUN` 对一一对应不同的命令，而是仅仅使用一个 `RUN` 指令，并使用 `&&` 将各个所需命令串联起来。将之前的 7 层，简化为了 1 层。

在撰写 Dockerfile 的时候，要经常提醒自己，这并不是在写 Shell 脚本，而是在定义每一层该如何构建。

并且，这里为了格式化还进行了换行。Dockerfile 支持 Shell 类的行尾添加 `\` 的命令换行方式，以及行首 `#` 进行注释的格式。良好的格式，比如换行、缩进、注释等，会让维护、排障更为容易，这是一个比较好的习惯。

此外，还可以看到这一组命令的最后添加了**清理工作的命令**，删除了为了编译构建所需要的软件，清理了所有下载、展开的文件，并且还清理了 apt 缓存文件。这是很重要的一步，之前有说过，镜像是多层存储，每一层的东西并不会在下一层被删除，会一直跟随着镜像。因此镜像构建时，一定要确保每一层只添加真正需要添加的东西，任何无关的东西都应该清理掉。

很多人初学 Docker 制作出了很臃肿的镜像的原因之一，就是忘记了每一层构建的最后一定要清理掉无关文件。

---

### COPY 复制文件

格式：

```dockerfile
COPY <源路径>... <目标路径>
COPY ["<源路径1>",... "<目标路径>"]
```

和 `RUN` 指令一样，也有两种格式，一种类似于命令行，一种类似于函数调用。`COPY` 指令将从构建上下文目录中 `<源路径>` 的文件/目录复制到新的一层的镜像内的 `<目标路径>` 位置。比如：

```dockerfile
COPY package.json /usr/src/app/
```

`<源路径>` 可以是多个，甚至可以是通配符，其通配符规则要满足 Go 的 `filepath.Match` 规则，如：

```dockerfile
COPY hom* /mydir/
COPY hom?.txt /mydir/
```

`<目标路径>` 可以是容器内的绝对路径，也可以是相对于工作目录的相对路径（工作目录可以用 `WORKDIR` 指令来指定）。目标路径不需要事先创建，如果目录不存在会在复制文件前先行创建缺失目录。

此外，还需要注意一点，使用 `COPY` 指令，源文件的各种元数据都会保留。比如读、写、执行权限、文件变更时间等。这个特性对于镜像定制很有用。特别是构建相关文件都在使用 Git 进行管理的时候。

---

### ADD 更高级的复制文件

`ADD` 指令和 `COPY` 的格式和性质基本一致。但是在 `COPY` 基础上增加了一些功能。

比如 `<源路径>` 可以是一个 URL，这种情况下，Docker 引擎会试图去下载这个链接的文件放到 `<目标路径>` 去。下载后的文件权限自动设置为 600，如果这并不是想要的权限，那么还需要增加额外的一层 `RUN` 进行权限调整，另外，如果下载的是个压缩包，需要解压缩，也一样还需要额外的一层 `RUN` 指令进行解压缩。所以不如直接使用 `RUN` 指令，然后使用 `wget` 或者 `curl` 工具下载，处理权限、解压缩、然后清理无用文件更合理。因此，**这个功能其实并不实用，而且不推荐使用**。

如果 `<源路径>` 为一个 tar 压缩文件的话，压缩格式为 `gzip`、`bzip2` 以及 `xz` 的情况下，`ADD` 指令将会自动解压缩这个压缩文件到 `<目标路径>` 去。

在某些情况下，这个自动解压缩的功能非常有用，比如官方镜像 ubuntu 中：

```dockerfile
FROM scratch
ADD ubuntu-xenial-core-cloudimg-amd64-root.tar.gz /
```

但在某些情况下，如果我们真的希望复制个压缩文件进去，而不解压缩，这时就不可以使用 `ADD` 命令了。

在 Docker 官方的 Dockerfile 最佳实践文档中要求，**尽可能的使用 `COPY`**，因为 `COPY` 的语义很明确，就是复制文件而已，而 `ADD` 则包含了更复杂的功能，其行为也不一定很清晰。

最适合使用 `ADD` 的场合，就是所提及的需要自动解压缩的场合。

另外需要注意的是，`ADD` 指令会令镜像构建缓存失效，从而可能会令镜像构建变得比较缓慢。

因此在 `COPY` 和 `ADD` 指令中选择的时候，可以遵循这样的原则，所有的文件复制均使用 `COPY` 指令，仅在需要自动解压缩的场合使用 `ADD`。

---

### CMD 容器启动命令

`CMD` 是 container 启动时执行的命令，但是一个 Dockerfile 中只能有一条 `CMD` 命令，多条则只执行最后一条 `CMD`。

`CMD` 指令的格式和 `RUN` 相似，也是两种格式：

- **shell 格式**：`CMD <命令>`
- **exec 格式**：`CMD ["可执行文件", "参数1", "参数2"...]`
- **参数列表格式**：`CMD ["参数1", "参数2"...]`，在指定了 `ENTRYPOINT` 指令后，用 `CMD` 指定具体的参数

之前介绍容器的时候曾经说过，Docker 不是虚拟机，容器就是进程。既然是进程，那么在启动容器的时候，需要指定所运行的程序及参数。`CMD` 指令就是用于指定默认的容器主进程的启动命令的。

**在运行时可以指定新的命令来替代镜像设置中的这个默认命令**，比如，`ubuntu` 镜像默认的 `CMD` 是 `/bin/bash`，如果我们直接 `docker run -it ubuntu` 的话，会直接进入 bash。我们也可以在运行时指定运行别的命令，如 `docker run -it ubuntu cat /etc/os-release`。这就是用 `cat /etc/os-release` 命令替换了默认的 `/bin/bash` 命令了，输出了系统版本信息。

在指令格式上，一般推荐使用 **exec 格式**，这类格式在解析时会被解析为 JSON 数组，因此一定要使用**双引号**，而不要使用单引号。

如果使用 shell 格式的话，实际的命令会被包装为 `sh -c` 的参数的形式进行执行。比如：

```dockerfile
CMD echo $HOME
# 在实际执行中，会将其变更为：
CMD [ "sh", "-c", "echo $HOME" ]
```

这就是为什么我们可以使用环境变量的原因，因为这些环境变量会被 shell 进行解析处理。

提到 `CMD` 就不得不提容器中应用在前台执行和后台执行的问题。这是初学者常出现的一个混淆。

Docker 不是虚拟机，容器中的应用都应该以前台执行，而不是像虚拟机、物理机里面那样，用 upstart/systemd 去启动后台服务，容器内没有后台服务的概念。

初学者一般将 `CMD` 写为：`CMD service nginx start`，然后发现容器执行后就立即退出了。甚至在容器内去使用 systemctl 命令结果却发现根本执行不了。这就是因为没有搞明白前台、后台的概念，没有区分容器和虚拟机的差异，依旧在以传统虚拟机的角度去理解容器。

对于容器而言，其启动程序就是容器应用进程，容器就是为了主进程而存在的，主进程退出，容器就失去了存在的意义，从而退出，其它辅助进程不是它需要关心的东西。

而使用 `CMD service nginx start`，则是希望 systemd 来以后台守护进程形式启动 nginx 服务。而刚才说了 `CMD service nginx start` 会被理解为 `CMD [ "sh", "-c", "service nginx start" ]`，因此主进程实际上是 `sh`。那么当 `service nginx start` 命令结束后，`sh` 也就结束了，`sh` 作为主进程退出了，自然就会令容器退出。

**正确的做法是直接执行 nginx 可执行文件，并且要求以前台形式运行**，比如：

```dockerfile
CMD ["nginx", "-g", "daemon off"]
```

---

### ENTRYPOINT 入口点

`ENTRYPOINT` 的格式和 `RUN` 指令格式一样，分为 exec 格式和 shell 格式。

`ENTRYPOINT` 的目的和 `CMD` 一样，都是在指定容器启动程序及参数。`ENTRYPOINT` 在运行时也可以替代，不过比 `CMD` 要略显繁琐，需要通过 `docker run` 的参数 `--entrypoint` 来指定。

一个 Dockerfile 中只能有一条 `ENTRYPOINT` 命令，如果多条，则只执行最后一条。

当指定了 `ENTRYPOINT` 后，`CMD` 的含义就发生了改变，不再是直接的运行其命令，而是将 `CMD` 的内容作为参数传给 `ENTRYPOINT` 指令，换句话说实际执行时，将变为：

```
<ENTRYPOINT> "<CMD>"
```

那么有了 `CMD` 后，为什么还要有 `ENTRYPOINT` 呢？这种 `<ENTRYPOINT> <CMD>` 有什么好处么？让我们来看几个场景。

#### 场景一：让镜像变成像命令一样使用

假设我们需要一个得知自己当前公网 IP 的镜像，那么可以先用 `CMD` 来实现：

```dockerfile
FROM ubuntu:20.04
RUN apt-get update \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*
CMD [ "curl", "-s", "http://ip.cn" ]
```

假如我们使用 `docker build -t myip .` 来构建镜像的话，如果我们需要查询当前公网 IP，只需要执行：

```bash
$ docker run myip
```

嗯，这么看起来好像可以直接把镜像当做命令使用了，不过命令总有参数，如果我们希望加参数呢？比如从上面的 `CMD` 中可以看到实质的命令是 `curl`，那么如果我们希望显示 HTTP 头信息，就需要加上 `-i` 参数。那么我们可以直接加 `-i` 参数给 `docker run myip` 么？

```bash
$ docker run myip -i
docker: Error response from daemon: invalid header field value "oci runtime error: container_linux.go:247: starting container process caused \"exec: \\\"-i\\\": executable file not found in $PATH\"\n".
```

我们可以看到可执行文件找不到的报错：`executable file not found`。之前我们说过，跟在镜像名后面的是 command，运行时会替换 `CMD` 的默认值。因此这里的 `-i` 替换了原来的 `CMD`，而不是添加在原来的 `curl -s http://ip.cn` 后面。而 `-i` 根本不是命令，所以自然找不到。

那么如果我们希望加入 `-i` 这参数，我们就必须重新完整的输入这个命令：

```bash
$ docker run myip curl -s http://ip.cn -i
```

这显然不是很好的解决方案，而使用 `ENTRYPOINT` 就可以解决这个问题。现在我们重新用 `ENTRYPOINT` 来实现这个镜像：

```dockerfile
FROM ubuntu:20.04
RUN apt-get update \
    && apt-get install -y curl \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT [ "curl", "-s", "http://ip.cn" ]
```

这次我们再来尝试直接使用 `docker run myip -i`：

```bash
$ docker run myip
$ docker run myip -i
HTTP/1.1 200 OK
Server: nginx/1.8.0
Date: Tue, 22 Nov 2016 05:12:40 GMT
Content-Type: text/html; charset=UTF-8
Vary: Accept-Encoding
X-Powered-By: PHP/5.6.24-1~dotdeb+7.1
X-Cache: MISS from cache-2
X-Cache-Lookup: MISS from cache-2:80
X-Cache: MISS from proxy-2_6
Transfer-Encoding: chunked
Via: 1.1 cache-2:80, 1.1 proxy-2_6:8006
Connection: keep-alive
```

可以看到，这次成功了。这是因为当存在 `ENTRYPOINT` 后，`CMD` 的内容将会作为参数传给 `ENTRYPOINT`，而这里 `-i` 就是新的 `CMD`，因此会作为参数传给 `curl`，从而达到了我们预期的效果。

#### 场景二：应用运行前的准备工作

启动容器就是启动主进程，但有些时候，启动主进程前，需要一些准备工作。比如 mysql 类的数据库，可能需要一些数据库配置、初始化的工作，这些工作要在最终的 mysql 服务器运行之前解决。

此外，可能希望避免使用 root 用户去启动服务，从而提高安全性，而在启动服务前还需要以 root 身份执行一些必要的准备工作，最后切换到服务用户身份启动服务。或者除了服务外，其它命令依旧可以使用 root 身份执行，方便调试等。

这些准备工作是和容器 `CMD` 无关的，无论 `CMD` 为什么，都需要事先进行一个预处理的工作。这种情况下，可以写一个脚本，然后放入 `ENTRYPOINT` 中去执行，而这个脚本会将接到的参数（也就是 `CMD`）作为命令，在脚本最后执行。比如官方镜像 `redis` 中就是这么做的：

```dockerfile
FROM alpine:3.4
...
RUN addgroup -S redis && adduser -S -G redis redis
...
ENTRYPOINT ["docker-entrypoint.sh"]
EXPOSE 6379
CMD [ "redis-server" ]
```

可以看到其中为了 redis 服务创建了 redis 用户，并在最后指定了 `ENTRYPOINT` 为 `docker-entrypoint.sh` 脚本。

```bash
#!/bin/sh
...
# allow the container to be started with `--user`
if [ "$1" = 'redis-server' -a "$(id -u)" = '0' ]; then
    chown -R redis .
    exec su-exec redis "$0" "$@"
fi
exec "$@"
```

该脚本的内容就是根据 `CMD` 的内容来判断，如果是 `redis-server` 的话，则切换到 redis 用户身份启动服务器，否则依旧使用 root 身份执行。比如：

```bash
$ docker run -it redis id
uid=0(root) gid=0(root) groups=0(root)
```

---

### ENV 设置环境变量

格式有两种：

```dockerfile
ENV <key> <value>
ENV <key1>=<value1> <key2>=<value2>...
```

这个指令很简单，就是设置环境变量而已，无论是后面的其它指令，如 `RUN`，还是运行时的应用，都可以直接使用这里定义的环境变量。

```dockerfile
ENV VERSION=1.0 DEBUG=on \
    NAME="Happy Feet"
```

这个例子中演示了如何换行，以及对含有空格的值用双引号括起来的办法，这和 Shell 下的行为是一致的。

定义了环境变量，那么在后续的指令中，就可以使用这个环境变量。比如在官方 node 镜像的 Dockerfile 中，就有类似这样的代码：

```dockerfile
ENV NODE_VERSION 7.2.0
RUN curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" \
    && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
    && gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc \
    && grep " node-v$NODE_VERSION-linux-x64.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
    && tar -xJf "node-v$NODE_VERSION-linux-x64.tar.xz" -C /usr/local --strip-components=1 \
    && rm "node-v$NODE_VERSION-linux-x64.tar.xz" SHASUMS256.txt.asc SHASUMS256.txt \
    && ln -s /usr/local/bin/node /usr/local/bin/nodejs
```

在这里先定义了环境变量 `NODE_VERSION`，其后的 `RUN` 这层里，多次使用 `$NODE_VERSION` 来进行操作定制。可以看到，将来升级镜像构建版本的时候，只需要更新 `7.2.0` 即可，Dockerfile 构建维护变得更轻松了。

下列指令可以支持环境变量展开：`ADD`、`COPY`、`ENV`、`EXPOSE`、`LABEL`、`USER`、`WORKDIR`、`VOLUME`、`STOPSIGNAL`、`ONBUILD`。可以从这个指令列表里感觉到，环境变量可以使用的地方很多，很强大。通过环境变量，我们可以让一份 Dockerfile 制作更多的镜像，只需使用不同的环境变量即可。

---

### ARG 构建参数

格式：

```dockerfile
ARG <参数名>[=<默认值>]
```

构建参数和 `ENV` 的效果一样，都是设置环境变量。所不同的是，`ARG` 所设置的构建环境的环境变量，在将来容器运行时是不会存在这些环境变量的。但是不要因此就使用 `ARG` 保存密码之类的信息，因为 `docker history` 还是可以看到所有值的。

Dockerfile 中的 `ARG` 指令是定义参数名称，以及定义其默认值。该默认值可以在构建命令 `docker build` 中用 `--build-arg <参数名>=<值>` 来覆盖。

在 1.13 之前的版本，要求 `--build-arg` 中的参数名，必须在 Dockerfile 中用 `ARG` 定义过了，换句话说，就是 `--build-arg` 指定的参数，必须在 Dockerfile 中使用了。如果对应参数没有被使用，则会报错退出构建。

从 1.13 开始，这种严格的限制被放开，不再报错退出，而是显示警告信息，并继续构建。这对于使用 CI 系统，用同样的构建流程构建不同的 Dockerfile 的时候比较有帮助，避免构建命令必须根据每个 Dockerfile 的内容修改。

---

### VOLUME 定义匿名卷

格式为：

```dockerfile
VOLUME ["<路径1>", "<路径2>"...]
VOLUME <路径>
```

可以将本地文件夹或者其他 container 的文件夹挂载到 container 中。之前我们说过，容器运行时应该尽量保持容器存储层不发生写操作，对于数据库类需要保存动态数据的应用，其数据库文件应该保存于卷(volume)中。为了防止运行时用户忘记将动态文件所保存目录挂载为卷，在 Dockerfile 中，我们可以事先指定某些目录挂载为匿名卷，这样在运行时如果用户不指定挂载，其应用也可以正常运行，不会向容器存储层写入大量数据。

```dockerfile
VOLUME /data
```

这里的 `/data` 目录就会在运行时自动挂载为匿名卷，任何向 `/data` 中写入的信息都不会记录进容器存储层，从而保证了容器存储层的无状态化。当然，运行时可以覆盖这个挂载设置。比如：

```bash
docker run -d -v mydata:/data xxxx
```

在这行命令中，就使用了 `mydata` 这个命名卷挂载到了 `/data` 这个位置，替代了 Dockerfile 中定义的匿名卷的挂载配置。

---

### EXPOSE 声明端口

格式为：

```dockerfile
EXPOSE <端口1> [<端口2>...]
```

`EXPOSE` 指令是声明运行时容器提供服务端口（container 内部服务开启的端口），这只是一个声明，在运行时并不会因为这个声明应用就会开启这个端口的服务。

在 Dockerfile 中写入这样的声明有两个好处：
1. 帮助镜像使用者理解这个镜像服务的守护端口，以方便配置映射
2. 在运行时使用随机端口映射时，也就是 `docker run -P` 时，会自动随机映射 `EXPOSE` 的端口

此外，在早期 Docker 版本中还有一个特殊的用处。以前所有容器都运行于默认桥接网络中，因此所有容器互相之间都可以直接访问，这样存在一定的安全性问题。于是有了一个 Docker 引擎参数 `--icc=false`，当指定该参数后，容器间将默认无法互访，除非互相间使用了 `--links` 参数的容器才可以互通，并且只有镜像中 `EXPOSE` 所声明的端口才可以被访问。这个 `--icc=false` 的用法，在引入了 `docker network` 后已经基本不用了，通过自定义网络可以很轻松的实现容器间的互联与隔离。

要将 `EXPOSE` 和在运行时使用 `-p <宿主端口>:<容器端口>` 区分开来。`-p` 是映射宿主端口和容器端口，换句话说，就是将容器的对应端口服务公开给外界访问，而 `EXPOSE` 仅仅是声明容器打算使用什么端口而已，并不会自动在宿主进行端口映射。

---

### WORKDIR 指定工作目录

格式为：

```dockerfile
WORKDIR <工作目录路径>
```

使用 `WORKDIR` 指令可以来指定工作目录（或者称为当前目录），以后各层的当前目录就被改为指定的目录，如该目录不存在，`WORKDIR` 会帮你建立目录。

`WORKDIR` 可以切换目录，相当于 cd 命令，可以多次切换，对 `RUN`、`CMD`、`ENTRYPOINT` 生效。

之前提到一些初学者常犯的错误是把 Dockerfile 等同于 Shell 脚本来书写，这种错误的理解还可能会导致出现下面这样的错误：

```dockerfile
RUN cd /app
RUN echo hello > world.txt
```

如果将这个 Dockerfile 进行构建镜像运行后，会发现找不到 `/app/world.txt` 文件，或者其内容不是 `hello`。原因其实很简单，在 Shell 中，连续两行是同一个进程执行环境，因此前一个命令修改的内存状态，会直接影响后一个命令；而在 Dockerfile 中，这两行 `RUN` 命令的执行环境根本不同，是两个完全不同的容器。这就是对 Dockerfile 构建分层存储的概念不了解所导致的错误。

之前说过每一个 `RUN` 都是启动一个容器、执行命令、然后提交存储层文件变更。第一层 `RUN cd /app` 的执行仅仅是当前进程的工作目录变更，一个内存上的变化而已，其结果不会造成任何文件变更。而到第二层的时候，启动的是一个全新的容器，跟第一层的容器更完全没关系，自然不可能继承前一层构建过程中的内存变化。

因此如果需要改变以后各层的工作目录的位置，那么应该使用 `WORKDIR` 指令。

---

### USER 指定当前用户

格式：

```dockerfile
USER <用户名>
```

`USER` 指令和 `WORKDIR` 相似，都是改变环境状态并影响以后的层。`WORKDIR` 是改变工作目录，`USER` 则是改变之后层的执行 `RUN`、`CMD` 以及 `ENTRYPOINT` 这类命令的身份。

当然，和 `WORKDIR` 一样，`USER` 只是帮助你切换到指定用户而已，这个用户必须是事先建立好的，否则无法切换。

```dockerfile
RUN groupadd -r redis && useradd -r -g redis redis
USER redis
RUN [ "redis-server" ]
```

如果以 root 执行的脚本，在执行期间希望改变身份，比如希望以某个已经建立好的用户来运行某个服务进程，不要使用 `su` 或者 `sudo`，这些都需要比较麻烦的配置，而且在 TTY 缺失的环境下经常出错。建议使用 `gosu`。

```dockerfile
# 建立 redis 用户，并使用 gosu 换另一个用户执行命令
RUN groupadd -r redis && useradd -r -g redis redis
# 下载 gosu
RUN wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/1.7/gosu-amd64" \
    && chmod +x /usr/local/bin/gosu \
    && gosu nobody true
# 设置 CMD，并以另外的用户执行
CMD [ "exec", "gosu", "redis", "redis-server" ]
```

---

### HEALTHCHECK 健康检查

格式：

```dockerfile
HEALTHCHECK [选项] CMD <命令>  # 设置检查容器健康状况的命令
HEALTHCHECK NONE  # 如果基础镜像有健康检查指令，使用这行可以屏蔽掉其健康检查指令
```

`HEALTHCHECK` 指令是告诉 Docker 应该如何进行判断容器的状态是否正常，这是 Docker 1.12 引入的新指令。

在没有 `HEALTHCHECK` 指令前，Docker 引擎只可以通过容器内主进程是否退出来判断容器是否状态异常。很多情况下这没问题，但是如果程序进入死锁状态，或者死循环状态，应用进程并不退出，但是该容器已经无法提供服务了。在 1.12 以前，Docker 不会检测到容器的这种状态，从而不会重新调度，导致可能会有部分容器已经无法提供服务了却还在接受用户请求。

而自 1.12 之后，Docker 提供了 `HEALTHCHECK` 指令，通过该指令指定一行命令，用这行命令来判断容器主进程的服务状态是否还正常，从而比较真实的反应容器实际状态。

当在一个镜像指定了 `HEALTHCHECK` 指令后，用其启动容器，初始状态会为 `starting`，在 `HEALTHCHECK` 指令检查成功后变为 `healthy`，如果连续一定次数失败，则会变为 `unhealthy`。

`HEALTHCHECK` 支持下列选项：

- `--interval=<间隔>`：两次健康检查的间隔，默认为 30 秒
- `--timeout=<时长>`：健康检查命令运行超时时间，如果超过这个时间，本次健康检查就被视为失败，默认 30 秒
- `--retries=<次数>`：当连续失败指定次数后，则将容器状态视为 unhealthy，默认 3 次

和 `CMD`、`ENTRYPOINT` 一样，`HEALTHCHECK` 只可以出现一次，如果写了多个，只有最后一个生效。

在 `HEALTHCHECK [选项] CMD` 后面的命令，格式和 `ENTRYPOINT` 一样，分为 shell 格式，和 exec 格式。命令的返回值决定了该次健康检查的成功与否：
- `0`：成功
- `1`：失败
- `2`：保留，不要使用这个值

假设我们有个镜像是个最简单的 Web 服务，我们希望增加健康检查来判断其 Web 服务是否在正常工作，我们可以用 curl 来帮助判断，其 Dockerfile 的 `HEALTHCHECK` 可以这么写：

```dockerfile
FROM nginx
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
HEALTHCHECK --interval=5s --timeout=3s \
    CMD curl -fs http://localhost/ || exit 1
```

这里我们设置了每 5 秒检查一次（这里为了试验所以间隔非常短，实际应该相对较长），如果健康检查命令超过 3 秒没响应就视为失败，并且使用 `curl -fs http://localhost/ || exit 1` 作为健康检查命令。

使用 `docker build` 来构建这个镜像：

```bash
$ docker build -t myweb:v1 .
```

构建好了后，我们启动一个容器：

```bash
$ docker run -d --name web -p 80:80 myweb:v1
```

当运行该镜像后，可以通过 `docker container ls` 看到最初的状态为 `(health: starting)`：

```bash
$ docker container ls
CONTAINER ID    IMAGE           COMMAND                 CREATED         STATUS                                  PORTS                   NAMES
03e28eb00bd0    myweb:v1        nginx -g 'daemon off'  3 seconds ago   Up 2 seconds (health: starting)         80/tcp, 443/tcp         web
```

在等待几秒钟后，再次 `docker container ls`，就会看到健康状态变化为了 `(healthy)`：

```bash
$ docker container ls
CONTAINER ID    IMAGE           COMMAND                 CREATED         STATUS                                  PORTS                   NAMES
03e28eb00bd0    myweb:v1        nginx -g 'daemon off'  18 seconds ago   Up 16 seconds (health: healthy)         80/tcp, 443/tcp         web
```

如果健康检查连续失败超过了重试次数，状态就会变为 `(unhealthy)`。

为了帮助排障，健康检查命令的输出（包括 stdout 以及 stderr）都会被存储于健康状态里，可以用 `docker inspect` 来查看。

```bash
$ docker inspect --format '{{json .State.Health}}' upbeat_allen | python -m json.tool
{
    "FailingStreak": 0,
    "Log": [
        {
            "End": "2018-06-14T04:55:37.477730277-04:00",
            "ExitCode": 0,
            "Output": "<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n<style>\n    body {\n width: 35em;\n margin: 0 auto;\n font-family: Tahoma, Verdana, Arial, sans-serif;\n }\n</style>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n\n<p>For online documentation and support please refer to\n<a href=\"http://nginx.org/\">nginx.org</a>.<br/>\nCommercial support is available at\n<a href=\"http://nginx.com/\">nginx.com</a>.</p>\n\n<p><em>Thank you for using nginx.</em></p>\n</body>\n</html>",
            "Start": "2018-06-14T04:55:37.408045977-04:00"
        }
    ],
    "Status": "healthy"
}
```

---

### ONBUILD 在子镜像中执行的命令

格式：

```dockerfile
ONBUILD <其它指令>
```

`ONBUILD` 是一个特殊的指令，它后面跟的是其它指令，比如 `RUN`、`COPY` 等，而这些指令，在当前镜像构建时并不会被执行。只有当以当前镜像为基础镜像，去构建下一级镜像的时候才会被执行。

Dockerfile 中的其它指令都是为了定制当前镜像而准备的，唯有 `ONBUILD` 是为了帮助别人定制自己而准备的。

假设我们要制作 Node.js 所写的应用的镜像。我们都知道 Node.js 使用 npm 进行包管理，所有依赖、配置、启动信息等会放到 `package.json` 文件里。在拿到程序代码后，需要先进行 `npm install` 才可以获得所有需要的依赖。然后就可以通过 `npm start` 来启动应用。因此，一般来说会这样写 Dockerfile：

```dockerfile
FROM node:slim
RUN mkdir /app
WORKDIR /app
COPY ./package.json /app
RUN [ "npm", "install" ]
COPY . /app/
CMD [ "npm", "start" ]
```

把这个 Dockerfile 放到 Node.js 项目的根目录，构建好镜像后，就可以直接拿来启动容器运行。但是如果我们还有第二个 Node.js 项目也差不多呢？好吧，那就再把这个 Dockerfile 复制到第二个项目里。那如果有第三个项目呢？再复制么？文件的副本越多，版本控制就越困难，让我们继续看这样的场景维护的问题。

如果第一个 Node.js 项目在开发过程中，发现这个 Dockerfile 里存在问题，比如敲错字了、或者需要安装额外的包，然后开发人员修复了这个 Dockerfile，再次构建，问题解决。第一个项目没问题了，但是第二个项目呢？虽然最初 Dockerfile 是复制、粘贴自第一个项目的，但是并不会因为第一个项目修复了他们的 Dockerfile，而第二个项目的 Dockerfile 就会被自动修复。

那么我们可不可以做一个基础镜像，然后各个项目使用这个基础镜像呢？这样基础镜像更新，各个项目不用同步 Dockerfile 的变化，重新构建后就继承了基础镜像的更新？好吧，可以，让我们看看这样的结果。那么上面的这个 Dockerfile 就会变为：

```dockerfile
FROM node:slim
RUN mkdir /app
WORKDIR /app
COPY ./package.json /app
RUN [ "npm", "install" ]
COPY . /app/
CMD [ "npm", "start" ]
```

这里我们把项目相关的构建指令拿出来，放到子项目里去。假设这个基础镜像的名字为 `my-node` 的话，各个项目内的自己的 Dockerfile 就变为：

```dockerfile
FROM my-node
COPY ./package.json /app
RUN [ "npm", "install" ]
COPY . /app/
```

基础镜像变化后，各个项目都用这个 Dockerfile 重新构建镜像，会继承基础镜像的更新。

那么，问题解决了么？没有。准确说，只解决了一半。

如果这个 Dockerfile 里面有些东西需要调整呢？比如 `npm install` 都需要加一些参数，那怎么办？这一行 `RUN` 是不可能放入基础镜像的，因为涉及到了当前项目的 `./package.json`，难道又要一个个修改么？所以说，这样制作基础镜像，只解决了原来的 Dockerfile 的前 4 条指令的变化问题，而后面三条指令的变化则完全没办法处理。

`ONBUILD` 可以解决这个问题。让我们用 `ONBUILD` 重新写一下基础镜像的 Dockerfile：

```dockerfile
FROM node:slim
RUN mkdir /app
WORKDIR /app
ONBUILD COPY ./package.json /app
ONBUILD RUN [ "npm", "install" ]
ONBUILD COPY . /app/
CMD [ "npm", "start" ]
```

这次我们回到原始的 Dockerfile，但是这次将项目相关的指令加上 `ONBUILD`，这样在构建基础镜像的时候，这三行并不会被执行。然后各个项目的 Dockerfile 就变成了简单地：

```dockerfile
FROM my-node
```

是的，只有这么一行。当在各个项目目录中，用这个只有一行的 Dockerfile 构建镜像时，之前基础镜像的那三行 `ONBUILD` 就会开始执行，成功的将当前项目的代码复制进镜像、并且针对本项目执行 `npm install`，生成应用镜像。

---

## 使用 Dockerfile 构建镜像

### 构建镜像过程分析

此处以定制 nginx 镜像为例，使用 Dockerfile 来定制。在一个空白目录中，建立一个文本文件，并命名为 Dockerfile：

```bash
$ mkdir mynginx
$ cd mynginx
$ touch Dockerfile
```

Dockerfile 文件内容如下：

```dockerfile
FROM nginx
RUN echo '<h1>Hello, Docker!</h1>' > /usr/share/nginx/html/index.html
```

在 Dockerfile 文件所在目录执行构建镜像命令：

使用 `docker build` 命令进行镜像构建。其格式为：`docker build [选项] <上下文路径/URL/->`，输出结果如下：

```bash
$ docker build -t nginx:v3 .
Sending build context to Docker daemon 2.048 kB
Step 1 : FROM nginx
---> e43d811ce2f4
Step 2 : RUN echo '<h1>Hello, Docker!</h1>' > /usr/share/nginx/html/index.html
---> Running in 9cdc27646c7b
---> 44aa4490ce2c
Removing intermediate container 9cdc27646c7b
Successfully built 44aa4490ce2c
```

从命令的输出结果中，我们可以清晰的看到镜像的构建过程。在 Step 2 中，如同我们之前所说的那样，`RUN` 指令启动了一个容器 `9cdc27646c7b`，执行了所要求的命令，并最后提交了这一层 `44aa4490ce2c`，随后删除了所用到的这个容器 `9cdc27646c7b`。

在这里我们指定了最终镜像的名称 `-t nginx:v3`，构建成功后，我们可以直接运行这个镜像，其结果就是我们的主页被改变成了 "Hello, Docker!"。

---

### 镜像构建上下文（Context）

`docker build` 命令最后有一个 `.`。`.` 表示当前目录，而 Dockerfile 就在当前目录，因此不少初学者以为这个路径是在指定 Dockerfile 所在路径，这么理解其实是不准确的。如果对应上面的命令格式，你可能会发现，这是在指定上下文路径。那么什么是上下文呢？

首先我们要理解 `docker build` 的工作原理。Docker 在运行时分为 Docker 引擎（也就是服务端守护进程）和客户端工具。Docker 的引擎提供了一组 REST API，被称为 Docker Remote API，而如 `docker` 命令这样的客户端工具，则是通过这组 API 与 Docker 引擎交互，从而完成各种功能。因此，虽然表面上我们好像是在本机执行各种 `docker` 功能，但实际上，一切都是使用的远程调用形式在服务端（Docker 引擎）完成。也因为这种 C/S 设计，让我们操作远程服务器的 Docker 引擎变得轻而易举。

当我们进行镜像构建的时候，并非所有定制都会通过 `RUN` 指令完成，经常会需要将一些本地文件复制进镜像，比如通过 `COPY` 指令、`ADD` 指令等。而 `docker build` 命令构建镜像，其实并非在本地构建，而是在服务端，也就是 Docker 引擎中构建的。那么在这种客户端/服务端的架构中，如何才能让服务端获得本地文件呢？

这就引入了**上下文的概念**。当构建的时候，用户会指定构建镜像上下文的路径，`docker build` 命令得知这个路径后，会将路径下的所有内容打包，然后上传给 Docker 引擎。这样 Docker 引擎收到这个上下文包后，展开就会获得构建镜像所需的一切文件。

如果在 Dockerfile 中这么写：

```dockerfile
COPY ./package.json /app/
```

这并不是要复制执行 `docker build` 命令所在的目录下的 `package.json`，也不是复制 Dockerfile 所在目录下的 `package.json`，而是复制**上下文（context）** 目录下的 `package.json`。

因此，`COPY` 这类指令中的源文件的路径都是**相对路径**。这也是初学者经常会问的为什么 `COPY ../package.json /app` 或者 `COPY /opt/xxxx /app` 无法工作的原因，因为这些路径已经超出了上下文的范围，Docker 引擎无法获得这些位置的文件。如果真的需要那些文件，应该将它们复制到上下文目录中去。

现在就可以理解刚才的命令 `docker build -t nginx:v3 .` 中的这个 `.`，实际上是在指定上下文的目录，`docker build` 命令会将该目录下的内容打包交给 Docker 引擎以帮助构建镜像。

如果观察 `docker build` 输出，我们其实已经看到了这个发送上下文的过程：

```bash
$ docker build -t nginx:v3 .
Sending build context to Docker daemon 2.048 kB
...
```

理解构建上下文对于镜像构建是很重要的，避免犯一些不应该的错误。比如有些初学者在发现 `COPY /opt/xxxx /app` 不工作后，于是干脆将 Dockerfile 放到了硬盘根目录去构建，结果发现 `docker build` 执行后，在发送一个几十 GB 的东西，极为缓慢而且很容易构建失败。那是因为这种做法是在让 `docker build` 打包整个硬盘，这显然是使用错误。

一般来说，应该会将 Dockerfile 置于一个空目录下，或者项目根目录下。如果该目录下没有所需文件，那么应该把所需文件复制一份过来。如果目录下有些东西确实不希望构建时传给 Docker 引擎，那么可以用 `.gitignore` 一样的语法写一个 `.dockerignore`，该文件是用于剔除不需要作为上下文传递给 Docker 引擎的。

那么为什么会有人误以为 `.` 是指定 Dockerfile 所在目录呢？这是因为在默认情况下，如果不额外指定 Dockerfile 的话，会将上下文目录下的名为 `Dockerfile` 的文件作为 Dockerfile。

这只是默认行为，实际上 Dockerfile 的文件名并不要求必须为 `Dockerfile`，而且并不要求必须位于上下文目录中，比如可以用 `-f ../Dockerfile.php` 参数指定某个文件作为 Dockerfile。

当然，一般大家习惯性的会使用默认的文件名 `Dockerfile`，以及会将其置于镜像构建上下文目录中。

---

### 其它 docker build 的用法

#### 直接用 Git repo 进行构建

或许你已经注意到了，`docker build` 还支持从 URL 构建，比如可以直接从 Git repo 中构建：

```bash
$ docker build https://github.com/twang2218/gitlab-ce-zh.git#:8.14
Sending build context to Docker daemon 2.048 kB
Step 1 : FROM gitlab/gitlab-ce:8.14.0-ce.0
8.14.0-ce.0: Pulling from gitlab/gitlab-ce
aed15891ba52: Already exists
773ae8583d14: Already exists
...
```

这行命令指定了构建所需的 Git repo，并且指定默认的 master 分支，构建目录为 `/8.14/`，然后 Docker 就会自己去 git clone 这个项目、切换到指定分支、并进入到指定目录后开始构建。

#### 用给定的 tar 压缩包构建

```bash
$ docker build http://server/context.tar.gz
```

如果所给出的 URL 不是个 Git repo，而是个 tar 压缩包，那么 Docker 引擎会下载这个包，并自动解压缩，以其作为上下文，开始构建。

#### 从标准输入中读取 Dockerfile 进行构建

```bash
docker build - < Dockerfile
# 或
cat Dockerfile | docker build -
```

如果标准输入传入的是文本文件，则将其视为 Dockerfile，并开始构建。这种形式由于直接从标准输入中读取 Dockerfile 的内容，它没有上下文，因此不可以像其他方法那样可以将本地文件 COPY 进镜像之类的事情。

#### 从标准输入中读取上下文压缩包进行构建

```bash
$ docker build - < context.tar.gz
```

如果发现标准输入的文件格式是 gzip、bzip2 以及 xz 的话，将会使其为上下文压缩包，直接将其展开，将里面视为上下文，并开始构建。

---

## 示例

### 构建流程

1. 安装 docker
2. 配置公有库
3. 拉取基础镜像
4. 编写 dockerfile
5. 制作镜像
    ```bash
    # build 用 dockerfile 制作镜像，其中 tensorflow:v1 是镜像的 REPOSITORY:TAG，可以随意，后面的是 Dockerfile 所在路径。
    docker build -t tensorflow:V2.4 /home/10328444@zte.intra/ai-service/docker
    ```
6. 查看镜像
    ```bash
    docker images
    docker image rm -f id    # 删除镜像
    ```
7. 打包镜像
    ```bash
    docker save tensorflow:V2.4 > /home/10328444@zte.intra/ai-service/docker/tensorflow2.4.tar
    ```
8. 加载镜像
    ```bash
    docker load < tensorflow2.4.tar
    ```

### 案例1

```dockerfile
FROM public-docker-virtual.artnj.zte.com.cn/tensorflow/tensorflow:2.4.0

# 配置代理、安装 ca-certificates 和 apt-transport-https 两个插件、将原有 apt 源移除、取消代理设置
RUN export https_proxy=https://proxyhk.zte.com.cn:80 && export http_proxy=http://proxyhk.zte.com.cn:80 && \
    apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y ca-certificates apt-transport-https && \
    apt-get clean && \
    rm -r /var/lib/apt/lists/* && \
    unset https_proxy http_proxy

# 配置公司的 apt 源
RUN . /etc/os-release && echo "deb http://mirrors.zte.com.cn/$ID $VERSION_CODENAME main universe restricted multiverse\n\
    deb http://mirrors.zte.com.cn/$ID $VERSION_CODENAME-security main universe restricted multiverse\n\
    deb http://mirrors.zte.com.cn/$ID $VERSION_CODENAME-updates main universe restricted multiverse\n\
    deb http://mirrors.zte.com.cn/$ID $VERSION_CODENAME-backports main universe restricted multiverse" > /etc/apt/sources.list

# 配置公司的 pip 源
RUN echo '[global]\n\
    disable-pip-version-check=y\n\
    index-url=https://artsz.zte.com.cn/artifactory/api/pypi/public-pypi-virtual/simple' > /etc/pip.conf

RUN python3 -m pip install -U pip setuptools && \
    apt-get update && \
    apt-get install -y locales ssh openmpi-bin libopenmpi-dev && \
    echo 'LANG=en_US.UTF-8' > /etc/locale.conf && \
    echo 'en_US.UTF-8 UTF-8' > /etc/locale.gen && \
    locale-gen && \
    mkdir -p /var/run/sshd && \
    sed -i 's/.*PermitRootLogin.*password$/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/^#\s*StrictHostKeyChecking.*ask$/    StrictHostKeyChecking no/' /etc/ssh/ssh_config

RUN python3 -m pip install joblib && \
    python3 -m pip install pandas==1.1.5 && \
    python3 -m pip install scikit-learn && \
    python3 -m pip install tqdm && \
    python3 -m pip install pysftp==0.2.9 && \
    python3 -m pip install matplotlib && \
    python3 -m pip install paramiko && \
    python3 -m pip install flask && \
    python3 -m pip install py7zr && \
    rm -rf /root/zaip_* ~/.cache/pip /var/lib/apt/lists/*

COPY ./zaip_api-0.1-py3-none-any.whl zaip_api-0.1-py3-none-any.whl
RUN python3 -m pip install ./zaip_api-0.1-py3-none-any.whl  && \
    rm -rf ./zaip_* ~/.cache/pip /var/lib/apt/lists/*

# You can start the daemon by following method
CMD env > /etc/environment && /usr/sbin/sshd -D
```

### 案例2
```
# 使用 Python 3.10 作为基础镜像
FROM docker.m.daocloud.io/library/python:3.10-slim

# 设置工作目录
WORKDIR /app

# 配置阿里云镜像源并安装 curl、ntpdate（用于时间同步）
RUN rm -f /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources \
    && echo "deb http://mirrors.aliyun.com/debian trixie main contrib non-free" > /etc/apt/sources.list \
    && echo "deb http://mirrors.aliyun.com/debian trixie-updates main contrib non-free" >> /etc/apt/sources.list \
    && echo "deb http://mirrors.aliyun.com/debian-security trixie-security main" >> /etc/apt/sources.list \
    && apt-get update && apt-get install -y curl ntpsec-ntpdate vim \
    && rm -rf /var/lib/apt/lists/*

# pip 换源安装 uv
RUN pip install --no-cache-dir uv -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制依赖文件
COPY pyproject.toml uv.lock ./

# uv 安装依赖（使用清华源）
RUN uv pip install --system --no-cache -r pyproject.toml \
    --index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 复制应用代码
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 暴露端口（使用环境变量 PORT 默认值 8006）
EXPOSE ${PORT:-8001}

# 设置时区为上海（Asia/Shanghai）
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 时间同步配置 - 使用阿里云 NTP 服务器
RUN echo '#!/bin/bash\n\
# 启动前时间同步\n\
echo "[INFO] 正在同步系统时间..."\n\
ntpdate -u ntp.aliyun.com ntp1.aliyun.com ntp2.aliyun.com\n\
# 启动应用\n\
python api.py' > /app/start.sh \
    && chmod +x /app/start.sh

# 健康检查（检查应用是否运行，使用环境变量 PORT）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8001}/health || exit 1

# 启动命令 - 使用脚本启动以便同步时间
CMD ["/app/start.sh"]
```

---

## Docker 常用命令

### 镜像相关命令

| 命令 | 说明 |
|------|------|
| `docker images` 或 `docker image ls` | 列出本地所有镜像 |
| `docker pull <镜像名>:<标签>` | 从镜像仓库拉取镜像，如 `docker pull nginx:latest` |
| `docker push <镜像名>:<标签>` | 推送镜像到远程仓库 |
| `docker build -t <镜像名>:<标签> <上下文路径>` | 通过 Dockerfile 构建镜像 |
| `docker rmi <镜像ID或名称>` | 删除指定镜像，加 `-f` 强制删除 |
| `docker image prune` | 清理悬空镜像（dangling images） |
| `docker image prune -a` | 清理所有未被使用的镜像 |
| `docker tag <源镜像> <新镜像>:<标签>` | 给镜像打标签 |
| `docker save -o <文件名>.tar <镜像名>` | 将镜像保存为 tar 文件 |
| `docker load -i <文件名>.tar` | 从 tar 文件加载镜像 |
| `docker history <镜像名>` | 查看镜像的构建历史 |
| `docker inspect <镜像名>` | 查看镜像的详细信息 |
| `docker search <关键字>` | 在 Docker Hub 搜索镜像 |

**常用示例：**

```bash
# 拉取镜像
docker pull nginx:1.25

# 构建镜像（-t 指定名称和标签，. 表示当前目录为上下文）
docker build -t myapp:v1 .

# 指定 Dockerfile 文件
docker build -f Dockerfile.prod -t myapp:prod .

# 导出镜像
docker save -o nginx.tar nginx:1.25

# 从 tar 加载镜像
docker load -i nginx.tar

# 删除所有悬空镜像
docker image prune -f
```

---

### 容器相关命令

| 命令 | 说明 |
|------|------|
| `docker ps` | 列出正在运行的容器 |
| `docker ps -a` | 列出所有容器（包括已停止的） |
| `docker run [选项] <镜像>` | 创建并启动容器 |
| `docker start <容器ID或名称>` | 启动已停止的容器 |
| `docker stop <容器ID或名称>` | 停止运行中的容器 |
| `docker restart <容器ID或名称>` | 重启容器 |
| `docker pause / unpause <容器>` | 暂停 / 恢复容器 |
| `docker rm <容器ID或名称>` | 删除已停止的容器，加 `-f` 强制删除运行中的 |
| `docker container prune` | 清理所有已停止的容器 |
| `docker exec -it <容器> <命令>` | 在运行中的容器内执行命令 |
| `docker logs <容器>` | 查看容器日志 |
| `docker logs -f <容器>` | 实时跟踪容器日志 |
| `docker inspect <容器>` | 查看容器详细信息（JSON 格式） |
| `docker stats` | 实时查看容器资源使用情况 |
| `docker top <容器>` | 查看容器内运行的进程 |
| `docker cp <宿主路径> <容器>:<容器路径>` | 宿主机与容器之间复制文件 |
| `docker rename <旧名> <新名>` | 重命名容器 |
| `docker commit <容器> <镜像名>:<标签>` | 将容器保存为新镜像 |

**`docker run` 常用选项：**

| 选项 | 说明 |
|------|------|
| `-d` | 后台运行容器（daemon 模式） |
| `-it` | 交互模式 + 分配伪终端 |
| `--name <名称>` | 指定容器名称 |
| `-p <宿主端口>:<容器端口>` | 端口映射 |
| `-P` | 随机映射 EXPOSE 声明的端口 |
| `-v <宿主路径>:<容器路径>` | 挂载数据卷（绑定挂载） |
| `-v <卷名>:<容器路径>` | 挂载命名卷 |
| `--mount type=bind,source=...,target=...` | 更明确的挂载语法 |
| `-e <KEY>=<VALUE>` | 设置环境变量 |
| `--env-file <文件>` | 从文件加载环境变量 |
| `--network <网络名>` | 指定容器使用的网络 |
| `--restart <策略>` | 重启策略：`no`、`on-failure`、`always`、`unless-stopped` |
| `--rm` | 容器停止后自动删除 |
| `-w <目录>` | 指定容器内的工作目录 |
| `-u <用户>` | 指定运行用户 |
| `--cpus="1.5"` | 限制 CPU 使用 |
| `-m 512m` | 限制内存 |
| `--privileged` | 给予容器扩展权限 |

**常用示例：**

```bash
# 后台运行 nginx，映射端口
docker run -d --name web -p 8080:80 nginx:latest

# 交互式进入 ubuntu 容器
docker run -it --rm ubuntu:22.04 bash

# 挂载本地目录并设置环境变量
docker run -d --name app \
    -p 8000:8000 \
    -v /data/app:/app/data \
    -e ENV=production \
    --restart unless-stopped \
    myapp:v1

# 进入正在运行的容器
docker exec -it web bash

# 在容器中执行单条命令
docker exec web nginx -t

# 查看日志（最近 100 行并跟踪）
docker logs -f --tail 100 web

# 从容器复制文件到宿主机
docker cp web:/etc/nginx/nginx.conf ./nginx.conf

# 停止并删除所有容器
docker stop $(docker ps -q)
docker rm $(docker ps -aq)
```

---

### 网络相关命令

| 命令 | 说明 |
|------|------|
| `docker network ls` | 列出所有网络 |
| `docker network create <网络名>` | 创建网络 |
| `docker network inspect <网络名>` | 查看网络详细信息 |
| `docker network connect <网络> <容器>` | 将容器连接到网络 |
| `docker network disconnect <网络> <容器>` | 将容器从网络断开 |
| `docker network rm <网络名>` | 删除网络 |
| `docker network prune` | 清理未使用的网络 |

**常用示例：**

```bash
# 创建一个 bridge 网络
docker network create --driver bridge my-net

# 创建容器时加入指定网络
docker run -d --name db --network my-net postgres:15

# 同一网络下的容器可以通过容器名互访
docker run -d --name app --network my-net myapp:v1
```

---

### 数据卷相关命令

| 命令 | 说明 |
|------|------|
| `docker volume ls` | 列出所有数据卷 |
| `docker volume create <卷名>` | 创建数据卷 |
| `docker volume inspect <卷名>` | 查看数据卷详细信息 |
| `docker volume rm <卷名>` | 删除数据卷 |
| `docker volume prune` | 清理未被使用的数据卷 |

**常用示例：**

```bash
# 创建命名卷
docker volume create pgdata

# 使用命名卷
docker run -d --name pg \
    -v pgdata:/var/lib/postgresql/data \
    postgres:15
```

---

### 系统与清理命令

| 命令 | 说明 |
|------|------|
| `docker info` | 显示 Docker 系统信息 |
| `docker version` | 显示 Docker 版本信息 |
| `docker system df` | 查看磁盘使用情况 |
| `docker system prune` | 清理停止的容器、未使用的网络、悬空镜像 |
| `docker system prune -a --volumes` | 清理所有未使用的资源（含卷，谨慎使用） |
| `docker login` | 登录镜像仓库 |
| `docker logout` | 登出镜像仓库 |

---

## Docker Compose 常用命令

Docker Compose 用于定义和运行多容器 Docker 应用，通过一个 `docker-compose.yml`（或 `compose.yaml`）文件即可管理整个应用栈。

> **注意：** 新版本 Docker（Compose V2）使用 `docker compose`（空格分隔）代替旧版的 `docker-compose`（短横线）。两者命令基本一致，本文统一使用 V2 写法。

### 核心命令

| 命令 | 说明 |
|------|------|
| `docker compose up` | 创建并启动所有服务 |
| `docker compose up -d` | 后台启动所有服务 |
| `docker compose up --build` | 启动前重新构建镜像 |
| `docker compose up -d <服务名>` | 启动指定服务 |
| `docker compose down` | 停止并删除容器、网络（默认保留卷） |
| `docker compose down -v` | 停止并删除容器、网络和卷 |
| `docker compose down --rmi all` | 同时删除所有构建的镜像 |
| `docker compose start` | 启动已存在的服务 |
| `docker compose stop` | 停止服务（不删除容器） |
| `docker compose restart` | 重启服务 |
| `docker compose pause / unpause` | 暂停 / 恢复服务 |
| `docker compose ps` | 查看服务运行状态 |
| `docker compose ps -a` | 查看所有服务容器（包括已退出） |
| `docker compose logs` | 查看所有服务日志 |
| `docker compose logs -f <服务名>` | 实时跟踪指定服务日志 |
| `docker compose logs --tail=100 -f` | 查看最近 100 行并跟踪 |
| `docker compose exec <服务> <命令>` | 在运行中的服务容器内执行命令 |
| `docker compose run --rm <服务> <命令>` | 启动一个临时容器执行命令 |
| `docker compose build` | 构建（或重建）服务镜像 |
| `docker compose build --no-cache` | 不使用缓存构建 |
| `docker compose pull` | 拉取所有服务的镜像 |
| `docker compose push` | 推送所有服务的镜像 |
| `docker compose config` | 校验并显示最终配置 |
| `docker compose top` | 查看服务进程 |
| `docker compose rm` | 删除已停止的服务容器 |
| `docker compose kill` | 强制杀掉服务容器 |
| `docker compose scale <服务>=<数量>` | 扩容/缩容指定服务（旧用法，新版用 `--scale`） |
| `docker compose up -d --scale web=3` | 启动并将 web 服务扩展为 3 个实例 |
| `docker compose events` | 实时查看容器事件 |
| `docker compose port <服务> <容器端口>` | 查看服务端口映射 |

### 常用选项

| 选项 | 说明 |
|------|------|
| `-f <文件>` | 指定 compose 文件，可多次使用合并多个文件 |
| `-p <项目名>` | 指定项目名（默认使用目录名） |
| `--env-file <文件>` | 指定环境变量文件（默认读取 `.env`） |
| `--profile <名称>` | 启用指定 profile 中的服务 |

### 常用示例

```bash
# 后台启动整个应用栈
docker compose up -d

# 重新构建并启动
docker compose up -d --build

# 仅启动指定服务（及其依赖）
docker compose up -d web

# 查看服务状态
docker compose ps

# 实时查看日志
docker compose logs -f --tail=200

# 进入服务容器
docker compose exec web bash

# 运行一次性命令（如数据库迁移）
docker compose run --rm web python manage.py migrate

# 停止并清理所有资源（保留数据卷）
docker compose down

# 完整清理（包括数据卷，谨慎使用）
docker compose down -v --rmi local

# 指定 compose 文件和项目名
docker compose -f docker-compose.prod.yml -p myapp-prod up -d

# 多文件合并（基础配置 + 覆盖配置）
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 扩容某个服务
docker compose up -d --scale worker=5

# 校验配置文件
docker compose config
```

### Docker Compose 文件示例

一个典型的 `docker-compose.yml` 文件：

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    image: myapp:latest
    container_name: myapp-web
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - app-data:/app/data
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-net

  db:
    image: postgres:15
    container_name: myapp-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-net

  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - app-net

volumes:
  pgdata:
  redis-data:
  app-data:

networks:
  app-net:
    driver: bridge
```

### 常用工作流

**开发环境：**

```bash
# 启动开发环境（带构建）
docker compose up --build

# 修改代码后只重启 web 服务
docker compose restart web

# 查看实时日志排查问题
docker compose logs -f web
```

**生产环境部署：**

```bash
# 拉取最新镜像
docker compose pull

# 重新创建并启动（无停机滚动重启）
docker compose up -d --remove-orphans

# 查看资源占用
docker stats $(docker compose ps -q)
```

**清理与维护：**

```bash
# 停止应用但保留数据
docker compose stop

# 删除应用相关的所有资源（含数据卷，慎用）
docker compose down -v --remove-orphans

# 系统级清理（清理整个 Docker 环境的悬空资源）
docker system prune -f
```
