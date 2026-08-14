# SQLiBar – Pentesting & SQLi Toolkit
<img width="1983" height="793" alt="daDAD" src="https://github.com/user-attachments/assets/cafe6347-1521-4cdd-a2dc-b44eaee67702" />

**A Firefox Developer Tools extension** for authorized security testing: real-time SQL injection pattern detection, live network capture, parameter discovery, request crafting, payload encoding, and multi-language UI.

Built for security researchers, penetration testers, and developers who analyze parameters, manipulate HTTP requests, and test for SQL injection directly in the browser.

> **Disclaimer:** SQLiBar is strictly for **authorized** security testing, education, and research on systems you own or have explicit permission to test. Unauthorized use against third-party systems is illegal.

---

## Features

### SQL Injection Detection & Analysis
- Automated response analysis against **100+** database- and ORM-specific error patterns  
  (MySQL, MariaDB, PostgreSQL, MSSQL, Oracle, SQLite, DB2, Sybase, Access/JET, H2, HSQLDB, Derby, Firebird, plus PDO, SQLAlchemy, Django, Laravel/Eloquent, Hibernate/JPA, Entity Framework, Prisma, Sequelize, TypeORM, Rails ActiveRecord, Node `mysql`/`pg`, Python DB-API, ASP.NET SqlClient, …)
- Multi-language error phrases (EN / DE / FR / ES)
- **Baselines**
  - Length baseline (Boolean / UNION / error-based deltas)
  - Time baseline (SLEEP / BENCHMARK / `pg_sleep` / `WAITFOR DELAY`)
  - Full body baseline for line-level **diff**
- **Reflection detection** – payload fragments found in the response (with context)
- Severity badges (high / medium / low) with matched snippet
- Summary stats on the detection panel (status, length Δ, time Δ, hit count)
<img width="2042" height="615" alt="Screenshot 2026-08-09 033559" src="https://github.com/user-attachments/assets/427d3544-2067-4c06-9a79-200fbb5972ed" />

### Live Network Monitor
- Real-time capture of HTTP / XHR / Fetch / document requests via DevTools Network API
- Filters: All · XHR/Fetch · Documents · POST only · free-text search
- Per-request view:
  - Method, status, type, timestamp
  - Inline parameter count & expandable param list
  - **Request headers + body**
  - **Response headers + body** (preview up to ~12 KB)
- Actions: copy URL · copy cURL · copy params · send to Tester · Replay
- Parameter aggregator across all captured requests (query / body / JSON / cookie / header) with type filter, search, and “only selected request”
<img width="2830" height="882" alt="Screenshot 2026-08-14 122740" src="https://github.com/user-attachments/assets/7f53514e-035a-4b88-9d72-67a5cba94e37" />

### Page Parameter Scanner
- DOM scan for:
  - Form fields & standalone inputs
  - Hidden inputs
  - URL query parameters
  - Link query parameters
  - Common `data-*` attributes
  - Cookies
- One-click push to URL query, request body, or payload field

### Request Builder / Tester
- URL field with load-current, copy, cURL export
- Method: GET · POST · PUT · PATCH · DELETE · HEAD · OPTIONS
- Custom headers (presets for IP/proxy, host rewrite, auth, content, language, exotic)
- Live headers from page · last network request headers
- Body editor with JSON / form-urlencoded Content-Type toggles
- **JSON nested key explorer** – click path → payload / URL / copy path
- Optional: send cookies, set cookies via background, navigate after request
- Response viewer with:
  - Syntax highlighting (JSON & HTML)
  - Search (case-sensitive, prev/next)
  - Copy full response or body only
- SQLi detection runs automatically on every Tester response

### Payload Presets
- Categorized preset library
- Dynamic **UNION** column generator (`1,2,3…` or `NULL,NULL…`)
- Apply at cursor position in the URL field
- Custom payload field + Apply

### Encoder / Decoder
- **URL** · Double · Triple · Selective (SQLi-oriented)
- **Base64** · Base64 URL-safe
- **Hex** (spaced · `0xAABB` · `\x` · comma-separated) · Binary · ASCII/Decimal
- **SQL** `CHAR(65,66)` · `CHAR(0x41,…)` · `CONCAT(CHAR…)`
- **Unicode** `\u` · `%u` · Fullwidth
- HTML entities · JSON string · JWT decode · ROT13
- Optional second-stage chain + live encode
- Send result → Payload · URL (at cursor) · Body
<img width="2837" height="480" alt="Screenshot 2026-08-14 162927" src="https://github.com/user-attachments/assets/dbeb0e21-789e-4c71-abaf-30b0a696108f" />

### Themes & Localization
- Schemes: Neon Green, Cyber Cyan, Violet, Amber, Hot Pink, Electric Blue, Matrix Lime, Mono White + **custom accent**
- Preference persisted in `localStorage`
- UI languages: **English**, **Deutsch**, **Español**, **Français**, **Português**, **Русский**, **日本語**, **中文**
<img width="1925" height="635" alt="Screenshot 2026-08-09 122704" src="https://github.com/user-attachments/assets/0309eccd-8e8e-478f-83c2-01e29a71dce9" />

### Other
- In-panel update check against GitHub `version.json`
- Toast / status feedback for important actions
- Modular architecture (optional split: `network.js`, `params.js`, `sqli-detect.js`, `response-view.js`, `tester.js`, `utils.js`, …) or single `panel.js`

---

## Installation

### Firefox Add-ons (recommended)
Install from [addons.mozilla.org](https://addons.mozilla.org/de/firefox/addon/sqlibar/) .

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

| Permission    | Reason |
|---------------|--------|
| `devtools`    | Native panel inside Firefox Developer Tools |
| `webRequest` / network | Live capture of requests and response metadata |
| `cookies`     | Read/set cookies for authenticated testing |
| `activeTab`   | Interact with the currently inspected tab |
| (host / fetch as needed) | Background fetch for Tester “Open” without panel CORS limits |

Exact keys depend on `manifest.json` (MV2/MV3).

---

## Usage (quick start)

1. Open DevTools on the target → **SQLiBar** panel  
2. **Load current URL** or paste a target  
3. **Scan Page** and/or use **Live Network** to discover parameters  
4. Click a network entry → inspect **Request + Response** (headers & body)  
5. Choose a payload preset (or custom) → **Apply** into the URL  
6. **Open** to send; review **SQLi Detection** (hits, length/time Δ, reflection, diff)  
7. **Encode** tab for encoding/decoding; **Options** for theme & language  

---

## Project structure

```text
SQLiBar/
├── manifest.json
├── panel.html              # UI shell (tabs: Tester, Live Network, Encode, Options)
├── panel.js                # Orchestration / monolithic entry (or thin loader)
├── network.js              # Live network list + details + cURL/params actions
├── params.js               # Page scanner + network param aggregator + JSON explorer
├── sqli-detect.js          # Patterns, baselines, reflection, diff
├── response-view.js        # Highlighted response + search + copy
├── tester.js               # URL/payloads/headers/inject/cURL/encode UI wiring
├── utils.js                # log, toast, escapeHtml, helpers
├── i18n.js
├── encoder.js
├── presets.js
├── theme.js                # (if split)
├── styles.css
├── background.js           # fetchUrl, setCookies, inject helpers
├── icons/                  # e.g. 48 / 96 / 128
├── LICENSE
└── README.md
```

Module boundaries may vary between releases (monolithic `panel.js` vs. split modules).

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
