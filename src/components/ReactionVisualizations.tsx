import KetcherViewer from './KetcherViewer';
import RDKitStructure from './RDKitStructure';
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
        const key = visualization.id ?? `${visualization.type}-${index}`;
        const caption = visualization.caption ? <figcaption data-muted>{visualization.caption}</figcaption> : null;

        if (visualization.type === 'image') {
          return (
            <figure key={key}>
              <img src={visualization.content} alt={visualization.caption ?? 'Reaction diagram'} />
              {caption}
            </figure>
          );
        }

        if (visualization.type === 'html') {
          return (
            <figure key={key}>
              <div
                data-visualization-html
                dangerouslySetInnerHTML={{ __html: visualization.content }}
              />
              {caption}
            </figure>
          );
        }

        if (visualization.type === 'ketcher') {
          const viewer = (
            <KetcherViewer
              structure={visualization.content}
              hiddenControls={visualization.hiddenControls}
              height={visualization.height}
              title={visualization.caption ?? 'Reaction diagram'}
              basePath={visualization.basePath}
            />
          );

          if (!viewer) {
            return null;
          }

          return (
            <figure key={key}>
              <div data-ketcher-viewer>{viewer}</div>
              {caption}
            </figure>
          );
        }

        if (visualization.type === 'rdkit') {
          return (
            <figure key={key}>
              <RDKitStructure
                structure={visualization.content}
                format={visualization.format}
                width={visualization.width}
                height={visualization.height}
                svgOptions={visualization.svgOptions}
                ariaLabel={visualization.caption ?? 'Rendered chemical structure'}
              />
              {caption}
            </figure>
          );
        }

        return null;
      })}
    </div>
  );
};

export default ReactionVisualizations;
