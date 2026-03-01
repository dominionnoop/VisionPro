import type { ChatConversation, ChatMessage, ChatUser } from "@/types/chat";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

const warnedUrls = new Set<string>();

async function safeFetch(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { cache: "no-store", ...opts });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  } catch (e) {
    if (!warnedUrls.has(url)) {
      warnedUrls.add(url);
      const message = e instanceof Error ? e.message : String(e);
      console.warn(`Chat API unavailable: ${url} (${message})`);
    }
    return null;
  }
}

export async function fetchCurrentUser(): Promise<ChatUser | null> {
  return await safeFetch(`${API_BASE}/chat/me`);
}

export async function fetchConversations(): Promise<ChatConversation[] | null> {
  return await safeFetch(`${API_BASE}/chat/conversations`);
}

export async function sendMessage(
  conversationId: string,
  message: string,
): Promise<ChatMessage | null> {
  return await safeFetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}

