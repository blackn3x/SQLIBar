/**
 * SQLiBar – Theme / color scheme
 */
(function (global) {
    "use strict";

// ======================
// THEME / COLOR SCHEME (Options tab)
// ======================
const THEME_KEY = "sqlibar_theme";
const CUSTOM_KEY = "sqlibar_custom_accent";
const THEMES = {
    neon: { name: "Neon Green", desc: "Default toxic", primary: "#00ff66", primaryHov: "#33ff85", primaryTxt: "#050a07", border: "#1a2f25", borderFocus: "#00ff66", textMuted: "#5a8e6e", textDim: "#375945", secondary: "#1a2f25", secondaryHov: "#254435", shadow: "0 0 10px rgba(0, 255, 102, 0.15)" },
    cyan: { name: "Cyber Cyan", desc: "Cool blue-green", primary: "#00e5ff", primaryHov: "#5ef0ff", primaryTxt: "#041016", border: "#1a2a32", borderFocus: "#00e5ff", textMuted: "#5a8a9e", textDim: "#375565", secondary: "#1a2a32", secondaryHov: "#253845", shadow: "0 0 10px rgba(0, 229, 255, 0.15)" },
    purple: { name: "Violet", desc: "Soft purple", primary: "#a855f7", primaryHov: "#c084fc", primaryTxt: "#0c0614", border: "#2a1f3a", borderFocus: "#a855f7", textMuted: "#8b7aa8", textDim: "#5c4d72", secondary: "#2a1f3a", secondaryHov: "#3a2d4f", shadow: "0 0 10px rgba(168, 85, 247, 0.18)" },
    orange: { name: "Amber", desc: "Warm warning", primary: "#f59e0b", primaryHov: "#fbbf24", primaryTxt: "#140c02", border: "#3a2e1a", borderFocus: "#f59e0b", textMuted: "#a08a5a", textDim: "#6b5a35", secondary: "#3a2e1a", secondaryHov: "#4a3c24", shadow: "0 0 10px rgba(245, 158, 11, 0.15)" },
    red: { name: "Hot Pink", desc: "Aggressive red", primary: "#ff0055", primaryHov: "#ff4d88", primaryTxt: "#140208", border: "#3a1a25", borderFocus: "#ff0055", textMuted: "#a05a72", textDim: "#6b3548", secondary: "#3a1a25", secondaryHov: "#4a2432", shadow: "0 0 10px rgba(255, 0, 85, 0.18)" },
    blue: { name: "Electric Blue", desc: "Classic blue", primary: "#3d8bfd", primaryHov: "#6eabff", primaryTxt: "#060a12", border: "#1a253a", borderFocus: "#3d8bfd", textMuted: "#5a7a9e", textDim: "#375065", secondary: "#1a253a", secondaryHov: "#253245", shadow: "0 0 10px rgba(61, 139, 253, 0.18)" },
    lime: { name: "Matrix Lime", desc: "Classic matrix", primary: "#b8ff00", primaryHov: "#d4ff5c", primaryTxt: "#0a1000", border: "#2a351a", borderFocus: "#b8ff00", textMuted: "#8a9e5a", textDim: "#5a6b35", secondary: "#2a351a", secondaryHov: "#384524", shadow: "0 0 10px rgba(184, 255, 0, 0.15)" },
    mono: { name: "Mono White", desc: "Minimal gray", primary: "#e0e0e0", primaryHov: "#ffffff", primaryTxt: "#0a0a0a", border: "#2a2a2a", borderFocus: "#e0e0e0", textMuted: "#888888", textDim: "#555555", secondary: "#2a2a2a", secondaryHov: "#3a3a3a", shadow: "0 0 10px rgba(224, 224, 224, 0.08)" }
};

function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function applyThemeVars(t) {
    const root = document.documentElement;
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-hov", t.primaryHov);
    root.style.setProperty("--primary-txt", t.primaryTxt);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--border-focus", t.borderFocus);
    root.style.setProperty("--text-muted", t.textMuted);
    root.style.setProperty("--text-dim", t.textDim);
    root.style.setProperty("--secondary", t.secondary);
    root.style.setProperty("--secondary-hov", t.secondaryHov);
    root.style.setProperty("--success", t.primary);
    root.style.setProperty("--shadow", t.shadow);
}

function themeFromAccent(hex) {
    const { r, g, b } = hexToRgb(hex);
    const lighten = (n, a) => Math.min(255, Math.round(n + (255 - n) * a));
    const darken = (n, a) => Math.max(0, Math.round(n * (1 - a)));
    const toHex = (r, g, b) => "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
    const primaryHov = toHex(lighten(r, 0.25), lighten(g, 0.25), lighten(b, 0.25));
    const border = toHex(darken(r, 0.75), darken(g, 0.75), darken(b, 0.75));
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return {
        name: "Custom", desc: hex, primary: hex, primaryHov, primaryTxt: luminance > 0.55 ? "#0a0a0a" : "#f0f0f0",
        border, borderFocus: hex,
        textMuted: toHex(Math.round(r * 0.35 + 90), Math.round(g * 0.35 + 90), Math.round(b * 0.35 + 90)),
        textDim: toHex(Math.round(r * 0.2 + 50), Math.round(g * 0.2 + 50), Math.round(b * 0.2 + 50)),
        secondary: border, secondaryHov: toHex(darken(r, 0.65), darken(g, 0.65), darken(b, 0.65)),
        shadow: `0 0 10px rgba(${r}, ${g}, ${b}, 0.15)`
    };
}

function setActiveThemeCard(id) {
    document.querySelectorAll(".theme-card").forEach(c => c.classList.toggle("active", c.dataset.theme === id));
}

function applyTheme(id, customHex) {
    let t;
    if (id === "custom" && customHex) {
        t = themeFromAccent(customHex);
        try { localStorage.setItem(THEME_KEY, "custom"); localStorage.setItem(CUSTOM_KEY, customHex); } catch (e) {}
        const hexInput = document.getElementById("customAccentHex");
        const colorInput = document.getElementById("customAccent");
        if (hexInput) hexInput.value = customHex;
        if (colorInput) colorInput.value = customHex;
        setActiveThemeCard("custom");
    } else {
        t = THEMES[id] || THEMES.neon;
        try { localStorage.setItem(THEME_KEY, id); localStorage.removeItem(CUSTOM_KEY); } catch (e) {}
        setActiveThemeCard(id);
        const colorInput = document.getElementById("customAccent");
        const hexInput = document.getElementById("customAccentHex");
        if (colorInput) colorInput.value = t.primary;
        if (hexInput) hexInput.value = t.primary;
    }
    applyThemeVars(t);
    log("Theme: " + (t.name || id));
}

function renderThemeGrid() {
    const grid = document.getElementById("themeGrid");
    if (!grid) return;
    let html = "";
    Object.keys(THEMES).forEach(id => {
        const t = THEMES[id];
        html += `<div class="theme-card" data-theme="${id}"><div class="swatch-row">
            <span class="swatch" style="background:${t.primary}"></span>
            <span class="swatch" style="background:${t.primaryHov}"></span>
            <span class="swatch" style="background:${t.border}"></span>
        </div><div class="theme-name">${t.name}</div><div class="theme-desc">${t.desc}</div></div>`;
    });
    html += `<div class="theme-card" data-theme="custom"><div class="swatch-row">
        <span class="swatch" style="background:conic-gradient(red,yellow,lime,aqua,blue,magenta,red)"></span>
    </div><div class="theme-name">Custom</div><div class="theme-desc">Color picker</div></div>`;
    grid.innerHTML = html;
    grid.querySelectorAll(".theme-card").forEach(card => {
        card.addEventListener("click", () => {
            const id = card.dataset.theme;
            if (id === "custom") applyTheme("custom", document.getElementById("customAccent")?.value || "#00ff66");
            else applyTheme(id);
        });
    });
}

document.getElementById("applyCustomAccent")?.addEventListener("click", () => {
    let hex = (document.getElementById("customAccentHex")?.value || "").trim();
    if (!/^#?[0-9a-fA-F]{3,6}$/.test(hex)) hex = document.getElementById("customAccent")?.value || "#00ff66";
    if (!hex.startsWith("#")) hex = "#" + hex;
    applyTheme("custom", hex);
});
document.getElementById("customAccent")?.addEventListener("input", (e) => {
    const hexInput = document.getElementById("customAccentHex");
    if (hexInput) hexInput.value = e.target.value;
});
document.getElementById("resetThemeBtn")?.addEventListener("click", () => applyTheme("neon"));

renderThemeGrid();
try {
    const saved = localStorage.getItem(THEME_KEY) || "neon";
    if (saved === "custom") applyTheme("custom", localStorage.getItem(CUSTOM_KEY) || "#00ff66");
    else applyTheme(saved);
} catch (e) { applyTheme("neon"); }




    function initTheme() {
        // renderThemeGrid + apply saved already run at end of extracted body
    }
    global.initTheme = initTheme;
    global.applyTheme = applyTheme;

})(typeof window !== "undefined" ? window : this);
