/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  Menu,
  BrainCircuit,
  Globe,
  Send,
  Sliders,
  Sparkles,
  AlertCircle,
  X,
  Plus,
  Paperclip
} from "lucide-react";
import { ChatSession, Message, GroundingSource } from "./types";
import { translations } from "./lib/translations";
import Sidebar from "./components/Sidebar";
import WelcomeScreen from "./components/WelcomeScreen";
import ChatArea from "./components/ChatArea";
import WorkspacePanel from "./components/WorkspacePanel";
import { User } from "firebase/auth";
import { 
  initAuth, 
  googleSignIn, 
  googleLogout 
} from "./lib/firebase";
import { 
  saveSessionMetadata, 
  saveMessageToFirestore, 
  loadUserChatSessions, 
  deleteUserChatSession 
} from "./lib/firestoreSync";

export default function App() {
  // --- Persistent States & Auth States ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // --- Dual-Language Arabic & English custom system states ---
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    const saved = localStorage.getItem("abogabal_language");
    return (saved === 'en' || saved === 'ar') ? saved : 'ar'; // Default to Arabic as requested by user!
  });

  // --- Multimodal Message Attachment Upload States ---
  const [selectedFile, setSelectedFile] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("abogabal_dark_mode");
    return saved ? JSON.parse(saved) : true; // Default to sleek dark theme
  });

  const [globalTemp, setGlobalTemp] = useState<number>(() => {
    const saved = localStorage.getItem("abogabal_global_temp");
    return saved ? parseFloat(saved) : 0.7;
  });

  // --- UI Layout component states ---
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Auth & Real-Time Firestore Sync Listener (Warm Boot) ---
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setIsLoading(true);
        try {
          // Sync sessions from user's secure cloud space
          const cloudSessions = await loadUserChatSessions(user.uid);
          setSessions(cloudSessions);
          
          const savedActiveId = localStorage.getItem("abogabal_active_session_id");
          if (savedActiveId && cloudSessions.some(s => s.id === savedActiveId)) {
            setActiveSessionId(savedActiveId);
          } else if (cloudSessions.length > 0) {
            setActiveSessionId(cloudSessions[0].id);
          } else {
            setActiveSessionId(null);
          }
        } catch (err: any) {
          console.error("Firestore sessions load error:", err);
          setErrorMessage("Failed to load your personal chats from Firestore securely.");
        } finally {
          setIsLoading(false);
        }
      },
      () => {
        // Not logged in: fallback gracefully to local offline storage cache
        setGoogleUser(null);
        setAccessToken(null);
        setIsWorkspaceOpen(false);
        try {
          const saved = localStorage.getItem("abogabal_chat_sessions");
          if (saved) {
            const parsed = JSON.parse(saved);
            setSessions(parsed);
            const savedActiveId = localStorage.getItem("abogabal_active_session_id");
            if (savedActiveId && parsed.some((s: any) => s.id === savedActiveId)) {
              setActiveSessionId(savedActiveId);
            } else if (parsed.length > 0) {
              setActiveSessionId(parsed[0].id);
            }
          } else {
            setSessions([]);
            setActiveSessionId(null);
          }
        } catch (e) {
          console.warn("localStorage loading failed:", e);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  // --- Offline local persistence backups fallback ---
  useEffect(() => {
    if (!googleUser) {
      localStorage.setItem("abogabal_chat_sessions", JSON.stringify(sessions));
    }
  }, [sessions, googleUser]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem("abogabal_active_session_id", activeSessionId);
    } else {
      localStorage.removeItem("abogabal_active_session_id");
    }
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("abogabal_dark_mode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("abogabal_global_temp", globalTemp.toString());
  }, [globalTemp]);

  useEffect(() => {
    localStorage.setItem("abogabal_language", language);
  }, [language]);

  // Adjust input width or heights dynamically
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
    }
  }, [inputMessage]);

  // --- Google Workspace Authentication Callbacks ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        
        // Sync cloud sessions instantly
        const cloudSessions = await loadUserChatSessions(result.user.uid);
        setSessions(cloudSessions);
        if (cloudSessions.length > 0) {
          setActiveSessionId(cloudSessions[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
    } catch (err: any) {
      console.error("Login failure:", err);
      setErrorMessage(err.message || "Google sign-in and scopes authorization failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers for Multimodal Image/File uploads ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setErrorMessage(language === 'ar' ? "حجم الملف كبير جداً! الحد الأقصى المسموح به هو 12 ميجابايت." : "Selected file is too large! Maximum allowed is 12MB.");
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      setSelectedFile({
        name: file.name,
        mimeType: file.type,
        data: fileReader.result as string,
      });
    };
    fileReader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        setErrorMessage(language === 'ar' ? "حجم الملف كبير جداً! الحد الأقصى المسموح به هو 12 ميجابايت." : "Selected file is too large! Maximum allowed is 12MB.");
        return;
      }
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setSelectedFile({
          name: file.name,
          mimeType: file.type,
          data: fileReader.result as string,
        });
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleGoogleLogout = async () => {
    setIsLoading(true);
    try {
      await googleLogout();
      setGoogleUser(null);
      setAccessToken(null);
      setIsWorkspaceOpen(false);
      setSessions([]);
      setActiveSessionId(null);
    } catch (err: any) {
      console.error("Logout failure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Session Managers ---
  const handleNewSession = (initialPrompt?: string, forceUser?: User | null) => {
    const activeUser = forceUser !== undefined ? forceUser : googleUser;
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: initialPrompt ? (initialPrompt.substring(0, 32) + (initialPrompt.length > 32 ? "..." : "")) : `New Chat Sessions`,
      messages: [],
      deepThinkEnabled: true, // Enabled by default for thorough logical planning
      webSearchEnabled: false,
      temperature: globalTemp,
      createdAt: Date.now(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setErrorMessage(null);

    // Sync metadata to Firestore Cloud (if logged in)
    if (activeUser) {
      saveSessionMetadata(newSession, activeUser.uid).catch((err) => {
        console.error("Failed to sync new session metadata to Firestore:", err);
      });
    }

    return newId;
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setErrorMessage(null);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
    }

    // Sync deletion to Firestore Cloud
    if (googleUser) {
      deleteUserChatSession(id).catch((err) => {
        console.error("Failed to delete user cloud chat:", err);
      });
    }
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const updated = { ...s, title: newTitle };
          if (googleUser) {
            saveSessionMetadata(updated, googleUser.uid).catch((err) => {
              console.error("Failed to sync structural rename:", err);
            });
          }
          return updated;
        }
        return s;
      })
    );
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const toggleDeepThink = () => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const updated = { ...s, deepThinkEnabled: !s.deepThinkEnabled };
          if (googleUser) {
            saveSessionMetadata(updated, googleUser.uid).catch((err) => {
              console.error("Failed to save changes:", err);
            });
          }
          return updated;
        }
        return s;
      })
    );
  };

  const toggleWebSearch = () => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          const updated = { ...s, webSearchEnabled: !s.webSearchEnabled };
          if (googleUser) {
            saveSessionMetadata(updated, googleUser.uid).catch((err) => {
              console.error("Failed to save changes:", err);
            });
          }
          return updated;
        }
        return s;
      })
    );
  };

  // --- Live message sending stream ---
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || isLoading) return;

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      // Pass the current user context directly so it creates the cloud doc safely
      currentSessionId = handleNewSession(promptToSend, googleUser);
    }

    const currentSessionIndex = sessions.findIndex((s) => s.id === currentSessionId);
    if (currentSessionIndex === -1) return;

    // Build fresh user message
    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      text: promptToSend,
      timestamp: Date.now(),
      attachment: selectedFile ? { ...selectedFile } : undefined,
    };

    // Update session store and clean input bar
    setInputMessage("");
    setSelectedFile(null);
    setIsLoading(true);
    setErrorMessage(null);

    let targetMessages = [...(sessions.find((s) => s.id === currentSessionId)?.messages || []), userMessage];
    
    // Auto-update title if it was named default
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          const isDefaultTitle = s.title === "New Chat Sessions";
          return {
            ...s,
            title: isDefaultTitle ? (promptToSend.substring(0, 32) + (promptToSend.length > 32 ? "..." : "")) : s.title,
            messages: targetMessages,
          };
        }
        return s;
      })
    );

    // Write User Message to Firestore immediately if logged in
    if (googleUser) {
      saveMessageToFirestore(currentSessionId, userMessage).catch((e) => {
        console.error("Firestore user message write failed:", e);
      });
    }

    // Prepare model options for query payload
    const sessionConfig = sessions.find((s) => s.id === currentSessionId) || {
      deepThinkEnabled: true,
      webSearchEnabled: false,
    };

    const isDeepThink = sessionConfig.deepThinkEnabled;
    const isWebSearch = sessionConfig.webSearchEnabled;

    // Create placeholder for assistant responses
    const assistantMsgId = `msg_ast_${Date.now()}`;
    const assistantMessagePlaceholder: Message = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      thought: isDeepThink ? "" : undefined,
      thinkingTime: isDeepThink ? 0 : undefined,
      isThinking: isDeepThink,
      groundingSources: [],
      timestamp: Date.now(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSessionId
          ? { ...s, messages: [...s.messages, assistantMessagePlaceholder] }
          : s
      )
    );

    // Clock reasoning ticker
    let reasoningTicker: NodeJS.Timeout | null = null;
    let reasoningSecs = 0;
    if (isDeepThink) {
      reasoningTicker = setInterval(() => {
        reasoningSecs += 1;
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id === currentSessionId) {
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, thinkingTime: reasoningSecs } : m
                ),
              };
            }
            return s;
          })
        );
      }, 1000);
    }

    let accumulatedText = "";
    let accumulatedThought = "";
    let accumulatedGrounding: GroundingSource[] = [];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: targetMessages,
          deepThinkEnabled: isDeepThink,
          webSearchEnabled: isWebSearch,
          temperature: globalTemp,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP network error: status code ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Target response stream is unreadable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(trimmed.substring(6));
            
            if (data.type === "thought") {
              accumulatedThought += data.content;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, thought: accumulatedThought, isThinking: true }
                          : m
                      ),
                    };
                  }
                  return s;
                })
              );
            } else if (data.type === "text") {
              // Turn off visual spinner since direct response text has started yielding
              if (isDeepThink && reasoningTicker) {
                clearInterval(reasoningTicker);
                reasoningTicker = null;
              }

              accumulatedText += data.content;
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, text: accumulatedText, isThinking: false }
                          : m
                      ),
                    };
                  }
                  return s;
                })
              );
            } else if (data.type === "grounding") {
              accumulatedGrounding = [...accumulatedGrounding, ...data.sources];
              setSessions((prev) =>
                prev.map((s) => {
                  if (s.id === currentSessionId) {
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, groundingSources: accumulatedGrounding }
                          : m
                      ),
                    };
                  }
                  return s;
                })
              );
            } else if (data.type === "error") {
              throw new Error(data.message);
            }
          } catch (e: any) {
            // Buffer slices or stream errors are handled gracefully
            console.debug("SSE Chunk parse warning:", e);
          }
        }
      }

      // Turn off any leftover tickers when stream completes
      if (reasoningTicker) {
        clearInterval(reasoningTicker);
      }

      // Mark thinking fully done
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, isThinking: false } : m
              ),
            };
          }
          return s;
        })
      );

      // Save the finalized Assistant message securely to Firestore
      if (googleUser) {
        const completedMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          text: accumulatedText,
          thought: accumulatedThought || undefined,
          thinkingTime: reasoningSecs || undefined,
          groundingSources: accumulatedGrounding.length > 0 ? accumulatedGrounding : undefined,
          timestamp: Date.now()
        };
        saveMessageToFirestore(currentSessionId, completedMsg).catch((e) => {
          console.error("Firestore assistant final message write failed:", e);
        });
      }

    } catch (err: any) {
      console.error("Transmission error:", err);
      setErrorMessage(err.message || "Failed to make a session request to ABO GABAL server.");
      
      // Clean up loaded indices 
      if (reasoningTicker) clearInterval(reasoningTicker);
      
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      text: "⚠️ **Error reaching server**: Could not get structured response. Please verify that your `GEMINI_API_KEY` is loaded and valid.",
                      isThinking: false,
                    }
                  : m
              ),
            };
          }
          return s;
        })
      );

      // Save error placeholder to cloud
      if (googleUser) {
        const errorMsg: Message = {
          id: assistantMsgId,
          role: "assistant",
          text: "⚠️ **Error reaching server**: Could not get structured response. Please verify that your `GEMINI_API_KEY` is loaded and valid.",
          timestamp: Date.now()
        };
        saveMessageToFirestore(currentSessionId, errorMsg).catch((e) => {
          console.error("Firestore assistant error message write failed:", e);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllHistory = () => {
    setSessions([]);
    setActiveSessionId(null);
    setErrorMessage(null);
    localStorage.removeItem("abogabal_chat_sessions");
    localStorage.removeItem("abogabal_active_session_id");
  };

  const handleStartWithPrompt = (prompt: string) => {
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = handleNewSession(prompt);
    }
    handleSendMessage(prompt);
  };

  const t = translations[language] || translations.ar;

  return (
    <div className="flex h-screen bg-slate-105 dark:bg-zinc-950 font-sans transition-colors duration-200 text-slate-900 dark:text-zinc-100 overflow-hidden">
      
      {/* 1. Collapsible sidebar logic */}
      {sidebarOpen && (
        <div className="hidden md:block h-full">
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onNewSession={() => handleNewSession()}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onClearAllSessions={clearAllHistory}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            globalTemp={globalTemp}
            onTempChange={setGlobalTemp}
            googleUser={googleUser}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            isWorkspaceOpen={isWorkspaceOpen}
            onToggleWorkspace={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            language={language}
            onChangeLanguage={setLanguage}
          />
        </div>
      )}

      {/* Mini Dialog overlay for mobile sidebar state */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-50 dark:bg-zinc-950 animate-slide-in">
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md bg-slate-200 dark:bg-zinc-800 text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onNewSession={() => {
                handleNewSession();
                setSidebarOpen(false);
              }}
              onSelectSession={(id) => {
                handleSelectSession(id);
                setSidebarOpen(false);
              }}
              onDeleteSession={handleDeleteSession}
              onRenameSession={handleRenameSession}
              onClearAllSessions={() => {
                clearAllHistory();
                setSidebarOpen(false);
              }}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              globalTemp={globalTemp}
              onTempChange={setGlobalTemp}
              googleUser={googleUser}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              isWorkspaceOpen={isWorkspaceOpen}
              onToggleWorkspace={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              language={language}
              onChangeLanguage={setLanguage}
            />
          </div>
        </div>
      )}

      {/* 2. Main Chat content canvas */}
      <main
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-zinc-900 overflow-hidden relative"
      >
        {/* Dynamic drop area hover overlay visual indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-indigo-950/20 backdrop-blur-xs z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-500/50 m-4 rounded-3xl animate-scale-in select-none">
            <span className="p-4 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-3 animate-bounce">
              <Send className="h-6 w-6 rotate-90" />
            </span>
            <p className="text-sm font-bold text-blue-600 dark:text-indigo-400">
              {language === 'ar' ? "أفلت الصورة أو الملف هنا للرفع" : "Drop the image or file here to upload"}
            </p>
          </div>
        )}
        
        {/* Top Header bar */}
        <header className="h-14 border-b border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 flex items-center justify-between px-6 z-10 shrink-0 select-none transition-colors duration-300">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-105 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
              title="Toggle History Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Design segment control bar */}
            <div className="flex bg-gray-100 dark:bg-zinc-850 p-1 rounded-lg shrink-0">
              <button
                onClick={() => {
                  if (activeSession) {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === activeSessionId ? { ...s, deepThinkEnabled: false } : s
                      )
                    );
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeSession && !activeSession.deepThinkEnabled
                    ? "bg-white dark:bg-zinc-700 shadow-xs text-slate-800 dark:text-zinc-100"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-100"
                }`}
              >
                ABO GABAL-V3
              </button>
              <button
                onClick={() => {
                  if (activeSession) {
                    setSessions((prev) =>
                      prev.map((s) =>
                        s.id === activeSessionId ? { ...s, deepThinkEnabled: true } : s
                      )
                    );
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeSession && activeSession.deepThinkEnabled
                    ? "bg-white dark:bg-zinc-700 shadow-xs text-blue-600 dark:text-indigo-400"
                    : "text-slate-500 hover:text-blue-500 dark:hover:text-zinc-100"
                }`}
              >
                ABO GABAL-R1
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!activeSessionId && (
              <button
                onClick={() => handleNewSession()}
                className="flex items-center gap-1.5 px-3.5 py-1 border border-slate-300 dark:border-zinc-700 rounded-full text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-white dark:hover:bg-zinc-900 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Session</span>
              </button>
            )}
            <div className="text-[10px] font-mono px-2 py-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-250 dark:border-zinc-750">
              Temp: {globalTemp.toFixed(1)}
            </div>
          </div>
        </header>

        {/* Global Alert Notification nodes for dynamic error events */}
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/50 p-3.5 flex items-start gap-3 text-xs text-red-700 dark:text-red-400 shrink-0">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="font-semibold">Operations Alert</p>
              <p className="mt-0.5 opacity-90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main interactive panel toggle */}
        {activeSession && activeSession.messages.length > 0 ? (
          <ChatArea
            messages={activeSession.messages}
            isLoading={isLoading}
            onRetry={() => {
              // Extract previous user query and retrigger
              const history = activeSession.messages;
              const lastUserIdx = [...history].reverse().findIndex(m => m.role === 'user');
              if (lastUserIdx !== -1) {
                const userQuery = history[history.length - 1 - lastUserIdx].text;
                // Pop response placeholder and retrigger
                setSessions(prev => prev.map(s => {
                  if (s.id === activeSessionId) {
                    return {
                      ...s,
                      messages: s.messages.filter(m => !m.id.startsWith("msg_ast_"))
                    };
                  }
                  return s;
                }));
                handleSendMessage(userQuery);
              }
            }}
            language={language}
          />
        ) : (
          <WelcomeScreen
            onStartWithPrompt={handleStartWithPrompt}
            deepThinkEnabled={activeSession ? activeSession.deepThinkEnabled : true}
            webSearchEnabled={activeSession ? activeSession.webSearchEnabled : false}
            setDeepThinkEnabled={(val) => {
              if (activeSessionId) {
                toggleDeepThink();
              } else {
                const id = handleNewSession();
                setSessions((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, deepThinkEnabled: val } : s))
                );
              }
            }}
            setWebSearchEnabled={(val) => {
              if (activeSessionId) {
                toggleWebSearch();
              } else {
                const id = handleNewSession();
                setSessions((prev) =>
                  prev.map((s) => (s.id === id ? { ...s, webSearchEnabled: val } : s))
                );
              }
            }}
            language={language}
          />
        )}

        {/* 3. Bottom persistent multi-layered query input */}
        <div className="p-6 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-805 shrink-0" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="max-w-3xl mx-auto flex flex-col relative text-left">
            
            {/* Input pill outer background */}
            <div className="w-full relative rounded-2xl border border-slate-300 dark:border-zinc-750 bg-transparent dark:bg-zinc-950 shadow-xs focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-indigo-950/45 transition-all flex flex-col">
              
              {/* Selected File preview card */}
              {selectedFile && (
                <div className={`px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 dark:border-zinc-850/80 ${language === 'ar' ? 'flex-row' : 'flex-row'}`} dir="ltr">
                  <div className="flex items-center gap-2 max-w-[90%]">
                    {selectedFile.mimeType.startsWith("image/") ? (
                      <img
                        src={selectedFile.data}
                        alt="Selected Preview"
                        className="w-10 h-10 object-cover rounded-lg border border-slate-250 dark:border-zinc-700 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-50 dark:bg-zinc-805 rounded-lg flex items-center justify-center font-bold text-blue-600 dark:text-indigo-400 text-xs shrink-0">
                        <Paperclip className="h-4.5 w-4.5" />
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-md">
                        {selectedFile.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {selectedFile.mimeType}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 rounded-full text-slate-400 hover:bg-slate-105 dark:hover:bg-zinc-800 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Text Area auto expanding form */}
              <textarea
                ref={inputRef}
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isLoading ? (language === 'ar' ? "جاري التفكير والتنقيب..." : "Forming step-by-step logic...") : t.askAnything}
                className={`w-full resize-none border-none outline-hidden focus:outline-hidden text-sm bg-transparent placeholder-gray-400 dark:placeholder-zinc-500 text-slate-800 dark:text-zinc-100 p-4 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                disabled={isLoading}
              />

              {/* Toggles and controls container */}
              <div className="flex items-center justify-between px-4 pb-3 select-none">
                
                {/* Advanced parameters togglers & Multimodal upload */}
                <div className="flex items-center gap-4 text-gray-500">
                  
                  {/* Hidden input file connector */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,text/*"
                    className="hidden"
                  />

                  {/* Attachment selector icon triggers */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                    title={language === 'ar' ? "إضافة ملف مرئي أو مستند" : "Upload picture or text file"}
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>{language === 'ar' ? "إرفاق" : "Attach"}</span>
                  </button>

                  {/* WebSearch toggle button styled as minimalist web search item */}
                  <button
                    onClick={toggleWebSearch}
                    disabled={!activeSessionId}
                    className={`flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
                      activeSession?.webSearchEnabled
                        ? "text-blue-600 dark:text-indigo-400"
                        : "text-gray-400 hover:text-blue-600 dark:hover:text-indigo-400"
                    } ${!activeSessionId ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={activeSessionId ? (language === 'ar' ? "تبديل دمج محرك بحث جوجل" : "Toggle Google Search integration grounding") : (language === 'ar' ? "ابدأ جلسة أولاً" : "Start a chat session first")}
                  >
                    <Globe className="h-4 w-4" />
                    <span>{t.webSearch}</span>
                  </button>

                  {/* DeepThink toggle */}
                  <button
                    onClick={toggleDeepThink}
                    disabled={!activeSessionId}
                    className={`flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors ${
                      activeSession?.deepThinkEnabled
                        ? "text-blue-600 dark:text-indigo-400"
                        : "text-gray-400 hover:text-blue-600 dark:hover:text-indigo-400"
                    } ${!activeSessionId ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={activeSessionId ? (language === 'ar' ? "تبديل إظهار خطوات التفكير" : "Toggle model thought visibilities") : (language === 'ar' ? "ابدأ جلسة أولاً" : "Start a chat session first")}
                  >
                    <BrainCircuit className="h-4 w-4" />
                    <span>{t.deepThink}</span>
                  </button>
                </div>

                {/* Send dispatch button */}
                <button
                  onClick={() => handleSendMessage()}
                  disabled={(!inputMessage.trim() && !selectedFile) || isLoading}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    (inputMessage.trim() || selectedFile) && !isLoading
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-650 cursor-not-allowed"
                  }`}
                  title={language === 'ar' ? "إرسال الاستفسار" : "Send message prompt"}
                >
                  <Send className={`h-4 w-4 ${language === 'ar' ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Subtext capabilities disclaimer label */}
            <div className="text-[10.5px] text-center text-gray-400 mt-3 select-none">
              {t.inputDisclaimer}
            </div>
          </div>
        </div>
      </main>

      {/* 3. Slide-out Workspace drawer panel - persistent and side-by-side on viewport */}
      {isWorkspaceOpen && googleUser && (
        <WorkspacePanel
          onInsertPrompt={(prompt) => {
            setInputMessage(prompt);
            inputRef.current?.focus();
          }}
          onClose={() => setIsWorkspaceOpen(false)}
        />
      )}
    </div>
  );
}
