
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Model } from '@/types/chat';
import { Plus, Trash, Edit, Save, X } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

interface Group {
  id: string;
  name: string;
  company_id: string;
  authorized_models: string[];
  permissions: Record<string, boolean>;
}

interface GroupUser {
  id: string;
  user_id: string;
  group_id: string;
  user_email?: string;
}

export default function GroupsSettings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [groupUsers, setGroupUsers] = useState<GroupUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user } = useAuth();

  // Available permissions
  const availablePermissions = [
    { id: "create_chat", label: "Criar Chat" },
    { id: "delete_chat", label: "Excluir Chat" },
    { id: "edit_settings", label: "Editar Configurações" },
    { id: "manage_users", label: "Gerenciar Usuários" },
  ];

  useEffect(() => {
    if (user) {
      fetchCompanyId();
      fetchGroups();
      fetchAvailableModels();
    }
  }, [user]);

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
        .select('*');

      if (error) throw error;
      
      // Transform the data to match our Group interface
      const transformedGroups: Group[] = data.map(group => ({
        id: group.id,
        name: group.name,
        company_id: group.company_id,
        authorized_models: Array.isArray(group.authorized_models) 
          ? group.authorized_models.map(item => String(item))
          : [],
        permissions: typeof group.permissions === 'object' 
          ? group.permissions as Record<string, boolean>
          : {}
      }));
      
      setGroups(transformedGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Erro ao buscar grupos");
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const { data, error } = await supabase
        .from('available_models')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;
      
      setAvailableModels(data.map(model => ({
        id: model.model_id,
        name: model.name,
        maxTokens: model.max_tokens
      })));
    } catch (error) {
      console.error("Error fetching models:", error);
    }
  };

  const fetchGroupUsers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_users')
        .select(`
          id,
          user_id,
          group_id
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      
      const users = data || [];
      setGroupUsers(users);
      
    } catch (error) {
      console.error("Error fetching group users:", error);
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setSelectedModels(group.authorized_models || []);
    fetchGroupUsers(group.id);
    setIsEditing(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !companyId) {
      toast.error("Nome do grupo e empresa são obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: newGroupName,
          company_id: companyId,
          authorized_models: [],
          permissions: {}
        })
        .select();

      if (error) throw error;

      if (data) {
        // Transform the returned data to match our Group interface
        const newGroup: Group = {
          id: data[0].id,
          name: data[0].name,
          company_id: data[0].company_id,
          authorized_models: [],
          permissions: {}
        };
        
        setGroups([...groups, newGroup]);
        setNewGroupName("");
        setIsCreating(false);
        toast.success("Grupo criado com sucesso");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!selectedGroup) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: selectedGroup.name,
          authorized_models: selectedModels,
          permissions: selectedGroup.permissions || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedGroup.id);

      if (error) throw error;

      // Update local state
      const updatedGroups = groups.map(g => 
        g.id === selectedGroup.id 
          ? { ...g, name: selectedGroup.name, authorized_models: selectedModels, permissions: selectedGroup.permissions || {} } 
          : g
      );
      setGroups(updatedGroups);
      setIsEditing(false);
      toast.success("Grupo atualizado com sucesso");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Erro ao atualizar grupo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      toast.success("Grupo excluído com sucesso");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Erro ao excluir grupo");
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    if (!selectedGroup) return;
    
    const updatedPermissions = { 
      ...selectedGroup.permissions, 
      [permissionId]: !selectedGroup.permissions?.[permissionId] 
    };
    
    setSelectedGroup({
      ...selectedGroup,
      permissions: updatedPermissions
    });
  };

  const handleToggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h3 className="text-lg font-medium">Gerenciamento de Grupos</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie grupos de usuários e suas permissões
        </p>
      </div>
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        {/* Groups List */}
        <div className="border rounded-md p-4 h-[500px] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Grupos</h4>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {isCreating && (
            <div className="flex items-center mb-4 space-x-2">
              <Input 
                placeholder="Nome do grupo" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleCreateGroup} disabled={isLoading}>
                <Save className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsCreating(false);
                  setNewGroupName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <ul className="space-y-2">
            {groups.map(group => (
              <li 
                key={group.id}
                className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${
                  selectedGroup?.id === group.id ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectGroup(group)}
              >
                <span>{group.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGroup(group.id);
                  }}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Group Details */}
        <div className="md:col-span-2 border rounded-md p-4 h-[500px] overflow-auto">
          {selectedGroup ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {isEditing ? (
                  <Input 
                    value={selectedGroup.name}
                    onChange={(e) => setSelectedGroup({...selectedGroup, name: e.target.value})}
                    className="max-w-xs"
                  />
                ) : (
                  <h4 className="font-medium text-lg">{selectedGroup.name}</h4>
                )}
                
                <div>
                  {isEditing ? (
                    <div className="space-x-2">
                      <Button size="sm" onClick={handleSaveGroup} disabled={isLoading}>Salvar</Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          // Reset to original state
                          const original = groups.find(g => g.id === selectedGroup.id);
                          if (original) {
                            setSelectedGroup(original);
                            setSelectedModels(original.authorized_models || []);
                          }
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Editar
                    </Button>
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Permissions */}
              <div className="space-y-2">
                <h5 className="font-medium">Permissões</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePermissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`permission-${permission.id}`}
                        checked={!!selectedGroup.permissions?.[permission.id]}
                        onCheckedChange={() => isEditing && handleTogglePermission(permission.id)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor={`permission-${permission.id}`}>
                        {permission.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Available Models */}
              <div className="space-y-2">
                <h5 className="font-medium">Modelos Autorizados</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableModels.map(model => (
                    <div key={model.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`model-${model.id}`}
                        checked={selectedModels.includes(model.id)}
                        onCheckedChange={() => isEditing && handleToggleModel(model.id)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor={`model-${model.id}`}>
                        {model.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Group Users */}
              <div className="space-y-2">
                <h5 className="font-medium">Usuários do Grupo</h5>
                {groupUsers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID do Usuário</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupUsers.map(groupUser => (
                        <TableRow key={groupUser.id}>
                          <TableCell>{groupUser.user_id}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={!isEditing}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum usuário no grupo</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-muted-foreground">Selecione um grupo para ver detalhes ou crie um novo grupo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
