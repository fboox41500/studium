import Accordion from './Accordion';
import ComponentsTable from './ComponentsTable';
import DefinitionList from './DefinitionList';
import ReactionVisualizations from './ReactionVisualizations';
import Tabs from './Tabs';
import { ReactionDetail } from '../services/reactions';
import { format } from '../utils/formatters';

interface ReactionDetailCardProps {
  reaction: ReactionDetail;
}

const ReactionDetailCard = ({ reaction }: ReactionDetailCardProps) => {
  const conditionItems = format.keyValuePairs(reaction.conditions);
  const metadataItems = format.keyValuePairs(reaction.metadata);

  const outcomeTabs = reaction.outcomes?.map((outcome, index) => {
    const displayLabel = outcome.label ?? `Outcome ${index + 1}`;
    const summary = [outcome.description, outcome.yield, outcome.selectivity].filter(Boolean).join(' • ');

    return {
      id: outcome.id ?? `${reaction.id}-outcome-${index}`,
      label: displayLabel,
      content: (
        <div>
          {summary ? <p>{summary}</p> : null}
          {outcome.diagramUrl ? (
            <img src={outcome.diagramUrl} alt={`${displayLabel} diagram`} />
          ) : null}
          {outcome.html ? (
            <div
              data-visualization-html
              dangerouslySetInnerHTML={{ __html: outcome.html }}
            />
          ) : null}
        </div>
      )
    };
  });

  const sections = [
    {
      id: `${reaction.id}-conditions`,
      title: 'Conditions',
      content: <DefinitionList items={conditionItems} emptyLabel="No reaction conditions were provided." />
    },
    {
      id: `${reaction.id}-components`,
      title: 'Components',
      content: <ComponentsTable components={reaction.components} />
    },
    {
      id: `${reaction.id}-outcomes`,
      title: 'Outcomes',
      content: outcomeTabs?.length ? (
        <Tabs tabs={outcomeTabs} />
      ) : (
        <p data-muted>No outcomes were provided for this reaction.</p>
      )
    }
  ];

  if (metadataItems.length) {
    sections.push({
      id: `${reaction.id}-metadata`,
      title: 'Metadata',
      content: <DefinitionList items={metadataItems} />
    });
  }

  return (
    <article data-card>
      <header>
        <h2>{reaction.title ?? reaction.id}</h2>
        {reaction.description ? <p data-muted>{reaction.description}</p> : null}
        {reaction.updatedAt ? <p data-muted>Last updated {format.timestamp(reaction.updatedAt)}</p> : null}
      </header>
      <Accordion sections={sections} />
      <ReactionVisualizations visualizations={reaction.visualizations} />
    </article>
  );
};

export default ReactionDetailCard;
