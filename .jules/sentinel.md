## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.
## 2025-02-28 - [CRITICAL] Prevent Command Injection via child_process.exec
**Vulnerability:** Found uses of `child_process.exec` with string interpolation (e.g., `exec("jules remote new --session \"" + prompt + "\"")` and `exec("open \"" + url + "\"")`). This allowed arbitrary command injection if an attacker controlled the `prompt` or `url` variables, as the input was passed directly to the system shell.
**Learning:** Never use string concatenation or interpolation with `child_process.exec`. Shell interpretation makes it trivial to escape strings and execute arbitrary payloads. In the Node ecosystem, passing shell paths can compromise the host machine.
**Prevention:**
1. Use `child_process.execFile` (or `spawn`) with an array of arguments, completely bypassing the shell (e.g., `execFile("jules", ["remote", "new", "--session", prompt])`).
2. Rely on secure third-party libraries (like `open`) which abstract away platform-specific execution risks instead of writing custom command shells for basic tasks.
