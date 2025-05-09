import React, { useRef, useEffect } from 'react';
import { Chat, Message, Attachment } from '@/types/chat';
import { User } from '@supabase/supabase-js';
import { ChatSidebar } from './Sidebar';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import Settings from './Settings';
import { streamCompletion } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { SidebarTrigger } from "@/components/ui/sidebar";

interface ChatLayoutProps {
  chat: Chat | null;
  setChat: React.Dispatch<React.SetStateAction<Chat | null>>;
  currentMessage: string;
  setCurrentMessage: React.Dispatch<React.SetStateAction<string>>;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  settings: {
    apiKey: string;
    models: { id: string; name: string; maxTokens: number }[];
  };
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onNewChat: () => Promise<void>;
  onSelectChat: (chat: Chat) => Promise<void>;
  onSaveSettings: (settings: any) => void;
  onModelChange: (modelId: string) => Promise<void>;
  user: User | null;
  loading: boolean;
  updateChatTitle: (content: string) => Promise<void>;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  chat,
  setChat,
  currentMessage,
  setCurrentMessage,
  isGenerating,
  setIsGenerating,
  settings,
  settingsOpen,
  setSettingsOpen,
  onNewChat,
  onSelectChat,
  onSaveSettings,
  onModelChange,
  user,
  loading,
  updateChatTitle
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, currentMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveAssistantMessage = async (content: string): Promise<string | null> => {
    if (!chat || !user) return null;
    
    try {
      console.log('Saving assistant message to database, chat_id:', chat.id);
      
      // Create a timestamp that will work in PostgreSQL
      const timestamp = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'assistant',
          content: content,
          timestamp: timestamp
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error saving assistant message:', error);
        toast.error(`Failed to save response: ${error.message}`);
        throw error;
      }
      
      console.log('Assistant message saved with ID:', data.id);
      
      // Update chat's updated_at timestamp
      const { error: updateError } = await supabase
        .from('chats')
        .update({ updated_at: timestamp })
        .eq('id', chat.id);
        
      if (updateError) {
        console.error('Error updating chat timestamp:', updateError);
      }
      
      console.log('Assistant message saved successfully');
      return data.id;
    } catch (error) {
      console.error('Error saving assistant message:', error);
      toast.error('Failed to save response to database');
      return null;
    }
  };

  const handleSendMessage = async (content: string, attachments: Attachment[]) => {
    if (!chat || !user) return;
    if (!settings.apiKey) {
      toast.error("Please set your OpenRouter API key first");
      setSettingsOpen(true);
      return;
    }

    console.log('Starting handleSendMessage with content:', content.substring(0, 30) + '...');

    // Add user message to UI
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments
    };

    // Save user message to database - critical to get the ID
    let userMessageDbId: string;
    try {
      console.log('Saving user message to database');
      const timestamp = new Date().toISOString();
      
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content,
          has_attachments: attachments.length > 0,
          timestamp: timestamp
        })
        .select()
        .single();
      
      if (msgError) {
        console.error('Error saving user message:', msgError);
        throw msgError;
      }
      
      console.log('User message saved with ID:', msgData.id);
      userMessageDbId = msgData.id;
      
      // If there are attachments, save them
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          const { error: attachError } = await supabase
            .from('attachments')
            .insert({
              message_id: msgData.id,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              url: attachment.url
            });
            
          if (attachError) {
            console.error('Error saving attachment:', attachError);
          }
        }
      }
    } catch (error) {
      console.error('Error saving user message:', error);
      toast.error('Failed to save your message');
      return; // Exit early if we can't save the user message
    }

    // Create assistant message placeholder for UI
    const assistantMessage: Message = {
      id: uuidv4(), // Temporary ID
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    // Update chat in UI with user message and empty assistant message
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
      
      let fullResponse = ''; // Track the full response for saving
      
      // Stream the response
      await streamCompletion(
        messagesForApi,
        chat.model,
        settings.apiKey,
        (chunk) => {
          fullResponse += chunk;
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
          console.log("Stream complete, final response length:", fullResponse.length);
          
          // Save the full message to Supabase
          try {
            const savedMessageId = await saveAssistantMessage(fullResponse);
            console.log("Assistant message saved with ID:", savedMessageId);
            
            if (savedMessageId) {
              // Update the message in the UI with the real database ID
              const finalMessages = [...updatedChat.messages];
              const assistantMessageIndex = finalMessages.length - 1;
              finalMessages[assistantMessageIndex] = {
                ...finalMessages[assistantMessageIndex],
                id: savedMessageId,
                content: fullResponse
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
            } else {
              toast.error("Failed to save assistant message to database");
            }
          } catch (error) {
            console.error("Error in completion callback:", error);
            toast.error("Failed to save response");
          } finally {
            setCurrentMessage('');
            setIsGenerating(false);
          }
        }
      );
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setIsGenerating(false);
      toast.error("Failed to process message");
    }
  };
  
  // If chat is not initialized yet or user is loading, show loading
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center animate-pulse">
          <div className="text-2xl font-bold mb-2 text-foreground">Loading Chat</div>
          <div className="text-muted-foreground">Initializing...</div>
        </div>
      </div>
    );
  }

  // Find the current model name
  const getCurrentModelName = () => {
    if (!chat) return "Assistant";
    const currentModel = settings.models.find(model => model.id === chat.model);
    return currentModel?.name || "Assistant";
  };

  const modelName = getCurrentModelName();

  return (
    <div className="flex w-full h-screen bg-background">
      <ChatSidebar 
        onNewChat={onNewChat} 
        onSelectChat={onSelectChat} 
        currentChatId={chat?.id || null}
      />
      
      <div className="flex flex-col w-full h-screen overflow-hidden">
        <div className="flex-shrink-0">
          <div className="flex items-center bg-background">
            <SidebarTrigger className="ml-2 md:ml-4 text-muted-foreground hover:text-foreground" />
            {chat && (
              <ChatHeader
                selectedModel={chat.model}
                models={settings.models}
                onModelChange={onModelChange}
                onOpenSettings={() => setSettingsOpen(true)}
                isApiKeySet={!!settings.apiKey}
              />
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto chat-container">
          {chat && (
            chat.messages.length === 0 ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="max-w-md text-center px-4 animate-fade-in">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                    <div className="text-primary text-xl font-semibold">AI</div>
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-foreground">Welcome to Whisper Chat</h2>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Start a conversation with AI using OpenRouter. 
                    You can ask questions, get creative writing, problem-solving help, and more.
                  </p>
                  <p className="text-xs text-muted-foreground border-t border-border/40 pt-4 mt-4">
                    Powered by OpenRouter
                  </p>
                </div>
              </div>
            ) : (
              <div className="pb-24">
                {chat.messages.map((message, index) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message} 
                    modelName={modelName}
                  />
                ))}
                
                {/* Show streaming message */}
                {isGenerating && currentMessage && (
                  <div className="py-4 animate-fade-in">
                    <div className="container max-w-6xl mx-auto px-4 md:px-6">
                      <div className="flex justify-start">
                        <div className="max-w-[85%] md:max-w-[75%]">
                          <div className="flex items-center mb-1">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-chat-bubble text-white mr-2">
                              <div className="font-medium text-xs">AI</div>
                            </div>
                            <div className="font-semibold text-sm mr-2">{modelName}</div>
                            <div className="text-xs text-muted-foreground">
                              typing<span className="typing-dots"></span>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/90 prose-p:leading-relaxed prose-code:text-primary-foreground/90 prose-code:bg-primary/10 prose-code:rounded prose-strong:text-foreground prose-strong:font-semibold prose-pre:bg-muted prose-pre:text-muted-foreground">
                            <div
                              className="markdown"
                              dangerouslySetInnerHTML={{
                                __html: currentMessage.replace(/\n/g, '<br>')
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )
          )}
        </div>
        
        <div className="flex-shrink-0 w-full">
          {chat && (
            <ChatInput 
              onSendMessage={handleSendMessage} 
            />
          )}
        </div>
        
        <Settings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onSaveSettings={onSaveSettings}
        />
      </div>
    </div>
  );
};

export default ChatLayout;
