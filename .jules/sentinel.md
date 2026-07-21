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

## 2025-05-24 - [Cross-Site Scripting (XSS) via Unsanitized innerHTML in WebSocket Event Handlers]
**Vulnerability:** In `public/app.js`, data received over WebSockets (logs, reasoning outputs, and file tree names) was being injected directly into the DOM using `.innerHTML` without proper HTML escaping. This allowed Cross-Site Scripting (XSS) if malicious payloads were returned by the AI or present in file names.
**Learning:** Any untrusted data or dynamically generated content injected via `.innerHTML` MUST be sanitized. Furthermore, when dynamically creating inline JavaScript event handlers (e.g., `onclick="loadWikiFile(...)"`), variables must be both JSON serialized (to prevent JavaScript syntax breakouts) and HTML escaped.
**Prevention:** Added a global `escapeHTML` helper function and applied it consistently to all dynamic text insertions before they are assigned to `.innerHTML`.

## 2025-05-24 - [Command Injection via exec in Server Model Check]
**Vulnerability:** The function `check_local_models` in `src/server.js` used `child_process.exec('ollama list', ...)` without explicit array arguments, utilizing the shell parser. While not directly vulnerable through interpolation here, standardizing on `execFile` prevents future developers from appending user input and introducing command injection.
**Learning:** `exec` should be avoided completely in favor of `execFile`, even for static commands, to enforce a secure baseline and prevent "copy-paste" vulnerabilities when later modified to accept arguments.
**Prevention:** Replaced `child_process.exec` with `child_process.execFile` and passed command arguments via an array.

## 2025-05-24 - [Command Injection via exec in Auth Open Browser]
**Vulnerability:** The function `openBrowser` in `src/auth.js` used `child_process.exec` with string interpolation to pass `url` arguments. This exposed the application to command injection vulnerabilities if a malicious URL is provided, as the `url` is concatenated directly into the shell command string (`open "${url}"` etc.).
**Learning:** External inputs like URLs should never be interpolated into shell commands. Native functions like `child_process.exec` execute within a shell by default, which parses metacharacters. If using an external library for a task (like `open`), it's better to use it consistently rather than writing custom `exec`-based wrappers.
**Prevention:** Replaced the custom `child_process.exec` wrapper with direct usage of the `open` library, which safely handles URLs across platforms without invoking shell execution with interpolated strings.

## 2026-06-13 - [Path Traversal via Untrusted LLM Action Input]
**Vulnerability:** The `read_local_file` action in `src/tools_registry.js` dynamically resolved file paths provided by the LLM (`actionInput`) relative to the current working directory without validating boundaries. This opened the system up to path traversal. An attacker could use indirect prompt injection (e.g., through a scraped webpage or a maliciously crafted message) to force the LLM to output a path like `../../../../etc/passwd`, allowing unauthorized read access to system files.
**Learning:** LLM tool/action inputs must be treated as completely untrusted and strictly validated. Security boundaries should exist not just at the set of user interfaces, but also around internal APIs exposed to the LLM agent.
**Prevention:** Implemented strict directory boundary validation in `read_local_file` to ensure `resolvedPath` exactly equals or starts with the expected base directory plus a path separator (`process.cwd() + path.sep`), blocking attempts to navigate outside the intended scope.

## 2026-06-13 - [Missing HTTP Security Headers]
**Vulnerability:** The Express application in `src/server.js` was serving static files from `public/` and processing API requests without enforcing basic HTTP security headers. This omission leaves the application vulnerable to MIME sniffing, clickjacking, and some forms of Cross-Site Scripting (XSS).
**Learning:** Security headers are a fundamental layer of defense-in-depth for web applications. They must be explicitly configured as middleware *before* any static file serving or route handling to ensure they apply to all responses.
**Prevention:** Added custom middleware at the top of the Express configuration to inject `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `X-XSS-Protection: 1; mode=block` into all HTTP responses.
