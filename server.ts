/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client getter
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health and Config APIs
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Cloud SQL Database helper check
const isSqlConfigured = () => {
  return !!(
    process.env.SQL_HOST &&
    process.env.SQL_USER &&
    process.env.SQL_PASSWORD &&
    process.env.SQL_DB_NAME
  );
};

// Secure Cloud SQL Database User Sync API
app.post("/api/user/sync", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ error: "Missing user identification UID in verified token" });
    }

    if (!isSqlConfigured()) {
      console.warn("SQL database credentials are not set at runtime; falling back to secure memory state.");
      return res.json({
        synced: true,
        mode: "simulation",
        user: { uid, email: email || req.user?.email || "anonymous@example.com", isSimulated: true }
      });
    }

    const dbUser = await getOrCreateUser(uid, email || req.user?.email || "anonymous@google.com");
    res.json({
      synced: true,
      mode: "production",
      user: dbUser
    });
  } catch (err: any) {
    console.error("User database synchronization error:", err);
    res.status(500).json({ error: err.message || "Failed to synchronize user profile" });
  }
});

// Full-stack Chat completions streaming API
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, deepThinkEnabled, webSearchEnabled, temperature } = req.body;
    
    // Validate inputs
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }

    // Set headers for Server-Sent Events (SSE)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Prevent response buffering in reverse proxies
    });

    // Write handshake
    res.write(`data: ${JSON.stringify({ type: "connection_established" })}\n\n`);

    // Prepare system instruction
    const systemInstruction = `You are "ABO GABAL" (أبو جبل), an elite, deep-thinking Arabic & English AI assistant.
Your name is ABO GABAL, and you should introduce yourself with pride. You are extremely intelligent, helpful, articulate, and precise.
${deepThinkEnabled ? `
CRITICAL INSTRUCTION: Since DeepThink is ENABLED, you MUST formulate a detailed, step-by-step reasoning chain before you write your answer.
Wrap your entire thoughts process inside a <thought>...</thought> XML block at the very start of your response. 
Analyze the query in depth, check your evidence, explore alternative ideas, trace your logic, and do self-correction inside this <thought> block.
Example structure:
<thought>
Step 1: Analyze user request...
Step 2: Deconstruct code/logic...
Step 3: Refine and select best response...
</thought>
After the closing </thought> tag, provide your final answer in beautiful, clean Markdown. Do not mix text and thoughts.` : `
Do not output <thought> tags; write your response directly using elegant, styled Markdown.`}
`;

    // Map the conversation history into Gemini schema
    // Each history item is { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedContents = messages.map((m: any) => {
      // If we are passing previous thoughts in history, re-bundle them so the model has continuity
      let textContent = m.text || "";
      if (m.role === 'assistant' && m.thought) {
        textContent = `<thought>\n${m.thought}\n</thought>\n\n${m.text}`;
      }

      const parts: any[] = [{ text: textContent }];

      // Include custom uploaded images or files as inlineData multipart input
      if (m.attachment && m.attachment.data && m.attachment.mimeType) {
        let base64Data = m.attachment.data;
        if (base64Data.includes(",")) {
          base64Data = base64Data.split(",")[1];
        }
        parts.push({
          inlineData: {
            mimeType: m.attachment.mimeType,
            data: base64Data
          }
        });
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts
      };
    });

    // Configure tools
    const tools: any[] = [];
    if (webSearchEnabled) {
      tools.push({ googleSearch: {} });
    }

    // Call generateContentStream
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: temperature || 0.7,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    let tempBuffer = "";
    let inThought = false;
    let thoughtDone = false;

    for await (const chunk of responseStream) {
      const chunkText = chunk.text || "";
      tempBuffer += chunkText;

      // Extract web search grounding sources if present
      const metadata = chunk.candidates?.[0]?.groundingMetadata;
      if (metadata && metadata.groundingChunks) {
        const rawChunks = metadata.groundingChunks;
        const sources = rawChunks
          .map((c: any) => ({
            title: c.web?.title || c.maps?.title || "Sourced Web Result",
            url: c.web?.uri || c.maps?.uri || ""
          }))
          .filter((s: any) => s.url);
        
        if (sources.length > 0) {
          res.write(`data: ${JSON.stringify({ type: "grounding", sources })}\n\n`);
        }
      }

      // Stream splitting loop
      let processing = true;
      while (processing && tempBuffer.length > 0) {
        if (!inThought && !thoughtDone) {
          // Look for start of thought block
          const startIdx = tempBuffer.indexOf("<thought>");
          if (startIdx !== -1) {
            // If there's content before <thought>, stream it as text
            if (startIdx > 0) {
              const textBefore = tempBuffer.substring(0, startIdx);
              res.write(`data: ${JSON.stringify({ type: "text", content: textBefore })}\n\n`);
            }
            inThought = true;
            // Strip out <thought> but keep the rest
            tempBuffer = tempBuffer.substring(startIdx + 9);
          } else {
            // No "<thought>" seen yet. Check if incoming string looks like it's starting "<th"
            const mayBeTag = "<thought>".startsWith(tempBuffer) || tempBuffer.includes("<th") || tempBuffer.includes("<t");
            if (mayBeTag && tempBuffer.length < 15) {
              // Wait for more chunks to be sure
              processing = false;
            } else {
              // Flush current buffer directly as direct text
              res.write(`data: ${JSON.stringify({ type: "text", content: tempBuffer })}\n\n`);
              tempBuffer = "";
            }
          }
        } else if (inThought) {
          // Look for end of thought block
          const endIdx = tempBuffer.indexOf("</thought>");
          if (endIdx !== -1) {
            const thoughtContent = tempBuffer.substring(0, endIdx);
            if (thoughtContent.length > 0) {
              res.write(`data: ${JSON.stringify({ type: "thought", content: thoughtContent })}\n\n`);
            }
            inThought = false;
            thoughtDone = true;
            // Strip "</thought>"
            tempBuffer = tempBuffer.substring(endIdx + 10);
          } else {
            // Entire temporary buffer is streamable thoughts
            res.write(`data: ${JSON.stringify({ type: "thought", content: tempBuffer })}\n\n`);
            tempBuffer = "";
          }
        } else {
          // Both tag boundaries are traversed -- everything from here is pure visual response text
          res.write(`data: ${JSON.stringify({ type: "text", content: tempBuffer })}\n\n`);
          tempBuffer = "";
        }
      }
    }

    // Write any leftover buffer as text
    if (tempBuffer.length > 0) {
      if (inThought) {
        res.write(`data: ${JSON.stringify({ type: "thought", content: tempBuffer })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: "text", content: tempBuffer })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

  } catch (error: any) {
    console.error("Error handling API chat stream:", error);
    res.write(`data: ${JSON.stringify({ type: "error", message: error.message || "An unexpected error occurred on the server." })}\n\n`);
    res.end();
  }
});

// Setup development or production environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ABO GABAL Server running securely on http://localhost:${PORT}`);
  });
}

startServer();
