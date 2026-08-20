/**
 * SQLiBar – panel entry point (orchestration only)
 * Modules: utils, sqli-detect, response-view, network, params, theme, tester
 * (+ external: i18n.js, encoder.js, presets.js)
 */
window.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // ======================
    // i18n
    // ======================
    if (typeof initI18n === "function") {
        try {
            initI18n();
        } catch (err) {
            if (typeof logError === "function") logError(err, "i18n");
            else console.error("[SQLiBar] i18n init failed", err);
        }
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
    // UPDATE CHECK (version from manifest)
    // ======================
    let ADDON_VERSION = "0.0.0";
    try {
        ADDON_VERSION = browser.runtime.getManifest()?.version || "0.0.0";
    } catch (err) {
        logError(err, "Manifest version");
    }
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
            logError(err, "Update check");
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
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            btn.classList.add("active");
            const target = document.getElementById(btn.dataset.tab);
            if (target) target.classList.add("active");
        });
    });

    document.getElementById("clearLog")?.addEventListener("click", () => {
        const box = document.getElementById("log");
        if (box) box.textContent = "";
    });

    // ======================
    // INIT MODULES (order matters for shared globals)
    // ======================
    const inits = [
        "initSqliDetect",
        "initResponseView",
        "initNetwork",
        "initParams",
        "initTheme",
        "initTester"
    ];

    for (const name of inits) {
        if (typeof globalThis[name] === "function") {
            try {
                globalThis[name]();
            } catch (err) {
                if (typeof logError === "function") logError(err, name);
                else console.error("[SQLiBar] " + name + " failed", err);
            }
        } else {
            console.warn("[SQLiBar] missing init:", name);
        }
    }

    log("SQLiBar panel ready (v" + ADDON_VERSION + ")", "success");
});


// ===================== WAF Bypass Transforms =====================

let lastPayloadBeforeWaf = "";

function populateWafTransforms() {
    const provider = document.getElementById("wafProvider")?.value;
    const sel = document.getElementById("wafTransform");
    if (!sel) return;
    sel.innerHTML = `<option value="">${t("waf.choose")}</option>`;
    if (!provider || !wafBypassTransforms[provider]) return;
    wafBypassTransforms[provider].forEach((tr, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = tr.name;
        if (tr.desc) opt.title = tr.desc;
        sel.appendChild(opt);
    });
}

function applyWafBypass() {
    const provider = document.getElementById("wafProvider")?.value;
    const idx = document.getElementById("wafTransform")?.value;
    const input = document.getElementById("customPayload");
    const status = document.getElementById("wafBypassStatus");
    if (!provider || idx === "" || !input) return;
    const original = input.value;
    if (!original.trim()) {
        if (status) status.textContent = t("waf.noPayload");
        return;
    }
    const list = wafBypassTransforms[provider];
    if (!list || !list[idx]) return;
    lastPayloadBeforeWaf = original;
    const transformed = list[idx].transform(original);
    input.value = transformed;
    if (status) {
        status.textContent = t("waf.applied", { name: list[idx].name });
        status.style.color = "#4ade80";
        setTimeout(() => { status.textContent = ""; }, 2500);
    }
}

function undoWafBypass() {
    const input = document.getElementById("customPayload");
    const status = document.getElementById("wafBypassStatus");
    if (!input || !lastPayloadBeforeWaf) {
        if (status) status.textContent = t("waf.nothingToUndo");
        return;
    }
    input.value = lastPayloadBeforeWaf;
    lastPayloadBeforeWaf = "";
    if (status) {
        status.textContent = t("waf.undone");
        status.style.color = "#fbbf24";
        setTimeout(() => { status.textContent = ""; }, 2000);
    }
}


// ---------- Cookie Editor ----------
const cookieListEl = document.getElementById('cookieList');
const cookieSerializeBox = document.getElementById('cookieSerializeBox');
const cookieSerializePreview = document.getElementById('cookieSerializePreview');
const cookieCountBadge = document.getElementById('cookieCountBadge');

/** Cookie-Zeile erzeugen */
function createCookieRow(name = '', value = '') {
    const row = document.createElement('div');
    row.className = 'param-row cookie-row';
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:4px';
    row.innerHTML = `
        <input type="text" class="cookie-name" placeholder="Name" value="${escapeHtml(name)}" style="width:120px;font-size:12px">
        <input type="text" class="cookie-value" placeholder="Value" value="${escapeHtml(value)}" style="flex:1;font-size:12px;font-family:ui-monospace,monospace">
        <button class="btn-secondary cookie-del" style="font-size:11px;padding:2px 6px" title="Löschen">✕</button>
    `;
    row.querySelector('.cookie-del').onclick = () => {
        row.remove();
        updateCookieBadge();
        checkSerializeDetection();
    };
    row.querySelector('.cookie-value').addEventListener('input', () => {
        checkSerializeDetection();
    });
    return row;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Aktuelle Cookies aus dem UI lesen */
function getCookiesFromUI() {
    const cookies = [];
    cookieListEl.querySelectorAll('.cookie-row').forEach(row => {
        const name = row.querySelector('.cookie-name').value.trim();
        const value = row.querySelector('.cookie-value').value;
        if (name) cookies.push({ name, value });
    });
    return cookies;
}

/** Cookie-Header korrekt serialisieren (RFC 6265 / Browser-Format) */
function serializeCookies(cookies) {
    return cookies
        .filter(c => c.name)
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
}

/** Cookie-Header parsen (robust) */
function parseCookieHeader(headerValue) {
    if (!headerValue) return [];
    // Cookie: name=value; name2=value2
    const raw = headerValue.replace(/^Cookie:\s*/i, '').trim();
    if (!raw) return [];
    return raw.split(';').map(part => {
        const idx = part.indexOf('=');
        if (idx === -1) return { name: part.trim(), value: '' };
        return {
            name: part.slice(0, idx).trim(),
            value: part.slice(idx + 1).trim()
        };
    }).filter(c => c.name);
}

/** Badge aktualisieren */
function updateCookieBadge() {
    const count = getCookiesFromUI().length;
    cookieCountBadge.textContent = count > 0 ? count : '';
    cookieCountBadge.dataset.sev = count > 0 ? 'med' : '';
}

/** PHP serialize() Erkennung (einfach & sicher) */
/** Base64 erkennen (auch URL-safe und mit Padding) */
function isLikelyBase64(str) {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim().replace(/\s+/g, '');
    // Mindestlänge + gültige Zeichen
    if (s.length < 8 || s.length % 4 === 1) return false;
    return /^[A-Za-z0-9+/_-]+={0,2}$/.test(s);
}

/** Sicher Base64 dekodieren (standard + URL-safe) */
function safeBase64Decode(str) {
    try {
        let s = str.trim().replace(/\s+/g, '');
        // URL-safe → standard
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        // Padding ergänzen
        while (s.length % 4) s += '=';
        const decoded = atob(s);
        // Nur wenn das Ergebnis sinnvoll aussieht (printable / serialize)
        return decoded;
    } catch {
        return null;
    }
}

/** PHP serialize erkennen (auch nach Base64-Decode) */
function looksLikePhpSerialize(str) {
    if (!str || typeof str !== 'string') return false;
    const t = str.trim();
    // Klassische Typen: a: O: s: i: b: d: N: r: R:
    return /^(a|O|s|i|b|d|N|r|R):\d+:/.test(t);
}
function analyzeCookieValue(value) {
    if (!value) return { isSerialize: false };

    // 1. Direkt serialize?
    if (looksLikePhpSerialize(value)) {
        return {
            isSerialize: true,
            isBase64: false,
            raw: value,
            decoded: null,
            serializeStr: value
        };
    }

    // 2. Base64 → serialize?
    if (isLikelyBase64(value)) {
        const decoded = safeBase64Decode(value);
        if (decoded && looksLikePhpSerialize(decoded)) {
            return {
                isSerialize: true,
                isBase64: true,
                raw: value,
                decoded,
                serializeStr: decoded
            };
        }

        // 3. Doppeltes Base64 (manchmal vorkommend)
        if (decoded && isLikelyBase64(decoded)) {
            const decoded2 = safeBase64Decode(decoded);
            if (decoded2 && looksLikePhpSerialize(decoded2)) {
                return {
                    isSerialize: true,
                    isBase64: true,
                    raw: value,
                    decoded: decoded2,
                    serializeStr: decoded2,
                    doubleBase64: true
                };
            }
        }
    }

    return { isSerialize: false };
}
function checkSerializeDetection() {
    if (!document.getElementById('cookieDetectSerialize')?.checked) {
        cookieSerializeBox.style.display = 'none';
        return;
    }

    const cookies = getCookiesFromUI();
    let found = null;
    let analysis = null;

    for (const c of cookies) {
        const a = analyzeCookieValue(c.value);
        if (a.isSerialize) {
            found = c;
            analysis = a;
            break;
        }
    }

    if (found && analysis) {
        cookieSerializeBox.style.display = 'block';
        cookieSerializeBox.dataset.cookieName = found.name;

        let info = `Cookie: ${found.name}\n`;
        if (analysis.isBase64) {
            info += analysis.doubleBase64
                ? `⚠ Base64 (doppelt) → serialize() erkannt\n\n`
                : `⚠ Base64 → serialize() erkannt\n\n`;
            info += `── Original (Base64) ──\n${analysis.raw}\n\n`;
            info += `── Dekodiert (serialize) ──\n${analysis.serializeStr}`;
        } else {
            info += `⚠ serialize() erkannt (raw)\n\n${analysis.serializeStr}`;
        }

        cookieSerializePreview.textContent = info;
    } else {
        cookieSerializeBox.style.display = 'none';
    }
}
// Base64 dekodieren und den Value ersetzen
document.getElementById('cookieDecodeBase64')?.addEventListener('click', () => {
    const name = cookieSerializeBox.dataset.cookieName;
    const row = [...cookieListEl.querySelectorAll('.cookie-row')]
        .find(r => r.querySelector('.cookie-name').value === name);
    if (!row) return;

    const valInput = row.querySelector('.cookie-value');
    const analysis = analyzeCookieValue(valInput.value);
    if (analysis.isSerialize && analysis.decoded) {
        valInput.value = analysis.serializeStr;   // jetzt raw serialize
        checkSerializeDetection();
    }
});

// serialize wieder als Base64 speichern
document.getElementById('cookieEncodeBase64')?.addEventListener('click', () => {
    const name = cookieSerializeBox.dataset.cookieName;
    const row = [...cookieListEl.querySelectorAll('.cookie-row')]
        .find(r => r.querySelector('.cookie-name').value === name);
    if (!row) return;

    const valInput = row.querySelector('.cookie-value');
    try {
        valInput.value = btoa(valInput.value);
        checkSerializeDetection();
    } catch (e) {
        alert('Base64-Encode fehlgeschlagen');
    }
});
/** Aus Header laden */
document.getElementById('cookieParseFromHeader')?.addEventListener('click', () => {
    const headers = document.getElementById('testerHeaders').value;
    const match = headers.match(/^Cookie:\s*(.+)$/im);
    const cookieStr = match ? match[1] : '';
    const parsed = parseCookieHeader(cookieStr);

    cookieListEl.innerHTML = '';
    if (parsed.length === 0) {
        cookieListEl.innerHTML = `<div class="param-empty" data-i18n="cookie.empty">Keine Cookies gefunden.</div>`;
    } else {
        parsed.forEach(c => cookieListEl.appendChild(createCookieRow(c.name, c.value)));
    }
    updateCookieBadge();
    checkSerializeDetection();
});

/** In Header schreiben (korrekt serialisiert) */
document.getElementById('cookieSerializeToHeader')?.addEventListener('click', () => {
    const cookies = getCookiesFromUI();
    const serialized = serializeCookies(cookies);
    const headersEl = document.getElementById('testerHeaders');
    let headers = headersEl.value;

    // Bestehenden Cookie-Header ersetzen oder hinzufügen
    if (/^Cookie:\s*.+$/im.test(headers)) {
        headers = headers.replace(/^Cookie:\s*.+$/im, `Cookie: ${serialized}`);
    } else {
        headers = headers.trim() + (headers.trim() ? '\n' : '') + `Cookie: ${serialized}`;
    }
    headersEl.value = headers;
    updateCookieBadge();
});

/** + Cookie */
document.getElementById('cookieAddRow')?.addEventListener('click', () => {
    // leeres Placeholder entfernen
    const empty = cookieListEl.querySelector('.param-empty');
    if (empty) empty.remove();
    cookieListEl.appendChild(createCookieRow());
    updateCookieBadge();
});

/** Leeren */
document.getElementById('cookieClear')?.addEventListener('click', () => {
    cookieListEl.innerHTML = `<div class="param-empty" data-i18n="cookie.empty">Keine Cookies.</div>`;
    cookieSerializeBox.style.display = 'none';
    updateCookieBadge();
});

/** Unserialize Preview (nur Anzeige, kein eval!) */
document.getElementById('cookieUnserialize')?.addEventListener('click', () => {
    const name = cookieSerializeBox.dataset.cookieName;
    const cookies = getCookiesFromUI();
    const c = cookies.find(x => x.name === name);
    if (!c) return;

    // Einfache visuelle Aufbereitung (kein echtes Unserialize aus Sicherheitsgründen)
    let preview = c.value;
    // Zeilenumbrüche für bessere Lesbarkeit bei langen serialize-Strings
    preview = preview
        .replace(/;/g, ';\n')
        .replace(/{/g, '{\n  ')
        .replace(/}/g, '\n}');
    cookieSerializePreview.textContent = `Cookie: ${name}\n--- Unserialize Preview (formatiert) ---\n${preview}`;
});

/** Wieder serialisieren (nur wenn der User den Value geändert hat) */
document.getElementById('cookieReserialize')?.addEventListener('click', () => {
    // Hier könntest du später eine echte serialize-Hilfe einbauen.
    // Aktuell: einfach Hinweis
    alert('Value manuell anpassen und dann „In Cookie-Header schreiben“ klicken.');
});

// Event Listener registrieren (nach DOM-Ready)
document.addEventListener("DOMContentLoaded", () => {
    const providerSel = document.getElementById("wafProvider");
    const applyBtn = document.getElementById("applyWafBypass");
    const undoBtn = document.getElementById("wafBypassUndo");

    if (providerSel) providerSel.addEventListener("change", populateWafTransforms);
    if (applyBtn) applyBtn.addEventListener("click", applyWafBypass);
    if (undoBtn) undoBtn.addEventListener("click", undoWafBypass);
});