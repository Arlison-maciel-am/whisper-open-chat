
import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <DialogContent className="max-w-6xl p-0 flex h-[80vh]">
        {/* Sidebar */}
        <div className="w-64 border-r h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Configurações</h2>
            <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <TabsList className="flex flex-col w-full gap-1">
              <TabsTrigger 
                value="company"
                className="justify-start px-4 py-2 text-sm font-medium rounded-md text-left w-full"
                onClick={() => setActiveTab("company")}
              >
                <Building className="h-4 w-4 mr-2" />
                Empresa
              </TabsTrigger>
              <TabsTrigger 
                value="models"
                className="justify-start px-4 py-2 text-sm font-medium rounded-md text-left w-full"
                onClick={() => setActiveTab("models")}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Modelos
              </TabsTrigger>
              <TabsTrigger 
                value="groups"
                className="justify-start px-4 py-2 text-sm font-medium rounded-md text-left w-full"
                onClick={() => setActiveTab("groups")}
              >
                <Group className="h-4 w-4 mr-2" />
                Grupos
              </TabsTrigger>
              <TabsTrigger 
                value="users"
                className="justify-start px-4 py-2 text-sm font-medium rounded-md text-left w-full"
                onClick={() => setActiveTab("users")}
              >
                <Users className="h-4 w-4 mr-2" />
                Usuários
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="p-4 border-t">
            <div className="flex flex-col space-y-1">
              <Button variant="link" className="h-auto p-0 justify-start text-sm">
                Suporte
              </Button>
              <Button variant="link" className="h-auto p-0 justify-start text-sm">
                Feedback
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto h-full">
          <Tabs value={activeTab} className="h-full flex flex-col">
            <TabsContent value="company" className="flex-1 p-6 m-0 flex flex-col">
              <CompanySettings />
            </TabsContent>
            <TabsContent value="models" className="flex-1 p-6 m-0 flex flex-col">
              <ModelsSettings />
            </TabsContent>
            <TabsContent value="groups" className="flex-1 p-6 m-0 flex flex-col">
              <GroupsSettings />
            </TabsContent>
            <TabsContent value="users" className="flex-1 p-6 m-0 flex flex-col">
              <UsersSettings />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
