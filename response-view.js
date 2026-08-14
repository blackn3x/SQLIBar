/**
 * SQLiBar – Response view, syntax highlight, search & copy
 */
(function (global) {
    "use strict";

    let lastResponseBody = "";
    let lastResponseFullText = "";

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
    try { if (typeof analyzeSqliResponse === "function") analyzeSqliResponse(body || "", status, (body || "").length); } catch (e) { if (typeof logError === "function") logError(e, "SQLi analyze"); }
}


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



    function initResponseView() {
        // Re-bind elements if needed (scripts load at end of body, usually fine)
        document.getElementById("testerResponseSearch")?.addEventListener("input", () => {
            if (typeof testerFindMatches === "function") {
                testerFindMatches();
                if (typeof testerHighlightCurrent === "function") testerHighlightCurrent();
            }
        });
        document.getElementById("testerSearchCase")?.addEventListener("change", () => {
            if (typeof testerFindMatches === "function") {
                testerFindMatches();
                if (typeof testerHighlightCurrent === "function") testerHighlightCurrent();
            }
        });
        document.getElementById("testerSearchNext")?.addEventListener("click", () => {
            if (typeof testerSearchNext === "function") testerSearchNext();
            else if (typeof testerGotoMatch === "function") testerGotoMatch(1);
        });
        document.getElementById("testerSearchPrev")?.addEventListener("click", () => {
            if (typeof testerSearchPrev === "function") testerSearchPrev();
            else if (typeof testerGotoMatch === "function") testerGotoMatch(-1);
        });
        document.getElementById("copyResponseBtn")?.addEventListener("click", () => {
            const text = lastResponseFullText || (document.getElementById("testerResponse")?.textContent || "");
            navigator.clipboard.writeText(text).then(
                () => log("Response kopiert (" + text.length + " Zeichen)", "success"),
                (err) => logError(err, "Copy Response")
            );
        });
        document.getElementById("copyBodyBtn")?.addEventListener("click", () => {
            const text = lastResponseBody || "";
            navigator.clipboard.writeText(text).then(
                () => log("Body kopiert (" + text.length + " Zeichen)", "success"),
                (err) => logError(err, "Copy Body")
            );
        });
    }

    // Sync module-local lastResponse* with assignments inside renderResponseView
    // renderResponseView already assigns to lastResponseBody/FullText in outer scope of original;
    // here they are module-scoped — good.

    global.renderResponseView = renderResponseView;
    global.initResponseView = initResponseView;
    global.getLastResponseBody = () => lastResponseBody;
    global.getLastResponseFullText = () => lastResponseFullText;

})(typeof window !== "undefined" ? window : this);
