## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.
## 2025-04-29 - [Command Injection via child_process.exec]
**Vulnerability:** Found multiple usages of `child_process.exec` allowing command injection. `src/jules_bridge.js` passed unsanitized arguments via string interpolation, and `src/auth.js` executed unverified URL strings.
**Learning:** `child_process.exec` uses a shell to execute commands which makes it trivial to inject arbitrary commands when passing user input as strings.
**Prevention:** Use `child_process.execFile` and pass arguments securely as an array, or utilize well-vetted libraries like `open` which internally use safer APIs to interact with the system.
