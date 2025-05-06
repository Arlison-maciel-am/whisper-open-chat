
import React, { useEffect, useState } from 'react';
import { PlusCircle, MessageSquare, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Chat } from '@/types/chat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from '@/components/ui/sidebar';

interface ChatSidebarProps {
  onNewChat: () => void;
  onSelectChat: (chat: Chat) => void;
  currentChatId: string | null;
}

export function ChatSidebar({ onNewChat, onSelectChat, currentChatId }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    fetchChats();
  }, [user]);

  const fetchChats = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      // Convert the data to our Chat type
      const chatData: Chat[] = data.map(chat => ({
        id: chat.id,
        title: chat.title || 'Untitled Chat',
        messages: [],
        model: chat.model,
        createdAt: new Date(chat.created_at).getTime(),
        updatedAt: new Date(chat.updated_at).getTime()
      }));
      
      setChats(chatData);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      
      if (error) throw error;
      
      setChats(chats.filter(chat => chat.id !== chatId));
      toast.success('Chat deleted');
      
      // If current chat was deleted, create a new one
      if (currentChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="flex justify-between items-center p-4">
        <h2 className="font-semibold text-md">Whisper Open Chat</h2>
        <Button variant="outline" size="sm" onClick={onNewChat}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </SidebarHeader>
      
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <SidebarMenu>
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="h-12 rounded-md bg-muted/50 animate-pulse"></div>
                </SidebarMenuItem>
              ))
            ) : chats.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No chats yet</p>
                <p className="text-sm">Start by creating a new chat</p>
              </div>
            ) : (
              chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton 
                    className="justify-between w-full"
                    isActive={currentChatId === chat.id}
                    onClick={() => onSelectChat(chat)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="truncate max-w-[180px]">{chat.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(chat.updatedAt)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="px-4 py-2">
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
