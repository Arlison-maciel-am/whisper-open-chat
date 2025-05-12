
import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Group, Settings as SettingsIcon, Users } from 'lucide-react';
import CompanySettings from './settings/CompanySettings';
import ModelsSettings from './settings/ModelsSettings';
import GroupsSettings from './settings/GroupsSettings';
import UsersSettings from './settings/UsersSettings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("company");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 flex h-[80vh] overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r h-full flex flex-col">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Configurações</h2>
            <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
          </div>

          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            orientation="vertical" 
            className="h-full flex flex-col"
          >
            <div className="flex-1 overflow-auto p-4">
              <TabsList className="flex flex-col w-full gap-1 h-auto bg-transparent">
                <TabsTrigger 
                  value="company"
                  className="justify-start px-4 py-3 text-sm font-medium rounded-md text-left w-full data-[state=active]:bg-accent"
                >
                  <Building className="h-4 w-4 mr-2.5" />
                  Empresa
                </TabsTrigger>
                <TabsTrigger 
                  value="models"
                  className="justify-start px-4 py-3 text-sm font-medium rounded-md text-left w-full data-[state=active]:bg-accent"
                >
                  <SettingsIcon className="h-4 w-4 mr-2.5" />
                  Modelos
                </TabsTrigger>
                <TabsTrigger 
                  value="groups"
                  className="justify-start px-4 py-3 text-sm font-medium rounded-md text-left w-full data-[state=active]:bg-accent"
                >
                  <Group className="h-4 w-4 mr-2.5" />
                  Grupos
                </TabsTrigger>
                <TabsTrigger 
                  value="users"
                  className="justify-start px-4 py-3 text-sm font-medium rounded-md text-left w-full data-[state=active]:bg-accent"
                >
                  <Users className="h-4 w-4 mr-2.5" />
                  Usuários
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-4 border-t">
              <div className="flex flex-col space-y-2">
                <a href="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
                  Suporte
                </a>
                <a href="#" className="text-sm text-foreground/70 hover:text-foreground transition-colors">
                  Feedback
                </a>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto h-full p-6">
          {activeTab === "company" && <CompanySettings />}
          {activeTab === "models" && <ModelsSettings />}
          {activeTab === "groups" && <GroupsSettings />}
          {activeTab === "users" && <UsersSettings />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
