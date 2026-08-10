
# SQLiBar – Pentesting & SQLi Toolkit

**A Firefox Developer Tools extension** for security testing, real-time SQL injection pattern detection, request manipulation, parameter discovery, payload encoding, and multi-language UI support.

Designed for security researchers, penetration testers, and web developers who want to analyze parameters, craft HTTP requests, and test for SQL injection vulnerabilities directly from the browser.

> **Disclaimer:** SQLiBar is strictly intended for **authorized** security testing, educational purposes, and vulnerability research on systems you own or have explicit permission to test. Unauthorized use against third-party systems is illegal.
<img width="2322" height="942" alt="screenshot" src="https://github.com/user-attachments/assets/43b9d18b-01bb-49a7-bc8f-89d817949f8f" />

---

## Features

### SQL Injection Detection & Pattern Analysis
- Automated response analysis against **100+** database-specific error patterns  
  (MySQL, MariaDB, PostgreSQL, MSSQL, Oracle, SQLite, DB2, Sybase, Access, H2, Firebird, and common ORMs: PDO, SQLAlchemy, Django, Laravel, Hibernate, Entity Framework, Prisma, …)
- **Baseline comparison** – set response length and timing baselines to catch Boolean-, Union-, Error-, and Time-based anomalies
- **Reflection detection** – highlights payload fragments that appear in the response
- **Diff view** – line-based comparison against the stored baseline body
- Visual severity indicators (high / medium / low) with code snippet context

### Smart Page Parameter Scanner
- Scans the current page DOM for form fields, hidden inputs, URL query parameters, link parameters, `data-*` attributes, and cookies
- Push discovered parameters to URL query, request body, or payload field with one click

### Live Network Capture & Parameter Aggregator
- Real-time monitoring of HTTP / XHR / Fetch requests
- Automatic extraction of parameters from headers, query strings, URL-encoded bodies, and nested JSON
- Inspect request/response headers, bodies, and previews
- Filter by All / XHR / Documents / POST; search by URL or method
<img width="2342" height="650" alt="Screenshot 2026-08-09 122918" src="https://github.com/user-attachments/assets/f9c9b529-fa7e-44b3-bf27-3c0673815021" />

### Payload Presets & Request Manipulation
- Built-in payload preset manager with dynamic column generator for UNION-based tests
- Interactive JSON body tree for nested keys
- Custom HTTP header injector (X-Forwarded-For, Authorization, Host rewrite, cookies, …)
- Method selection (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS), body editor, optional navigation
- One-click **cURL** export

### Response Viewer
- Syntax highlighting for **JSON** and **HTML** bodies
- In-response search (case-sensitive, next/previous)
- Copy full response or body only

### Multi-Format Encoder / Decoder
URL, Double URL, Base64, Base64 URL-Safe, Hex (spaced / `0x` / `\x`), ASCII/Decimal, SQL `CHAR()`, Unicode (`\u` & `%u`), HTML Entities, JSON, JWT Decode, ROT13, Binary

### Themes & Localization
- Color schemes: Neon Green, Cyber Cyan, Violet, Amber, Hot Pink, Electric Blue, Matrix Lime, Mono + custom accent
- UI languages: **Deutsch**, **English**, **Español**, **Русский**, **中文** (preference saved)
<img width="1925" height="635" alt="Screenshot 2026-08-09 122704" src="https://github.com/user-attachments/assets/15f7081b-9782-441b-bad1-d0e0d8d53274" />

---

## Installation

### Firefox Add-ons (recommended)
Install from [addons.mozilla.org](https://addons.mozilla.org) (Coming Soon).

### Temporary load (development)
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the extension’s `manifest.json`

### From GitHub Releases
1. Download the latest `.xpi` from [Releases](../../releases)
2. Open `about:addons` → gear icon → **Install Add-on From File…**
3. Select the `.xpi`

---

## Permissions

| Permission   | Reason |
|--------------|--------|
| `devtools`   | Native panel inside Firefox Developer Tools |
| `webRequest` | Capture live network traffic and response metadata |
| `cookies`    | Read/set cookies for authenticated testing |
| `activeTab`  | Interact with the currently inspected tab |

---

## Usage (quick start)

1. Open DevTools on the target page → **SQLiBar** panel  
2. **Load current** URL or paste a target  
3. **Scan Page** or use **Live Network** to discover parameters  
4. Pick a payload preset (or write your own) → **Apply**  
5. **Open** to send the request; check **SQLi Detection** for error patterns, length/time deltas, reflection, and diff  
6. Use **Encode** tab for encoding/decoding; **Options** for theme and language  

---

## Project structure

```text
SQLiBar/
├── manifest.json
├── panel.html
├── panel.js
├── i18n.js
├── encoder.js
├── presets.js
├── styles.css
├── background.js          # if present
├── icons/
├── LICENSE
└── README.md
```

---

## Contributing

Contributions are welcome, especially:
- Additional SQLi error patterns / fingerprints
- New payload presets
- Translations and i18n fixes
- Bug reports and UI improvements

Open an issue or pull request. Please keep changes focused and describe the motivation.

---

## License

This project is licensed under the **MIT License** – see [LICENSE](LICENSE).

---

## Disclaimer (again)

Use SQLiBar only on systems you own or are explicitly authorized to test. The authors are not responsible for misuse or damage resulting from the use of this tool.
