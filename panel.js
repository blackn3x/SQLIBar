let pendingOpenUrl = null;
/** Last full response body text (for Copy Body only) */
let lastResponseBody = "";
/** Last full plain response text (for Copy Response) */
let lastResponseFullText = "";

window.addEventListener("DOMContentLoaded", () => {

    // ======================
    // i18n INIT
    // ======================
    if (typeof initI18n === "function") {
        initI18n();
    }

    document.getElementById("langSelect")?.addEventListener("change", (e) => {
        const lang = e.target.value || "de";
        if (typeof setLanguage === "function") {
            setLanguage(lang);
            log((typeof t === "function" ? t("log.langChanged") : "Language changed:") + " " + lang);
            if (typeof updateBaselineInfo === "function") updateBaselineInfo();
        }
    });

    // ======================
    // UPDATE CHECK
    // ======================
    const ADDON_VERSION = "1.0.2"; // <-- aktuelle Version hier pflegen
    const UPDATE_URL = "https://raw.githubusercontent.com/blackn3x/SQLIBar/refs/heads/main/version.json";

    function parseVersion(v) {
        return String(v || "0")
            .replace(/^v/i, "")
            .split(".")
            .map(n => parseInt(n, 10) || 0);
    }

    function isNewer(remote, local) {
        const r = parseVersion(remote);
        const l = parseVersion(local);
        const len = Math.max(r.length, l.length);
        for (let i = 0; i < len; i++) {
            const a = r[i] || 0;
            const b = l[i] || 0;
            if (a > b) return true;
            if (a < b) return false;
        }
        return false;
    }

    function setUpdateStatus(html, color) {
        const el = document.getElementById("updateStatus");
        if (!el) return;
        el.style.color = color || "var(--text-muted)";
        el.innerHTML = html;
    }

    // Version im UI anzeigen
    const verLabel = document.getElementById("addonVersionLabel");
    if (verLabel) {
        verLabel.dataset.version = ADDON_VERSION;
        verLabel.textContent = (typeof t === "function" ? t("opt.version") : "Version:") + " " + ADDON_VERSION;
    }

    document.getElementById("checkUpdateBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("checkUpdateBtn");
        if (btn) btn.disabled = true;
        setUpdateStatus(typeof t === "function" ? t("upd.checking") : "Checking…");

        try {
            const res = await fetch(UPDATE_URL + "?t=" + Date.now(), { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const remote = data.version || data.tag || "";
            const url = data.url || data.download || "";

            if (!remote) throw new Error(typeof t === "function" ? t("upd.noVersion") : "No version in response");

            if (isNewer(remote, ADDON_VERSION)) {
                const avail = typeof t === "function" ? t("upd.available") : "Update available:";
                const youHave = typeof t === "function" ? t("upd.youHave") : "(you have";
                const dl = typeof t === "function" ? t("upd.download") : "Download";
                setUpdateStatus(
                    `${avail} <b style="color:var(--primary)">${remote}</b> ${youHave} ${ADDON_VERSION})` +
                    (url ? ` — <a href="${url}" target="_blank" rel="noopener" style="color:var(--primary)">${dl}</a>` : ""),
                    "var(--warning)"
                );
            } else {
                const up = typeof t === "function" ? t("upd.uptodate") : "Up to date";
                setUpdateStatus(`${up} (${ADDON_VERSION}).`, "var(--success)");
            }
        } catch (err) {
            const fail = typeof t === "function" ? t("upd.failed") : "Check failed:";
            setUpdateStatus(fail + " " + (err.message || err), "var(--danger)");
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // ======================
    // TAB SYSTEM
    // ======================
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));

            btn.classList.add("active");
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.add("active");
        });
    });


    // ======================
    // LOG SYSTEM
    // ======================
    function log(text) {
        const box = document.getElementById("log");
        if (!box) return;
        const time = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        box.textContent += `[${time}] ${text}\n`;
        box.scrollTop = box.scrollHeight;
    }

    document.getElementById("clearLog")?.addEventListener("click", () => {
        document.getElementById("log").textContent = "";
    });


    // ======================
    // ELEMENTS
    // ======================
    const urlInput = document.getElementById("urlInput");
    const requestUrl = document.getElementById("requestUrl");
    const customPayload = document.getElementById("customPayload");


    // ======================
    // LOAD CURRENT URL + HEADERS
    // ======================
    browser.devtools.inspectedWindow.eval("window.location.href", (result) => {
        if (result) {
            if (urlInput) urlInput.value = result;
            if (requestUrl) requestUrl.value = result;
            log("URL geladen");
        }
    });

    browser.devtools.inspectedWindow.eval(`
        JSON.stringify({
            ua: navigator.userAgent,
            cookie: document.cookie,
            ref: document.referrer
        })
    `, (result) => {
        try {
            const data = JSON.parse(result);
            const headerText = `User-Agent: ${data.ua}\nReferer: ${data.ref}\nCookie: ${data.cookie}`;
            const headersEl = document.getElementById("headers");
            if (headersEl) headersEl.value = headerText;
            const testerHeaders = document.getElementById("testerHeaders");
            if (testerHeaders) testerHeaders.value = headerText;
        } catch (e) { }
    });


    // ======================
    // URL SYNC
    // ======================
    urlInput?.addEventListener("input", () => {
        if (requestUrl) requestUrl.value = urlInput.value;
    });

    // ======================
    // TESTER HEADERS + COOKIES + SQLI DETECT
    // ======================
    let lastResponseMeta = { length: 0, body: "", status: 0, ms: 0 };
    let baselineLength = null;
    let baselineBody = null;
    let baselineTimeMs = null;
    try {
        const b = localStorage.getItem("sqli_baseline_len");
        if (b !== null) baselineLength = parseInt(b, 10);
        const t = localStorage.getItem("sqli_baseline_time");
        if (t !== null) baselineTimeMs = parseInt(t, 10);
        const bb = localStorage.getItem("sqli_baseline_body");
        if (bb !== null) baselineBody = bb;
    } catch (e) {}

    function updateBaselineInfo() {
        const el = document.getElementById("baselineInfo");
        if (!el) return;
        const parts = [];
        if (baselineLength != null) parts.push(baselineLength + " B");
        if (baselineTimeMs != null) parts.push(baselineTimeMs + " ms");
        if (baselineBody != null) parts.push("body✓");
        const prefix = typeof t === "function" ? t("sqli.baseline") : "Baseline:";
        const none = typeof t === "function" ? t("sqli.noBaseline") : "No Baseline";
        el.textContent = parts.length ? (prefix + " " + parts.join(" · ")) : none;
    }
    updateBaselineInfo();

    document.getElementById("setBaselineBtn")?.addEventListener("click", () => {
        if (!lastResponseMeta.length && !lastResponseMeta.body) {
            log(typeof t === "function" ? t("log.noResponseBaseline") : "Keine Response für Baseline");
            return;
        }
        baselineLength = lastResponseMeta.length;
        baselineBody = lastResponseMeta.body || "";
        try {
            localStorage.setItem("sqli_baseline_len", String(baselineLength));
            localStorage.setItem("sqli_baseline_body", baselineBody);
        } catch (e) {}
        updateBaselineInfo();
        analyzeSqliResponse(lastResponseMeta.body, lastResponseMeta.status, lastResponseMeta.length, lastResponseMeta.ms);
        log("Length/Body Baseline gesetzt: " + baselineLength + " Bytes");
    });

    document.getElementById("setTimeBaselineBtn")?.addEventListener("click", () => {
        if (!lastResponseMeta.ms) {
            log("Keine Time-Messung – zuerst Request senden");
            return;
        }
        baselineTimeMs = lastResponseMeta.ms;
        try { localStorage.setItem("sqli_baseline_time", String(baselineTimeMs)); } catch (e) {}
        updateBaselineInfo();
        analyzeSqliResponse(lastResponseMeta.body, lastResponseMeta.status, lastResponseMeta.length, lastResponseMeta.ms);
        log("Time Baseline gesetzt: " + baselineTimeMs + " ms");
    });

    document.getElementById("clearBaselineBtn")?.addEventListener("click", () => {
        baselineLength = null;
        baselineBody = null;
        baselineTimeMs = null;
        try {
            localStorage.removeItem("sqli_baseline_len");
            localStorage.removeItem("sqli_baseline_body");
            localStorage.removeItem("sqli_baseline_time");
        } catch (e) {}
        updateBaselineInfo();
        const rb = document.getElementById("reflectionBox");
        const db = document.getElementById("diffBox");
        if (rb) rb.style.display = "none";
        if (db) db.style.display = "none";
        log("Alle Baselines gelöscht");
    });

    //wodkowkdow

    const SQLI_PATTERNS = [
        // ===================== MySQL / MariaDB =====================
        { name: "MySQL syntax", re: /you have an error in your sql syntax/i, sev: "high" },
        { name: "MySQL warning", re: /warning:.*\bmysqli?_/i, sev: "high" },
        { name: "MySQL fetch", re: /mysql_fetch_|mysqli_fetch_/i, sev: "med" },
        { name: "mysqli_sql_exception", re: /uncaught\s+mysqli_sql_exception|mysqli_sql_exception/i, sev: "high" },
        { name: "MySQL supplied argument", re: /expects parameter.*mysqli?_|supplied argument is not a valid mysql/i, sev: "med" },
        { name: "MySQL query error", re: /mysql_query\(\)|mysqli_query\(\).*false|error in query/i, sev: "med" },
        { name: "MariaDB", re: /mariadb|manual\.mariadb/i, sev: "low" },
        { name: "MySQL unknown column", re: /unknown column ['"`][^'"`]+['"`] in/i, sev: "high" },
        { name: "MySQL table doesn't exist", re: /table ['"`][^'"`]+['"`] doesn't exist|doesn't exist/i, sev: "high" },
        { name: "MySQL access denied", re: /access denied for user|Access denied for user/i, sev: "med" },
        { name: "MySQL duplicate entry", re: /duplicate entry ['"`].*['"`] for key/i, sev: "med" },
        { name: "MySQL division by zero", re: /division by zero/i, sev: "med" },
        { name: "MySQL XPATH / extractvalue", re: /xpath syntax error|extractvalue\(|updatexml\(/i, sev: "high" },
        { name: "MySQL procedure analyse", re: /procedure analyse/i, sev: "med" },
        { name: "MySQL into outfile", re: /into outfile|load_file\s*\(/i, sev: "med" },
        { name: "MySQL connector", re: /mysql\.connector|MySQLdb|pymysql|mysqlclient/i, sev: "low" },
        { name: "MySQL error code", re: /error\s+\d{4}\s*\(\d{5}\)|MySQL server has gone away/i, sev: "med" },
        { name: "MySQL strict mode", re: /strict mode|only_full_group_by/i, sev: "low" },

        // ===================== PostgreSQL =====================
        { name: "PostgreSQL", re: /pg_query|pg::|error:\s*syntax error at or near/i, sev: "high" },
        { name: "PostgreSQL ERROR", re: /ERROR:\s+.+\s+at character \d+/i, sev: "high" },
        { name: "PostgreSQL invalid", re: /invalid input syntax for|permission denied for (table|relation|schema)/i, sev: "med" },
        { name: "PostgreSQL relation does not exist", re: /relation ["'][^"']+["'] does not exist/i, sev: "high" },
        { name: "PostgreSQL column does not exist", re: /column ["'][^"']+["'] does not exist/i, sev: "high" },
        { name: "PostgreSQL operator does not exist", re: /operator does not exist|could not determine data type/i, sev: "high" },
        { name: "PostgreSQL unterminated", re: /unterminated quoted string|unterminated dollar-quoted/i, sev: "high" },
        { name: "PostgreSQL permission", re: /permission denied for (table|schema|sequence|function)/i, sev: "med" },
        { name: "PostgreSQL current transaction", re: /current transaction is aborted|commands ignored until end of transaction/i, sev: "med" },
        { name: "PostgreSQL FATAL", re: /FATAL:\s+.+/i, sev: "high" },
        { name: "PostgreSQL libpq", re: /libpq|pq:|psycopg2|asyncpg/i, sev: "low" },
        { name: "PostgreSQL pg_catalog", re: /pg_catalog|information_schema\.columns/i, sev: "med" },

        // ===================== MSSQL / SQL Server =====================
        { name: "MSSQL unclosed", re: /unclosed quotation mark after the character string/i, sev: "high" },
        { name: "MSSQL ODBC", re: /microsoft ole db|odbc sql server driver|\[SQL Server\]/i, sev: "high" },
        { name: "MSSQL SqlException", re: /System\.Data\.SqlClient\.SqlException|Incorrect syntax near/i, sev: "high" },
        { name: "MSSQL conversion", re: /conversion failed when converting|nvarchar.*varchar/i, sev: "med" },
        { name: "MSSQL invalid object", re: /invalid object name|Invalid object name/i, sev: "high" },
        { name: "MSSQL invalid column", re: /invalid column name|Invalid column name/i, sev: "high" },
        { name: "MSSQL must declare", re: /must declare the scalar variable/i, sev: "high" },
        { name: "MSSQL order by", re: /order by clause is invalid|column.*is invalid in the select list/i, sev: "med" },
        { name: "MSSQL subquery", re: /subquery returned more than 1 value/i, sev: "med" },
        { name: "MSSQL ADO.NET", re: /System\.Data\.SqlClient|Microsoft\.Data\.SqlClient/i, sev: "med" },
        { name: "MSSQL OLE DB", re: /OLE DB provider|SQLOLEDB|SQLNCLI/i, sev: "med" },
        { name: "MSSQL WAITFOR", re: /WAITFOR DELAY|waitfor delay/i, sev: "low" },
        { name: "MSSQL xp_cmdshell", re: /xp_cmdshell|xp_dirtree|xp_fileexist/i, sev: "med" },
        { name: "MSSQL error number", re: /Msg \d+, Level \d+, State \d+/i, sev: "high" },

        // ===================== Oracle =====================
        { name: "Oracle ORA", re: /ORA-\d{5}/i, sev: "high" },
        { name: "Oracle quoted", re: /quoted string not properly terminated/i, sev: "high" },
        { name: "Oracle missing expression", re: /ORA-00936|missing expression/i, sev: "high" },
        { name: "Oracle invalid identifier", re: /ORA-00904|invalid identifier/i, sev: "high" },
        { name: "Oracle table or view does not exist", re: /ORA-00942|table or view does not exist/i, sev: "high" },
        { name: "Oracle missing keyword", re: /ORA-00905|missing keyword/i, sev: "high" },
        { name: "Oracle not a GROUP BY", re: /ORA-00979|not a GROUP BY expression/i, sev: "med" },
        { name: "Oracle unique constraint", re: /ORA-00001|unique constraint.*violated/i, sev: "med" },
        { name: "Oracle TNS", re: /TNS-|ORA-12154|ORA-12541/i, sev: "med" },
        { name: "Oracle JDBC", re: /oracle\.jdbc|OracleDriver|ojdbc/i, sev: "low" },

        // ===================== SQLite =====================
        { name: "SQLite", re: /sqlite3?::|unrecognized token|near \".*\": syntax error/i, sev: "high" },
        { name: "SQLite exception", re: /SQLiteException|SQLITE_ERROR|no such table/i, sev: "high" },
        { name: "SQLite no such column", re: /no such column|no such table/i, sev: "high" },
        { name: "SQLite incomplete input", re: /incomplete input|unrecognized token/i, sev: "high" },
        { name: "SQLite constraint", re: /UNIQUE constraint failed|FOREIGN KEY constraint failed|NOT NULL constraint failed/i, sev: "med" },
        { name: "SQLite database is locked", re: /database is locked|database disk image is malformed/i, sev: "med" },
        { name: "SQLite driver", re: /sqlite3\.|pysqlite|System\.Data\.SQLite/i, sev: "low" },

        // ===================== DB2 / IBM =====================
        { name: "DB2 SQLCODE", re: /SQLCODE\s*[-=]\s*-?\d+|SQLSTATE\s*=\s*\w+/i, sev: "high" },
        { name: "DB2 CLI", re: /CLI011|SQL\d{4}N|DB2 SQL Error/i, sev: "high" },
        { name: "DB2 driver", re: /com\.ibm\.db2|db2jcc|ibm_db/i, sev: "low" },

        // ===================== Sybase / SAP ASE =====================
        { name: "Sybase", re: /Sybase|Adaptive Server|ASE error|Msg \d+, Level \d+/i, sev: "high" },
        { name: "Sybase jConnect", re: /jConnect|com\.sybase/i, sev: "low" },

        // ===================== Microsoft Access / Jet =====================
        { name: "Access Jet", re: /Microsoft (JET|Access) Database Engine|ODBC Microsoft Access/i, sev: "high" },
        { name: "Access syntax", re: /syntax error in (query|FROM|JOIN|WHERE) expression/i, sev: "high" },
        { name: "Access driver", re: /Microsoft Access Driver|ACE\.OLEDB|Jet\.OLEDB/i, sev: "med" },

        // ===================== H2 / HSQLDB / Derby =====================
        { name: "H2 database", re: /org\.h2\.|H2 database|Syntax error in SQL statement/i, sev: "high" },
        { name: "HSQLDB", re: /hsqldb|org\.hsqldb/i, sev: "med" },
        { name: "Apache Derby", re: /Apache Derby|org\.apache\.derby/i, sev: "med" },

        // ===================== Firebird / InterBase =====================
        { name: "Firebird", re: /Firebird|InterBase|ISC ERROR|Dynamic SQL Error/i, sev: "high" },

        // ===================== Generic / Drivers / ORMs =====================
        { name: "Generic SQL error", re: /sql(state|=| error| syntax)|syntax error.*query|quoted string not properly terminated/i, sev: "med" },
        { name: "JDBC/SQLException", re: /java\.sql\.SQLException|SqlException|SQLSTATE/i, sev: "high" },
        { name: "Query failed", re: /query failed|database error|db error|sql exception/i, sev: "med" },
        { name: "PDO exception", re: /PDOException|SQLSTATE\[\w+\]/i, sev: "high" },
        { name: "ODBC error", re: /\[ODBC|ODBC Driver|odbc_exec/i, sev: "med" },
        { name: "ADO error", re: /ADODB\.|Microsoft OLE DB|Provider error/i, sev: "med" },
        { name: "Hibernate / JPA", re: /org\.hibernate\.|javax\.persistence\.|PersistenceException/i, sev: "med" },
        { name: "Entity Framework", re: /System\.Data\.Entity|EntityException|DbUpdateException/i, sev: "med" },
        { name: "Django ORM", re: /django\.db\.|DatabaseError|OperationalError|ProgrammingError/i, sev: "high" },
        { name: "SQLAlchemy", re: /sqlalchemy\.|OperationalError|ProgrammingError|IntegrityError/i, sev: "high" },
        { name: "Laravel / Eloquent", re: /Illuminate\\Database|SQLSTATE\[|QueryException/i, sev: "high" },
        { name: "Rails ActiveRecord", re: /ActiveRecord::|PG::|Mysql2::Error|SQLite3::/i, sev: "high" },
        { name: "Sequelize / TypeORM", re: /SequelizeDatabaseError|QueryFailedError|TypeORM/i, sev: "high" },
        { name: "Prisma", re: /PrismaClientKnownRequestError|Invalid.*invocation/i, sev: "med" },
        { name: "Node mysql/pg", re: /ER_PARSE_ERROR|ER_BAD_FIELD_ERROR|error: syntax error at or near/i, sev: "high" },
        { name: "Python DB-API", re: /psycopg2\.|MySQLdb\.|sqlite3\.OperationalError|cx_Oracle/i, sev: "high" },
        { name: "PHP mysqli/PDO", re: /mysqli_sql_exception|PDOException|SQLSTATE\[/i, sev: "high" },
        { name: "ASP.NET / SqlClient", re: /System\.Data\.SqlClient\.SqlException|Incorrect syntax near/i, sev: "high" },

        // ===================== Leak / dump / fingerprint hints =====================
        { name: "UNION artifact", re: /\bunion\b.*\bselect\b/i, sev: "low" },
        { name: "Exposed version", re: /\b(mysql|mariadb|postgresql|sqlite|oracle|sql server)\s+[\d.]+/i, sev: "low" },
        { name: "Table dump hint", re: /\binformation_schema\b|\bsysobjects\b|\bpg_catalog\b|\bsys\./i, sev: "med" },
        { name: "Column dump hint", re: /\b(column_name|table_name|table_schema|column_type)\b/i, sev: "low" },
        { name: "Stack trace SQL", re: /Stack trace:.*(?:sql|query|mysqli|pdo|jdbc|hibernate)/is, sev: "med" },
        { name: "PHP fatal SQL", re: /Fatal error:.*(?:mysql|mysqli|pdo|sql)/i, sev: "high" },
        { name: "Division by zero SQL", re: /Division by zero|xpath.*syntax|extractvalue|updatexml/i, sev: "med" },
        { name: "SQL comment / --", re: /--\s*$|\/\*.*\*\//i, sev: "low" },
        { name: "Boolean blind hint", re: /\b(true|false)\b.*\b(and|or)\b|\b1=1\b|\b1=0\b/i, sev: "low" },
        { name: "Time-based hint", re: /sleep\s*\(|benchmark\s*\(|pg_sleep|waitfor\s+delay/i, sev: "low" },
        { name: "Error-based extract", re: /extractvalue\s*\(|updatexml\s*\(|xmltype\s*\(/i, sev: "med" },
        { name: "DB version leak", re: /@@version|version\(\)|banner from v\$version/i, sev: "med" },
        { name: "User / schema leak", re: /current_user|user\(\)|session_user|system_user/i, sev: "low" },
        { name: "WAF / filter bypass residue", re: /mod_security|sqlmap|havij|acunetix/i, sev: "low" },

        // ===================== Multi-language / common phrases =====================
        { name: "German SQL error", re: /fehler in der sql|sql-syntaxfehler|unbekannte spalte|tabelle .* existiert nicht/i, sev: "high" },
        { name: "French SQL error", re: /erreur de syntaxe sql|erreur sql|table .* n'existe pas/i, sev: "high" },
        { name: "Spanish SQL error", re: /error de sintaxis sql|error sql|la tabla .* no existe/i, sev: "high" },
        { name: "Generic 'syntax error'", re: /\bsyntax error\b.*\b(sql|query|near|at)\b/i, sev: "med" },
        { name: "Generic 'unexpected token'", re: /unexpected (token|end of input|identifier)/i, sev: "med" },
    ];

    function analyzeSqliResponse(body, status, length, ms) {
        const box = document.getElementById("sqliDetectBox");
        if (!box) return;

        const text = body || "";
        const len = length || text.length;
        const timing = typeof ms === "number" ? ms : (lastResponseMeta.ms || 0);
        lastResponseMeta = { length: len, body: text, status: status || 0, ms: timing };
        const hits = [];

        for (const p of SQLI_PATTERNS) {
            const m = text.match(p.re);
            if (m) {
                const idx = text.toLowerCase().indexOf(m[0].toLowerCase());
                let snippet = "";
                if (idx >= 0) {
                    const start = Math.max(0, idx - 40);
                    const end = Math.min(text.length, idx + m[0].length + 40);
                    snippet = text.substring(start, end).replace(/\s+/g, " ");
                }
                hits.push({ ...p, match: m[0], snippet });
            }
        }

        let deltaHtml = "";
        if (baselineLength != null) {
            const delta = len - baselineLength;
            const sign = delta > 0 ? "+" : "";
            const color = delta === 0 ? "#888" : (Math.abs(delta) > 50 ? "#fbbf24" : "#aaa");
            deltaHtml = `<span style="color:${color}">Δ ${sign}${delta} B</span>`;
        } else {
            deltaHtml = `<span style="color:#666">no len-base</span>`;
        }

        let timeHtml = `<span>Time: <b>${timing || "-"}</b> ms</span>`;
        if (baselineTimeMs != null && timing) {
            const td = timing - baselineTimeMs;
            const sign = td > 0 ? "+" : "";
            const tColor = Math.abs(td) > 800 ? "#f87171" : (Math.abs(td) > 300 ? "#fbbf24" : "#888");
            timeHtml += ` <span style="color:${tColor}">Δ ${sign}${td} ms</span>`;
        }

        const sevColor = { high: "#f87171", med: "#fbbf24", low: "#60a5fa" };

        const _s = (k, fb) => (typeof t === "function" ? t(k) : fb);
        let html = `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px">
            <span>${_s("sqli.status", "Status")}: <b>${status || "-"}</b></span>
            <span>${_s("sqli.length", "Length")}: <b>${len}</b> B ${deltaHtml}</span>
            ${timeHtml}
            <span>${_s("sqli.hits", "Hits")}: <b style="color:${hits.length ? "#f87171" : "#4ade80"}">${hits.length}</b></span>
        </div>`;

        if (!hits.length) {
            html += `<div style="color:#4ade80">${_s("sqli.noPatterns", "No SQL-Error-Patterns found.")}</div>`;
        } else {
            html += hits.map(h => {
                const c = sevColor[h.sev] || "#aaa";
                return `<div style="margin:6px 0;padding:6px 8px;border-left:3px solid ${c};">
                    <div><b style="color:${c}">[${h.sev.toUpperCase()}]</b> ${escapeHtml(h.name)} — <code style="color:#fbbf24">${escapeHtml(h.match)}</code></div>
                    ${h.snippet ? `<div style="color:#888;font-size:11px;margin-top:2px">…${escapeHtml(h.snippet)}…</div>` : ""}
                </div>`;
            }).join("");
        }

        if (baselineLength != null && Math.abs(len - baselineLength) > 100) {
            const d = len - baselineLength;
            html += `<div style="margin-top:8px;color:#fbbf24">${_s("sqli.lengthChange", "⚠ Length Change")} (${d > 0 ? "+" : ""}${d} B) — ${_s("sqli.possibleIndicator", "possible Indicator (Boolean/UNION/Error).")}</div>`;
        }
        if (baselineTimeMs != null && timing && Math.abs(timing - baselineTimeMs) > 800) {
            const td = timing - baselineTimeMs;
            html += `<div style="margin-top:6px;color:#f87171">${_s("sqli.timeAnomaly", "⏱ Time anomaly")} (${td > 0 ? "+" : ""}${td} ms) — ${_s("sqli.possibleTime", "possible Time-based SQLi (SLEEP/BENCHMARK).")}</div>`;
        }

        box.innerHTML = html;
        renderReflection(text);
        renderDiff(text);

        const details = box.closest("details");
        const summary = details?.querySelector("summary");
        if (summary) {
            const hitColor = hits.length ? "#f87171" : "#4ade80";
            let deltaShort = "";
            if (baselineLength != null) {
                const d = len - baselineLength;
                const sign = d > 0 ? "+" : "";
                const dColor = d === 0 ? "#888" : (Math.abs(d) > 50 ? "#fbbf24" : "#aaa");
                deltaShort = ` <span style="color:${dColor}">Δ${sign}${d}B</span>`;
            }
            let timeShort = timing ? ` <span>${timing}ms</span>` : "";
            if (baselineTimeMs != null && timing) {
                const td = timing - baselineTimeMs;
                if (Math.abs(td) > 300) {
                    const tColor = Math.abs(td) > 800 ? "#f87171" : "#fbbf24";
                    timeShort += ` <span style="color:${tColor}">Δ${td > 0 ? "+" : ""}${td}ms</span>`;
                }
            }
            summary.innerHTML =
                `SQLi Detection    ` +
                `<span class="sqli-summary-stats">` +
                `<span>Status <b>${status || "-"}</b></span>` +
                `<span>${len} B</span>` +
                deltaShort +
                timeShort +
                `<span style="color:${hitColor}">Hits <b>${hits.length}</b></span>` +
                `</span>`;
        }
    }

    function getPayloadNeedles() {
        const needles = [];
        const raw = (document.getElementById("customPayload")?.value || "").trim();
        if (raw) {
            needles.push(raw);
            const eq = raw.indexOf("=");
            if (eq > 0 && eq < 48) needles.push(raw.slice(eq + 1));
            raw.split(/[\s'"\`,()]+/).filter(s => s.length >= 4).forEach(f => {
                if (!needles.includes(f)) needles.push(f);
            });
        }
        try {
            const u = new URL(urlInput?.value || "");
            u.searchParams.forEach(v => {
                if (v.length >= 4 && /[\'\"\-\#]|union|select|or\s+1/i.test(v)) {
                    if (!needles.includes(v)) needles.push(v);
                }
            });
        } catch (e) {}
        return [...new Set(needles)].filter(Boolean).sort((a, b) => b.length - a.length);
    }

    function renderReflection(text) {
        const box = document.getElementById("reflectionBox");
        if (!box) return;
        const needles = getPayloadNeedles();
        if (!needles.length || !text) {
            box.style.display = "none";
            return;
        }
        let found = [];
        const lower = text.toLowerCase();
        for (const n of needles) {
            const idx = lower.indexOf(n.toLowerCase());
            if (idx >= 0) found.push({ needle: n, idx });
        }
        found = found.filter((f, i, arr) =>
            !arr.some((o, j) => j !== i && o.idx <= f.idx && o.idx + o.needle.length >= f.idx + f.needle.length && o.needle.length > f.needle.length)
        );
        if (!found.length) {
            box.style.display = "none";
            return;
        }
        let html = '<div class="ref-title">' + (typeof t === "function" ? t("sqli.reflection") : "Reflection: Payload parts found in response") + ' (' + found.length + ')</div>';
        found.slice(0, 6).forEach(f => {
            const start = Math.max(0, f.idx - 50);
            const end = Math.min(text.length, f.idx + f.needle.length + 50);
            const before = escapeHtml(text.substring(start, f.idx));
            const match = escapeHtml(text.substring(f.idx, f.idx + f.needle.length));
            const after = escapeHtml(text.substring(f.idx + f.needle.length, end));
            html += `<div style="margin:4px 0;font-family:ui-monospace,monospace;font-size:11px;word-break:break-all">…${before}<span class="reflect-hit">${match}</span>${after}…</div>`;
        });
        box.innerHTML = html;
        box.style.display = "block";
    }

    function renderDiff(text) {
        const box = document.getElementById("diffBox");
        if (!box) return;
        if (baselineBody == null || baselineBody === "") {
            box.style.display = "none";
            return;
        }
        if (text === baselineBody) {
            box.innerHTML = '<div class="diff-title">' + (typeof t === "function" ? t("sqli.diffTitle") : "Diff vs Baseline Body") + '</div><div style="color:#4ade80">' + (typeof t === "function" ? t("sqli.diffIdentical") : "Identical to baseline.") + '</div>';
            box.style.display = "block";
            return;
        }
        const a = baselineBody.split(/\r?\n/);
        const b = (text || "").split(/\r?\n/);
        const maxLines = 80;
        let html = '<div class="diff-title">' + (typeof t === "function" ? t("sqli.diffTitle") : "Diff vs Baseline Body (lines)") + '</div>';
        let shown = 0;
        const maxA = Math.max(a.length, b.length);
        for (let i = 0; i < maxA && shown < maxLines; i++) {
            const la = a[i];
            const lb = b[i];
            if (la === lb) continue;
            if (la !== undefined && lb === undefined) {
                html += `<div class="diff-removed">− ${escapeHtml(String(la).substring(0, 200))}</div>`;
                shown++;
            } else if (la === undefined && lb !== undefined) {
                html += `<div class="diff-added">+ ${escapeHtml(String(lb).substring(0, 200))}</div>`;
                shown++;
            } else {
                html += `<div class="diff-removed">− ${escapeHtml(String(la).substring(0, 200))}</div>`;
                html += `<div class="diff-added">+ ${escapeHtml(String(lb).substring(0, 200))}</div>`;
                shown += 2;
            }
        }
        if (shown === 0) {
            html += '<div style="color:#888">' + (typeof t === "function" ? t("sqli.diffMinor") : "Only whitespace / minor differences.") + '</div>';
        } else if (maxA > maxLines) {
            html += `<div style="color:#666;margin-top:4px">… truncated (${maxA} lines total)</div>`;
        }
        box.innerHTML = html;
        box.style.display = "block";
    }

    function fillTesterHeaders(text, source) {
        const th = document.getElementById("testerHeaders");
        if (th) th.value = text;
        log("Headers geladen: " + source);
    }

    document.getElementById("reloadTesterHeaders")?.addEventListener("click", () => {
        browser.devtools.inspectedWindow.eval(`
            JSON.stringify({
                ua: navigator.userAgent,
                cookie: document.cookie,
                ref: document.referrer
            })
        `, (result) => {
            try {
                const data = JSON.parse(result);
                fillTesterHeaders([
                    "User-Agent: " + data.ua,
                    "Referer: " + (data.ref || ""),
                    "Cookie: " + (data.cookie || "")
                ].join("\n"), "Live von Seite");
            } catch (e) { log("Live-Headers fehlgeschlagen"); }
        });
    });

    document.getElementById("loadNetHeaders")?.addEventListener("click", () => {
        if (typeof networkEntries === "undefined" || !networkEntries.length) {
            log("Kein Network-Eintrag");
            return;
        }
        const e = networkEntries[0];
        const text = e.reqHeaders || "";
        if (!text || text === "(none)") { log("Keine Request-Header"); return; }
        fillTesterHeaders(text, "Network: " + e.method + " " + (e.url || "").substring(0, 50));
    });

    document.getElementById("clearTesterHeaders")?.addEventListener("click", () => {
        const th = document.getElementById("testerHeaders");
        if (th) th.value = "";
        log("Tester-Headers geleert");
    });

    function parseCookieHeaderLines(headerText) {
        const cookies = [];
        (headerText || "").split("\n").forEach(line => {
            const m = line.match(/^\s*Cookie\s*:\s*(.+)$/i);
            if (!m) return;
            m[1].split(";").forEach(part => {
                const p = part.trim();
                if (!p) return;
                const eq = p.indexOf("=");
                if (eq === -1) return;
                const name = p.slice(0, eq).trim();
                const value = p.slice(eq + 1).trim();
                if (name) cookies.push({ name, value });
            });
        });
        return cookies;
    }

    function setCookiesViaBackground(url, cookieList) {
        return new Promise((resolve) => {
            if (!cookieList.length) { resolve({ ok: true, results: [] }); return; }
            browser.runtime.sendMessage(
                { action: "setCookies", url, cookies: cookieList },
                (resp) => {
                    if (browser.runtime.lastError) {
                        log("Background-Fehler: " + browser.runtime.lastError.message);
                        resolve({ ok: false, error: browser.runtime.lastError.message });
                        return;
                    }
                    resolve(resp || { ok: false });
                }
            );
        });
    }



    // ======================
    // PRESET SYSTEM (Dropdown + dynamische Union)
    // WICHTIG: Presets werden NUR ins Payload-Feld geladen.
    // Die URL wird erst bei Klick auf „Anwenden“ geändert.
    // ======================
    let lastPayload = "";

    const categorySelect = document.getElementById("presetCategory");
    const presetSelect = document.getElementById("presetSelect");
    const unionControls = document.getElementById("unionControls");
    const unionColumns = document.getElementById("unionColumns");

    // Kategorien füllen
    if (categorySelect) {
        Object.keys(presetCategories).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
    }

    function fillPresetSelect(category) {
        if (!presetSelect) return;
        presetSelect.innerHTML = "";

        const isUnion = category === "Union-based";
        if (unionControls) {
            unionControls.style.display = isUnion ? "flex" : "none";
        }

        const items = presetCategories[category] || [];
        items.forEach((item, idx) => {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = item.name;
            opt.title = item.dynamic ? "Dynamisch (Spaltenzahl)" : (item.payload || "");
            presetSelect.appendChild(opt);
        });

        // Erstes Preset nur ins Feld laden – NICHT anwenden
        if (items.length) {
            loadSelectedPreset(false);
        }
    }

    function getSelectedPresetItem() {
        const cat = categorySelect?.value;
        const idx = parseInt(presetSelect?.value, 10);
        const items = presetCategories[cat] || [];
        return items[idx] || null;
    }

    function loadSelectedPreset(doApply = false) {
        const item = getSelectedPresetItem();
        if (!item) return;

        let payload = item.payload;

        if (item.dynamic) {
            const cols = unionColumns?.value || 5;
            payload = buildUnionPayload(item.dynamic, cols);
        }

        if (customPayload) customPayload.value = payload || "";

        // Nur anwenden, wenn explizit gewünscht (Button)
        if (doApply && payload) {
            applyPayload(payload, item.name);
        }
    }

    // Events – Auswahl ändert nur das Payload-Feld
    categorySelect?.addEventListener("change", () => {
        fillPresetSelect(categorySelect.value);
    });

    presetSelect?.addEventListener("change", () => {
        loadSelectedPreset(false);   // ← nur laden, nicht anwenden
    });

    unionColumns?.addEventListener("change", () => {
        // Nur Payload-Feld aktualisieren
        if (categorySelect?.value === "Union-based") {
            loadSelectedPreset(false);
        }
        log(`Union-Spalten: ${unionColumns.value}`);
    });

    // Initial
    if (categorySelect) {
        fillPresetSelect(categorySelect.value);
    }

    function applyPayload(payload, name = "Custom") {
        const input = urlInput;
        if (!input) {
            log("Kein URL-Feld gefunden");
            return;
        }

        const url = input.value;
        if (!url.trim()) {
            log("Keine URL vorhanden");
            return;
        }

        lastPayload = payload;
        if (customPayload) customPayload.value = payload;

        // Cursor- / Auswahlposition
        const start = input.selectionStart ?? url.length;
        const end = input.selectionEnd ?? url.length;

        // Payload an der Cursorposition einfügen (markierten Text ersetzen)
        const newUrl = url.substring(0, start) + payload + url.substring(end);

        input.value = newUrl;

        // Cursor hinter den eingefügten Payload setzen + Fokus behalten
        const newPos = start + payload.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();

        // Request-Builder mitsynchronisieren
        if (requestUrl) requestUrl.value = newUrl;

        log(`Angewendet „${name}“ an Position ${start} → ${payload.substring(0, 50)}${payload.length > 50 ? "…" : ""}`);
    }

    document.getElementById("applyCustom")?.addEventListener("click", () => {
        const payload = customPayload.value.trim();
        if (!payload) {
            log("Leerer Payload");
            return;
        }
        applyPayload(payload, "Custom");
    });


    // ======================
    // URL ACTIONS
    // ======================
    document.getElementById("reloadUrl")?.addEventListener("click", () => {
        browser.devtools.inspectedWindow.eval("window.location.href", (result) => {
            if (!result) {
                log("Could not read current URL");
                return;
            }
            if (urlInput) urlInput.value = result;
            if (requestUrl) requestUrl.value = result;
            log("Current URL loaded");
        });
    });

    document.getElementById("copyUrl")?.addEventListener("click", () => {
        navigator.clipboard.writeText(urlInput.value);
        log("URL kopiert");
    });

    document.getElementById("openUrl")?.addEventListener("click", () => {
        browser.devtools.inspectedWindow.eval(
            `location.href = ${JSON.stringify(urlInput.value)}`
        );
        log("URL geöffnet");
    });

    document.getElementById("useAsRequestUrl")?.addEventListener("click", () => {
        if (urlInput?.value) {
            requestUrl.value = urlInput.value;
            document.querySelector('[data-tab="request"]').click();
            log("URL in Request Builder übernommen");
        }
    });


    // ======================
    // INJECT INTO PAGE (Content Script)
    // ======================
    document.getElementById('addHeaderBtn').addEventListener('click', () => {
        const select = document.getElementById('headerPreset');
        const ta = document.getElementById('testerHeaders');
        const value = select.value;

        if (!value) return;

        // Anhängen (mit Zeilenumbruch, falls schon Inhalt da ist)
        const current = ta.value.trim();
        ta.value = current ? current + '\n' + value : value;

        // Cursor ans Ende setzen und Fokus geben
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);

        // Optional: Select zurücksetzen
        select.selectedIndex = 0;
    });

    // Extra: Doppelklick auf Option oder Enter → sofort einfügen
    document.getElementById('headerPreset').addEventListener('change', function () {
        // optional: bei Auswahl sofort einfügen statt extra Button
        // document.getElementById('addHeaderBtn').click();
    });

    document.getElementById("injectPage")?.addEventListener("click", async () => {
        const payload = customPayload.value.trim() || lastPayload;
        const currentUrl = urlInput?.value?.trim();

        if (!currentUrl) {
            if (!payload) { log("Kein Payload / keine URL"); return; }
            browser.runtime.sendMessage({ action: "inject", payload });
            log(`Payload injiziert: ${payload.substring(0, 50)}…`);
            return;
        }

        const sendHeaders = document.getElementById("optSendHeaders")?.checked ?? true;
        const sendCookies = document.getElementById("optSendCookies")?.checked ?? true;
        const setCookies  = document.getElementById("optSetCookies")?.checked ?? true;
        const doNavigate  = document.getElementById("optNavigate")?.checked ?? true;
        const headerText  = document.getElementById("testerHeaders")?.value || "";
        const method      = (document.getElementById("testerMethod")?.value || "GET").toUpperCase();
        const bodyText    = document.getElementById("testerBody")?.value || "";
        const forceJson   = document.getElementById("optBodyJson")?.checked ?? false;
        const forceForm   = document.getElementById("optBodyForm")?.checked ?? false;

        if (setCookies) {
            const cookieList = parseCookieHeaderLines(headerText);
            if (cookieList.length) {
                log("Setze " + cookieList.length + " Cookie(s)…");
                const resp = await setCookiesViaBackground(currentUrl, cookieList);
                if (resp && resp.ok) {
                    (resp.results || []).forEach(r => {
                        if (r.ok) log("Cookie OK: " + r.name + "=" + String(r.value || "").substring(0, 40));
                        else log("Cookie FAIL: " + r.name + " → " + r.error);
                    });
                    if (resp.store) log("Store: " + resp.store.join("; "));
                } else {
                    log("Cookie-Set fehlgeschlagen: " + (resp && resp.error || "?"));
                }
            }
        }

        const headers = {};
        if (sendHeaders) {
            headerText.split("\n").forEach(line => {
                const parts = line.split(":");
                if (parts.length > 1) {
                    const key = parts.shift().trim();
                    if (key && key.toLowerCase() !== "cookie") headers[key] = parts.join(":").trim();
                }
            });
        }

        // Content-Type für Body setzen, falls nicht schon vorhanden
        const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === "content-type");
        if (bodyText && !hasContentType && method !== "GET" && method !== "HEAD") {
            if (forceJson) {
                headers["Content-Type"] = "application/json";
            } else if (forceForm) {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            } else if (bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
                headers["Content-Type"] = "application/json";
            } else {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }

        const tr = document.getElementById("testerResponse");
        if (tr) tr.innerHTML = `<span class="tok-dim">Lade Response…</span> <span class="tok-key">${escapeHtml(method)}</span>\n<span class="tok-url">${escapeHtml(currentUrl)}</span>`;
        const sum = document.querySelector("#testerResponseDetails summary");
        if (sum) sum.textContent = `Page Response – ${method} lade…`;

        try {
            const fetchOpts = {
                method,
                credentials: sendCookies ? "include" : "omit"
            };
            if (Object.keys(headers).length) fetchOpts.headers = headers;
            if (bodyText && method !== "GET" && method !== "HEAD") {
                fetchOpts.body = bodyText;
            }

            const t0 = performance.now();
            const response = await fetch(currentUrl, fetchOpts);
            const text = method === "HEAD" ? "" : await response.text();
            const ms = Math.round(performance.now() - t0);
            const headerLines = Array.from(response.headers.entries()).map(([k, v]) => [k, v]);

            renderResponseView(document.getElementById("testerResponse"), response.status, response.statusText, headerLines, text);
            analyzeSqliResponse(text, response.status, text.length, ms);

            if (sum) sum.textContent = `Page Response (${method} ${response.status}) – ${text.length} Bytes · ${ms} ms`;
            log(`Open → ${method} ${response.status} (${text.length} B, ${ms} ms)`);
        } catch (err) {
            if (tr) tr.innerHTML = `<span class="tok-err">Error: ${escapeHtml(String(err.message || err))}</span>`;
            if (sum) sum.textContent = "Page Response – Fehler";
            log("Open fehlgeschlagen: " + err.message);
        }

        // Navigation ist immer GET – nur bei GET sinnvoll
        if (doNavigate) {
            if (method === "GET") {
                setTimeout(() => {
                    browser.devtools.inspectedWindow.eval(`location.href = ${JSON.stringify(currentUrl)}`);
                }, 150);
            } else {
                log("Navigation übersprungen (nur bei GET sinnvoll, aktuelle Methode: " + method + ")");
            }
        }
    });
    document.getElementById("injectPage2")?.addEventListener("click", () => {
        document.getElementById("injectPage")?.click();  // gleichen Handler auslösen
    });

    // ======================
    // COPY AS cURL
    // ======================
    function buildCurlCommand() {
        const method = (document.getElementById("testerMethod")?.value || "GET").toUpperCase();
        const url = (urlInput?.value || "").trim();
        if (!url) return null;
        const headerText = document.getElementById("testerHeaders")?.value || "";
        const bodyText = document.getElementById("testerBody")?.value || "";
        const forceJson = document.getElementById("optBodyJson")?.checked ?? false;
        const sendHeaders = document.getElementById("optSendHeaders")?.checked ?? true;
        const parts = ["curl", "-k", "-s", "-X", method];
        parts.push("'" + url.replace(/'/g, "'\\''") + "'");
        if (sendHeaders) {
            headerText.split("\n").forEach(line => {
                line = line.trim();
                if (!line || !line.includes(":")) return;
                const idx = line.indexOf(":");
                const key = line.slice(0, idx).trim();
                const val = line.slice(idx + 1).trim();
                if (!key) return;
                parts.push("-H", "'" + (key + ": " + val).replace(/'/g, "'\\''") + "'");
            });
        }
        const hasCT = /content-type\s*:/i.test(headerText);
        if (bodyText && method !== "GET" && method !== "HEAD" && !hasCT) {
            if (forceJson || bodyText.trim().startsWith("{") || bodyText.trim().startsWith("[")) {
                parts.push("-H", "'Content-Type: application/json'");
            } else {
                parts.push("-H", "'Content-Type: application/x-www-form-urlencoded'");
            }
        }
        if (bodyText && method !== "GET" && method !== "HEAD") {
            parts.push("--data-binary", "'" + bodyText.replace(/'/g, "'\\''") + "'");
        }
        return parts.join(" ");
    }

    function copyCurlToClipboard() {
        const cmd = buildCurlCommand();
        if (!cmd) { log("cURL: keine URL"); return; }
        navigator.clipboard.writeText(cmd).then(() => {
            log("cURL kopiert (" + cmd.length + " Zeichen)");
        }).catch(err => log("cURL Copy fehlgeschlagen: " + err.message));
    }

    document.getElementById("copyCurl")?.addEventListener("click", copyCurlToClipboard);
    document.getElementById("copyCurl2")?.addEventListener("click", copyCurlToClipboard);

    // ======================
    // ENCODE / DECODE (improved)
    // ======================
    function getEncodeTypes() {
        const t1 = document.getElementById("encodingType")?.value || "url";
        const t2 = document.getElementById("encodingType2")?.value || "";
        return t2 ? [t1, t2] : [t1];
    }

    function setEncStatus(msg, isErr) {
        const el = document.getElementById("encStatus");
        if (!el) return;
        el.textContent = msg || "";
        el.style.color = isErr ? "#f87171" : "#888";
    }

    function runEncode(direction) {
        const input = document.getElementById("encodeInput")?.value ?? "";
        const types = getEncodeTypes();
        const out = document.getElementById("encodeOutput");
        if (!out) return;
        try {
            let result;
            if (types.length > 1 && typeof transformChain === "function") {
                result = transformChain(input, types, direction);
            } else {
                result = direction === "decode"
                    ? decodeData(input, types[0])
                    : encodeData(input, types[0]);
            }
            out.value = result;
            const label = types.filter(Boolean).join(" → ");
            const prefix = direction === "decode"
                ? (typeof t === "function" ? t("enc.statusDecoded") : "Decoded:")
                : (typeof t === "function" ? t("enc.statusEncoded") : "Encoded:");
            const chars = typeof t === "function" ? t("enc.chars") : "chars";
            setEncStatus(prefix + " " + label + " · " + (result?.length ?? 0) + " " + chars);
            log((direction === "decode" ? "Decode: " : "Encode: ") + label);
        } catch (e) {
            out.value = "Fehler: " + (e.message || e);
            setEncStatus((typeof t === "function" ? t("enc.error") : "Error:") + " " + (e.message || e), true);
            log((direction === "decode" ? "Decode" : "Encode") + " fehlgeschlagen: " + (e.message || e));
        }
    }

    function updateEncodeButtons() {
        const type = document.getElementById("encodingType")?.value || "";
        const encBtn = document.getElementById("encodeBtn");
        const decBtn = document.getElementById("decodeBtn");
        if (typeof isDecodeOnly === "function" && isDecodeOnly(type)) {
            if (encBtn) encBtn.disabled = true;
            if (decBtn) decBtn.disabled = false;
        } else if (typeof isEncodeOnly === "function" && isEncodeOnly(type)) {
            if (encBtn) encBtn.disabled = false;
            if (decBtn) decBtn.disabled = true;
        } else {
            if (encBtn) encBtn.disabled = false;
            if (decBtn) decBtn.disabled = false;
        }
    }

    let encLiveTimer = null;
    function scheduleLiveEncode() {
        if (!document.getElementById("encLive")?.checked) return;
        clearTimeout(encLiveTimer);
        encLiveTimer = setTimeout(() => {
            const type = document.getElementById("encodingType")?.value || "";
            if (typeof isDecodeOnly === "function" && isDecodeOnly(type)) {
                runEncode("decode");
            } else {
                runEncode("encode");
            }
        }, 180);
    }

    document.getElementById("encodeBtn")?.addEventListener("click", () => runEncode("encode"));
    document.getElementById("decodeBtn")?.addEventListener("click", () => runEncode("decode"));

    document.getElementById("encodingType")?.addEventListener("change", () => {
        updateEncodeButtons();
        scheduleLiveEncode();
    });
    document.getElementById("encodingType2")?.addEventListener("change", () => scheduleLiveEncode());
    document.getElementById("encodeInput")?.addEventListener("input", () => scheduleLiveEncode());
    document.getElementById("encLive")?.addEventListener("change", () => {
        if (document.getElementById("encLive")?.checked) scheduleLiveEncode();
    });

    document.getElementById("swapEncode")?.addEventListener("click", () => {
        const inp = document.getElementById("encodeInput");
        const out = document.getElementById("encodeOutput");
        if (!inp || !out) return;
        const a = inp.value;
        inp.value = out.value;
        out.value = a;
        setEncStatus(typeof t === "function" ? t("enc.statusSwapped") : "Swapped Input ↔ Output");
        log("Encode Swap");
        scheduleLiveEncode();
    });

    document.getElementById("copyEncode")?.addEventListener("click", () => {
        const v = document.getElementById("encodeOutput")?.value || "";
        navigator.clipboard.writeText(v).then(() => {
            setEncStatus((typeof t === "function" ? t("enc.statusCopied") : "Copied") + " (" + v.length + " " + (typeof t === "function" ? t("enc.chars") : "chars") + ")");
            log("Encode-Ausgabe kopiert");
        }).catch((e) => setEncStatus((typeof t === "function" ? t("enc.copyFailed") : "Copy failed:") + " " + e.message, true));
    });

    document.getElementById("encToPayload")?.addEventListener("click", () => {
        const v = document.getElementById("encodeOutput")?.value || "";
        if (!v) { setEncStatus(typeof t === "function" ? t("enc.emptyResult") : "Empty result", true); return; }
        const cp = document.getElementById("customPayload");
        if (cp) cp.value = v;
        setEncStatus(typeof t === "function" ? t("enc.statusToPayload") : "→ Payload applied");
        log("Encode → Payload");
    });

    document.getElementById("encToUrl")?.addEventListener("click", () => {
        const v = document.getElementById("encodeOutput")?.value || "";
        if (!v) { setEncStatus(typeof t === "function" ? t("enc.emptyResult") : "Empty result", true); return; }
        const input = document.getElementById("urlInput");
        if (!input) return;
        const url = input.value || "";
        const start = input.selectionStart ?? url.length;
        const end = input.selectionEnd ?? url.length;
        input.value = url.substring(0, start) + v + url.substring(end);
        const newPos = start + v.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();
        setEncStatus(typeof t === "function" ? t("enc.statusToUrl") : "→ Inserted at URL cursor");
        log("Encode → URL");
    });

    document.getElementById("encToBody")?.addEventListener("click", () => {
        const v = document.getElementById("encodeOutput")?.value || "";
        if (!v) { setEncStatus(typeof t === "function" ? t("enc.emptyResult") : "Empty result", true); return; }
        const ta = document.getElementById("testerBody");
        if (!ta) return;
        ta.value = (ta.value && !ta.value.endsWith("\n") ? ta.value + "\n" : ta.value) + v;
        setEncStatus(typeof t === "function" ? t("enc.statusToBody") : "→ Appended to Body");
        log("Encode → Body");
    });

    document.getElementById("clearEncode")?.addEventListener("click", () => {
        const inp = document.getElementById("encodeInput");
        const out = document.getElementById("encodeOutput");
        if (inp) inp.value = "";
        if (out) out.value = "";
        setEncStatus("");
        log("Encode-Felder geleert");
    });

    updateEncodeButtons();


    


    // ======================
    // RESPONSE SEARCH – Tester (URL/Payload)
    // ======================
    const testerResponseBox = document.getElementById("testerResponse");
    const testerSearchBox = document.getElementById("testerResponseSearch");
    const testerSearchInfo = document.getElementById("testerSearchInfo");

    let testerMatches = [];
    let testerCurrentMatch = -1;
    let testerPlainTextCache = "";

    function testerFindMatches() {
        testerMatches = [];
        testerCurrentMatch = -1;
        testerPlainTextCache = testerResponseBox ? (testerResponseBox.textContent || "") : "";

        let query = testerSearchBox?.value || "";
        if (!query) {
            if (testerSearchInfo) testerSearchInfo.textContent = "0 / 0";
            return;
        }

        const caseSensitive = document.getElementById("testerSearchCase")?.checked;
        let source = caseSensitive ? testerPlainTextCache : testerPlainTextCache.toLowerCase();
        query = caseSensitive ? query : query.toLowerCase();

        let pos = 0;
        while (true) {
            const found = source.indexOf(query, pos);
            if (found === -1) break;
            testerMatches.push(found);
            pos = found + query.length;
        }

        if (testerMatches.length) {
            testerCurrentMatch = 0;
            testerGotoMatch();
        } else {
            if (testerSearchInfo) testerSearchInfo.textContent = "0 / 0";
        }
    }

    function testerGotoMatch() {
        if (!testerMatches.length || !testerResponseBox) return;

        const start = testerMatches[testerCurrentMatch];
        const len = (testerSearchBox?.value || "").length;

        try {
            const range = document.createRange();
            const walker = document.createTreeWalker(testerResponseBox, NodeFilter.SHOW_TEXT);
            let charCount = 0;
            let node;

            while ((node = walker.nextNode())) {
                const nextCount = charCount + node.textContent.length;
                if (start >= charCount && start < nextCount) {
                    const offset = start - charCount;
                    range.setStart(node, offset);
                    range.setEnd(node, Math.min(offset + len, node.textContent.length));
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    const rect = range.getBoundingClientRect();
                    testerResponseBox.scrollTop += rect.top - testerResponseBox.getBoundingClientRect().top - 40;
                    break;
                }
                charCount = nextCount;
            }
        } catch (e) { }

        if (testerSearchInfo) {
            testerSearchInfo.textContent = (testerCurrentMatch + 1) + " / " + testerMatches.length;
        }
    }

    testerSearchBox?.addEventListener("input", testerFindMatches);

    document.getElementById("testerSearchNext")?.addEventListener("click", () => {
        if (!testerMatches.length) return;
        testerCurrentMatch = (testerCurrentMatch + 1) % testerMatches.length;
        testerGotoMatch();
    });

    document.getElementById("testerSearchPrev")?.addEventListener("click", () => {
        if (!testerMatches.length) return;
        testerCurrentMatch = (testerCurrentMatch - 1 + testerMatches.length) % testerMatches.length;
        testerGotoMatch();
    });

    document.getElementById("testerSearchCase")?.addEventListener("change", testerFindMatches);

    // ======================
    // COPY RESPONSE / BODY
    // ======================
    document.getElementById("copyResponseBtn")?.addEventListener("click", () => {
        const text = lastResponseFullText || (document.getElementById("testerResponse")?.textContent || "");
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            log(typeof t === "function" ? t("log.responseCopied") : "Response copied");
        }).catch(err => log("Copy failed: " + err.message));
    });

    document.getElementById("copyBodyBtn")?.addEventListener("click", () => {
        const text = lastResponseBody || "";
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            log(typeof t === "function" ? t("log.bodyCopied") : "Body copied");
        }).catch(err => log("Copy failed: " + err.message));
    });

    // ======================
    // COLORED RESPONSE HELPERS + SYNTAX HIGHLIGHT
    // ======================
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function statusToken(code) {
        const c = Number(code);
        if (!c) return "tok-dim";
        if (c >= 200 && c < 300) return "tok-ok";
        if (c >= 300 && c < 400) return "tok-warn";
        return "tok-err";
    }

    function tryPrettyBody(text) {
        const raw = (text || "").trim();
        if (!raw) return "";
        try {
            if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
                return JSON.stringify(JSON.parse(raw), null, 2);
            }
        } catch (e) { }
        return text;
    }

    /** Detect body type for highlighting */
    function detectBodyType(text) {
        const raw = (text || "").trim();
        if (!raw) return "text";
        if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
            try { JSON.parse(raw); return "json"; } catch (e) { }
        }
        if (/^\s*<(!DOCTYPE|html|[\w:-]+[\s>])/i.test(raw) || /<\/[a-z][\w:-]*>/i.test(raw)) {
            return "html";
        }
        return "text";
    }

    /** Lightweight JSON syntax highlighter */
    function highlightJson(src) {
        // Tokenize with a simple state machine-friendly regex approach
        const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g;
        let out = "";
        let last = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
            out += escapeHtml(src.slice(last, m.index));
            if (m[1] !== undefined) {
                // string (key or value)
                if (m[2] !== undefined) {
                    // key
                    out += `<span class="tok-json-key">${escapeHtml(m[1])}</span>${escapeHtml(m[2])}`;
                } else {
                    out += `<span class="tok-json-str">${escapeHtml(m[1])}</span>`;
                }
            } else if (m[3] !== undefined) {
                out += `<span class="tok-json-bool">${m[3]}</span>`;
            } else if (m[4] !== undefined) {
                out += `<span class="tok-json-null">${m[4]}</span>`;
            } else if (m[5] !== undefined) {
                out += `<span class="tok-json-num">${m[5]}</span>`;
            } else if (m[6] !== undefined) {
                out += `<span class="tok-json-punct">${escapeHtml(m[6])}</span>`;
            }
            last = re.lastIndex;
        }
        out += escapeHtml(src.slice(last));
        return out;
    }

    /** Lightweight HTML syntax highlighter */
    function highlightHtml(src) {
        const parts = [];
        const pushText = (txt) => { if (txt) parts.push(escapeHtml(txt)); };
        // Split into comments, tags, and text
        const re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][\w:-]*(?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>)/g;
        let last = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
            pushText(src.slice(last, m.index));
            if (m[1]) {
                // comment
                parts.push(`<span class="tok-html-comment">${escapeHtml(m[1])}</span>`);
            } else if (m[2]) {
                const full = m[2];
                const tagMatch = full.match(/^<\/?([a-zA-Z][\w:-]*)/);
                const tagName = tagMatch ? tagMatch[1] : "";
                const isClose = full.startsWith("</");
                const isSelf = /\/>$/.test(full);
                let attrHtml = "";
                const attrPart = full.slice(tagMatch ? tagMatch[0].length : 1, isSelf ? -2 : -1);
                attrPart.replace(/([\w:-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'=<>`]+)?|([\w:-]+)/g, (am, name, eq, val, bare) => {
                    if (name) {
                        attrHtml += ` <span class="tok-html-attr">${escapeHtml(name)}</span>`;
                        if (eq) attrHtml += eq;
                        if (val !== undefined) attrHtml += `<span class="tok-html-val">${escapeHtml(val)}</span>`;
                    } else if (bare) {
                        attrHtml += ` <span class="tok-html-attr">${escapeHtml(bare)}</span>`;
                    }
                    return am;
                });
                const open = isClose ? "&lt;/" : "&lt;";
                const close = isSelf ? " /&gt;" : "&gt;";
                parts.push(`${open}<span class="tok-html-tag">${escapeHtml(tagName)}</span>${attrHtml}${close}`);
            }
            last = re.lastIndex;
        }
        pushText(src.slice(last));
        return parts.join("");
    }

    function highlightBody(text, type) {
        if (!text) return "";
        if (type === "json") return highlightJson(text);
        if (type === "html") return highlightHtml(text);
        return escapeHtml(text);
    }

    function renderResponseView(el, status, statusText, headerPairs, body) {
        if (!el) return;
        lastResponseBody = body || "";
        const stClass = statusToken(status);
        const hdrLabel = typeof t === "function" ? t("resp.headers") : "── Headers ──";
        const bodyLabel = typeof t === "function" ? t("resp.body") : "── Body ──";

        let html = `<span class="tok-dim">HTTP</span> <span class="${stClass}">${escapeHtml(status)} ${escapeHtml(statusText || "")}</span>\n`;
        html += `<span class="tok-section">${escapeHtml(hdrLabel)}</span>\n`;
        (headerPairs || []).forEach(([k, v]) => {
            html += `<span class="tok-key">${escapeHtml(k)}</span><span class="tok-dim">: </span><span class="tok-val">${escapeHtml(v)}</span>\n`;
        });

        const pretty = tryPrettyBody(body || "");
        const bodyType = detectBodyType(pretty || body || "");
        if (pretty) {
            html += `\n<span class="tok-section">${escapeHtml(bodyLabel)}</span>\n`;
            html += `<span class="tok-body">${highlightBody(pretty, bodyType)}</span>`;
        }
        el.innerHTML = html;
        lastResponseFullText = el.textContent || "";

        // Cache für Suche aktualisieren
        testerPlainTextCache = el.textContent || "";
        testerMatches = [];
        testerCurrentMatch = -1;
        if (testerSearchInfo) testerSearchInfo.textContent = "0 / 0";
        // SQLi detection
        try { analyzeSqliResponse(body || "", status, (body || "").length); } catch (e) {}
    }

    // ======================
    // LIVE NETWORK MONITOR
    // ======================
    const networkList = document.getElementById("networkList");
    const networkDetails = document.getElementById("networkDetails");
    const netFilter = document.getElementById("netFilter");
    let networkEntries = [];
    let selectedNetIndex = -1;
    let netIdCounter = 1;

    function methodClass(m) {
        return (m || "GET").toUpperCase();
    }

    function statusClass(code) {
        if (!code) return "";
        return code >= 200 && code < 400 ? "ok" : "err";
    }

    function matchesFilter(entry, filter, search) {
        if (filter === "post" && entry.method !== "POST") return false;
        if (filter === "xhr") {
            const t = (entry.type || "").toLowerCase();
            if (!(t.includes("xhr") || t.includes("fetch") || t.includes("xmlhttprequest"))) return false;
        }
        if (filter === "doc") {
            const t = (entry.type || "").toLowerCase();
            if (!(t.includes("document") || t.includes("main_frame") || t === "doc")) return false;
        }
        if (search) {
            const q = search.toLowerCase();
            const hay = `${entry.method} ${entry.url} ${entry.status || ""}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    }

    function countParamsForEntry(entry) {
        if (!entry || !entry._id) return 0;
        let n = 0;
        for (const p of netParamMap.values()) {
            if (p.requestIds && p.requestIds.has(entry._id)) n++;
        }
        return n;
    }

    function getParamsForEntry(entry) {
        if (!entry || !entry._id) return [];
        const items = [];
        for (const p of netParamMap.values()) {
            if (p.requestIds && p.requestIds.has(entry._id)) {
                items.push(p);
            }
        }
        items.sort((a, b) => a.name.localeCompare(b.name));
        return items;
    }

    function buildInlineParamsHtml(entry) {
        const items = getParamsForEntry(entry);
        const title = typeof t === "function" ? t("net.selectedParams") : "Parameters of this request";
        if (!items.length) {
            const empty = typeof t === "function" ? t("net.noParamsForRequest") : "No parameters for this request.";
            return `<div class="network-params-expand" data-expand-for="${entry._id}">
                <div class="param-empty" style="padding:6px 8px">${empty}</div>
            </div>`;
        }
        const rows = items.map((p) => {
            const val = p.value ? escapeHtml(String(p.value).substring(0, 40)) : "";
            return '<div class="param-item">' +
                '<span class="param-badge ' + p.type + '">' + escapeHtml(p.type) + '</span>' +
                '<span class="param-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="param-val" title="' + escapeHtml(p.value || "") + '">' + val + '</span>' +
                '<button class="btn-secondary selp-url" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "1") + '">URL</button>' +
                '<button class="btn-secondary selp-body" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "1") + '">Body</button>' +
                '<button class="btn-secondary selp-pl" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "") + '">PL</button>' +
            '</div>';
        }).join("");
        return `<div class="network-params-expand" data-expand-for="${entry._id}">
            <div style="font-size:11px;color:#888;padding:4px 8px 2px">${escapeHtml(title)} (${items.length})</div>
            <div class="param-list" style="max-height:180px;border:none;margin:0">${rows}</div>
        </div>`;
    }

    function bindInlineParamButtons(root) {
        if (!root) return;
        root.querySelectorAll(".selp-url").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                appendParamToUrl(btn.dataset.name, btn.dataset.val || "1");
                log("Sel-Param → URL: " + btn.dataset.name);
            });
        });
        root.querySelectorAll(".selp-body").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                appendParamToBody(btn.dataset.name, btn.dataset.val || "1");
                log("Sel-Param → Body: " + btn.dataset.name);
            });
        });
        root.querySelectorAll(".selp-pl").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                if (customPayload) customPayload.value = btn.dataset.name + "=" + (btn.dataset.val || "");
                log("Sel-Param → Payload: " + btn.dataset.name);
            });
        });
    }

    function renderNetworkList() {
        if (!networkList) return;
        const filter = netFilter?.value || "all";
        const search = (document.getElementById("netSearch")?.value || "").trim();
        const visible = networkEntries
            .map((e, i) => ({ e, i }))
            .filter(({ e }) => matchesFilter(e, filter, search));

        if (!visible.length) {
            networkList.innerHTML = '<div class="network-empty">' + (typeof t === "function" ? t("net.empty") : "Waiting for requests… navigate or interact with the page.") + '</div>';
            return;
        }

        networkList.innerHTML = visible.map(({ e, i }) => {
            const pCount = countParamsForEntry(e);
            const isActive = i === selectedNetIndex;
            const chevron = isActive ? "▼" : "▶";
            const pBadge = pCount > 0
                ? `<span class="param-badge query" style="margin-left:4px;flex-shrink:0" title="${pCount} Parameter">${chevron} ${pCount}p</span>`
                : `<span style="margin-left:4px;flex-shrink:0;color:#555;font-size:10px">${chevron}</span>`;
            const shortUrl = e.url.length > 90 ? e.url.substring(0, 87) + "…" : e.url;
            let html = `
            <div class="network-item ${isActive ? "active" : ""}" data-idx="${i}">
                <span class="network-method ${methodClass(e.method)}">${e.method}</span>
                <span class="network-status ${statusClass(e.status)}">${e.status || "…"}</span>
                <span class="network-url" title="${e.url.replace(/"/g, "&quot;")}">${shortUrl}</span>
                ${pBadge}
            </div>`;
            // Aufklappen: Parameter direkt unter dem Request
            if (isActive) {
                html += buildInlineParamsHtml(e);
            }
            return html;
        }).join("");

        networkList.querySelectorAll(".network-item").forEach(el => {
            el.addEventListener("click", () => {
                const idx = parseInt(el.dataset.idx, 10);
                // Toggle: nochmal klicken = zuklappen
                if (selectedNetIndex === idx) {
                    selectedNetIndex = -1;
                    if (networkDetails) networkDetails.innerHTML = "";
                } else {
                    selectedNetIndex = idx;
                    showNetworkDetails(selectedNetIndex);
                }
                renderNetworkList();
                if (document.getElementById("netParamOnlySelected")?.checked) {
                    renderNetParamList();
                }
            });
        });

        // Buttons in aufgeklappten Param-Zeilen
        networkList.querySelectorAll(".network-params-expand").forEach(exp => {
            exp.addEventListener("click", (ev) => ev.stopPropagation());
            bindInlineParamButtons(exp);
        });
    }

    // Kompatibilität: alte Aufrufe von renderSelectedRequestParams() werden zu no-op / re-render
    function renderSelectedRequestParams() {
        renderNetworkList();
    }

    function showNetworkDetails(idx) {
        const e = networkEntries[idx];
        if (!e || !networkDetails) return;

        const st = statusToken(e.status);
        let html = `<span class="network-method ${methodClass(e.method)}">${escapeHtml(e.method)}</span> <span class="tok-url">${escapeHtml(e.url)}</span>\n`;
        html += `<span class="tok-dim">Status:</span> <span class="${st}">${escapeHtml(e.status || "pending")} ${escapeHtml(e.statusText || "")}</span>\n`;
        html += `<span class="tok-dim">Type:</span> <span class="tok-val">${escapeHtml(e.type || "-")}</span>\n`;
        html += `<span class="tok-dim">Time:</span> <span class="tok-val">${escapeHtml(e.time || "-")}</span>\n`;

        // Parameter-Übersicht in den Details
        const params = getParamsForEntry(e);
        if (params.length) {
            html += `\n<span class="tok-section">── Parameter (${params.length}) ──</span>\n`;
            params.forEach(p => {
                const v = (p.value || "").substring(0, 80);
                html += `<span class="param-badge ${p.type}" style="margin-right:4px">${escapeHtml(p.type)}</span>`;
                html += `<span class="tok-key">${escapeHtml(p.name)}</span><span class="tok-dim">=</span><span class="tok-val">${escapeHtml(v)}</span>\n`;
            });
        }

        html += `\n<span class="tok-section">── Request Headers ──</span>\n`;
        html += formatHeaderBlock(e.reqHeaders);

        if (e.reqBody) {
            html += `\n<span class="tok-section">── Request Body ──</span>\n<span class="tok-body">${escapeHtml(tryPrettyBody(e.reqBody))}</span>\n`;
        }

        html += `\n<span class="tok-section">── Response Headers ──</span>\n`;
        html += formatHeaderBlock(e.resHeaders);

        if (e.resBodyPreview) {
            html += `\n<span class="tok-section">── Response Preview ──</span>\n<span class="tok-body">${escapeHtml(tryPrettyBody(e.resBodyPreview))}</span>\n`;
        }

        networkDetails.innerHTML = html;
    }

    function formatHeaderBlock(text) {
        if (!text || text === "(none)") return `<span class="tok-dim">(none)</span>\n`;
        return text.split("\n").map(line => {
            const i = line.indexOf(":");
            if (i === -1) return `<span class="tok-val">${escapeHtml(line)}</span>`;
            const k = line.slice(0, i);
            const v = line.slice(i + 1);
            return `<span class="tok-key">${escapeHtml(k)}</span><span class="tok-dim">:</span><span class="tok-val">${escapeHtml(v)}</span>`;
        }).join("\n") + "\n";
    }

    function headersToText(headers) {
        if (!headers || !headers.length) return "(none)";
        return headers.map(h => `${h.name}: ${h.value}`).join("\n");
    }

    function addNetworkEntry(harEntry) {
        try {
            const req = harEntry.request || {};
            const res = harEntry.response || {};
            const method = (req.method || "GET").toUpperCase();
            const url = req.url || "";
            const status = res.status;
            const statusText = res.statusText || "";

            let type = "";
            if (harEntry._resourceType) type = harEntry._resourceType;
            else if (res.content && res.content.mimeType) type = res.content.mimeType;

            const entry = {
                _id: netIdCounter++,
                method,
                url,
                status,
                statusText,
                type,
                time: new Date().toLocaleTimeString(),
                reqHeaders: headersToText(req.headers),
                resHeaders: headersToText(res.headers),
                reqBody: req.postData ? (req.postData.text || JSON.stringify(req.postData)) : "",
                resBodyPreview: ""
            };

            networkEntries.unshift(entry);
            if (networkEntries.length > 200) networkEntries.pop();
            // Indices shift: if something was selected, adjust
            if (selectedNetIndex >= 0) selectedNetIndex++;

            const idx = 0;
            if (typeof harEntry.getContent === "function") {
                harEntry.getContent((content) => {
                    // find entry by _id in case indices shifted
                    const cur = networkEntries.find(x => x._id === entry._id);
                    if (content && cur) {
                        cur.resBodyPreview = String(content).substring(0, 2000);
                        const curIdx = networkEntries.indexOf(cur);
                        if (selectedNetIndex === curIdx) showNetworkDetails(curIdx);
                    }
                    if (pendingOpenUrl && content) {
                        const t = (type || "").toLowerCase();
                        const mime = (res.content?.mimeType || "").toLowerCase();
                        const isDoc = t.includes("document") || t.includes("main_frame") || t === "doc" ||
                            mime.includes("text/html");

                        const basePending = pendingOpenUrl.split("?")[0].split("#")[0];
                        const baseUrl = url.split("?")[0].split("#")[0];
                        const urlMatches = url === pendingOpenUrl || baseUrl === basePending;

                        if (isDoc || (urlMatches && !/image|script|stylesheet|font/.test(t))) {
                            const headerPairs = (res.headers || []).map(h => [h.name, h.value]);
                            renderResponseView(
                                document.getElementById("testerResponse"),
                                status, statusText, headerPairs, String(content)
                            );

                            const sum = document.querySelector("#testerResponseDetails summary");
                            if (sum) sum.textContent = `Page Response (${status}) – anklicken zum Anzeigen`;

                            pendingOpenUrl = null;
                            log(`Page Response geladen → URL/Payload (${status})`);
                        }
                    }
                });
            }

            // Parameter sammeln (mit Request-ID)
            try {
                collectParamsFromEntry(entry);
                renderNetParamList();
            } catch (e2) { /* aggregator not ready */ }

            renderNetworkList();
            log(`${method} ${status || "…"} ${url.substring(0, 60)}`);
        } catch (err) {
            console.warn("network entry error", err);
        }
    }

    if (browser.devtools && browser.devtools.network) {
        browser.devtools.network.onRequestFinished.addListener((request) => {
            addNetworkEntry(request);
        });
        log("Live Network monitor active");
    } else {
        log("devtools.network API not available");
    }

    document.getElementById("clearNetwork")?.addEventListener("click", () => {
        networkEntries = [];
        selectedNetIndex = -1;
        if (networkDetails) networkDetails.innerHTML = "";
        renderNetworkList();
        log("Network log cleared");
    });

    netFilter?.addEventListener("change", () => renderNetworkList());
    document.getElementById("netSearch")?.addEventListener("input", () => renderNetworkList());

    document.getElementById("netUseUrl")?.addEventListener("click", () => {
        const e = networkEntries[selectedNetIndex];
        if (!e) return;
        const ru = document.getElementById("requestUrl");
        if (ru) ru.value = e.url;
        const hm = document.getElementById("httpMethod");
        if (hm) hm.value = e.method;
        document.querySelector('[data-tab="request"]')?.click();
        log("URL → Request Builder");
    });

    document.getElementById("netCopyUrl")?.addEventListener("click", () => {
        const e = networkEntries[selectedNetIndex];
        if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
        navigator.clipboard.writeText(e.url);
        log("Request URL copied");
    });

    /** Request → Tester Tab übernehmen */
    function sendNetEntryToTester(e, autoOpen) {
        if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
        if (urlInput) urlInput.value = e.url;
        const methodEl = document.getElementById("testerMethod");
        if (methodEl) methodEl.value = e.method || "GET";
        const th = document.getElementById("testerHeaders");
        if (th && e.reqHeaders && e.reqHeaders !== "(none)") th.value = e.reqHeaders;
        const tb = document.getElementById("testerBody");
        if (tb) tb.value = e.reqBody || "";
        if (e.reqBody && (e.reqBody.trim().startsWith("{") || e.reqBody.trim().startsWith("["))) {
            const oj = document.getElementById("optBodyJson");
            if (oj) oj.checked = true;
        } else if (e.reqBody) {
            const of = document.getElementById("optBodyForm");
            if (of) of.checked = true;
        }
        // switch to tester tab
        document.querySelector('.tab-btn[data-tab="tester"]')?.click();
        log((typeof t === "function" ? t("net.toTesterLog") : "Network → Tester:") + " " + e.method + " " + e.url.substring(0, 50));
        if (autoOpen) {
            setTimeout(() => document.getElementById("injectPage")?.click(), 120);
        }
    }

    document.getElementById("netToTester")?.addEventListener("click", () => {
        sendNetEntryToTester(networkEntries[selectedNetIndex], false);
    });

    document.getElementById("netReplay")?.addEventListener("click", () => {
        sendNetEntryToTester(networkEntries[selectedNetIndex], true);
    });

    document.getElementById("netCopyCurl")?.addEventListener("click", () => {
        const e = networkEntries[selectedNetIndex];
        if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
        const parts = ["curl", "-k", "-s", "-X", e.method];
        parts.push("'" + e.url.replace(/'/g, "'\\''") + "'");
        (e.reqHeaders || "").split("\n").forEach(line => {
            line = line.trim();
            if (!line || !line.includes(":") || line === "(none)") return;
            parts.push("-H", "'" + line.replace(/'/g, "'\\''") + "'");
        });
        if (e.reqBody && e.method !== "GET" && e.method !== "HEAD") {
            parts.push("--data-binary", "'" + e.reqBody.replace(/'/g, "'\\''") + "'");
        }
        const cmd = parts.join(" ");
        navigator.clipboard.writeText(cmd).then(() => log("cURL kopiert (" + cmd.length + " Zeichen)"))
            .catch(err => log("cURL Copy fehlgeschlagen: " + err.message));
    });

    document.getElementById("netCopyParams")?.addEventListener("click", () => {
        const e = networkEntries[selectedNetIndex];
        if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
        const params = getParamsForEntry(e);
        if (!params.length) { log(typeof t === "function" ? t("net.noParamsForRequest") : "No parameters for this request."); return; }
        const lines = params.map(p => p.name + "=" + (p.value || ""));
        navigator.clipboard.writeText(lines.join("\n")).then(() => {
            log((typeof t === "function" ? t("net.paramsCopied") : "Params copied:") + " " + params.length);
        }).catch(err => log("Copy failed: " + err.message));
    });



    // =====================================================================
    // 1) PAGE PARAMETER SCANNER
    // =====================================================================
    let pageParams = []; // { name, value, source, type }

    function renderPageParamList() {
        const box = document.getElementById("pageParamList");
        const stats = document.getElementById("pageParamStats");
        if (!box) return;

        if (!pageParams.length) {
            box.innerHTML = '<div class="param-empty">' + (typeof t === "function" ? t("page.empty") : "Scan the page to find form fields, hidden inputs, query params & cookies.") + '</div>';
            if (stats) stats.textContent = "";
            return;
        }

        if (stats) stats.textContent = "(" + pageParams.length + ")";

        box.innerHTML = pageParams.map((p, i) => {
            const badgeClass = p.type || "query";
            const val = p.value != null && p.value !== "" ? escapeHtml(String(p.value).substring(0, 40)) : "";
            return '<div class="param-item" data-idx="' + i + '">' +
                '<span class="param-badge ' + badgeClass + '">' + escapeHtml(p.type || "?") + '</span>' +
                '<span class="param-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="param-val" title="' + escapeHtml(String(p.value || "")) + '">' + val + '</span>' +
                '<span class="param-src">' + escapeHtml(p.source || "") + '</span>' +
                '<button class="btn-secondary param-to-url" data-idx="' + i + '" title="An URL anhängen">URL</button>' +
                '<button class="btn-secondary param-to-body" data-idx="' + i + '" title="In Body">Body</button>' +
                '<button class="btn-secondary param-to-payload" data-idx="' + i + '" title="Als Payload">PL</button>' +
            '</div>';
        }).join("");

        box.querySelectorAll(".param-to-url").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const p = pageParams[parseInt(btn.dataset.idx, 10)];
                if (!p) return;
                appendParamToUrl(p.name, p.value || "1");
                log("Param → URL: " + p.name);
            });
        });
        box.querySelectorAll(".param-to-body").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const p = pageParams[parseInt(btn.dataset.idx, 10)];
                if (!p) return;
                appendParamToBody(p.name, p.value || "1");
                log("Param → Body: " + p.name);
            });
        });
        box.querySelectorAll(".param-to-payload").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const p = pageParams[parseInt(btn.dataset.idx, 10)];
                if (!p) return;
                if (customPayload) customPayload.value = p.name + "=" + (p.value || "");
                log("Param → Payload: " + p.name);
            });
        });
    }

    function appendParamToUrl(name, value) {
        const input = urlInput;
        if (!input) return;
        let url = input.value.trim();
        if (!url) return;
        try {
            const u = new URL(url);
            u.searchParams.set(name, value);
            input.value = u.toString();
            if (requestUrl) requestUrl.value = input.value;
        } catch (e) {
            const sep = url.includes("?") ? "&" : "?";
            input.value = url + sep + encodeURIComponent(name) + "=" + encodeURIComponent(value);
            if (requestUrl) requestUrl.value = input.value;
        }
    }

    function appendParamToBody(name, value) {
        const ta = document.getElementById("testerBody");
        if (!ta) return;
        const cur = ta.value.trim();
        if (cur.startsWith("{") || cur.startsWith("[")) {
            try {
                const obj = JSON.parse(cur || "{}");
                if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
                    obj[name] = value;
                    ta.value = JSON.stringify(obj, null, 2);
                    const oj = document.getElementById("optBodyJson");
                    if (oj) oj.checked = true;
                    return;
                }
            } catch (e) { /* fall through */ }
        }
        if (cur) {
            ta.value = cur + "&" + encodeURIComponent(name) + "=" + encodeURIComponent(value);
        } else {
            ta.value = encodeURIComponent(name) + "=" + encodeURIComponent(value);
        }
        const of = document.getElementById("optBodyForm");
        if (of) of.checked = true;
    }

    document.getElementById("scanPageParams")?.addEventListener("click", () => {
        const includeLinks = document.getElementById("scanIncludeLinks")?.checked ?? true;
        const includeCookies = document.getElementById("scanIncludeCookies")?.checked ?? true;
        const includeHidden = document.getElementById("scanIncludeHidden")?.checked ?? true;

        const code = `
(function() {
    const params = [];
    const seen = new Set();

    function add(name, value, source, type) {
        if (!name || typeof name !== "string") return;
        name = name.trim();
        if (!name) return;
        const key = type + "|" + name.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        params.push({ name, value: value == null ? "" : String(value), source: source || "", type: type || "query" });
    }

    try {
        const sp = new URLSearchParams(location.search);
        sp.forEach((v, k) => add(k, v, "location.search", "query"));
    } catch (e) {}

    document.querySelectorAll("form").forEach((form, fi) => {
        const formId = form.id || form.name || ("form#" + fi);
        form.querySelectorAll("input, select, textarea").forEach(el => {
            const name = el.name || el.id;
            if (!name) return;
            const type = (el.type || el.tagName).toLowerCase();
            const isHidden = type === "hidden";
            if (isHidden && !${includeHidden}) return;
            add(name, el.value, formId, isHidden ? "hidden" : "form");
        });
    });

    document.querySelectorAll("input[name], select[name], textarea[name]").forEach(el => {
        if (el.closest("form")) return;
        const type = (el.type || "").toLowerCase();
        if (type === "hidden" && !${includeHidden}) return;
        add(el.name, el.value, "standalone", type === "hidden" ? "hidden" : "form");
    });

    if (${includeLinks}) {
        document.querySelectorAll("a[href]").forEach(a => {
            try {
                const href = a.getAttribute("href") || "";
                if (!href.includes("?")) return;
                const u = new URL(href, location.href);
                u.searchParams.forEach((v, k) => add(k, v, "link: " + (a.textContent || "").trim().substring(0, 30), "link"));
            } catch (e) {}
        });
    }

    document.querySelectorAll("[data-id], [data-user], [data-page], [data-item], [data-product], [data-param]").forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith("data-") && attr.value) {
                const key = attr.name.replace(/^data-/, "").replace(/-/g, "_");
                add(key, attr.value, "data-attr", "form");
            }
        });
    });

    if (${includeCookies} && document.cookie) {
        document.cookie.split(";").forEach(part => {
            const eq = part.indexOf("=");
            if (eq === -1) return;
            const n = part.slice(0, eq).trim();
            const v = part.slice(eq + 1).trim();
            if (n) add(n, v, "document.cookie", "cookie");
        });
    }

    return JSON.stringify(params);
})()
        `;

        browser.devtools.inspectedWindow.eval(code, (result, isException) => {
            if (isException || result == null) {
                log("Page-Scan fehlgeschlagen: " + (isException && isException.value ? isException.value : "unbekannt"));
                return;
            }
            try {
                pageParams = JSON.parse(result) || [];
                const order = { hidden: 0, form: 1, query: 2, link: 3, cookie: 4 };
                pageParams.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.name.localeCompare(b.name));
                renderPageParamList();
                log("Page-Scan: " + pageParams.length + " Parameter gefunden");
            } catch (e) {
                log("Page-Scan Parse-Fehler: " + e.message);
            }
        });
    });

    document.getElementById("clearPageParams")?.addEventListener("click", () => {
        pageParams = [];
        renderPageParamList();
        log("Page-Parameter geleert");
    });


    // =====================================================================
    // 2) NETWORK PARAMETER AGGREGATOR (mit Request-Zugehörigkeit)
    // =====================================================================
    const netParamMap = new Map();

    function collectParamsFromEntry(entry) {
        if (!entry) return;
        const rid = entry._id;
        let pathHint = "";
        try {
            const u = new URL(entry.url);
            pathHint = entry.method + " " + u.pathname;
            u.searchParams.forEach((v, k) => {
                upsertNetParam(k, v, "query", pathHint, rid, entry.url);
            });
        } catch (e) {}

        const body = entry.reqBody || "";
        if (body) {
            if (body.includes("=") && !body.trim().startsWith("{") && !body.trim().startsWith("[")) {
                try {
                    const sp = new URLSearchParams(body);
                    sp.forEach((v, k) => upsertNetParam(k, v, "body", entry.method + " body", rid, entry.url));
                } catch (e) {
                    body.split("&").forEach(part => {
                        const eq = part.indexOf("=");
                        if (eq > 0) {
                            try {
                                const k = decodeURIComponent(part.slice(0, eq).replace(/\+/g, " "));
                                const v = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, " "));
                                upsertNetParam(k, v, "body", entry.method + " body", rid, entry.url);
                            } catch (e2) {}
                        }
                    });
                }
            }
            if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
                try {
                    const obj = JSON.parse(body);
                    collectJsonKeys(obj, "", (path, val) => {
                        const leaf = path.split(".").pop() || path;
                        upsertNetParam(leaf, typeof val === "object" ? JSON.stringify(val) : String(val), "json", "JSON " + path, rid, entry.url);
                    });
                } catch (e) {}
            }
        }

        const hdr = entry.reqHeaders || "";
        hdr.split("\n").forEach(line => {
            const m = line.match(/^\s*Cookie\s*:\s*(.+)$/i);
            if (m) {
                m[1].split(";").forEach(part => {
                    const eq = part.indexOf("=");
                    if (eq > 0) {
                        const n = part.slice(0, eq).trim();
                        const v = part.slice(eq + 1).trim();
                        if (n) upsertNetParam(n, v, "cookie", "Cookie header", rid, entry.url);
                    }
                });
            }
            const hm = line.match(/^\s*(X-[\w-]+|Authorization|Api-Key|X-Api-Key|X-Auth-Token)\s*:\s*(.+)$/i);
            if (hm) {
                upsertNetParam(hm[1].trim(), hm[2].trim().substring(0, 60), "header", "Request header", rid, entry.url);
            }
        });
    }

    function upsertNetParam(name, value, type, source, requestId, url) {
        if (!name) return;
        name = String(name).trim();
        if (!name) return;
        const key = type + "|" + name.toLowerCase();
        const existing = netParamMap.get(key);
        if (existing) {
            existing.count = (existing.count || 1) + 1;
            if (value && !existing.value) existing.value = String(value);
            if (requestId != null) {
                if (!existing.requestIds) existing.requestIds = new Set();
                existing.requestIds.add(requestId);
            }
            if (url) {
                if (!existing.urls) existing.urls = new Set();
                existing.urls.add(url);
            }
            // keep last source
            if (source) existing.source = source;
            return;
        }
        const requestIds = new Set();
        if (requestId != null) requestIds.add(requestId);
        const urls = new Set();
        if (url) urls.add(url);
        netParamMap.set(key, {
            name,
            value: value != null ? String(value) : "",
            type: type || "query",
            source: source || "",
            count: 1,
            requestIds,
            urls
        });
    }

    function collectJsonKeys(obj, prefix, cb) {
        if (obj === null || obj === undefined) return;
        if (typeof obj !== "object") {
            if (prefix) cb(prefix, obj);
            return;
        }
        if (Array.isArray(obj)) {
            obj.forEach((item, i) => collectJsonKeys(item, prefix ? prefix + "[" + i + "]" : "[" + i + "]", cb));
            return;
        }
        Object.keys(obj).forEach(k => {
            const path = prefix ? prefix + "." + k : k;
            const v = obj[k];
            if (v !== null && typeof v === "object") {
                collectJsonKeys(v, path, cb);
            } else {
                cb(path, v);
            }
        });
    }

    function shortUrl(u) {
        if (!u) return "";
        try {
            const x = new URL(u);
            return x.pathname + (x.search ? "?" + x.searchParams.toString().substring(0, 40) : "");
        } catch (e) {
            return String(u).substring(0, 50);
        }
    }

    function renderNetParamList() {
        const box = document.getElementById("netParamList");
        const stats = document.getElementById("netParamStats");
        if (!box) return;

        const filter = (document.getElementById("netParamSearch")?.value || "").trim().toLowerCase();
        const typeFilter = document.getElementById("netParamTypeFilter")?.value || "all";
        const onlySelected = document.getElementById("netParamOnlySelected")?.checked;
        const selectedEntry = selectedNetIndex >= 0 ? networkEntries[selectedNetIndex] : null;

        let items = Array.from(netParamMap.values());
        if (typeFilter !== "all") {
            items = items.filter(p => p.type === typeFilter);
        }
        if (onlySelected && selectedEntry && selectedEntry._id != null) {
            items = items.filter(p => p.requestIds && p.requestIds.has(selectedEntry._id));
        }
        if (filter) {
            items = items.filter(p =>
                p.name.toLowerCase().includes(filter) ||
                (p.value || "").toLowerCase().includes(filter) ||
                (p.type || "").toLowerCase().includes(filter) ||
                (p.source || "").toLowerCase().includes(filter)
            );
        }

        items.sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));

        if (stats) stats.textContent = "(" + netParamMap.size + (filter || typeFilter !== "all" || onlySelected ? ", shown " + items.length : "") + ")";

        if (!items.length) {
            const emptyMsg = netParamMap.size
                ? (typeof t === "function" ? t("net.noMatch") : "No match for filter.")
                : (typeof t === "function" ? t("net.paramsEmpty") : "Parameters from captured requests appear here automatically.");
            box.innerHTML = '<div class="param-empty">' + emptyMsg + "</div>";
            return;
        }

        box.innerHTML = items.map((p) => {
            const val = p.value ? escapeHtml(String(p.value).substring(0, 36)) : "";
            const reqCount = p.requestIds ? p.requestIds.size : 0;
            // show affiliation: source + number of linked requests
            let srcLabel = p.source || "";
            if (reqCount > 1) srcLabel += " · " + reqCount + " reqs";
            // first linked URL short
            let linkHint = "";
            if (p.urls && p.urls.size) {
                const first = p.urls.values().next().value;
                linkHint = shortUrl(first);
            }
            const title = escapeHtml([p.source, linkHint, reqCount + " request(s)"].filter(Boolean).join(" | "));
            return '<div class="param-item" title="' + title + '">' +
                '<span class="param-badge ' + p.type + '">' + escapeHtml(p.type) + '</span>' +
                '<span class="param-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="param-val" title="' + escapeHtml(p.value || "") + '">' + val + '</span>' +
                '<span class="param-src netp-goto" data-rid="' + (p.requestIds && p.requestIds.size ? [...p.requestIds][0] : "") + '" style="cursor:pointer;text-decoration:underline dotted" title="Zum Request springen">' +
                    escapeHtml(srcLabel || linkHint || "") +
                    (p.count > 1 && reqCount <= 1 ? " ×" + p.count : "") +
                '</span>' +
                '<button class="btn-secondary netp-url" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "1") + '">URL</button>' +
                '<button class="btn-secondary netp-body" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "1") + '">Body</button>' +
                '<button class="btn-secondary netp-pl" data-name="' + escapeHtml(p.name) + '" data-val="' + escapeHtml(p.value || "") + '">PL</button>' +
            '</div>';
        }).join("");

        box.querySelectorAll(".netp-url").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                appendParamToUrl(btn.dataset.name, btn.dataset.val || "1");
                log("Net-Param → URL: " + btn.dataset.name);
            });
        });
        box.querySelectorAll(".netp-body").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                appendParamToBody(btn.dataset.name, btn.dataset.val || "1");
                log("Net-Param → Body: " + btn.dataset.name);
            });
        });
        box.querySelectorAll(".netp-pl").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.stopPropagation();
                if (customPayload) customPayload.value = btn.dataset.name + "=" + (btn.dataset.val || "");
                log("Net-Param → Payload: " + btn.dataset.name);
            });
        });
        // Klick auf Source → zum Request springen
        box.querySelectorAll(".netp-goto").forEach(el => {
            el.addEventListener("click", (ev) => {
                ev.stopPropagation();
                const rid = parseInt(el.dataset.rid, 10);
                if (!rid) return;
                const idx = networkEntries.findIndex(e => e._id === rid);
                if (idx < 0) { log("Request nicht mehr in Liste"); return; }
                selectedNetIndex = idx;
                showNetworkDetails(idx);
                renderNetworkList();
                renderSelectedRequestParams();
                // scroll request into view
                const item = networkList?.querySelector(`.network-item[data-idx="${idx}"]`);
                if (item) item.scrollIntoView({ block: "nearest" });
                log((typeof t === "function" ? t("net.jumpedToRequest") : "Jumped to request") + " (#" + rid + ")");
            });
        });
    }

    document.getElementById("clearNetParams")?.addEventListener("click", () => {
        netParamMap.clear();
        renderNetParamList();
        renderSelectedRequestParams();
        renderNetworkList();
        log("Network-Parameter geleert");
    });

    document.getElementById("netParamSearch")?.addEventListener("input", () => renderNetParamList());
    document.getElementById("netParamTypeFilter")?.addEventListener("change", () => renderNetParamList());
    document.getElementById("netParamOnlySelected")?.addEventListener("change", () => renderNetParamList());


    // =====================================================================
    // 4) JSON / NESTED BODY EXPLORER
    // =====================================================================
    let selectedJsonPath = "";
    let selectedJsonValue = "";

    function buildJsonTreeHtml(obj, prefix, depth) {
        prefix = prefix || "";
        depth = depth || 0;
        if (obj === null) return '<span class="jv">null</span>';
        if (typeof obj !== "object") {
            const s = typeof obj === "string" ? JSON.stringify(obj) : String(obj);
            return '<span class="jv">' + escapeHtml(s.substring(0, 80)) + '</span>';
        }
        if (Array.isArray(obj)) {
            if (!obj.length) return '<span class="jv">[]</span>';
            let html = "";
            obj.forEach((item, i) => {
                const path = prefix ? prefix + "[" + i + "]" : "[" + i + "]";
                html += '<div style="padding-left:' + (depth * 12) + 'px">';
                html += '<span class="jd">├</span> <span class="jk" data-path="' + escapeHtml(path) + '" data-val="' + escapeHtml(typeof item === "object" ? "" : String(item)) + '">[' + i + ']</span>: ';
                html += buildJsonTreeHtml(item, path, depth + 1);
                html += '</div>';
            });
            return html;
        }
        const keys = Object.keys(obj);
        if (!keys.length) return '<span class="jv">{}</span>';
        let html = "";
        keys.forEach(k => {
            const path = prefix ? prefix + "." + k : k;
            const v = obj[k];
            html += '<div style="padding-left:' + (depth * 12) + 'px">';
            html += '<span class="jd">├</span> <span class="jk" data-path="' + escapeHtml(path) + '" data-val="' + escapeHtml(v !== null && typeof v === "object" ? "" : String(v ?? "")) + '">' + escapeHtml(k) + '</span>: ';
            html += buildJsonTreeHtml(v, path, depth + 1);
            html += '</div>';
        });
        return html;
    }

    function showJsonExplorer(text) {
        const box = document.getElementById("jsonExplorerBox");
        const tree = document.getElementById("jsonTree");
        const hint = document.getElementById("jsonPathHint");
        if (!box || !tree) return;

        selectedJsonPath = "";
        selectedJsonValue = "";
        if (hint) hint.textContent = "";

        const t = (text || "").trim();
        if (!t) {
            box.style.display = "none";
            return;
        }
        try {
            const obj = JSON.parse(t);
            tree.innerHTML = buildJsonTreeHtml(obj);
            box.style.display = "block";

            tree.querySelectorAll(".jk").forEach(el => {
                el.addEventListener("click", () => {
                    selectedJsonPath = el.dataset.path || "";
                    selectedJsonValue = el.dataset.val || "";
                    if (hint) {
                        hint.innerHTML = 'Selected: <code style="color:#fbbf24">' + escapeHtml(selectedJsonPath) + '</code>' +
                            (selectedJsonValue ? ' = <span style="color:#94a3b8">' + escapeHtml(selectedJsonValue.substring(0, 60)) + '</span>' : "");
                    }
                    tree.querySelectorAll(".jk").forEach(x => x.style.background = "");
                    el.style.background = "#3b3b1a";
                });
            });
            log("JSON Explorer: keys parsed");
        } catch (e) {
            tree.innerHTML = '<span style="color:#f87171">Kein gültiges JSON: ' + escapeHtml(e.message) + '</span>';
            box.style.display = "block";
        }
    }

    document.getElementById("parseJsonBodyBtn")?.addEventListener("click", () => {
        const body = document.getElementById("testerBody")?.value || "";
        showJsonExplorer(body);
    });

    document.getElementById("jsonExplorerClose")?.addEventListener("click", () => {
        const box = document.getElementById("jsonExplorerBox");
        if (box) box.style.display = "none";
    });

    document.getElementById("jsonToPayload")?.addEventListener("click", () => {
        if (!selectedJsonPath) {
            log("Kein JSON-Key ausgewählt");
            return;
        }
        const leaf = selectedJsonPath.replace(/\[(\d+)\]/g, "").split(".").filter(Boolean).pop() || selectedJsonPath;
        if (customPayload) {
            customPayload.value = leaf + "=" + (selectedJsonValue || "1");
        }
        log("JSON → Payload: " + leaf);
    });

    document.getElementById("jsonToUrl")?.addEventListener("click", () => {
        if (!selectedJsonPath) {
            log("Kein JSON-Key ausgewählt");
            return;
        }
        const leaf = selectedJsonPath.replace(/\[(\d+)\]/g, "").split(".").filter(Boolean).pop() || selectedJsonPath;
        appendParamToUrl(leaf, selectedJsonValue || "1");
        log("JSON → URL: " + leaf);
    });

    document.getElementById("jsonCopyPath")?.addEventListener("click", () => {
        if (!selectedJsonPath) {
            log("Kein JSON-Key ausgewählt");
            return;
        }
        navigator.clipboard.writeText(selectedJsonPath);
        log("JSON-Path kopiert: " + selectedJsonPath);
    });

    document.getElementById("testerBody")?.addEventListener("blur", () => {
        const t = (document.getElementById("testerBody")?.value || "").trim();
        if ((t.startsWith("{") || t.startsWith("[")) && document.getElementById("jsonExplorerBox")?.style.display === "block") {
            showJsonExplorer(t);
        }
    });



    // ======================
    // THEME / COLOR SCHEME (Options tab)
    // ======================
    const THEME_KEY = "sqlibar_theme";
    const CUSTOM_KEY = "sqlibar_custom_accent";
    const THEMES = {
        neon: { name: "Neon Green", desc: "Default toxic", primary: "#00ff66", primaryHov: "#33ff85", primaryTxt: "#050a07", border: "#1a2f25", borderFocus: "#00ff66", textMuted: "#5a8e6e", textDim: "#375945", secondary: "#1a2f25", secondaryHov: "#254435", shadow: "0 0 10px rgba(0, 255, 102, 0.15)" },
        cyan: { name: "Cyber Cyan", desc: "Cool blue-green", primary: "#00e5ff", primaryHov: "#5ef0ff", primaryTxt: "#041016", border: "#1a2a32", borderFocus: "#00e5ff", textMuted: "#5a8a9e", textDim: "#375565", secondary: "#1a2a32", secondaryHov: "#253845", shadow: "0 0 10px rgba(0, 229, 255, 0.15)" },
        purple: { name: "Violet", desc: "Soft purple", primary: "#a855f7", primaryHov: "#c084fc", primaryTxt: "#0c0614", border: "#2a1f3a", borderFocus: "#a855f7", textMuted: "#8b7aa8", textDim: "#5c4d72", secondary: "#2a1f3a", secondaryHov: "#3a2d4f", shadow: "0 0 10px rgba(168, 85, 247, 0.18)" },
        orange: { name: "Amber", desc: "Warm warning", primary: "#f59e0b", primaryHov: "#fbbf24", primaryTxt: "#140c02", border: "#3a2e1a", borderFocus: "#f59e0b", textMuted: "#a08a5a", textDim: "#6b5a35", secondary: "#3a2e1a", secondaryHov: "#4a3c24", shadow: "0 0 10px rgba(245, 158, 11, 0.15)" },
        red: { name: "Hot Pink", desc: "Aggressive red", primary: "#ff0055", primaryHov: "#ff4d88", primaryTxt: "#140208", border: "#3a1a25", borderFocus: "#ff0055", textMuted: "#a05a72", textDim: "#6b3548", secondary: "#3a1a25", secondaryHov: "#4a2432", shadow: "0 0 10px rgba(255, 0, 85, 0.18)" },
        blue: { name: "Electric Blue", desc: "Classic blue", primary: "#3d8bfd", primaryHov: "#6eabff", primaryTxt: "#060a12", border: "#1a253a", borderFocus: "#3d8bfd", textMuted: "#5a7a9e", textDim: "#375065", secondary: "#1a253a", secondaryHov: "#253245", shadow: "0 0 10px rgba(61, 139, 253, 0.18)" },
        lime: { name: "Matrix Lime", desc: "Classic matrix", primary: "#b8ff00", primaryHov: "#d4ff5c", primaryTxt: "#0a1000", border: "#2a351a", borderFocus: "#b8ff00", textMuted: "#8a9e5a", textDim: "#5a6b35", secondary: "#2a351a", secondaryHov: "#384524", shadow: "0 0 10px rgba(184, 255, 0, 0.15)" },
        mono: { name: "Mono White", desc: "Minimal gray", primary: "#e0e0e0", primaryHov: "#ffffff", primaryTxt: "#0a0a0a", border: "#2a2a2a", borderFocus: "#e0e0e0", textMuted: "#888888", textDim: "#555555", secondary: "#2a2a2a", secondaryHov: "#3a3a3a", shadow: "0 0 10px rgba(224, 224, 224, 0.08)" }
    };

    function hexToRgb(hex) {
        const h = hex.replace("#", "");
        const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
        const n = parseInt(full, 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function applyThemeVars(t) {
        const root = document.documentElement;
        root.style.setProperty("--primary", t.primary);
        root.style.setProperty("--primary-hov", t.primaryHov);
        root.style.setProperty("--primary-txt", t.primaryTxt);
        root.style.setProperty("--border", t.border);
        root.style.setProperty("--border-focus", t.borderFocus);
        root.style.setProperty("--text-muted", t.textMuted);
        root.style.setProperty("--text-dim", t.textDim);
        root.style.setProperty("--secondary", t.secondary);
        root.style.setProperty("--secondary-hov", t.secondaryHov);
        root.style.setProperty("--success", t.primary);
        root.style.setProperty("--shadow", t.shadow);
    }

    function themeFromAccent(hex) {
        const { r, g, b } = hexToRgb(hex);
        const lighten = (n, a) => Math.min(255, Math.round(n + (255 - n) * a));
        const darken = (n, a) => Math.max(0, Math.round(n * (1 - a)));
        const toHex = (r, g, b) => "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
        const primaryHov = toHex(lighten(r, 0.25), lighten(g, 0.25), lighten(b, 0.25));
        const border = toHex(darken(r, 0.75), darken(g, 0.75), darken(b, 0.75));
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return {
            name: "Custom", desc: hex, primary: hex, primaryHov, primaryTxt: luminance > 0.55 ? "#0a0a0a" : "#f0f0f0",
            border, borderFocus: hex,
            textMuted: toHex(Math.round(r * 0.35 + 90), Math.round(g * 0.35 + 90), Math.round(b * 0.35 + 90)),
            textDim: toHex(Math.round(r * 0.2 + 50), Math.round(g * 0.2 + 50), Math.round(b * 0.2 + 50)),
            secondary: border, secondaryHov: toHex(darken(r, 0.65), darken(g, 0.65), darken(b, 0.65)),
            shadow: `0 0 10px rgba(${r}, ${g}, ${b}, 0.15)`
        };
    }

    function setActiveThemeCard(id) {
        document.querySelectorAll(".theme-card").forEach(c => c.classList.toggle("active", c.dataset.theme === id));
    }

    function applyTheme(id, customHex) {
        let t;
        if (id === "custom" && customHex) {
            t = themeFromAccent(customHex);
            try { localStorage.setItem(THEME_KEY, "custom"); localStorage.setItem(CUSTOM_KEY, customHex); } catch (e) {}
            const hexInput = document.getElementById("customAccentHex");
            const colorInput = document.getElementById("customAccent");
            if (hexInput) hexInput.value = customHex;
            if (colorInput) colorInput.value = customHex;
            setActiveThemeCard("custom");
        } else {
            t = THEMES[id] || THEMES.neon;
            try { localStorage.setItem(THEME_KEY, id); localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
            setActiveThemeCard(id);
            const colorInput = document.getElementById("customAccent");
            const hexInput = document.getElementById("customAccentHex");
            if (colorInput) colorInput.value = t.primary;
            if (hexInput) hexInput.value = t.primary;
        }
        applyThemeVars(t);
        log("Theme: " + (t.name || id));
    }

    function renderThemeGrid() {
        const grid = document.getElementById("themeGrid");
        if (!grid) return;
        let html = "";
        Object.keys(THEMES).forEach(id => {
            const t = THEMES[id];
            html += `<div class="theme-card" data-theme="${id}"><div class="swatch-row">
                <span class="swatch" style="background:${t.primary}"></span>
                <span class="swatch" style="background:${t.primaryHov}"></span>
                <span class="swatch" style="background:${t.border}"></span>
            </div><div class="theme-name">${t.name}</div><div class="theme-desc">${t.desc}</div></div>`;
        });
        html += `<div class="theme-card" data-theme="custom"><div class="swatch-row">
            <span class="swatch" style="background:conic-gradient(red,yellow,lime,aqua,blue,magenta,red)"></span>
        </div><div class="theme-name">Custom</div><div class="theme-desc">Color picker</div></div>`;
        grid.innerHTML = html;
        grid.querySelectorAll(".theme-card").forEach(card => {
            card.addEventListener("click", () => {
                const id = card.dataset.theme;
                if (id === "custom") applyTheme("custom", document.getElementById("customAccent")?.value || "#00ff66");
                else applyTheme(id);
            });
        });
    }

    document.getElementById("applyCustomAccent")?.addEventListener("click", () => {
        let hex = (document.getElementById("customAccentHex")?.value || "").trim();
        if (!/^#?[0-9a-fA-F]{3,6}$/.test(hex)) hex = document.getElementById("customAccent")?.value || "#00ff66";
        if (!hex.startsWith("#")) hex = "#" + hex;
        applyTheme("custom", hex);
    });
    document.getElementById("customAccent")?.addEventListener("input", (e) => {
        const hexInput = document.getElementById("customAccentHex");
        if (hexInput) hexInput.value = e.target.value;
    });
    document.getElementById("resetThemeBtn")?.addEventListener("click", () => applyTheme("neon"));

    renderThemeGrid();
    try {
        const saved = localStorage.getItem(THEME_KEY) || "neon";
        if (saved === "custom") applyTheme("custom", localStorage.getItem(CUSTOM_KEY) || "#00ff66");
        else applyTheme(saved);
    } catch (e) { applyTheme("neon"); }


});
