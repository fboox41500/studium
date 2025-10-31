import { ReactionVisualization } from '../services/reactions';

interface ReactionVisualizationsProps {
  visualizations?: ReactionVisualization[];
}

const ReactionVisualizations = ({ visualizations }: ReactionVisualizationsProps) => {
  if (!visualizations?.length) {
    return null;
  }

  return (
    <div data-visualization>
      {visualizations.map((visualization, index) => {
        if (visualization.type === 'image') {
          return (
            <figure key={visualization.content}>
              <img src={visualization.content} alt={visualization.caption ?? 'Reaction diagram'} />
              {visualization.caption ? <figcaption data-muted>{visualization.caption}</figcaption> : null}
            </figure>
          );
        }
        return (
          <figure key={`html-${index}`}>
            <div
              data-visualization-html
              dangerouslySetInnerHTML={{ __html: visualization.content }}
            />
            {visualization.caption ? <figcaption data-muted>{visualization.caption}</figcaption> : null}
          </figure>
        );
      })}
    </div>
  );
};

export default ReactionVisualizations;
