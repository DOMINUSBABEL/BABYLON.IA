## 2025-05-24 - [Command Injection via WebSocket Config Update]
**Vulnerability:** Unauthenticated WebSocket endpoint `update_config` allowed setting `process.env.GEMINI_MODEL` arbitrarily. This was passed directly to a `spawn({ shell: true })` call in `src/agent_core.js`, leading to a severe command injection vulnerability.
**Learning:** WebSocket inputs must be treated with the same strict sanitization as HTTP endpoints, especially when mapped to environment variables or shell execution paths.
**Prevention:** Added regex validation (`/^[a-zA-Z0-9.\-:]+$/`) to the incoming `model` string before updating the environment variable.

## 2025-05-24 - [Prefix-matching Path Traversal in Workspace Validation]
**Vulnerability:** `resolveAndValidatePath` in `src/server.js` used `.startsWith(path.resolve(basePath))` to check path boundaries. This is vulnerable to prefix-matching traversal (e.g., base path `/app/workspace` matches `/app/workspace-secret`).
**Learning:** Checking for directory boundaries using `.startsWith` on paths without the trailing path separator is a common pitfall that allows accessing identically-prefixed sibling directories.
**Prevention:** Updated validation to check if the `fullPath` exactly matches `resolvedBase` OR starts with `resolvedBase + path.sep`.

## 2025-05-24 - [Path Traversal via Unsanitized Media Filenames and Commands]
**Vulnerability:** In `src/gateway.js`, `event.media.filename` in media downloads and `<ruta>` in the `!geist enviar` command were used without sanitization via `path.basename()`. This allowed path traversal (e.g., downloading files to arbitrary directories or reading files outside the workspace) by authorized users or potentially via maliciously crafted filenames.
**Learning:** Even when inputs originate from internal systems or "authorized" users, filenames and file paths provided by users or APIs must always be sanitized to prevent accessing or writing files outside of intended directories.
**Prevention:** Ensured `event.media.filename` uses `path.basename()` before writing the file. Updated the `!geist enviar` command to securely resolve paths using `path.resolve` and correctly validate directory boundaries using `resolvedPath.startsWith(workspaceDir + path.sep)` to confine reads to the workspace directory without breaking nested file lookups.

## 2025-05-24 - [Command Injection via exec in Jules Bridge]
**Vulnerability:** The functions in `src/jules_bridge.js` used `child_process.exec` with string interpolation to pass `prompt` and `sessionId` arguments from users into the shell. This exposed the application to command injection vulnerabilities, as an attacker could supply input with shell metacharacters.
**Learning:** External inputs should never be interpolated into shell commands. Native functions like `child_process.exec` execute within a shell by default, which parses metacharacters.
**Prevention:** Replaced `child_process.exec` with `child_process.execFile` and passed all command arguments via an array, which bypasses the shell parser and natively prevents command injection.

## 2026-06-07 - [Path Traversal in LLM File Reading Tool]
**Vulnerability:** A path traversal vulnerability existed in `src/tools_registry.js` within the `read_local_file` LLM tool. The tool used `path.resolve(process.cwd(), actionInput)` without verifying that the resolved path remained inside the expected working directory, allowing arbitrary system file reads (e.g. `../../../../../etc/passwd`).
**Learning:** LLM tool parameters are fundamentally untrusted input, identical to user input in traditional APIs. Relying on `path.resolve` alone is insufficient because it successfully normalizes parent directory components (`../`) out of bounds.
**Prevention:** Always enforce strict boundary checks after path resolution (e.g., verifying `resolvedPath.startsWith(baseDir + path.sep) || resolvedPath === baseDir`) before performing file system operations on paths derived from LLM tool inputs.
