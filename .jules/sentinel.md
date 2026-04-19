## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection in Browser Execution via Shell Interpolation]
**Vulnerability:** The `openBrowser(url)` utility in `src/auth.js` interpolated unsanitized `url` values directly into a shell string executed by `child_process.exec` (e.g., `open "${url}"` or `start "" "${url}"`). This was highly susceptible to command injection if an attacker could control the URL.
**Learning:** Shell strings using `child_process.exec` are dangerously prone to command injection via shell meta-characters (like `;`, `&`, `|`, etc.).
**Prevention:** Replaced manual OS-specific shell commands with the reliable third-party `open` library, which safely spawns browser processes and correctly handles arguments escaping.
