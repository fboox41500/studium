import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SearchPage from './SearchPage';

describe('SearchPage', () => {
  it('builds a deep-link to the reaction detail page after submitting a query', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/reaction identifier/i);
    await userEvent.type(input, 'RXN/88');

    await userEvent.click(screen.getByRole('button', { name: /view details/i }));

    const link = await screen.findByTestId('reaction-deep-link');

    expect(link).toHaveAttribute('href', '/reaction/RXN%2F88');
    expect(link).toHaveTextContent('Open reaction RXN/88');
  });
});
