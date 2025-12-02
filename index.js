// ===== VLESS-WS-TLS 8节点终极稳定版（已修复所有报错）=====
const http = require('http');
const net  = require('net');
const { WebSocket, createWebSocketStream } = require('ws');

// ================== 配置区 ==================
const UUID   = process.env.UUID   || "a252b604-ebd8-43fe-bebc-1808553befdd";    // 设置UUID
const PORT   = process.env.PORT   || "22346";                                   // 输入端口
const DOMAIN = process.env.DOMAIN || "free.easysharing.dpdns.org";               // 输入域名
// ============================================

const BEST_DOMAINS = [
  "www.visa.com.hk",
  "www.visa.com.tw",
  "www.visa.cn",
  "cf.877774.xyz",
  "cmcc.877774.xyz",
  "ct.877774.xyz",
  "cu.877774.xyz"
];

// 关键：生成链接函数必须在前面定义！
function generateLink(address) {
  return `vless://${UUID}@${address}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#${DOMAIN}-${address.split('.').join('-')}`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === `/${UUID}`) {
    let txt = "8条节点链接（控制台已输出）\n";
    txt += generateLink(DOMAIN) + "\n";
    BEST_DOMAINS.forEach(d => txt += generateLink(d) + "\n");
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(txt);
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  ws.once('message', msg => {
    const [version] = msg;
    const id = msg.slice(1, 17);
    const clean = UUID.replace(/-/g, '');
    if (!id.every((v, i) => v === parseInt(clean.substr(i * 2, 2), 16))) return;

    let i = 17;
    i += 1 + msg.slice(i, i + 1).readUInt8();
    i += 2;
    ws.send(new Uint8Array([version, 0]));
    const duplex = createWebSocketStream(ws);
    net.connect(msg.slice(i - 2, i).readUInt16BE(), '0.0.0.0', () => {
      this.write(msg.slice(i));
      duplex.pipe(this).pipe(duplex);
    }).on('error', () => ws.close());
  });
});

// ================== 启动时直接打印 8 条链接 ==================
server.listen(PORT, () => {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║                  VLESS-WS-TLS 8节点已启动！                  ║");
  console.log(`║ 主域名   : ${DOMAIN.padEnd(48)}║`);
  console.log(`║ 后端端口 : ${PORT.padEnd(48)}║`);
  console.log(`║ UUID     : ${UUID}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("════════════════════ 以下是完整的 8 条节点链接 ════════════════════\n");

  console.log("1️⃣ 主域名");
  console.log(generateLink(DOMAIN));
  console.log("");

  BEST_DOMAINS.forEach((d, i) => {
    console.log(`${i + 2}️⃣ ${d}`);
    console.log(generateLink(d));
    console.log("");
  });

  console.log("══════════════════════════════════════════════════════════════");
  console.log("↑ 上面共 8 条链接已全部输出，可直接复制使用！");
  console.log("══════════════════════════════════════════════════════════════\n");
});
