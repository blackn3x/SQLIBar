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
            '<button class="btn-secondary param-to-url" data-idx="' + i + '" title="' + (typeof t === "function" ? t("log.paramToUrl") : "Param → URL") + '">URL</button>' +
            '<button class="btn-secondary param-to-body" data-idx="' + i + '" title="' + (typeof t === "function" ? t("log.paramToBody") : "Param → Body") + '">Body</button>' +
            '<button class="btn-secondary param-to-payload" data-idx="' + i + '" title="' + (typeof t === "function" ? t("log.paramToPayload") : "Param → Payload") + '">PL</button>' +
        '</div>';
    }).join("");

    box.querySelectorAll(".param-to-url").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const p = pageParams[parseInt(btn.dataset.idx, 10)];
            if (!p) return;
            appendParamToUrl(p.name, p.value || "1");
            log((typeof t === "function" ? t("log.paramToUrl") : "Param → URL:") + " " + p.name);
        });
    });
    box.querySelectorAll(".param-to-body").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const p = pageParams[parseInt(btn.dataset.idx, 10)];
            if (!p) return;
            appendParamToBody(p.name, p.value || "1");
            log((typeof t === "function" ? t("log.paramToBody") : "Param → Body:") + " " + p.name);
        });
    });
    box.querySelectorAll(".param-to-payload").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const p = pageParams[parseInt(btn.dataset.idx, 10)];
            if (!p) return;
            if (customPayload) customPayload.value = p.name + "=" + (p.value || "");
            log((typeof t === "function" ? t("log.paramToPayload") : "Param → Payload:") + " " + p.name);
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
            log((typeof t === "function" ? t("log.pageScanFailed") : "Page-Scan fehlgeschlagen:") + " " + (isException && isException.value ? isException.value : "unbekannt"));
            return;
        }
        try {
            pageParams = JSON.parse(result) || [];
            const order = { hidden: 0, form: 1, query: 2, link: 3, cookie: 4 };
            pageParams.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.name.localeCompare(b.name));
            renderPageParamList();
            log(typeof t === "function" ? t("log.pageScanDone") : "Page-Scan fertig", "success", {
                detail: pageParams.length + " " + (typeof t === "function" ? t("log.paramsFound") : "Parameter gefunden"),
                preview: pageParams.slice(0, 8).map(p => p.name).join(", ") + (pageParams.length > 8 ? "…" : "")
            });
        } catch (e) {
            log((typeof t === "function" ? t("log.pageScanParseError") : "Page-Scan Parse-Fehler:") + " " + e.message);
        }
    });
});

document.getElementById("clearPageParams")?.addEventListener("click", () => {
    pageParams = [];
    renderPageParamList();
    log(typeof t === "function" ? t("log.pageParamsCleared") : "Page-Parameter geleert");
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
            log((typeof t === "function" ? t("log.netParamToUrl") : "Net-Param → URL:") + " " + btn.dataset.name);
        });
    });
    box.querySelectorAll(".netp-body").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            appendParamToBody(btn.dataset.name, btn.dataset.val || "1");
            log((typeof t === "function" ? t("log.netParamToBody") : "Net-Param → Body:") + " " + btn.dataset.name);
        });
    });
    box.querySelectorAll(".netp-pl").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (customPayload) customPayload.value = btn.dataset.name + "=" + (btn.dataset.val || "");
            log((typeof t === "function" ? t("log.netParamToPayload") : "Net-Param → Payload:") + " " + btn.dataset.name);
        });
    });
    // Klick auf Source → zum Request springen
    box.querySelectorAll(".netp-goto").forEach(el => {
        el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const rid = parseInt(el.dataset.rid, 10);
            if (!rid) return;
            const idx = networkEntries.findIndex(e => e._id === rid);
            if (idx < 0) {
                log(typeof t === "function" ? t("log.requestNotInList") : "Request nicht mehr in Liste");
                return;
            }
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
    log(typeof t === "function" ? t("log.netParamsCleared") : "Network-Parameter geleert");
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
        // Badge only after looksLikeBase64 is defined (hoisted function decl)
        let badge = "";
        try {
            if (typeof obj === "string" && typeof looksLikeBase64 === "function" && looksLikeBase64(obj)) {
                const isJson = typeof tryParseBase64Json === "function" && tryParseBase64Json(obj);
                badge = isJson
                    ? ' <span style="color:#a78bfa;font-size:10px" title="Base64-JSON erkannt → innere Values werden einzeln getestet">[b64-json]</span>'
                    : ' <span style="color:#38bdf8;font-size:10px" title="Base64 erkannt → decode/append/encode beim Test">[b64]</span>';
            }
        } catch (_) {}
        return '<span class="jv">' + escapeHtml(s.substring(0, 80)) + '</span>' + badge;
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
        log(typeof t === "function" ? t("log.jsonExplorer") : "JSON Explorer: keys parsed");
    } catch (e) {
        tree.innerHTML = '<span style="color:#f87171">' + (typeof t === "function" ? t("jsontest.noJson") : "Kein gültiges JSON") + ": " + escapeHtml(e.message) + '</span>';
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
        log(typeof t === "function" ? t("log.noJsonKey") : "Kein JSON-Key ausgewählt");
        return;
    }
    const leaf = selectedJsonPath.replace(/\[(\d+)\]/g, "").split(".").filter(Boolean).pop() || selectedJsonPath;
    if (customPayload) {
        customPayload.value = leaf + "=" + (selectedJsonValue || "1");
    }
    log((typeof t === "function" ? t("log.jsonToPayload") : "JSON → Payload:") + " " + leaf);
});

document.getElementById("jsonToUrl")?.addEventListener("click", () => {
    if (!selectedJsonPath) {
        log(typeof t === "function" ? t("log.noJsonKey") : "Kein JSON-Key ausgewählt");
        return;
    }
    const leaf = selectedJsonPath.replace(/\[(\d+)\]/g, "").split(".").filter(Boolean).pop() || selectedJsonPath;
    appendParamToUrl(leaf, selectedJsonValue || "1");
    log((typeof t === "function" ? t("log.jsonToUrl") : "JSON → URL:") + " " + leaf);
});

document.getElementById("jsonCopyPath")?.addEventListener("click", () => {
    if (!selectedJsonPath) {
        log(typeof t === "function" ? t("log.noJsonKey") : "Kein JSON-Key ausgewählt", "warn");
        return;
    }
    if (typeof copyWithToast === "function") {
        copyWithToast(selectedJsonPath, typeof t === "function" ? t("log.jsonPathCopied") : "JSON-Path kopiert");
    } else {
        navigator.clipboard.writeText(selectedJsonPath);
        log(typeof t === "function" ? t("log.jsonPathCopied") : "JSON-Path kopiert", "success", { preview: selectedJsonPath });
    }
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
    { name: "OR 1=1", payload: "' OR 1=1-- -" },
    { name: "AND SLEEP(5)", payload: "' AND SLEEP(5)-- -" },
    { name: "ExtractValue", payload: "' AND EXTRACTVALUE(1,CONCAT(0x7e,@@version))-- -" },
    { name: "UpdateXML", payload: "' AND UPDATEXML(1,CONCAT(0x7e,@@version),1)-- -" },
    { name: "CONVERT MSSQL", payload: "' AND 1=CONVERT(int,@@version)-- -" },
];

let jsonTestAbort = false;

/**
 * Try to decode a string as Base64 and parse the result as JSON.
 * Returns { decoded, json, urlSafe } or null if not Base64-JSON.
 */
function tryParseBase64Json(str) {
    if (typeof str !== "string" || !looksLikeBase64(str)) return null;
    try {
        const decoded = tryDecodeBase64(str);
        const trimmed = decoded.trim();
        if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
        const json = JSON.parse(trimmed);
        const urlSafe = /[-_]/.test(str) && !/[+/]/.test(str);
        return { decoded, json, urlSafe };
    } catch (e) {
        return null;
    }
}

/** Collect leaf (or all scalar) paths from a JSON value.
 *  Base64-encoded JSON values are expanded into virtual sub-paths:
 *    outerKey@b64:inner.path
 *    outer@b64:mid@b64:inner.path   (nested Base64-JSON, up to depth 5)
 *  so every inner value is tested individually.
 */
function collectJsonLeafPaths(obj, prefix, leafOnly, out, b64Depth) {
    out = out || [];
    b64Depth = b64Depth || 0;
    if (obj === null || obj === undefined) {
        if (prefix) out.push({ path: prefix, value: obj, type: "null" });
        return out;
    }
    const ty = typeof obj;
    if (ty !== "object") {
        // Expand Base64 that holds JSON → test each inner value (nested supported)
        if (typeof obj === "string" && b64Depth < 5) {
            const b64j = tryParseBase64Json(obj);
            if (b64j) {
                const innerLeaves = collectJsonLeafPaths(b64j.json, "", leafOnly, [], b64Depth + 1);
                if (innerLeaves.length) {
                    innerLeaves.forEach((il) => {
                        out.push({
                            path: (prefix || "") + "@b64:" + il.path,
                            value: il.value,
                            type: il.type,
                            isBase64Json: true,
                            outerPath: prefix || "",
                            innerPath: il.path,
                            originalB64: obj,
                            b64Depth: b64Depth + 1
                        });
                    });
                    return out;
                }
            }
        }
        if (prefix) out.push({ path: prefix, value: obj, type: ty });
        return out;
    }
    if (Array.isArray(obj)) {
        if (!obj.length && prefix && !leafOnly) {
            out.push({ path: prefix, value: [], type: "array" });
        }
        obj.forEach((item, i) => {
            const p = prefix ? prefix + "[" + i + "]" : "[" + i + "]";
            collectJsonLeafPaths(item, p, leafOnly, out, b64Depth);
        });
        return out;
    }
    const keys = Object.keys(obj);
    if (!keys.length && prefix && !leafOnly) {
        out.push({ path: prefix, value: {}, type: "object" });
    }
    keys.forEach((k) => {
        const p = prefix ? prefix + "." + k : k;
        collectJsonLeafPaths(obj[k], p, leafOnly, out, b64Depth);
    });
    return out;
}

/**
 * Heuristic Base64 detection (classic + URL-safe).
 * Requires successful atob and mostly printable result.
 */
function looksLikeBase64(str) {
    if (typeof str !== "string") return false;
    const s = str.trim();

    // Too short → almost always false positive (tokens, ids, words)
    if (s.length < 16) return false;

    // Strict alphabet (classic or URL-safe) + optional padding
    if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(s)) return false;

    // Reject pure hex / pure digits (UUIDs without dashes, hashes, numeric ids)
    if (/^[0-9]+$/.test(s)) return false;
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) return false;

    // Must look "encoded": mix of case OR has +/ OR has padding OR has -_
    const hasUpper = /[A-Z]/.test(s);
    const hasLower = /[a-z]/.test(s);
    const hasPlusSlash = /[+/]/.test(s);
    const hasUrlSafe = /[-_]/.test(s);
    const hasPad = /=/.test(s);
    if (!(hasPad || hasPlusSlash || hasUrlSafe || (hasUpper && hasLower))) {
        return false;
    }

    // Length must be valid for Base64 (mod 4), allowing missing pad
    const bare = s.replace(/=+$/, "");
    if (bare.length % 4 === 1) return false; // impossible
    const padLen = (4 - (bare.length % 4)) % 4;
    if (padLen === 3) return false;
    // If padding is present, it must be exact
    if (hasPad) {
        const m = s.match(/=+$/);
        if (!m || m[0].length !== padLen) return false;
        if (s.length % 4 !== 0) return false;
    }

    try {
        const padded = bare.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
        const decoded = atob(padded);
        if (!decoded || decoded.length < 4) return false;

        // Round-trip: re-encode should match (canonical check) – strongest filter
        let round = btoa(decoded);
        if (hasUrlSafe && !hasPlusSlash) {
            round = round.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            const bareRound = round;
            const bareOrig = bare;
            if (bareRound !== bareOrig) return false;
        } else {
            // compare without forcing pad on original
            const normOrig = bare.replace(/-/g, "+").replace(/_/g, "/");
            const normRound = round.replace(/=+$/, "");
            if (normRound !== normOrig) return false;
        }

        // Decoded should be mostly printable text (not random binary)
        let printable = 0;
        for (let i = 0; i < decoded.length; i++) {
            const c = decoded.charCodeAt(i);
            if ((c >= 32 && c <= 126) || c === 9 || c === 10 || c === 13) printable++;
        }
        if ((printable / decoded.length) < 0.75) return false;

        // Reject if decoded is still only hex-like short noise
        if (/^[0-9a-fA-F\s-]+$/.test(decoded) && decoded.replace(/\s/g, "").length < 12) {
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

function tryDecodeBase64(str) {
    const s = String(str).trim();
    const padLen = (4 - (s.length % 4)) % 4;
    const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
    return atob(padded);
}

function encodeBase64(str, urlSafe) {
    const b64 = btoa(String(str));
    if (urlSafe) return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return b64;
}

/**
 * Inject payload into ONE scalar value only (never into key names).
 * - Normal string/number: value + payload
 * - Plain Base64 (not JSON): decode → append → re-encode (preserves URL-safe)
 * - Base64 of JSON: should be handled via setJsonPathValue with @b64: paths
 * Returns { value, encoding }  encoding = "base64"|"base64url"|null
 */
function injectIntoValue(oldVal, payload) {
    const old = oldVal == null ? "" : String(oldVal);
    const pl = String(payload);

    // Plain Base64 (string that is NOT valid JSON after decode)
    if (looksLikeBase64(old)) {
        const b64j = tryParseBase64Json(old);
        if (!b64j) {
            // pure Base64 string (not JSON) → classic decode/append/re-encode
            try {
                const decoded = tryDecodeBase64(old);
                const injected = decoded + pl;
                const urlSafe = /[-_]/.test(old) && !/[+/]/.test(old);
                return {
                    value: encodeBase64(injected, urlSafe),
                    encoding: urlSafe ? "base64url" : "base64"
                };
            } catch (e) { /* fall through */ }
        }
        // Base64-JSON is intentionally NOT appended here – handled by expanded paths
    }
    return { value: old + pl, encoding: null };
}

/**
 * Inject payload into a value at an inner path of a (possibly nested) object.
 * Used for Base64-JSON expansion.
 */
function injectIntoJsonValue(obj, path, payload) {
    if (!path) {
        // inject into all leaves (fallback)
        return injectAllLeaves(obj, payload);
    }
    const tokens = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
        if (m[1] !== undefined) tokens.push(m[1]);
        else tokens.push(parseInt(m[2], 10));
    }
    if (!tokens.length) return { obj, newValue: null };

    const clone = JSON.parse(JSON.stringify(obj));
    let cur = clone;
    for (let i = 0; i < tokens.length - 1; i++) {
        const tok = tokens[i];
        if (cur == null || typeof cur !== "object") return { obj: clone, newValue: null };
        cur = cur[tok];
    }
    const last = tokens[tokens.length - 1];
    let newValue = null;
    if (cur != null && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, last)) {
        const old = cur[last];
        if (typeof old === "string" || typeof old === "number") {
            cur[last] = String(old) + String(payload);
            newValue = cur[last];
        }
    }
    return { obj: clone, newValue };
}

/** Append payload to every string/number leaf (used by applyPayloadToJsonBody etc.).
 *  Base64-JSON values (nested up to depth 5) are decoded → inject into inner leaves → re-encoded.
 */
function injectAllLeaves(obj, payload, b64Depth) {
    b64Depth = b64Depth || 0;
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            if (obj[i] !== null && typeof obj[i] === "object") {
                injectAllLeaves(obj[i], payload, b64Depth);
            } else if (typeof obj[i] === "string" || typeof obj[i] === "number") {
                // Expand nested Base64-JSON inside array elements too
                const b64j = (typeof obj[i] === "string" && b64Depth < 5) ? tryParseBase64Json(obj[i]) : null;
                if (b64j) {
                    const inner = injectAllLeaves(JSON.parse(JSON.stringify(b64j.json)), payload, b64Depth + 1);
                    obj[i] = encodeBase64(JSON.stringify(inner), b64j.urlSafe);
                } else {
                    obj[i] = String(obj[i]) + String(payload);
                }
            }
        }
        return obj;
    }
    Object.keys(obj).forEach((k) => {
        const v = obj[k];
        if (v !== null && typeof v === "object") {
            injectAllLeaves(v, payload, b64Depth);
        } else if (typeof v === "string" || typeof v === "number") {
            // If this leaf is Base64-JSON → inject into its inner values (recursive for nested b64)
            const b64j = (typeof v === "string" && b64Depth < 5) ? tryParseBase64Json(v) : null;
            if (b64j) {
                const inner = injectAllLeaves(JSON.parse(JSON.stringify(b64j.json)), payload, b64Depth + 1);
                obj[k] = encodeBase64(JSON.stringify(inner), b64j.urlSafe);
            } else {
                obj[k] = String(v) + String(payload);
            }
        }
    });
    return obj;
}

/**
 * Deep-clone root and modify ONLY the value at `path`.
 * Keys are never renamed or touched.
 *
 * Supports expanded Base64-JSON paths (including NESTED Base64-JSON):
 *   "data@b64:search.term"
 *     → decode data, inject into search.term, re-encode
 *   "data@b64:payload@b64:search.term"
 *     → decode data → get JSON → decode payload → inject into search.term
 *       → re-encode inner → re-encode outer
 *
 * Returns { obj, encoding, newValue }.
 *
 * Example:
 *   root = {"search":{"term":"Laptop","scope":"name"}}
 *   path = "search.term", payload = "'"
 *   → {"search":{"term":"Laptop'","scope":"name"}}
 *
 * Base64 example:
 *   root = {"payload":"eyJzZWFyY2giOnsidGVybSI6IkxhcHRvcCIsInNjb3BlIjoibmFtZSJ9fQ=="}
 *   path = "payload@b64:search.term", payload = "'"
 *   → {"payload":"<base64 of {\"search\":{\"term\":\"Laptop'\",\"scope\":\"name\"}}>"}
 *
 * Nested Base64-JSON example:
 *   root = {"wrap":"<b64 of {\"inner\":\"<b64 of {\\\"q\\\":\\\"x\\\"}>\"}>"}
 *   path = "wrap@b64:inner@b64:q", payload = "'"
 *   → decode wrap → decode inner → q becomes "x'" → re-encode both layers
 */
function setJsonPathValue(root, path, payload, b64Depth) {
    b64Depth = b64Depth || 0;
    const clone = JSON.parse(JSON.stringify(root));
    if (!path) return { obj: clone, encoding: null, newValue: null };

    // Handle expanded Base64-JSON path: outer@b64:rest
    // rest may itself contain @b64: for nested Base64-JSON (handled recursively, max depth 5)
    const b64Idx = path.indexOf("@b64:");
    if (b64Idx !== -1 && b64Depth < 5) {
        const outerPath = path.substring(0, b64Idx);
        const innerPath = path.substring(b64Idx + 5);

        // Navigate to the outer value that holds the Base64
        const outerTokens = [];
        const re = /([^[.\]]+)|\[(\d+)\]/g;
        let m;
        while ((m = re.exec(outerPath)) !== null) {
            if (m[1] !== undefined) outerTokens.push(m[1]);
            else outerTokens.push(parseInt(m[2], 10));
        }

        let cur = clone;
        for (let i = 0; i < outerTokens.length - 1; i++) {
            const tok = outerTokens[i];
            if (cur == null || typeof cur !== "object") {
                return { obj: clone, encoding: null, newValue: null };
            }
            cur = cur[tok];
        }
        const last = outerTokens.length ? outerTokens[outerTokens.length - 1] : null;

        if (last === null) {
            return { obj: clone, encoding: null, newValue: null };
        }
        if (cur == null || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, last)) {
            return { obj: clone, encoding: null, newValue: null };
        }
        const b64Str = cur[last];
        if (typeof b64Str !== "string") {
            return { obj: clone, encoding: null, newValue: null };
        }

        const b64j = tryParseBase64Json(b64Str);
        if (!b64j) {
            // Fallback: treat as plain Base64 string (decode → append → re-encode)
            const inj = injectIntoValue(b64Str, payload);
            cur[last] = inj.value;
            return { obj: clone, encoding: inj.encoding, newValue: inj.value };
        }

        // Recurse into the decoded JSON with the remaining path.
        // This supports nested Base64-JSON: innerPath may contain further @b64:
        // e.g. path = "wrap@b64:inner@b64:q" → innerPath = "inner@b64:q"
        const innerResult = setJsonPathValue(b64j.json, innerPath, payload, b64Depth + 1);
        const newJsonStr = JSON.stringify(innerResult.obj);
        const newB64 = encodeBase64(newJsonStr, b64j.urlSafe);
        cur[last] = newB64;
        return {
            obj: clone,
            encoding: b64j.urlSafe ? "base64url" : "base64",
            newValue: newB64
        };
    }

    // Normal path (no @b64:)
    const tokens = [];
    const re = /([^[.\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
        if (m[1] !== undefined) tokens.push(m[1]);
        else tokens.push(parseInt(m[2], 10));
    }
    if (!tokens.length) return { obj: clone, encoding: null, newValue: null };

    let cur = clone;
    for (let i = 0; i < tokens.length - 1; i++) {
        const tok = tokens[i];
        if (cur == null || typeof cur !== "object") {
            return { obj: clone, encoding: null, newValue: null };
        }
        cur = cur[tok];
    }
    const last = tokens[tokens.length - 1];
    let encoding = null;
    let newValue = null;
    if (cur != null && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, last)) {
        const inj = injectIntoValue(cur[last], payload);
        cur[last] = inj.value;
        encoding = inj.encoding;
        newValue = inj.value;
    }
    return { obj: clone, encoding, newValue };
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
        const origShort = orig.length > 22 ? orig.substring(0, 20) + "…" : orig;
        const newV = r.newValue != null ? String(r.newValue) : (orig + (r.payload || ""));
        const newShort = newV.length > 28 ? newV.substring(0, 25) + "…" : newV;
        const encTag = r.encoding ? ` [${r.encoding}]` : "";
        // Friendly path display for Base64-JSON expansions: outer → inner
        const displayPath = (r.path || "").includes("@b64:")
            ? (r.path || "").replace(/@b64:/g, " → ")
            : (r.path || "");
        // Klar: path: "alt" → "neu"  (Value, nicht Key)
        const label = `${displayPath}: "${origShort}" → "${newShort}"${encTag}`;

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

        const titleExtra = r.encoding
            ? ( (r.path || "").includes("@b64:")
                ? " | encoding: " + r.encoding + " (Base64-JSON: decode → inject inner value → re-encode)"
                : " | encoding: " + r.encoding + " (decode→append→re-encode)" )
            : "";
        html += `<div style="padding:4px 0;border-bottom:1px solid #1a2f25;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:${color};font-weight:600;min-width:48px">[${badge}]</span>
            <span style="flex:1;word-break:break-all" title="${escapeHtml(r.path + ' | orig: ' + orig + ' | new: ' + newV + ' | payload: ' + (r.payload || '') + titleExtra)}">${escapeHtml(label)}</span>
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

    let bodyText = (document.getElementById("testerBody")?.value || "").trim();
    // Tolerate accidental trailing payload from older "append at end" behaviour
    // e.g. {...}'  or  {...}' OR 1=1--
    if (bodyText && (bodyText.startsWith("{") || bodyText.startsWith("["))) {
        const repaired = bodyText.replace(/[}\]]\s*['"`].*$/, (m) => m[0]);
        if (repaired !== bodyText) {
            log((typeof t === "function" ? t("log.trailingPayloadRemoved") : "Hinweis: trailing Payload am JSON-Ende entfernt →") + " " + repaired.substring(0, 60) + "…");
            bodyText = repaired;
            const ta = document.getElementById("testerBody");
            if (ta) ta.value = bodyText;
        }
    }
    if (!bodyText || !(bodyText.startsWith("{") || bodyText.startsWith("["))) {
        log(typeof t === "function" ? t("jsontest.noJson") : "Kein gültiges JSON im Body – bitte JSON in das Body-Feld legen", "warn");
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
    if (resultsBox) resultsBox.style.display = "none";

    showJsonExplorer(bodyText);

    // Alle Leaf-Values – Keys werden nie angefasst
    const testLeaves = leaves.slice();
    const total = testLeaves.length * payloads.length;
    if (progress) {
        progress.style.display = "block";
        progress.textContent = typeof t === "function"
            ? t("jsontest.starting", { total })
            : `Starte… 0 / ${total}  (${testLeaves.length} Values × ${payloads.length} Payloads)`;
    }

    log((typeof t === "function"
        ? t("log.jsonKeyTestInject", { count: testLeaves.length })
        : `JSON-Key-Test: ${testLeaves.length} Values einzeln injizieren (nie Keys, nur Values)`) +
        (testLeaves.length ? " → " + testLeaves.map((l) => l.path).slice(0, 8).join(", ") + (testLeaves.length > 8 ? "…" : "") : ""));

    const allResults = [];
    let done = 0;

    // Pro Request: NUR EINEN Value ändern (Keys bleiben unangetastet)
    // Beispiel: path=search.term, payload='  →  {"search":{"term":"Laptop'","scope":"name"}}
    for (const leaf of testLeaves) {
        if (jsonTestAbort) break;
        for (const p of payloads) {
            if (jsonTestAbort) break;

            let injectedObj;
            let usedEncoding = null;
            let newValue = null;
            try {
                const result = setJsonPathValue(root, leaf.path, p.payload);
                injectedObj = result.obj;
                usedEncoding = result.encoding;
                newValue = result.newValue;
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
                    injectedBody: "",
                    encoding: null,
                    newValue: null
                });
                done++;
                continue;
            }
            const injectedBody = JSON.stringify(injectedObj);

            // Debug-Log first injection so user sees exactly what is sent
            if (done === 0) {
                const pathHint = leaf.isBase64Json
                    ? leaf.path + " (Base64-JSON inner)"
                    : leaf.path;
                const fromStr = JSON.stringify(leaf.value);
                const toStr = leaf.isBase64Json
                    ? "(re-encoded Base64 of modified inner JSON)"
                    : JSON.stringify(newValue);
                const enc = usedEncoding ? " (" + usedEncoding + ")" : "";
                log(typeof t === "function"
                    ? t("log.exampleInjection", { path: pathHint, from: fromStr, to: toStr }) + enc
                    : `Beispiel-Injection [${pathHint}]: ${fromStr} → ${toStr}${enc}`);
            }

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
                injectedBody,
                encoding: usedEncoding,
                newValue,
                isBase64Json: !!leaf.isBase64Json
            });
            done++;

            if (progress) {
                const origHint = leaf.value == null ? "null" : String(leaf.value).substring(0, 18);
                const encHint = usedEncoding ? ` [${usedEncoding}]` : "";
                const pathHint = leaf.isBase64Json ? leaf.path.replace(/@b64:/g, " → ") : leaf.path;
                progress.textContent = `Teste… ${done} / ${total}  (${pathHint}: "${origHint}"${encHint})`;
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
    global.injectAllLeaves = injectAllLeaves;
    global.tryParseBase64Json = tryParseBase64Json;
    global.looksLikeBase64 = looksLikeBase64;
    global.setJsonPathValue = setJsonPathValue;

})(typeof window !== "undefined" ? window : this);
