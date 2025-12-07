import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public/persona_profiles");
    const files = fs.readdirSync(dir);

    const personas = files
      .filter((f) => f.endsWith(".txt"))
      .map((file) => {
        const name = file.replace(".txt", "");
        return {
          id: name,
          name: name,
          txt: `/persona_profiles/${name}.txt`,
          img: `/persona_profiles/${name}.jpg`
        };
      });

    return NextResponse.json(personas);
  } catch (err) {
    return NextResponse.json([], { status: 500 });
  }
}
