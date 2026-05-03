## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via exec in Jules Bridge]
**Vulnerability:** `createJulesSession` and `pullJulesSession` in `src/jules_bridge.js` used `child_process.exec` with string interpolation (`execPromise(\`jules remote new --session "${prompt}"\` )`), which allowed command injection if the user-provided `prompt` or `sessionId` contained shell metacharacters.
**Learning:** `child_process.exec` invokes a shell to execute the command, making it inherently vulnerable to injection when using unsanitized user inputs.
**Prevention:** Replaced `child_process.exec` with `child_process.execFile` and passed arguments as an array, preventing shell evaluation of the inputs.
