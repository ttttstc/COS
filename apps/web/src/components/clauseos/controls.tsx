"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  ArrowUp,
  CaretDown,
  Check,
  CheckCircle,
  CircleNotch,
  File,
  Info,
  MagnifyingGlass,
  Minus,
  Paperclip,
  Warning,
  WarningCircle,
  WarningOctagon,
  X,
} from "@phosphor-icons/react";
import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import {
  GlassSurface,
  StatusDot,
  type GlassSweep,
  type StatusDotStatus,
} from "./primitives";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "danger" | "text";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "cos-button",
        `cos-button--${variant}`,
        `cos-button--${size}`,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <CircleNotch
          className="cos-button__spinner"
          aria-hidden="true"
        />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
      {!loading && trailingIcon}
    </button>
  );
}

export interface IconButtonProps extends Omit<
  ButtonProps,
  "leadingIcon" | "trailingIcon"
> {
  label: string;
  shape?: "circle" | "square";
}

export function IconButton({
  label,
  shape = "circle",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      className={cn("cos-icon-button", `cos-icon-button--${shape}`, className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export interface SplitButtonItem {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect(): void;
}

export function SplitButton({
  label,
  onClick,
  items,
  disabled,
}: {
  label: string;
  onClick(): void;
  items: SplitButtonItem[];
  disabled?: boolean;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (disabled && menuRef.current) menuRef.current.open = false;
  }, [disabled]);

  return (
    <div className="cos-split-button">
      <Button
        variant="primary"
        onClick={onClick}
        disabled={disabled}
      >
        {label}
      </Button>
      <details
        ref={menuRef}
        className="cos-split-button__menu"
        onToggle={() => {
          if (disabled && menuRef.current) menuRef.current.open = false;
          if (menuRef.current?.open) {
            menuRef.current
              .querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
              ?.focus();
          }
        }}
      >
        <summary
          aria-label={`${label}的更多操作`}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : undefined}
          onClick={(event) => {
            if (disabled) event.preventDefault();
          }}
        >
          <CaretDown aria-hidden="true" />
        </summary>
        <GlassSurface
          level="regular"
          optics="popover"
          prismCorners={["bottom-right"]}
          className="cos-menu"
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              disabled={disabled || item.disabled}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          ))}
        </GlassSurface>
      </details>
    </div>
  );
}

export interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  success?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  hint,
  error,
  success,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <label className={cn("cos-field", className)}>
      <span className="cos-field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      {children}
      <ValidationHint
        error={error}
        success={success}
        hint={hint}
      />
    </label>
  );
}

export function ValidationHint({
  hint,
  error,
  success,
}: {
  hint?: string;
  error?: string;
  success?: string;
}) {
  const message = error ?? success ?? hint;
  if (!message) return null;
  const state = error ? "error" : success ? "success" : "hint";
  return (
    <span
      className={`cos-validation cos-validation--${state}`}
      role={error ? "alert" : undefined}
    >
      {error ? (
        <WarningCircle aria-hidden="true" />
      ) : success ? (
        <CheckCircle aria-hidden="true" />
      ) : (
        <Info aria-hidden="true" />
      )}
      {message}
    </span>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn("cos-input", className)}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn("cos-textarea", className)}
      {...props}
    />
  );
});

export function SearchInput({
  shortcut,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { shortcut?: string }) {
  return (
    <span className="cos-search-input">
      <MagnifyingGlass
        className="cos-search-input__icon"
        aria-hidden="true"
      />
      <Input
        type="search"
        className={className}
        {...props}
      />
      {shortcut && (
        <Keycap className="cos-search-input__key">{shortcut}</Keycap>
      )}
    </span>
  );
}

export function Checkbox({
  label,
  description,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: boolean;
}) {
  return (
    <label className={cn("cos-choice", error && "cos-choice--error")}>
      <input
        type="checkbox"
        aria-invalid={error || undefined}
        {...props}
      />
      <span
        className="cos-choice__indicator"
        aria-hidden="true"
      >
        <Check />
      </span>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export function Radio({
  label,
  description,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
  error?: boolean;
}) {
  return (
    <label className={cn("cos-choice", error && "cos-choice--error")}>
      <input
        type="radio"
        aria-invalid={error || undefined}
        {...props}
      />
      <span
        className="cos-choice__indicator cos-choice__indicator--radio"
        aria-hidden="true"
      />
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  label: string;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  error,
  success,
  className,
}: SwitchProps) {
  return (
    <label className={cn("cos-switch-row", className)}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <button
        type="button"
        role="switch"
        className="cos-switch"
        aria-checked={checked}
        aria-label={label}
        aria-invalid={error || undefined}
        data-success={success || undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  loading?: boolean;
}

export function Select({
  options,
  className,
  loading = false,
  disabled,
  ...props
}: SelectProps) {
  return (
    <span
      className="cos-select-wrap"
      data-loading={loading || undefined}
    >
      <select
        {...props}
        className={cn("cos-select", className)}
        disabled={disabled || loading}
        aria-busy={loading || props["aria-busy"] || undefined}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {loading ? (
        <CircleNotch
          className="cos-control-spinner"
          aria-hidden="true"
        />
      ) : (
        <CaretDown aria-hidden="true" />
      )}
      {loading && (
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          正在加载选项
        </span>
      )}
    </span>
  );
}

export interface ComboboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  options: SelectOption[];
  label: string;
  loading?: boolean;
}

export function Combobox({
  options,
  label,
  loading = false,
  disabled,
  onFocus,
  onBlur,
  onInput,
  onKeyDown,
  ...props
}: ComboboxProps) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const canExpand =
    !disabled && !loading && options.some((option) => !option.disabled);
  return (
    <span
      className="cos-combobox"
      data-loading={loading || undefined}
    >
      <Input
        {...props}
        list={listId}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={expanded && canExpand}
        aria-haspopup="listbox"
        aria-busy={loading || props["aria-busy"] || undefined}
        disabled={disabled || loading}
        onFocus={(event) => {
          setExpanded(canExpand);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setExpanded(false);
          onBlur?.(event);
        }}
        onInput={(event) => {
          setExpanded(canExpand);
          onInput?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setExpanded(false);
          onKeyDown?.(event);
        }}
      />
      {loading && (
        <CircleNotch
          className="cos-control-spinner"
          aria-hidden="true"
        />
      )}
      <datalist id={listId}>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </datalist>
      {loading && (
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          正在加载选项
        </span>
      )}
    </span>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  disabled,
  error,
  success,
  className,
}: {
  value: T;
  onValueChange(value: T): void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  label: string;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("cos-segmented", className)}
      role="group"
      aria-label={label}
      aria-invalid={error || undefined}
      data-success={success || undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onValueChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type StatusTone =
  "neutral" | "success" | "warning" | "error" | "info" | "disabled";

const STATUS_ICONS: Record<StatusTone, React.ReactNode> = {
  neutral: <Info aria-hidden="true" />,
  success: <CheckCircle aria-hidden="true" />,
  warning: <Warning aria-hidden="true" />,
  error: <WarningOctagon aria-hidden="true" />,
  info: <Info aria-hidden="true" />,
  disabled: <Info aria-hidden="true" />,
};

export function StatusBadge({
  tone = "neutral",
  children,
  icon = STATUS_ICONS[tone],
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("cos-badge", `cos-badge--${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

export type NotificationTone =
  "neutral" | "info" | "success" | "warning" | "error";

export interface NotificationDotProps extends Omit<
  React.HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  count?: number;
  label?: string;
  max?: number;
  tone?: NotificationTone;
}

export function NotificationDot({
  count,
  label,
  max = 99,
  tone = "error",
  className,
  ...props
}: NotificationDotProps) {
  const displayCount =
    count === undefined ? null : count > max ? `${max}+` : count;
  const accessibleLabel =
    label ?? (count === undefined ? "有新通知" : `${count} 条新通知`);

  return (
    <span
      className={cn("cos-notification-dot", className)}
      data-tone={tone}
      role="img"
      aria-label={accessibleLabel}
      {...props}
    >
      <span aria-hidden="true">{displayCount}</span>
    </span>
  );
}

export type Priority = "low" | "medium" | "high" | "critical";

const PRIORITY_META: Record<
  Priority,
  { icon: React.ReactNode; label: string }
> = {
  low: { icon: <ArrowDown aria-hidden="true" />, label: "低优先级" },
  medium: { icon: <Minus aria-hidden="true" />, label: "中优先级" },
  high: { icon: <ArrowUp aria-hidden="true" />, label: "高优先级" },
  critical: {
    icon: <WarningOctagon aria-hidden="true" />,
    label: "紧急优先级",
  },
};

export function PriorityLabel({
  priority,
  label,
  className,
}: {
  priority: Priority;
  label?: string;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn("cos-priority-label", className)}
      data-priority={priority}
    >
      {meta.icon}
      {label ?? meta.label}
    </span>
  );
}

export function FilterChip({
  active,
  removable,
  onRemove,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  removable?: boolean;
  onRemove?(): void;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?(): void;
}) {
  return (
    <span className={cn("cos-chip", active && "cos-chip--active")}>
      <button
        type="button"
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </button>
      {removable && (
        <button
          type="button"
          aria-label={`移除${String(children)}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <X aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export function CategoryTag({ children }: { children: React.ReactNode }) {
  return <span className="cos-category-tag">{children}</span>;
}

export function CountBadge({ children }: { children: React.ReactNode }) {
  return <span className="cos-count-badge">{children}</span>;
}

export function Keycap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <kbd className={cn("cos-keycap", className)}>{children}</kbd>;
}

export interface TimelineProps extends React.OlHTMLAttributes<HTMLOListElement> {
  label?: string;
}

export function Timeline({
  label = "时间线",
  className,
  children,
  ...props
}: TimelineProps) {
  return (
    <ol
      className={cn("cos-timeline", className)}
      aria-label={label}
      {...props}
    >
      {children}
    </ol>
  );
}

export interface TimelineItemProps extends Omit<
  React.LiHTMLAttributes<HTMLLIElement>,
  "title"
> {
  title: React.ReactNode;
  dateTime?: string;
  dateLabel?: React.ReactNode;
  status?: StatusDotStatus;
  statusLabel?: string;
}

export function TimelineItem({
  title,
  dateTime,
  dateLabel,
  status = "neutral",
  statusLabel,
  className,
  children,
  ...props
}: TimelineItemProps) {
  return (
    <li
      className={cn("cos-timeline__item", className)}
      data-status={status}
      {...props}
    >
      <StatusDot
        className="cos-timeline__marker"
        status={status}
        label={statusLabel}
      />
      <div className="cos-timeline__content">
        {(dateLabel || dateTime) && (
          <time dateTime={dateTime}>{dateLabel ?? dateTime}</time>
        )}
        <strong>{title}</strong>
        {children && <div>{children}</div>}
      </div>
    </li>
  );
}

export interface SourceLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  external?: boolean;
}

export function SourceLink({
  href,
  external = false,
  target,
  rel,
  className,
  children,
  ...props
}: SourceLinkProps) {
  const resolvedTarget = external ? "_blank" : target;
  const resolvedRel = resolvedTarget === "_blank" ? (rel ?? "noreferrer") : rel;
  return (
    <a
      className={cn("cos-source-link", className)}
      href={href}
      target={resolvedTarget}
      rel={resolvedRel}
      {...props}
    >
      <span>{children}</span>
      {external ? (
        <ArrowSquareOut aria-hidden="true" />
      ) : (
        <ArrowRight aria-hidden="true" />
      )}
    </a>
  );
}

export interface DividerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  label?: React.ReactNode;
  orientation?: "horizontal" | "vertical";
}

export function Divider({
  label,
  orientation = "horizontal",
  className,
  ...props
}: DividerProps) {
  return (
    <div
      className={cn("cos-divider", `cos-divider--${orientation}`, className)}
      role="separator"
      aria-orientation={orientation}
      {...props}
    >
      {label && <span>{label}</span>}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  panel: React.ReactNode;
  disabled?: boolean;
}

export function Tabs<T extends string>({
  value,
  onValueChange,
  items,
  label,
  className,
  error,
  success,
}: {
  value: T;
  onValueChange(value: T): void;
  items: TabItem<T>[];
  label: string;
  className?: string;
  error?: boolean;
  success?: boolean;
}) {
  const tabsId = useId();
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const enabledItems = items.filter((item) => !item.disabled);
  const selected = items.find((item) => item.id === value);
  const active =
    (selected && !selected.disabled ? selected : undefined) ??
    enabledItems[0] ??
    selected ??
    items[0];
  const focusableId =
    active && !active.disabled ? active.id : enabledItems[0]?.id;
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    if (enabledItems.length === 0) return;
    const index = enabledItems.findIndex(
      (item) => tabRefs.current.get(item.id) === event.currentTarget,
    );
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? enabledItems.length - 1
          : index < 0
            ? event.key === "ArrowRight"
              ? 0
              : enabledItems.length - 1
            : (index +
                (event.key === "ArrowRight" ? 1 : -1) +
                enabledItems.length) %
              enabledItems.length;
    const next = enabledItems[nextIndex];
    if (!next) return;
    onValueChange(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  return (
    <div
      className={cn("cos-tabs", className)}
      aria-invalid={error || undefined}
      data-success={success || undefined}
    >
      <div
        className="cos-tabs__list"
        role="tablist"
        aria-label={label}
      >
        {items.map((item) => (
          <button
            key={item.id}
            ref={(node) => {
              if (node) tabRefs.current.set(item.id, node);
              else tabRefs.current.delete(item.id);
            }}
            id={`${tabsId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={item.id === active?.id}
            aria-controls={`${tabsId}-panel-${item.id}`}
            tabIndex={item.id === focusableId ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.id)}
            onKeyDown={onKeyDown}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge}
          </button>
        ))}
      </div>
      {active && (
        <div
          id={`${tabsId}-panel-${active.id}`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${active.id}`}
          tabIndex={0}
          className="cos-tabs__panel"
        >
          {active.panel}
        </div>
      )}
    </div>
  );
}

export function Accordion({
  items,
}: {
  items: {
    id: string;
    title: string;
    content: React.ReactNode;
    open?: boolean;
  }[];
}) {
  return (
    <div className="cos-accordion">
      {items.map((item) => (
        <details
          key={item.id}
          open={item.open}
        >
          <summary>
            <span>{item.title}</span>
            <CaretDown aria-hidden="true" />
          </summary>
          <div>{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function Tooltip({
  label,
  title,
  side = "top",
  open = false,
  children,
}: {
  label: React.ReactNode;
  title?: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
  children: React.ReactElement;
}) {
  const id = useId();
  const child = isValidElement(children)
    ? cloneElement(
        children as React.ReactElement<{ "aria-describedby"?: string }>,
        {
          "aria-describedby": id,
        },
      )
    : children;
  return (
    <div
      className="cos-tooltip"
      data-side={side}
      data-open={open || undefined}
    >
      {child}
      <div
        id={id}
        role="tooltip"
        className="cos-tooltip__floating"
      >
        <GlassSurface
          level="regular"
          optics="popover"
          prismCorners={["bottom-right"]}
          className="cos-tooltip__content"
        >
          {title ? (
            <span className="cos-tooltip__copy">
              <strong>{title}</strong>
              <span>{label}</span>
            </span>
          ) : (
            label
          )}
        </GlassSurface>
        <span
          className="cos-tooltip__arrow"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export interface PopoverProps {
  label: React.ReactNode;
  children: React.ReactNode;
  ariaHasPopup?: React.AriaAttributes["aria-haspopup"];
  align?: "start" | "end";
  defaultOpen?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  sweep?: GlassSweep;
}

export function Popover({
  label,
  children,
  ariaHasPopup,
  align = "start",
  defaultOpen = false,
  disabled = false,
  loading = false,
  className,
  sweep = "top-left",
}: PopoverProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const blocked = disabled || loading;
  const skipInitialOpenFocusRef = useRef(defaultOpen && !blocked);

  return (
    <details
      ref={detailsRef}
      className={cn("cos-popover", `cos-popover--${align}`, className)}
      open={defaultOpen && !blocked}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      onToggle={(event) => {
        if (blocked) {
          event.currentTarget.open = false;
          return;
        }
        if (!event.currentTarget.open) {
          skipInitialOpenFocusRef.current = false;
          return;
        }
        if (skipInitialOpenFocusRef.current) {
          skipInitialOpenFocusRef.current = false;
          return;
        }
        if (event.currentTarget.open) {
          event.currentTarget
            .querySelector<HTMLElement>(
              '[role="menuitemradio"][aria-checked="true"]',
            )
            ?.focus();
        }
      }}
    >
      <summary
        aria-haspopup={ariaHasPopup}
        aria-disabled={blocked || undefined}
        tabIndex={blocked ? -1 : undefined}
        onClick={(event) => {
          if (blocked) event.preventDefault();
        }}
      >
        {label}
        {loading && (
          <CircleNotch
            className="cos-control-spinner"
            aria-hidden="true"
          />
        )}
        {loading && (
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            正在加载菜单
          </span>
        )}
      </summary>
      <GlassSurface
        level="regular"
        optics="popover"
        prismCorners={["bottom-right"]}
        sweep={sweep}
        className="cos-popover__content"
      >
        {children}
      </GlassSurface>
      <span
        className="cos-popover__arrow"
        aria-hidden="true"
      />
    </details>
  );
}

export function FilterPopover({ className, ...props }: PopoverProps) {
  return (
    <Popover
      className={cn("cos-filter-popover", className)}
      sweep="dual"
      {...props}
    />
  );
}

export function ContextPopover({ className, ...props }: PopoverProps) {
  return (
    <Popover
      className={cn("cos-context-popover", className)}
      {...props}
    />
  );
}

export function OverflowMenu({
  label = "更多操作",
  trigger,
  items,
  disabled,
  loading,
}: {
  label?: string;
  trigger?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  items: {
    id: string;
    label: string;
    danger?: boolean;
    disabled?: boolean;
    onSelect(): void;
  }[];
}) {
  return (
    <Popover
      align="end"
      label={<span aria-label={label}>{trigger ?? label}</span>}
      disabled={disabled}
      loading={loading}
    >
      <div
        className="cos-menu"
        role="menu"
        aria-label={label}
        onKeyDown={(event) => {
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="menuitem"]:not(:disabled)',
            ),
          );
          if (event.key === "Escape") {
            event.preventDefault();
            const details = event.currentTarget.closest("details");
            if (details) {
              details.open = false;
              details.querySelector<HTMLElement>("summary")?.focus();
            }
            return;
          }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            return;
          }
          event.preventDefault();
          if (buttons.length === 0) return;
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const nextIndex =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : index < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : buttons.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                    buttons.length;
          buttons[nextIndex]?.focus();
        }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={item.danger ? "cos-menu__danger" : undefined}
            disabled={item.disabled}
            onClick={(event) => {
              item.onSelect();
              const details = event.currentTarget.closest("details");
              if (details) {
                details.open = false;
                details.querySelector<HTMLElement>("summary")?.focus();
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Popover>
  );
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string[];
  group: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  onSelect,
  title = "命令面板",
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  items: CommandPaletteItem[];
  onSelect(item: CommandPaletteItem): void;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter(
      (item) =>
        !normalized ||
        item.label.toLocaleLowerCase().includes(normalized) ||
        item.description?.toLocaleLowerCase().includes(normalized),
    );
  }, [items, query]);
  const groups = useMemo(
    () => [...new Set(filtered.map((item) => item.group))],
    [filtered],
  );

  const choose = (item: CommandPaletteItem) => {
    if (item.disabled) return;
    onSelect(item);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setQuery("");
          setActiveIndex(0);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="cos-modal-backdrop" />
        <DialogPrimitive.Content asChild>
          <GlassSurface
            level="thick"
            optics="palette"
            prismCorners={["top-right", "bottom-right"]}
            sweep="dual"
            className="cos-command-palette"
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">
              {title}
            </DialogPrimitive.Title>
            <div className="cos-command-palette__search">
              <MagnifyingGlass aria-hidden="true" />
              <input
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={(event) => {
                  if (!filtered.length) return;
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveIndex(
                      (current) =>
                        (current +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          filtered.length) %
                        filtered.length,
                    );
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    choose(filtered[activeIndex]);
                  }
                }}
                placeholder="搜索命令、议题或材料…"
                aria-label="搜索命令"
              />
              <Keycap>Esc</Keycap>
            </div>
            <div className="cos-command-palette__results">
              {groups.map((group) => (
                <section key={group}>
                  <h3>{group}</h3>
                  {filtered
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const index = filtered.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={item.disabled}
                          aria-selected={index === activeIndex}
                          onPointerMove={() => setActiveIndex(index)}
                          onClick={() => choose(item)}
                        >
                          <span className="cos-command-palette__icon">
                            {item.icon}
                          </span>
                          <span>
                            <strong>{item.label}</strong>
                            {item.description && (
                              <small>{item.description}</small>
                            )}
                          </span>
                          {item.shortcut && (
                            <span className="cos-command-palette__shortcut">
                              {item.shortcut.map((key) => (
                                <Keycap key={key}>{key}</Keycap>
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </section>
              ))}
              {!filtered.length && (
                <EmptyState
                  title="没有匹配命令"
                  description="换一个关键词试试。"
                  compact
                />
              )}
            </div>
            <div
              className="cos-command-palette__footer"
              aria-hidden="true"
            >
              <span>
                <Keycap>↑</Keycap>
                <Keycap>↓</Keycap>
                选择
              </span>
              <span>
                <Keycap>↵</Keycap>
                打开
              </span>
              <span>
                <Keycap>Esc</Keycap>
                关闭
              </span>
            </div>
          </GlassSurface>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  danger = false,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="cos-modal-backdrop" />
        <DialogPrimitive.Content asChild>
          <GlassSurface
            level="thick"
            optics="palette"
            prismCorners={["top-right", "bottom-right"]}
            sweep="dual"
            className={cn("cos-modal", danger && "cos-modal--danger")}
          >
            <div className="cos-modal__header">
              <div>
                <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description>
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close asChild>
                <IconButton
                  label="关闭"
                  variant="ghost"
                  size="sm"
                >
                  <X />
                </IconButton>
              </DialogPrimitive.Close>
            </div>
            {children && <div className="cos-modal__body">{children}</div>}
            {footer && <div className="cos-modal__footer">{footer}</div>}
          </GlassSurface>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "确认",
  onConfirm,
  submitting,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm(): void;
  submitting?: boolean;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export function DangerDialog({
  confirmLabel = "确认删除",
  ...props
}: Omit<React.ComponentProps<typeof ConfirmDialog>, "confirmLabel"> & {
  confirmLabel?: string;
}) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      danger
      footer={
        <>
          <Button onClick={() => props.onOpenChange(false)}>取消</Button>
          <Button
            variant="danger"
            loading={props.submitting}
            onClick={props.onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

export function Toast({
  tone = "success",
  title,
  description,
  action,
}: {
  tone?: StatusTone;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassSurface
      level="regular"
      optics="popover"
      prismCorners={["bottom-right"]}
      sweep="top-left"
      className="cos-toast"
      role="status"
      aria-live="polite"
    >
      <StatusBadge tone={tone}>{title}</StatusBadge>
      {description && <p>{description}</p>}
      {action}
    </GlassSurface>
  );
}

export function InlineAlert({
  tone = "info",
  title,
  children,
}: {
  tone?: StatusTone;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("cos-inline-alert", `cos-inline-alert--${tone}`)}
      role={tone === "error" ? "alert" : "status"}
    >
      {STATUS_ICONS[tone]}
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function Table({
  children,
  caption,
  className,
}: {
  children: React.ReactNode;
  caption: string;
  className?: string;
}) {
  return (
    <GlassSurface
      level="clear"
      optics="table"
      prismCorners={["top-right", "bottom-right"]}
      sweep="dual"
      className={cn("cos-table-shell", className)}
    >
      <div className="cos-table-wrap">
        <table className="cos-table">
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </GlassSurface>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("cos-table__header", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("cos-table__row", className)}
      {...props}
    />
  );
}

export interface TableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  as?: "td" | "th";
}

export function TableCell({ as = "td", className, ...props }: TableCellProps) {
  if (as === "th") {
    return (
      <th
        className={cn("cos-table__cell", "cos-table__cell--header", className)}
        {...props}
      />
    );
  }
  return (
    <td
      className={cn("cos-table__cell", className)}
      {...props}
    />
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange(page: number): void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <nav
      className="cos-pagination"
      aria-label="分页"
    >
      <IconButton
        label="上一页"
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ArrowLeft />
      </IconButton>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          aria-current={item === page ? "page" : undefined}
          onClick={() => onPageChange(item)}
        >
          {item}
        </button>
      ))}
      <IconButton
        label="下一页"
        variant="ghost"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        <ArrowRight />
      </IconButton>
    </nav>
  );
}

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarPresence = "online" | "busy" | "offline" | "away" | "unknown";

const AVATAR_PRESENCE_LABELS: Record<AvatarPresence, string> = {
  online: "在线",
  busy: "忙碌",
  offline: "离线",
  away: "暂离",
  unknown: "状态未知",
};

export interface AvatarProps {
  src?: string;
  alt: string;
  initials: string;
  size?: AvatarSize;
  presence?: AvatarPresence;
  /** @deprecated Use presence="online" or presence="offline". */
  online?: boolean;
}

export function Avatar({
  src,
  alt,
  initials,
  size = "md",
  presence,
  online,
}: AvatarProps) {
  const resolvedPresence =
    presence ??
    (online === undefined ? undefined : online ? "online" : "offline");

  return (
    <span
      className={cn("cos-avatar", `cos-avatar--${size}`)}
      data-presence={resolvedPresence}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
        />
      ) : (
        <span aria-label={alt}>{initials}</span>
      )}
      {resolvedPresence && (
        <span
          className={
            resolvedPresence === "unknown"
              ? "lyl-visually-hidden"
              : "cos-presence"
          }
          data-presence={resolvedPresence}
          role="img"
          aria-label={AVATAR_PRESENCE_LABELS[resolvedPresence]}
        />
      )}
    </span>
  );
}

export interface AvatarStackMember extends Omit<
  AvatarProps,
  "online" | "presence" | "size"
> {
  id: string;
}

export function AvatarStack({
  members,
  max = 3,
  size = "md",
  label = "团队成员",
}: {
  members: AvatarStackMember[];
  max?: number;
  size?: Extract<AvatarSize, "sm" | "md" | "lg">;
  label?: string;
}) {
  const visible = members.slice(0, Math.max(1, max));
  const remaining = Math.max(0, members.length - visible.length);

  return (
    <span
      className="cos-avatar-stack"
      role="group"
      aria-label={label}
      data-size={size}
    >
      {visible.map((member) => (
        <Avatar
          key={member.id}
          {...member}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span
          className={cn("cos-avatar-stack__overflow", `cos-avatar--${size}`)}
          aria-label={`另有 ${remaining} 位成员`}
        >
          +{remaining}
        </span>
      )}
    </span>
  );
}

export const InitialAvatar = Avatar;
export const PresenceDot = StatusDot;

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("cos-skeleton", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("cos-state", compact && "cos-state--compact")}>
      <Info aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?(): void;
}) {
  return (
    <div
      className="cos-state cos-state--error"
      role="alert"
    >
      <WarningOctagon aria-hidden="true" />
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry && <Button onClick={onRetry}>重试</Button>}
    </div>
  );
}

export type ProgressState =
  "pending" | "running" | "complete" | "failed" | "waiting_user";

export interface ProgressItem {
  id: string;
  label: string;
  state: ProgressState;
  detail?: string;
}

export function HorizontalStepProgress({
  items,
  label = "议题处理进度",
}: {
  items: ProgressItem[];
  label?: string;
}) {
  return (
    <ol
      className="cos-step-progress"
      aria-label={label}
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={`cos-step-progress__item cos-step-progress__item--${item.state}`}
          aria-current={item.state === "running" ? "step" : undefined}
        >
          <span aria-hidden="true" />
          <strong>{item.label}</strong>
          {item.detail && <small>{item.detail}</small>}
        </li>
      ))}
    </ol>
  );
}

export function VerticalResearchProgress({
  items,
  label = "调研过程",
}: {
  items: ProgressItem[];
  label?: string;
}) {
  return (
    <ol
      className="cos-research-progress"
      aria-label={label}
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={`cos-research-progress__item cos-research-progress__item--${item.state}`}
        >
          <span aria-hidden="true" />
          <div>
            <strong>{item.label}</strong>
            {item.detail && <p>{item.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function FileUploadTrigger({
  inputId,
  label = "添加附件",
  disabled,
  className,
}: {
  inputId: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("cos-file-trigger", className)}
      aria-controls={inputId}
      disabled={disabled}
      onClick={(event) => {
        const input = event.currentTarget.ownerDocument.getElementById(inputId);
        if (input instanceof HTMLInputElement && !input.disabled) input.click();
      }}
    >
      <Paperclip aria-hidden="true" />
      {label}
    </button>
  );
}

export function ComposerAttachment({
  name,
  detail,
  onRemove,
}: {
  name: string;
  detail?: string;
  onRemove(): void;
}) {
  return (
    <span className="cos-attachment">
      <File aria-hidden="true" />
      <span>
        <strong>{name}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <IconButton
        label={`移除附件 ${name}`}
        variant="ghost"
        size="sm"
        onClick={onRemove}
      >
        <X />
      </IconButton>
    </span>
  );
}

export function ControlGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("cos-control-group", className)}>
      {Children.toArray(children)}
    </div>
  );
}
