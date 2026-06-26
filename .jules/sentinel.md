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

## 2025-05-24 - [Path Traversal in Tools Registry]
**Vulnerability:** The `read_local_file` action in `src/tools_registry.js` was vulnerable to path traversal. While it resolved the path relative to the current working directory, it did not verify that the resulting absolute path was constrained *within* the root directory, allowing users/attackers to specify paths like `../package.json` to read arbitrary files accessible by the Node.js process.
**Learning:** Tool actions handling file paths provided dynamically by prompts or remote instructions must strictly validate directory boundaries (e.g., using `cwd` + `path.sep`) to prevent unintentional or malicious data exposure.
**Prevention:** Ensured the resolved path exactly matches `process.cwd()` or strictly begins with `process.cwd() + path.sep` before allowing the file read.
