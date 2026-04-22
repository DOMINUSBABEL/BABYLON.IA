## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via String Interpolation in child_process.exec]
**Vulnerability:** The `openBrowser` function in `src/auth.js` used string interpolation to insert an unvalidated URL into a shell command executed via `child_process.exec`. An attacker controlling the URL could append shell commands (e.g. `https://example.com" && calc.exe #`) leading to arbitrary command execution.
**Learning:** Never use `child_process.exec` to run commands where part of the command string is derived from untrusted or external input, especially URLs, due to the complexity of correctly escaping shell metacharacters across multiple operating systems.
**Prevention:** Use safer alternatives like `child_process.spawn` or `child_process.execFile` with argument arrays. For opening URLs specifically, use the well-established `open` npm package, which abstracts away platform differences and handles argument escaping safely without invoking an intermediate shell.
