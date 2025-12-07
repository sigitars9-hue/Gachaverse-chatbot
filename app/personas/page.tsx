"use client";

import { useEffect, useState } from "react";

export default function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/personas")
      .then((res) => res.json())
      .then((data) => setPersonas(data))
      .catch(console.error);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">📖 Tentang Persona</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((p) => (
          <div
            key={p.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center gap-4">
              <img
                src={p.image}
                alt={p.name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-xs text-zinc-400">{p.role || "AI Persona"}</p>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
              {p.description || "Belum ada deskripsi persona."}
            </div>

            {p.prompt && (
              <details className="mt-3 text-xs text-zinc-400">
                <summary className="cursor-pointer text-zinc-300">
                  Lihat System Prompt
                </summary>
                <pre className="mt-2 bg-zinc-800 p-3 rounded text-[11px] overflow-auto">
                  {p.prompt}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
