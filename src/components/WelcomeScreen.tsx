/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrainCircuit, Globe, Code, HelpCircle, GraduationCap, ChevronRight } from "lucide-react";
import { translations } from "../lib/translations";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onStartWithPrompt: (prompt: string) => void;
  deepThinkEnabled: boolean;
  webSearchEnabled: boolean;
  setDeepThinkEnabled: (v: boolean) => void;
  setWebSearchEnabled: (v: boolean) => void;
  language: 'en' | 'ar';
}

export default function WelcomeScreen({
  onStartWithPrompt,
  deepThinkEnabled,
  webSearchEnabled,
  setDeepThinkEnabled,
  setWebSearchEnabled,
  language,
}: WelcomeScreenProps) {
  const t = translations[language] || translations.ar;

  const suggestions = [
    {
      title: t.writeCode,
      desc: t.writeCodeDesc,
      icon: Code,
      prompt: language === 'ar' 
        ? "أظهر لي خيار نقطة نهاية Express.js قوية وعملية لـ Server-Sent Events (SSE) التي تبث البيانات إلى العميل وتتعامل مع انقطاع الشبكة بسلاسة."
        : "Show me a highly robust, fully-commented Express.js endpoint for Server-Sent Events (SSE) that feeds token chunks to a client, handling network dropouts gracefully.",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: t.scienceReasoning,
      desc: t.scienceReasoningDesc,
      icon: GraduationCap,
      prompt: language === 'ar'
        ? "هل يمكنك شرح النفق الكمومي لي؟ يرجى تفعيل خيار التفكير العميق حتى أتمكن من رؤية خطوات الاستدلال الكاملة قبل الإجابة."
        : "Can you explain quantum tunneling to me? Please turn on the DeepThink option so I can see your full step-by-step reasoning steps before the answer.",
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
    },
    {
      title: t.webGrounding,
      desc: t.webGroundingDesc,
      icon: Globe,
      prompt: language === 'ar'
        ? "ما هو الوضع الحالي لـ Artemis IV، مهمة الفضاء لوكالة ناسا؟ يرجى تمكين خيار بحث الويب للحصول على أحدث جدول زمني."
        : "What is the latest status of Artemis IV, NASA's space mission? Please enable the Web Search option to get the most up-to-date schedule.",
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: t.complexQA,
      desc: t.complexQADesc,
      icon: HelpCircle,
      prompt: language === 'ar'
        ? "نقوم بتصميم نشر خدمات مصغرة حيث تحتاج قواعد بيانات متعددة إلى الحفاظ على الاتساق النهائي. اشرح كيفية تطبيق نمط Saga خطوة بخطوة."
        : "We are designing a microservices deployment where multiple databases need to maintain eventual consistency. Explain how to implement the Saga pattern step-by-step.",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/20",
    },
  ];

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full font-sans select-none overflow-y-auto ${language === 'ar' ? 'text-right' : 'text-left'}`}>
      {/* Brand logo container */}
      <div className="flex flex-col items-center text-center mb-10 mt-6 md:mt-12 animate-fade-in">
        {/* Customized Logo mark with Clean Minimalism theme */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/10 mb-5 border border-blue-400/20">
          <span className="text-white text-3xl font-bold tracking-tight italic select-none">A</span>
          {/* Subtle orbiting rings indicating reasoning nodes */}
          <div className="absolute -inset-1 rounded-2xl border border-dashed border-blue-400/30 animate-spin" style={{ animationDuration: '40s' }}></div>
          {/* Real-time thinking active node */}
          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 border-none">
          {t.welcomeTitle}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mt-2.5 text-base text-slate-500 dark:text-zinc-400 max-w-lg font-light"
        >
          {t.welcomeSub}
        </motion.p>
      </div>

      {/* Model Option Switches in Welcome view for quick configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-12">
        {/* DeepThink toggle */}
        <button
          onClick={() => setDeepThinkEnabled(!deepThinkEnabled)}
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'} ${
            deepThinkEnabled
              ? "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-800/60 shadow-xs"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${deepThinkEnabled ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"}`}>
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-800 dark:text-zinc-100">
              <span>{t.reasoningMode}</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">{t.r1Vibe}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-light">
              {t.reasoningSub}
            </p>
          </div>
        </button>

        {/* WebSearch toggle */}
        <button
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'} ${
            webSearchEnabled
              ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60 shadow-xs"
              : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
          }`}
        >
          <div className={`p-2 rounded-lg shrink-0 ${webSearchEnabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-zinc-800 text-slate-400"}`}>
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-800 dark:text-zinc-100">
              <span>{t.webSearch}</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">{t.live}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-light">
              {t.webSearchSub}
            </p>
          </div>
        </button>
      </div>

      {/* Suggesions Bento Grid */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4 px-1">
          <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 tracking-wider uppercase">{t.quickStart}</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((s, idx) => {
            const IconComp = s.icon;
            return (
              <button
                key={idx}
                onClick={() => onStartWithPrompt(s.prompt)}
                className={`group flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 hover:border-blue-400 dark:hover:border-zinc-700 hover:shadow-sm hover:shadow-slate-100 dark:hover:shadow-none transition-all cursor-pointer ${language === 'ar' ? 'text-right' : 'text-left'}`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${s.color}`}>
                  <IconComp className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-zinc-100 group-hover:text-blue-500 dark:group-hover:text-indigo-400 transition-colors">
                      {s.title}
                    </span>
                    <ChevronRight className={`h-3 w-3 text-slate-300 dark:text-zinc-600 group-hover:text-slate-400 dark:group-hover:text-zinc-400 transition-all ${language === 'ar' ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-light line-clamp-2">
                    {s.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
