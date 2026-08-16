/**
 * SQLiBar – Live Network monitor
 */
(function (global) {
    "use strict";

// ======================
// LIVE NETWORK MONITOR
// ======================
const networkList = document.getElementById("networkList");
const networkDetails = document.getElementById("networkDetails");
const netFilter = document.getElementById("netFilter");
let networkEntries = [];
let selectedNetIndex = -1;
let netIdCounter = 1;

    // Variable zum Steuern des Aufnahme-Status (Standard: true)


   

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
            log((typeof t === "function" ? t("log.netParamToUrl") : "Net-Param → URL:") + " " + btn.dataset.name);
        });
    });
    root.querySelectorAll(".selp-body").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            appendParamToBody(btn.dataset.name, btn.dataset.val || "1");
            log((typeof t === "function" ? t("log.netParamToBody") : "Net-Param → Body:") + " " + btn.dataset.name);
        });
    });
    root.querySelectorAll(".selp-pl").forEach(btn => {
        btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            if (customPayload) customPayload.value = btn.dataset.name + "=" + (btn.dataset.val || "");
            log((typeof t === "function" ? t("log.netParamToPayload") : "Net-Param → Payload:") + " " + btn.dataset.name);
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
        const paramLabel = typeof t === "function" ? t("net.paramFound", { n: pCount }) : (pCount + " param found");

        // badge wird nun immer gerendert (egal ob pCount > 0 oder 0)
        const pBadge = `<span class="param-badge query ${pCount === 0 ? "zero-params" : ""}" style="background-color:transparent;color:${pCount > 0 ? "var(--primary)" : "#555"}; margin-left:4px;flex-shrink:0" title="${pCount}">${chevron} ${paramLabel}</span>`;

        const shortUrl = e.url.length > 90 ? e.url.substring(0, 87) + "…" : e.url;
        let html = `
<div class="network-item ${isActive ? "active" : ""}" data-idx="${i}">
    <span class="network-method ${methodClass(e.method)}">${e.method}</span>
    ${pBadge}
    <span class="network-status ${statusClass(e.status)}">${e.status || "…"}</span>
    <span class="network-url" title="${e.url.replace(/"/g, "&quot;")}">${shortUrl}</span>
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
                if (networkDetails) {
                    networkDetails.innerHTML = "";
                    networkDetails.style.display = "none";
                }
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
    const L = (k, fb) => (typeof t === "function" ? t(k) : fb);
    html += `<span class="tok-dim">${L("net.status", "Status:")}</span> <span class="${st}">${escapeHtml(e.status || "pending")} ${escapeHtml(e.statusText || "")}</span>\n`;
    html += `<span class="tok-dim">${L("net.type", "Type:")}</span> <span class="tok-val">${escapeHtml(e.type || "-")}</span>\n`;
    html += `<span class="tok-dim">${L("net.time", "Time:")}</span> <span class="tok-val">${escapeHtml(e.time || "-")}</span>\n`;

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

    html += `\n<span class="tok-section">${L("net.reqHeaders", "── Request Headers ──")}</span>\n`;
    html += formatHeaderBlock(e.reqHeaders);

    if (e.reqBody) {
        html += `\n<span class="tok-section">${L("net.reqBody", "── Request Body ──")}</span>\n<span class="tok-body">${escapeHtml(tryPrettyBody(e.reqBody))}</span>\n`;
    } else {
        html += `\n<span class="tok-section">${L("net.reqBody", "── Request Body ──")}</span>\n<span class="tok-dim">${L("net.none", "(none)")}</span>\n`;
    }

    html += `\n<span class="tok-section">${L("net.resHeaders", "── Response Headers ──")}</span>\n`;
    html += formatHeaderBlock(e.resHeaders);

    if (e.resBodyPreview) {
        const pretty = tryPrettyBody(e.resBodyPreview);
        const truncated = e.resBodyPreview.length >= 12000 ? "\n<span class=\"tok-dim\">… " + L("sqli.diffTruncated", "truncated") + "</span>" : "";
        html += `\n<span class="tok-section">${L("net.resPreview", "── Response Preview ──")}</span>\n<span class="tok-body">${escapeHtml(pretty)}</span>${truncated}\n`;
    } else {
        html += `\n<span class="tok-section">${L("net.resPreview", "── Response Preview ──")}</span>\n<span class="tok-dim">${L("net.none", "(none)")}</span>\n`;
    }

    networkDetails.innerHTML = html;
    networkDetails.style.display = "block";
}

function formatHeaderBlock(text) {
    if (!text || text === "(none)") return `<span class="tok-dim">${typeof t === "function" ? t("net.none") : "(none)"}</span>\n`;
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
                    cur.resBodyPreview = String(content).substring(0, 12000);
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
                        log((typeof t === "function" ? t("log.pageResponseLoaded") : "Page Response loaded → URL/Payload") + " (" + status + ")");
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

    let isRecording = true;
    Object.defineProperty(global, "isRecording", {
        get() { return isRecording; },
        set(v) { isRecording = !!v; }
    });

    if (browser.devtools && browser.devtools.network) {
        browser.devtools.network.onRequestFinished.addListener((request) => {
            if (!isRecording) return; // Beenden, wenn Aufzeichnung pausiert ist
            addNetworkEntry(request);
        });
        log(typeof t === "function" ? t("log.networkActive") : "Live Network monitor active");
    } else {
        log(typeof t === "function" ? t("log.networkApiUnavailable") : "devtools.network API not available", "warn");
    }

    // Event-Listener für den Pause/Start-Button
    const toggleNetRecordingBtn = document.getElementById("toggleNetRecording");
    if (toggleNetRecordingBtn) {
        toggleNetRecordingBtn.addEventListener("click", () => {
            isRecording = !isRecording;
            if (isRecording) {
                toggleNetRecordingBtn.textContent = t("net.pause");
                toggleNetRecordingBtn.setAttribute("data-i18n", "net.pause");
                toggleNetRecordingBtn.classList.remove("btn-secondary");
                toggleNetRecordingBtn.classList.add("btn-primary");
                log(t("log.netResumed"));
            } else {
                toggleNetRecordingBtn.textContent = t("net.start");
                toggleNetRecordingBtn.setAttribute("data-i18n", "net.start");
                toggleNetRecordingBtn.classList.remove("btn-primary");
                toggleNetRecordingBtn.classList.add("btn-secondary");
                log(t("log.netPaused"));
            }
        });
    }

document.getElementById("clearNetwork")?.addEventListener("click", () => {
    networkEntries = [];
    selectedNetIndex = -1;
    if (networkDetails) {
        networkDetails.innerHTML = "";
        networkDetails.style.display = "none";
    }
    renderNetworkList();
    log(typeof t === "function" ? t("log.networkCleared") : "Network log cleared");
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
    log(typeof t === "function" ? t("log.urlToRequestBuilder") : "URL → Request Builder");
});

document.getElementById("netCopyUrl")?.addEventListener("click", () => {
    const e = networkEntries[selectedNetIndex];
    if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
    navigator.clipboard.writeText(e.url);
    log(typeof t === "function" ? t("log.requestUrlCopied") : "Request URL copied");
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
    navigator.clipboard.writeText(cmd).then(() => log((typeof t === "function" ? t("log.curlCopied") : "cURL copied") + " (" + cmd.length + ")"))
        .catch(err => log((typeof t === "function" ? t("log.copyFailed") : "Copy failed") + ": " + err.message, "error"));
});

document.getElementById("netCopyParams")?.addEventListener("click", () => {
    const e = networkEntries[selectedNetIndex];
    if (!e) { log(typeof t === "function" ? t("net.noRequestSelected") : "No request selected"); return; }
    const params = getParamsForEntry(e);
    if (!params.length) { log(typeof t === "function" ? t("net.noParamsForRequest") : "No parameters for this request."); return; }
    const lines = params.map(p => p.name + "=" + (p.value || ""));
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
        log((typeof t === "function" ? t("net.paramsCopied") : "Params copied:") + " " + params.length);
    }).catch(err => log((typeof t === "function" ? t("log.copyFailed") : "Copy failed") + ": " + err.message, "error"));
});





    // Expose state
    Object.defineProperty(global, "networkEntries", {
        get() { return networkEntries; },
        set(v) { networkEntries = v; }
    });
    Object.defineProperty(global, "selectedNetIndex", {
        get() { return selectedNetIndex; },
        set(v) { selectedNetIndex = v; }
    });

    function initNetwork() {
        if (browser?.devtools?.network) {
            log(typeof t === "function" ? t("log.networkActive") : "Live Network monitor active");
        } else {
            log(typeof t === "function" ? t("log.networkApiUnavailable") : "devtools.network API not available", "warn");
        }
    }
    global.initNetwork = initNetwork;
    global.renderNetworkList = renderNetworkList;
    global.showNetworkDetails = showNetworkDetails;
    global.addNetworkEntry = addNetworkEntry;
    if (typeof sendNetEntryToTester === "function") {
        global.sendNetEntryToTester = sendNetEntryToTester;
    }

})(typeof window !== "undefined" ? window : this);
