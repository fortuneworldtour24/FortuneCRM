import {
  Bot, ClipboardCopy, Loader2, Plane, Send, Sparkles, Trash2, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIntegrations } from "@/store/IntegrationsContext";
import { useApp } from "@/store/AppContext";
import { cn, formatFlightDuration, formatMoney } from "@/lib/utils";
import {
  chatWithAI,
  executeSearchFlights,
  PROVIDER_META,
  type Message,
} from "@/services/ai/aiService";
import type { FlightOffer } from "@/services/flights/types";

export function FloatingAssistant() {
  const { cfg } = useIntegrations();
  const { settings, pushToast, copyWhatsAppQuote } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const provider = cfg.ai.provider;
  const meta = PROVIDER_META[provider];

  let rawActiveKey =
    provider === "openrouter"
      ? cfg.ai.openrouterApiKey || cfg.ai.apiKey
      : provider === "gemini"
        ? cfg.ai.geminiApiKey || cfg.ai.apiKey
        : cfg.ai.apiKey;

  // Immediate fallback sync
  if (!rawActiveKey || rawActiveKey.trim().length === 0) {
    rawActiveKey = localStorage.getItem("fwt_openrouter_key") || "";
    if (!rawActiveKey) {
      try {
        const lsData = localStorage.getItem("fwt_system_settings");
        if (lsData) {
          const parsed = JSON.parse(lsData);
          if (provider === "openrouter" && parsed?.ai?.openrouterApiKey) {
            rawActiveKey = parsed.ai.openrouterApiKey;
          }
        }
      } catch { /* ignore */ }
    }
  }

  const activeKey = rawActiveKey;
  const hasKey = activeKey.trim().length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, searching]);

  const toggle = () => setOpen(o => !o);
  const clear = () => setMessages([]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    let savedKey = localStorage.getItem('fwt_openrouter_key') || "";

    // 1. Silent fallback for OpenRouter: if browser storage is empty, try Supabase system_settings immediately.
    if (provider === "openrouter" && (!savedKey || savedKey.trim().length === 0)) {
      try {
        const { supabase } = await import("@/lib/supabase");
        if (supabase) {
          const { data } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "ai")
            .single();
          const parsed = typeof data?.value === "string" ? JSON.parse(data.value) : data?.value;
          const candidate = parsed?.openrouterApiKey || parsed?.apiKey || "";
          if (candidate) {
            savedKey = candidate;
            localStorage.setItem('fwt_openrouter_key', candidate.trim());
          }
        }
      } catch { /* ignore */ }
    }

    // 2. Validation
    if (provider === "openrouter" && !savedKey.trim()) {
      setMessages(prev => [...prev, { role: "user", content: userInput }, { role: "assistant", content: "⚠️ Error: Key not found. Please go to Settings and click Save again." }]);
      setInput("");
      return;
    }

    const userMsg: Message = { role: "user", content: userInput };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setLoading(true);

    try {
      let responseMessage = "";
      let responseToolCalls: any = undefined;
      let flightSearchData: any = undefined;

      if (provider === "openrouter") {
        // Model fallback chain — tries primary model first, then a stable fallback
        const MODELS = [
          "google/gemini-flash-1.5-8b:free",
          "meta-llama/llama-3.1-8b-instruct:free",
        ];

        const chatMessages = [
          { role: "system", content: cfg.ai.systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userInput },
        ];

        const tools = [
          {
            type: "function",
            function: {
              name: "search_flights",
              description: "Search for live flight fares and routes.",
              parameters: {
                type: "object",
                properties: {
                  origin:      { type: "string", description: "IATA code of origin airport (e.g. SYD)" },
                  destination: { type: "string", description: "IATA code of destination airport (e.g. DXB)" },
                  departDate:  { type: "string", description: "Departure date in YYYY-MM-DD format" },
                  returnDate:  { type: "string", description: "Optional return date in YYYY-MM-DD format" },
                  adults:      { type: "number", description: "Number of adult passengers", default: 2 },
                  cabin:       { type: "string", enum: ["economy", "premium_economy", "business", "first"], default: "economy" },
                },
                required: ["origin", "destination", "departDate"],
              },
            },
          },
        ];

        let lastError = "";
        let resolved = false;

        for (const model of MODELS) {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              'Authorization': `Bearer ${savedKey.trim()}`,
              'HTTP-Referer': 'https://arena.site',
              'X-Title': 'Fortune World Tour CRM',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model, messages: chatMessages, tools, tool_choice: "auto" }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData?.error?.message || `HTTP ${response.status}`;
            // Model not found — try next
            if (response.status === 404 || msg.toLowerCase().includes("model")) {
              lastError = msg;
              continue;
            }
            // Any other error — surface it immediately
            throw new Error(msg);
          }

          const data = await response.json();
          const choice = data.choices?.[0]?.message;
          if (!choice) { lastError = "Empty response"; continue; }

          responseMessage = choice.content ?? "";
          responseToolCalls = choice.tool_calls;
          resolved = true;
          break;
        }

        if (!resolved) {
          throw new Error(lastError || "All models failed. Check your OpenRouter API key.");
        }
      } else {
        const syncedAIConfig = { ...cfg.ai, openrouterApiKey: activeKey, apiKey: activeKey };
        const response = await chatWithAI(nextMsgs, syncedAIConfig, settings.currency);
        responseMessage = response.message;
        responseToolCalls = response.toolCalls;
        flightSearchData = response.flightSearch;
      }

      /* ── Gemini path: heuristic intent extraction ── */
      if (flightSearchData) {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: responseMessage || "✈️ Let me search live fares for you…",
          },
        ]);
        setSearching(true);
        try {
          const offers = await executeSearchFlights({
            ...flightSearchData,
            currency: settings.currency,
          });
          setMessages(prev => [
            ...prev,
            {
              role: "assistant",
              content: JSON.stringify({ type: "flight_results", data: offers.slice(0, 3) }),
            },
          ]);
        } catch (err) {
          pushToast({ kind: "error", title: "AI Search failed", body: String(err) });
        } finally {
          setSearching(false);
        }
      }
      /* ── OpenAI path: native function-calling ── */
      else if (responseToolCalls) {
        for (const tc of responseToolCalls as Array<{
          function: { name: string; arguments: string };
        }>) {
          if (tc.function.name === "search_flights") {
            setMessages(prev => [
              ...prev,
              {
                role: "assistant",
                content: responseMessage || "Searching for the best fares…",
              },
            ]);
            setSearching(true);
            try {
              const params = JSON.parse(tc.function.arguments) as Partial<Parameters<typeof executeSearchFlights>[0]>;
              const offers = await executeSearchFlights({
                origin: String(params.origin ?? "SYD"),
                destination: String(params.destination ?? "DXB"),
                departDate: String(params.departDate ?? new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)),
                returnDate: params.returnDate ? String(params.returnDate) : undefined,
                adults: Number(params.adults ?? 2),
                cabin: (params.cabin as Parameters<typeof executeSearchFlights>[0]["cabin"]) ?? "economy",
                currency: settings.currency,
              });
              setMessages(prev => [
                ...prev,
                {
                  role: "assistant",
                  content: JSON.stringify({ type: "flight_results", data: offers.slice(0, 3) }),
                },
              ]);
            } catch (err) {
              pushToast({ kind: "error", title: "AI Search failed", body: String(err) });
            } finally {
              setSearching(false);
            }
          }
        }
      }
      /* ── Standard text reply ── */
      else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: responseMessage },
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠️ ${String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Provider status colours ── */
  const badgeStyle =
    hasKey && meta.color === "green"
      ? "text-emerald-300 bg-emerald-500/15"
      : hasKey && meta.color === "blue"
        ? "text-blue-300 bg-blue-500/15"
        : hasKey && meta.color === "violet"
          ? "text-violet-300 bg-violet-500/15"
          : "text-zinc-400 bg-white/10";

  return (
    <div className="fixed bottom-6 right-[360px] z-[80] flex flex-col items-end gap-4">
      {open && (
        <div className="anim-modal flex h-[520px] w-[370px] flex-col overflow-hidden rounded-[26px] border border-white/20 bg-white/92 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl">

          {/* ── Header ── */}
          <div className="flex items-center justify-between bg-[#222468] px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <Sparkles className="h-4 w-4 text-[#EA7218]" />
              </span>
              <div>
                <p className="font-display text-[14px] font-bold tracking-tight">
                  AI Staff Co-Pilot
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {hasKey ? (
                    <span className={cn("rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wider", badgeStyle)}>
                      {meta.badge}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500/20 px-2 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300">
                      API key missing
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                className="rounded-lg p-1.5 transition hover:bg-white/10"
                title="Clear history"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={toggle} className="rounded-lg p-1.5 transition hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Gemini free-tier note (shown once, no key yet) ── */}
          {provider === "gemini" && !hasKey && (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-2.5">
              <p className="text-[11px] font-semibold text-blue-700">
                🔑 Get a free Gemini key at{" "}
                <a
                  href="https://aistudio.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  aistudio.google.com
                </a>{" "}
                — no credit card required. Paste it in{" "}
                <strong>Settings › AI & Automation</strong>.
              </p>
            </div>
          )}

          {/* ── Messages ── */}
          <div ref={scrollRef} className="nice-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center pt-8 text-center">
                <Bot className="mb-3 h-10 w-10 text-zinc-300" />
                <p className="text-[13px] font-bold text-zinc-900">How can I help you today?</p>
                <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-zinc-500">
                  Ask me to find flights, summarize a lead, or format a WhatsApp quote.
                </p>
                {/* Quick prompts */}
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {[
                    "Cheapest SYD → DXB in December",
                    "Format a WhatsApp quote",
                    "Summarize my latest leads",
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-zinc-600 transition hover:border-[#222468]/30 hover:bg-[#222468]/5 hover:text-[#222468]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              /* Flight results bubble */
              if (m.content.startsWith('{"type":"flight_results"')) {
                const results = (JSON.parse(m.content) as { data: FlightOffer[] }).data;
                return (
                  <div key={i} className="anim-fade-up space-y-2">
                    <p className="text-[10.5px] font-semibold text-zinc-400">
                      ✈️ Found {results.length} fare{results.length !== 1 ? "s" : ""} · showing top results
                    </p>
                    {results.map(o => (
                      <AICoPilotFlightCard
                        key={o.id}
                        offer={o}
                        onCopy={() =>
                          copyWhatsAppQuote(null, o, Math.round(o.netPrice * 1.05))
                        }
                      />
                    ))}
                  </div>
                );
              }

              const isUser = m.role === "user";
              return (
                <div key={i} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  {!isUser && (
                    <span className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EA7218] to-[#222468]">
                      <Sparkles className="h-3 w-3 text-white" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-2.5 text-[12.5px] leading-relaxed shadow-sm",
                      isUser
                        ? "rounded-tr-sm bg-[#222468] text-white"
                        : "rounded-tl-sm border border-zinc-100 bg-white text-zinc-700"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {/* Searching fares indicator */}
            {searching && (
              <div className="flex justify-start">
                <div className="shimmer flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-[12px] font-medium text-blue-700">
                  <Plane className="h-3.5 w-3.5 animate-bounce" />
                  AI is searching live fares…
                </div>
              </div>
            )}

            {/* Thinking indicator */}
            {loading && !searching && (
              <div className="flex items-start gap-2">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#EA7218] to-[#222468]">
                  <Sparkles className="h-3 w-3 text-white" />
                </span>
                <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Input bar ── */}
          <div className="border-t border-zinc-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) void handleSend(); }}
                placeholder={
                  !hasKey
                    ? "Add Gemini API key in Settings first…"
                    : "Find flights, format a quote, or ask anything…"
                }
                disabled={!hasKey}
                className="flex-1 rounded-xl bg-zinc-50 px-4 py-2 text-[13px] font-medium outline-none transition-all focus:ring-2 focus:ring-[#222468]/10 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                onClick={() => void handleSend()}
                disabled={!input.trim() || loading || !hasKey}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EA7218] text-white transition hover:brightness-110 disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9.5px] font-medium text-zinc-400">
              Powered by {meta.label}
              {meta.free && " · Free tier"}
            </p>
          </div>
        </div>
      )}

      {/* ── Toggle button ── */}
      <button
        onClick={toggle}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all hover:scale-105 active:scale-95",
          open ? "bg-zinc-900" : "bg-gradient-to-br from-[#EA7218] to-[#222468]"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}

function AICoPilotFlightCard({
  offer,
  onCopy,
}: {
  offer: FlightOffer;
  onCopy: () => void;
}) {
  const { settings } = useApp();
  const sell = Math.round(offer.netPrice * 1.05);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-[#222468]/30 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-900 text-[9px] font-bold text-white">
            {offer.airlineCode}
          </span>
          <p className="truncate text-[11px] font-bold text-zinc-900">{offer.airline}</p>
        </div>
        <p className="font-display text-[13px] font-bold text-[#222468]">
          {formatMoney(sell, settings.currency)}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-zinc-500">
        <span>
          {offer.departTime} {offer.legs[0]?.from}
        </span>
        <div className="mx-2 h-px flex-1 bg-zinc-100" />
        <span>
          {offer.arriveTime} {offer.legs[offer.legs.length - 1]?.to}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
        <span>{formatFlightDuration(offer.totalDurationMin)}</span>
        <span>{offer.stops === 0 ? "Direct" : `${offer.stops} stop`}</span>
      </div>

      <button
        onClick={onCopy}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-100"
      >
        <ClipboardCopy className="h-3 w-3" /> Copy WhatsApp Quote
      </button>
    </div>
  );
}
