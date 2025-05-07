import React, { useState, useEffect, useRef } from 'react';
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
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      // Load API key and models from database
      loadApiSettings();
    }
  }, [user, loading, navigate]);

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
        saveSettings(updatedSettings);
        
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
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (chatError) throw chatError;
      
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
      
      if (messageError) throw messageError;
      
      const messages: Message[] = await Promise.all(messageData.map(async (msg) => {
        let attachments: Attachment[] = [];
        
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
          role: msg.role as 'user' | 'assistant' | 'system',
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
      
      setChat(chat);
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
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, currentMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveAssistantMessage = async (content: string) => {
    if (!chat || !user) return;
    
    try {
      console.log('Saving assistant message to database:', {
        chat_id: chat.id,
        role: 'assistant',
        content: content.substring(0, 20) + '...' // Log just the beginning for brevity
      });
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString() // Add explicit timestamp
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving assistant message:', error);
        toast.error(`Failed to save response: ${error.message}`);
        throw error;
      }
      
      // Update chat's updated_at timestamp
      const { error: updateError } = await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chat.id);
        
      if (updateError) {
        console.error('Error updating chat timestamp:', updateError);
      } else {
        console.log('Assistant message saved successfully:', data.id);
      }
    } catch (error) {
      console.error('Error saving assistant message:', error);
      toast.error('Failed to save response to database');
    }
  };

  const handleSendMessage = async (content: string, attachments: Attachment[]) => {
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
    let userMessageDbId: string;
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content,
          has_attachments: attachments.length > 0,
          timestamp: new Date().toISOString()  // Add explicit timestamp
        })
        .select()
        .single();
      
      if (msgError) throw msgError;
      
      userMessageDbId = msgData.id;
      
      // If there are attachments, save them
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          await supabase
            .from('attachments')
            .insert({
              message_id: msgData.id,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              url: attachment.url
            });
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
          saveAssistantMessage("I'm sorry, I encountered an error while generating a response.");
        },
        async () => {
          console.log("Stream complete, saving assistant message to database");
          
          // Save the full message to Supabase FIRST, before updating UI
          try {
            await saveAssistantMessage(currentMessage);
            console.log("Assistant message saved successfully");
            
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
              updateChatTitle(content);
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
    saveSettings(newSettings);
  };

  const handleSelectChat = async (selectedChat: Chat) => {
    await loadChat(selectedChat.id);
  };

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
          onNewChat={createNewChat} 
          onSelectChat={handleSelectChat} 
          currentChatId={chat?.id || null}
        />
        
        <div className="flex flex-col w-full h-screen">
          <div className="flex items-center bg-background border-b p-2">
            <SidebarTrigger />
            {chat && (
              <ChatHeader
                selectedModel={chat.model}
                models={settings.models}
                onModelChange={handleModelChange}
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
                onSendMessage={handleSendMessage}
                disabled={isGenerating} 
              />
            )}
          </div>
          
          <Settings
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ChatComponent;
