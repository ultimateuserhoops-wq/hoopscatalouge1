import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KIE_BASE = "https://api.kie.ai/api/v1/veo";
const KIE_CHAT = "https://api.kie.ai/v1/chat/completions";

function getKieKey() {
  const k = process.env.KIE_API_KEY;
  if (!k) throw new Error("KIE_API_KEY missing on server");
  return k;
}

// 1) Build Veo prompt using Lovable AI from product + colorways
export const generateVeoPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        productName: z.string().min(1).max(200),
        productCategory: z.string().min(1).max(200),
        colors: z
          .array(
            z.object({
              name: z.string().min(1).max(80),
              hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            })
          )
          .min(1)
          .max(20),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const colorList = data.colors
      .map((c, i) => `${i + 1}. ${c.name} (${c.hex})`)
      .join("\n");

    const system =
      "You are a creative director writing prompts for Google Veo 3.1 to generate cinematic 8-second basketball product videos. Output ONLY the final prompt text — no preamble, no headings, no quotes.";

    const user = `Write a single, vivid Veo 3.1 video prompt (max 700 chars) for this product:

PRODUCT: ${data.productName} (${data.productCategory})

SHOT REQUIREMENTS:
- A pro basketball player on an indoor court, slow-motion cinematic 35mm look
- Action sequence: dribbling → crossover → drive → explosive dunk OR fade-away jump shot
- The player is wearing the ${data.productName}
- During the action, the uniform MUST visibly cycle through these colorways one by one in sync with the beats of the motion (each color holds ~1s before morphing/transitioning seamlessly to the next):
${colorList}
- Dramatic rim lighting, dust particles, shallow depth of field, sweat detail
- Camera: smooth tracking + low-angle hero shot, 24fps cinema
- No text, no logos other than what's on the jersey, no on-screen captions

Write the prompt now as one flowing paragraph.`;

    const res = await fetch(KIE_CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getKieKey()}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) throw new Error("KIE rate limit — try again shortly");
    if (res.status === 401) throw new Error("KIE_API_KEY invalid");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`KIE chat error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    const prompt = (typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((p: any) => p?.text || "").join("")
        : ""
    ).trim();
    if (!prompt) throw new Error("Empty prompt from Claude");
    return { prompt };
  });

// 2) Start a Veo 3.1 job on KIE.AI
export const startKieVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        prompt: z.string().min(10).max(2000),
        aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
        model: z.enum(["veo3_1_fast", "veo3_1"]).default("veo3_1_fast"),
      })
      .parse(input)
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${KIE_BASE}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getKieKey()}`,
      },
      body: JSON.stringify({
        prompt: data.prompt,
        model: data.model,
        aspectRatio: data.aspectRatio,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.code !== 200) {
      throw new Error(json?.msg || `KIE error ${res.status}`);
    }
    const taskId = json?.data?.taskId;
    if (!taskId) throw new Error("KIE returned no taskId");
    return { taskId: String(taskId) };
  });

// 3) Poll a Veo job
export const pollKieVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ taskId: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data }) => {
    const res = await fetch(
      `${KIE_BASE}/record-info?taskId=${encodeURIComponent(data.taskId)}`,
      { headers: { Authorization: `Bearer ${getKieKey()}` } }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.code !== 200) {
      throw new Error(json?.msg || `KIE poll error ${res.status}`);
    }
    const d = json?.data || {};
    const flag = d.successFlag; // 0 generating, 1 success, 2/3 failed
    const urls: string[] =
      d?.response?.resultUrls || d?.response?.result_urls || [];
    return {
      status:
        flag === 1 ? "success" : flag === 0 ? "pending" : "failed",
      videoUrl: urls[0] || null,
      errorMessage: d?.errorMessage || null,
    } as const;
  });