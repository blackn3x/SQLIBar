/**
 * SQLiBar – shared utilities + rich toast feedback
 */
(function (global) {
    "use strict";

    // ── Toast (only feedback UI – no log panel) ───────────────────────────
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
            bottom: "14px",
            right: "14px",
            maxWidth: "440px",
            minWidth: "200px",
            padding: "0",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            lineHeight: "1.45",
            zIndex: "99999",
            boxShadow: "0 6px 28px rgba(0,0,0,0.5)",
            border: "1px solid var(--border, #1a2f25)",
            background: "var(--bg-input, #0d1510)",
            color: "var(--text, #c8e6d0)",
            opacity: "0",
            transform: "translateY(8px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: "none",
            overflow: "hidden"
        });
        document.body.appendChild(toastEl);
        return toastEl;
    }

    /** Truncate for toast preview – keep start, show length */
    function truncatePreview(text, max) {
        max = max || 120;
        const s = String(text == null ? "" : text).replace(/\s+/g, " ").trim();
        if (!s) return "";
        if (s.length <= max) return s;
        return s.substring(0, max - 1) + "…";
    }

    function formatBytes(n) {
        n = Number(n) || 0;
        if (n < 1024) return n + " B";
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
        return (n / (1024 * 1024)).toFixed(2) + " MB";
    }

    /**
     * Rich toast.
     * @param {string} message  – main line (title)
     * @param {string} [level]  – "info" | "success" | "warn" | "error"
     * @param {object} [opts]
     * @param {string} [opts.detail]   – second line (muted)
     * @param {string} [opts.preview]  – third line: content snippet (e.g. copied text)
     * @param {number} [opts.ms]       – display duration override
     */
    function showToast(message, level, opts) {
        level = level || "info";
        opts = opts || {};
        const el = ensureToast();

        const colors = {
            info:    { border: "var(--border-focus, #00ff66)", color: "var(--text, #c8e6d0)", iconBg: "rgba(0,255,102,0.12)" },
            success: { border: "var(--success, #00ff66)",     color: "var(--success, #4ade80)", iconBg: "rgba(74,222,128,0.12)" },
            warn:    { border: "#fbbf24",                      color: "#fbbf24", iconBg: "rgba(251,191,36,0.12)" },
            error:   { border: "#f87171",                      color: "#f87171", iconBg: "rgba(248,113,113,0.12)" }
        };
        const icons = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" };
        const defaultMs = { info: 3200, success: 3800, warn: 5500, error: 8000 };
        let ms = opts.ms != null ? opts.ms : defaultMs[level] || 3000;
        if ((opts.detail || opts.preview) && opts.ms == null) {
            ms = Math.max(ms, level === "error" ? 9000 : 5000);
        }

        const c = colors[level] || colors.info;
        el.style.borderColor = c.border;
        el.style.color = c.color;

        const icon = icons[level] || "ℹ";
        const title = String(message == null ? "" : message);
        const detail = opts.detail != null ? String(opts.detail) : "";
        const preview = opts.preview != null ? truncatePreview(opts.preview, 140) : "";

        el.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;gap:10px;align-items:flex-start;padding:10px 12px;";

        const iconBox = document.createElement("div");
        iconBox.style.cssText =
            "flex-shrink:0;width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;" +
            "font-size:13px;font-weight:700;background:" + c.iconBg + ";color:" + c.color + ";";
        iconBox.textContent = icon;

        const body = document.createElement("div");
        body.style.cssText = "flex:1;min-width:0;";

        const titleEl = document.createElement("div");
        titleEl.style.cssText = "font-weight:600;font-size:12.5px;color:" + c.color + ";";
        titleEl.textContent = title;
        body.appendChild(titleEl);

        if (detail) {
            const d = document.createElement("div");
            d.style.cssText = "margin-top:3px;font-size:11px;color:var(--text-muted,#8aa896);opacity:0.95;";
            d.textContent = detail;
            body.appendChild(d);
        }

        if (preview) {
            const p = document.createElement("div");
            p.style.cssText =
                "margin-top:6px;padding:5px 8px;border-radius:5px;font-size:10.5px;line-height:1.35;" +
                "background:rgba(0,0,0,0.35);border:1px solid var(--border,#1a2f25);" +
                "color:var(--text,#c8e6d0);word-break:break-all;max-height:4.2em;overflow:hidden;";
            p.textContent = preview;
            body.appendChild(p);
        }

        wrap.appendChild(iconBox);
        wrap.appendChild(body);
        el.appendChild(wrap);

        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
        el.style.pointerEvents = "auto";
        el.onclick = () => {
            el.style.opacity = "0";
            el.style.transform = "translateY(8px)";
            el.style.pointerEvents = "none";
            clearTimeout(toastTimer);
        };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            el.style.opacity = "0";
            el.style.transform = "translateY(8px)";
            el.style.pointerEvents = "none";
        }, ms);
    }

    /**
     * Convenience: toast for clipboard copy actions.
     */
    function toastCopied(label, text, extra) {
        const s = String(text == null ? "" : text);
        const len = s.length;
        const detail = extra || (len + " Zeichen" + (len > 0 ? " · " + formatBytes(new Blob([s]).size) : ""));
        showToast(
            (label || "Kopiert") + (len ? "" : " (leer)"),
            "success",
            { detail: detail, preview: s }
        );
    }

    /**
     * Convenience: toast for request/open results
     */
    function toastRequest(method, status, bytes, ms, url) {
        const ok = status >= 200 && status < 400;
        const level = ok ? "success" : (status >= 500 ? "error" : "warn");
        const title = (method || "REQ") + " → " + (status || "?");
        const detail = [
            bytes != null ? formatBytes(bytes) : null,
            ms != null ? ms + " ms" : null
        ].filter(Boolean).join(" · ");
        showToast(title, level, {
            detail: detail || undefined,
            preview: url || undefined,
            ms: ok ? 4000 : 6000
        });
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
     * Optional 3rd arg: { detail, preview, ms } forwarded to showToast
     */
    function log(text, level, opts) {
        level = level || "info";
        const time = new Date().toLocaleTimeString(undefined, {
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });

        if (level === "error") {
            console.error("[SQLiBar]", text, opts || "");
            showToast(text, "error", opts);
        } else if (level === "warn") {
            console.warn("[SQLiBar]", text, opts || "");
            showToast(text, "warn", opts);
        } else if (level === "success") {
            console.log("[SQLiBar]", text, opts || "");
            showToast(text, "success", opts);
        } else {
            console.log("[SQLiBar]", text);
        }

        const box = document.getElementById("log");
        if (box) {
            box.textContent += `[${time}] ${text}\n`;
            box.scrollTop = box.scrollHeight;
        }
    }

    function logError(err, context) {
        log(formatError(err, context), "error");
    }

    function logOk(text, opts) {
        log(text, "success", opts);
    }

    function logWarn(text, opts) {
        log(text, "warn", opts);
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

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(String(text));
        }
        return new Promise((resolve, reject) => {
            try {
                const ta = document.createElement("textarea");
                ta.value = String(text);
                ta.style.cssText = "position:fixed;left:-9999px;top:0";
                document.body.appendChild(ta);
                ta.select();
                const ok = document.execCommand("copy");
                document.body.removeChild(ta);
                if (ok) resolve();
                else reject(new Error("execCommand failed"));
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Copy + rich toast in one step.
     */
    function copyWithToast(text, label) {
        const s = String(text == null ? "" : text);
        return copyText(s).then(() => {
            toastCopied(label || "Kopiert", s);
            console.log("[SQLiBar]", (label || "Copied") + " (" + s.length + " chars)");
        }).catch((err) => {
            logError(err, "Copy");
        });
    }

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
    global.logOk = logOk;
    global.logWarn = logWarn;
    global.formatError = formatError;
    global.showToast = showToast;
    global.toastCopied = toastCopied;
    global.toastRequest = toastRequest;
    global.copyWithToast = copyWithToast;
    global.formatBytes = formatBytes;
    global.escapeHtml = escapeHtml;
    global.statusToken = statusToken;
    global.tryPrettyBody = tryPrettyBody;
    global.detectBodyType = detectBodyType;
    global.methodClass = methodClass;
    global.statusClass = statusClass;
    global.evalInPage = evalInPage;
    global.sendMessage = sendMessage;
    global.copyText = copyText;

})(typeof window !== "undefined" ? window : this);
