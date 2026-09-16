"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

const SUGGESTED_QUESTIONS = [
  "What competitions am I eligible for?",
  "Find mathematics competitions for university students",
  "Show me competitions with deadlines in the next month",
  "What AI competitions are available?",
  "Help me find programming contests"
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; timestamp?: Date }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const question = input;
    setMessages((m) => [...m, { role: "user", text: question, timestamp: new Date() }]);
    setInput("");
    setLoading(true);
    try {
      const { reply, provider } = await api.chat(question);
      setMessages((m) => [...m, { 
        role: "assistant", 
        text: reply,
        timestamp: new Date()
      }]);
    } catch (e: any) {
      setMessages((m) => [...m, { 
        role: "assistant", 
        text: `Error: ${e.message}. ${e.message.includes("logged in") ? "Please log in to use the assistant." : ""}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestedQuestion(question: string) {
    setInput(question);
    setOpen(true);
  }

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          aria-label="Open assistant"
        >
          Ask the Assistant
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[36rem] w-96 flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between rounded-t-xl bg-brand-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Opportunity Assistant</span>
          <span className="text-xs bg-brand-700 px-2 py-0.5 rounded-full">AI-powered</span>
        </div>
        <button 
          onClick={() => setOpen(false)}
          className="hover:bg-brand-700 rounded p-1 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Close assistant"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.length === 0 && (
          <div className="text-center space-y-4">
            <div className="text-4xl">🤖</div>
            <p className="text-neutral-600">
              I can help you find competitions, check eligibility, and answer questions about opportunities.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Try asking:</p>
              {SUGGESTED_QUESTIONS.slice(0, 3).map((question) => (
                <button
                  key={question}
                  onClick={() => setInput(question)}
                  className="block w-full text-left rounded-lg bg-neutral-50 px-3 py-2 hover:bg-neutral-100 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-900"
              }`}
            >
              <p>{m.text}</p>
              {m.timestamp && (
                <p className={`text-xs mt-1 ${m.role === "user" ? "text-brand-200" : "text-neutral-500"}`}>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex items-center gap-2 text-neutral-500">
            <div className="animate-spin w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2 border-t border-neutral-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Ask about competitions..."
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={loading}
        />
        <button 
          onClick={send} 
          disabled={loading || !input.trim()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          Send
        </button>
      </div>
      
      <div className="border-t border-neutral-200 px-3 py-2 bg-neutral-50 rounded-b-xl">
        <p className="text-xs text-neutral-500 text-center">
          AI responses may not always be accurate. Verify important information with official sources.
        </p>
      </div>
    </div>
  );
}
