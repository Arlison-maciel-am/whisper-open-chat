
import React, { useEffect, useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, Users, Mail, Settings } from 'lucide-react';
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
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar';
import { NavProject } from '@/components/chat/NavProject';
import { NavUser } from '@/components/chat/NavUser';

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

  // Renderiza um chat individual com o botão de deletar
  const renderChatItem = (chat: Chat, isSubItem: boolean = false) => {
    const Component = isSubItem ? SidebarMenuSubItem : SidebarMenuItem;
    const ButtonComponent = isSubItem ? SidebarMenuSubButton : SidebarMenuButton;
    
    return (
      <Component key={chat.id} className="relative group">
        <ButtonComponent
          isActive={currentChatId === chat.id}
          onClick={() => onSelectChat(chat)}
          className="w-full justify-between"
        >
          <div className="flex flex-col items-start w-full pr-8">
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
        </ButtonComponent>
      </Component>
    );
  };

  // Renderiza um grupo de chats por período
  const renderChatGroup = (title: string, chatList: Chat[]) => {
    if (chatList.length === 0) return null;

    return (
      <SidebarMenuSub>
        <div className="text-xs font-medium text-muted-foreground px-3 py-2">{title}</div>
        {chatList.map(chat => renderChatItem(chat, true))}
      </SidebarMenuSub>
    );
  };

  return (
    <Sidebar variant="floating">
      <SidebarHeader>
        <NavProject />
        <div className="flex justify-between items-center px-4 pb-4">
          <h2 className="font-semibold text-md">Whisper Open Chat</h2>
          <Button variant="outline" size="sm" onClick={onNewChat}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-14rem)]">
          {isLoading ? (
            <div className="px-3 py-2">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse mb-2"></div>
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm">Start by creating a new chat</p>
            </div>
          ) : (
            <div className="px-2">
              <SidebarGroup>
                <SidebarGroupLabel>Chats</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderChatGroup('Hoje', chatGroups.today)}
                    {renderChatGroup('Ontem', chatGroups.yesterday)}
                    {renderChatGroup('Últimos 7 dias', chatGroups.lastWeek)}
                    {renderChatGroup('Últimos 30 dias', chatGroups.lastMonth)}
                    {renderChatGroup('Mais antigos', chatGroups.older)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarSeparator />
        <div className="space-y-2 px-4 pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <Users className="mr-2 h-4 w-4" />
              Support
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <Mail className="mr-2 h-4 w-4" />
              Feedback
            </a>
          </Button>
        </div>
        <SidebarSeparator />
        <NavUser signOut={signOut} />
      </SidebarFooter>
    </Sidebar>
  );
}
