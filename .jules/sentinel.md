## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Command Injection via String Interpolation in child_process.exec]
**Vulnerability:** The `openBrowser(url)` utility in `src/auth.js` used `child_process.exec` with string interpolation (e.g., \`open "${url}"\`) to launch OS-specific browsers. This allowed for arbitrary shell command injection if the URL was not strictly validated.
**Learning:** Using `child_process.exec` with unsanitized or loosely validated inputs via string interpolation is a classic command injection vector, particularly for system utilities like `open` or `xdg-open`.
**Prevention:** Avoid `child_process.exec` for dynamic inputs. Use established third-party libraries (like `open`) that handle OS-specific execution securely without a shell, or use `child_process.execFile` with arguments passed as an array.
