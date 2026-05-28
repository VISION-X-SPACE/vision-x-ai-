/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatSession, Message } from "../types";

// Local storage namespaces
const SESSIONS_STORAGE_KEY_PREFIX = "abogabal_firestore_sessions_";

/**
 * Saves or updates a session metadata in simulated Firestore.
 */
export async function saveSessionMetadata(session: ChatSession, userId: string): Promise<void> {
  try {
    const key = `${SESSIONS_STORAGE_KEY_PREFIX}${userId}`;
    const saved = localStorage.getItem(key);
    let sessions: ChatSession[] = saved ? JSON.parse(saved) : [];
    
    const existingIdx = sessions.findIndex(s => s.id === session.id);
    if (existingIdx !== -1) {
      sessions[existingIdx] = {
        ...sessions[existingIdx],
        title: session.title,
        deepThinkEnabled: session.deepThinkEnabled,
        webSearchEnabled: session.webSearchEnabled,
        temperature: session.temperature,
      };
    } else {
      sessions.push({
        id: session.id,
        title: session.title,
        deepThinkEnabled: session.deepThinkEnabled,
        webSearchEnabled: session.webSearchEnabled,
        temperature: session.temperature,
        createdAt: session.createdAt || Date.now(),
        messages: session.messages || []
      });
    }
    
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch (err) {
    console.error("Local mock saveSessionMetadata failed:", err);
  }
}

/**
 * Saves a single message inside are subcollection list in simulated Firestore.
 */
export async function saveMessageToFirestore(sessionId: string, message: Message): Promise<void> {
  try {
    // Locate correct storage item
    let targetUserId = "local_user_abogabal";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSIONS_STORAGE_KEY_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          const sessions: ChatSession[] = JSON.parse(value);
          if (sessions.some(s => s.id === sessionId)) {
            targetUserId = key.replace(SESSIONS_STORAGE_KEY_PREFIX, "");
            break;
          }
        }
      }
    }
    
    const key = `${SESSIONS_STORAGE_KEY_PREFIX}${targetUserId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      let sessions: ChatSession[] = JSON.parse(saved);
      const sIdx = sessions.findIndex(s => s.id === sessionId);
      if (sIdx !== -1) {
        if (!sessions[sIdx].messages) {
          sessions[sIdx].messages = [];
        }
        const mIdx = sessions[sIdx].messages.findIndex(m => m.id === message.id);
        if (mIdx !== -1) {
          sessions[sIdx].messages[mIdx] = { ...message };
        } else {
          sessions[sIdx].messages.push({ ...message });
        }
        localStorage.setItem(key, JSON.stringify(sessions));
      }
    }
  } catch (err) {
    console.error("Local mock saveMessageToFirestore failed:", err);
  }
}

/**
 * Loads all sessions and their messages for a specific user.
 */
export async function loadUserChatSessions(userId: string): Promise<ChatSession[]> {
  try {
    const key = `${SESSIONS_STORAGE_KEY_PREFIX}${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error("Local mock loadUserChatSessions failed:", err);
    return [];
  }
}

/**
 * Deletes a session and its subcollection messages.
 */
export async function deleteUserChatSession(sessionId: string): Promise<void> {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSIONS_STORAGE_KEY_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          let sessions: ChatSession[] = JSON.parse(value);
          const hasSession = sessions.some(s => s.id === sessionId);
          if (hasSession) {
            sessions = sessions.filter(s => s.id !== sessionId);
            localStorage.setItem(key, JSON.stringify(sessions));
            break;
          }
        }
      }
    }
  } catch (err) {
    console.error("Local mock deleteUserChatSession failed:", err);
  }
}
