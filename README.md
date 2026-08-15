# SQLiBar – Pentesting & SQLi Toolkit

<img width="1983" height="793" alt="SQLiBar" src="https://github.com/user-attachments/assets/cafe6347-1521-4cdd-a2dc-b44eaee67702" />

**A Firefox Developer Tools extension** for authorized security testing: real-time SQL injection detection, live network capture, parameter discovery, request crafting, payload encoding, and multi-language UI.

Built for security researchers, penetration testers, and developers who analyze parameters, manipulate HTTP requests, and test for SQL injection directly in the browser.

> **Disclaimer:** SQLiBar is strictly for **authorized** security testing, education, and research on systems you own or have explicit permission to test. Unauthorized use against third-party systems is illegal.

---

## Features

### SQL Injection Detection & Analysis

- Automated response analysis against **100+** database- and ORM-specific error patterns  
  (MySQL, MariaDB, PostgreSQL, MSSQL, Oracle, SQLite, DB2, Sybase, Access/JET, H2, Firebird, PDO, SQLAlchemy, Django, Laravel, Hibernate, Entity Framework, Prisma, and more)
- Multi-language error phrases (EN / DE / FR / ES)
- **Baselines:** length, time, and full body (line-level **diff**)
- **Reflection detection** – payload fragments found in the response
- Severity badges (high / medium / low) with matched snippet

<img width="2042" height="615" alt="SQLi detection" src="https://github.com/user-attachments/assets/427d3544-2067-4c06-9a79-200fbb5972ed" />

### Header SQLi Mass-Test

- One-click batch testing of custom headers for SQL injection
- One request per header; only that header is modified
- **Risky only** – limit to known high-risk headers (X-Forwarded-For, Cookie, Authorization, …)
- **Current payload** or built-in detection set (error-based + time-based)
- Progress, abort, results with status / timing / badges (`clean` · `HIGH` · `TIME` · `error`)
- Load any result back into the tester
<img width="1115" height="366" alt="Screenshot 2026-08-15 141256" src="https://github.com/user-attachments/assets/25191dd1-c9e6-4fe5-a29b-9056d91ac747" />

### JSON Key SQLi Mass-Test

- Automatic SQLi testing of every value in a JSON request body
- One request per leaf value; nested objects and arrays supported
- **Append mode** – original value is kept, payload is concatenated (nothing replaced)
- Options: current payload or detection set; optional **leaves only**
- Progress, abort, results panel (path, original value, payload, status, timing)
- **→ Body** loads the injected JSON for that single test
<img width="1124" height="730" alt="Screenshot 2026-08-15 141235" src="https://github.com/user-attachments/assets/2ecc59b2-b1cd-44d3-bcea-fa206f2d076a" />

### Live Network Monitor

- Real-time capture of HTTP / XHR / Fetch / document requests
- Filters: All · XHR/Fetch · Documents · POST only · free-text search
- Per-request: method, status, headers, body, response preview
- Actions: copy URL · cURL · params · send to Tester · Replay
- Parameter aggregator (query / body / JSON / cookie / header) with type filter and search

<img width="2830" height="882" alt="Live Network" src="https://github.com/user-attachments/assets/7f53514e-035a-4b88-9d72-67a5cba94e37" />

### Page Parameter Scanner

- DOM scan for form fields, hidden inputs, query params, link params, `data-*` attributes, cookies
- One-click push to URL, body, or payload field

### Request Builder / Tester

- URL field with load-current, copy, cURL export
- Methods: GET · POST · PUT · PATCH · DELETE · HEAD · OPTIONS
- Custom headers with presets (IP/proxy, host rewrite, auth, content, language, exotic)
- Body editor with JSON / form-urlencoded toggles
- **JSON nested key explorer** – click path → payload / URL / copy path
- Optional: send cookies, set cookies via background, navigate after request
- Response viewer: syntax highlighting (JSON & HTML), search, copy

### Boolean Blind Mini-Test

- True vs False comparison without leaving the panel
- Compares status, length, timing, and body hash
- Clear verdict when responses differ (possible boolean-blind)

### Payload Presets

- Categorized preset library
- Dynamic **UNION** column generator (`1,2,3…` or `NULL,NULL…`)
- Apply at cursor in the URL field

### Encoder / Decoder

- URL · Double · Triple · Selective (SQLi-oriented)
- Base64 · Base64 URL-safe
- Hex (spaced · `0xAABB` · `\x` · comma) · Binary · ASCII/Decimal
- SQL `CHAR()` · `CHAR(0x…)` · `CONCAT(CHAR…)`
- Unicode `\u` · `%u` · Fullwidth · HTML entities · JSON · JWT decode · ROT13
- Optional second-stage chain + live encode
- Send result → Payload · URL · Body

### Themes & Localization

- Schemes: Neon Green, Cyber Cyan, Violet, Amber, Hot Pink, Electric Blue, Matrix Lime, Mono + **custom accent**
- Languages: **English**, **Deutsch**, **Español**, **Français**, **Português**, **Русский**, **日本語**, **中文**, **Türkçe**, **العربية**

---

## Installation

### Firefox Add-ons (recommended)

Install from [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/sqlibar/).

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

| Permission | Reason |
|------------|--------|
| `devtools` | Native panel inside Firefox Developer Tools |
| `webRequest` / network | Live capture of requests and response metadata |
| `cookies` | Read/set cookies for authenticated testing |
| `activeTab` | Interact with the currently inspected tab |
| host / fetch (as needed) | Background fetch for Tester without panel CORS limits |

---

## Usage (quick start)

1. Open DevTools on the target → **SQLiBar** panel  
2. **Load current URL** or paste a target  
3. **Scan Page** and/or use **Live Network** to discover parameters  
4. Click a network entry → inspect request + response  
5. Choose a payload preset (or custom) → **Apply**  
6. **Open** to send; review **SQLi Detection**  
7. Use **Header SQLi Mass-Test** or **JSON Keys ▶ → Test all JSON keys** for batch injection tests  
8. **Encode** tab for encoding; **Options** for theme & language  

---

## Project structure

```text
SQLiBar/
├── manifest.json
├── panel.html              # UI shell (Tester, Live Network, Encode, Options)
├── panel.js                # Orchestration entry
├── network.js              # Live network list + details + cURL/params
├── params.js               # Page scanner + param aggregator + JSON explorer + JSON mass-test
├── sqli-detect.js          # Patterns, baselines, reflection, diff
├── response-view.js        # Highlighted response + search + copy
├── tester.js               # URL/payloads/headers/inject/cURL + header mass-test
├── utils.js                # log, toast, escapeHtml, helpers
├── i18n.js
├── encoder.js
├── presets.js
├── theme.js
├── styles.css
├── background.js           # fetchUrl, setCookies, inject helpers
├── icons/
├── LICENSE
└── README.md
```

---

## Contributing

Contributions welcome, especially:

- Additional SQLi error patterns / fingerprints
- New payload presets
- Translations and i18n fixes
- Network/response UX improvements
- Bug reports

Open an issue or pull request. Keep changes focused and describe the motivation.

---

## License

**MIT License** – see [LICENSE](LICENSE).

---

## Disclaimer

Use SQLiBar only on systems you own or are explicitly authorized to test. The authors are not responsible for misuse or damage resulting from the use of this tool.
