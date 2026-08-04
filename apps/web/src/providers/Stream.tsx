import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  uiMessageReducer,
  isUIMessage,
  isRemoveUIMessage,
  type UIMessage,
  type RemoveUIMessage,
} from "@langchain/langgraph-sdk/react-ui";
import { parseAsBoolean, useQueryState } from "nuqs";
import { getApiKey } from "@/lib/api-key";
import { useThreads } from "./Thread";
import { toast } from "sonner";
import { type CounselMode } from "@/lib/counsel-mode";
import { resolveApiUrl, resolveStreamConfig } from "@/lib/stream-config";
import { checkGraphStatus } from "@/lib/graph-status";
import type { CounselState } from "@/lib/counsel-state";
import {
  ConnectionHome,
  ConnectionSettings,
  type ConnectionSettingsValues,
} from "@/components/stream/connection-setup";

export type StateType = CounselState;

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
    };
    ConfigurableType: Record<string, unknown> & { mode: CounselMode };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);
const StreamSettingsContext = createContext<
  { openSettings(): void } | undefined
>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const StreamSession = ({
  children,
  apiKey,
  apiUrl,
  assistantId,
  authScheme,
}: {
  children: ReactNode;
  apiKey: string | null;
  apiUrl: string;
  assistantId: string;
  authScheme?: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();
  const streamValue = useTypedStream({
    apiUrl,
    apiKey: apiKey ?? undefined,
    assistantId,
    ...(authScheme && {
      defaultHeaders: {
        "X-Auth-Scheme": authScheme,
      },
    }),
    threadId: threadId ?? null,
    fetchStateHistory: true,
    reconnectOnMount: true,
    onCustomEvent: (event, options) => {
      if (isUIMessage(event) || isRemoveUIMessage(event)) {
        options.mutate((prev) => {
          const ui = uiMessageReducer(prev.ui ?? [], event);
          return { ...prev, ui };
        });
      }
    },
    onThreadId: (id) => {
      setThreadId(id);
      // Refetch threads list when thread ID changes.
      // Wait for some seconds before fetching so we're able to get the new thread that was created.
      sleep().then(() => getThreads().then(setThreads).catch(console.error));
    },
    onFinish: () => {
      getThreads().then(setThreads).catch(console.error);
    },
  });

  useEffect(() => {
    checkGraphStatus(apiUrl, apiKey, authScheme).then((ok) => {
      if (!ok) {
        toast.error("无法连接参谋服务", {
          description: () => (
            <p>
              请确认参谋服务已在 <code>{apiUrl}</code> 启动，并检查服务端配置。
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [apiKey, apiUrl, authScheme]);

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

// Default values for the form
const DEFAULT_API_URL = "http://localhost:2024";
const DEFAULT_ASSISTANT_ID = "lyl_counsel_agent";
const AGENT_BUILDER_AUTH_SCHEME = "langsmith-api-key";

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [threadId] = useQueryState("threadId");
  const [showHome, setShowHome] = useQueryState(
    "home",
    parseAsBoolean.withDefault(true),
  );
  // Get environment variables
  const envApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;
  const envAuthScheme: string | undefined = process.env.NEXT_PUBLIC_AUTH_SCHEME;

  // Use URL params with env var fallbacks
  const [apiUrl, setApiUrl] = useQueryState("apiUrl", {
    defaultValue: envApiUrl || "",
  });
  const [assistantId, setAssistantId] = useQueryState("assistantId", {
    defaultValue: envAssistantId || "",
  });
  const [authScheme, setAuthScheme] = useQueryState("authScheme", {
    defaultValue: envAuthScheme || "",
  });
  const [settingsOpen, setSettingsOpen] = useQueryState(
    "settings",
    parseAsBoolean.withDefault(false),
  );
  const [isAgentBuilder, setIsAgentBuilder] = useState(
    () =>
      (authScheme || envAuthScheme || "").toLowerCase() ===
      AGENT_BUILDER_AUTH_SCHEME,
  );

  // For API key, use localStorage with env var fallback
  const [apiKey, _setApiKey] = useState(() => {
    const storedKey = getApiKey();
    return storedKey || "";
  });

  const setApiKey = (key: string) => {
    window.localStorage.setItem("lg:chat:apiKey", key);
    _setApiKey(key);
  };

  const production = process.env.NODE_ENV === "production";
  const { apiUrl: finalApiUrl, assistantId: finalAssistantId } =
    resolveStreamConfig({
      apiUrl,
      assistantId,
      envApiUrl,
      envAssistantId,
      production,
    });
  const finalAuthScheme = production
    ? envAuthScheme || ""
    : authScheme || envAuthScheme || "";

  const openSettings = () => {
    void setSettingsOpen(true);
  };

  const closeSettings = () => {
    void setSettingsOpen(false);
  };

  const showConnectionHome = !threadId && showHome;

  const saveConnectionSettings = (values: ConnectionSettingsValues) => {
    void setApiUrl(values.apiUrl);
    setApiKey(values.apiKey);
    void setAssistantId(values.assistantId);
    void setAuthScheme(isAgentBuilder ? AGENT_BUILDER_AUTH_SCHEME : "");
    closeSettings();
  };

  if (settingsOpen) {
    return (
      <StreamSettingsContext.Provider value={{ openSettings }}>
        <ConnectionSettings
          defaultValues={{
            apiUrl: apiUrl || envApiUrl || DEFAULT_API_URL,
            assistantId: assistantId || envAssistantId || DEFAULT_ASSISTANT_ID,
            apiKey,
          }}
          isAgentBuilder={isAgentBuilder}
          onAgentBuilderChange={setIsAgentBuilder}
          onBack={closeSettings}
          onSubmit={saveConnectionSettings}
        />
      </StreamSettingsContext.Provider>
    );
  }

  // Keep first-run configuration behind a settings entry so the home remains focused.
  if (!finalApiUrl || !finalAssistantId) {
    return (
      <StreamSettingsContext.Provider value={{ openSettings }}>
        <ConnectionHome
          onEnter={() => {
            void setShowHome(false);
            void setApiUrl(apiUrl || envApiUrl || DEFAULT_API_URL);
            void setAssistantId(
              assistantId || envAssistantId || DEFAULT_ASSISTANT_ID,
            );
          }}
        />
      </StreamSettingsContext.Provider>
    );
  }

  if (showConnectionHome) {
    return (
      <StreamSettingsContext.Provider value={{ openSettings }}>
        <ConnectionHome onEnter={() => void setShowHome(false)} />
      </StreamSettingsContext.Provider>
    );
  }

  const streamApiUrl =
    resolveApiUrl(
      finalApiUrl,
      typeof window === "undefined" ? undefined : window.location.origin,
    ) ?? finalApiUrl;

  return (
    <StreamSettingsContext.Provider value={{ openSettings }}>
      <StreamSession
        apiKey={production ? null : apiKey}
        apiUrl={streamApiUrl}
        assistantId={finalAssistantId}
        authScheme={finalAuthScheme || undefined}
      >
        {children}
      </StreamSession>
    </StreamSettingsContext.Provider>
  );
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export const useStreamSettings = () => {
  const context = useContext(StreamSettingsContext);
  if (context === undefined) {
    throw new Error("useStreamSettings must be used within StreamProvider");
  }
  return context;
};

export default StreamContext;
