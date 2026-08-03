"use client";

import { LylMark } from "@/components/icons/lyl";
import {
  ArrowRight,
  CaretLeft,
  LYL_ICON_MAP,
} from "@/components/icons/lyl-icons";
import { GlassThick, StarGridBackground } from "@/components/clauseos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";

export interface ConnectionSettingsValues {
  apiKey: string;
  apiUrl: string;
  assistantId: string;
}

export function ConnectionHome({ onEnter }: { onEnter(): void }) {
  return (
    <main className="cos-stream-home">
      <div
        className="cos-stream-home__media"
        aria-hidden="true"
      />
      <div
        className="cos-stream-home__atmosphere"
        aria-hidden="true"
      />
      <div
        className="cos-stream-home__veil"
        aria-hidden="true"
      />

      <header className="cos-stream-home__header">
        <LylMark className="cos-stream-home__mark" />
      </header>

      <section
        className="cos-stream-home__intro"
        aria-labelledby="cos-stream-home-title"
      >
        <h1 id="cos-stream-home-title">刘亚楼参谋台</h1>
        <p>
          拆解复杂议题、调研关键事实、权衡多方约束，并给出清晰可执行的决策建议。
        </p>
        <Button
          className="cos-stream-home__enter"
          type="button"
          variant="outline"
          size="lg"
          onClick={onEnter}
        >
          进入参谋台
          <ArrowRight aria-hidden="true" />
        </Button>
      </section>
    </main>
  );
}

export function ConnectionSettings({
  defaultValues,
  isAgentBuilder,
  onAgentBuilderChange,
  onBack,
  onSubmit,
}: {
  defaultValues: ConnectionSettingsValues;
  isAgentBuilder: boolean;
  onAgentBuilderChange(value: boolean): void;
  onBack(): void;
  onSubmit(values: ConnectionSettingsValues): void;
}) {
  return (
    <StarGridBackground className="cos-stream-setup cos-stream-settings">
      <main className="cos-stream-setup__main">
        <GlassThick
          className="cos-stream-setup__panel"
          optics="palette"
          prismCorners={["top-right", "bottom-right"]}
          sweep="dual"
        >
          <header className="cos-stream-settings__header">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
            >
              <CaretLeft aria-hidden="true" />
              返回
            </Button>
            <div>
              <span
                className="cos-stream-settings__icon"
                aria-hidden="true"
              >
                <LYL_ICON_MAP.settings />
              </span>
              <div>
                <h1>连接设置</h1>
                <p>配置参谋服务与开发部署鉴权。</p>
              </div>
            </div>
          </header>

          <form
            className="cos-stream-settings__form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              onSubmit({
                apiUrl: String(formData.get("apiUrl") ?? "").trim(),
                assistantId: String(formData.get("assistantId") ?? "").trim(),
                apiKey: String(formData.get("apiKey") ?? "").trim(),
              });
            }}
          >
            <div className="cos-stream-settings__field">
              <Label htmlFor="apiUrl">
                服务地址<span className="text-rose-500">*</span>
              </Label>
              <p id="api-url-description">
                本地 LangGraph 服务或开发部署地址。
              </p>
              <Input
                id="apiUrl"
                name="apiUrl"
                aria-describedby="api-url-description"
                defaultValue={defaultValues.apiUrl}
                required
              />
            </div>

            <div className="cos-stream-settings__field">
              <Label htmlFor="assistantId">
                Agent ID<span className="text-rose-500">*</span>
              </Label>
              <p id="assistant-id-description">
                用于读取历史议题并发起运行的 Graph 或 Assistant 标识。
              </p>
              <Input
                id="assistantId"
                name="assistantId"
                aria-describedby="assistant-id-description"
                defaultValue={defaultValues.assistantId}
                required
              />
            </div>

            <div className="cos-stream-settings__field">
              <Label htmlFor="apiKey">开发 API Key</Label>
              <p id="api-key-description">
                本地服务不需要；此值仅保存在当前浏览器。
              </p>
              <PasswordInput
                id="apiKey"
                name="apiKey"
                aria-describedby="api-key-description"
                defaultValue={defaultValues.apiKey}
                placeholder="lsv2_pt_..."
              />
            </div>

            <div className="cos-stream-settings__switch">
              <div>
                <Label htmlFor="agentBuilderEnabled">Agent Builder 部署</Label>
                <p>仅在使用 Agent Builder 部署时开启。</p>
              </div>
              <Switch
                id="agentBuilderEnabled"
                checked={isAgentBuilder}
                onCheckedChange={onAgentBuilderChange}
              />
            </div>

            <footer className="cos-stream-settings__footer">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
              >
                取消
              </Button>
              <Button type="submit">保存设置</Button>
            </footer>
          </form>
        </GlassThick>
      </main>
    </StarGridBackground>
  );
}
