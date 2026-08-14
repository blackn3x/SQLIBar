/**
 * SQLiBar – shared utilities + improved error / status output
 */
(function (global) {
    "use strict";

    // ── Status toast (visible feedback; no #log element in HTML) ──────────
    let toastEl = null;
    let toastTimer = null;

    function ensureToast() {
        if (toastEl) return toastEl;
        toastEl = document.createElement("div");
        toastEl.id = "sqlibar-toast";
        toastEl.setAttribute("role", "status");
        toastEl.setAttribute("aria-live", "polite");
        Object.assign(toastEl.style, {
            position: "fixed",
            bottom: "12px",
            right: "12px",
            maxWidth: "420px",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: "1.4",
            zIndex: "99999",
            boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
            border: "1px solid var(--border, #1a2f25)",
            background: "var(--bg-input, #0d1510)",
            color: "var(--text, #c8e6d0)",
            opacity: "0",
            transform: "translateY(8px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
        });
        document.body.appendChild(toastEl);
        return toastEl;
    }

    function showToast(message, level) {
        const el = ensureToast();
        const colors = {
            info:    { border: "var(--border-focus, #00ff66)", color: "var(--text, #c8e6d0)" },
            success: { border: "var(--success, #00ff66)",     color: "var(--success, #4ade80)" },
            warn:    { border: "#fbbf24",                      color: "#fbbf24" },
            error:   { border: "#f87171",                      color: "#f87171" }
        };
        const c = colors[level] || colors.info;
        el.style.borderColor = c.border;
        el.style.color = c.color;
        el.textContent = message;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        el.style.pointerEvents = "auto";
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            el.style.opacity = "0";
            el.style.transform = "translateY(8px)";
            el.style.pointerEvents = "none";
        }, level === "error" ? 8000 : 4500);
    }

    /** Human-readable error string */
    function formatError(err, context) {
        let msg = "";
        if (err == null) {
            msg = "Unknown error";
        } else if (typeof err === "string") {
            msg = err;
        } else if (err.message) {
            msg = err.message;
            if (err.name && err.name !== "Error") msg = err.name + ": " + msg;
        } else {
            msg = String(err);
        }
        // Common browser / extension cases
        if (/Failed to fetch|NetworkError|net::ERR/i.test(msg)) {
            msg = "Network error – CORS, offline, or certificate problem. " + msg;
        } else if (/Extension context invalidated/i.test(msg)) {
            msg = "Extension was reloaded – please reopen the DevTools panel.";
        }
        if (context) msg = context + ": " + msg;
        return msg;
    }

    /**
     * Unified logger.
     * level: "info" | "success" | "warn" | "error"
     * Always writes to console; shows toast for warn/error (and optionally info).
     */
    function log(text, level) {
        level = level || "info";
        const time = new Date().toLocaleTimeString("de-DE", {
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
        const line = `[${time}] ${text}`;

        if (level === "error") {
            console.error("[SQLiBar]", text);
            showToast("✗ " + text, "error");
        } else if (level === "warn") {
            console.warn("[SQLiBar]", text);
            showToast("⚠ " + text, "warn");
        } else if (level === "success") {
            console.log("[SQLiBar]", text);
            showToast("✓ " + text, "success");
        } else {
            console.log("[SQLiBar]", text);
            // optional: showToast(text, "info");  // too noisy for every log
        }

        // Legacy #log box if present
        const box = document.getElementById("log");
        if (box) {
            box.textContent += line + "\n";
            box.scrollTop = box.scrollHeight;
        }
    }

    function logError(err, context) {
        log(formatError(err, context), "error");
    }

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
        } catch (e) { /* keep raw */ }
        return text;
    }

    function detectBodyType(text) {
        const raw = (text || "").trim();
        if (!raw) return "text";
        if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
            try { JSON.parse(raw); return "json"; } catch (e) { /* fallthrough */ }
        }
        if (/^\s*<(!DOCTYPE|html|[\w:-]+[\s>])/i.test(raw) || /<\/[a-z][\w:-]*>/i.test(raw)) {
            return "html";
        }
        return "text";
    }

    function methodClass(m) {
        const u = (m || "").toUpperCase();
        if (u === "GET") return "method-get";
        if (u === "POST") return "method-post";
        if (u === "PUT" || u === "PATCH") return "method-put";
        if (u === "DELETE") return "method-del";
        return "method-other";
    }

    function statusClass(code) {
        const c = Number(code);
        if (c >= 200 && c < 300) return "status-ok";
        if (c >= 300 && c < 400) return "status-redirect";
        if (c >= 400) return "status-err";
        return "status-pending";
    }

    /** Safe inspectedWindow.eval with proper error reporting */
    function evalInPage(code, callback) {
        if (!browser?.devtools?.inspectedWindow) {
            logError("devtools.inspectedWindow not available", "evalInPage");
            if (callback) callback(null, { value: "API not available" });
            return;
        }
        try {
            browser.devtools.inspectedWindow.eval(code, (result, isException) => {
                if (isException) {
                    const msg = isException.value || isException.message || String(isException);
                    logError(msg, "Page eval");
                    if (callback) callback(null, isException);
                    return;
                }
                if (callback) callback(result, null);
            });
        } catch (err) {
            logError(err, "Page eval");
            if (callback) callback(null, err);
        }
    }

    /** Promise wrapper for runtime.sendMessage with lastError handling */
    function sendMessage(msg) {
        return new Promise((resolve) => {
            try {
                browser.runtime.sendMessage(msg, (resp) => {
                    if (browser.runtime.lastError) {
                        const err = browser.runtime.lastError.message;
                        logError(err, "Background");
                        resolve({ ok: false, error: err });
                        return;
                    }
                    resolve(resp || { ok: false, error: "Empty response" });
                });
            } catch (err) {
                logError(err, "Background");
                resolve({ ok: false, error: formatError(err) });
            }
        });
    }

    // Export
    global.log = log;
    global.logError = logError;
    global.formatError = formatError;
    global.showToast = showToast;
    global.escapeHtml = escapeHtml;
    global.statusToken = statusToken;
    global.tryPrettyBody = tryPrettyBody;
    global.detectBodyType = detectBodyType;
    global.methodClass = methodClass;
    global.statusClass = statusClass;
    global.evalInPage = evalInPage;
    global.sendMessage = sendMessage;

})(typeof window !== "undefined" ? window : this);
