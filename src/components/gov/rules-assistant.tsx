import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { askRules } from "@/lib/rules-chat.functions";
import { raceWithFallback } from "@/lib/ai-fallback";
import { rulesFallback } from "@/lib/ai-fallback-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  isFallback?: boolean;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Ask me about GFR 2017 procurement rules, startup and MSE relaxations, EMD exemption, CVC clearance or MSME payment timelines. I answer only from the rules on file.",
  citations: [],
};

export function RulesAssistant() {
  const ask = useServerFn(askRules);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [question, setQuestion] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const handleSend = async () => {
    const text = question.trim();
    if (!text || isThinking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text }]);
    setIsThinking(true);
    try {
      const { value: result, isFallback } = await raceWithFallback(
        "rules-chat",
        () => ask({ data: { question: text } }),
        () => rulesFallback(text),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.answer,
          citations: result.citations,
          isFallback,
        },
      ]);
    } catch (error) {
      toast.error("Assistant unavailable", {
        description: error instanceof Error ? error.message : "Unexpected error.",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text: "I could not reach the rules service just now. Please try again.",
          citations: [],
        },
      ]);
    } finally {
      setIsThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          aria-label="Open Procurement Rules Assistant"
          className="fixed right-6 bottom-6 z-50 h-14 w-14 bg-blue-800 p-0 text-white shadow-lg hover:bg-blue-900"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-300 bg-slate-50 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-slate-800 bg-slate-900 p-4 text-left">
          <SheetTitle className="text-base text-white">Procurement Rules Assistant</SheetTitle>
          <SheetDescription className="text-slate-300">
            Answers grounded in the GFR and startup procurement knowledge base.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] bg-blue-800 px-3 py-2 text-sm text-white">{message.text}</p>
              </div>
            ) : (
              <div key={message.id} className="flex flex-col items-start gap-2">
                <div className="relative max-w-[90%] border border-slate-300 bg-white px-3 py-2">
                  <p className="text-sm text-slate-800">{message.text}</p>
                  {message.isFallback && (
                    <WifiOff
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1 right-1 h-3 w-3 text-slate-500 opacity-40"
                    />
                  )}
                </div>
                {!!message.citations?.length && (
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((c) => (
                      <Badge
                        key={c}
                        className="bg-slate-900 font-mono text-xs text-white hover:bg-slate-900"
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}

          {isThinking && (
            <div className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-3 w-fit">
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500 [animation-delay:200ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-500 [animation-delay:400ms]" />
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-300 bg-white p-4">
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Ask about a procurement rule…"
            className="border-slate-300"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isThinking || !question.trim()}
            className="bg-blue-800 text-white hover:bg-blue-900"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
