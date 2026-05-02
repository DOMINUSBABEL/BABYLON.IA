## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via child_process.exec String Interpolation]
**Vulnerability:** Found multiple instances where `child_process.exec` was used with string interpolation of user-controlled or external input. Specifically, `openBrowser` in `src/auth.js` interpolated URLs directly into OS-specific shell commands (`open "${url}"`, `start "" "${url}"`, etc.), and functions in `src/jules_bridge.js` interpolated inputs like `prompt` and `sessionId` into shell commands (`jules remote new --session "${prompt}"`). This pattern allows command injection if the input contains shell metacharacters (e.g., `;`, `&`, `|`, `$()`).
**Learning:** Using `child_process.exec` with dynamically constructed strings is inherently unsafe because it spawns a shell that parses and evaluates the entire string.
**Prevention:** Never use `child_process.exec` with string interpolation. Always use `child_process.execFile` (or `spawn` without `{ shell: true }`) and pass arguments as an array so they are not evaluated by a shell. For high-level tasks like opening URLs, use established libraries like `open` that handle OS specifics securely.
