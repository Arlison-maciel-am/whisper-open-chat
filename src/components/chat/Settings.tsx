
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            As configurações de API agora são gerenciadas no menu principal de configurações.
            Clique no ícone de configurações no cabeçalho para acessar todas as opções.
          </p>
        </div>
        
        <DialogFooter>
          <div className="text-xs text-muted-foreground">
            Settings are now managed in the main settings dialog.
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
