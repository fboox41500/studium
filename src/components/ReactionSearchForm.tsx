import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { ReactionSearchFilters } from '../api/reactionSearchClient';

export interface ReactionSearchFormProps {
  filters: ReactionSearchFilters;
  onFiltersChange: (filters: ReactionSearchFilters) => void;
  onSubmit: (filters: ReactionSearchFilters) => void;
  onReset: (filters: ReactionSearchFilters) => void;
  defaultFilters: ReactionSearchFilters;
}

export const ReactionSearchForm = ({
  filters,
  onFiltersChange,
  onSubmit,
  onReset,
  defaultFilters
}: ReactionSearchFormProps) => {
  const [tagsInput, setTagsInput] = useState(() => filters.tags.join(', '));

  useEffect(() => {
    const joinedTags = filters.tags.join(', ');
    const normalizedInput = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .join(', ');

    if (joinedTags !== normalizedInput) {
      setTagsInput(joinedTags);
    }
  }, [filters.tags, tagsInput]);

  const handleTextChange = useCallback(
    (field: keyof Pick<ReactionSearchFilters, 'query' | 'catalyst' | 'reagent'>) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        onFiltersChange({ ...filters, [field]: event.target.value });
      },
    [filters, onFiltersChange]
  );

  const handleTemperatureChange = useCallback(
    (field: keyof Pick<ReactionSearchFilters, 'temperatureMin' | 'temperatureMax'>) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const numericValue = value === '' ? undefined : Number(value);
        onFiltersChange({ ...filters, [field]: Number.isNaN(numericValue) ? undefined : numericValue });
      },
    [filters, onFiltersChange]
  );

  const handleIncludeIntermediatesChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, includeIntermediates: event.target.checked });
    },
    [filters, onFiltersChange]
  );

  const handleTagsChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      setTagsInput(raw);
      const tags = raw
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      onFiltersChange({ ...filters, tags });
    },
    [filters, onFiltersChange, setTagsInput]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onSubmit({ ...filters, tags: [...filters.tags] });
    },
    [filters, onSubmit]
  );

  const handleReset = useCallback(() => {
    const resetFilters: ReactionSearchFilters = { ...defaultFilters, tags: [...defaultFilters.tags] };
    setTagsInput(resetFilters.tags.join(', '));
    onFiltersChange(resetFilters);
    onReset(resetFilters);
  }, [defaultFilters, onFiltersChange, onReset, setTagsInput]);

  return (
    <form onSubmit={handleSubmit} aria-label="Reaction search form">
      <div>
        <label htmlFor="reaction-query">Query</label>
        <input
          id="reaction-query"
          name="query"
          value={filters.query}
          onChange={handleTextChange('query')}
          placeholder="e.g. Suzuki coupling"
        />
      </div>

      <div>
        <label htmlFor="reaction-catalyst">Catalyst</label>
        <input
          id="reaction-catalyst"
          name="catalyst"
          value={filters.catalyst}
          onChange={handleTextChange('catalyst')}
          placeholder="e.g. Pd(PPh3)4"
        />
      </div>

      <div>
        <label htmlFor="reaction-reagent">Reagent</label>
        <input
          id="reaction-reagent"
          name="reagent"
          value={filters.reagent}
          onChange={handleTextChange('reagent')}
          placeholder="e.g. NaBH4"
        />
      </div>

      <div>
        <label htmlFor="reaction-temperature-min">Min temperature (°C)</label>
        <input
          id="reaction-temperature-min"
          name="temperatureMin"
          type="number"
          value={filters.temperatureMin ?? ''}
          onChange={handleTemperatureChange('temperatureMin')}
        />
      </div>

      <div>
        <label htmlFor="reaction-temperature-max">Max temperature (°C)</label>
        <input
          id="reaction-temperature-max"
          name="temperatureMax"
          type="number"
          value={filters.temperatureMax ?? ''}
          onChange={handleTemperatureChange('temperatureMax')}
        />
      </div>

      <div>
        <label htmlFor="reaction-tags">Tags</label>
        <input
          id="reaction-tags"
          name="tags"
          value={tagsInput}
          onChange={handleTagsChange}
          placeholder="e.g. arylation, cross-coupling"
        />
      </div>

      <div>
        <input
          id="reaction-include-intermediates"
          name="includeIntermediates"
          type="checkbox"
          checked={filters.includeIntermediates}
          onChange={handleIncludeIntermediatesChange}
        />
        <label htmlFor="reaction-include-intermediates">Include intermediates</label>
      </div>

      <div>
        <button type="submit">Search</button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </form>
  );
};
