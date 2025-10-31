import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Reaction, ReactionSearchClient, ReactionSearchResponse } from '../../api/reactionSearchClient';
import { ReactionSearch } from '../ReactionSearch';

const createReaction = (overrides: Partial<Reaction> = {}): Reaction => ({
  id: overrides.id ?? `rxn-${Math.random().toString(16).slice(2)}`,
  name: overrides.name ?? 'Test Reaction',
  summary: overrides.summary ?? 'A model reaction used for testing.',
  temperatureC: overrides.temperatureC ?? 75,
  pressureAtm: overrides.pressureAtm ?? 1,
  yieldPercent: overrides.yieldPercent ?? 82,
  catalyst: overrides.catalyst ?? 'Pd/C',
  reagent: overrides.reagent ?? 'NaBH4',
  reagents: overrides.reagents ?? ['NaBH4', 'Pd/C'],
  includeIntermediates: overrides.includeIntermediates ?? false,
  tags: overrides.tags ?? ['reduction'],
  createdAt: overrides.createdAt ?? new Date('2024-01-01T10:00:00Z').toISOString(),
  updatedAt: overrides.updatedAt ?? new Date('2024-02-14T15:30:00Z').toISOString()
});

const createClient = () => ({
  search: vi.fn()
}) as unknown as ReactionSearchClient & { search: ReturnType<typeof vi.fn> };

describe('ReactionSearch', () => {
  it('renders initial reaction results returned by the client', async () => {
    const reaction = createReaction({ name: 'Suzuki coupling', tags: ['cross-coupling', 'palladium'] });
    const client = createClient();
    client.search.mockResolvedValue({ reactions: [reaction], total: 1, page: 1, pageSize: 10 });

    render(<ReactionSearch client={client} pageSize={10} />);

    expect(client.search).toHaveBeenCalledTimes(1);

    await screen.findByRole('heading', { name: /suzuki coupling/i });
    expect(screen.getByText(/cross-coupling, palladium/i)).toBeInTheDocument();
    expect(screen.getByText(/A model reaction used for testing./i)).toBeInTheDocument();
  });

  it('shows a loading indicator while fetching results', async () => {
    const client = createClient();
    let resolveSearch: (response: ReactionSearchResponse) => void = () => {};
    client.search.mockReturnValueOnce(
      new Promise<ReactionSearchResponse>((resolve) => {
        resolveSearch = resolve;
      })
    );

    render(<ReactionSearch client={client} pageSize={5} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading reactions/i);

    resolveSearch({ reactions: [], total: 0, page: 1, pageSize: 5 });

    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('renders an error state when the client request fails', async () => {
    const client = createClient();
    client.search.mockRejectedValueOnce(new Error('Service unavailable'));

    render(<ReactionSearch client={client} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/unable to load reactions/i);
    expect(alert).toHaveTextContent(/service unavailable/i);
  });

  it('submits filters and requests new results from the client', async () => {
    const client = createClient();
    client.search
      .mockResolvedValueOnce({ reactions: [createReaction({ name: 'Initial reaction' })], total: 1, page: 1, pageSize: 10 })
      .mockResolvedValueOnce({
        reactions: [
          createReaction({ name: 'Oxidation pathway', includeIntermediates: true, tags: ['oxidation', 'radical'] })
        ],
        total: 1,
        page: 1,
        pageSize: 10
      });

    render(<ReactionSearch client={client} pageSize={10} />);

    await screen.findByRole('heading', { name: /initial reaction/i });

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/query/i));
    await user.type(screen.getByLabelText(/query/i), 'Oxidation');
    await user.type(screen.getByLabelText(/catalyst/i), 'MnO2');
    await user.type(screen.getByLabelText(/reagent/i), 'Acetone');
    await user.clear(screen.getByLabelText(/min temperature/i));
    await user.type(screen.getByLabelText(/min temperature/i), '10');
    await user.clear(screen.getByLabelText(/max temperature/i));
    await user.type(screen.getByLabelText(/max temperature/i), '45');
    await user.click(screen.getByLabelText(/include intermediates/i));
    await user.clear(screen.getByLabelText(/tags/i));
    await user.type(screen.getByLabelText(/tags/i), 'oxidation, radical');

    await user.click(screen.getByRole('button', { name: /search/i }));

    await screen.findByRole('heading', { name: /oxidation pathway/i });

    expect(client.search).toHaveBeenCalledTimes(2);
    const [, secondCall] = client.search.mock.calls;
    expect(secondCall[0].filters).toMatchObject({
      query: 'Oxidation',
      catalyst: 'MnO2',
      reagent: 'Acetone',
      temperatureMin: 10,
      temperatureMax: 45,
      includeIntermediates: true,
      tags: ['oxidation', 'radical']
    });
  });

  it('supports pagination', async () => {
    const client = createClient();
    client.search
      .mockResolvedValueOnce({
        reactions: [createReaction({ id: 'rxn-1', name: 'Page 1 Reaction' })],
        total: 2,
        page: 1,
        pageSize: 1
      })
      .mockResolvedValueOnce({
        reactions: [createReaction({ id: 'rxn-2', name: 'Page 2 Reaction' })],
        total: 2,
        page: 2,
        pageSize: 1
      });

    render(<ReactionSearch client={client} pageSize={1} />);

    await screen.findByText(/page 1 reaction/i);

    const nextButton = screen.getByRole('button', { name: /next page/i });
    await userEvent.click(nextButton);

    await screen.findByText(/page 2 reaction/i);
    expect(client.search).toHaveBeenCalledTimes(2);

    const secondCallArgs = client.search.mock.calls[1][0];
    expect(secondCallArgs.pagination.page).toBe(2);
  });

  it('allows selecting a reaction to view its details', async () => {
    const reactions = [
      createReaction({ id: 'rxn-1', name: 'Hydrogenation', summary: 'Hydrogenation summary' }),
      createReaction({ id: 'rxn-2', name: 'Reduction', summary: 'Reduction summary' })
    ];

    const client = createClient();
    client.search.mockResolvedValueOnce({ reactions, total: 2, page: 1, pageSize: 10 });

    render(<ReactionSearch client={client} />);

    await screen.findByRole('heading', { name: /hydrogenation/i });

    expect(screen.getByText(/hydrogenation summary/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reduction/i }));

    expect(screen.getByText(/reduction summary/i)).toBeInTheDocument();
  });

  it('shows an empty state when no reactions match the filters', async () => {
    const client = createClient();
    client.search.mockResolvedValue({ reactions: [], total: 0, page: 1, pageSize: 10 });

    render(<ReactionSearch client={client} />);

    await screen.findByText(/no reactions found/i);
  });
});
