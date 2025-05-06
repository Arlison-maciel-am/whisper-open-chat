
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
import { OpenRouterSettings } from '@/types/chat';

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey || '');
  }, [settings.apiKey, open]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    setIsLoading(true);
    
    try {
      const models = await fetchModels(apiKey);
      
      onSaveSettings({
        apiKey,
        models
      });
      
      toast.success("Settings saved successfully");
      onClose();
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("Invalid API key or connection error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>OpenRouter Settings</DialogTitle>
          <DialogDescription>
            Enter your OpenRouter API key to access available models.
            Get an API key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">openrouter.ai/keys</a>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk_or_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading || !apiKey.trim()}
          >
            {isLoading ? "Loading..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
