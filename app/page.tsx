"use client";
import ReactMarkdown from "react-markdown";
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Paperclip,
  Send,
  Image as ImageIcon,
  Trash2,
  Laptop,
  Menu,
  X,
  Pause,
  Sparkles,
  BookOpen,
  MoreVertical,
  Share2,
  Users,
  Pencil,
  Archive
} from "lucide-react";

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

type Msg = {
  role: "user" | "model";
  text?: string;
  image?: string;
  file?: { name: string; type: string };
};

export default function Home() {
const [menuPosition, setMenuPosition] = useState<"top" | "bottom">("bottom");

const [shareChat, setShareChat] = useState<any>(null);
const [publicLink, setPublicLink] = useState<string | null>(null);
const [shareLoading, setShareLoading] = useState(false);

const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
const STORAGE_KEY = "yura-chat-history-v1";

const [sessions, setSessions] = useState<any[]>([]);
const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

const activeSession = sessions.find(s => s.id === activeSessionId);
const messages = activeSession?.messages || [];

  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<{ base64: string; name: string; type: string } | null>(null);
  const [openHistory, setOpenHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activePersona, setActivePersona] = useState<any>(null);
  const [personas, setPersonas] = useState<any[]>([]);

  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);
const stopStreamRef = useRef(false);

  const [isThinking, setIsThinking] = useState(false);

function renameChat(chatId: string) {
  const newName = prompt("Masukkan nama baru:");

  if (!newName?.trim()) return;

  setSessions(prev =>
    prev.map(s =>
      s.id === chatId
        ? { ...s, title: newName }
        : s
    )
  );
}

function archiveChat(chatId: string) {
  setSessions(prev =>
    prev.map(s =>
      s.id === chatId
        ? { ...s, archived: true }
        : s
    )
  );
}


function generatePublicShare(chat: any) {
  setShareLoading(true);

  // Simpan ke localStorage sebagai readonly public data
  const publicId = "share_" + chat.id;

  localStorage.setItem(
    publicId,
    JSON.stringify({
      title: chat.title,
      messages: chat.messages,
      createdAt: Date.now()
    })
  );

  const link = `${window.location.origin}/share/${publicId}`;
  setPublicLink(link);
  setShareLoading(false);
}



function createNewChat(personaId?: string) {
  if (!personaId) return;

  const newSession = {
    id: Date.now().toString(),
    title: "Obrolan Baru",
    personaId,
    archived: false,
    messages: [],
    createdAt: Date.now()
  };

  setSessions(prev => [newSession, ...prev]);
  setActiveSessionId(newSession.id);
  setOpenHistory(false);
}




function streamLikeGPT(fullText: string, callback: (text: string) => void) {
  let index = 0;
  stopStreamRef.current = false;
  setIsStreaming(true); // ✅ mulai streaming

  function step() {
    if (stopStreamRef.current) {
      setIsStreaming(false); // ✅ stop manual
      return;
    }

    const chunkSize = Math.floor(Math.random() * 4) + 3; // 3–6 char
    index += chunkSize;

    callback(fullText.slice(0, index));

    if (index < fullText.length) {
      streamTimerRef.current = setTimeout(step, 20);
    } else {
      setIsStreaming(false); // ✅ selesai normal
    }
  }

  step();
}


function stopStreaming() {
  stopStreamRef.current = true;

  if (streamTimerRef.current) {
    clearTimeout(streamTimerRef.current);
  }

  setIsStreaming(false);
}


  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

function copyToClipboard(text: string, index: number) {
  try {
    // ✅ JALUR MODERN (HTTPS, desktop, dll)
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } 
    // ✅ JALUR AMAN UNTUK ANDROID + HTTP + IP
    else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);

  } catch (err) {
    alert("Gagal menyalin kode 😭");
    console.error(err);
  }
}
const [codingMode, setCodingMode] = useState(false);
const [livePreviewCode, setLivePreviewCode] = useState("");
const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "auto";
  };
}, []);

useEffect(() => {
  const close = () => setOpenMenuId(null);
  window.addEventListener("click", close);
  return () => window.removeEventListener("click", close);
}, []);


  // ✅ LOAD HISTORY
useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    setSessions(parsed);

    if (parsed.length > 0) {
      setActiveSessionId(parsed[0].id); // default session pertama
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}, []);




  // ✅ LOAD PERSONA DARI BACKEND
useEffect(() => {
  fetch("/api/personas")
    .then(res => res.json())
    .then(data => {
      setPersonas(data);

      // ✅ PERSONA PERTAMA JADI DEFAULT (YURA)
      if (data.length > 0) {
        setActivePersona(data[0]);
      }
    })
    .catch(err => {
      console.error("Gagal load persona:", err);
    });
}, []);

function runLiveJS(code: string) {
  const output: string[] = [];

  const fakeConsole = {
    log: (...args: any[]) => {
      output.push(args.join(" "));
    }
  };

  try {
    const fn = new Function("console", code);
    fn(fakeConsole);
  } catch (err: any) {
    output.push("❌ ERROR: " + err.message);
  }

  setConsoleOutput(output);
}

  // ✅ SAVE HISTORY
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [sessions]);


  function handleImageUpload(e: any) {
    const selected = e.target.files[0];
    if (!selected) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setFile(null);
    };
    reader.readAsDataURL(selected);
  }

  function handleFileUpload(e: any) {
    const selected = e.target.files[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop()?.toLowerCase() || "";

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setFile({ base64, name: selected.name, type: ext });
      setImage(null);
    };
    reader.readAsDataURL(selected);
  }
async function sendMessage() {
  if (!input.trim() && !image && !file) return;

  const newMsg: Msg = {
    role: "user",
    text: input || undefined,
    image: image || undefined,
    file: file || undefined
  };

  // ✅ Tambah ke session aktif
  setSessions(prev =>
    prev.map(session =>
      session.id === activeSessionId
        ? {
            ...session,
            title:
              session.messages.length === 0
                ? (newMsg.text || "Obrolan Baru").slice(0, 40)
                : session.title,
            messages: [...session.messages, newMsg]
          }
        : session
    )
  );

  setIsThinking(true);
  setInput("");

const updatedMessages =
  activeSession?.messages
    ? [...activeSession.messages, newMsg]
    : [newMsg];

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: activePersona?.prompt,
      messages: updatedMessages.map((m: Msg) => ({
        role: m.role,
        parts: [{ text: m.text || "" }]
      })),
      imageBase64: image ? image.split(",")[1] : null,
      fileBase64: file?.base64,
      fileType: file?.type
    })
  });

  const data = await res.json();
  setIsThinking(false);

  // ✅ Tambah bubble kosong AI
  setSessions(prev =>
    prev.map(session =>
      session.id === activeSessionId
        ? {
            ...session,
            messages: [...session.messages, { role: "model", text: "" }]
          }
        : session
    )
  );

  // ✅ Streaming
  streamLikeGPT(data.reply, (liveText) => {
    setSessions(prev =>
      prev.map(session => {
        if (session.id !== activeSessionId) return session;

        const updated = [...session.messages];
        updated[updated.length - 1] = {
          role: "model",
          text: liveText
        };

        return {
          ...session,
          messages: updated
        };
      })
    );
  });

  setImage(null);
  setFile(null);
}

  return (
    <main className="fixed inset-0 flex flex-col bg-zinc-950 text-white">


      {/* ✅ DRAWER HISTORY (MOBILE & DESKTOP) */}
<aside
  className={`fixed z-50 top-0 left-0 h-screen w-64 
  bg-zinc-900 border-r border-zinc-800
  transform transition-transform duration-300
  flex flex-col
  ${openHistory ? "translate-x-0" : "-translate-x-full"}`}
>
  {/* ✅ HEADER (TIDAK IKUT SCROLL) */}
  <div className="shrink-0 p-4 flex items-center justify-between border-b border-zinc-800">
    <h2 className="font-semibold">History</h2>
    <button onClick={() => setOpenHistory(false)}>✕</button>
  </div>

  {/* ✅ AREA YANG SCROLL */}
  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scrollbar-thin">

    {/* ✅ PERSONA */}
    <div>
      <h2 className="text-xs font-semibold text-zinc-400 mb-2">PERSONA</h2>

      <div className="space-y-2">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setActivePersona(p);

              const existing = sessions.find(
                (s: any) => s.personaId === p.id
              );

              if (existing) {
                setActiveSessionId(existing.id);
              } else {
                createNewChat(p.id);
              }

              setOpenHistory(false);
            }}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition
              ${activePersona?.id === p.id
                ? "bg-blue-600"
                : "hover:bg-zinc-800"
              }`}
          >
            <img
              src={p.image}
              className="w-8 h-8 rounded-full object-cover"
            />
            <span className="text-sm font-medium capitalize">
              {p.name}
            </span>
          </button>
        ))}
      </div>
    </div>

    {/* ✅ TOMBOL */}
<button
  onClick={() => {
    setCodingMode(true);
    setOpenHistory(false);
  }}
  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
>
  <Laptop className="w-5 h-5" />
  <span className="font-semibold text-sm">Mode Coding</span>
</button>


<button
  onClick={() => activePersona && createNewChat(activePersona.id)}
  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg text-white"
>
  <Plus className="w-5 h-5" />
  <span className="font-semibold text-sm">Obrolan Baru</span>
</button>


    {/* ✅ HISTORY DIPISAH PER PERSONA */}
    {personas.map((p) => {
      const chats = sessions.filter(
  (s: any) => s.personaId === p.id && !s.archived
);


      if (chats.length === 0) return null;

      return (
        <div key={p.id}>
          <h3 className="text-xs text-zinc-400 uppercase mb-2">
            {p.name}
          </h3>

          <div className="space-y-1">
            {chats.map((chat) => (
  <div key={chat.id} className="relative group">

    {/* ✅ ITEM HISTORY */}
    <button
      onClick={() => {
        setActiveSessionId(chat.id);
        setOpenHistory(false);
      }}
      className={`w-full text-left px-3 py-2 pr-10 rounded text-sm truncate transition
        ${activeSessionId === chat.id
          ? "bg-zinc-600 text-white"
          : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        }`}
    >
      {chat.title || "Obrolan Tanpa Judul"}
    </button>

    {/* ✅ TOMBOL ⋯ */}
    <button
  onClick={(e) => {
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < 200) {
      setMenuPosition("top");   // 🔼 buka ke atas
    } else {
      setMenuPosition("bottom"); // 🔽 buka ke bawah
    }

    setOpenMenuId(openMenuId === chat.id ? null : chat.id);
  }}
  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
>
  <MoreVertical className="w-4 h-4" />
</button>


    {/* ✅ DROPDOWN MENU */}
{openMenuId === chat.id && (
  <div
    className={`absolute right-2 z-50 w-48 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl overflow-hidden
      ${menuPosition === "top" ? "bottom-12" : "top-12"}
    `}
  >


    {/* ✅ BAGIKAN */}
<button
  onClick={() => {
    setShareChat(chat);
    setPublicLink(null);
    setOpenMenuId(null);
  }}
  className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-zinc-800"
>
  <Share2 className="w-4 h-4" /> Bagikan
</button>


    {/* ✅ GANTI NAMA */}
    <button
      onClick={() => {
        renameChat(chat.id);
        setOpenMenuId(null);
      }}
      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-zinc-800"
    >
      <Pencil className="w-4 h-4" /> Ganti nama
    </button>

    {/* ✅ ARSIPKAN */}
    <button
      onClick={() => {
        archiveChat(chat.id);
        setOpenMenuId(null);
      }}
      className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-zinc-800"
    >
      <Archive className="w-4 h-4" /> Arsipkan
    </button>

    {/* ✅ HAPUS */}
    <button
      onClick={() => {
        setSessions(prev => prev.filter(s => s.id !== chat.id));
        setOpenMenuId(null);
      }}
      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
    >
      <Trash2 className="w-4 h-4" /> Hapus
    </button>

  </div>
)}

  </div>
))}

          </div>
        </div>
      );
    })}

    {/* ✅ HAPUS CHAT */}
<button
  onClick={() => {
    setSessions(prev =>
      prev.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: [], title: "Obrolan Baru" }
          : session
      )
    );
    setOpenHistory(false);
  }}
  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg"
>
  <Trash2 className="w-5 h-5" />
  <span className="text-sm font-semibold">Hapus Chat Ini</span>
</button>


  </div>
</aside>


      {/* ✅ MAIN AREA */}
      <section className="flex flex-1 flex-col h-full">

        {/* ✅ HEADER */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-zinc-800 shrink-0">
          <button onClick={() => setOpenHistory(true)}>
  <Menu className="w-6 h-6" />
</button>

          <h1 className="font-semibold">Gachaverse.id</h1>
          <div className="w-6" />
        </div>

        {/* ✅ CHAT AREA */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.map((msg: Msg, i: number) => (

<div
  key={i}
  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
    msg.role === "user"
      ? "ml-auto bg-blue-600 max-w-[88%]"
      : "mr-auto bg-zinc-800 max-w-[82%]"
  }`}
>

              {msg.text && (
<div className="prose prose-invert max-w-none text-sm leading-relaxed">
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
  components={{
    code({ className, children }: any) {
      const match = /language-(\w+)/.exec(className || "");
      const codeText = String(children).replace(/\n$/, "");
      const lang = match?.[1] || "text";

      return match ? (
        <div className="relative my-3 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">

          {/* ✅ HEADER GPT-STYLE */}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-zinc-800 text-zinc-200">
            <span className="uppercase font-medium">{lang}</span>

            <button
              onClick={() => copyToClipboard(codeText, codeText.length)}
              className="flex items-center gap-1 text-zinc-300 hover:text-white transition"
            >
              📋 {copiedIndex === codeText.length ? "Tersalin" : "Salin kode"}
            </button>
          </div>

          {/* ✅ CODE AREA */}
          <SyntaxHighlighter
            language={lang}
            style={oneDark as any}
            PreTag="div"
            customStyle={{
              background: "transparent",
              margin: 0,
              padding: "12px",
              fontSize: "13px"
            }}
            className="overflow-x-auto"
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">
          {children}
        </code>
      );
    }
  }}
>
  {msg.text}
</ReactMarkdown>



</div>

)}


              {msg.image && (
                <img
                  src={msg.image}
                  className="mt-2 rounded-lg max-w-full"
                />
              )}

              {msg.file && (
                <div className="flex items-center gap-3 bg-zinc-900 rounded-full px-4 py-2 pr-3">
                  <Paperclip className="w-4 h-4" />

                  <span className="text-xs">{msg.file.name}</span>
                </div>
              )}
            </div>
          ))}
{/* ✅ MODE BERPIKIR (BELUM ADA STREAM) */}
{isThinking && !isStreaming && (
  <div className="mr-auto max-w-[70%] rounded-2xl px-4 py-3 text-sm bg-zinc-800 shadow-sm">
    <span className="shimmer-text font-medium">
      ✨ Yura sedang berpikir...
    </span>
  </div>
)}

{/* ✅ MODE STREAMING (TOMBOL STOP MUNCUL DI SINI) */}
{isStreaming && (
  <div className="mr-auto flex items-center gap-3 max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-zinc-800 shadow-sm">
    <span className="text-zinc-300 italic">
      Yura sedang mengetik...
    </span>

    <button
      onClick={stopStreaming}
      className="ml-auto text-xs bg-zinc-700 hover:bg-red-600 px-3 py-1 rounded transition"
    >
      ⏸ Stop
    </button>
  </div>
)}



          <div ref={bottomRef} />
        </div>

        {/* ✅ INPUT FIXED BOTTOM (SAFE AREA) */}
        <div
  className="border-t border-zinc-800 p-3 shrink-0 bg-zinc-950"
  style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
>


          {(image || file) && (
            <div className="mb-2 flex items-center gap-3 bg-zinc-900 p-2 rounded">
              {image && <img src={image} className="h-10 w-10 object-cover rounded" />}
              {file && <span className="text-xs">📄 {file.name}</span>}
              <button
                onClick={() => {
                  setImage(null);
                  setFile(null);
                }}
                className="ml-auto text-red-400"
              >
                ✕
              </button>
            </div>
          )}

<div className="bg-zinc-900 rounded-2xl px-4 py-2 pr-3">
  <div className="flex items-center gap-3 min-h-[44px]">

    {/* ✅ ICON GAMBAR — SEKARANG BENAR-BENAR CENTER */}
    <label className="cursor-pointer flex items-center justify-center w-9 h-9 text-zinc-400 hover:text-white transition">
      <ImageIcon className="w-5 h-5" />
      <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
    </label>

    {/* ✅ ICON FILE — SEKARANG BENAR-BENAR CENTER */}
    <label className="cursor-pointer flex items-center justify-center w-9 h-9 text-zinc-400 hover:text-white transition">
      <Paperclip className="w-5 h-5" />
      <input type="file" onChange={handleFileUpload} hidden />
    </label>

    {/* ✅ TEXTAREA — BOLEH MEMBESAR, ICON TETAP DI TENGAH */}
    <textarea
      value={input}
      onChange={(e) => {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }}
      placeholder="Ketik perintah dulu sebelum kirim..."
      className="
        flex-1
        bg-transparent
        outline-none
        text-[14px]
        resize-none
        leading-[1.5]
        max-h-[140px]
        pt-[10px]
        pb-[6px]
      "
      style={{ minHeight: "24px" }}
    />

    {/* ✅ TOMBOL KIRIM — JUGA CENTER */}
    <button
      onClick={sendMessage}
      className="bg-blue-600 hover:bg-blue-500 transition w-10 h-10 rounded-full flex items-center justify-center shrink-0"
    >
      <Send className="w-5 h-5" />
    </button>

  </div>
</div>


        </div>
      </section>
      {codingMode && (

  <div className="fixed inset-0 z-[999] bg-zinc-950 flex flex-col">

    {/* ✅ HEADER CODING */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
      <h2 className="text-sm font-semibold">Live JS Playground</h2>
      <button
        onClick={() => setCodingMode(false)}
        className="text-sm bg-red-600 px-3 py-1 rounded"
      >
        Tutup
      </button>
    </div>

    {/* ✅ EDITOR */}
    <textarea
      value={livePreviewCode}
      onChange={(e) => setLivePreviewCode(e.target.value)}
      placeholder={`// Tulis JS di sini\nconsole.log("Halo dari Live Preview!")`}
      className="flex-1 bg-zinc-900 text-white p-4 font-mono text-sm outline-none resize-none"
    />

    {/* ✅ CONTROLS */}
    <div className="flex gap-3 px-4 py-3 border-t border-zinc-800">
      <button
        onClick={() => runLiveJS(livePreviewCode)}
        className="bg-blue-600 px-4 py-2 rounded text-sm"
      >
        Jalankan
      </button>

      <button
        onClick={() => {
          setLivePreviewCode("");
          setConsoleOutput([]);
        }}
        className="bg-zinc-700 px-4 py-2 rounded text-sm"
      >
        Reset
      </button>
    </div>

    {/* ✅ OUTPUT */}
    <div className="bg-black text-green-400 p-3 text-xs font-mono max-h-40 overflow-y-auto">
      {consoleOutput.length === 0 && <div>// Output akan muncul di sini</div>}
      {consoleOutput.map((line, i) => (
        <div key={i}> {line}</div>
      ))}
    </div>
  </div>
)}
{/* ✅ SHARE STYLE CHATGPT */}
{shareChat && (
  <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end">

    <div className="w-full bg-zinc-900 rounded-t-3xl p-5 animate-slideUp">

      {/* ✅ HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">
          Bagikan obrolan
        </h2>
        <button onClick={() => setShareChat(null)}>
          <X className="w-5 h-5 text-zinc-400 hover:text-white" />
        </button>
      </div>

      {/* ✅ PREVIEW CHAT */}
      <div className="bg-zinc-800 rounded-xl p-4 text-sm text-zinc-200 mb-4 max-h-40 overflow-y-auto">
        <div className="font-semibold mb-1 truncate">
          {shareChat.title}
        </div>
        <div className="text-zinc-400 text-xs line-clamp-4">
          {shareChat.messages?.[0]?.text || "Tidak ada isi pesan"}
        </div>
      </div>

      {/* ✅ BUTTON BAR */}
      <div className="grid grid-cols-4 gap-4 text-center">

        {/* ✅ COPY LINK */}
        <button
          onClick={() => {
            if (!publicLink) {
              generatePublicShare(shareChat);
            } else {
              navigator.clipboard.writeText(publicLink);
              alert("✅ Tautan disalin");
            }
          }}
          className="flex flex-col items-center gap-2 text-zinc-200"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-xs">Salin</span>
        </button>

        {/* ✅ X / TWITTER */}
        <a
          href={publicLink ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(publicLink)}` : "#"}
          target="_blank"
          className="flex flex-col items-center gap-2 text-zinc-200"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <X className="w-5 h-5" />
          </div>
          <span className="text-xs">X</span>
        </a>

        {/* ✅ LINKEDIN */}
        <a
          href={publicLink ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicLink)}` : "#"}
          target="_blank"
          className="flex flex-col items-center gap-2 text-zinc-200"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xs">LinkedIn</span>
        </a>

        {/* ✅ REDDIT */}
        <a
          href={publicLink ? `https://www.reddit.com/submit?url=${encodeURIComponent(publicLink)}` : "#"}
          target="_blank"
          className="flex flex-col items-center gap-2 text-zinc-200"
        >
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs">Reddit</span>
        </a>

      </div>
    </div>
  </div>
)}

    </main>
  );
}
