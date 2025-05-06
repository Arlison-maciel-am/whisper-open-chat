
import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { CircleUser } from 'lucide-react';
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`py-5 ${isUser ? 'bg-chat-user' : 'bg-chat-assistant'}`}>
      <div className="container max-w-4xl mx-auto flex gap-4">
        <div className="flex-shrink-0 pt-1">
          <Avatar className={`w-8 h-8 ${isUser ? 'bg-purple-500' : 'bg-chat-bubble'}`}>
            {isUser ? (
              <CircleUser className="w-5 h-5 text-white" />
            ) : (
              <div className="text-white font-semibold">AI</div>
            )}
          </Avatar>
        </div>
        
        <div className="flex-1 markdown">
          <div className="font-semibold mb-1">
            {isUser ? 'You' : 'Assistant'}
          </div>
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
          
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.attachments.map(attachment => (
                <div 
                  key={attachment.id}
                  className="px-3 py-1.5 bg-secondary rounded-full text-xs flex items-center gap-1.5"
                >
                  <span className="truncate max-w-[150px]">{attachment.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(attachment.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const formatMessage = (content: string): string => {
  // Replace URLs with clickable links
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const withLinks = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');
  
  // Replace markdown-style code blocks with HTML
  const codeBlockRegex = /```([\s\S]*?)```/g;
  const withCodeBlocks = withLinks.replace(codeBlockRegex, '<pre><code>$1</code></pre>');
  
  // Replace inline code
  const inlineCodeRegex = /`([^`]+)`/g;
  const withInlineCode = withCodeBlocks.replace(inlineCodeRegex, '<code>$1</code>');
  
  // Replace line breaks with <br>
  return withInlineCode.replace(/\n/g, '<br>');
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default ChatMessage;
