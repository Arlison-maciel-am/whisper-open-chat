
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
  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  // Load settings on component mount
  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      // Fetch API key from database
      if (user) {
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
        }
      }
      
      await fetchEnabledModels();
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Fetch enabled models from database
  const fetchEnabledModels = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('available_models')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // If we have models in the database, use those
        const dbModels = data.map(model => ({
          id: model.model_id,
          name: model.name,
          maxTokens: model.max_tokens
        }));
        
        setAllModels(dbModels);
        // Set only those that are marked as enabled in DB
        setEnabledModels(data.filter(model => model.enabled).map(model => model.model_id));
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
      setAllModels(models);
      // Initialize all models as disabled (not selected)
      setEnabledModels([]);
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
      // Save API key to database
      const { error: apiKeyError } = await supabase
        .from('api_settings')
        .upsert({ 
          user_id: user.id, 
          api_key: apiKey,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (apiKeyError) throw apiKeyError;
      
      // Delete all existing models
      await supabase
        .from('available_models')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      // Then insert all models with their enabled status
      if (allModels.length > 0) {
        for (const model of allModels) {
          const { error: modelError } = await supabase
            .from('available_models')
            .insert({
              model_id: model.id,
              name: model.name,
              max_tokens: model.maxTokens,
              enabled: enabledModels.includes(model.id)
            });
          
          if (modelError) {
            console.error("Error inserting model:", modelError);
            throw modelError;
          }
        }
      }
      
      toast.success("Configurações salvas com sucesso");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Falha ao salvar configurações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelToggle = (modelId: string) => {
    setEnabledModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
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
                  {filteredModels.map((model) => (
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
        
        <Button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim()}
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
