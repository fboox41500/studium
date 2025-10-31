import type { FC } from 'react';
import type { Reaction } from '../api/reactionSearchClient';

export interface ReactionDetailPanelProps {
  reaction: Reaction | null;
  onClose?: () => void;
}

export const ReactionDetailPanel: FC<ReactionDetailPanelProps> = ({ reaction, onClose }) => {
  if (!reaction) {
    return (
      <aside aria-live="polite">
        <p>Select a reaction to view the detailed conditions.</p>
      </aside>
    );
  }

  return (
    <aside aria-live="polite" aria-label="Reaction details">
      <header>
        <h2>{reaction.name}</h2>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close reaction details">
            Close
          </button>
        ) : null}
      </header>
      <p>{reaction.summary}</p>
      <section>
        <h3>Conditions</h3>
        <dl>
          {reaction.temperatureC !== undefined ? (
            <div>
              <dt>Temperature</dt>
              <dd>{reaction.temperatureC} °C</dd>
            </div>
          ) : null}
          {reaction.pressureAtm !== undefined ? (
            <div>
              <dt>Pressure</dt>
              <dd>{reaction.pressureAtm} atm</dd>
            </div>
          ) : null}
          {reaction.yieldPercent !== undefined ? (
            <div>
              <dt>Yield</dt>
              <dd>{reaction.yieldPercent}%</dd>
            </div>
          ) : null}
          {reaction.catalyst ? (
            <div>
              <dt>Catalyst</dt>
              <dd>{reaction.catalyst}</dd>
            </div>
          ) : null}
          {reaction.reagent ? (
            <div>
              <dt>Key reagent</dt>
              <dd>{reaction.reagent}</dd>
            </div>
          ) : null}
          {reaction.reagents.length > 0 ? (
            <div>
              <dt>Full reagent list</dt>
              <dd>{reaction.reagents.join(', ')}</dd>
            </div>
          ) : null}
          <div>
            <dt>Includes intermediates</dt>
            <dd>{reaction.includeIntermediates ? 'Yes' : 'No'}</dd>
          </div>
          {reaction.tags.length > 0 ? (
            <div>
              <dt>Tags</dt>
              <dd>{reaction.tags.join(', ')}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <section>
        <h3>Revision history</h3>
        <dl>
          <div>
            <dt>Created</dt>
            <dd>{new Date(reaction.createdAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{new Date(reaction.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
      </section>
    </aside>
  );
};
