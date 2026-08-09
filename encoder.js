function encodeData(value, type) {
    switch (type) {

        case "url":
            return encodeURIComponent(value);

        case "base64":
            return btoa(
                String.fromCharCode(
                    ...new TextEncoder().encode(value)
                )
            );

        case "hex":
            return [...new TextEncoder().encode(value)]
                .map(b => b.toString(16).padStart(2, "0"))
                .join(" ");

        case "json":
            return JSON.stringify(value);

        case "html":
            return value
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#39;");

        case "unicode":
            return [...value]
                .map(c =>
                    "\\u" +
                    c.charCodeAt(0)
                        .toString(16)
                        .padStart(4, "0")
                )
                .join("");

        case "binary":
            return [...new TextEncoder().encode(value)]
                .map(b => b.toString(2).padStart(8, "0"))
                .join(" ");

        case "url2":
            return encodeURIComponent(
                encodeURIComponent(value)
            );

        case "base64url":
            return btoa(
                String.fromCharCode(
                    ...new TextEncoder().encode(value)
                )
            )
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

        case "hex0x":
            return "0x" +
                [...new TextEncoder().encode(value)]
                    .map(b => b.toString(16).padStart(2, "0"))
                    .join("");

        case "hexslash":
            return [...new TextEncoder().encode(value)]
                .map(b => "\\x" + b.toString(16).padStart(2, "0"))
                .join("");

        case "ascii":
            return [...value]
                .map(c => c.charCodeAt(0))
                .join(",");

        case "sqlchar":
            return "CHAR(" +
                [...value]
                    .map(c => c.charCodeAt(0))
                    .join(",") +
                ")";

        case "unicodeu":
            return [...value]
                .map(c =>
                    "%u" +
                    c.charCodeAt(0)
                        .toString(16)
                        .padStart(4, "0")
                )
                .join("");

        case "rot13":
            return value.replace(/[a-zA-Z]/g, c => {
                const base = c <= "Z" ? 65 : 97;
                return String.fromCharCode(
                    ((c.charCodeAt(0) - base + 13) % 26) + base
                );
            });

        

        default:
            return value;
    }
}


function decodeData(value, type) {
    switch (type) {

        case "url":
            return decodeURIComponent(value);

        case "base64": {
            const bytes = Uint8Array.from(
                atob(value),
                c => c.charCodeAt(0)
            );

            return new TextDecoder().decode(bytes);
        }

        case "hex": {
            const bytes = new Uint8Array(
                value
                    .trim()
                    .split(/\s+/)
                    .map(h => parseInt(h, 16))
            );

            return new TextDecoder().decode(bytes);
        }

        case "json":
            return JSON.stringify(
                JSON.parse(value),
                null,
                2
            );

        case "html":
            return value
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&quot;", '"')
                .replaceAll("&#39;", "'")
                .replaceAll("&amp;", "&");

        case "unicode":
            return value.replace(
                /\\u([\dA-F]{4})/gi,
                (_, hex) =>
                    String.fromCharCode(
                        parseInt(hex, 16)
                    )
            );

        case "binary": {
            const bytes = new Uint8Array(
                value
                    .trim()
                    .split(/\s+/)
                    .map(b => parseInt(b, 2))
            );

            return new TextDecoder().decode(bytes);
        }

        case "url2":
            return decodeURIComponent(
                decodeURIComponent(value)
            );

        case "base64url": {
            let base64 = value
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            while (base64.length % 4) {
                base64 += "=";
            }

            const bytes = Uint8Array.from(
                atob(base64),
                c => c.charCodeAt(0)
            );

            return new TextDecoder().decode(bytes);
        }

        case "hex0x": {
            let hex = value.trim();

            if (hex.startsWith("0x")) {
                hex = hex.slice(2);
            }

            const bytes = new Uint8Array(
                hex.match(/.{1,2}/g)?.map(
                    h => parseInt(h, 16)
                ) || []
            );

            return new TextDecoder().decode(bytes);
        }

        case "hexslash": {
            const bytes = new Uint8Array(
                [...value.matchAll(/\\x([0-9a-f]{2})/gi)]
                    .map(m => parseInt(m[1], 16))
            );

            return new TextDecoder().decode(bytes);
        }

        case "ascii":
            return value
                .split(",")
                .map(n => String.fromCharCode(parseInt(n.trim(), 10)))
                .join("");

        case "unicodeu":
            return value.replace(
                /%u([0-9a-f]{4})/gi,
                (_, hex) =>
                    String.fromCharCode(
                        parseInt(hex, 16)
                    )
            );

        case "rot13":
            return value.replace(/[a-zA-Z]/g, c => {
                const base = c <= "Z" ? 65 : 97;

                return String.fromCharCode(
                    ((c.charCodeAt(0) - base + 13) % 26) + base
                );
            });

        /*
         * Diese Typen sind grundsätzlich nicht reversibel.
         */

        

        default:
            return value;
    }
}