/**
 * SQLiBar – Tester tab: URL, payloads, headers, inject, cURL, encode UI
 */
(function (global) {
    "use strict";

    let lastPayload = "";
    let pendingOpenUrl = null;
    global.pendingOpenUrl = null;
    Object.defineProperty(global, "pendingOpenUrl", {
        get() { return pendingOpenUrl; },
        set(v) { pendingOpenUrl = v; }
    });

    let urlInput = null;
    let requestUrl = null;
    let customPayload = null;

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
                log("Cookie-Set fehlgeschlagen: " + (resp && resp.error || "?"), "error");
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
        // Fetch via background script → no panel CORS
        const resp = await new Promise((resolve) => {
            try {
                browser.runtime.sendMessage(
                    {
                        action: "fetchUrl",
                        url: currentUrl,
                        method,
                        headers,
                        body: (bodyText && method !== "GET" && method !== "HEAD") ? bodyText : undefined,
                        credentials: sendCookies ? "include" : "omit"
                    },
                    (r) => {
                        if (browser.runtime.lastError) {
                            resolve({ ok: false, error: browser.runtime.lastError.message });
                            return;
                        }
                        resolve(r || { ok: false, error: "Empty response from background" });
                    }
                );
            } catch (e) {
                resolve({ ok: false, error: String(e && e.message || e) });
            }
        });

        if (!resp || !resp.ok) {
            throw new Error((resp && resp.error) || "Fetch failed");
        }

        const text = resp.body || "";
        const ms = resp.ms || 0;
        const headerLines = resp.headers || [];

        renderResponseView(document.getElementById("testerResponse"), resp.status, resp.statusText, headerLines, text);
        if (typeof analyzeSqliResponse === "function") {
            analyzeSqliResponse(text, resp.status, text.length, ms);
        }

        if (sum) sum.textContent = `Page Response (${method} ${resp.status}) – ${text.length} Bytes · ${ms} ms`;
        log(`Open → ${method} ${resp.status} (${text.length} B, ${ms} ms)`);
    } catch (err) {
        if (tr) tr.innerHTML = `<span class="tok-err">Error: ${escapeHtml(String(err.message || err))}</span>`;
        if (sum) sum.textContent = "Page Response – Fehler";
        logError(err, "Open / Fetch");
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
    }).catch(err => logError(err, "cURL Copy"));
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







    function initTester() {
        urlInput = document.getElementById("urlInput");
        requestUrl = document.getElementById("requestUrl");
        customPayload = document.getElementById("customPayload");

        // Load current URL + headers
        try {
            browser.devtools.inspectedWindow.eval("window.location.href", (result, isException) => {
                if (isException) {
                    logError(isException.value || isException, "Load URL");
                    return;
                }
                if (result) {
                    if (urlInput) urlInput.value = result;
                    if (requestUrl) requestUrl.value = result;
                    log("URL geladen");
                }
            });
        } catch (err) {
            logError(err, "Load URL");
        }

        try {
            browser.devtools.inspectedWindow.eval(`JSON.stringify({
                ua: navigator.userAgent,
                cookie: document.cookie,
                ref: document.referrer
            })`, (result, isException) => {
                if (isException) {
                    logError(isException.value || isException, "Load headers");
                    return;
                }
                try {
                    const data = JSON.parse(result);
                    const headerText = "User-Agent: " + data.ua + "\nReferer: " + data.ref + "\nCookie: " + data.cookie;
                    const headersEl = document.getElementById("headers");
                    if (headersEl) headersEl.value = headerText;
                    const testerHeaders = document.getElementById("testerHeaders");
                    if (testerHeaders) testerHeaders.value = headerText;
                } catch (e) {
                    logError(e, "Parse headers");
                }
            });
        } catch (err) {
            logError(err, "Load headers");
        }

        urlInput?.addEventListener("input", () => {
            if (requestUrl) requestUrl.value = urlInput.value;
        });

        const categorySelect = document.getElementById("presetCategory");
        if (categorySelect && typeof fillPresetSelect === "function") {
            try {
                fillPresetSelect(categorySelect.value);
            } catch (e) {
                logError(e, "Presets");
            }
        }

        if (typeof updateEncodeButtons === "function") {
            try { updateEncodeButtons(); } catch (e) { logError(e, "Encode buttons"); }
        }
    }

    global.initTester = initTester;
    if (typeof applyPayload === "function") global.applyPayload = applyPayload;
    if (typeof buildCurlCommand === "function") global.buildCurlCommand = buildCurlCommand;

})(typeof window !== "undefined" ? window : this);
