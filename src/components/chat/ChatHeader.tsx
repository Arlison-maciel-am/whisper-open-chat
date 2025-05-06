
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings } from 'lucide-react';
import { Model } from '@/types/chat';

interface ChatHeaderProps {
  selectedModel: string;
  models: Model[];
  onModelChange: (modelId: string) => void;
  onOpenSettings: () => void;
  isApiKeySet: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedModel,
  models,
  onModelChange,
  onOpenSettings,
  isApiKeySet
}) => {
  return (
    <div className="bg-background sticky top-0 z-10 border-b">
      <div className="container max-w-4xl mx-auto py-4 px-4 md:px-0 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Whisper Open Chat</h1>
          
          <Select
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={!isApiKeySet || models.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="icon" onClick={onOpenSettings}>
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
