import type { ChatData, ChatConversation, ChatUser, ChatMessage } from "@/types/chat";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

async function safeFetch(url: string, opts: RequestInit = {}) {
  try {
    const res = await fetch(url, { cache: "no-store", ...opts });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  } catch (e) {
    console.warn("Chat API fetch failed:", url, e);
    return null;
  }
}

export async function fetchCurrentUser(): Promise<ChatUser | null> {
  // Expected backend endpoint: GET /chat/me
  return await safeFetch(`${API_BASE}/chat/me`);
}

export async function fetchConversations(): Promise<ChatConversation[] | null> {
  // Expected backend endpoint: GET /chat/conversations
  return await safeFetch(`${API_BASE}/chat/conversations`);
}

export async function sendMessage(conversationId: string, message: string): Promise<ChatMessage | null> {
  // Expected backend endpoint: POST /chat/conversations/{id}/messages
  return await safeFetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}

// Export a minimal empty shape so imports that destructure values won't crash during build.
export const mockChatData: ChatData = {
  currentUser: { id: "", name: "", username: "", avatar: "", isOnline: false },
  conversations: [],
};
