const { spawn } = require("child_process");
const tunnel = spawn("C:\\Program Files (x86)\\cloudflared\\cloudflared.exe", ["tunnel", "--config", "C:\\Users\\PC-09\\.cloudflared\\safety-config.yml", "run"], { stdio: "inherit" });
tunnel.on("close", (code) => process.exit(code));
