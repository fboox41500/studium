import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReactionDetailPage from './ReactionDetailPage';

const originalFetch = global.fetch;

const renderPage = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]} initialIndex={0}>
      <Routes>
        <Route path="/reaction/:reactionId" element={<ReactionDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ReactionDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches and displays reaction details for a single identifier', async () => {
    const reaction = {
      id: 'RXN-101',
      title: 'Suzuki coupling',
      description: 'A palladium catalysed cross-coupling reaction.',
      conditions: {
        temperature: '90 °C',
        solvent: 'DMF',
        duration: '12 h'
      },
      components: [
        { name: 'Boronic acid', role: 'Substrate', amount: '1.2 eq' },
        { name: 'Aryl halide', role: 'Substrate', amount: '1.0 eq' }
      ],
      outcomes: [
        {
          id: 'outcome-1',
          label: 'Primary outcome',
          description: 'High yield coupling product',
          yield: '82%',
          diagramUrl: 'https://example.com/diagram.png'
        }
      ],
      visualizations: [
        {
          type: 'html' as const,
          content: '<div data-testid="reaction-html">Visualisation</div>',
          caption: 'Automated depiction'
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => reaction
    } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderPage('/reaction/RXN-101');

    expect(await screen.findByText(/Suzuki coupling/i)).toBeInTheDocument();
    expect(screen.getByText(/palladium catalysed/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reactions/RXN-101');

    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('90 °C')).toBeInTheDocument();
    expect(screen.getByText('Boronic acid')).toBeInTheDocument();
    expect(screen.getByTestId('reaction-html')).toBeInTheDocument();
  });

  it('supports batch lookups using the ids query parameter', async () => {
    const reactions = [
      { id: 'RXN-201', title: 'Aldol condensation', conditions: { catalyst: 'NaOH' } },
      { id: 'RXN-202', title: 'Claisen rearrangement', conditions: { temperature: '170 °C' } }
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reactions })
    } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderPage('/reaction/RXN-201?ids=RXN-201,RXN-202');

    expect(await screen.findByText(/Batch lookup/i)).toBeInTheDocument();
    expect(screen.getByText('Aldol condensation')).toBeInTheDocument();
    expect(screen.getByText('Claisen rearrangement')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/reactions?ids=RXN-201,RXN-202');
  });

  it('handles fetch failures and allows retrying the request', async () => {
    const resolvedReaction = {
      id: 'RXN-301',
      title: 'Friedel–Crafts acylation',
      conditions: { catalyst: 'AlCl₃' }
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => resolvedReaction } as Response);

    global.fetch = fetchMock as unknown as typeof fetch;

    renderPage('/reaction/RXN-301');

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('Friedel–Crafts acylation')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
