## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via exec in Jules Bridge]
**Vulnerability:** The functions `createJulesSession` and `pullJulesSession` in `src/jules_bridge.js` used `child_process.exec` with unescaped user input interpolated directly into the command string. This allowed for arbitrary command injection if a user provided a payload with shell metacharacters (e.g., `;`, `&&`).
**Learning:** Using `child_process.exec` with any form of user input is highly dangerous because it runs within a shell. Even seemingly safe variables should not be concatenated directly.
**Prevention:** Replaced `child_process.exec` with `child_process.execFile` and passed the command arguments as an array. `execFile` executes the binary directly without spawning a shell by default, thus neutralizing shell metacharacters in the input arguments.
