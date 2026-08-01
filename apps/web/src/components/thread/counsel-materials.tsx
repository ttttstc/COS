import { MaterialTabs, type MaterialTabId } from "@/components/clauseos";

import { createCounselMaterialView } from "./counsel-material-view";

export function CounselMaterials({
  value,
  activeTab,
  onTabChange,
}: {
  value: unknown;
  activeTab: MaterialTabId;
  onTabChange(tab: MaterialTabId): void;
}) {
  const view = createCounselMaterialView(value);
  return (
    <MaterialTabs
      activeTab={activeTab}
      onTabChange={onTabChange}
      counts={view.counts}
      panels={view.panels}
    />
  );
}
