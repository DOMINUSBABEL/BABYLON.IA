## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2026-04-25 - [Command Injection in Jules Bridge via exec]
**Vulnerability:** The `createJulesSession` and `pullJulesSession` functions in `src/jules_bridge.js` used `child_process.exec` with unvalidated inputs (`prompt` and `sessionId`) directly interpolated into the shell command string, allowing for arbitrary command execution if an attacker crafted a malicious input.
**Learning:** String interpolation in `child_process.exec` is highly dangerous because the input is evaluated by the shell.
**Prevention:** Replaced `exec` with `child_process.execFile` and passed arguments as an array, preventing the shell from evaluating any injected metacharacters.
