import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Plus, Trash, Edit, Save, X } from 'lucide-react';

interface Group {
  id: string;
  name: string;
}

interface GroupUser {
  id: string;
  user_id: string;
  group_id: string;
}

interface User {
  id: string;
  email: string;
  groupId?: string;
  groupName?: string;
}

export default function UsersSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchUsers();
      fetchGroups();
      fetchCompanyId();
    }
  }, [currentUser]);

  const fetchCompanyId = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error("Error fetching company:", error);
        }
        return;
      }

      if (data) {
        setCompanyId(data.id);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name');

      if (error) throw error;
      
      setGroups(data || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Erro ao buscar grupos");
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users from auth.users (not directly possible with supabase client)
      // In a real implementation, you would need to create a serverless function
      // to fetch users, or use a different approach
      
      // For now, we'll fetch group_users to get the mapping
      const { data: groupUsersData, error: groupUsersError } = await supabase
        .from('group_users')
        .select(`
          id,
          user_id,
          group_id,
          groups:group_id (
            id,
            name
          )
        `);

      if (groupUsersError) throw groupUsersError;

      // This is just placeholder data since we can't directly query auth.users
      // In a real implementation, you would fetch actual users
      const mockUsers = [
        { id: currentUser?.id || 'user1', email: currentUser?.email || 'user1@example.com' },
        // Add more mock users if needed for demonstration
      ];
      
      // Merge user data with group assignments
      const usersWithGroups = mockUsers.map(user => {
        const groupUser = groupUsersData?.find(gu => gu.user_id === user.id);
        return {
          ...user,
          groupId: groupUser?.group_id || '',
          groupName: groupUser?.groups?.name || '',
        };
      });
      
      setUsers(usersWithGroups);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao buscar usuários");
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSelectedGroupId(user.groupId || "");
    setIsEditing(false);
  };

  const handleSaveUserGroup = async () => {
    if (!selectedUser) return;

    setIsLoading(true);

    try {
      // Check if user already has a group
      const { data: existingGroupUsers, error: fetchError } = await supabase
        .from('group_users')
        .select('id')
        .eq('user_id', selectedUser.id);

      if (fetchError) throw fetchError;

      if (existingGroupUsers && existingGroupUsers.length > 0) {
        // User already has group assignment, update it
        if (selectedGroupId) {
          const { error: updateError } = await supabase
            .from('group_users')
            .update({ group_id: selectedGroupId })
            .eq('user_id', selectedUser.id);

          if (updateError) throw updateError;
        } else {
          // Remove group assignment if no group selected
          const { error: deleteError } = await supabase
            .from('group_users')
            .delete()
            .eq('user_id', selectedUser.id);

          if (deleteError) throw deleteError;
        }
      } else if (selectedGroupId) {
        // Create new group assignment
        const { error: insertError } = await supabase
          .from('group_users')
          .insert({
            user_id: selectedUser.id,
            group_id: selectedGroupId
          });

        if (insertError) throw insertError;
      }

      // Update local state
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      const updatedUsers = users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, groupId: selectedGroupId, groupName: selectedGroup?.name || '' } 
          : u
      );
      
      setUsers(updatedUsers);
      setIsEditing(false);
      toast.success("Grupo do usuário atualizado com sucesso");
    } catch (error) {
      console.error("Error updating user group:", error);
      toast.error("Erro ao atualizar grupo do usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 w-full">
      <div>
        <h3 className="text-lg font-medium">Gerenciamento de Usuários</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie usuários e seus grupos
        </p>
      </div>
      <Separator />
      
      <div className="flex flex-col space-y-4">
        <Input
          placeholder="Buscar usuário por email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow 
                  key={user.id} 
                  className={selectedUser?.id === user.id ? "bg-muted" : ""}
                  onClick={() => handleSelectUser(user)}
                >
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.groupName || "Nenhum"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectUser(user);
                        setIsEditing(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {selectedUser && isEditing && (
          <div className="border p-4 rounded-md space-y-4 max-w-md">
            <h4 className="font-medium">Editar Grupo do Usuário</h4>
            
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" value={selectedUser.email} disabled />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user-group">Grupo</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum grupo</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleSaveUserGroup} disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setSelectedGroupId(selectedUser.groupId || "");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
