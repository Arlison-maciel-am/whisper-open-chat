
import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import Settings from './Settings';
import { Attachment, Chat, Message } from '@/types/chat';
import { streamCompletion } from '@/lib/api';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { getSettings, saveSettings, saveChat, getCurrentChat, setCurrentChatId } from '@/lib/storage';

const DEFAULT_MODEL = 'anthropic/claude-3-opus';

const ChatComponent: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [settings, setSettings] = useState(getSettings());
  const [currentMessage, setCurrentMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat
  useEffect(() => {
    const storedChat = getCurrentChat();
    
    if (storedChat) {
      setChat(storedChat);
    } else {
      const newChat = {
        id: uuidv4(),
        title: 'New Chat',
        messages: [],
        model: settings.models.length > 0 ? settings.models[0].id : DEFAULT_MODEL,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setChat(newChat);
      setCurrentChatId(newChat.id);
      saveChat(newChat);
    }
    
    if (!settings.apiKey) {
      setSettingsOpen(true);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, currentMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, attachments: Attachment[]) => {
    if (!chat) return;
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
    saveChat(updatedChat);
    
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
          saveChat(errorChat);
        },
        () => {
          // Update assistant message with full response
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
          saveChat(finalChat);
          setCurrentMessage('');
          setIsGenerating(false);
        }
      );
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setIsGenerating(false);
    }
  };

  const handleModelChange = (modelId: string) => {
    if (!chat) return;
    
    const updatedChat = {
      ...chat,
      model: modelId
    };
    
    setChat(updatedChat);
    saveChat(updatedChat);
  };

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // If chat is not initialized yet, show loading
  if (!chat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading Chat</div>
          <div className="typing-dots">Initializing</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader
        selectedModel={chat.model}
        models={settings.models}
        onModelChange={handleModelChange}
        onOpenSettings={() => setSettingsOpen(true)}
        isApiKeySet={!!settings.apiKey}
      />
      
      <div className="flex-1 overflow-y-auto">
        {chat.messages.length === 0 ? (
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
        )}
      </div>
      
      <div className="sticky bottom-0">
        <ChatInput 
          onSendMessage={handleSendMessage}
          disabled={isGenerating} 
        />
      </div>
      
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
};

export default ChatComponent;
