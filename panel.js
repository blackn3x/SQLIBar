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

// Event Listener registrieren (nach DOM-Ready)
document.addEventListener("DOMContentLoaded", () => {
    const providerSel = document.getElementById("wafProvider");
    const applyBtn = document.getElementById("applyWafBypass");
    const undoBtn = document.getElementById("wafBypassUndo");

    if (providerSel) providerSel.addEventListener("change", populateWafTransforms);
    if (applyBtn) applyBtn.addEventListener("click", applyWafBypass);
    if (undoBtn) undoBtn.addEventListener("click", undoWafBypass);
});