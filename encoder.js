/**
 * SQLiBar Encoder / Decoder
 * Robust, SQLi-focused encode/decode utilities.
 */

function _utf8Bytes(str) {
    return new TextEncoder().encode(str == null ? "" : String(str));
}

function _fromUtf8(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function _btoaUtf8(str) {
    const bytes = _utf8Bytes(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function _atobUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return _fromUtf8(bytes);
}

/** Selective URL-encode: only encode characters that typically break / need encoding in SQLi contexts */
function selectiveUrlEncode(value) {
    return String(value).replace(/[^A-Za-z0-9\-_.~!*'();:@&=+$,/?#\[\]]/g, (ch) => {
        // Always encode these high-risk chars; leave most URL-safe alone
        const code = ch.charCodeAt(0);
        if (code < 128) {
            return "%" + code.toString(16).toUpperCase().padStart(2, "0");
        }
        return encodeURIComponent(ch);
    }).replace(/[ '"<>`\\]/g, (ch) => {
        return "%" + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
    });
}

/** Fullwidth Unicode (common WAF bypass) */
function toFullwidth(value) {
    return [...String(value)].map((c) => {
        const code = c.charCodeAt(0);
        if (code === 0x20) return "\u3000"; // ideographic space
        if (code >= 0x21 && code <= 0x7e) return String.fromCharCode(code + 0xfee0);
        return c;
    }).join("");
}

function fromFullwidth(value) {
    return [...String(value)].map((c) => {
        const code = c.charCodeAt(0);
        if (code === 0x3000) return " ";
        if (code >= 0xff01 && code <= 0xff5e) return String.fromCharCode(code - 0xfee0);
        return c;
    }).join("");
}

/** JWT helpers */
function jwtDecode(token) {
    const parts = String(token).trim().split(".");
    if (parts.length < 2) throw new Error("Invalid JWT (need at least header.payload)");
    const decodePart = (p) => {
        let b64 = p.replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        try {
            return JSON.parse(_atobUtf8(b64));
        } catch {
            return _atobUtf8(b64);
        }
    };
    const header = decodePart(parts[0]);
    const payload = decodePart(parts[1]);
    const sig = parts[2] || "(none)";
    return JSON.stringify({ header, payload, signature: sig }, null, 2);
}

function encodeData(value, type) {
    value = value == null ? "" : String(value);
    switch (type) {
        case "url":
            return encodeURIComponent(value);
        case "url2":
            return encodeURIComponent(encodeURIComponent(value));
        case "url3":
            return encodeURIComponent(encodeURIComponent(encodeURIComponent(value)));
        case "urlsel":
            return selectiveUrlEncode(value);
        case "base64":
            return _btoaUtf8(value);
        case "base64url":
            return _btoaUtf8(value)
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
        case "hex":
            return [..._utf8Bytes(value)]
                .map((b) => b.toString(16).padStart(2, "0"))
                .join(" ");
        case "hex0x":
            return (
                "0x" +
                [..._utf8Bytes(value)]
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")
            );
        case "hexslash":
            return [..._utf8Bytes(value)]
                .map((b) => "\\x" + b.toString(16).padStart(2, "0"))
                .join("");
        case "hexcomma":
            return [..._utf8Bytes(value)]
                .map((b) => "0x" + b.toString(16).padStart(2, "0"))
                .join(",");
        case "ascii":
            return [...value].map((c) => c.charCodeAt(0)).join(",");
        case "sqlchar":
            return (
                "CHAR(" +
                [...value].map((c) => c.charCodeAt(0)).join(",") +
                ")"
            );
        case "sqlcharhex":
            return (
                "CHAR(" +
                [...value]
                    .map((c) => "0x" + c.charCodeAt(0).toString(16).toUpperCase())
                    .join(",") +
                ")"
            );
        case "sqlconcat":
            // MySQL-style string concat via CHAR pieces or + for MSSQL-ish
            if (!value.length) return "''";
            return (
                "CONCAT(" +
                [...value]
                    .map((c) => "CHAR(" + c.charCodeAt(0) + ")")
                    .join(",") +
                ")"
            );
        case "unicode":
            return [...value]
                .map(
                    (c) =>
                        "\\u" +
                        c.charCodeAt(0).toString(16).padStart(4, "0")
                )
                .join("");
        case "unicodeu":
            return [...value]
                .map(
                    (c) =>
                        "%u" +
                        c.charCodeAt(0).toString(16).padStart(4, "0")
                )
                .join("");
        case "fullwidth":
            return toFullwidth(value);
        case "html":
            return value
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");
        case "json":
            return JSON.stringify(value);
        case "binary":
            return [..._utf8Bytes(value)]
                .map((b) => b.toString(2).padStart(8, "0"))
                .join(" ");
        case "rot13":
            return value.replace(/[a-zA-Z]/g, (c) => {
                const base = c <= "Z" ? 65 : 97;
                return String.fromCharCode(
                    ((c.charCodeAt(0) - base + 13) % 26) + base
                );
            });
        case "jwt":
            // Encode is not meaningful for raw JWT; pass-through with hint
            return value;
        default:
            return value;
    }
}

function decodeData(value, type) {
    value = value == null ? "" : String(value);
    switch (type) {
        case "url":
            return decodeURIComponent(value.replace(/\+/g, " "));
        case "url2":
            return decodeURIComponent(
                decodeURIComponent(value.replace(/\+/g, " "))
            );
        case "url3":
            return decodeURIComponent(
                decodeURIComponent(
                    decodeURIComponent(value.replace(/\+/g, " "))
                )
            );
        case "urlsel":
            // Selective is mostly identity on decode; fall back to full URL decode
            try {
                return decodeURIComponent(value.replace(/\+/g, " "));
            } catch {
                return value;
            }
        case "base64": {
            const cleaned = value.replace(/\s+/g, "");
            return _atobUtf8(cleaned);
        }
        case "base64url": {
            let base64 = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
            while (base64.length % 4) base64 += "=";
            return _atobUtf8(base64);
        }
        case "hex": {
            const bytes = new Uint8Array(
                value
                    .trim()
                    .split(/[\s,;:]+/)
                    .filter(Boolean)
                    .map((h) => parseInt(h.replace(/^0x/i, ""), 16))
            );
            return _fromUtf8(bytes);
        }
        case "hex0x": {
            let hex = value.trim().replace(/^0x/i, "").replace(/\s+/g, "");
            const pairs = hex.match(/.{1,2}/g) || [];
            const bytes = new Uint8Array(pairs.map((h) => parseInt(h, 16)));
            return _fromUtf8(bytes);
        }
        case "hexslash": {
            const matches = [...value.matchAll(/\\x([0-9a-fA-F]{2})/g)];
            const bytes = new Uint8Array(matches.map((m) => parseInt(m[1], 16)));
            return _fromUtf8(bytes);
        }
        case "hexcomma": {
            const parts = value.split(/[,\s]+/).filter(Boolean);
            const bytes = new Uint8Array(
                parts.map((p) => parseInt(p.replace(/^0x/i, ""), 16))
            );
            return _fromUtf8(bytes);
        }
        case "ascii":
            return value
                .split(/[,\s]+/)
                .filter((n) => n !== "")
                .map((n) => String.fromCharCode(parseInt(n.trim(), 10)))
                .join("");
        case "sqlchar":
        case "sqlcharhex":
        case "sqlconcat": {
            // Extract numbers from CHAR(65,66) or CHAR(0x41,0x42) or CONCAT(CHAR(..))
            const nums = [...value.matchAll(/(?:0x([0-9a-fA-F]+)|(\d+))/g)].map(
                (m) => (m[1] != null ? parseInt(m[1], 16) : parseInt(m[2], 10))
            );
            return nums.map((n) => String.fromCharCode(n)).join("");
        }
        case "unicode":
            return value.replace(/\\u([0-9a-fA-F]{4})/gi, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16))
            );
        case "unicodeu":
            return value.replace(/%u([0-9a-fA-F]{4})/gi, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16))
            );
        case "fullwidth":
            return fromFullwidth(value);
        case "html":
            return value
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&quot;", '"')
                .replaceAll("&#39;", "'")
                .replaceAll("&#x27;", "'")
                .replaceAll("&apos;", "'")
                .replaceAll("&amp;", "&");
        case "json":
            return JSON.stringify(JSON.parse(value), null, 2);
        case "binary": {
            const bytes = new Uint8Array(
                value
                    .trim()
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .map((b) => parseInt(b, 2))
            );
            return _fromUtf8(bytes);
        }
        case "rot13":
            return value.replace(/[a-zA-Z]/g, (c) => {
                const base = c <= "Z" ? 65 : 97;
                return String.fromCharCode(
                    ((c.charCodeAt(0) - base + 13) % 26) + base
                );
            });
        case "jwt":
            return jwtDecode(value);
        default:
            return value;
    }
}

/**
 * Apply a chain of encodings: types is an array of type strings.
 * direction: "encode" | "decode"
 */
function transformChain(value, types, direction) {
    let result = value == null ? "" : String(value);
    const fn = direction === "decode" ? decodeData : encodeData;
    const list = direction === "decode" ? [...types].reverse() : types;
    for (const t of list) {
        if (!t) continue;
        result = fn(result, t);
    }
    return result;
}

/** Types that are primarily encode-only or decode-only (UI can disable buttons) */
const ENCODE_ONLY = new Set(["sqlchar", "sqlcharhex", "sqlconcat", "urlsel"]);
const DECODE_ONLY = new Set(["jwt"]);

function isEncodeOnly(type) {
    return ENCODE_ONLY.has(type);
}
function isDecodeOnly(type) {
    return DECODE_ONLY.has(type);
}
