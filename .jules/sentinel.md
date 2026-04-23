## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2026-04-23 - [Command Injection via exec String Interpolation]
**Vulnerability:** In `src/jules_bridge.js` and `src/auth.js`, `child_process.exec` was used with string interpolation (`exec(\`jules remote new --session "${prompt}"\`)` and `exec(command + url)`). This allows an attacker to inject shell commands by passing specially crafted strings (e.g., `prompt` containing `"; rm -rf /"`).
**Learning:** Never use `child_process.exec` or string concatenation to build commands that include variable inputs.
**Prevention:** Use `child_process.execFile` and pass arguments as an array instead, which bypasses the shell entirely, preventing command injection. For opening URLs, utilize established libraries like `open` that handle arguments safely instead of rolling custom `exec` commands.
