browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === "setCookies") {
    const { url, cookies } = msg;
    if (!url || !Array.isArray(cookies)) {
      sendResponse({ ok: false, error: "url/cookies missing" });
      return true;
    }
    (async () => {
      const results = [];
      let origin;
      try { origin = new URL(url).origin; }
      catch (e) { sendResponse({ ok: false, error: "invalid url" }); return; }

      for (const c of cookies) {
        if (!c || !c.name) continue;
        const name = String(c.name).trim();
        const value = c.value == null ? "" : String(c.value);
        try {
          try { await browser.cookies.remove({ url: origin + "/", name }); } catch (_) {}
          try { await browser.cookies.remove({ url: url, name }); } catch (_) {}
          const set = await browser.cookies.set({
            url: origin + "/",
            name,
            value,
            path: "/",
            secure: origin.startsWith("https:")
          });
          results.push({ name, ok: true, value: set && set.value });
        } catch (err) {
          results.push({ name, ok: false, error: String(err && err.message || err) });
        }
      }
      let store = [];
      try { store = await browser.cookies.getAll({ url: origin + "/" }); } catch (_) {}
      sendResponse({ ok: true, results, store: store.map(x => x.name + "=" + x.value) });
    })();
    return true;
  }

  if (msg.action === "getCookies") {
    (async () => {
      try {
        const list = await browser.cookies.getAll({ url: msg.url });
        sendResponse({ ok: true, cookies: list });
      } catch (err) {
        sendResponse({ ok: false, error: String(err && err.message || err) });
      }
    })();
    return true;
  }

  if (msg.action === "inject") {
    sendResponse({ ok: true });
    return true;
  }

  // ── Fetch via background (bypasses panel CORS) ──────────────────────────
  if (msg.action === "fetchUrl") {
    (async () => {
      try {
        if (!msg.url) {
          sendResponse({ ok: false, error: "url missing" });
          return;
        }
        const method = (msg.method || "GET").toUpperCase();
        const opts = {
          method,
          redirect: "follow",
          // Background has host permissions → no CORS preflight from page rules
          credentials: msg.credentials === "include" ? "include" : "omit"
        };
        if (msg.headers && typeof msg.headers === "object") {
          const h = {};
          for (const [k, v] of Object.entries(msg.headers)) {
            if (k && v != null) h[k] = String(v);
          }
          if (Object.keys(h).length) opts.headers = h;
        }
        if (msg.body != null && method !== "GET" && method !== "HEAD") {
          opts.body = msg.body;
        }

        const t0 = Date.now();
        const res = await fetch(msg.url, opts);
        const text = method === "HEAD" ? "" : await res.text();
        const ms = Date.now() - t0;
        const headers = [];
        try {
          res.headers.forEach((v, k) => headers.push([k, v]));
        } catch (_) {}

        sendResponse({
          ok: true,
          status: res.status,
          statusText: res.statusText || "",
          headers,
          body: text,
          ms
        });
      } catch (err) {
        sendResponse({
          ok: false,
          error: String(err && err.message || err)
        });
      }
    })();
    return true; // async sendResponse
  }
});
