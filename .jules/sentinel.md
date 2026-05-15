## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2026-05-15 - [Command Injection via `child_process.exec` wrapper functions]
**Vulnerability:** The wrapper functions for CLI tools in `src/jules_bridge.js` (`createJulesSession`, `pullJulesSession`) used `child_process.exec` and interpolated unsanitized variables (like `prompt` or `sessionId`) directly into the shell string. This permitted arbitrary command injection.
**Learning:** Functions that wrap shell utilities are particularly prone to command injection when relying on `child_process.exec`. Array arguments are strictly required to bypass shell interpretation.
**Prevention:** Removed string interpolation and migrated affected functions to `child_process.execFile`, passing inputs strictly as an array of arguments, successfully blocking shell execution breakouts. Also removed dead code relying on `exec` in `src/auth.js`.
