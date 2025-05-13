import React from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Function to format the message content
const formatMessage = (content: string) => {
  // Replace new lines with <br /> tags for HTML rendering
  return content.replace(/\n/g, '<br />');
};

const ChatMessage = ({ message, modelName }: { message: Message; modelName: string }) => {
  
  return (
    <div className={cn(
      "py-4",
      message.role === "assistant" ? "bg-muted/30" : "bg-background"
    )}>
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <div className={cn(
          "flex",
          message.role === "assistant" ? "justify-start" : "justify-end"
        )}>
          <div className={cn(
            "max-w-[85%] md:max-w-[75%]",
            message.role === "assistant" ? "" : "order-1"
          )}>
            <div className="flex items-center mb-1">
              {message.role === "assistant" ? (
                <>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-chat-bubble text-white mr-2">
                    <div className="font-medium text-xs">AI</div>
                  </div>
                  <div className="font-semibold text-sm mr-2">{modelName}</div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-sm ml-auto">You</div>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white ml-2">
                    <div className="font-medium text-xs">U</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Display attachments if present */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map(attachment => (
                    <div 
                      key={attachment.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-xs"
                    >
                      {attachment.type.startsWith('image/') && attachment.url ? (
                        <div className="mr-2">
                          <img 
                            src={attachment.url} 
                            alt={attachment.name} 
                            className="h-5 w-5 object-cover rounded"
                          />
                        </div>
                      ) : null}
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-foreground/90 prose-p:leading-relaxed prose-code:text-primary-foreground/90 prose-code:bg-primary/10 prose-code:rounded prose-strong:text-foreground prose-strong:font-semibold prose-pre:bg-muted prose-pre:text-muted-foreground">
              <div 
                className="markdown"
                dangerouslySetInnerHTML={{ 
                  __html: formatMessage(message.content)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
