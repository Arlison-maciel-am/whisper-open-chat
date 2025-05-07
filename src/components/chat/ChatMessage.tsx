
import React from 'react';
import { Message } from '@/types/chat';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const formattedTime = typeof message.timestamp === 'number' 
    ? format(new Date(message.timestamp), 'h:mm a')
    : '';
    
  // Get user initial
  const userInitial = "U";
  
  return (
    <div className={cn(
      "py-6 animate-fade-in",
      isUser ? "chat-message-user" : "chat-message-assistant",
    )}>
      <div className="container max-w-6xl mx-auto flex gap-4 px-4 md:px-6">
        <div className="flex-shrink-0 pt-1">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isUser ? "bg-primary/20 text-primary-foreground" : "bg-chat-bubble text-white"
          )}>
            <div className="font-medium text-sm">
              {isUser ? userInitial : "AI"}
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <div className="font-semibold text-sm">
              {isUser ? "You" : "Assistant"}
            </div>
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
            "prose-pre:bg-muted prose-pre:text-muted-foreground"
          )}>
            {message.content && (
              <div className="markdown" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
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
    </div>
  );
};

export default ChatMessage;
