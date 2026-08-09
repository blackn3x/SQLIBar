browser.runtime.onMessage.addListener((message) => {

    if (message.action !== "inject") return;

    // Bevorzugt die fertige URL, sonst Fallback auf Payload
    const targetUrl = message.url || null;
    const payload   = message.payload;

    console.log("[SQLi Tester] Inject:", { targetUrl, payload });

    try {
        if (targetUrl) {
            // Genau die URL öffnen, die im Panel als Ergebnis steht
            window.location.href = targetUrl;
            return;
        }

        // Fallback: Payload an bestehende Parameter anhängen (nicht überschreiben)
        if (!payload) return;

        const url = new URL(window.location.href);
        const paramKeys = Array.from(url.searchParams.keys());

        if (paramKeys.length === 0) {
            url.searchParams.set("id", payload);
        } else {
            paramKeys.forEach(key => {
                const current = url.searchParams.get(key) || "";
                url.searchParams.set(key, current + payload);   // anhängen statt überschreiben
            });
        }

        window.location.href = url.toString();

    } catch (e) {
        console.warn("[SQLi Tester] URL rewrite failed", e);
    }
});
