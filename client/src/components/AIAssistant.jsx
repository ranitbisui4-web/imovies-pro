import React, { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Mic, MicOff, Compass } from "lucide-react";
import { useAIControl } from "../context/AIControlContext";

const QUICK_PROMPTS = [
  "Book 2 balcony seats for OG",
  "Show action movies",
  "Open RRR details",
  "Go to my bookings",
  "Go back",
  "Go home",
];

const AIAssistant = () => {
  const { isOpen, setIsOpen, messages, thinking, sendCommand } = useAIControl();
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    sendCommand(input);
    setInput("");
  };

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendCommand(transcript);
    };
    recognition.start();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-red-600/90 to-violet-600/90 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <div>
            <h3 className="text-sm font-bold">iMovies AI Concierge</h3>
            <p className="text-[11px] text-white/80">Live Screen Control & Seat Booking</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-red-600 text-white"
                  : "border border-slate-700 bg-slate-800/90 text-slate-100"
              }`}
            >
              {m.text}
              {m.actionType && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                  <Compass className="h-3 w-3" />
                  Screen Action: {m.actionType}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="text-xs italic text-slate-400">AI is checking live showtimes...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Chips */}
      <div className="flex gap-1.5 overflow-x-auto border-t border-slate-800 px-3 py-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => sendCommand(q)}
            className="whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-300 hover:border-violet-500 hover:text-white"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={toggleVoice}
          title="Voice command"
          className={`rounded-xl p-2 transition ${
            listening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-slate-800 text-slate-300 hover:text-white"
          }`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to find or book a movie..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={thinking}
          className="rounded-xl bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default AIAssistant;