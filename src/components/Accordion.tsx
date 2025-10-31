import { ReactNode, useState } from 'react';
import clsx from 'clsx';

export interface AccordionSection {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

interface AccordionProps {
  sections: AccordionSection[];
}

const Accordion = ({ sections }: AccordionProps) => {
  const [openIds, setOpenIds] = useState<string[]>(() => {
    const defaults = sections.filter((section) => section.defaultOpen).map((section) => section.id);
    if (defaults.length) {
      return defaults;
    }
    return sections.length ? [sections[0].id] : [];
  });

  const toggle = (id: string) => {
    setOpenIds((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    );
  };

  return (
    <div data-accordion>
      {sections.map((section) => {
        const isOpen = openIds.includes(section.id);
        return (
          <div key={section.id} data-accordion-item>
            <button
              type="button"
              data-accordion-trigger
              className={clsx({ open: isOpen })}
              aria-expanded={isOpen}
              aria-controls={`${section.id}-panel`}
              id={`${section.id}-control`}
              onClick={() => toggle(section.id)}
            >
              <span>{section.title}</span>
              <span aria-hidden>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen ? (
              <div
                id={`${section.id}-panel`}
                role="region"
                aria-labelledby={`${section.id}-control`}
                data-accordion-panel
              >
                {section.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
