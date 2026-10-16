FROM node:alpine3.22

WORKDIR /app

# 创建存放二进制和配置文件的目录
RUN mkdir -p /app/homecontainer

# 复制项目文件
COPY index.js index.html package.json ./

EXPOSE 3000/tcp

# 安装必要的系统依赖并下载所有核心二进制文件
RUN apk update && apk upgrade && \
    apk add --no-cache openssl curl gcompat iproute2 coreutils bash && \
    chmod +x index.js && \
    npm install && \
    # 根据架构下载二进制文件
    ARCH=$(uname -m | tr '[:upper:]' '[:lower:]') && \
    if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then \
        curl -sL https://github.com/webappstar/ech-hug/releases/download/3.0/ech-tunnel-linux-arm64 -o /app/homecontainer/app_web && \
        curl -sL https://github.com/Alexey71/opera-proxy/releases/download/v1.22.0/opera-proxy.freebsd-arm64 -o /app/homecontainer/app_proxy && \
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /app/homecontainer/app_tunnel && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/arm64agent -o /app/homecontainer/app_agent && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/armsb -o /app/homecontainer/app_core; \
    elif [[ "$ARCH" == "x86_64" || "$ARCH" == "amd64" || "$ARCH" == "x64" ]]; then \
        curl -sL https://github.com/webappstar/ech-hug/releases/download/3.0/ech-tunnel-linux-amd64 -o /app/homecontainer/app_web && \
        curl -sL https://github.com/Alexey71/opera-proxy/releases/download/v1.22.0/opera-proxy.linux-amd64 -o /app/homecontainer/app_proxy && \
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /app/homecontainer/app_tunnel && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/amd64agent -o /app/homecontainer/app_agent && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/amdsb -o /app/homecontainer/app_core; \
    fi && \
    chmod 755 /app/homecontainer/app_*

CMD ["node", "index.js"]
