// ======================= 模块检测 =======================
const http = require('http');
const net = require('net');
const os = require('os');
const { execSync } = require('child_process');

// 自动安装 ws
try {
    require.resolve('ws');
} catch (e) {
    console.log("缺少模块 ws，正在安装...");
    execSync("npm install ws", { stdio: 'inherit' });
}
const { WebSocket, createWebSocketStream } = require('ws');

// ======================= 三个核心变量 =======================
const UUID   = (process.env.UUID   || "00000000-0000-0000-0000-000000000000").trim();
const PORT   = (process.env.PORT   || "3000").trim(); 
const DOMAIN = (process.env.DOMAIN || "your-domain.example.com").trim();

// Panel 名称（用在 tag）
const NAME = "easyshare";

// ======================= 8 个优选域名 =======================
const BEST_DOMAINS = [
  "104.16.0.0",
  "104.17.0.0",
  "104.18.0.0",
  "104.19.0.0",
  "104.20.0.0",
  "104.21.0.0",
  "104.22.0.0",
  "2606:4700::"
];

// ======================= 生成 VLESS 节点链接 =======================
function generateLink(address) {
    return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${NAME}`;
}

// ======================= HTTP 服务 =======================
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("VLESS WS TLS Running\n访问 /" + UUID + " 获取节点\n");
    }
    else if (req.url === `/${UUID}`) {
        let txt = "═════ easyshare VLESS-WS-TLS 节点 ═════\n\n";

        // 主域名
        txt += generateLink(DOMAIN) + "\n\n";

        // 优选域名
        BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n\n");

        txt += "节点已全部生成，可直接复制使用。\n";
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(txt);
    }
    else {
        res.writeHead(404);
        res.end("404 Not Found");
    }
});

// ======================= WebSocket（VLESS 后端） =======================
const wss = new WebSocket.Server({ server });
const uuid_clean = UUID.replace(/-/g, "");

wss.on('connection', ws => {
    ws.once('message', msg => {

        // 版本号
        const [VERSION] = msg;

        // UUID 校验
        const id = msg.slice(1, 17);
        if (!id.every((v, i) => v === parseInt(uuid_clean.substr(i * 2, 2), 16))) return;

        // 读取指令长度
        let p = msg.slice(17, 18).readUInt8() + 19;

        // 端口
        const port = msg.slice(p, p += 2).readUInt16BE();

        // 地址类型
        const ATYP = msg.slice(p, p += 1).readUInt8();

        let host = "";
        if (ATYP === 1) {
            host = msg.slice(p, p += 4).join('.');
        } else if (ATYP === 2) {
            const len = msg.slice(p, p + 1).readUInt8();
            host = new TextDecoder().decode(msg.slice(p + 1, p + 1 + len));
            p += 1 + len;
        } else if (ATYP === 3) {
            host = msg
                .slice(p, p += 16)
                .reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), [])
                .map(b => b.readUInt16BE(0).toString(16))
                .join(':');
        }

        // 返回成功握手
        ws.send(new Uint8Array([VERSION, 0]));

        const duplex = createWebSocketStream(ws);

        // TCP 转发
        net.connect({ host, port }, function () {
            this.write(msg.slice(p));
            duplex.pipe(this).pipe(duplex);
        }).on('error', () => ws.close());
    });
});

// ======================= 启动信息 =======================
server.listen(Number(PORT), () => {
    console.log("\n===============================================");
    console.log(" VLESS WS TLS 已启动");
    console.log("===============================================\n");
    console.log("主域名节点：");
    console.log(generateLink(DOMAIN), "\n");

    console.log("优选域名 8 条：\n");
    BEST_DOMAINS.forEach((d, i) => {
        console.log(`${i + 1}. ${generateLink(d)}\n`);
    });

    console.log(`访问 http://<你的IP>:${PORT}/${UUID} 查看完整节点`);
});
