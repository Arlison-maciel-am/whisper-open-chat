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

// Interface para agrupar chats por período de tempo
interface ChatGroups {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
}

export function ChatSidebar({ onNewChat, onSelectChat, currentChatId }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatGroups, setChatGroups] = useState<ChatGroups>({
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    fetchChats();
  }, [user]);

  // Agrupa chats por período de tempo
  useEffect(() => {
    if (chats.length > 0) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const yesterday = today - 86400000; // 24 horas em milissegundos
      const lastWeekStart = today - 7 * 86400000; // 7 dias em milissegundos
      const lastMonthStart = today - 30 * 86400000; // 30 dias em milissegundos

      const groups: ChatGroups = {
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: []
      };

      chats.forEach(chat => {
        const chatDate = chat.createdAt;
        if (chatDate >= today) {
          groups.today.push(chat);
        } else if (chatDate >= yesterday) {
          groups.yesterday.push(chat);
        } else if (chatDate >= lastWeekStart) {
          groups.lastWeek.push(chat);
        } else if (chatDate >= lastMonthStart) {
          groups.lastMonth.push(chat);
        } else {
          groups.older.push(chat);
        }
      });

      setChatGroups(groups);
    }
  }, [chats]);

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

  // Renderiza uma lista de chats
  const renderChatList = (chatList: Chat[]) => {
    if (chatList.length === 0) return null;

    return chatList.map((chat) => (
      <SidebarMenuItem key={chat.id} className="relative group">
        <SidebarMenuButton
          className="justify-between w-full py-3"
          isActive={currentChatId === chat.id}
          onClick={() => onSelectChat(chat)}
        >
          <div className="flex flex-col items-start w-full pr-8 px-2 py-1">
            <span className="truncate w-full font-medium pt-1">{chat.title}</span>
            <span className="text-xs text-muted-foreground mt-1 pb-1">{formatDate(chat.updatedAt)}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => handleDeleteChat(chat.id, e)}
            aria-label="Delete chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));
  };

  // Renderiza uma seção com título e lista de chats
  const renderChatSection = (title: string, chatList: Chat[]) => {
    if (chatList.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-xs font-medium text-muted-foreground px-3 py-2">{title}</h3>
        <SidebarMenu className="space-y-1">
          {renderChatList(chatList)}
        </SidebarMenu>
      </div>
    );
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
            <div className="px-2">
              {renderChatSection('Hoje', chatGroups.today)}
              {renderChatSection('Ontem', chatGroups.yesterday)}
              {renderChatSection('Últimos 7 dias', chatGroups.lastWeek)}
              {renderChatSection('Últimos 30 dias', chatGroups.lastMonth)}
              {renderChatSection('Mais antigos', chatGroups.older)}
            </div>
          )}
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
