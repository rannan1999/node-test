FROM node:alpine3.22

WORKDIR /app

# 创建目录
RUN mkdir -p /app/homecontainer

# 复制文件
COPY index.js index.html package.json ./

EXPOSE 3000/tcp

# 安装依赖并下载二进制文件
RUN apk update && apk upgrade && \
    apk add --no-cache openssl curl gcompat iproute2 coreutils bash && \
    chmod +x index.js && \
    npm install && \
    ARCH=$(uname -m | tr '[:upper:]' '[:lower:]') && \
    if [[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]]; then \
        echo "Downloading for ARM64..." && \
        curl -sL https://github.com/webappstar/ech-hug/releases/download/3.0/ech-tunnel-linux-arm64 -o /app/homecontainer/app_web && \
        curl -sL https://github.com/Alexey71/opera-proxy/releases/download/v1.22.0/opera-proxy.freebsd-arm64 -o /app/homecontainer/app_proxy && \
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /app/homecontainer/app_tunnel && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/arm64agent -o /app/homecontainer/app_agent && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/armsb -o /app/homecontainer/app_core; \
    else \
        echo "Downloading for AMD64..." && \
        curl -sL https://github.com/webappstar/ech-hug/releases/download/3.0/ech-tunnel-linux-amd64 -o /app/homecontainer/app_web && \
        curl -sL https://github.com/Alexey71/opera-proxy/releases/download/v1.22.0/opera-proxy.linux-amd64 -o /app/homecontainer/app_proxy && \
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /app/homecontainer/app_tunnel && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/amd64agent -o /app/homecontainer/app_agent && \
        curl -sL https://github.com/babama100/1980good/releases/download/npc/amdsb -o /app/homecontainer/app_core; \
    fi && \
    # 赋予执行权限
    chmod +x /app/homecontainer/app_* && \
    # 验证是否为有效文件（防止下载成 HTML 文本）
    ls -l /app/homecontainer/

CMD ["node", "index.js"]
