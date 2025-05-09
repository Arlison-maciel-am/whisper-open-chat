
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { LogOut, User } from 'lucide-react';

interface NavUserProps {
  signOut: () => void;
}

export function NavUser({ signOut }: NavUserProps) {
  const { user } = useAuth();
  
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium truncate max-w-28">
            {user?.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-28">
            {user?.email || 'user@example.com'}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        <span className="sr-only">Log out</span>
      </Button>
    </div>
  );
}
