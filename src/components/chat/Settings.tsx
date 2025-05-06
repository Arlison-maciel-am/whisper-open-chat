import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchModels } from '@/lib/api';
import { OpenRouterSettings, Model } from '@/types/chat';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import {
  Checkbox
} from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  settings: OpenRouterSettings;
  onSaveSettings: (settings: OpenRouterSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({
  open,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setApiKey(settings.apiKey || '');
    
    if (open) {
      // Load enabled models from database
      fetchEnabledModels();
    }
  }, [settings.apiKey, open]);

  // Fetch enabled models from database
  const fetchEnabledModels = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('available_models')
        .select('*')
        .eq('enabled', true);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // If we have models in the database, use those
        const dbModels = data.map(model => ({
          id: model.model_id,
          name: model.name,
          maxTokens: model.max_tokens
        }));
        
        setAllModels(dbModels);
        setEnabledModels(dbModels.map(m => m.id));
      } else if (settings.models.length > 0) {
        // Otherwise use the ones from local storage
        setAllModels(settings.models);
        setEnabledModels(settings.models.map(m => m.id));
      }
    } catch (error) {
      console.error('Error fetching enabled models:', error);
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    setIsFetchingModels(true);
    
    try {
      const models = await fetchModels(apiKey);
      setAllModels(models);
      setEnabledModels(models.map(m => m.id));
      toast.success("Models fetched successfully");
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("Invalid API key or connection error");
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }

    setIsLoading(true);
    
    try {
      // Get only the enabled models
      const selectedModels = allModels.filter(model => enabledModels.includes(model.id));
      
      // Save API key to database
      const { error: apiKeyError } = await supabase
        .from('api_settings')
        .upsert({ 
          user_id: user.id, 
          api_key: apiKey,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (apiKeyError) throw apiKeyError;
      
      // Save enabled models to database
      // First, delete all existing models
      await supabase.from('available_models').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Then insert the enabled ones
      for (const model of allModels) {
        const { error: modelError } = await supabase
          .from('available_models')
          .insert({
            model_id: model.id,
            name: model.name,
            max_tokens: model.maxTokens,
            enabled: enabledModels.includes(model.id)
          });
        
        if (modelError) throw modelError;
      }
      
      onSaveSettings({
        apiKey,
        models: selectedModels
      });
      
      toast.success("Settings saved successfully");
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setEnabledModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isFetchingModels && !isLoading) {
      handleFetchModels();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>OpenRouter Settings</DialogTitle>
          <DialogDescription>
            Enter your OpenRouter API key to access available models.
            Get an API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">openrouter.ai/keys</a>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="sk_or_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button 
                onClick={handleFetchModels}
                disabled={isFetchingModels || !apiKey.trim()}
                variant="secondary"
              >
                {isFetchingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Models"}
              </Button>
            </div>
          </div>
          
          {allModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Available Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Select which models should be available in the chat interface:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allModels.map((model) => (
                      <div key={model.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`model-${model.id}`} 
                          checked={enabledModels.includes(model.id)}
                          onCheckedChange={() => handleModelToggle(model.id)}
                        />
                        <Label 
                          htmlFor={`model-${model.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {model.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || !apiKey.trim() || enabledModels.length === 0}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
