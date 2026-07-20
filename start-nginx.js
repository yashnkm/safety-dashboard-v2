const { spawn } = require("child_process");
const nginx = spawn("C:\\nginx\\nginx.exe", [], { cwd: "C:\\nginx", stdio: "inherit" });
nginx.on("close", (code) => process.exit(code));
process.on("SIGTERM", () => { spawn("C:\\nginx\\nginx.exe", ["-s", "quit"], { cwd: "C:\\nginx" }); });
