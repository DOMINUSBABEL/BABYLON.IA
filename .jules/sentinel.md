## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2024-05-09 - [Command Injection via child_process.exec]
**Vulnerability:** Arbitrary command injection vulnerability in `src/jules_bridge.js` where user-controlled inputs (`prompt` and `sessionId`) were passed directly into `child_process.exec` using string interpolation. The unused `openBrowser` function in `src/auth.js` also exhibited a similar insecure pattern.
**Learning:** `child_process.exec` spawns a shell to execute commands, making it susceptible to injection attacks if inputs are not sanitized. Unvalidated string inputs in shell commands are a critical risk.
**Prevention:** Always use `child_process.execFile` or `child_process.spawn` with an array of arguments, preventing shell evaluation of the inputs. Additionally, use established libraries like `open` instead of custom insecure wrapper functions for specific OS-level tasks.
