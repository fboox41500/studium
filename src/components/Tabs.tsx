import { ReactNode, useMemo, useState } from 'react';

export interface TabDefinition {
  id: string;
  label: string;
  content: ReactNode;
  badge?: ReactNode;
}

interface TabsProps {
  tabs: TabDefinition[];
}

const Tabs = ({ tabs }: TabsProps) => {
  const initial = useMemo(() => tabs[0]?.id, [tabs]);
  const [activeId, setActiveId] = useState<string | undefined>(initial);

  if (!tabs.length) {
    return null;
  }

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <div role="tablist" aria-label="reaction outcomes" data-tablist>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${tab.id}-tab`}
            data-active={tab.id === activeTab.id}
            data-tab-button
            aria-selected={tab.id === activeTab.id}
            aria-controls={`${tab.id}-panel`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
            {tab.badge ? <span aria-hidden>{tab.badge}</span> : null}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${activeTab.id}-panel`}
        aria-labelledby={`${activeTab.id}-tab`}
      >
        {activeTab.content}
      </div>
    </div>
  );
};

export default Tabs;
