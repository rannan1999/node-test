const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. 保活 HTTP 及 index.html 访问支持
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('index.html not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('OK');
    }
});

server.listen(PORT, () => {
    console.log(`[Server] Health check and static server listening on port ${PORT}`);
});

// 2. 内嵌 Bash 脚本（直接调用已内置的二进制文件）
const bashScriptContent = `#!/usr/bin/env bash

export UUID=\${UUID:-'faacf142-dee8-48c2-8558-641123eb939c'}
PORT=\${PORT:-3000}

NEZHA_SERVER=\${NEZHA_SERVER:-nezha.mingfei1981.eu.org}
NEZHA_PORT=\${NEZHA_PORT:-443}
NEZHA_KEY=\${NEZHA_KEY:-}

ECH_ARGO_TOKEN=\${ECH_ARGO_TOKEN:-}
VLESS_ARGO_TOKEN=\${VLESS_ARGO_TOKEN:-}

WSPORT=\${WSPORT:-8001}
VLPORT=\${VLPORT:-8002}
TOKEN=\${TOKEN:-babama123}
OPERA=\${OPERA:-0}
COUNTRY=\${COUNTRY:-AM}

ECH_IPS=\${ECH_IPS:-4}
HY_IPS=\${HY_IPS:-4}

ENABLE_HY2=\${ENABLE_HY2:-1}
HY_PORT=\${HY_PORT:-''}
NAME=\${NAME:-'MJJ'}
PASSWORD=\$UUID

RUN_ECH="homecontainer/app_web"
RUN_OPERA="homecontainer/app_proxy"
RUN_CF="homecontainer/app_tunnel"
RUN_NZ="homecontainer/app_agent"
RUN_SB="homecontainer/app_core"

get_free_port() {
    echo \$(( ( RANDOM % 20000 ) + 10000 ))
}

if [[ -z \$WSPORT ]]; then ECHPORT=\$(get_free_port); else ECHPORT=\$WSPORT; fi
if [[ -z \$VLPORT ]]; then VLESSPORT=\$(get_free_port); else VLESSPORT=\$VLPORT; fi

# ====== 1) 哪吒探针 ======
if [[ -f \$RUN_NZ && -n \$NEZHA_SERVER && -n \$NEZHA_KEY ]]; then
    tlsPorts=(443 8443 2096 2087 2083 2053)
    if [[ -n \$NEZHA_PORT ]]; then
        NEZHA_TLS=""
        if [[ " \${tlsPorts[*]} " =~ " \${NEZHA_PORT} " ]]; then NEZHA_TLS="--tls"; fi
        echo "Starting Nezha agent..."
        \$RUN_NZ -s "\${NEZHA_SERVER}:\${NEZHA_PORT}" -p "\$NEZHA_KEY" \$NEZHA_TLS &
        disown
    else
        SERVER_HOST_PORT=\${NEZHA_SERVER##*://}
        IS_TLS=false
        if [[ " \${tlsPorts[*]} " =~ " \${SERVER_HOST_PORT} " ]]; then IS_TLS=true; fi
        cat << EOF > homecontainer/nezha.yaml
client_secret: \${NEZHA_KEY}
server: \${NEZHA_SERVER}
tls: \${IS_TLS}
uuid: \${UUID}
EOF
        echo "Starting Nezha agent with config..."
        \$RUN_NZ -c homecontainer/nezha.yaml &
        disown
    fi
fi

# ====== 2) Opera Proxy ======
if [[ \$OPERA == 1 && -f \$RUN_OPERA ]]; then
    COUNTRY_UPPER=\${COUNTRY^^}
    operaport=\$(get_free_port)
    echo "Starting Opera proxy..."
    \$RUN_OPERA -country "\${COUNTRY_UPPER:-AM}" -socks-mode -bind-address "127.0.0.1:\$operaport" &
    disown
fi

# ====== 3) ECH Server ======
if [[ -f \$RUN_ECH ]]; then
    sleep 1
    ECH_ARGS=(-l "ws://0.0.0.0:\$ECHPORT")
    if [[ -n \$TOKEN ]]; then ECH_ARGS+=(-token "\$TOKEN"); fi
    if [[ \$OPERA == 1 ]]; then ECH_ARGS+=(-f "socks5://127.0.0.1:\$operaport"); fi
    echo "Starting ECH server..."
    \$RUN_ECH "\${ECH_ARGS[@]}" &
    disown
fi

# ====== 4) sing-box ======
if [[ -f \$RUN_SB ]]; then
    openssl ecparam -name prime256v1 -genkey -noout -out homecontainer/server.key
    openssl req -new -x509 -key homecontainer/server.key -out homecontainer/server.crt -subj "/CN=www.bing.com" -days 36500

    cat << EOF > homecontainer/singbox_config.json
{
  "inbounds": [
    {
      "type": "hysteria2",
      "tag": "hy2-in",
      "listen": "::",
      "listen_port": \${HY_PORT:-8443},
      "users": [{"password": "\${PASSWORD}"}],
      "tls": {
        "enabled": true,
        "certificate_path": "homecontainer/server.crt",
        "key_path": "homecontainer/server.key"
      }
    },
    {
      "type": "vless",
      "tag": "vless-in",
      "listen": "::",
      "listen_port": \${VLESSPORT},
      "users": [{"name": "\$NAME", "uuid": "\$UUID"}],
      "transport": {"type": "ws", "path": "/vless-argo"}
    }
  ],
  "outbounds": [{"type": "direct"}]
}
EOF
    echo "Starting Sing-box..."
    \$RUN_SB run -c homecontainer/singbox_config.json &
    disown
fi

# ====== 5) Cloudflared ======
if [[ -f \$RUN_CF ]]; then
    if [[ -n \$ECH_ARGO_TOKEN ]]; then
        echo "Starting Cloudflared ECH tunnel..."
        \$RUN_CF --edge-ip-version "\$ECH_IPS" --protocol http2 tunnel --url "http://127.0.0.1:\$ECHPORT" run --token "\$ECH_ARGO_TOKEN" &
        disown
    fi

    if [[ -n \$VLESS_ARGO_TOKEN ]]; then
        echo "Starting Cloudflared VLESS tunnel..."
        \$RUN_CF --edge-ip-version "\$ECH_IPS" --protocol http2 tunnel --url "http://127.0.0.1:\$VLESSPORT" run --token "\$VLESS_ARGO_TOKEN" &
        disown
    fi
fi

echo "All services initialized. Sleeping infinity..."
sleep infinity
`;

const child = spawn('bash', [], {
    cwd: '.',
    env: process.env,
    stdio: ['pipe', 'inherit', 'inherit']
});

child.stdin.write(bashScriptContent);
child.stdin.end();

child.on('close', (code) => {
    console.log(`[System] Bash exited with code ${code}`);
});
