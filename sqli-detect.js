/**
 * SQLiBar – SQLi detection, baselines, reflection & diff
 */
(function (global) {
    "use strict";

    let lastResponseMeta = { length: 0, body: "", status: 0, ms: 0 };
    let baselineLength = null;
    let baselineBody = null;
    let baselineTimeMs = null;
    try {
        const b = localStorage.getItem("sqli_baseline_len");
        if (b !== null) baselineLength = parseInt(b, 10);
        const tMs = localStorage.getItem("sqli_baseline_time");
        if (tMs !== null) baselineTimeMs = parseInt(tMs, 10);
        const bb = localStorage.getItem("sqli_baseline_body");
        if (bb !== null) baselineBody = bb;
    } catch (e) {}

    // Keep a live reference for other modules
    global.lastResponseMeta = lastResponseMeta;

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
    lastResponseMeta.length = len;
        lastResponseMeta.body = text;
        lastResponseMeta.status = status || 0;
        lastResponseMeta.ms = timing;
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

    // Sort: high → med → low
    const sevOrder = { high: 0, med: 1, low: 2 };
    hits.sort((a, b) => (sevOrder[a.sev] ?? 9) - (sevOrder[b.sev] ?? 9));

    // High-severity alert toast / popup
    const highHits = hits.filter(h => h.sev === "high");
    if (highHits.length && typeof showToast === "function") {
        const names = highHits.slice(0, 3).map(h => h.name).join(", ");
        const more = highHits.length > 3 ? " +" + (highHits.length - 3) : "";
        const title = (typeof t === "function" ? t("sqli.highAlert") : "⚠ HIGH SQLi indicator") +
            " (" + highHits.length + ")";
        showToast(title, "error", {
            detail: names + more,
            preview: highHits[0].match || "",
            ms: 9000
        });
    } else if (highHits.length && typeof log === "function") {
        log((typeof t === "function" ? t("sqli.highAlert") : "HIGH SQLi") + ": " +
            highHits.map(h => h.name).join(", "), "error");
    }

    let deltaHtml = "";
    if (baselineLength != null) {
        const delta = len - baselineLength;
        const sign = delta > 0 ? "+" : "";
        const color = delta === 0 ? "#888" : (Math.abs(delta) > 50 ? "#fbbf24" : "#aaa");
        deltaHtml = `<span style="color:${color}">Δ ${sign}${delta} B</span>`;
    } else {
        deltaHtml = `<span style="color:#666">${typeof t === "function" ? t("sqli.noLenBase") : "no len-base"}</span>`;
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



    // ── Boolean Blind Mini-Test ──────────────────────────────────────────
    function simpleHash(str) {
        let h = 0;
        const s = String(str || "");
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return (h >>> 0).toString(16);
    }

    function injectIntoUrl(url, expr) {
        try {
            const u = new URL(url);
            const keys = [...u.searchParams.keys()];
            if (keys.length) {
                const last = keys[keys.length - 1];
                u.searchParams.set(last, (u.searchParams.get(last) || "") + expr);
                return u.toString();
            }
        } catch (e) { /* fallthrough */ }
        const sep = url.includes("?") ? "&" : "?";
        return url + sep + "x=" + encodeURIComponent("1" + expr);
    }

    function injectIntoBody(body, expr) {
        if (!body) return "x=1" + expr;
        if (body.trim().startsWith("{")) {
            try {
                const obj = JSON.parse(body);
                if (obj && typeof obj === "object" && !Array.isArray(obj)) {
                    const keys = Object.keys(obj);
                    if (keys.length) {
                        const last = keys[keys.length - 1];
                        obj[last] = String(obj[last] ?? "") + expr;
                    } else {
                        obj.x = "1" + expr;
                    }
                    return JSON.stringify(obj);
                }
            } catch (e) { /* fallthrough */ }
        }
        const parts = body.split("&");
        if (parts.length && parts[0].includes("=")) {
            const last = parts[parts.length - 1];
            const eq = last.indexOf("=");
            if (eq >= 0) {
                parts[parts.length - 1] = last.slice(0, eq + 1) + last.slice(eq + 1) + expr;
                return parts.join("&");
            }
        }
        return body + expr;
    }

    function buildBoolVariants(trueExpr, falseExpr, mode) {
        const baseUrl = (document.getElementById("urlInput")?.value || "").trim();
        const baseBody = (document.getElementById("testerBody")?.value || "").trim();
        const method = (document.getElementById("testerMethod")?.value || "GET").toUpperCase();
        const payload = (document.getElementById("customPayload")?.value || "").trim();

        if (!baseUrl) return { error: "Keine URL vorhanden" };

        function applyPayloadMode(expr) {
            const pl = (payload || "1") + expr;
            try {
                const u = new URL(baseUrl);
                const keys = [...u.searchParams.keys()];
                if (keys.length) {
                    u.searchParams.set(keys[keys.length - 1], pl);
                    return { url: u.toString(), body: baseBody };
                }
                u.searchParams.set("id", pl);
                return { url: u.toString(), body: baseBody };
            } catch (e) {
                return {
                    url: baseUrl + (baseUrl.includes("?") ? "&" : "?") + "id=" + encodeURIComponent(pl),
                    body: baseBody
                };
            }
        }

        let trueUrl, falseUrl, trueBody, falseBody;

        if (mode === "payload") {
            const t = applyPayloadMode(trueExpr);
            const f = applyPayloadMode(falseExpr);
            trueUrl = t.url; falseUrl = f.url;
            trueBody = t.body; falseBody = f.body;
        } else if (mode === "append") {
            trueUrl = baseUrl + trueExpr;
            falseUrl = baseUrl + falseExpr;
            trueBody = baseBody;
            falseBody = baseBody;
        } else {
            trueUrl = injectIntoUrl(baseUrl, trueExpr);
            falseUrl = injectIntoUrl(baseUrl, falseExpr);
            if (method !== "GET" && method !== "HEAD" && baseBody) {
                trueBody = injectIntoBody(baseBody, trueExpr);
                falseBody = injectIntoBody(baseBody, falseExpr);
            } else {
                trueBody = baseBody;
                falseBody = baseBody;
            }
        }

        return { trueUrl, falseUrl, trueBody, falseBody, method, baseUrl };
    }

    function fetchOnce(url, method, body) {
        const sendHeaders = document.getElementById("optSendHeaders")?.checked ?? true;
        const sendCookies = document.getElementById("optSendCookies")?.checked ?? true;
        const headerText = document.getElementById("testerHeaders")?.value || "";
        const forceJson = document.getElementById("optBodyJson")?.checked ?? false;
        const forceForm = document.getElementById("optBodyForm")?.checked ?? false;

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
        const hasCT = Object.keys(headers).some(k => k.toLowerCase() === "content-type");
        if (body && !hasCT && method !== "GET" && method !== "HEAD") {
            if (forceJson || body.trim().startsWith("{") || body.trim().startsWith("[")) {
                headers["Content-Type"] = "application/json";
            } else {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }

        return new Promise((resolve) => {
            try {
                browser.runtime.sendMessage(
                    {
                        action: "fetchUrl",
                        url,
                        method,
                        headers,
                        body: (body && method !== "GET" && method !== "HEAD") ? body : undefined,
                        credentials: sendCookies ? "include" : "omit"
                    },
                    (r) => {
                        if (browser.runtime.lastError) {
                            resolve({ ok: false, error: browser.runtime.lastError.message });
                            return;
                        }
                        resolve(r || { ok: false, error: "Empty response" });
                    }
                );
            } catch (e) {
                resolve({ ok: false, error: String(e && e.message || e) });
            }
        });
    }

    function renderBoolResult(trueRes, falseRes, meta) {
        const box = document.getElementById("boolTestResult");
        if (!box) return;

        const tLen = (trueRes.body || "").length;
        const fLen = (falseRes.body || "").length;
        const tMs = trueRes.ms || 0;
        const fMs = falseRes.ms || 0;
        const tSt = trueRes.status || "-";
        const fSt = falseRes.status || "-";
        const tHash = simpleHash(trueRes.body || "");
        const fHash = simpleHash(falseRes.body || "");

        const lenDiff = tLen - fLen;
        const timeDiff = tMs - fMs;
        const statusDiff = String(tSt) !== String(fSt);
        const bodyDiff = tHash !== fHash;
        const significantLen = Math.abs(lenDiff) >= 20;
        const significantTime = Math.abs(timeDiff) >= 400;
        const likely = significantLen || statusDiff || significantTime || (bodyDiff && Math.abs(lenDiff) >= 5);

        let verdictColor = likely ? "#fbbf24" : "#4ade80";
        let verdictText = likely
            ? (typeof t === "function" ? t("sqli.boolLikely") : "Unterschied erkannt → Boolean-Blind möglich")
            : (typeof t === "function" ? t("sqli.boolSame") : "True ≈ False → kein klarer Boolean-Unterschied");

        if (!trueRes.ok || !falseRes.ok) {
            verdictColor = "#f87171";
            verdictText = "Request fehlgeschlagen: " +
                (!trueRes.ok ? ("True: " + (trueRes.error || "?")) : "") +
                (!falseRes.ok ? (" False: " + (falseRes.error || "?")) : "");
        }

        box.innerHTML =
            `<div style="padding:8px 10px;border:1px solid var(--border,#1a2f25);border-radius:6px;background:var(--bg-input,#0d1510)">` +
            `<div style="font-size:12px;margin-bottom:6px;color:${verdictColor};font-weight:600">${escapeHtml(verdictText)}</div>` +
            `<div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:4px 12px;font-size:11px;font-family:ui-monospace,monospace">` +
            `<span style="color:#888"></span><span style="color:#4ade80">TRUE</span><span style="color:#f87171">FALSE</span>` +
            `<span style="color:#888">Status</span><span>${escapeHtml(String(tSt))}${statusDiff ? ' <b style="color:#fbbf24">≠</b>' : ""}</span><span>${escapeHtml(String(fSt))}</span>` +
            `<span style="color:#888">Length</span><span>${tLen} B${significantLen ? ` <b style="color:#fbbf24">Δ${lenDiff > 0 ? "+" : ""}${lenDiff}</b>` : ""}</span><span>${fLen} B</span>` +
            `<span style="color:#888">Time</span><span>${tMs} ms${significantTime ? ` <b style="color:#fbbf24">Δ${timeDiff > 0 ? "+" : ""}${timeDiff}</b>` : ""}</span><span>${fMs} ms</span>` +
            `<span style="color:#888">Body</span><span style="color:#888">${bodyDiff ? "!=" : "=="} #${tHash.slice(0, 6)}</span><span style="color:#888">#${fHash.slice(0, 6)}</span>` +
            `</div>` +
            `<div style="margin-top:6px;font-size:10px;color:#666;word-break:break-all">` +
            `T: ${escapeHtml((meta.trueUrl || "").substring(0, 140))}${(meta.trueUrl || "").length > 140 ? "…" : ""}<br>` +
            `F: ${escapeHtml((meta.falseUrl || "").substring(0, 140))}${(meta.falseUrl || "").length > 140 ? "…" : ""}` +
            `</div></div>`;
        box.style.display = "block";
    }

    async function runBooleanTest() {
        const trueExpr = (document.getElementById("boolTrueExpr")?.value || " AND 1=1-- -").trim();
        const falseExpr = (document.getElementById("boolFalseExpr")?.value || " AND 1=2-- -").trim();
        const mode = document.getElementById("boolInjectMode")?.value || "lastparam";
        const btn = document.getElementById("boolTestBtn");
        const box = document.getElementById("boolTestResult");

        const variants = buildBoolVariants(trueExpr, falseExpr, mode);
        if (variants.error) {
            log(variants.error, "warn");
            return;
        }

        if (btn) {
            btn.disabled = true;
            btn.textContent = "…";
        }
        if (box) {
            box.style.display = "block";
            box.innerHTML = `<div style="color:#888;font-size:12px">Boolean-Test läuft… True → False</div>`;
        }

        log("Boolean-Test: True vs False (" + mode + ")");

        try {
            const trueRes = await fetchOnce(variants.trueUrl, variants.method, variants.trueBody);
            const falseRes = await fetchOnce(variants.falseUrl, variants.method, variants.falseBody);

            renderBoolResult(trueRes, falseRes, {
                trueExpr,
                falseExpr,
                trueUrl: variants.trueUrl,
                falseUrl: variants.falseUrl
            });

            if (trueRes.ok && trueRes.body != null) {
                analyzeSqliResponse(trueRes.body, trueRes.status, (trueRes.body || "").length, trueRes.ms || 0);
                if (typeof renderResponseView === "function") {
                    renderResponseView(
                        document.getElementById("testerResponse"),
                        trueRes.status,
                        trueRes.statusText || "",
                        trueRes.headers || [],
                        trueRes.body || ""
                    );
                }
            }

            const tLen = (trueRes.body || "").length;
            const fLen = (falseRes.body || "").length;
            const interesting = Math.abs(tLen - fLen) >= 20 || String(trueRes.status) !== String(falseRes.status);
            log(
                "Boolean-Test fertig: True " + (trueRes.status || "?") + "/" + tLen + "B vs False " + (falseRes.status || "?") + "/" + fLen + "B",
                interesting ? "warn" : "success"
            );
        } catch (err) {
            logError(err, "Boolean-Test");
            if (box) box.innerHTML = `<div style="color:#f87171">Fehler: ${escapeHtml(String(err.message || err))}</div>`;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = typeof t === "function" ? t("sqli.boolRun") : "True vs False ▶";
            }
        }
    }

    function initSqliDetect() {
        updateBaselineInfo();

        document.getElementById("setBaselineBtn")?.addEventListener("click", () => {
            if (!lastResponseMeta.length && !lastResponseMeta.body) {
                log(typeof t === "function" ? t("log.noResponseBaseline") : "Keine Response für Baseline", "warn");
                return;
            }
            baselineLength = lastResponseMeta.length;
            baselineBody = lastResponseMeta.body || "";
            try {
                localStorage.setItem("sqli_baseline_len", String(baselineLength));
                localStorage.setItem("sqli_baseline_body", baselineBody);
            } catch (e) { logError(e, "Baseline save"); }
            updateBaselineInfo();
            analyzeSqliResponse(lastResponseMeta.body, lastResponseMeta.status, lastResponseMeta.length, lastResponseMeta.ms);
            log("Length/Body Baseline gesetzt: " + baselineLength + " Bytes", "success");
        });

        document.getElementById("setTimeBaselineBtn")?.addEventListener("click", () => {
            if (!lastResponseMeta.ms) {
                log("Keine Time-Messung – zuerst Request senden", "warn");
                return;
            }
            baselineTimeMs = lastResponseMeta.ms;
            try { localStorage.setItem("sqli_baseline_time", String(baselineTimeMs)); } catch (e) { logError(e, "Time baseline"); }
            updateBaselineInfo();
            analyzeSqliResponse(lastResponseMeta.body, lastResponseMeta.status, lastResponseMeta.length, lastResponseMeta.ms);
            log("Time Baseline gesetzt: " + baselineTimeMs + " ms", "success");
        });

        document.getElementById("clearBaselineBtn")?.addEventListener("click", () => {
            baselineLength = null;
            baselineBody = null;
            baselineTimeMs = null;
            try {
                localStorage.removeItem("sqli_baseline_len");
                localStorage.removeItem("sqli_baseline_body");
                localStorage.removeItem("sqli_baseline_time");
            } catch (e) { logError(e, "Clear baselines"); }
            updateBaselineInfo();
            const rb = document.getElementById("reflectionBox");
            const db = document.getElementById("diffBox");
            const bb = document.getElementById("boolTestResult");
            if (rb) rb.style.display = "none";
            if (db) db.style.display = "none";
            if (bb) bb.style.display = "none";
            log("Alle Baselines gelöscht");
        });

        document.getElementById("boolTestBtn")?.addEventListener("click", () => {
            runBooleanTest();
        });
    }

    global.analyzeSqliResponse = analyzeSqliResponse;
    global.updateBaselineInfo = updateBaselineInfo;
    global.initSqliDetect = initSqliDetect;
    global.getPayloadNeedles = getPayloadNeedles;
    global.renderReflection = renderReflection;
    global.renderDiff = renderDiff;
    global.runBooleanTest = runBooleanTest;

})(typeof window !== "undefined" ? window : this);
