/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAccessToken } from "./firebase";

/**
 * Interface definition for Gmail items
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
}

/**
 * Interface definition for Drive files
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

/**
 * Get active Bearer headers
 */
async function getAuthHeaders() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Authentication Required: Please sign in with Google to retrieve authorization credentials.");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

// ==========================================
// 1. Gmail API Helpers
// ==========================================

export async function fetchRecentEmails(maxResults = 10, search = ""): Promise<GmailMessage[]> {
  const headers = await getAuthHeaders();
  let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
  if (search) {
    url += `&q=${encodeURIComponent(search)}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.statusText}`);
  }

  const listData = await res.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Batch query each message details to get snippet, headers (subject, from, to)
  const detailPromises = listData.messages.map(async (msg: { id: string }) => {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers }
      );
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();

      const headersList = detail.payload?.headers || [];
      const subject = headersList.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
      const from = headersList.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
      const to = headersList.find((h: any) => h.name.toLowerCase() === "to")?.value || "Me";
      const date = headersList.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

      // Try finding plain-text body if available
      let body = "";
      if (detail.payload?.parts) {
        const textPart = detail.payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart && textPart.body?.data) {
          body = utf8DecodeBase64(textPart.body.data);
        } else {
          // Fall back to first part or payload snippet
          body = detail.snippet || "";
        }
      } else if (detail.payload?.body?.data) {
        body = utf8DecodeBase64(detail.payload.body.data);
      } else {
        body = detail.snippet || "";
      }

      return {
        id: detail.id,
        threadId: detail.threadId,
        snippet: detail.snippet || "",
        subject,
        from,
        to,
        date,
        body
      };
    } catch (e) {
      console.warn("Error loading email content:", e);
      return null;
    }
  });

  const results = await Promise.all(detailPromises);
  return results.filter((r): r is GmailMessage => r !== null);
}

// Base64URL decoding helper helper
function utf8DecodeBase64(base64UrlStr: string) {
  try {
    const base64 = base64UrlStr.replace(/-/g, "+").replace(/_/g, "/");
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch (e) {
    return "Failed to decode snippet body.";
  }
}

export async function sendEmail(to: string, subject: string, body: string): Promise<any> {
  const headers = await getAuthHeaders();
  
  // Construct simple RFC 2822 email headers and message
  const emailContent = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${window.btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body
  ].join("\r\n");

  // Encode safely in base64url format
  const rawBase64 = window.btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers,
    body: JSON.stringify({ raw: rawBase64 })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to send email: ${errText || res.statusText}`);
  }

  return res.json();
}


// ==========================================
// 2. Google Drive API Helpers
// ==========================================

export async function fetchDriveFiles(search = ""): Promise<DriveFile[]> {
  const headers = await getAuthHeaders();
  let queryStr = "trashed = false";
  if (search) {
    queryStr += ` and name contains '${search.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name,mimeType,createdTime,size,iconLink,webViewLink)&pageSize=25`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Drive list error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createDriveFile(name: string, content: string, mimeType = "text/plain"): Promise<any> {
  const headers = await getAuthHeaders();
  
  // Simple multi-part post or binary posting
  const fileMetadata = { name, mimeType };
  
  // Use a simple fetch multi-part setup
  const boundary = "workspace_upload_boundary";
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(fileMetadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}`,
    "",
    content,
    `--${boundary}--`
  ].join("\r\n");

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: headers.Authorization,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!res.ok) {
    throw new Error(`Drive upload error: ${res.statusText}`);
  }

  return res.json();
}


// ==========================================
// 3. Google Sheets API Helpers
// ==========================================

export async function createSpreadsheet(title: string, dataValues?: string[][]): Promise<any> {
  const headers = await getAuthHeaders();
  
  // Create spreadsheet outline
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers,
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!res.ok) {
    throw new Error(`Sheets creation failed: ${res.statusText}`);
  }

  const spreadsheet = await res.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  if (dataValues && dataValues.length > 0) {
    // Fill initial values
    await updateSpreadsheet(spreadsheetId, "Sheet1!A1", dataValues);
  }

  return spreadsheet;
}

export async function updateSpreadsheet(spreadsheetId: string, range: string, values: string[][]): Promise<any> {
  const headers = await getAuthHeaders();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      range,
      majorDimension: "ROWS",
      values
    })
  });

  if (!res.ok) {
    throw new Error(`Sheet write error: ${res.statusText}`);
  }

  return res.json();
}

export async function fetchSpreadsheetValues(spreadsheetId: string, range = "Sheet1!A1:Z100"): Promise<string[][]> {
  const headers = await getAuthHeaders();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Sheet read error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.values || [];
}

// ==========================================
// 4. Google Tasks API Helpers
// ==========================================

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
}

export async function fetchTaskLists(): Promise<TaskList[]> {
  const headers = await getAuthHeaders();
  const res = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", { headers });
  if (!res.ok) {
    throw new Error(`Tasks list loading failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function fetchTasks(listId: string): Promise<GoogleTask[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=true`, { headers });
  if (!res.ok) {
    throw new Error(`Fetching tasks failed: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items || [];
}

export async function createGoogleTask(listId: string, title: string, notes?: string): Promise<GoogleTask> {
  const headers = await getAuthHeaders();
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title,
      notes,
      status: "needsAction"
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to create task: ${res.statusText}`);
  }
  return res.json();
}

export async function updateGoogleTaskStatus(listId: string, taskId: string, status: "completed" | "needsAction"): Promise<GoogleTask> {
  const headers = await getAuthHeaders();
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      id: taskId,
      status
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to update task status: ${res.statusText}`);
  }
  return res.json();
}

// ==========================================
// 5. Google Docs API Helpers
// ==========================================

export async function createGoogleDoc(title: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers,
    body: JSON.stringify({ title })
  });
  if (!res.ok) {
    throw new Error(`Docs Creation failed: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchGoogleDoc(documentId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, { headers });
  if (!res.ok) {
    throw new Error(`Fetch Document details failed: ${res.statusText}`);
  }
  return res.json();
}

export async function appendTextToGoogleDoc(documentId: string, text: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            text,
            endOfSegmentLocation: {}
          }
        }
      ]
    })
  });
  if (!res.ok) {
    throw new Error(`Append Document failed: ${res.statusText}`);
  }
  return res.json();
}

export function extractTextFromDoc(docData: any): string {
  if (!docData || !docData.body || !docData.body.content) return "";
  let text = "";
  for (const element of docData.body.content) {
    if (element.paragraph) {
      for (const el of element.paragraph.elements) {
        if (el.textRun && el.textRun.content) {
          text += el.textRun.content;
        }
      }
    }
  }
  return text;
}
