import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Avatar,
  AvatarStack,
  Combobox,
  Divider,
  FileUploadTrigger,
  FilterPopover,
  NotificationDot,
  OverflowMenu,
  Popover,
  PriorityLabel,
  SegmentedControl,
  Select,
  SourceLink,
  SplitButton,
  Switch,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  Tabs,
  Timeline,
  TimelineItem,
  Tooltip,
  type TabItem,
} from "./controls";

type MaterialTab = "counsel" | "evidence" | "history" | "research";

const ITEMS: TabItem<MaterialTab>[] = [
  { id: "counsel", label: "参谋结论", panel: "结论内容" },
  { id: "evidence", label: "关键证据", panel: "证据内容" },
  { id: "history", label: "历史依据", panel: "历史内容", disabled: true },
  { id: "research", label: "调研过程", panel: "调研内容" },
];

function MaterialTabsHarness() {
  const [tab, setTab] = useState<MaterialTab>("counsel");
  return (
    <Tabs<MaterialTab>
      value={tab}
      onValueChange={setTab}
      items={ITEMS}
      label="参谋材料"
    />
  );
}

describe("Tabs", () => {
  it("switches panels with click and exposes a fixed accessible tablist", async () => {
    const user = userEvent.setup();
    render(<MaterialTabsHarness />);

    const tablist = screen.getByRole("tablist", { name: "参谋材料" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);

    await user.click(screen.getByRole("tab", { name: "关键证据" }));
    expect(screen.getByRole("tab", { name: "关键证据" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("证据内容");
  });

  it("wraps arrow navigation and skips disabled tabs", async () => {
    const user = userEvent.setup();
    render(<MaterialTabsHarness />);

    const counsel = screen.getByRole("tab", { name: "参谋结论" });
    counsel.focus();
    await user.keyboard("{ArrowLeft}");
    const research = screen.getByRole("tab", { name: "调研过程" });
    expect(research).toHaveAttribute("aria-selected", "true");
    expect(research).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(counsel).toHaveAttribute("aria-selected", "true");
    expect(counsel).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
  });

  it("renders safely with no items or with every item disabled", () => {
    const { rerender } = render(
      <Tabs
        value="missing"
        onValueChange={() => undefined}
        items={[]}
        label="空标签页"
      />,
    );

    expect(
      screen.getByRole("tablist", { name: "空标签页" }),
    ).toBeEmptyDOMElement();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();

    rerender(
      <Tabs
        value="only"
        onValueChange={() => undefined}
        items={[
          { id: "only", label: "不可用", panel: "保留内容", disabled: true },
        ]}
        label="全部禁用"
      />,
    );
    const disabledTab = screen.getByRole("tab", { name: "不可用" });
    expect(disabledTab).toBeDisabled();
    expect(disabledTab).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("保留内容");
    expect(() =>
      fireEvent.keyDown(disabledTab, { key: "ArrowRight" }),
    ).not.toThrow();
  });
});

describe("P0 display controls", () => {
  it("exposes semantic notification, priority, timeline, source and divider content", () => {
    render(
      <>
        <NotificationDot
          count={120}
          label="待处理通知"
        />
        <PriorityLabel priority="critical" />
        <Timeline label="议题进展">
          <TimelineItem
            title="证据核验完成"
            dateTime="2026-08-01"
            dateLabel="8 月 1 日"
            status="success"
            statusLabel="已核验"
          >
            来源已经交叉验证。
          </TimelineItem>
        </Timeline>
        <SourceLink
          href="https://example.com/evidence"
          external
        >
          查看原始来源
        </SourceLink>
        <Divider label="下一阶段" />
      </>,
    );

    expect(screen.getByRole("img", { name: "待处理通知" })).toHaveTextContent(
      "99+",
    );
    expect(screen.getByText("紧急优先级")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "议题进展" })).toBeInTheDocument();
    expect(screen.getByText("已核验")).toHaveClass("lyl-visually-hidden");
    expect(screen.getByText("8 月 1 日")).toHaveAttribute(
      "datetime",
      "2026-08-01",
    );
    expect(screen.getByRole("link", { name: "查看原始来源" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
  });

  it("provides typed table structure", () => {
    render(
      <Table caption="证据列表">
        <TableHeader>
          <TableRow>
            <TableCell
              as="th"
              scope="col"
            >
              来源
            </TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          <TableRow>
            <TableCell>访谈记录</TableCell>
          </TableRow>
        </tbody>
      </Table>,
    );

    expect(screen.getByRole("table", { name: "证据列表" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "来源" })).toHaveAttribute(
      "scope",
      "col",
    );
    expect(screen.getByRole("cell", { name: "访谈记录" })).toBeInTheDocument();
    expect(
      screen
        .getByRole("table", { name: "证据列表" })
        .closest(".lyl-glass-surface"),
    ).toHaveAttribute("data-optics", "table");
  });

  it("renders the five-size avatar contract and named presence state", () => {
    render(
      <>
        <Avatar
          alt="最小头像"
          initials="XS"
          size="xs"
        />
        <Avatar
          alt="参谋头像"
          initials="LYL"
          size="xl"
          presence="busy"
        />
      </>,
    );

    expect(screen.getByLabelText("最小头像").parentElement).toHaveClass(
      "cos-avatar--xs",
    );
    expect(screen.getByLabelText("参谋头像").parentElement).toHaveClass(
      "cos-avatar--xl",
    );
    expect(screen.getByRole("img", { name: "忙碌" })).toHaveAttribute(
      "data-presence",
      "busy",
    );
  });

  it("limits visible team avatars and exposes the remaining member count", () => {
    render(
      <AvatarStack
        label="评审团队"
        max={2}
        members={[
          { id: "a", alt: "成员甲", initials: "A" },
          { id: "b", alt: "成员乙", initials: "B" },
          { id: "c", alt: "成员丙", initials: "C" },
        ]}
      />,
    );

    expect(screen.getByRole("group", { name: "评审团队" })).toBeInTheDocument();
    expect(screen.getByLabelText("另有 1 位成员")).toHaveTextContent("+1");
    expect(screen.queryByLabelText("成员丙")).not.toBeInTheDocument();
  });

  it("gives filter popovers and tooltips their physical optics profile", () => {
    render(
      <>
        <FilterPopover
          label="筛选"
          defaultOpen
        >
          筛选内容
        </FilterPopover>
        <Tooltip
          title="项目完成度"
          label="所有子任务的完成度均值"
        >
          <button type="button">说明</button>
        </Tooltip>
      </>,
    );

    expect(screen.getByText("筛选").closest("details")).toHaveClass(
      "cos-filter-popover",
    );
    expect(
      screen.getByText("筛选内容").closest(".lyl-glass-surface"),
    ).toHaveAttribute("data-optics", "popover");
    expect(screen.getByRole("tooltip")).toHaveTextContent("项目完成度");
  });
});

describe("control state contracts", () => {
  it("exposes error and success state without relying on color alone", () => {
    render(
      <>
        <Switch
          checked={false}
          onCheckedChange={() => undefined}
          label="同步历史"
          error
        />
        <SegmentedControl
          value="a"
          onValueChange={() => undefined}
          options={[{ value: "a", label: "选项 A" }]}
          label="显示模式"
          error
        />
        <Tabs
          value="a"
          onValueChange={() => undefined}
          items={[{ id: "a", label: "材料", panel: "内容" }]}
          label="材料标签"
          success
        />
      </>,
    );

    expect(screen.getByRole("switch", { name: "同步历史" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("group", { name: "显示模式" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("tablist", { name: "材料标签" }).parentElement,
    ).toHaveAttribute("data-success", "true");
  });

  it("disables select and combobox while announcing loading", () => {
    render(
      <>
        <Select
          aria-label="选择来源"
          options={[{ value: "history", label: "历史依据" }]}
          loading
        />
        <Combobox
          label="搜索来源"
          options={[{ value: "interview", label: "访谈" }]}
          loading
        />
      </>,
    );

    const select = screen.getByRole("combobox", { name: "选择来源" });
    const combobox = screen.getByRole("combobox", { name: "搜索来源" });
    expect(select).toBeDisabled();
    expect(select).toHaveAttribute("aria-busy", "true");
    expect(combobox).toBeDisabled();
    expect(combobox).toHaveAttribute("aria-autocomplete", "list");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("keeps combobox expanded state in sync with focus and Escape", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    render(
      <Combobox
        label="查找证据"
        options={[{ value: "report", label: "研究报告" }]}
        onFocus={onFocus}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "查找证据" });
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    await user.click(combobox);
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    expect(onFocus).toHaveBeenCalledOnce();
    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
  });
});

describe("popover and menu keyboard behavior", () => {
  it("keeps a disabled or loading popover closed and out of the tab order", async () => {
    const user = userEvent.setup();
    render(
      <Popover
        label="筛选"
        defaultOpen
        disabled
      >
        筛选内容
      </Popover>,
    );

    const summary = screen.getByText("筛选").closest("summary");
    const details = summary?.closest("details");
    expect(summary).toHaveAttribute("aria-disabled", "true");
    expect(summary).toHaveAttribute("tabindex", "-1");
    expect(details).not.toHaveAttribute("open");
    if (summary) await user.click(summary);
    expect(details).not.toHaveAttribute("open");
  });

  it("moves through enabled menu items and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(
      <OverflowMenu
        label="证据操作"
        items={[
          { id: "open", label: "打开", onSelect: () => undefined },
          {
            id: "disabled",
            label: "不可用",
            disabled: true,
            onSelect: () => undefined,
          },
          { id: "copy", label: "复制", onSelect: () => undefined },
        ]}
      />,
    );

    const summary = screen.getByText("证据操作").closest("summary");
    if (!summary) throw new Error("缺少菜单触发器");
    await user.click(summary);
    const open = screen.getByRole("menuitem", { name: "打开" });
    open.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "复制" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    expect(summary).toHaveFocus();
  });
});

describe("SplitButton", () => {
  it("keeps a disabled menu closed and out of the tab order", async () => {
    const user = userEvent.setup();
    render(
      <SplitButton
        label="形成建议"
        disabled
        onClick={() => undefined}
        items={[{ id: "draft", label: "保存草稿", onSelect: () => undefined }]}
      />,
    );

    const summary = screen.getByLabelText("形成建议的更多操作");
    const details = summary.closest("details");
    expect(summary).toHaveAttribute("aria-disabled", "true");
    expect(summary).toHaveAttribute("tabindex", "-1");
    await user.click(summary);
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByRole("menuitem", { hidden: true })).toBeDisabled();
  });
});

describe("FileUploadTrigger", () => {
  it("uses a focusable button and truly blocks disabled targets", async () => {
    const user = userEvent.setup();
    render(
      <>
        <input
          id="enabled-file"
          type="file"
        />
        <FileUploadTrigger
          inputId="enabled-file"
          label="上传证据"
        />
        <input
          id="disabled-file"
          type="file"
          disabled
        />
        <FileUploadTrigger
          inputId="disabled-file"
          label="上传禁用证据"
        />
        <FileUploadTrigger
          inputId="enabled-file"
          label="不可上传"
          disabled
        />
      </>,
    );

    const enabledInput = document.getElementById(
      "enabled-file",
    ) as HTMLInputElement;
    const disabledInput = document.getElementById(
      "disabled-file",
    ) as HTMLInputElement;
    const enabledClick = vi.spyOn(enabledInput, "click");
    const disabledClick = vi.spyOn(disabledInput, "click");

    const trigger = screen.getByRole("button", { name: "上传证据" });
    expect(trigger).toHaveAttribute("aria-controls", "enabled-file");
    trigger.focus();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(enabledClick).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "上传禁用证据" }));
    expect(disabledClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "不可上传" })).toBeDisabled();
  });
});
