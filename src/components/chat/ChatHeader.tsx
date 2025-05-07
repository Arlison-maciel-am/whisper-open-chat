
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Sparkles } from 'lucide-react';
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
  // Find the current model to display its name
  const currentModel = models.find(model => model.id === selectedModel);
  
  return (
    <div className="w-full border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-10">
      <div className="container max-w-6xl mx-auto py-3 px-4 md:px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <span className="text-primary font-semibold mr-1 text-lg">Whisper</span>
            <span className="text-lg font-light">Chat</span>
          </div>
          
          <div className="h-5 w-px bg-border/60 mx-2 hidden sm:block" />
          
          <Select
            value={selectedModel}
            onValueChange={onModelChange}
            disabled={!isApiKeySet || models.length === 0}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs bg-secondary/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                <SelectValue placeholder="Select model">
                  {currentModel?.name || "Select model"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/60">
              {models.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="text-sm focus:bg-accent/80 focus:text-foreground"
                >
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onOpenSettings}
          className="h-8 px-2.5 bg-secondary/50 border-border/60 hover:bg-accent/80"
        >
          <Settings className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline-block text-xs">Settings</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
