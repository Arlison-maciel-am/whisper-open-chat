
import { Message, Model } from "../types/chat";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const fetchModels = async (apiKey: string): Promise<Model[]> => {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Whisper Open Chat"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      maxTokens: model.context_length || 4096
    }));
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
};

export const streamCompletion = async (
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk: (chunk: string) => void,
  onError: (error: any) => void,
  onFinish: () => void
) => {
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Whisper Open Chat"
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        onFinish();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk
        .split("\n")
        .filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              onChunk(content);
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
    }
  } catch (error) {
    onError(error);
    throw error;
  }
};
