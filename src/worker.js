/* Portfolio backend: one Cloudflare Worker + one D1 database.
   - The public site reads its content from GET /api/content
   - You edit that content in /admin/ (password protected)
   - Photos, certificates and your CV are stored in the database and served from /media/<id>
   - Visitors can send a recommendation or a message (saved in your inbox, never published automatically) */

const enc = new TextEncoder();
const MAX_JSON = 900000;      // bytes of site content
const MAX_MEDIA = 1300000;    // bytes per uploaded file
const TOKEN_HOURS = 12;
const LIST_KEYS = ["profiles","experience","education","certifications","skills","pubs","interests","projects",
  "achievements","recommendations","activities","languages","gallery","references","sections","profilesOther"];
const MAGIC = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
  "application/pdf": [0x25, 0x50, 0x44, 0x46]
};

const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...extra }
});
const err = (message, status = 400) => json({ error: message }, status);
const isEmail = v => /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(v);
const HAS_LINK = /(https?:\/\/|www\.)/i;

/* ---------- small crypto helpers ---------- */
const hex = u8 => [...new Uint8Array(u8)].map(b => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }
async function hmacHex(secret, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const ipKey = async req => (await sha256Hex("ip:" + (req.headers.get("cf-connecting-ip") || "local"))).slice(0, 16);

/* ---------- tiny rate limiter (stored in D1) ---------- */
async function count(env, key, windowMs) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM rate WHERE key = ? AND ts > ?").bind(key, Date.now() - windowMs).first();
  return r ? r.n : 0;
}
async function hit(env, key) {
  await env.DB.prepare("INSERT INTO rate(key, ts) VALUES(?, ?)").bind(key, Date.now()).run();
  if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM rate WHERE ts < ?").bind(Date.now() - 86400000).run();
}

/* ---------- admin session ---------- */
async function authed(req, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = t.split(".");
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEq(sig, await hmacHex(env.ADMIN_PASSWORD, "t." + exp));
}

async function login(req, env) {
  if (!env.ADMIN_PASSWORD) return err("ADMIN_PASSWORD has not been set on the server yet.", 500);
  const key = "login:" + await ipKey(req);
  if (await count(env, key, 15 * 60000) >= 8) return err("Too many wrong attempts. Please wait 15 minutes.", 429);
  let b; try { b = await req.json(); } catch (e) { return err("Bad request."); }
  const a = await sha256Hex(String(b.password || "")), c = await sha256Hex(env.ADMIN_PASSWORD);
  if (!safeEq(a, c)) { await hit(env, key); return err("Wrong password.", 401); }
  const exp = Date.now() + TOKEN_HOURS * 3600000;
  return json({ token: exp + "." + await hmacHex(env.ADMIN_PASSWORD, "t." + exp), expires: exp });
}

/* ---------- site content ---------- */
const publicRec = r => ({
  id: r.id, type: r.type || "", quote: r.text, name: r.name, position: r.position || "", org: r.org || "",
  relation: r.relation || "", reply: r.reply || "", created: r.created, visitor: true,
  ...(r.show_email ? { email: r.email } : {})
});
async function getContent(env, raw) {
  const row = await env.DB.prepare("SELECT value, version, updated FROM content WHERE key = 'site'").first();
  const body = row ? { data: JSON.parse(row.value), version: row.version, updated: row.updated } : { data: null, version: 0 };
  if (!raw) {
    const rr = await env.DB.prepare("SELECT * FROM recs WHERE status = 'published' ORDER BY id DESC LIMIT 200").all();
    body.visitorRecs = (rr.results || []).map(publicRec);
  }
  return json(body, 200, { "cache-control": "no-cache" });
}

function validContent(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return "Content must be an object.";
  for (const k of LIST_KEYS) if (k in d && !Array.isArray(d[k])) return `"${k}" must be a list.`;
  return null;
}

async function saveContent(env, text, base) {
  const cur = await env.DB.prepare("SELECT version FROM content WHERE key = 'site'").first();
  const curV = cur ? cur.version : 0;
  if (base != null && Number(base) !== curV) return err("The site was changed somewhere else. Reload this page, then save again.", 409);
  const v = curV + 1, now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO content(key, value, version, updated) VALUES('site', ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, version = excluded.version, updated = excluded.updated").bind(text, v, now),
    env.DB.prepare("INSERT INTO history(version, value, created) VALUES(?, ?, ?)").bind(v, text, now),
    env.DB.prepare("DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY id DESC LIMIT 25)")
  ]);
  return json({ ok: true, version: v, updated: now });
}

async function putContent(req, env) {
  const text = await req.text();
  if (text.length > MAX_JSON + 20000) return err("The content is too large. Remove embedded images (upload them instead).", 413);
  let b; try { b = JSON.parse(text); } catch (e) { return err("Bad request."); }
  const bad = validContent(b.data);
  if (bad) return err(bad);
  const out = JSON.stringify(b.data);
  if (out.length > MAX_JSON) return err("The content is too large. Remove embedded images (upload them instead).", 413);
  return saveContent(env, out, b.base);
}

async function history(env) {
  const r = await env.DB.prepare("SELECT id, version, created, length(value) AS size FROM history ORDER BY id DESC").all();
  return json({ items: r.results || [] });
}
async function restore(req, env) {
  let b; try { b = await req.json(); } catch (e) { return err("Bad request."); }
  const row = await env.DB.prepare("SELECT value FROM history WHERE id = ?").bind(Number(b.id)).first();
  if (!row) return err("That version no longer exists.", 404);
  return saveContent(env, row.value, null);
}

/* ---------- media (photos, certificates, CV) ---------- */
function toB64(buf) {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
const safeName = n => String(n || "file").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "file";

async function postMedia(req, env, url) {
  const mime = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const magic = MAGIC[mime];
  if (!magic) return err("Only JPG, PNG, WebP or PDF files are allowed.");
  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_MEDIA) return err("That file is larger than 1.3 MB. Use a smaller image, or for a CV paste a Google Drive link.", 413);
  const head = new Uint8Array(buf.slice(0, 4));
  if (!magic.every((b, i) => head[i] === b)) return err("The file content does not match its type.");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 20), name = safeName(url.searchParams.get("name"));
  await env.DB.prepare("INSERT INTO media(id, mime, name, size, data, created) VALUES(?, ?, ?, ?, ?, ?)")
    .bind(id, mime, name, buf.byteLength, toB64(buf), new Date().toISOString()).run();
  return json({ ok: true, id, url: "/media/" + id });
}
async function listMedia(env) {
  const r = await env.DB.prepare("SELECT id, mime, name, size, created FROM media ORDER BY created DESC").all();
  return json({ items: (r.results || []).map(m => ({ ...m, url: "/media/" + m.id })) });
}
async function deleteMedia(env, id) {
  await env.DB.prepare("DELETE FROM media WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
async function getMedia(req, env, ctx, id) {
  if (!/^[a-f0-9]{8,32}$/.test(id)) return new Response("Not found", { status: 404 });
  const q = new URL(req.url).searchParams, asDownload = q.get("download") === "1";
  const cache = typeof caches !== "undefined" ? caches.default : null;
  if (cache) { const c = await cache.match(req); if (c) return c; }
  const row = await env.DB.prepare("SELECT mime, name, data FROM media WHERE id = ?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  const bin = atob(row.data), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const fname = safeName(q.get("fn") || row.name);
  const h = {
    "content-type": row.mime,
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "cross-origin-resource-policy": "same-origin",
    "content-disposition": `${asDownload ? "attachment" : "inline"}; filename="${fname}"`
  };
  if (row.mime !== "application/pdf") h["content-security-policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";   // an image can never run code
  const res = new Response(u, { headers: h });
  if (cache && ctx) ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}

/* ---------- messages and recommendations from visitors ---------- */
async function submit(req, env) {
  const text = await req.text();
  if (text.length > 20000) return err("That message is too long.", 413);
  let b; try { b = JSON.parse(text); } catch (e) { return err("Bad request."); }
  if (b.website) return json({ ok: true });                      // hidden field: bots fill it, people do not
  const clip = (v, n) => String(v || "").replace(/\[\[|\]\]/g, "").trim().slice(0, n);
  const kind = b.kind === "recommendation" ? "recommendation" : "message";
  const rec = { name: clip(b.name, 120), email: clip(b.email, 200), text: clip(b.text, 3000) };
  if (!rec.name || !rec.text || !isEmail(rec.email)) return err("Please fill in your name, a valid email and your message.");
  if (kind === "recommendation") { rec.position = clip(b.position, 200); rec.org = clip(b.org, 200); rec.relation = clip(b.relation, 200); }
  const key = "sub:" + await ipKey(req);
  if (await count(env, key, 3600000) >= 5) return err("Too many messages from this connection. Please try again later.", 429);
  await hit(env, key);
  await env.DB.prepare("INSERT INTO submissions(kind, payload, created) VALUES(?, ?, ?)").bind(kind, JSON.stringify(rec), new Date().toISOString()).run();
  return json({ ok: true });
}
async function listSubmissions(env) {
  const r = await env.DB.prepare("SELECT id, kind, payload, created FROM submissions ORDER BY id DESC LIMIT 200").all();
  return json({ items: (r.results || []).map(s => ({ id: s.id, kind: s.kind, created: s.created, ...JSON.parse(s.payload) })) });
}

/* ---------- recommendations written by visitors (shown on the site) ---------- */
async function autoPublishOn(env) {
  const r = await env.DB.prepare("SELECT json_extract(value, '$.settings.recAutoPublish') AS v FROM content WHERE key = 'site'").first();
  return !(r && (r.v === 0 || r.v === "0" || r.v === false));      // on unless you switched it off
}
async function recommend(req, env) {
  const text = await req.text();
  if (text.length > 20000) return err("That is too long.", 413);
  let b; try { b = JSON.parse(text); } catch (e) { return err("Bad request."); }
  if (b.website) return json({ ok: true, published: false });      // hidden field: bots fill it, people do not
  const noMark = v => String(v).replace(/\[\[|\]\]/g, "");
  const one = (v, n) => noMark(String(v || "")).replace(/\s+/g, " ").trim().slice(0, n);
  const quote = noMark(String(b.text || "")).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2000);
  const rec = { name: one(b.name, 120), email: one(b.email, 200), position: one(b.position, 160), org: one(b.org, 160), relation: one(b.relation, 160), type: one(b.type, 60) };
  if (!rec.name || !isEmail(rec.email) || quote.length < 20) return err("Please fill in your name, a valid email and a recommendation of at least 20 characters.");
  if (HAS_LINK.test([quote, rec.name, rec.position, rec.org, rec.relation].join(" "))) return err("Please do not include web links.");
  if (Number(b.t) && Date.now() - Number(b.t) < 3000) return err("That was very quick. Please check your text and press Send again.");
  const ip = await ipKey(req), key = "rec:" + ip;
  if (await count(env, key, 3600000) >= 3) return err("Too many recommendations from this connection. Please try again later.", 429);
  const dup = await env.DB.prepare("SELECT status FROM recs WHERE email = ? AND text = ? LIMIT 1").bind(rec.email, quote).first();
  if (dup) return json({ ok: true, published: dup.status === "published" });       // pressed twice: do not add it twice
  // switched off by you, or a sudden burst (more than 10 in an hour): wait for your approval
  const auto = await autoPublishOn(env) && await count(env, "rec-all", 3600000) < 10;
  await hit(env, key); await hit(env, "rec-all");
  await env.DB.prepare("INSERT INTO recs(name, email, position, org, relation, type, text, show_email, status, created) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(rec.name, rec.email, rec.position, rec.org, rec.relation, rec.type, quote, b.showEmail ? 1 : 0, auto ? "published" : "pending", new Date().toISOString()).run();
  return json({ ok: true, published: auto });
}
async function listRecs(env) {
  const r = await env.DB.prepare("SELECT * FROM recs ORDER BY id DESC LIMIT 500").all();
  return json({ items: r.results || [] });
}
async function updateRec(req, env, id) {
  let b; try { b = await req.json(); } catch (e) { return err("Bad request."); }
  const sets = [], vals = [];
  if (b.status !== undefined) {
    if (!["published", "hidden", "pending"].includes(b.status)) return err("Bad status.");
    sets.push("status = ?"); vals.push(b.status);
  }
  if (b.reply !== undefined) { sets.push("reply = ?", "replied = ?"); vals.push(String(b.reply).trim().slice(0, 1000), new Date().toISOString()); }
  if (b.type !== undefined) { sets.push("type = ?"); vals.push(String(b.type).trim().slice(0, 60)); }
  if (b.show_email !== undefined) { sets.push("show_email = ?"); vals.push(b.show_email ? 1 : 0); }
  if (!sets.length) return err("Nothing to change.");
  await env.DB.prepare(`UPDATE recs SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id).run();
  return json({ ok: true });
}

/* ---------- router ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname, m = req.method;
    if (!p.startsWith("/api/") && !p.startsWith("/media/")) {
      return env.ASSETS ? env.ASSETS.fetch(req) : new Response("Not found", { status: 404 });
    }
    try {
      if (!env.DB) return err("The database is not connected. Check wrangler.toml.", 500);
      if (m !== "GET" && m !== "HEAD") {                              // browsers from other websites are refused
        const origin = req.headers.get("origin");
        if (origin) { let host = ""; try { host = new URL(origin).host; } catch (e) {} if (host !== url.host) return err("Not allowed.", 403); }
      }

      // public
      if (p === "/api/content" && m === "GET") return await getContent(env, url.searchParams.get("raw") === "1");
      if (p === "/api/login" && m === "POST") return await login(req, env);
      if (p === "/api/submit" && m === "POST") return await submit(req, env);
      if (p === "/api/recommend" && m === "POST") return await recommend(req, env);
      if (p.startsWith("/media/") && m === "GET") return await getMedia(req, env, ctx, p.slice(7));

      // admin only
      if (!(await authed(req, env))) return err("Please log in again.", 401);
      if (p === "/api/content" && m === "PUT") return await putContent(req, env);
      if (p === "/api/history" && m === "GET") return await history(env);
      if (p === "/api/restore" && m === "POST") return await restore(req, env);
      if (p === "/api/media" && m === "GET") return await listMedia(env);
      if (p === "/api/media" && m === "POST") return await postMedia(req, env, url);
      if (p.startsWith("/api/media/") && m === "DELETE") return await deleteMedia(env, p.slice(11));
      if (p === "/api/recs" && m === "GET") return await listRecs(env);
      if (p.startsWith("/api/recs/") && m === "PUT") return await updateRec(req, env, Number(p.slice(10)));
      if (p.startsWith("/api/recs/") && m === "DELETE") {
        await env.DB.prepare("DELETE FROM recs WHERE id = ?").bind(Number(p.slice(10))).run();
        return json({ ok: true });
      }
      if (p === "/api/submissions" && m === "GET") return await listSubmissions(env);
      if (p.startsWith("/api/submissions/") && m === "DELETE") {
        await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(Number(p.slice(17))).run();
        return json({ ok: true });
      }
      return err("Not found.", 404);
    } catch (e) {
      return err("Server error. Please try again.", 500);
    }
  }
};
