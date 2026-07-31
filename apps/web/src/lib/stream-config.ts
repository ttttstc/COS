interface StreamConfigInput {
  apiUrl?: string | null;
  assistantId?: string | null;
  envApiUrl?: string;
  envAssistantId?: string;
  production: boolean;
}

export function resolveStreamConfig({
  apiUrl,
  assistantId,
  envApiUrl,
  envAssistantId,
  production,
}: StreamConfigInput) {
  if (production) {
    return {
      apiUrl: "/api",
      assistantId: envAssistantId || "lyl_counsel_agent",
    };
  }

  return {
    apiUrl: apiUrl || envApiUrl || undefined,
    assistantId: assistantId || envAssistantId || undefined,
  };
}
export function resolveApiUrl(apiUrl: string | undefined, origin?: string) {
  if (!apiUrl || !apiUrl.startsWith("/") || !origin) return apiUrl;
  return new URL(apiUrl, origin).toString().replace(/\/$/, "");
}
