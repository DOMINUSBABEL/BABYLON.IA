## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.
## 2025-05-24 - [Command Injection via exec]
**Vulnerability:** Using `exec` directly combined with string interpolation to run shell commands in `src/jules_bridge.js` (e.g., `execPromise(\`jules remote new --session "\${prompt}"\`)\`) allowed for arbitrary command injection if the variables (like `prompt` or `sessionId`) were tampered with.
**Learning:** Directly invoking shell execution paths with `exec` when handling inputs is dangerous. Passing user inputs directly into `exec` strings allows for escaping constraints easily. Even when the injection is difficult, security in depth dictates avoiding `exec` altogether where possible.
**Prevention:** To prevent command injection vulnerabilities, never use `child_process.exec` with string interpolation. Instead, use `child_process.execFile` passing arguments as an array, or utilize dedicated libraries (like `open` for handling URLs) that safely bypass shell execution.
