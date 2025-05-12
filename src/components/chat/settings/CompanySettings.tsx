
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Company {
  id: string;
  name: string;
  logo: string | null;
  cnpj: string | null;
}

export default function CompanySettings() {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error("Error fetching company:", error);
          toast.error("Erro ao buscar dados da empresa");
        }
        return;
      }

      if (data) {
        setName(data.name);
        setLogo(data.logo || "");
        setCnpj(data.cnpj || "");
        setCompanyId(data.id);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast.error("Erro ao buscar dados da empresa");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    setIsLoading(true);

    try {
      let response;

      if (companyId) {
        // Update existing company
        response = await supabase
          .from('companies')
          .update({
            name,
            logo,
            cnpj,
            updated_at: new Date().toISOString()
          })
          .eq('id', companyId);
      } else {
        // Create new company
        response = await supabase
          .from('companies')
          .insert({
            name,
            logo,
            cnpj
          })
          .select();
        
        if (response.data && response.data[0]) {
          setCompanyId(response.data[0].id);
        }
      }

      if (response.error) {
        throw response.error;
      }

      toast.success("Dados da empresa salvos com sucesso");
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error("Erro ao salvar dados da empresa");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h3 className="text-lg font-medium">Informações da Empresa</h3>
        <p className="text-sm text-muted-foreground">
          Atualize as informações da sua empresa
        </p>
      </div>
      <Separator />
      <div className="space-y-4 w-full max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="company-name">Nome da Empresa</Label>
          <Input 
            id="company-name" 
            placeholder="Nome da Empresa" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-logo">Logo URL</Label>
          <Input 
            id="company-logo" 
            placeholder="URL da Logo" 
            value={logo}
            onChange={(e) => setLogo(e.target.value)}
          />
          {logo && (
            <div className="mt-2 p-2 border rounded-md w-24 h-24 flex items-center justify-center">
              <img src={logo} alt="Logo Preview" className="max-w-full max-h-full" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="company-cnpj">CNPJ</Label>
          <Input 
            id="company-cnpj" 
            placeholder="00.000.000/0000-00" 
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
