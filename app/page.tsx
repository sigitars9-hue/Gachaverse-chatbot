"use client";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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
  Archive,
  ArrowDown
} from "lucide-react";

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import dynamic from "next/dynamic";

const SyntaxHighlighter = dynamic<any>(
  () =>
    import("react-syntax-highlighter").then((mod) => mod.Prism),
  { ssr: false }
);

import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";

type Msg = {
  id: string;
  role: "user" | "model";
  text?: string;
  image?: string;
  file?: { name: string; type: string };
};

const ChatBubble = React.memo(
  function ChatBubble({ msg, copiedIndex, copyToClipboard }: any) {
    if (msg.role === "user") {
      return (
        <div className="ml-auto bg-zinc-800/90 max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm">
          {msg.text}
        </div>
      );
    }

    return (
      <div className="w-full text-[15px] leading-relaxed text-zinc-200 prose prose-invert">
        <MarkdownRenderer
          text={msg.text}
          copiedIndex={copiedIndex}
          copyToClipboard={copyToClipboard}
        />
      </div>
    );
  },
  (prev, next) => prev.msg.text === next.msg.text
);

const MarkdownRenderer = React.memo(
  function MarkdownRenderer({ text, copiedIndex, copyToClipboard }: any) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeText = String(children).replace(/\n$/, "");
            const lang = match?.[1] || "text";

            if (!match) {
              return (
                <code className="bg-zinc-800 px-1 py-0.5 rounded text-xs">
                  {children}
                </code>
              );
            }

            return (
              <div className="relative my-3 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-zinc-800">
                  <span className="uppercase">{lang}</span>
                  <button
                    onClick={() =>
                      copyToClipboard(codeText, codeText.length)
                    }
                  >
                    📋
                  </button>
                </div>

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
                >
                  {codeText}
                </SyntaxHighlighter>
              </div>
            );
          }
        }}
      >
        {text}
      </ReactMarkdown>
    );
  }
);

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

export default function Home() {
const scrollTimeout = useRef<NodeJS.Timeout | null>(null);


const touchStartX = useRef<number | null>(null);
const touchEndX = useRef<number | null>(null);

const [streamBuffer, setStreamBuffer] = useState("");

const chatContainerRef = useRef<HTMLDivElement>(null);
const [autoScroll, setAutoScroll] = useState(true);
const [lockScroll, setLockScroll] = useState(false);
const [showScrollBottom, setShowScrollBottom] = useState(false);

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  setIsSidebarOpen(false);

}


function handleTouchStart(e: React.TouchEvent) {
  touchStartX.current = e.touches[0].clientX;
}

function handleTouchMove(e: React.TouchEvent) {
  touchEndX.current = e.touches[0].clientX;
}

function handleTouchEnd() {
  if (touchStartX.current === null || touchEndX.current === null) return;

  const distance = touchEndX.current - touchStartX.current;

  // ✅ Swipe ke kanan (buka sidebar)
  if (distance > 80) {
    setIsSidebarOpen(true);
  }

  // ✅ Swipe ke kiri (tutup sidebar)
  if (distance < -80) {
    setIsSidebarOpen(false);
  }

  touchStartX.current = null;
  touchEndX.current = null;
}


function streamLikeGPT(fullText: string, callback: (text: string) => void) {
  let index = 0;
  stopStreamRef.current = false;
  setIsStreaming(true);
  setStreamBuffer("");
  setLockScroll(true);

  function step() {
    if (stopStreamRef.current) {
      setIsStreaming(false);
      setLockScroll(false);
      return;
    }

    const chunkSize = 18;
    index += chunkSize;

    const partial = fullText.slice(0, index);
    setStreamBuffer(partial);

    if (index < fullText.length) {
      streamTimerRef.current = setTimeout(step, 90); // ✅ SATU TIMER SAJA
    } else {
      setIsStreaming(false);
      setLockScroll(false);
      callback(fullText);
      setStreamBuffer("");
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
const visibleMessages = messages.slice(-80);


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
   const fixed = parsed.map((s: any) => ({
  ...s,
  messages: s.messages.map((m: any) => ({
    ...m,
    id: m.id || safeUUID()
  }))
}));

setSessions(fixed);


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


// ✅ SAVE WITH DEBOUNCE
useEffect(() => {
  const t = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, 400);

  return () => clearTimeout(t);
}, [sessions]);

// ✅ AUTO SCROLL TERPISAH
useEffect(() => {
  if (!lockScroll) {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [sessions, lockScroll]);




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
  if (!activeSessionId) {
  alert("Pilih persona atau buat chat baru dulu ya 🙏");
  return;
}

  if (!input.trim() && !image && !file) return;

const newMsg: Msg = {
  id: safeUUID(),
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
            messages: [
  ...session.messages,
  {
    id: safeUUID(),
    role: "model",
    text: ""
  }
]

          }
        : session
    )
  );

  // ✅ Streaming
streamLikeGPT(data.reply, (finalText) => {
  setSessions(prev =>
    prev.map(session => {
      if (session.id !== activeSessionId) return session;

      const updated = [...session.messages];
updated[updated.length - 1] = {
  ...updated[updated.length - 1], // ✅ id TETAP ADA
  role: "model",
  text: finalText
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

{/* ✅ MINI SIDEBAR ala GPT — DESKTOP ONLY */}
<div className="hidden md:flex fixed left-0 top-0 h-full w-[64px] bg-zinc-900 border-r border-zinc-800 flex-col items-center py-4 gap-6 z-50">

  <button onClick={() => setIsSidebarOpen(true)}>
    <Menu className="w-5 h-5" />
  </button>

  <button onClick={() => activePersona && createNewChat(activePersona.id)}>
    <Plus className="w-5 h-5" />
  </button>

  <button onClick={() => setCodingMode(true)}>
    <Laptop className="w-5 h-5" />
  </button>

  <div className="mt-auto">
    {activePersona?.image && (
      <img
        src={activePersona.image}
        className="w-8 h-8 rounded-full object-cover border border-zinc-700"
      />
    )}
  </div>
</div>

{/* ✅ FLOATING HEADER (MOBILE ONLY, CHATGPT STYLE) */}
{/* ✅ FLOATING HEADER (MOBILE ONLY, CHATGPT STYLE) */}
<div className="
  md:hidden
  fixed top-0 left-0 right-0
  h-14 flex items-center justify-between px-4 pt-2
  bg-zinc-950/60 backdrop-blur-md
  border-b border-zinc-800
  z-[999]
">
  {/* LEFT MENU */}
  <button onClick={() => setIsSidebarOpen(true)}>
    <Menu className="w-6 h-6" />
  </button>

  {/* TITLE */}
  <h1 className="text-base font-semibold tracking-wide">
    Gachaverse.id
  </h1>

  {/* PERSONA AVATAR */}
  {activePersona?.image ? (
    <img
      src={activePersona.image}
      className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20"
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-zinc-800" />
  )}
</div>





{/* ✅ MOBILE SIDEBAR DRAWER */}
<div
  className={`
    md:hidden
    fixed top-0 left-0 h-full w-[280px]
    bg-zinc-950 border-r border-zinc-800 z-[998]
    transition-transform duration-300
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
  `}
>
  {/* HEADER */}
  <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
    <span className="text-sm font-semibold text-white">History</span>
    <button onClick={() => setIsSidebarOpen(false)}>
      <X className="w-5 h-5" />
    </button>
  </div>

  {/* CONTENT */}
  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">

    {/* PERSONA */}
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

              setIsSidebarOpen(false);
            }}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition
              ${activePersona?.id === p.id
                ? "bg-zinc-800"
                : "hover:bg-zinc-900"
              }`}
          >
            <img src={p.image} className="w-7 h-7 rounded-full object-cover" />
            <span className="text-sm text-white">{p.name}</span>
          </button>
        ))}
      </div>
    </div>

    {/* CHAT LIST */}
    <div>
      <h3 className="text-xs text-zinc-400 uppercase mb-2">Obrolan</h3>
      <div className="space-y-1">
        {sessions.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setActiveSessionId(chat.id);
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded text-sm truncate
            ${activeSessionId === chat.id
              ? "bg-zinc-800 text-white"
              : "hover:bg-zinc-900 text-zinc-400"
            }`}
          >
            {chat.title}
          </button>
        ))}
      </div>
    </div>

  </div>
</div>
{isSidebarOpen && (
  <div
    onClick={() => setIsSidebarOpen(false)}
    className="md:hidden fixed inset-0 bg-black/50 z-[997]"
  />
)}

{/* ✅ FULL SIDEBAR (ONLY DESKTOP) */}
<div
  className={`
    fixed top-0 left-[64px] h-full w-[280px]
    bg-zinc-950 border-r border-zinc-800 z-50
    transition-transform duration-300

    hidden md:block

    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
  `}
>

  
  {/* ✅ HEADER */}
  <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800">
    <span className="text-sm font-semibold text-white">History</span>
    <button
      onClick={() => setIsSidebarOpen(false)}
      className="text-zinc-400 hover:text-white"
    >
      <X className="w-5 h-5" />
    </button>
  </div>

  {/* ✅ CONTENT SCROLL */}
  <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">

    {/* ✅ PERSONA LIST */}
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

              setIsSidebarOpen(false);
            }}
            className={`flex items-center gap-3 w-full p-2 rounded-lg transition
              ${activePersona?.id === p.id
                ? "bg-zinc-800"
                : "hover:bg-zinc-900"
              }`}
          >
            <img src={p.image} className="w-7 h-7 rounded-full object-cover" />
            <span className="text-sm text-white">{p.name}</span>
          </button>
        ))}
      </div>
    </div>

    {/* ✅ CHAT LIST */}
    <div>
      <h3 className="text-xs text-zinc-400 uppercase mb-2">Obrolan</h3>

      <div className="space-y-1">
        {sessions.map((chat) => (
          <button
            key={chat.id}
            onClick={() => {
              setActiveSessionId(chat.id);
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded text-sm truncate
            ${activeSessionId === chat.id
              ? "bg-zinc-800 text-white"
              : "hover:bg-zinc-900 text-zinc-400"
            }`}
          >
            {chat.title}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>



      {/* ✅ MAIN AREA */}
      <section
  className="flex flex-1 flex-col h-full items-center ml-0 md:ml-[64px] pt-14"
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>




        {/* ✅ CHAT AREA */}
        
<div
  ref={chatContainerRef}
  className="flex-1 overflow-y-auto w-full max-w-3xl px-4 py-6 space-y-6 pb-32"




onScroll={() => {
  if (scrollTimeout.current) return;

  scrollTimeout.current = setTimeout(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    const isAtBottom = distanceFromBottom < 80;

    setAutoScroll(isAtBottom);
    setShowScrollBottom(!isAtBottom);

    scrollTimeout.current = null;
  }, 80);
}}

>


{visibleMessages.map((msg: Msg) => (
  <ChatBubble
    key={msg.id}
    msg={msg}
    copiedIndex={copiedIndex}
    copyToClipboard={copyToClipboard}
  />
))}



{/* ✅ MODE BERPIKIR (BELUM ADA STREAM) */}
{isThinking && !isStreaming && (
  <div className="mr-auto max-w-[70%] rounded-2xl px-4 py-3 text-sm bg-zinc-800 shadow-sm">
    <span className="shimmer-text font-medium">
      ✨ Mengetik...
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


{isStreaming && streamBuffer && (
  <div className="text-[15px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
    {streamBuffer}
  </div>
)}



<div ref={bottomRef} />

        </div>

        {/* ✅ INPUT FIXED BOTTOM (SAFE AREA) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-zinc-950/80 backdrop-blur px-3 pb-4 pt-2">




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

<div className="w-full max-w-3xl bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-2xl px-4 py-3 shadow-2xl">

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
    e.currentTarget.style.height = "40px"; // reset dulu
    e.currentTarget.style.height =
      Math.min(e.currentTarget.scrollHeight, 120) + "px"; // batas tinggi
  }}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }}
  placeholder="Ketik pesan..."
  rows={1}
  className="
    flex-1
    bg-transparent
    outline-none
    resize-none
    text-[14px]
    leading-[1.45]
    px-1
    py-2
    max-h-[120px]
    overflow-y-auto
  "
  style={{ minHeight: "40px" }}
/>


    {/* ✅ TOMBOL KIRIM — JUGA CENTER */}
    <button

      onClick={sendMessage}
      className="bg-white-600 hover:bg-white-500
 transition w-10 h-10 rounded-full flex items-center justify-center shrink-0"
    >
      <Send className="w-5 h-5" />
    </button>

  </div>
</div>


        </div>
{showScrollBottom && (
  <button
    onClick={() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollBottom(false);
    }}
    className="
      fixed
      bottom-20
      left-1/2
      -translate-x-1/2
      z-50
      w-8 h-8 rounded-full object-cover ring-2 ring-white/30
      shadow-lg
      flex items-center justify-center
      transition-all duration-300
    "
  >
    <ArrowDown className="w-4 h-4 text-white" />
  </button>
)}



      </section>
      {codingMode && (

  <div className="fixed inset-0 z-[999] bg-gradient-to-b from-zinc-950 to-zinc-900
 flex flex-col">

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
