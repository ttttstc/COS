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
import { useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LylMark } from "@/components/icons/lyl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowRight } from "@/components/icons/lyl-icons";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiKey } from "@/lib/api-key";
import { useThreads } from "./Thread";
import { toast } from "sonner";
import { type CounselMode } from "@/lib/counsel-mode";
import { resolveApiUrl, resolveStreamConfig } from "@/lib/stream-config";
import type { CounselState } from "@/lib/counsel-state";
import {
  GlassThick,
  StarGridBackground,
} from "@/components/clauseos/primitives";

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

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkGraphStatus(
  apiUrl: string,
  apiKey: string | null,
  authScheme?: string,
): Promise<boolean> {
  try {
    const headers = new Headers();
    if (apiKey) headers.set("X-Api-Key", apiKey);
    if (authScheme) headers.set("X-Auth-Scheme", authScheme);

    const res = await fetch(`${apiUrl}/info`, {
      headers,
    });

    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
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

  // Show the form if we: don't have an API URL, or don't have an assistant ID
  if (!finalApiUrl || !finalAssistantId) {
    return (
      <StarGridBackground className="cos-stream-setup">
        <main className="cos-stream-setup__main">
          <GlassThick
            className="cos-stream-setup__panel animate-in fade-in-0 zoom-in-95"
            optics="palette"
            prismCorners={["top-right", "bottom-right"]}
            sweep="dual"
          >
            <div className="mt-14 flex flex-col gap-2 border-b p-6">
              <div className="flex flex-col items-start gap-2">
                <LylMark />
                <h1 className="text-xl font-semibold tracking-tight">
                  刘亚楼参谋台
                </h1>
              </div>
              <p className="text-muted-foreground">
                配置本地开发使用的参谋服务地址与 Agent ID。
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();

                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const apiUrl = formData.get("apiUrl") as string;
                const assistantId = formData.get("assistantId") as string;
                const apiKey = formData.get("apiKey") as string;

                setApiUrl(apiUrl);
                setApiKey(apiKey);
                setAssistantId(assistantId);
                setAuthScheme(isAgentBuilder ? AGENT_BUILDER_AUTH_SCHEME : "");

                form.reset();
              }}
              className="bg-muted/50 flex flex-col gap-6 p-6"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="apiUrl">
                  服务地址<span className="text-rose-500">*</span>
                </Label>
                <p className="text-muted-foreground text-sm">
                  本地 LangGraph 服务或开发部署地址。
                </p>
                <Input
                  id="apiUrl"
                  name="apiUrl"
                  className="bg-background"
                  defaultValue={apiUrl || DEFAULT_API_URL}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="assistantId">
                  Agent ID<span className="text-rose-500">*</span>
                </Label>
                <p className="text-muted-foreground text-sm">
                  用于读取历史议题并发起运行的 Graph 或 Assistant 标识。
                </p>
                <Input
                  id="assistantId"
                  name="assistantId"
                  className="bg-background"
                  defaultValue={assistantId || DEFAULT_ASSISTANT_ID}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="apiKey">开发 API Key</Label>
                <p className="text-muted-foreground text-sm">
                  本地服务不需要。此值仅保存在浏览器本地，用于开发部署鉴权。
                </p>
                <PasswordInput
                  id="apiKey"
                  name="apiKey"
                  defaultValue={apiKey ?? ""}
                  className="bg-background"
                  placeholder="lsv2_pt_..."
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="agentBuilderEnabled">
                      Agent Builder 部署
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      仅在使用 Agent Builder 部署时开启。
                    </p>
                  </div>
                  <Switch
                    id="agentBuilderEnabled"
                    checked={isAgentBuilder}
                    onCheckedChange={setIsAgentBuilder}
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                >
                  进入参谋台
                  <ArrowRight className="size-5" />
                </Button>
              </div>
            </form>
          </GlassThick>
        </main>
      </StarGridBackground>
    );
  }

  const streamApiUrl =
    resolveApiUrl(
      finalApiUrl,
      typeof window === "undefined" ? undefined : window.location.origin,
    ) ?? finalApiUrl;

  return (
    <StreamSession
      apiKey={production ? null : apiKey}
      apiUrl={streamApiUrl}
      assistantId={finalAssistantId}
      authScheme={finalAuthScheme || undefined}
    >
      {children}
    </StreamSession>
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

export default StreamContext;
