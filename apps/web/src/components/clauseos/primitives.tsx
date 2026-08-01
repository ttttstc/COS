import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type GlassLevel = "clear" | "thin" | "regular" | "thick";
export type PrismCorner = "top-right" | "bottom-right";
export type GlassSweep = "none" | "top-left" | "bottom-right-arc" | "dual";
export type GlassOptics =
  | "minimal"
  | "control"
  | "row"
  | "popover"
  | "panel"
  | "palette"
  | "shell"
  | "table";

export const AmbientWhiteWash = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("lyl-ambient-white-wash", className)}
    {...props}
    aria-hidden="true"
  />
));
AmbientWhiteWash.displayName = "AmbientWhiteWash";

interface StarGridBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  ambient?: boolean;
  contentClassName?: string;
}

export const StarGridBackground = forwardRef<
  HTMLDivElement,
  StarGridBackgroundProps
>(
  (
    { ambient = true, children, className, contentClassName, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("lyl-star-grid", className)}
      {...props}
    >
      {ambient && <AmbientWhiteWash />}
      <div className={cn("lyl-star-grid__content", contentClassName)}>
        {children}
      </div>
    </div>
  ),
);
StarGridBackground.displayName = "StarGridBackground";

export const SilverPhysicalEdge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("lyl-silver-physical-edge", className)}
    {...props}
    aria-hidden="true"
  />
));
SilverPhysicalEdge.displayName = "SilverPhysicalEdge";

interface EdgeWhiteSweepProps extends HTMLAttributes<HTMLSpanElement> {
  edge?: "top" | "right" | "bottom" | "left";
}

export const EdgeWhiteSweep = forwardRef<HTMLSpanElement, EdgeWhiteSweepProps>(
  ({ edge = "top", className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("lyl-edge-white-sweep", className)}
      data-edge={edge}
      {...props}
      aria-hidden="true"
    />
  ),
);
EdgeWhiteSweep.displayName = "EdgeWhiteSweep";

interface PrismCornerLightProps extends HTMLAttributes<HTMLSpanElement> {
  corner?: PrismCorner;
}

export const PrismCornerLight = forwardRef<
  HTMLSpanElement,
  PrismCornerLightProps
>(({ corner = "top-right", className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("lyl-prism-corner-light", className)}
    data-corner={corner}
    {...props}
    aria-hidden="true"
  />
));
PrismCornerLight.displayName = "PrismCornerLight";

interface GlassCausticRefractionProps extends HTMLAttributes<HTMLSpanElement> {
  sweep?: GlassSweep;
}

export const GlassCausticRefraction = forwardRef<
  HTMLSpanElement,
  GlassCausticRefractionProps
>(({ sweep = "dual", className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("lyl-glass-caustic", className)}
    data-sweep={sweep}
    {...props}
    aria-hidden="true"
  />
));
GlassCausticRefraction.displayName = "GlassCausticRefraction";

export interface GlassSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  decorated?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  level?: GlassLevel;
  optics?: GlassOptics;
  prismCorner?: PrismCorner;
  prismCorners?: PrismCorner[];
  sweep?: GlassSweep;
}

export const GlassSurface = forwardRef<HTMLDivElement, GlassSurfaceProps>(
  (
    {
      active = false,
      children,
      className,
      decorated = false,
      disabled = false,
      interactive = false,
      level = "regular",
      optics = "panel",
      prismCorner = "top-right",
      prismCorners,
      sweep = "top-left",
      ...props
    },
    ref,
  ) => {
    const resolvedPrismCorners = prismCorners ?? [prismCorner];

    return (
      <div
        ref={ref}
        className={cn("lyl-glass-surface", className)}
        data-active={active || undefined}
        data-disabled={disabled || undefined}
        data-interactive={interactive || undefined}
        data-level={level}
        data-optics={optics}
        {...props}
      >
        {decorated && (
          <>
            <SilverPhysicalEdge />
            <GlassCausticRefraction sweep={sweep} />
            <EdgeWhiteSweep />
            <EdgeWhiteSweep edge="left" />
            {resolvedPrismCorners.map((corner) => (
              <PrismCornerLight
                key={corner}
                corner={corner}
              />
            ))}
          </>
        )}
        <div className="lyl-glass-surface__content">{children}</div>
      </div>
    );
  },
);
GlassSurface.displayName = "GlassSurface";

type FixedGlassSurfaceProps = Omit<GlassSurfaceProps, "level">;

export const GlassClear = forwardRef<HTMLDivElement, FixedGlassSurfaceProps>(
  (props, ref) => (
    <GlassSurface
      ref={ref}
      level="clear"
      {...props}
      decorated={props.decorated ?? true}
    />
  ),
);
GlassClear.displayName = "GlassClear";

export const GlassThin = forwardRef<HTMLDivElement, FixedGlassSurfaceProps>(
  (props, ref) => (
    <GlassSurface
      ref={ref}
      level="thin"
      {...props}
      decorated={props.decorated ?? true}
    />
  ),
);
GlassThin.displayName = "GlassThin";

export const GlassRegular = forwardRef<HTMLDivElement, FixedGlassSurfaceProps>(
  (props, ref) => (
    <GlassSurface
      ref={ref}
      level="regular"
      {...props}
      decorated={props.decorated ?? true}
    />
  ),
);
GlassRegular.displayName = "GlassRegular";

export const GlassThick = forwardRef<HTMLDivElement, FixedGlassSurfaceProps>(
  (props, ref) => (
    <GlassSurface
      ref={ref}
      level="thick"
      {...props}
      decorated={props.decorated ?? true}
    />
  ),
);
GlassThick.displayName = "GlassThick";

interface ContentSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
}

export const ContentSurface = forwardRef<HTMLDivElement, ContentSurfaceProps>(
  ({ raised = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("lyl-content-surface", className)}
      data-raised={raised || undefined}
      {...props}
    />
  ),
);
ContentSurface.displayName = "ContentSurface";

interface FocusRingProps extends HTMLAttributes<HTMLSpanElement> {
  visible?: boolean;
}

export const FocusRing = forwardRef<HTMLSpanElement, FocusRingProps>(
  ({ visible = false, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("lyl-focus-ring", className)}
      data-visible={visible || undefined}
      {...props}
    />
  ),
);
FocusRing.displayName = "FocusRing";

export type StatusDotStatus =
  | "neutral"
  | "running"
  | "success"
  | "warning"
  | "waiting"
  | "danger"
  | "failed"
  | "info"
  | "disabled";

const DEFAULT_STATUS_LABELS: Record<StatusDotStatus, string> = {
  neutral: "未开始",
  running: "进行中",
  success: "已完成",
  warning: "需要注意",
  waiting: "等待用户",
  danger: "危险",
  failed: "处理失败",
  info: "信息",
  disabled: "不可用",
};

interface StatusDotProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "aria-label"
> {
  label?: string;
  live?: "off" | "polite";
  showLabel?: boolean;
  status?: StatusDotStatus;
}

export const StatusDot = forwardRef<HTMLSpanElement, StatusDotProps>(
  (
    {
      className,
      label,
      live = "off",
      showLabel = false,
      status = "neutral",
      ...props
    },
    ref,
  ) => {
    const statusLabel = label ?? DEFAULT_STATUS_LABELS[status];

    return (
      <span
        ref={ref}
        className={cn("lyl-status-indicator", className)}
        aria-live={live}
        {...props}
      >
        <span
          className="lyl-status-dot"
          data-status={status}
          aria-hidden="true"
        />
        <span className={showLabel ? undefined : "lyl-visually-hidden"}>
          {statusLabel}
        </span>
      </span>
    );
  },
);
StatusDot.displayName = "StatusDot";

interface DesktopOnlyGuardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "title"
> {
  children: ReactNode;
  contentClassName?: string;
  description?: ReactNode;
  title?: ReactNode;
}

export const DesktopOnlyGuard = forwardRef<
  HTMLDivElement,
  DesktopOnlyGuardProps
>(
  (
    {
      children,
      className,
      contentClassName,
      description = "请使用宽度至少为 1024px 的桌面浏览器访问。",
      title = "第一版仅支持桌面端",
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("lyl-desktop-only-guard", className)}
      {...props}
    >
      <div
        className="lyl-desktop-only-guard__notice"
        role="status"
      >
        <ContentSurface
          raised
          className="lyl-desktop-only-guard__card"
        >
          <h1 className="lyl-desktop-only-guard__title">{title}</h1>
          <p className="lyl-desktop-only-guard__description">{description}</p>
        </ContentSurface>
      </div>
      <div className={cn("lyl-desktop-only-guard__content", contentClassName)}>
        {children}
      </div>
    </div>
  ),
);
DesktopOnlyGuard.displayName = "DesktopOnlyGuard";

interface SplitHandleProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onKeyDown"
> {
  disabled?: boolean;
  dragging?: boolean;
  label?: string;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  onStep?: (delta: -1 | 1) => void;
  orientation?: "horizontal" | "vertical";
  valueMax?: number;
  valueMin?: number;
  valueNow?: number;
}

export const SplitHandle = forwardRef<HTMLDivElement, SplitHandleProps>(
  (
    {
      className,
      disabled = false,
      dragging = false,
      label = "调整面板宽度",
      onKeyDown,
      onStep,
      orientation = "vertical",
      tabIndex,
      valueMax,
      valueMin,
      valueNow,
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled || !onStep) return;

      const previousKey = orientation === "vertical" ? "ArrowLeft" : "ArrowUp";
      const nextKey = orientation === "vertical" ? "ArrowRight" : "ArrowDown";

      if (event.key === previousKey || event.key === nextKey) {
        event.preventDefault();
        onStep(event.key === previousKey ? -1 : 1);
      }
    };

    return (
      <div
        ref={ref}
        role="separator"
        className={cn("lyl-split-handle", className)}
        data-state={dragging ? "dragging" : "idle"}
        aria-disabled={disabled}
        aria-label={label}
        aria-orientation={orientation}
        aria-valuemax={valueMax}
        aria-valuemin={valueMin}
        aria-valuenow={valueNow}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
SplitHandle.displayName = "SplitHandle";

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  orientation?: "both" | "horizontal" | "vertical";
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    {
      className,
      label = "可滚动内容",
      orientation = "vertical",
      tabIndex,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="region"
      className={cn("lyl-scroll-area", className)}
      data-orientation={orientation}
      aria-label={label}
      tabIndex={tabIndex ?? 0}
      {...props}
    />
  ),
);
ScrollArea.displayName = "ScrollArea";
