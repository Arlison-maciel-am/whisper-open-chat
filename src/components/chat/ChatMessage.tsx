
import React from 'react';
import { Message } from '@/types/chat';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { marked } from 'marked';

interface ChatMessageProps {
  message: Message;
  modelName?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, modelName = "AI" }) => {
  const isUser = message.role === 'user';
  const formattedTime = typeof message.timestamp === 'number' 
    ? format(new Date(message.timestamp), 'h:mm a')
    : '';
    
  // Get user initial
  const userInitial = "U";
  
  return (
    <div className={cn(
      "py-4 animate-fade-in",
    )}>
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className={cn(
          "flex",
          isUser ? "justify-end" : "justify-start"
        )}>
          {/* User message in a card aligned to the right */}
          {isUser ? (
            <div className="max-w-[80%] md:max-w-[70%]">
              <div className="flex justify-end mb-1">
                <div className="text-xs text-muted-foreground mr-2">
                  {formattedTime}
                </div>
                <div className="font-semibold text-sm">You</div>
              </div>
              <div className="user-message-card p-3 rounded-lg shadow-sm">
                <div className={cn(
                  "prose prose-sm max-w-none",
                  "prose-headings:text-foreground prose-headings:font-semibold",
                  "prose-p:text-foreground/90 prose-p:leading-relaxed",
                  "prose-code:text-primary-foreground/90 prose-code:bg-primary/20 prose-code:rounded",
                  "prose-strong:text-foreground prose-strong:font-semibold",
                  "prose-pre:bg-muted prose-pre:text-muted-foreground",
                )}>
                  {message.content && (
                    <div className="markdown"
                    dangerouslySetInnerHTML={{ __html: marked.parse(message.content) }} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Assistant message aligned to the left without a card */
            <div className="max-w-[85%] md:max-w-[75%]">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-chat-bubble text-white mr-2">
                  <div className="font-medium text-xs">AI</div>
                </div>
                <div className="font-semibold text-sm mr-2">{modelName}</div>
                <div className="text-xs text-muted-foreground">
                  {formattedTime}
                </div>
              </div>
              <div className={cn(
                "prose prose-sm max-w-none",
                "prose-headings:text-foreground prose-headings:font-semibold",
                "prose-p:text-foreground/90 prose-p:leading-relaxed",
                "prose-code:text-primary-foreground/90 prose-code:bg-primary/10 prose-code:rounded",
                "prose-strong:text-foreground prose-strong:font-semibold",
                "prose-pre:bg-muted prose-pre:text-muted-foreground",
              )}>
                {message.content && (
                  <div className="markdown"
                  dangerouslySetInnerHTML={{ __html: marked.parse(message.content) }} />
                )}
              </div>
            </div>
          )}
              
          {/* Attachments section */}
          {message.attachments && message.attachments.length > 0 && (
            <div className={cn(
              "mt-2 flex flex-wrap gap-2",
              isUser ? "justify-end" : "justify-start"
            )}>
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="bg-secondary/80 border border-border/60 rounded-md px-3 py-1.5 inline-flex items-center gap-2 text-xs"
                >
                  <svg className="h-3.5 w-3.5 text-primary/70" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                  </svg>
                  <span className="truncate max-w-[150px]">{attachment.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
