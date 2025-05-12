
import React, { useEffect, useState } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface ChatHeaderProps {
  selectedModel: string;
  models: Model[];
  onModelChange: (modelId: string) => void;
  onOpenSettings: () => void;
  isApiKeySet: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedModel,
  models: allModels,
  onModelChange,
  onOpenSettings,
  isApiKeySet
}) => {
  const { user } = useAuth();
  const [filteredModels, setFilteredModels] = useState<Model[]>(allModels);
  
  // Fetch authorized models for the user's group
  useEffect(() => {
    if (!user) return;
    
    const fetchAuthorizedModels = async () => {
      try {
        // Get the user's group(s)
        const { data: userGroups, error: groupError } = await supabase
          .from('group_users')
          .select('group_id')
          .eq('user_id', user.id);
        
        if (groupError || !userGroups || userGroups.length === 0) {
          // If no groups or error, use all available enabled models
          setFilteredModels(allModels);
          return;
        }
        
        // Get the group details with authorized models
        const groupIds = userGroups.map(g => g.group_id);
        const { data: groups, error: authError } = await supabase
          .from('groups')
          .select('authorized_models')
          .in('id', groupIds);
        
        if (authError || !groups || groups.length === 0) {
          // If no data or error, use all available enabled models
          setFilteredModels(allModels);
          return;
        }
        
        // Combine all authorized models from all groups
        const authorizedModelIds: string[] = [];
        groups.forEach(group => {
          if (group.authorized_models && Array.isArray(group.authorized_models)) {
            authorizedModelIds.push(...group.authorized_models.map(id => id.toString()));
          }
        });
        
        // Filter models based on authorized model IDs
        if (authorizedModelIds.length > 0) {
          const userModels = allModels.filter(model => 
            authorizedModelIds.includes(model.id)
          );
          setFilteredModels(userModels.length > 0 ? userModels : allModels);
        } else {
          setFilteredModels(allModels);
        }
      } catch (error) {
        console.error('Error fetching authorized models:', error);
        setFilteredModels(allModels);
      }
    };
    
    fetchAuthorizedModels();
  }, [user, allModels]);
  
  // Find the current model to display its name
  const currentModel = filteredModels.find(model => model.id === selectedModel) || 
                      (filteredModels.length > 0 ? filteredModels[0] : null);
  
  // If current selected model is not in filtered models, select the first available
  useEffect(() => {
    if (filteredModels.length > 0 && !filteredModels.some(m => m.id === selectedModel)) {
      onModelChange(filteredModels[0].id);
    }
  }, [filteredModels, selectedModel, onModelChange]);
  
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
            disabled={!isApiKeySet || filteredModels.length === 0}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs bg-secondary/50 border-border/60">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="h-3.5 w-3.5 text-primary/80" />
                <SelectValue placeholder="Select model">
                  {currentModel?.name || "Selecionar modelo"}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-md border-border/60">
              {filteredModels.map((model) => (
                <SelectItem 
                  key={model.id} 
                  value={model.id}
                  className="text-sm focus:bg-accent/80 focus:text-foreground"
                >
                  {model.name}
                </SelectItem>
              ))}
              {filteredModels.length === 0 && (
                <div className="py-2 px-2 text-sm text-muted-foreground">
                  Nenhum modelo disponível
                </div>
              )}
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
