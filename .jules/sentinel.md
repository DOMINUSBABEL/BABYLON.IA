## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2024-05-11 - Replace child_process.exec with safer alternatives
**Vulnerability:** Use of `child_process.exec` and `child_process.execPromise` allowed executing shell commands with string interpolation, which exposes the system to command injection vulnerabilities. The deprecated `openBrowser` function in `src/auth.js` and system model check in `src/server.js` were particularly problematic.
**Learning:** Using `exec` directly passes strings to the shell, making it unsafe when inputs could be controlled or manipulated. When working with local utilities, it is essential to use strictly structured execution patterns.
**Prevention:** Always use `child_process.execFile` with argument arrays or robust dedicated libraries (such as `open` for URLs) to bypass shell evaluation of inputs. This ensures parameters are handled safely and command injection is mitigated.
