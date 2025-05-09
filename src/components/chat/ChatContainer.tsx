
import React, { useState, useEffect } from 'react';
import { Chat, Message } from '@/types/chat';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { getSettings } from '@/lib/storage';
import ChatLayout from './ChatLayout';

const DEFAULT_MODEL = 'anthropic/claude-3-opus';

const ChatContainer: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [settings, setSettings] = useState(getSettings());
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Initialize chat or load existing chat
  useEffect(() => {
    if (user) {
      loadOrCreateChat();
    }
  }, [user]);

  // Load API key and models from database
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      loadApiSettings();
    }
  }, [user, loading, navigate]);

  // Persist current chat ID in sessionStorage to maintain it across tab switches
  useEffect(() => {
    if (chat?.id) {
      sessionStorage.setItem('current-chat-id', chat.id);
    }
  }, [chat?.id]);

  const loadApiSettings = async () => {
    if (!user) return;
    
    try {
      // Load API key
      const { data: apiSettings, error: apiError } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('user_id', user.id)
        .single();
      
      if (apiError && apiError.code !== 'PGRST116') {
        throw apiError;
      }
      
      // Load enabled models
      const { data: modelData, error: modelError } = await supabase
        .from('available_models')
        .select('*')
        .eq('enabled', true);
      
      if (modelError) throw modelError;
      
      const models = modelData?.map(model => ({
        id: model.model_id,
        name: model.name,
        maxTokens: model.max_tokens
      })) || [];
      
      if (apiSettings?.api_key || models.length > 0) {
        const updatedSettings = {
          apiKey: apiSettings?.api_key || settings.apiKey,
          models: models.length > 0 ? models : settings.models
        };
        
        setSettings(updatedSettings);
        
        if (!apiSettings?.api_key && !settings.apiKey) {
          setSettingsOpen(true);
        }
      } else if (!settings.apiKey) {
        setSettingsOpen(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadOrCreateChat = async () => {
    if (!user) return;
    
    // Check if we have a stored chat ID from the current session
    const storedChatId = sessionStorage.getItem('current-chat-id');
    
    if (storedChatId) {
      try {
        // Attempt to load the stored chat first
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', storedChatId)
          .maybeSingle();
        
        if (chatData) {
          // If the stored chat exists, load it
          await loadChat(storedChatId);
          return;
        }
      } catch (error) {
        console.error('Error checking stored chat:', error);
      }
    }
    
    try {
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (chatsError) throw chatsError;
      
      if (chats && chats.length > 0) {
        const chatId = chats[0].id;
        await loadChat(chatId);
      } else {
        await createNewChat();
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
      createNewChat();
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      console.log('Loading chat with ID:', chatId);
      
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (chatError) {
        console.error('Error fetching chat data:', chatError);
        throw chatError;
      }
      
      console.log('Fetched chat data:', chatData);
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
      
      if (messageError) {
        console.error('Error fetching messages:', messageError);
        throw messageError;
      }
      
      console.log('Fetched messages data:', messageData);
      
      const messages: Message[] = await Promise.all(messageData.map(async (msg) => {
        let attachments = [];
        
        if (msg.has_attachments) {
          const { data: attachmentsData, error: attachmentsError } = await supabase
            .from('attachments')
            .select('*')
            .eq('message_id', msg.id);
            
          if (!attachmentsError && attachmentsData) {
            attachments = attachmentsData.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              size: a.size,
              url: a.url
            }));
          }
        }
        
        return {
          id: msg.id,
          // Force the role to be one of the allowed types
          role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') 
            ? msg.role as 'user' | 'assistant' | 'system' 
            : 'user',
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          attachments: attachments.length > 0 ? attachments : undefined
        };
      }));
      
      const chat: Chat = {
        id: chatData.id,
        title: chatData.title,
        messages,
        model: chatData.model,
        createdAt: new Date(chatData.created_at).getTime(),
        updatedAt: new Date(chatData.updated_at).getTime()
      };
      
      console.log('Processed chat object:', chat);
      setChat(chat);
      
      // Store the current chat ID in session storage
      sessionStorage.setItem('current-chat-id', chat.id);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat messages');
      createNewChat();
    }
  };

  const createNewChat = async () => {
    if (!user) return;

    const model = settings.models.length > 0 ? settings.models[0].id : DEFAULT_MODEL;
    
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          title: 'New Chat',
          model
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newChat: Chat = {
        id: data.id,
        title: data.title,
        messages: [],
        model,
        createdAt: new Date(data.created_at).getTime(),
        updatedAt: new Date(data.updated_at).getTime()
      };
      
      setChat(newChat);
      
      // Store the current chat ID in session storage
      sessionStorage.setItem('current-chat-id', newChat.id);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
      
      const newChat = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setChat(newChat);
      sessionStorage.setItem('current-chat-id', newChat.id);
    }
  };

  const updateChatTitle = async (content: string) => {
    if (!chat || !user) return;
    
    const title = content.length > 30 
      ? `${content.substring(0, 30)}...` 
      : content;
    
    try {
      await supabase
        .from('chats')
        .update({ title })
        .eq('id', chat.id);
      
      setChat(prev => prev ? { ...prev, title } : null);
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  };

  const handleModelChange = async (modelId: string) => {
    if (!chat || !user) return;
    
    try {
      await supabase
        .from('chats')
        .update({ model: modelId })
        .eq('id', chat.id);
      
      const updatedChat = {
        ...chat,
        model: modelId
      };
      
      setChat(updatedChat);
    } catch (error) {
      console.error('Error updating chat model:', error);
      toast.error('Failed to update chat model');
    }
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
  };

  const handleSelectChat = async (selectedChat: Chat) => {
    await loadChat(selectedChat.id);
  };

  return (
    <SidebarProvider>
      <ChatLayout
        chat={chat}
        setChat={setChat}
        currentMessage={currentMessage}
        setCurrentMessage={setCurrentMessage}
        isGenerating={isGenerating}
        setIsGenerating={setIsGenerating}
        settings={settings}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        onNewChat={createNewChat}
        onSelectChat={handleSelectChat}
        onSaveSettings={handleSaveSettings}
        onModelChange={handleModelChange}
        user={user}
        loading={loading}
        updateChatTitle={updateChatTitle}
      />
    </SidebarProvider>
  );
};

export default ChatContainer;
