/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check, ShieldAlert, Sparkles, Globe, ExternalLink, RefreshCw, Paperclip } from "lucide-react";
import { Message } from "../types";
import ThoughtBox from "./ThoughtBox";
import { translations } from "../lib/translations";

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onRetry: () => void;
  language: 'en' | 'ar';
}

export default function ChatArea({ messages, isLoading, onRetry, language }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const t = translations[language] || translations.ar;

  // Auto scroll to bottom when messages list yields new item
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMap((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedMap((prev) => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (e) {
      console.warn("Clipboard access failure:", e);
    }
  };

  // Custom JSX Renderer Mapping for ReactMarkdown to keep it stunning and responsive
  const markdownComponents = {
    // Override preformatted code boundaries
    pre: ({ children }: any) => (
      <div className="relative group my-3">
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              // Extract text content of children code tags
              const preText = children?.props?.children || "";
              navigator.clipboard.writeText(String(preText).trim());
            }}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold bg-zinc-800 text-zinc-300 hover:text-white rounded-md border border-zinc-700/50 cursor-pointer hover:bg-zinc-705 transition-colors"
          >
            <Copy className="h-3 w-3" />
            <span>{language === 'ar' ? 'نسخ الكود' : 'Copy Block'}</span>
          </button>
        </div>
        <pre className="p-4 rounded-xl bg-slate-900 dark:bg-zinc-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-200 dark:border-zinc-800/80 leading-relaxed shadow-xs">
          {children}
        </pre>
      </div>
    ),
    // Code blocks nested or inline text blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !children?.toString().includes('\n');
      
      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 font-mono text-[12px] text-pink-600 dark:text-pink-400 font-semibold" {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="font-mono text-xs select-text block overflow-x-auto" {...props}>
          {children}
        </code>
      );
    },
    // Bullet/Numbered Lists
    ul: ({ children }: any) => <ul className="list-disc pl-5 my-2 space-y-1.5 text-slate-700 dark:text-zinc-300">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 my-2 space-y-1.5 text-slate-700 dark:text-zinc-300">{children}</ol>,
    li: ({ children }: any) => <li className="text-[14px] leading-relaxed font-light pl-0.5 select-text">{children}</li>,
    p: ({ children }: any) => <p className="text-[14px] leading-relaxed select-text my-2 text-slate-700 dark:text-zinc-300 whitespace-pre-wrap shrink-0">{children}</p>,
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-600 dark:text-indigo-400 hover:underline font-medium select-text">
        <span>{children}</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    ),
    h1: ({ children }: any) => <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight mt-5 mb-2.5 border-none select-text">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50 tracking-tight mt-4 mb-2 select-text">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-semibold text-slate-900 dark:text-zinc-50 tracking-tight mt-3 mb-1.5 select-text">{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-slate-300 dark:border-zinc-700 pl-4 py-1 italic text-slate-600 dark:text-zinc-400 my-3 bg-slate-100/50 dark:bg-zinc-900/30 rounded-r-md select-text">
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-3 border border-slate-200 dark:border-zinc-800 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-zinc-800 text-xs text-left">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-50 dark:bg-zinc-900 font-semibold text-slate-700 dark:text-zinc-300">{children}</thead>,
    tbody: ({ children }: any) => <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">{children}</tbody>,
    tr: ({ children }: any) => <tr className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/40 transition-colors">{children}</tr>,
    th: ({ children }: any) => <th className="px-4 py-2.5 font-medium">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-2 text-slate-600 dark:text-zinc-400 leading-normal">{children}</td>,
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6 select-text">
      <div className="max-w-3xl mx-auto space-y-6 w-full">
        {messages.map((m) => {
          const isUser = m.role === "user";
          const isCopied = copiedMap[m.id];

          return (
            <div
              key={m.id}
              className={`flex gap-4 md:gap-5 w-full select-text ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* User or Assistant Avatar Badge icon */}
              <div className="shrink-0 select-none">
                {isUser ? (
                  <div className="h-8 w-8 rounded-lg bg-orange-400 dark:bg-orange-500/85 flex items-center justify-center text-white text-xs font-semibold">
                    JD
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs italic select-none">
                    A
                  </div>
                )}
              </div>

              {/* Message Payload container */}
              <div className={`flex-1 min-w-0 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                         {/* Visual Bubble wrapper */}
                <div
                  className={`w-full max-w-full rounded-2xl px-5 py-3 select-text ${
                    isUser
                      ? "bg-gray-100 dark:bg-zinc-805/80 text-slate-800 dark:text-zinc-150 max-w-xl md:max-w-2xl text-left"
                      : "bg-white dark:bg-zinc-900/60 text-slate-800 dark:text-zinc-100 border border-slate-200/50 dark:border-zinc-800/80 text-left"
                  }`}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {isUser ? (
                    <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words font-light">
                      {/* Render custom user image/file attachment */}
                      {m.attachment && (
                        <div className={`mb-3 flex items-center gap-3 p-2.5 bg-white/70 dark:bg-zinc-900/65 border border-slate-200 dark:border-zinc-800 rounded-xl ${language === 'ar' ? 'flex-row' : 'flex-row'}`}>
                          {m.attachment.mimeType.startsWith("image/") ? (
                            <img
                              src={m.attachment.data}
                              alt="Uploaded Attachment Preview"
                              className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-zinc-700 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 bg-blue-100 dark:bg-zinc-800 text-blue-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-bold shrink-0">
                              <Paperclip className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-xs font-bold text-slate-800 dark:text-zinc-150 truncate">
                              {m.attachment.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {m.attachment.mimeType}
                            </div>
                          </div>
                        </div>
                      )}
                      {m.text}
                    </div>
                  ) : (
                    <div className="select-text space-y-3">
                      
                      {/* 1. Reasoning Logs Block */}
                      <ThoughtBox
                        thought={m.thought}
                        thinkingTime={m.thinkingTime}
                        isThinking={m.isThinking}
                        language={language}
                      />

                      {/* 2. Google Search Grounding Sources badge mapping */}
                      {m.groundingSources && m.groundingSources.length > 0 && (
                        <div className="my-1.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/85 border border-slate-100 dark:border-zinc-800 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold select-none">
                            <Globe className="h-3.5 w-3.5 animate-pulse" />
                            <span>{t.webSearchGrounded} ({m.groundingSources.length})</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {m.groundingSources.map((source, sIdx) => (
                              <a
                                key={sIdx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-600 dark:text-zinc-300 hover:text-blue-500 dark:hover:text-amber-400 rounded-md border border-slate-200/50 dark:border-zinc-700 transition-all cursor-pointer"
                              >
                                <span className="truncate max-w-[130px]">{source.title}</span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Final formatted body */}
                      {m.text ? (
                        <div className="markdown-body select-text antialiased">
                          <ReactMarkdown components={markdownComponents}>
                            {m.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        !m.isThinking && (
                          <div className="flex items-center gap-1.5 text-slate-400 italic text-xs animate-pulse select-none">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t.formulatingResponse}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-bubble Action Triggers */}
                {!isUser && m.text && (
                  <div className="flex items-center gap-2 mt-1.5 px-1 opacity-60 hover:opacity-100 select-none transition-opacity">
                    <button
                      onClick={() => copyToClipboard(m.id, m.text)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                      title="Copy response Text"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-green-500 animate-scale-in" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    {messages[messages.length - 1].id === m.id && (
                      <button
                        onClick={onRetry}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
                        title="Regenerate response"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming / Query loader indicators */}
        {isLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex gap-4 md:gap-5 w-full select-none animate-pulse">
            <div className="shrink-0 select-none">
              <div className="w-8 h-8 bg-blue-500/80 rounded-lg flex items-center justify-center text-white font-bold text-xs italic">
                A
              </div>
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <div className="h-10 w-full max-w-sm bg-slate-100 dark:bg-zinc-900/40 rounded-2xl"></div>
            </div>
          </div>
        )}

        {/* Scroll anchor tag */}
        <div ref={scrollRef} className="h-1" />
      </div>
    </div>
  );
}
