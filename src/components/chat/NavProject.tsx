
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import SettingsDialog from './SettingsDialog';

export function NavProject() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center gap-2">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">W</div>
          <div>
            <div className="text-sm font-medium">Whisper Chat</div>
            <div className="text-xs text-muted-foreground">AI Assistant</div>
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}>
        <Settings className="h-4 w-4" />
        <span className="sr-only">Settings</span>
      </Button>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
