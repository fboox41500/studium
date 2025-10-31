interface DefinitionListProps {
  items: Array<{ term: string; description: string }>;
  emptyLabel?: string;
}

const DefinitionList = ({ items, emptyLabel = 'No data available.' }: DefinitionListProps) => {
  if (!items.length) {
    return <p data-muted>{emptyLabel}</p>;
  }

  return (
    <dl data-definition-list>
      {items.map((item) => (
        <div key={item.term}>
          <dt data-definition-term>{item.term}</dt>
          <dd data-definition-description>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
};

export default DefinitionList;
