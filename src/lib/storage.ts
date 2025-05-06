
import { Chat, Message, Model, OpenRouterSettings } from '../types/chat';

const STORAGE_KEYS = {
  CHATS: 'whisper-chats',
  API_KEY: 'whisper-api-key',
  MODELS: 'whisper-models',
  CURRENT_CHAT: 'whisper-current-chat'
};

export const saveApiKey = (apiKey: string) => {
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
};

export const getApiKey = (): string => {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
};

export const saveModels = (models: Model[]) => {
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));
};

export const getModels = (): Model[] => {
  const storedModels = localStorage.getItem(STORAGE_KEYS.MODELS);
  if (!storedModels) return [];
  
  try {
    return JSON.parse(storedModels);
  } catch (e) {
    console.error('Failed to parse models from storage', e);
    return [];
  }
};

export const saveChat = (chat: Chat) => {
  const chats = getChats();
  const existingIndex = chats.findIndex(c => c.id === chat.id);
  
  if (existingIndex !== -1) {
    chats[existingIndex] = chat;
  } else {
    chats.push(chat);
  }
  
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
};

export const getChats = (): Chat[] => {
  const storedChats = localStorage.getItem(STORAGE_KEYS.CHATS);
  if (!storedChats) return [];
  
  try {
    return JSON.parse(storedChats);
  } catch (e) {
    console.error('Failed to parse chats from storage', e);
    return [];
  }
};

export const deleteChat = (chatId: string) => {
  const chats = getChats().filter(c => c.id !== chatId);
  localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  
  const currentChatId = getCurrentChatId();
  if (currentChatId === chatId) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CHAT);
  }
};

export const setCurrentChatId = (chatId: string) => {
  localStorage.setItem(STORAGE_KEYS.CURRENT_CHAT, chatId);
};

export const getCurrentChatId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_CHAT);
};

export const getCurrentChat = (): Chat | null => {
  const currentChatId = getCurrentChatId();
  if (!currentChatId) return null;
  
  const chats = getChats();
  return chats.find(c => c.id === currentChatId) || null;
};

export const saveSettings = (settings: OpenRouterSettings) => {
  saveApiKey(settings.apiKey);
  saveModels(settings.models);
};

export const getSettings = (): OpenRouterSettings => {
  return {
    apiKey: getApiKey(),
    models: getModels()
  };
};
