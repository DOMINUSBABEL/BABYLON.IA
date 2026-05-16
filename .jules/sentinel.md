## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via String Interpolation in child_process.exec]
**Vulnerability:** `src/jules_bridge.js` used `child_process.exec` with string interpolation for the `prompt` and `sessionId` arguments, exposing a command injection vulnerability where shell metacharacters could execute arbitrary code.
**Learning:** `child_process.exec` passes commands directly to a shell, making it extremely unsafe for dynamic or untrusted inputs, even if those inputs seem localized to specific logic layers.
**Prevention:** Replaced `exec` with `execFile`, utilizing parameter arrays to pass arguments cleanly to the executable, avoiding shell parsing completely.
