## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via exec]
**Vulnerability:** The `src/jules_bridge.js` file used `child_process.exec` with unescaped string interpolation for `prompt` and `sessionId`, creating a command injection vulnerability where a user could execute arbitrary shell commands.
**Learning:** `exec` evaluates a string command in a shell, allowing operators like `&&` or `;` to break out and execute extra commands. `execFile` circumvents this issue by directly executing the binary with an array of arguments, not spawning a shell.
**Prevention:** Always use `execFile` (or `spawn` without `shell: true`) instead of `exec` when user input is included in the execution command, passing parameters as array arguments.
