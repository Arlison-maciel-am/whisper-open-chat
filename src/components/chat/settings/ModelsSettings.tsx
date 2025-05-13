
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { fetchModels } from '@/lib/api';
import { OpenRouterSettings, Model } from '@/types/chat';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";

export default function ModelsSettings() {
  const [apiKey, setApiKey] = useState('');
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [savedModels, setSavedModels] = useState<Model[]>([]);
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user } = useAuth();

  // Estado para controlar o carregamento inicial
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Load settings on component mount
  useEffect(() => {
    if (user) {
      // Carregar tudo em paralelo para melhorar o desempenho
      setIsInitialLoading(true);
      Promise.all([
        fetchCompanyId(),
        fetchApiKey()
      ]).then(() => {
        fetchEnabledModels().finally(() => {
          setIsInitialLoading(false);
        });
      });
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
        return null;
      }

      if (data) {
        setCompanyId(data.id);
        return data.id;
      }
      return null;
    } catch (error) {
      console.error("Error fetching company data:", error);
      return null;
    }
  };

  const fetchApiKey = async () => {
    try {
      // Fetch API key from database
      if (!user) return null;
      
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from('api_settings')
        .select('api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (apiKeyError && apiKeyError.code !== 'PGRST116') {
        throw apiKeyError;
      }
      
      if (apiKeyData) {
        setApiKey(apiKeyData.api_key || '');
        return apiKeyData.api_key;
      }
      return null;
    } catch (error) {
      console.error('Error fetching API key:', error);
      return null;
    }
  };

  // Buscar modelos habilitados do banco de dados
  const fetchEnabledModels = async () => {
    if (!user) return;
    
    try {
      // Se não temos um ID de empresa, tente buscá-lo primeiro
      let currentCompanyId = companyId;
      if (!currentCompanyId) {
        currentCompanyId = await fetchCompanyId();
        if (!currentCompanyId) {
          console.log("No company ID available");
          return;
        }
      }
      
      // Buscar modelos com uma única consulta otimizada
      const { data, error } = await supabase
        .from('available_models')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Se temos modelos no banco de dados, use-os
        const dbModels = data.map(model => ({
          id: model.model_id,
          name: model.name,
          maxTokens: model.max_tokens
        }));
        
        // Definir todos os modelos disponíveis
        setAllModels(dbModels);
        
        // Definir apenas aqueles que estão marcados como habilitados no DB
        const enabledModelIds = data
          .filter(model => model.enabled)
          .map(model => model.model_id);
        
        setEnabledModels(enabledModelIds);
        
        // Definir modelos salvos (aqueles que estão habilitados)
        const enabledDbModels = dbModels.filter(model =>
          enabledModelIds.includes(model.id)
        );
        setSavedModels(enabledDbModels);
      }
    } catch (error) {
      console.error('Error fetching enabled models:', error);
    }
  };

  const handleFetchModels = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required");
      return;
    }

    setIsFetchingModels(true);
    
    try {
      const models = await fetchModels(apiKey);
      
      // Keep the enabled models but update the available models list
      setAllModels(models);
      toast.success("Modelos obtidos com sucesso");
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("API key inválida ou erro de conexão");
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("API key é obrigatória");
      return;
    }

    if (!user) {
      toast.error("Você precisa estar logado para salvar configurações");
      return;
    }

    setIsLoading(true);
    
    try {
      // Check if API key record exists for this user
      const { data: existingApiKey, error: checkError } = await supabase
        .from('api_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      // Save API key to database
      let apiKeyError;
      if (existingApiKey) {
        // Update existing record
        const { error } = await supabase
          .from('api_settings')
          .update({
            api_key: apiKey,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        apiKeyError = error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('api_settings')
          .insert({
            user_id: user.id,
            api_key: apiKey,
            updated_at: new Date().toISOString()
          });
        apiKeyError = error;
      }
      
      if (apiKeyError) throw apiKeyError;

      // Make sure we have a company ID
      if (!companyId) {
        toast.error("ID da empresa não encontrado");
        return;
      }
      
      // Apenas os modelos selecionados devem ser salvos no banco
      const modelsToSave = allModels.filter(model => enabledModels.includes(model.id));
      
      // Adicionar modelos salvos que possam não estar em allModels
      for (const savedModel of savedModels) {
        if (!modelsToSave.some(m => m.id === savedModel.id) && enabledModels.includes(savedModel.id)) {
          modelsToSave.push(savedModel);
        }
      }
      
      // Buscar modelos existentes para verificar quais precisam ser atualizados vs inseridos
      const { data: existingModels, error: fetchError } = await supabase
        .from('available_models')
        .select('model_id, enabled');
      
      if (fetchError) throw fetchError;
      
      const existingModelIds = existingModels?.map(m => m.model_id) || [];
      
      // Processar apenas os modelos selecionados
      for (const model of modelsToSave) {
        const modelData = {
          model_id: model.id,
          name: model.name,
          max_tokens: model.maxTokens,
          enabled: enabledModels.includes(model.id),
          company_id: companyId
        };
        
        if (existingModelIds.includes(model.id)) {
          // Update existing model
          const { error: updateError } = await supabase
            .from('available_models')
            .update(modelData)
            .eq('model_id', model.id);
          
          if (updateError) {
            console.error(`Error updating model ${model.id}:`, updateError);
            throw updateError;
          }
        } else {
          // Insert new model
          const { error: insertError } = await supabase
            .from('available_models')
            .insert(modelData);
          
          if (insertError) {
            console.error(`Error inserting model ${model.id}:`, insertError);
            throw insertError;
          }
        }
      }
      
      // Atualizar modelos existentes que não estão mais selecionados para enabled = false
      const modelsToKeep = modelsToSave.map(m => m.id);
      if (existingModelIds.length > 0) {
        const modelsToDisable = existingModelIds.filter(id => !modelsToKeep.includes(id));
        
        if (modelsToDisable.length > 0) {
          for (const modelId of modelsToDisable) {
            const { error: updateError } = await supabase
              .from('available_models')
              .update({ enabled: false })
              .eq('model_id', modelId);
            
            if (updateError) {
              console.error(`Error disabling model ${modelId}:`, updateError);
              throw updateError;
            }
          }
        }
      }
      
      // Atualizar a lista de modelos salvos
      const updatedSavedModels = modelsToSave;
      setSavedModels(updatedSavedModels);
      
      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Falha ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelToggle = (modelId: string) => {
    // Atualizar a lista de modelos habilitados
    setEnabledModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
    
    // Atualizar a lista de modelos salvos
    const model = allModels.find(m => m.id === modelId) ||
                  savedModels.find(m => m.id === modelId);
                  
    if (model) {
      setSavedModels(prev => {
        const isCurrentlyEnabled = enabledModels.includes(modelId);
        
        if (isCurrentlyEnabled) {
          // Se estava habilitado e agora está sendo desabilitado, remover dos modelos salvos
          return prev.filter(m => m.id !== modelId);
        } else {
          // Se estava desabilitado e agora está sendo habilitado, adicionar aos modelos salvos
          if (!prev.some(m => m.id === modelId)) {
            return [...prev, model];
          }
          return prev;
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isFetchingModels && !isLoading) {
      handleFetchModels();
    }
  };

  // Filter models based on search query
  const filteredModels = allModels.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    model.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full">
      <div>
        <h3 className="text-xl font-medium mb-2">Configurações de Modelos</h3>
        <p className="text-sm text-muted-foreground">
          Configure sua chave API e escolha quais modelos estarão disponíveis
        </p>
      </div>
      <Separator />

      <div className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="api-key" className="text-base">API Key OpenRouter</Label>
          <div className="flex gap-3">
            <Input
              id="api-key"
              type="password"
              placeholder="sk_or_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              onClick={handleFetchModels}
              disabled={isFetchingModels || !apiKey.trim()}
              variant="secondary"
              className="whitespace-nowrap"
            >
              {isFetchingModels ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando...
                </>
              ) : "Buscar Modelos"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Obtenha sua chave API em{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>
        
        {/* Indicador de carregamento inicial */}
        {isInitialLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando modelos...</span>
          </div>
        ) : (
          <>
            {/* Selected Models Section */}
            {savedModels.length > 0 && (
          <Card className="border-border/60 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Modelos Selecionados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Modelos atualmente habilitados:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
                  {savedModels.map((model) => (
                    <div key={model.id} className="flex items-center space-x-2 p-2 rounded-md bg-accent/30 hover:bg-accent/50">
                      <Checkbox
                        id={`saved-model-${model.id}`}
                        checked={enabledModels.includes(model.id)}
                        onCheckedChange={() => handleModelToggle(model.id)}
                      />
                      <Label
                        htmlFor={`saved-model-${model.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {model.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Available Models Section */}
        {allModels.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Modelos Disponíveis</CardTitle>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar modelos..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Selecione quais modelos devem estar disponíveis:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {filteredModels
                    .filter(model => !savedModels.some(saved => saved.id === model.id))
                    .map((model) => (
                      <div key={model.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent/50">
                        <Checkbox
                          id={`model-${model.id}`}
                          checked={enabledModels.includes(model.id)}
                          onCheckedChange={() => handleModelToggle(model.id)}
                        />
                        <Label
                          htmlFor={`model-${model.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {model.name}
                        </Label>
                      </div>
                    ))}
                  {filteredModels.length === 0 && (
                    <div className="col-span-2 text-center py-4 text-muted-foreground">
                      Nenhum modelo encontrado para "{searchQuery}"
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
          </>
        )}
        
        <Button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim() || isInitialLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
