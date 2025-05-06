
import React, { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { Attachment } from '@/types/chat';

interface ChatInputProps {
  onSendMessage: (message: string, attachments: Attachment[]) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      setAttachments([]);
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

  return (
    <div className="border-t p-4 bg-background">
      <div className="container max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map(attachment => (
              <div 
                key={attachment.id}
                className="px-3 py-1.5 bg-secondary rounded-full text-xs flex items-center gap-1.5"
              >
                <span className="truncate max-w-[150px]">{attachment.name}</span>
                <button 
                  onClick={() => removeAttachment(attachment.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 items-end border rounded-lg bg-background p-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2"
            disabled={disabled}
          />
          
          <div className="flex-shrink-0 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-full"
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            
            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={disabled || (message.trim() === '' && attachments.length === 0)}
              className="rounded-full"
            >
              <Send className="h-5 w-5" />
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
