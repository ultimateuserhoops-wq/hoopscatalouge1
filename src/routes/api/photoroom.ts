import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function fallback(src: string, error: string) {
  return json({ url: src, fallback: true, error });
}

export const Route = createFileRoute("/api/photoroom")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let src = "";
        try {
          ({ src = "" } = (await request.json()) as { src?: string });
          if (!src || typeof src !== "string") return json({ error: "src required" }, 400);

          const apiKey = process.env.PHOTOROOM_API_KEY;
          if (!apiKey) return fallback(src, "PHOTOROOM_API_KEY missing");

          const isDataUrl = src.startsWith("data:");
          const hash = createHash("sha256").update(src).digest("hex").slice(0, 32);
          const cacheKey = `photoroom-cache/${hash}.png`;

          let bucket: ReturnType<Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]["storage"]["from"]> | null = null;
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            bucket = supabaseAdmin.storage.from("hoops-catalog-images");
          } catch (error) {
            console.warn("PhotoRoom cache unavailable", error);
          }

          // Cache lookup (only http(s) sources — data URLs are transient)
          if (!isDataUrl && bucket) {
            const pub = bucket.getPublicUrl(cacheKey).data.publicUrl;
            try {
              const head = await fetch(pub, { method: "HEAD" });
              if (head.ok) return json({ url: pub, cached: true });
            } catch {
              /* miss — fall through */
            }
          }

          // Load source bytes
          let imgBlob: Blob;
          if (isDataUrl) {
            const [meta, b64] = src.split(",");
            const mime = meta.match(/data:([^;]+)/)?.[1] ?? "image/png";
            const buf = Buffer.from(b64, "base64");
            imgBlob = new Blob([buf], { type: mime });
          } else {
            const r = await fetch(src);
            if (!r.ok) return fallback(src, `fetch src ${r.status}`);
            imgBlob = await r.blob();
          }

          // PhotoRoom Remove Background API
          const fd = new FormData();
          fd.append("image_file", imgBlob, "input.png");
          fd.append("format", "png");
          const pr = await fetch("https://sdk.photoroom.com/v1/segment", {
            method: "POST",
            headers: { "x-api-key": apiKey, Accept: "image/png, application/json" },
            body: fd,
          });
          if (!pr.ok) {
            const text = await pr.text().catch(() => "");
            return fallback(src, `photoroom ${pr.status}: ${text.slice(0, 240)}`);
          }
          const outBytes = new Uint8Array(await pr.arrayBuffer());

          if (!isDataUrl && bucket) {
            const { error: upErr } = await bucket.upload(cacheKey, outBytes, {
              contentType: "image/png",
              upsert: true,
            });
            if (!upErr) {
              const pub = bucket.getPublicUrl(cacheKey).data.publicUrl;
              return json({ url: pub, cached: false });
            }
          }
          // Data URL or upload failed — return inline result
          const b64out = Buffer.from(outBytes).toString("base64");
          return json({ url: `data:image/png;base64,${b64out}`, cached: false });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return src ? fallback(src, msg) : json({ error: msg, fallback: true });
        }
      },
    },
  },
});