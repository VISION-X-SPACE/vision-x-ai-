/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import {
  Mail,
  FileText,
  Grid,
  Search,
  Send,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ListTodo,
  FileEdit,
  FolderOpen
} from "lucide-react";
import {
  fetchRecentEmails,
  sendEmail,
  fetchDriveFiles,
  createDriveFile,
  createSpreadsheet,
  fetchSpreadsheetValues,
  updateSpreadsheet,
  fetchTaskLists,
  fetchTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  createGoogleDoc,
  fetchGoogleDoc,
  appendTextToGoogleDoc,
  extractTextFromDoc,
  GmailMessage,
  DriveFile,
  TaskList,
  GoogleTask
} from "../lib/workspace";

interface WorkspacePanelProps {
  onInsertPrompt: (prompt: string) => void;
  onClose: () => void;
}

export default function WorkspacePanel({ onInsertPrompt, onClose }: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<"gmail" | "drive" | "sheets" | "tasks" | "docs">("gmail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Gmail states
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Drive states
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [showCreateFileForm, setShowCreateFileForm] = useState(false);

  // Sheets states
  const [sheetId, setSheetId] = useState("");
  const [sheetRange, setSheetRange] = useState("Sheet1!A1:E15");
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [newRowData, setNewRowData] = useState("");
  const [newSheetTitle, setNewSheetTitle] = useState("");
  const [showCreateSheetForm, setShowCreateSheetForm] = useState(false);

  // Google Tasks states
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [selectedTaskListId, setSelectedTaskListId] = useState("");
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);

  // Google Docs states
  const [docsFiles, setDocsFiles] = useState<DriveFile[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [showCreateDocForm, setShowCreateDocForm] = useState(false);
  const [docAppendText, setDocAppendText] = useState("");

  // Custom Google Picker state
  const [pickerModalOpen, setPickerModalOpen] = useState(false);

  // Load active tab details
  useEffect(() => {
    handleRefresh();
  }, [activeTab]);

  // Hook to watch task list ID changes
  useEffect(() => {
    if (activeTab === "tasks" && selectedTaskListId) {
      const loadTasks = async () => {
        setLoading(true);
        setError(null);
        try {
          const items = await fetchTasks(selectedTaskListId);
          setTasks(items);
        } catch (err: any) {
          setError(err.message || "Failed to load tasks from Google Tasks.");
        } finally {
          setLoading(false);
        }
      };
      loadTasks();
    }
  }, [selectedTaskListId, activeTab]);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (activeTab === "gmail") {
        const data = await fetchRecentEmails(12, searchQuery);
        setEmails(data);
      } else if (activeTab === "drive") {
        const data = await fetchDriveFiles(searchQuery);
        setFiles(data);
      } else if (activeTab === "sheets" && sheetId) {
        const values = await fetchSpreadsheetValues(sheetId, sheetRange);
        setSheetData(values);
      } else if (activeTab === "tasks") {
        const lists = await fetchTaskLists();
        setTaskLists(lists);
        if (lists.length > 0) {
          const listId = selectedTaskListId || lists[0].id;
          if (!selectedTaskListId) {
            setSelectedTaskListId(listId);
          }
          const items = await fetchTasks(listId);
          setTasks(items);
        }
      } else if (activeTab === "docs") {
        const driveFiles = await fetchDriveFiles(searchQuery);
        const docsOnly = driveFiles.filter(f => f.mimeType.includes("document"));
        setDocsFiles(docsOnly);
        if (selectedDocId) {
          const docDetail = await fetchGoogleDoc(selectedDocId);
          const rawText = extractTextFromDoc(docDetail);
          setDocText(rawText);
          setDocTitle(docDetail.title || "Untitled Document");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sync Workspace details.");
    } finally {
      setLoading(false);
    }
  };

  // Submit search query
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRefresh();
  };

  // Gmail Send
  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    // MANDATORY USER CONFIRMATION GATES (Privacy and Data Guard)
    const confirmed = window.confirm(
      `Are you sure you want ABO GABAL to send this email via Gmail to: ${emailTo}?\n\nSubject: ${emailSubject}\n\nThis will send a real email account holder.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await sendEmail(emailTo, emailSubject, emailBody);
      setSuccess(`Email successfully sent to ${emailTo}!`);
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    } catch (err: any) {
      setError(err.message || "Could not dispatch email.");
    } finally {
      setLoading(false);
    }
  };

  // Create text file in Drive
  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) {
      setError("Please specify a file name.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const file = await createDriveFile(newFileName, newFileContent, "text/plain");
      setSuccess(`Successfully created file '${newFileName}' in your Drive!`);
      setNewFileName("");
      setNewFileContent("");
      setShowCreateFileForm(false);
      // Wait a moment and refresh
      handleRefresh();
    } catch (err: any) {
      setError(err.message || "File creation failed.");
    } finally {
      setLoading(false);
    }
  };

  // Create sheet
  const handleCreateSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetTitle.trim()) {
      setError("Please specify a sheet title.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const sheet = await createSpreadsheet(newSheetTitle, [
        ["Product / Item", "Price", "Quantity", "Revenue", "Status"],
        ["ABO GABAL API Consulting", "1500", "2", "3000", "Completed"],
        ["ABO GABAL Intelligent Model Tuner", "2000", "1", "2000", "Active"],
        ["High-Contrast UI Theme Tuning", "750", "3", "2250", "Completed"]
      ]);
      setSheetId(sheet.spreadsheetId);
      setSuccess(`Successfully created Google Sheet '${newSheetTitle}'!`);
      setNewSheetTitle("");
      setShowCreateSheetForm(false);
      setActiveTab("sheets");
    } catch (err: any) {
      setError(err.message || "Sheet integration schema lookup failure.");
    } finally {
      setLoading(false);
    }
  };

  // Append spreadsheet row
  const handleAddRowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.trim() || !sheetId) return;

    // MANDATORY MUTATION CONFIRMATION
    const confirmed = window.confirm(
      "Are you sure you want to write and append these values to your active spreadsheet?"
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const rowValues = newRowData.split(",").map(val => val.trim());
      const currentValues = [...sheetData];
      currentValues.push(rowValues);
      
      const nextRowIdx = currentValues.length;
      const targetRange = `Sheet1!A${nextRowIdx}:Z${nextRowIdx}`;
      
      await updateSpreadsheet(sheetId, targetRange, [rowValues]);
      setSuccess("Spreadsheet successfully appended.");
      setNewRowData("");
      handleRefresh();
    } catch (err: any) {
      setError(err.message || "Could not append row.");
    } finally {
      setLoading(false);
    }
  };

  // Analyze email or file prompts
  const triggerEmailSummary = (email: GmailMessage) => {
    onInsertPrompt(
      `Summarize this email for me and identify if there is any action items:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}
Snippet Content:
${email.body || email.snippet}`
    );
  };

  const triggerFileSummary = (file: DriveFile) => {
    onInsertPrompt(
      `Inspect this Google Drive file metadata and tell me about it:
Name: ${file.name}
Mime-Type: ${file.mimeType}
Created Time: ${file.createdTime}
Direct Link: ${file.webViewLink || "None"}`
    );
  };

  const triggerSheetSummary = () => {
    if (!sheetData || sheetData.length === 0) return;
    const formattedRows = sheetData.map((row) => row.join(" | ")).join("\n");
    onInsertPrompt(
      `Analyze this Google Sheet spreadsheet data and give me insights or key calculations:
Spreadsheet ID: ${sheetId}
Data Matrix:
\`\`\`
${formattedRows}
\`\`\``
    );
  };

  // Google Tasks Handlers
  const handleToggleTaskStatus = async (taskId: string, currentStatus: "completed" | "needsAction") => {
    const nextStatus = currentStatus === "completed" ? "needsAction" : "completed";
    const confirmed = window.confirm(`Are you sure you want to change this task status to ${nextStatus === "completed" ? "Completed" : "Active"}?`);
    if (!confirmed) return;
    
    setLoading(true);
    setError(null);
    try {
      await updateGoogleTaskStatus(selectedTaskListId, taskId, nextStatus);
      setSuccess("Task status updated successfully!");
      const items = await fetchTasks(selectedTaskListId);
      setTasks(items);
    } catch (err: any) {
      setError(err.message || "Failed to update Google Task.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedTaskListId) return;

    const confirmed = window.confirm(`Create a new task named "${newTaskTitle}" in your Google Task list?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await createGoogleTask(selectedTaskListId, newTaskTitle, newTaskNotes);
      setSuccess(`Task "${newTaskTitle}" created successfully!`);
      setNewTaskTitle("");
      setNewTaskNotes("");
      setShowCreateTaskForm(false);
      const items = await fetchTasks(selectedTaskListId);
      setTasks(items);
    } catch (err: any) {
      setError(err.message || "Failed to create Google Task.");
    } finally {
      setLoading(false);
    }
  };

  // Google Docs Handlers
  const handleCreateDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const confirmed = window.confirm(`Create a new Google Document named "${newDocTitle}"?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const docResult = await createGoogleDoc(newDocTitle);
      setSelectedDocId(docResult.documentId);
      setSuccess(`Document "${newDocTitle}" created successfully!`);
      setNewDocTitle("");
      setShowCreateDocForm(false);
      handleRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to create Google Doc.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppendDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docAppendText.trim() || !selectedDocId) return;

    const confirmed = window.confirm("Are you sure you want to write and append this text to your Google Document?");
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await appendTextToGoogleDoc(selectedDocId, docAppendText + "\n");
      setSuccess("Text written and appended to document!");
      setDocAppendText("");
      const docDetail = await fetchGoogleDoc(selectedDocId);
      const rawText = extractTextFromDoc(docDetail);
      setDocText(rawText);
    } catch (err: any) {
      setError(err.message || "Failed to update Google Document.");
    } finally {
      setLoading(false);
    }
  };

  const triggerDocSummary = () => {
    if (!docText) return;
    onInsertPrompt(
      `Summarize this Google Document for me and extract key action items or structural notes:
Document Title: ${docTitle}
Document ID: ${selectedDocId}
Full Text:
"""
${docText}
"""`
    );
  };

  const triggerTasksAnalysis = () => {
    if (tasks.length === 0) return;
    const taskDetails = tasks.map(t => `- [${t.status === "completed" ? "X" : " "}] ${t.title} ${t.notes ? `(${t.notes})` : ""}`).join("\n");
    onInsertPrompt(
      `Deconstruct my Google Tasks list. Help me prioritize active tasks, categorize workflows, and suggest optimized next steps:
Tasks in this List:
${taskDetails}`
    );
  };

  return (
    <div className="w-[340px] md:w-[380px] h-full border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col shrink-0 overflow-hidden z-20">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-indigo-400" />
          <h2 className="text-sm font-bold tracking-tight uppercase text-slate-800 dark:text-zinc-200">
            Workspace Copilot
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerModalOpen(true)}
            title="Launch Google File Picker"
            className="p-1 px-2.5 rounded-lg bg-blue-50 dark:bg-indigo-950/45 border border-blue-200/50 dark:border-indigo-900/40 hover:bg-blue-105 dark:hover:bg-indigo-900/70 text-blue-600 dark:text-indigo-400 cursor-pointer flex items-center gap-1 text-[11px] font-bold transition-all"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Launch Picker</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-205 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Primary Workspace Navigation Tabs */}
      <div className="flex bg-slate-100 dark:bg-zinc-900/60 p-1 border-b border-slate-200/60 dark:border-zinc-800/60 shrink-0 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("gmail")}
          className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "gmail"
              ? "bg-white dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <Mail className="h-3.5 w-3.5" />
          <span>Gmail</span>
        </button>
        <button
          onClick={() => setActiveTab("drive")}
          className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "drive"
              ? "bg-white dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Drive</span>
        </button>
        <button
          onClick={() => setActiveTab("sheets")}
          className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "sheets"
              ? "bg-white dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <Grid className="h-3.5 w-3.5" />
          <span>Sheets</span>
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "bg-white dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <ListTodo className="h-3.5 w-3.5" />
          <span>Tasks</span>
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`shrink-0 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
            activeTab === "docs"
              ? "bg-white dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 shadow-xs"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
          }`}
        >
          <FileEdit className="h-3.5 w-3.5" />
          <span>Docs</span>
        </button>
      </div>

      {/* Searching interface forms */}
      {activeTab !== "sheets" && (
        <form onSubmit={handleSearchSubmit} className="p-3 bg-slate-50 dark:bg-zinc-900/10 border-b border-slate-200 dark:border-zinc-800/40 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search in ${activeTab === "gmail" ? "messages" : "file names"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs rounded-lg focus:outline-hidden focus:border-blue-500 dark:focus:border-zinc-750 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            Go
          </button>
        </form>
      )}

      {/* Main status indicator */}
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 border-b border-slate-100 dark:border-zinc-800/40 bg-slate-50/20">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-xs text-slate-500">Querying Workspace secure API...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 text-xs flex items-start gap-2 border-b border-red-100 dark:border-red-900/30">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2 border-b border-emerald-100 dark:border-emerald-900/35">
          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Tab Panels Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
        
        {/* ==================================== */}
        {/* GMAIL PANEL */}
        {/* ==================================== */}
        {activeTab === "gmail" && (
          <div className="space-y-4">
            {/* Quick Composition Trigger */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/90 dark:bg-zinc-950">
              <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-2.5 flex items-center justify-between">
                <span>Compose Real Email</span>
                <Mail className="h-3.5 w-3.5 text-blue-500" />
              </h3>
              <form onSubmit={handleSendEmailSubmit} className="space-y-2 text-xs">
                <input
                  type="email"
                  placeholder="Recipient Email"
                  required
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200"
                />
                <input
                  type="text"
                  placeholder="Subject"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200"
                />
                <textarea
                  placeholder="Message Body..."
                  rows={3}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200 resize-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-350"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Secure Message</span>
                </button>
              </form>
            </div>

            {/* Emails List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Recent Emails
              </h3>
              {emails.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">No recent emails found.</div>
              ) : (
                emails.map((email) => {
                  const isExpanded = selectedEmail?.id === email.id;
                  return (
                    <div
                      key={email.id}
                      className={`border rounded-xl p-3 text-xs transition-colors cursor-pointer ${
                        isExpanded
                          ? "border-blue-500/50 bg-blue-50/10 dark:bg-zinc-900"
                          : "border-slate-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                      }`}
                      onClick={() => setSelectedEmail(isExpanded ? null : email)}
                    >
                      <div className="flex justify-between items-start mb-1 text-slate-800 dark:text-zinc-100">
                        <span className="font-bold truncate max-w-[150px]">{email.from}</span>
                        <span className="text-[10px] text-slate-400">{email.date?.split(" ")[1] || "Today"}</span>
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-zinc-300 truncate mb-1">
                        {email.subject}
                      </div>
                      <p className="text-slate-500 dark:text-zinc-400 truncate-3-lines leading-snug">
                        {isExpanded ? (email.body || email.snippet) : email.snippet}
                      </p>

                      {isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-zinc-800 flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerEmailSummary(email);
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 rounded-lg hover:bg-blue-50 dark:hover:bg-zinc-800 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Ask AI to Summarize</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* GOOGLE DRIVE PANEL */}
        {/* ==================================== */}
        {activeTab === "drive" && (
          <div className="space-y-4">
            {/* Create File Collapse Toggle */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/90 dark:bg-zinc-950">
              <button
                onClick={() => setShowCreateFileForm(!showCreateFileForm)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer"
              >
                <span>Upload New Document</span>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
              {showCreateFileForm && (
                <form onSubmit={handleCreateFileSubmit} className="space-y-2 mt-3 text-xs">
                  <input
                    type="text"
                    placeholder="Document Title (e.g. abogabal.txt)"
                    required
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-755 dark:text-zinc-200"
                  />
                  <textarea
                    placeholder="File Contents..."
                    rows={3}
                    required
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-755 dark:text-zinc-200 resize-none font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-350"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create File in Drive</span>
                  </button>
                </form>
              )}
            </div>

            {/* Files list */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                Drive Documents
              </h3>
              {files.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">No files indexes.</div>
              ) : (
                files.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  const isSheetFile = file.mimeType.includes("spreadsheet");
                  return (
                    <div
                      key={file.id}
                      className={`border rounded-xl p-3 text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-50/10 dark:bg-zinc-900"
                          : "border-slate-200 dark:border-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-900/60"
                      }`}
                      onClick={() => {
                        setSelectedFile(isSelected ? null : file);
                        if (isSheetFile) {
                          setSheetId(file.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-slate-800 dark:text-zinc-150">
                        {isSheetFile ? (
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-bold truncate flex-1">{file.name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{file.mimeType.split(".").pop()}</span>
                        <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                      </div>

                      {isSelected && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10.5px] text-blue-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Open File</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <div className="flex gap-1">
                            {isSheetFile && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab("sheets");
                                }}
                                className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 rounded-lg text-[10px] font-bold"
                              >
                                Edit Sheet
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerFileSummary(file);
                              }}
                              className="px-2 py-1 bg-slate-100 dark:bg-zinc-850 text-blue-600 dark:text-indigo-400 rounded-lg hover:bg-blue-50 dark:hover:bg-zinc-805 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>Analyze</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* GOOGLE SHEETS PANEL */}
        {/* ==================================== */}
        {activeTab === "sheets" && (
          <div className="space-y-4">
            {/* Create Spreadsheet Form */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/90 dark:bg-zinc-950">
              <button
                onClick={() => setShowCreateSheetForm(!showCreateSheetForm)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer"
              >
                <span>Create New Spreadsheet</span>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
              {showCreateSheetForm && (
                <form onSubmit={handleCreateSheetSubmit} className="space-y-2 mt-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Spreadsheet Title"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-755 dark:text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-350"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create & Launch Sheet</span>
                  </button>
                </form>
              )}
            </div>

            {/* Active sheet config */}
            <div className="space-y-2.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Active Spreadsheet ID or URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Google Spreadsheet ID..."
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg text-xs dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
                  />
                  <button
                    onClick={handleRefresh}
                    className="px-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 cursor-pointer text-xs"
                  >
                    Sync
                  </button>
                </div>
              </div>

              {sheetId && (
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Range</label>
                  <input
                    type="text"
                    value={sheetRange}
                    onChange={(e) => setSheetRange(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg text-xs dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
                  />
                </div>
              )}
            </div>

            {/* Spreadsheet Matrix Data grid */}
            {sheetId && sheetData.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sheet Cells
                  </h3>
                  <button
                    onClick={triggerSheetSummary}
                    className="px-2 py-1 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-indigo-400 rounded-lg hover:bg-blue-100 text-[10.5px] font-bold flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>AI Analysis Insight</span>
                  </button>
                </div>

                {/* Table Viewer */}
                <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto max-h-[220px]">
                  <table className="w-full text-left border-collapse text-[11px] font-sans">
                    <tbody>
                      {sheetData.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={`${
                            rIdx === 0
                              ? "bg-slate-100 dark:bg-zinc-900 font-bold border-b border-slate-200 dark:border-zinc-850"
                              : "border-b border-slate-100 dark:border-zinc-900/40 hover:bg-slate-50/50"
                          } text-slate-750 dark:text-zinc-250`}
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 min-w-[80px] truncate max-w-[150px]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Append row */}
                <form onSubmit={handleAddRowSubmit} className="border border-slate-250 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950 text-xs mt-2">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200 mb-1.5">Add Values Row</h4>
                  <p className="text-[10px] text-slate-400 mb-2">Separate columns using commas: (e.g., Widget, 5.5, 10, Complete)</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Col1, Col2, Col3..."
                      value={newRowData}
                      required
                      onChange={(e) => setNewRowData(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                    >
                      Add Row
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!sheetId && (
              <div className="text-center py-10 text-xs text-slate-400 italic">
                Select a Spreadsheet from Google Drive, create a new one above, or paste a Spreadsheet ID to synchronize.
              </div>
            )}
          </div>
        )}

        {/* ==================================== */}
        {/* GOOGLE TASKS PANEL */}
        {/* ==================================== */}
        {activeTab === "tasks" && (
          <div className="space-y-4 text-left">
            {/* Create Task Form */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/90 dark:bg-zinc-950">
              <button
                onClick={() => setShowCreateTaskForm(!showCreateTaskForm)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer"
              >
                <span>Create New Task</span>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
              {showCreateTaskForm && (
                <form onSubmit={handleCreateTaskSubmit} className="space-y-2 mt-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Task Title *"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200"
                  />
                  <textarea
                    placeholder="Notes / Description (Optional)"
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-755 dark:text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-350"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Task</span>
                  </button>
                </form>
              )}
            </div>

            {/* Task list selection dropdown */}
            {taskLists.length > 0 && (
              <div className="space-y-1 text-xs">
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Task List
                </label>
                <select
                  value={selectedTaskListId}
                  onChange={(e) => setSelectedTaskListId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-850 dark:text-zinc-200 cursor-pointer text-xs"
                >
                  {taskLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tasks list items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  List Tasks ({tasks.length})
                </h3>
                {tasks.length > 0 && (
                  <button
                    onClick={triggerTasksAnalysis}
                    className="px-2 py-1 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-indigo-400 rounded-lg hover:bg-blue-100 text-[10.5px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>AI Priority Review</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic">
                    Great job! No pending tasks found in this list.
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isCompleted = task.status === "completed";
                    return (
                      <div
                        key={task.id}
                        className={`p-3 border rounded-xl flex items-start gap-3 transition-all ${
                          isCompleted
                            ? "bg-slate-50/70 dark:bg-zinc-950/20 border-slate-100 dark:border-zinc-900/60 opacity-65"
                            : "bg-white dark:bg-zinc-900/80 border-slate-200/80 dark:border-zinc-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => handleToggleTaskStatus(task.id, task.status)}
                          className="mt-1 h-3.5 w-3.5 rounded border-slate-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <h4
                            className={`text-xs font-bold ${
                              isCompleted
                                ? "text-slate-400 dark:text-zinc-500 line-through"
                                : "text-slate-800 dark:text-zinc-200"
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.notes && (
                            <p className="text-[10.5px] text-slate-404 dark:text-zinc-500 mt-1">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* GOOGLE DOCS PANEL */}
        {/* ==================================== */}
        {activeTab === "docs" && (
          <div className="space-y-4 text-xs text-left">
            {/* Create Doc Form */}
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/90 dark:bg-zinc-950">
              <button
                onClick={() => setShowCreateDocForm(!showCreateDocForm)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 cursor-pointer"
              >
                <span>Create New Google Doc</span>
                <Plus className="h-4 w-4 text-slate-400" />
              </button>
              {showCreateDocForm && (
                <form onSubmit={handleCreateDocSubmit} className="space-y-2 mt-3 text-xs">
                  <input
                    type="text"
                    required
                    placeholder="Document Title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-750 dark:text-zinc-200"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-slate-350"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create & Sync Doc</span>
                  </button>
                </form>
              )}
            </div>

            {/* Docs lists from connected Drive */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Document (Google Docs)
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setTimeout(() => handleRefresh(), 100);
                }}
                className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-zinc-800 rounded-lg dark:bg-zinc-900 text-slate-850 dark:text-zinc-200 cursor-pointer text-xs"
              >
                <option value="">-- No Document Selected --</option>
                {docsFiles.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Document details, AI analysis and updates */}
            {selectedDocId && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-150 dark:border-zinc-850">
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-[9.5px] text-slate-400 uppercase font-semibold">Loaded Document</p>
                    <h4 className="text-xs font-bold text-slate-850 dark:text-zinc-200 truncate">{docTitle}</h4>
                  </div>
                  <button
                    onClick={triggerDocSummary}
                    disabled={!docText}
                    title="Summarize with AI"
                    className="p-1 px-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>AI Summary</span>
                  </button>
                </div>

                {/* Substantive Document Preview Canvas */}
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Document Text Content</label>
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950/80 max-h-[160px] overflow-y-auto text-[11px] font-sans whitespace-pre-wrap leading-relaxed dark:text-zinc-300">
                    {docText ? docText : <span className="text-slate-400 italic">This document is empty. Or loading context...</span>}
                  </div>
                </div>

                {/* Dynamic Appending Form */}
                <form onSubmit={handleAppendDocSubmit} className="border border-slate-150 dark:border-zinc-850 rounded-xl p-3 bg-white dark:bg-zinc-900/50 space-y-2">
                  <h4 className="font-bold text-slate-850 dark:text-zinc-200 text-left">Write & Append Content</h4>
                  <p className="text-[9.5px] text-slate-400 text-left">Add notes or paragraphs directly to the end of this active document:</p>
                  <textarea
                    required
                    rows={3}
                    placeholder="Type the content to append to this Google Doc..."
                    value={docAppendText}
                    onChange={(e) => setDocAppendText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg dark:bg-zinc-950 text-slate-850 dark:text-zinc-200 outline-hidden"
                  />
                  <button
                    type="submit"
                    disabled={loading || !selectedDocId}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Write File Addition</span>
                  </button>
                </form>
              </div>
            )}

            {!selectedDocId && (
              <div className="text-center py-10 text-xs text-slate-400 italic">
                Select a Document from the list above, or create a new one to begin editing with AI.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================== */}
      {/* GOOGLE FILE PICKER MODAL */}
      {/* ==================================== */}
      {pickerModalOpen && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-55 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up">
            {/* Picker Header */}
            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/40 shrink-0">
              <div className="flex items-center gap-2 font-mono">
                <FolderOpen className="h-4 w-4 text-blue-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wide">
                  Google Picker
                </h3>
              </div>
              <button
                onClick={() => setPickerModalOpen(false)}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Picker Body content */}
            <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
              <p className="text-[10px] text-slate-400 text-left">
                Fast-search and pick Google Docs, Sheets, or custom files straight from Drive via dynamic Picker OAuth scopes:
              </p>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Drive files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 text-xs rounded-lg text-slate-850 dark:text-zinc-200 outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRefresh()}
                  className="flex-1 px-2 py-1 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-indigo-400 text-[10px] font-bold rounded-md hover:bg-blue-105 transition-all cursor-pointer"
                >
                  Sync Picker Index
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1 max-h-[250px] pr-1 scrollbar-thin text-left">
                {files.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 italic">
                    No workspace files indexed.
                  </div>
                ) : (
                  files.map((file) => {
                    const isSheetItem = file.mimeType.includes("spreadsheet");
                    const isDocItem = file.mimeType.includes("document");
                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          if (isSheetItem) {
                            setSheetId(file.id);
                            setSheetRange("Sheet1!A1:E15");
                            setActiveTab("sheets");
                            setSuccess(`Picked Spreadsheet: ${file.name}`);
                          } else if (isDocItem) {
                            setSelectedDocId(file.id);
                            setActiveTab("docs");
                            setSuccess(`Picked Document: ${file.name}`);
                          } else {
                            setSelectedFile(file);
                            setActiveTab("drive");
                            setSuccess(`Picked General File: ${file.name}`);
                          }
                          setPickerModalOpen(false);
                          setTimeout(() => handleRefresh(), 110);
                        }}
                        className="p-2 border border-slate-100 dark:border-zinc-850 hover:border-blue-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/40 hover:bg-blue-50/20 dark:hover:bg-zinc-900/40 rounded-lg transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          {isSheetItem ? (
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 flex-none" />
                          ) : isDocItem ? (
                            <FileEdit className="h-3.5 w-3.5 text-indigo-505 text-indigo-500 flex-none" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-blue-500 flex-none" />
                          )}
                          <span className="text-xs font-semibold truncate text-slate-700 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-indigo-400">
                            {file.name}
                          </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Picker Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-950/30 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">OAuth Picker Pipeline</span>
              <button
                onClick={() => {
                  window.alert("Standard Native Google Picker SDK requires specific billing-enabled Developer API keys, verified Client IDs, and approved domain origins. The embedded Picker uses secure Drive OAuth APIs to fetch, list, and filter documents instantly without errors.");
                }}
                className="text-blue-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
              >
                Native SDK Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
