
import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, X } from 'lucide-react';
import { Attachment } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string, attachments: Attachment[]) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(file => ({
        id: `attachment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size
      }));
      
      setAttachments([...attachments, ...newAttachments]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(attachment => attachment.id !== id));
  };
  
  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  return (
    <div className="w-full border-t border-border/40 bg-background/95 backdrop-blur-md p-4 z-10">
      <div className="container max-w-6xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map(attachment => (
              <div 
                key={attachment.id}
                className="px-3 py-1.5 bg-secondary/80 border border-border/60 rounded-full text-xs flex items-center gap-2"
              >
                <span className="truncate max-w-[150px]">{attachment.name}</span>
                <button 
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-muted-foreground hover:text-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className={cn(
          "gradient-border flex gap-2 items-end rounded-lg bg-secondary/40",
          !disabled && "hover:shadow-glow transition-shadow duration-300"
        )}>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-3 text-sm scrollbar-none"
            disabled={disabled}
          />
          
          <div className="flex-shrink-0 flex gap-1.5 p-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="h-9 w-9 rounded-full bg-accent/80 border-border/60 hover:bg-primary/20"
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            
            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={disabled || (message.trim() === '' && attachments.length === 0)}
              className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
