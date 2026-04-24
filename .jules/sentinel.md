## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via exec]
**Vulnerability:** Several places in the codebase (`src/jules_bridge.js` and `src/auth.js`) used `child_process.exec` with unescaped user inputs (like `prompt`, `sessionId`, or `url`), leading to a Command Injection vulnerability where an attacker could execute arbitrary shell commands.
**Learning:** Using `child_process.exec` with string interpolation inherently passes the entire string to a shell for evaluation, which is highly dangerous if any part of the string is influenced by the user.
**Prevention:** Avoid `child_process.exec`. Instead, use `child_process.execFile` and pass arguments as an array, or use dedicated libraries (like `open` for URLs) that handle execution safely without shell evaluation.
