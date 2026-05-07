## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2026-05-07 - [Command Injection via exec string interpolation]
**Vulnerability:** Found `child_process.exec` being used with string interpolation in `src/jules_bridge.js` (`exec("jules remote new --session \"${prompt}\"")`) and `src/auth.js` (`exec("open \"${url}\"")`). This allowed arbitrary command execution if a malicious payload was injected via `prompt` or `url`.
**Learning:** Shell evaluation combined with untrusted string inputs is inherently unsafe because malicious input can break out of quotes and execute arbitrary commands.
**Prevention:** Avoid `child_process.exec`. Use `child_process.execFile` or `spawn` without `{shell: true}` and pass arguments as an array so they are handled safely by the OS rather than evaluated by a shell. Removed unused shell execution blocks where possible.
