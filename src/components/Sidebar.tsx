/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Sliders,
  Sparkles,
  Sun,
  Moon,
  Github,
  Mail,
  LogOut,
  FolderOpen,
  Globe
} from "lucide-react";
import { ChatSession } from "../types";
import { User } from "firebase/auth";
import { translations } from "../lib/translations";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAllSessions: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  globalTemp: number;
  onTempChange: (val: number) => void;
  googleUser: User | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  isWorkspaceOpen: boolean;
  onToggleWorkspace: () => void;
  language: 'en' | 'ar';
  onChangeLanguage: (lang: 'en' | 'ar') => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onClearAllSessions,
  darkMode,
  onToggleDarkMode,
  globalTemp,
  onTempChange,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  isWorkspaceOpen,
  onToggleWorkspace,
  language,
  onChangeLanguage,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const t = translations[language] || translations.ar;

  // Filter sessions based on search
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(id);
    setEditTitle(currentTitle);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t.deleteConfirmation)) {
      onDeleteSession(id);
    }
  };

  return (
    <aside className="w-[260px] border-r border-slate-200 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-zinc-950 flex flex-col h-full shrink-0 select-none">
      {/* Brand logo header */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg italic shadow-xs select-none shrink-0">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-zinc-50 uppercase leading-none">{t.appName}</h1>
            <span className="text-[10px] text-blue-500 font-semibold tracking-wider uppercase mt-0.5 block">V2.5 Vibe</span>
          </div>
        </div>

        {/* Global toggler for system configs */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-850 text-slate-500 dark:text-zinc-400 cursor-pointer transition-colors ${showSettings ? 'bg-slate-250 dark:bg-zinc-800 text-blue-600' : ''}`}
          title={t.modelParams}
        >
          <Sliders className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Setup Settings panel */}
      {showSettings && (
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900/50 text-xs text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-700 dark:text-zinc-300">{t.defaultTemp}</span>
            <span className="font-mono text-blue-600 dark:text-indigo-400 font-bold">{globalTemp.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.1"
            value={globalTemp}
            onChange={(e) => onTempChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{t.precise} (0.1)</span>
            <span>{t.balanced} (0.7)</span>
            <span>{t.creative} (1.5)</span>
          </div>
        </div>
      )}

      {/* Actions: Start new chat */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-between px-4 py-2 border border-slate-350 dark:border-zinc-700 rounded-full text-xs font-semibold hover:bg-white dark:hover:bg-zinc-900 dark:text-zinc-200 text-slate-700 transition-colors cursor-pointer shadow-xs"
        >
          <span>{t.newChat}</span>
          <Plus className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Filter / Search input for chats */}
      <div className="px-3 pb-2 relative">
        <Search className={`absolute ${language === 'ar' ? 'right-6' : 'left-6'} top-2.5 h-3.5 w-3.5 text-slate-400`} />
        <input
          type="text"
          placeholder={t.searchChats}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full ${language === 'ar' ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg focus:outline-hidden focus:border-blue-400 dark:focus:border-zinc-700 dark:text-zinc-200`}
        />
      </div>

      {/* Historical list stream */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        <div className="text-[11px] font-bold text-slate-400/90 dark:text-zinc-500 uppercase tracking-wider px-3 mb-2 text-left">
          {t.recentChats}
        </div>
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = session.id === editingSessionId;

            return (
              <div
                key={session.id}
                onClick={() => !isEditing && onSelectSession(session.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-50/70 dark:bg-indigo-950/40 text-blue-700 dark:text-indigo-300 font-semibold"
                    : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-blue-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs py-0.5 px-1 border border-blue-400 bg-white dark:bg-zinc-855 dark:text-zinc-100 rounded-xs focus:outline-hidden"
                      autoFocus
                    />
                  ) : (
                    <span className="text-[13px] truncate pr-1">
                      {session.title === "New Chat Sessions" ? t.placeholderTitle : session.title}
                    </span>
                  )}
                </div>

                {/* Edit inline controls */}
                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(session.id, e)}
                        className="p-1 hover:text-green-500 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-sm cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => cancelRename(e)}
                        className="p-1 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-sm cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(session.id, session.title, e)}
                        className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-sm cursor-pointer"
                        title="Rename Chat"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => confirmDelete(session.id, e)}
                        className="p-1 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-sm cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Sparkles className="h-5 w-5 text-slate-300 dark:text-zinc-700 mb-2" />
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">{t.noSessions}</span>
          </div>
        )}
      </div>

      {/* Sidebar footer control nodes */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800 space-y-2 select-none">
        
        {/* Google User account connection or Sign In button */}
        {googleUser ? (
          <div className="border border-slate-200 dark:border-zinc-805 bg-white dark:bg-zinc-900 rounded-xl p-2.5 flex flex-col gap-2 shadow-xs text-left">
            <div className="flex items-center gap-2.5">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover shadow-xs border border-slate-200 dark:border-zinc-800"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold leading-none select-none">
                  {googleUser.displayName ? googleUser.displayName.substring(0, 2).toUpperCase() : "AG"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-zinc-150 truncate leading-tight">
                  {googleUser.displayName || "Google User"}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate leading-none mt-0.5">
                  {googleUser.email || ""}
                </div>
              </div>
            </div>

            {/* Workspace tools indicator toggle */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={onToggleWorkspace}
                className={`flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer ${
                  isWorkspaceOpen ? "text-blue-600 ring-1 ring-blue-500/20" : "text-slate-600 dark:text-zinc-350"
                }`}
                title="Google Workspace Copilot Tool"
              >
                <FolderOpen className="h-3 w-3" />
                <span>Workspace</span>
              </button>

              <button
                onClick={onGoogleLogout}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-red-650 dark:text-red-400 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer"
                title={t.signOut}
              >
                <LogOut className="h-3 w-3" />
                <span>{t.signOut}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-2 px-3 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-slate-250 dark:border-zinc-800 rounded-xl transition-all cursor-pointer text-slate-700 dark:text-zinc-200 text-xs font-bold shadow-xs active:scale-[0.98]"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{t.signInGoogle}</span>
          </button>
        )}

        {/* Change language toggle swapper button */}
        <button
          onClick={() => onChangeLanguage(language === 'ar' ? 'en' : 'ar')}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-blue-500" />
            <span>{language === 'ar' ? "English (EN)" : "العربية (AR)"}</span>
          </div>
        </button>

        {/* Toggle dark style / Theme manager */}
        <button
          onClick={onToggleDarkMode}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> : <Moon className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />}
            <span>{darkMode ? t.lightMode : t.darkMode}</span>
          </div>
        </button>

        {/* Wipe history cleaner */}
        {sessions.length > 0 && (
          <button
            onClick={() => {
              if (confirm(t.clearConfirmation)) {
                onClearAllSessions();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-900/50 transition-all cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            <span>{t.clearChats}</span>
          </button>
        )}

        {/* Credit marker */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 px-2 pt-0.5 font-light">
          <span>{t.appName} v2.5</span>
          <span>{t.developerCredit}</span>
        </div>
      </div>
    </aside>
  );
}
