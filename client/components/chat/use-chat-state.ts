import { create } from "zustand";
import type { ChatState, ChatMessage, ChatConversation, ChatUser } from "@/types/chat";
import { fetchConversations, fetchCurrentUser, sendMessage } from "@/data/chat-api";

type ChatComponentState = {
  state: ChatState;
  activeConversation?: string;
};

interface ChatStore {
  // State
  chatState: ChatComponentState;
  currentUser?: ChatUser | null;
  conversations: ChatConversation[];
  newMessage: string;

  // Actions
  setChatState: (state: ChatComponentState) => void;
  setConversations: (conversations: ChatConversation[]) => void;
  setCurrentUser: (user: ChatUser | null) => void;
  setNewMessage: (message: string) => void;
  handleSendMessage: () => void;
  openConversation: (conversationId: string) => void;
  goBack: () => void;
  toggleExpanded: () => void;
}

const chatStore = create<ChatStore>((set, get) => ({
  // Initial state
  chatState: {
    state: "collapsed",
  },
  currentUser: null,
  conversations: [],
  newMessage: "",
  

  // Actions
  setChatState: (chatState) => set({ chatState }),

  setConversations: (conversations) => set({ conversations }),
  setCurrentUser: (user) => set({ currentUser: user }),

  setNewMessage: (newMessage) => set({ newMessage }),

  handleSendMessage: () => {
    const { newMessage, conversations, chatState } = get();
    const activeConv = conversations.find(
      (conv) => conv.id === chatState.activeConversation
    );

    if (!newMessage.trim() || !activeConv) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      senderId: get().currentUser?.id || "",
      isFromCurrentUser: true,
    };

    const updatedConversations = conversations.map((conv) =>
      conv.id === activeConv.id
        ? {
            ...conv,
            messages: [...conv.messages, message],
            lastMessage: message,
          }
        : conv
    );

    set({
      conversations: updatedConversations,
      newMessage: "",
    });

    // Attempt to POST message to backend (fire-and-forget)
    (async () => {
      try {
        await sendMessage(activeConv.id, message.content);
      } catch (e) {
        console.warn("Failed to send message to backend:", e);
      }
    })();
  },

  openConversation: (conversationId) => {
    const { conversations } = get();

    // Update chat state
    set({
      chatState: { state: "conversation", activeConversation: conversationId },
    });

    // Mark conversation as read
    const updatedConversations = conversations.map((conv) =>
      conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
    );

    set({ conversations: updatedConversations });
  },

  goBack: () => {
    const { chatState } = get();
    if (chatState.state === "conversation") {
      set({ chatState: { state: "expanded" } });
    } else {
      set({ chatState: { state: "collapsed" } });
    }
  },

  toggleExpanded: () => {
    const { chatState } = get();
    set({
      chatState: {
        state: chatState.state === "collapsed" ? "expanded" : "collapsed",
      },
    });
  },
}));

// Hook with computed values using selectors
export const useChatState = () => {
  const chatState = chatStore((state) => state.chatState);
  const currentUser = chatStore((state) => state.currentUser);
  const conversations = chatStore((state) => state.conversations);
  const newMessage = chatStore((state) => state.newMessage);
  const setChatState = chatStore((state) => state.setChatState);
  const setConversations = chatStore((state) => state.setConversations);
  const setCurrentUser = chatStore((state) => state.setCurrentUser);
  const setNewMessage = chatStore((state) => state.setNewMessage);
  const handleSendMessage = chatStore((state) => state.handleSendMessage);
  const openConversation = chatStore((state) => state.openConversation);
  const goBack = chatStore((state) => state.goBack);
  const toggleExpanded = chatStore((state) => state.toggleExpanded);

  // Computed values
  const totalUnreadCount = conversations.reduce(
    (total, conv) => total + conv.unreadCount,
    0
  );

  const activeConversation = conversations.find(
    (conv) => conv.id === chatState.activeConversation
  );

  return {
    chatState,
    currentUser,
    conversations,
    newMessage,
    totalUnreadCount,
    activeConversation,
    setChatState,
    setConversations,
    setCurrentUser,
    setNewMessage,
    handleSendMessage,
    openConversation,
    goBack,
    toggleExpanded,
  };
};

// NOTE: Chat auto-initialization is temporarily disabled for debugging
// client-side runtime exceptions.
export const initializeChatState = async () => {
  try {
    const [user, conversations] = await Promise.all([
      fetchCurrentUser(),
      fetchConversations(),
    ]);

    if (user) chatStore.getState().setCurrentUser(user);
    if (conversations) chatStore.getState().setConversations(conversations);
  } catch (e) {
    console.warn("Failed to initialize chat state:", e);
  }
};
