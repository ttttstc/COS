import { IssueModeCard } from "@/components/clauseos";
import { COUNSEL_MODES, type ActiveCounselMode } from "@/lib/counsel-mode";

export function CounselWelcome({
  onSelectMode,
}: {
  onSelectMode: (mode: ActiveCounselMode) => void;
}) {
  return (
    <section
      aria-labelledby="counsel-welcome-title"
      className="cos-thread-welcome"
    >
      <div className="cos-thread-welcome__heading">
        <span>LYL · CLAUSEOS</span>
        <h1 id="counsel-welcome-title">今天需要我帮你判断什么？</h1>
        <p>选择模式只是确定思考协议，你仍可用自然语言描述任何议题。</p>
      </div>
      <div className="cos-thread-welcome__modes">
        {COUNSEL_MODES.map(({ mode, label, description }) => (
          <IssueModeCard
            key={mode}
            mode={mode}
            title={label}
            description={description}
            onSelect={onSelectMode}
          />
        ))}
      </div>
    </section>
  );
}
