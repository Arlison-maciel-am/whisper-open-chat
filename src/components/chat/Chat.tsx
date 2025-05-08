// This file uses a hybrid approach with function references to avoid circular dependencies
// while maintaining good TypeScript support and code organization.
// The core functions are defined in the useEffect hook and stored in refs,
// while the component uses these refs for its functionality.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import Settings from './Settings';
import { ChatSidebar } from './Sidebar';
import { Attachment, Chat, Message } from '@/types/chat';
import { streamCompletion } from '@/lib/api';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { getSettings, saveSettings } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from 'react-router-dom';

const DEFAULT_MODEL = 'anthropic/claude-3-opus';

const ChatComponent: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [settings, setSettings] = useState(getSettings());
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Function references to avoid dependency issues
  const loadApiSettingsRef = useRef<any>(null);
  const loadOrCreateChatRef = useRef<any>(null);
  const loadChatRef = useRef<any>(null);
  const createNewChatRef = useRef<any>(null);
  const saveAssistantMessageRef = useRef<any>(null);
  const updateChatTitleRef = useRef<any>(null);
  const handleSendMessageRef = useRef<any>(null);
  const handleModelChangeRef = useRef<any>(null);
  const handleSaveSettingsRef = useRef<any>(null);
  const handleSelectChatRef = useRef<any>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, currentMessage, scrollToBottom]);

  // Initialize all functions
  useEffect(() => {
    // Define loadChat function
    loadChatRef.current = async (chatId: string) => {
      try {
        // Fetch chat data and messages in parallel
        const [chatResult, messagesResult] = await Promise.all([
          supabase
            .from('chats')
            .select('*')
            .eq('id', chatId)
            .single(),
          supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('timestamp', { ascending: true })
        ]);
        
        const { data: chatData, error: chatError } = chatResult;
        const { data: messageData, error: messageError } = messagesResult;
        
        if (chatError) throw chatError;
        if (messageError) throw messageError;
        
        // Get all message IDs with attachments
        const messagesWithAttachments = messageData.filter(msg => msg.has_attachments);
        const messageIds = messagesWithAttachments.map(msg => msg.id);
        
        // Fetch all attachments in a single query if there are any
        let attachmentsMap: Record<string, Attachment[]> = {};
        
        if (messageIds.length > 0) {
          const { data: attachmentsData, error: attachmentsError } = await supabase
            .from('attachments')
            .select('*')
            .in('message_id', messageIds);
            
          if (!attachmentsError && attachmentsData) {
            // Group attachments by message_id
            attachmentsMap = attachmentsData.reduce((acc, attachment) => {
              const messageId = attachment.message_id;
              if (!acc[messageId]) {
                acc[messageId] = [];
              }
              
              acc[messageId].push({
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
                url: attachment.url
              });
              
              return acc;
            }, {} as Record<string, Attachment[]>);
          }
        }
        
        // Map messages with their attachments
        const messages: Message[] = messageData.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          attachments: msg.has_attachments ? attachmentsMap[msg.id] : undefined
        }));
        
        const chat: Chat = {
          id: chatData.id,
          title: chatData.title,
          messages,
          model: chatData.model,
          createdAt: new Date(chatData.created_at).getTime(),
          updatedAt: new Date(chatData.updated_at).getTime()
        };
        
        setChat(chat);
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat messages');
        createNewChatRef.current();
      }
    };

    // Define createNewChat function
    createNewChatRef.current = async () => {
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
      } catch (error) {
        console.error('Error creating chat:', error);
        toast.error('Failed to create new chat');
        
        // Fallback to local chat if database fails
        const newChat = {
          id: uuidv4(),
          title: 'New Chat',
          messages: [],
          model,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        setChat(newChat);
      }
    };

    // Define loadOrCreateChat function
    loadOrCreateChatRef.current = async () => {
      if (!user) return;
      
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
          await loadChatRef.current(chatId);
        } else {
          await createNewChatRef.current();
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat');
        createNewChatRef.current();
      }
    };

    // Define loadApiSettings function
    loadApiSettingsRef.current = async () => {
      if (!user) return;
      
      try {
        // Load API key and models in parallel
        const [apiSettingsResult, modelDataResult] = await Promise.all([
          supabase
            .from('api_settings')
            .select('api_key')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('available_models')
            .select('*')
            .eq('enabled', true)
        ]);
        
        const { data: apiSettings, error: apiError } = apiSettingsResult;
        const { data: modelData, error: modelError } = modelDataResult;
        
        if (apiError && apiError.code !== 'PGRST116') {
          throw apiError;
        }
        
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
          saveSettings(updatedSettings);
          
          if (!apiSettings?.api_key && !settings.apiKey) {
            setSettingsOpen(true);
          }
        } else if (!settings.apiKey) {
          setSettingsOpen(true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load API settings');
      }
    };

    // Define saveAssistantMessage function
    saveAssistantMessageRef.current = async (content: string) => {
      if (!chat || !user) return;
      
      try {
        // Prepare both operations
        const messageInsert = supabase
          .from('messages')
          .insert({
            chat_id: chat.id,
            role: 'assistant',
            content: content,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();
        
        const chatUpdate = supabase
          .from('chats')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chat.id);
        
        // Execute both operations in parallel
        const [messageResult, chatResult] = await Promise.all([
          messageInsert,
          chatUpdate
        ]);
        
        const { data, error } = messageResult;
        const { error: updateError } = chatResult;
        
        if (error) {
          console.error('Error saving assistant message:', error);
          toast.error(`Failed to save response: ${error.message}`);
          throw error;
        }
        
        if (updateError) {
          console.error('Error updating chat timestamp:', updateError);
        }
        
        return data.id;
      } catch (error) {
        console.error('Error saving assistant message:', error);
        toast.error('Failed to save response to database');
        return null;
      }
    };

    // Define updateChatTitle function
    updateChatTitleRef.current = async (content: string) => {
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

    // Define handleSendMessage function
    handleSendMessageRef.current = async (content: string, attachments: Attachment[]) => {
      if (!chat || !user) return;
      if (!settings.apiKey) {
        toast.error("Please set your OpenRouter API key first");
        setSettingsOpen(true);
        return;
      }
  
      // Add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments
      };
  
      // Save user message to database
      let userMessageDbId: string | undefined;
      try {
        // Insert user message
        const { data: msgData, error: msgError } = await supabase
          .from('messages')
          .insert({
            chat_id: chat.id,
            role: 'user',
            content,
            has_attachments: attachments.length > 0,
            timestamp: new Date().toISOString()
          })
          .select()
          .single();
        
        if (msgError) throw msgError;
        
        userMessageDbId = msgData.id;
        
        // If there are attachments, save them in a batch
        if (attachments.length > 0) {
          const attachmentInserts = attachments.map(attachment => ({
            message_id: msgData.id,
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            url: attachment.url
          }));
          
          const { error: attachmentsError } = await supabase
            .from('attachments')
            .insert(attachmentInserts);
            
          if (attachmentsError) {
            console.error('Error saving attachments:', attachmentsError);
          }
        }
      } catch (error) {
        console.error('Error saving message:', error);
        // Continue anyway, as we'll show the message in the UI
      }
  
      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };
  
      // Update chat with user message and empty assistant message
      const updatedChat = {
        ...chat,
        messages: [...chat.messages, userMessage, assistantMessage],
        updatedAt: Date.now()
      };
      
      setChat(updatedChat);
      
      // Start generating response
      setIsGenerating(true);
      setCurrentMessage('');
      
      try {
        // Create a copy of messages that includes the user's new message
        const messagesForApi = [
          ...chat.messages.map(msg => ({ ...msg })),
          { ...userMessage }
        ];
        
        // Stream the response
        await streamCompletion(
          messagesForApi,
          chat.model,
          settings.apiKey,
          (chunk) => {
            setCurrentMessage(prev => prev + chunk);
          },
          (error) => {
            console.error("Error streaming completion:", error);
            toast.error("Failed to generate response");
            
            // Update the assistant message with error
            const updatedMessages = [...updatedChat.messages];
            const assistantMessageIndex = updatedMessages.length - 1;
            updatedMessages[assistantMessageIndex] = {
              ...updatedMessages[assistantMessageIndex],
              content: "I'm sorry, I encountered an error while generating a response."
            };
            
            const errorChat = {
              ...updatedChat,
              messages: updatedMessages
            };
            
            setChat(errorChat);
            saveAssistantMessageRef.current("I'm sorry, I encountered an error while generating a response.");
          },
          async () => {
            // Save the full message to Supabase FIRST, before updating UI
            try {
              await saveAssistantMessageRef.current(currentMessage);
              
              // Only after successful save, update the UI
              const finalMessages = [...updatedChat.messages];
              const assistantMessageIndex = finalMessages.length - 1;
              finalMessages[assistantMessageIndex] = {
                ...finalMessages[assistantMessageIndex],
                content: currentMessage
              };
              
              const finalChat = {
                ...updatedChat,
                messages: finalMessages
              };
              
              setChat(finalChat);
              
              // Update chat title if this is the first message
              if (chat.messages.length === 0) {
                updateChatTitleRef.current(content);
              }
            } catch (error) {
              console.error("Error saving assistant message:", error);
            } finally {
              setCurrentMessage('');
              setIsGenerating(false);
            }
          }
        );
      } catch (error) {
        console.error("Error in handleSendMessage:", error);
        setIsGenerating(false);
      }
    };

    // Define handleModelChange function
    handleModelChangeRef.current = async (modelId: string) => {
      if (!chat || !user) return;
      
      try {
        await supabase
          .from('chats')
          .update({ model: modelId })
          .eq('id', chat.id);
        
        setChat(prevChat => prevChat ? {
          ...prevChat,
          model: modelId
        } : null);
      } catch (error) {
        console.error('Error updating chat model:', error);
        toast.error('Failed to update chat model');
      }
    };

    // Define handleSaveSettings function
    handleSaveSettingsRef.current = (newSettings: typeof settings) => {
      setSettings(newSettings);
      saveSettings(newSettings);
    };

    // Define handleSelectChat function
    handleSelectChatRef.current = async (selectedChat: Chat) => {
      await loadChatRef.current(selectedChat.id);
    };
  }, []);

  // Redirect to auth page if not logged in and load API settings if logged in
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else {
        loadApiSettingsRef.current();
        loadOrCreateChatRef.current();
      }
    }
  }, [user, loading, navigate]);

  // NOTE: The functions below are duplicates of the ref functions defined above.
  // They are kept for backward compatibility with existing code.
  // New code should use the ref functions instead.
  const loadApiSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      // Load API key and models in parallel
      const [apiSettingsResult, modelDataResult] = await Promise.all([
        supabase
          .from('api_settings')
          .select('api_key')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('available_models')
          .select('*')
          .eq('enabled', true)
      ]);
      
      const { data: apiSettings, error: apiError } = apiSettingsResult;
      const { data: modelData, error: modelError } = modelDataResult;
      
      if (apiError && apiError.code !== 'PGRST116') {
        throw apiError;
      }
      
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
        saveSettings(updatedSettings);
        
        if (!apiSettings?.api_key && !settings.apiKey) {
          setSettingsOpen(true);
        }
      } else if (!settings.apiKey) {
        setSettingsOpen(true);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load API settings');
    }
  }, [user, settings.apiKey, settings.models]);

  const loadOrCreateChat = useCallback(async () => {
    if (!user) return;
    
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
        await loadChatRef.current(chatId);
      } else {
        await createNewChatRef.current();
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat');
      createNewChatRef.current();
    }
  }, [user]);

  const loadChat = useCallback(async (chatId: string) => {
    try {
      // Fetch chat data and messages in parallel
      const [chatResult, messagesResult] = await Promise.all([
        supabase
          .from('chats')
          .select('*')
          .eq('id', chatId)
          .single(),
        supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('timestamp', { ascending: true })
      ]);
      
      const { data: chatData, error: chatError } = chatResult;
      const { data: messageData, error: messageError } = messagesResult;
      
      if (chatError) throw chatError;
      if (messageError) throw messageError;
      
      // Get all message IDs with attachments
      const messagesWithAttachments = messageData.filter(msg => msg.has_attachments);
      const messageIds = messagesWithAttachments.map(msg => msg.id);
      
      // Fetch all attachments in a single query if there are any
      let attachmentsMap: Record<string, Attachment[]> = {};
      
      if (messageIds.length > 0) {
        const { data: attachmentsData, error: attachmentsError } = await supabase
          .from('attachments')
          .select('*')
          .in('message_id', messageIds);
          
        if (!attachmentsError && attachmentsData) {
          // Group attachments by message_id
          attachmentsMap = attachmentsData.reduce((acc, attachment) => {
            const messageId = attachment.message_id;
            if (!acc[messageId]) {
              acc[messageId] = [];
            }
            
            acc[messageId].push({
              id: attachment.id,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              url: attachment.url
            });
            
            return acc;
          }, {} as Record<string, Attachment[]>);
        }
      }
      
      // Map messages with their attachments
      const messages: Message[] = messageData.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp).getTime(),
        attachments: msg.has_attachments ? attachmentsMap[msg.id] : undefined
      }));
      
      const chat: Chat = {
        id: chatData.id,
        title: chatData.title,
        messages,
        model: chatData.model,
        createdAt: new Date(chatData.created_at).getTime(),
        updatedAt: new Date(chatData.updated_at).getTime()
      };
      
      setChat(chat);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Failed to load chat messages');
      createNewChatRef.current();
    }
  }, []);

  const createNewChat = useCallback(async () => {
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
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create new chat');
      
      // Fallback to local chat if database fails
      const newChat = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        model,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setChat(newChat);
    }
  }, [user, settings.models]);

  // The scrollToBottom function and its useEffect are now defined at the top of the component

  const saveAssistantMessage = useCallback(async (content: string) => {
    if (!chat || !user) return;
    
    try {
      // Prepare both operations
      const messageInsert = supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      const chatUpdate = supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chat.id);
      
      // Execute both operations in parallel
      const [messageResult, chatResult] = await Promise.all([
        messageInsert,
        chatUpdate
      ]);
      
      const { data, error } = messageResult;
      const { error: updateError } = chatResult;
      
      if (error) {
        console.error('Error saving assistant message:', error);
        toast.error(`Failed to save response: ${error.message}`);
        throw error;
      }
      
      if (updateError) {
        console.error('Error updating chat timestamp:', updateError);
      }
      
      return data.id;
    } catch (error) {
      console.error('Error saving assistant message:', error);
      toast.error('Failed to save response to database');
      return null;
    }
  }, [chat, user]);

  const updateChatTitle = useCallback(async (content: string) => {
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
  }, [chat, user]);

  const handleSendMessage = useCallback(async (content: string, attachments: Attachment[]) => {
    if (!chat || !user) return;
    if (!settings.apiKey) {
      toast.error("Please set your OpenRouter API key first");
      setSettingsOpen(true);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments
    };

    // Save user message to database
    let userMessageDbId: string | undefined;
    try {
      // Insert user message
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content,
          has_attachments: attachments.length > 0,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      userMessageDbId = msgData.id;
      
      // If there are attachments, save them in a batch
      if (attachments.length > 0) {
        const attachmentInserts = attachments.map(attachment => ({
          message_id: msgData.id,
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          url: attachment.url
        }));
        
        const { error: attachmentsError } = await supabase
          .from('attachments')
          .insert(attachmentInserts);
          
        if (attachmentsError) {
          console.error('Error saving attachments:', attachmentsError);
        }
      }
    } catch (error) {
      console.error('Error saving message:', error);
      // Continue anyway, as we'll show the message in the UI
    }

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    // Update chat with user message and empty assistant message
    const updatedChat = {
      ...chat,
      messages: [...chat.messages, userMessage, assistantMessage],
      updatedAt: Date.now()
    };
    
    setChat(updatedChat);
    
    // Start generating response
    setIsGenerating(true);
    setCurrentMessage('');
    
    try {
      // Create a copy of messages that includes the user's new message
      const messagesForApi = [
        ...chat.messages.map(msg => ({ ...msg })),
        { ...userMessage }
      ];
      
      // Stream the response
      await streamCompletion(
        messagesForApi,
        chat.model,
        settings.apiKey,
        (chunk) => {
          setCurrentMessage(prev => prev + chunk);
        },
        (error) => {
          console.error("Error streaming completion:", error);
          toast.error("Failed to generate response");
          
          // Update the assistant message with error
          const updatedMessages = [...updatedChat.messages];
          const assistantMessageIndex = updatedMessages.length - 1;
          updatedMessages[assistantMessageIndex] = {
            ...updatedMessages[assistantMessageIndex],
            content: "I'm sorry, I encountered an error while generating a response."
          };
          
          const errorChat = {
            ...updatedChat,
            messages: updatedMessages
          };
          
          setChat(errorChat);
          saveAssistantMessageRef.current("I'm sorry, I encountered an error while generating a response.");
        },
        async () => {
          // Save the full message to Supabase FIRST, before updating UI
          try {
            await saveAssistantMessageRef.current(currentMessage);
            
            // Only after successful save, update the UI
            const finalMessages = [...updatedChat.messages];
            const assistantMessageIndex = finalMessages.length - 1;
            finalMessages[assistantMessageIndex] = {
              ...finalMessages[assistantMessageIndex],
              content: currentMessage
            };
            
            const finalChat = {
              ...updatedChat,
              messages: finalMessages
            };
            
            setChat(finalChat);
            
            // Update chat title if this is the first message
            if (chat.messages.length === 0) {
              updateChatTitleRef.current(content);
            }
          } catch (error) {
            console.error("Error saving assistant message:", error);
          } finally {
            setCurrentMessage('');
            setIsGenerating(false);
          }
        }
      );
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setIsGenerating(false);
    }
  }, [chat, user, settings.apiKey, saveAssistantMessage, updateChatTitle]);

  const handleModelChange = useCallback(async (modelId: string) => {
    if (!chat || !user) return;
    
    try {
      await supabase
        .from('chats')
        .update({ model: modelId })
        .eq('id', chat.id);
      
      setChat(prevChat => prevChat ? {
        ...prevChat,
        model: modelId
      } : null);
    } catch (error) {
      console.error('Error updating chat model:', error);
      toast.error('Failed to update chat model');
    }
  }, [chat, user]);

  const handleSaveSettings = useCallback((newSettings: typeof settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const handleSelectChat = useCallback(async (selectedChat: Chat) => {
    await loadChatRef.current(selectedChat.id);
  }, []);

  // If chat is not initialized yet or user is loading, show loading
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading Chat</div>
          <div>Initializing...</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen">
        <ChatSidebar
          onNewChat={createNewChatRef.current}
          onSelectChat={handleSelectChatRef.current}
          currentChatId={chat?.id || null}
        />
        
        <div className="flex flex-col w-full h-screen">
          <div className="flex items-center bg-background border-b p-2">
            <SidebarTrigger />
            {chat && (
              <ChatHeader
                selectedModel={chat.model}
                models={settings.models}
                onModelChange={handleModelChangeRef.current}
                onOpenSettings={() => setSettingsOpen(true)}
                isApiKeySet={!!settings.apiKey}
              />
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {chat && (
              chat.messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md px-4">
                    <h2 className="text-2xl font-bold mb-2">Welcome to Whisper Open Chat</h2>
                    <p className="text-muted-foreground mb-6">
                      Start a conversation with AI using OpenRouter. 
                      You can ask questions, get creative writing, problem-solving help, and more.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Powered by OpenRouter and similar to ChatGPT
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pb-20">
                  {chat.messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  
                  {/* Show streaming message */}
                  {isGenerating && currentMessage && (
                    <div className="py-5 bg-chat-assistant">
                      <div className="container max-w-4xl mx-auto flex gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <div className="w-8 h-8 rounded-full bg-chat-bubble flex items-center justify-center">
                            <div className="text-white font-semibold">AI</div>
                          </div>
                        </div>
                        
                        <div className="flex-1 prose prose-sm max-w-none">
                          <div className="font-semibold mb-1">Assistant</div>
                          <div 
                            className="markdown" 
                            dangerouslySetInnerHTML={{ 
                              __html: currentMessage.replace(/\n/g, '<br>') 
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )
            )}
          </div>
          
          <div className="sticky bottom-0">
            {chat && (
              <ChatInput
                onSendMessage={handleSendMessageRef.current}
                disabled={isGenerating}
              />
            )}
          </div>
          
          <Settings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettingsRef.current}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ChatComponent;
