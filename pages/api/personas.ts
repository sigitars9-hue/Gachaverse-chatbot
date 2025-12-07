// pages/api/personas.ts
import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const dir = path.join(process.cwd(), "public", "persona_profiles");

    if (!fs.existsSync(dir)) {
      return res.status(404).json({
        error: "Folder persona_profiles tidak ditemukan di /public"
      });
    }

    const files = fs.readdirSync(dir);

    const personas = files
      .filter((f) => f.endsWith(".txt"))
      .map((file) => {
        const name = file.replace(".txt", "");
        const text = fs.readFileSync(path.join(dir, file), "utf-8");
        const imagePath = `/persona_profiles/${name}.jpg`;

        return {
          id: name,
          name,
          description: text.split("\n")[0] || "Tanpa deskripsi",
          prompt: text,
          image: imagePath
        };
      });

    res.status(200).json(personas);
  } catch (err) {
    res.status(500).json({ error: "Gagal membaca persona" });
  }
}
