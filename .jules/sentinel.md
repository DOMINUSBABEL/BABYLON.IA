## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.
## 2025-04-14 - Removed Command Injection vulnerability in openBrowser

**Vulnerability:** The `openBrowser` function in `src/auth.js` utilized `child_process.exec` to interpolate a `url` parameter directly into a shell command (`start "" "${url}"` or `xdg-open "${url}"`). This is a classic OS command injection vulnerability.

**Learning:** Any dynamic string passed to `exec` is parsed by the shell, making it extremely dangerous. The `open` module was already imported but not fully utilized for this function.

**Prevention:** Always use safe libraries like `open` or parameterized equivalents like `spawn` (without `shell: true`) when handling dynamic arguments or parameters. Refrain from implementing shell interpolation.
