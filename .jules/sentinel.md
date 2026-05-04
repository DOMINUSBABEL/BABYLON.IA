## 2024-05-18 - Command Injection Vulnerability in jules_bridge.js
**Vulnerability:** Command injection in `createJulesSession` and `pullJulesSession` using `exec()`.
**Learning:** Functions evaluating unsanitized inputs like `prompt` or `sessionId` via `child_process.exec()` with string interpolation are inherently vulnerable.
**Prevention:** Use `child_process.execFile()` with inputs passed in argument arrays to prevent shell execution and breakout.
