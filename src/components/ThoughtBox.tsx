/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, BrainCircuit } from "lucide-react";
import { translations } from "../lib/translations";

interface ThoughtBoxProps {
  thought?: string;
  thinkingTime?: number;
  isThinking?: boolean;
  language?: 'en' | 'ar';
}

export default function ThoughtBox({ thought, thinkingTime, isThinking, language = 'ar' }: ThoughtBoxProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thought && !isThinking) return null;

  const t = translations[language] || translations.ar;

  const getHeaderLabel = () => {
    if (isThinking) {
      if (language === 'ar') {
        return `جاري التفكير${thinkingTime ? ` (${thinkingTime} ثانية)` : "..."}`;
      }
      return `Thinking${thinkingTime ? ` (${thinkingTime}s)` : "..."}`;
    } else {
      if (language === 'ar') {
        return `خطوات التفكير (${thinkingTime ? `${thinkingTime} ثانية` : "بضع لحظات"})`;
      }
      return `Thought for ${thinkingTime ? `${thinkingTime} seconds` : "a few moments"}`;
    }
  };

  return (
    <div className="my-3 font-sans w-full max-w-full overflow-hidden select-text text-left">
      {/* Clickable Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50/70 dark:bg-zinc-800/85 text-blue-800 dark:text-zinc-300 hover:bg-blue-100 dark:hover:bg-zinc-700 transition-all select-none cursor-pointer border border-blue-200/40 dark:border-zinc-700/50"
      >
        <BrainCircuit className={`h-3.5 w-3.5 ${isThinking ? "text-blue-550 animate-pulse animate-spin shrink-0" : "text-blue-500 shrink-0"}`} />
        <span>{getHeaderLabel()}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-blue-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-blue-500" />
        )}
      </button>

      {/* Thought Content Area */}
      {isOpen && (
        <div className={`mt-2.5 bg-blue-50/30 dark:bg-zinc-900/40 ${language === 'ar' ? 'border-r-2 border-l-0 pr-4 pl-3' : 'border-l-2 border-r-0 pl-4 pr-3'} border-blue-400 py-2 text-blue-800/85 dark:text-zinc-300 text-[12.5px] leading-relaxed font-sans italic select-text rounded-r-lg`}>
          {thought ? (
            <div className="whitespace-pre-wrap">{thought}</div>
          ) : (
            <div className="flex items-center gap-2 py-0.5 text-blue-500/80 dark:text-zinc-400 italic">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
              {language === 'ar' ? 'جاري تحليل الاستفسار وصياغة خطوات التفكير والاستنتاج خطوة بخطوة...' : 'Analyzing query and formulating step-by-step reasoning...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
