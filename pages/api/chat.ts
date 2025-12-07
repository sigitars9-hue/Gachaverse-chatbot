import type { NextApiRequest, NextApiResponse } from "next";
import mammoth from "mammoth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb"
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method Not Allowed" });
  }

  try {
    const { 
  messages, 
  imageBase64, 
  fileBase64, 
  fileType,
  systemPrompt // ✅ DARI PERSONA TXT
} = req.body;

// ✅ FALLBACK JIKA PERSONA TIDAK TERKIRIM
const finalSystemPrompt = systemPrompt || `
Kamu adalah AI default yang ramah, pintar, dan membantu.
`;


    let contents: any[] = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...(messages || [])
    ];

    // =========================
    // ✅ GAMBAR
    // =========================
    if (imageBase64) {
      contents.push({
        role: "user",
        parts: [
          { text: "Tolong jelaskan isi gambar ini secara detail." },
          {
            inline_data: {
              mime_type: "image/png",
              data: imageBase64
            }
          }
        ]
      });
    }

    // =========================
    // ✅ FILE PDF (LANGSUNG KE GEMINI TANPA pdf-parse)
    // =========================
    if (fileBase64 && fileType?.toLowerCase() === "pdf") {
      contents.push({
        role: "user",
        parts: [
          {
            text:
              "Ini adalah file PDF dalam bentuk base64. Tolong baca, ringkas, dan jelaskan isi utamanya."
          },
          {
            inline_data: {
              mime_type: "application/pdf",
              data: fileBase64
            }
          }
        ]
      });
    }

    // =========================
    // ✅ FILE DOCX (TETAP PAKAI MAMMOTH)
    // =========================
    if (fileBase64 && fileType?.toLowerCase() === "docx") {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });

      contents.push({
        role: "user",
        parts: [
          {
            text:
              "Ini adalah isi dokumen Word:\n\n" +
              result.value +
              "\n\nTolong ringkas dan jelaskan."
          }
        ]
      });
    }

    // =========================
    // ✅ KIRIM KE GEMINI
    // =========================
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      }
    );

    const data = await geminiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Yura tidak mendapat jawaban 😭";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("API ERROR:", err);
    return res.status(500).json({ reply: "ERROR SERVER" });
  }
}
