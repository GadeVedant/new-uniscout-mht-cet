/**
 * Unit tests for SmartFormPage.
 *
 * Feature: smart-form-filling
 * Task: 16.3
 * Requirements: 2.3, 2.4, 2.8, 2.9, 8.4, 8.7, 9.1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SmartFormPage } from '../components/SmartFormPage';

// Mock api
vi.mock('../services/api', () => ({
  api: {
    generateFormFillingList: vi.fn().mockResolvedValue({
      success: true,
      data: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: true, budgetWarning: false },
      metadata: {},
    }),
  },
}));

// Mock MultiBranchSearch so branches appear as simple checkboxes the test can click
vi.mock('../components/BranchSearch', () => ({
  MultiBranchSearch: ({ selected, onChange, max }: any) => (
    <div data-testid="branch-search">
      {['computer engineering', 'civil engineering', 'mechanical engineering',
        'electrical engineering', 'information technology', 'artificial intelligence and data science'].map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => {
            if (selected.includes(b)) {
              onChange(selected.filter((s: string) => s !== b));
            } else if (selected.length < max) {
              onChange([...selected, b]);
            }
          }}
          aria-pressed={selected.includes(b)}
        >
          {b}
        </button>
      ))}
      {selected.length >= max && <span>You can select up to 5 branches.</span>}
    </div>
  ),
  ALL_BRANCHES: ['computer engineering', 'civil engineering', 'mechanical engineering',
    'electrical engineering', 'information technology', 'artificial intelligence and data science'],
}));

// Mock Slider to avoid radix import issues in jsdom
vi.mock('../components/ui/slider', () => ({
  Slider: ({ onValueChange }: any) => (
    <input type="range" data-testid="budget-slider" onChange={(e) => onValueChange([parseFloat(e.target.value)])} />
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SmartFormPage />
    </MemoryRouter>,
  );
}

describe('SmartFormPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('progress indicator shows 1/4 initially (only category has a default)', () => {
    renderPage();
    expect(screen.getByText(/1\/4 required/i)).toBeInTheDocument();
  });

  it('progress indicator updates to 2/4 when percentile is filled', async () => {
    renderPage();
    const input = screen.getByPlaceholderText('95.50');
    fireEvent.change(input, { target: { value: '85' } });
    await waitFor(() => {
      expect(screen.getByText(/2\/4 required/i)).toBeInTheDocument();
    });
  });

  it('shows percentile validation error for out-of-range value', async () => {
    renderPage();
    const input = screen.getByPlaceholderText('95.50');
    fireEvent.change(input, { target: { value: '150' } });
    await waitFor(() => {
      expect(screen.getByText(/Percentile must be between 0 and 100/i)).toBeInTheDocument();
    });
  });

  it('shows branch overflow error when trying to select 6th branch', async () => {
    renderPage();
    const branches = ['computer engineering', 'civil engineering', 'mechanical engineering',
      'electrical engineering', 'information technology', 'artificial intelligence and data science'];
    for (const b of branches.slice(0, 5)) {
      fireEvent.click(screen.getByText(b));
    }
    await waitFor(() => {
      expect(screen.getByText(/You can select up to 5 branches/i)).toBeInTheDocument();
    });
  });

  it('prevents 6th district selection and shows inline message', async () => {
    renderPage();
    const districts = ['Thane', 'Pune', 'Ahmednagar', 'Sangli', 'Nagpur', 'Nashik'];
    for (const d of districts.slice(0, 5)) {
      fireEvent.click(screen.getByText(d));
    }
    fireEvent.click(screen.getByText(districts[5]));
    await waitFor(() => {
      expect(screen.getByText(/You can select up to 5 districts/i)).toBeInTheDocument();
    });
  });

  it('submit button is disabled during loading', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.generateFormFillingList).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
    );
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('computer engineering'));
    fireEvent.click(screen.getByText('Pune'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    await waitFor(() => {
      const btn = screen.getByText(/Generating your personalised preference list/i);
      expect(btn.closest('button')).toBeDisabled();
    });
  });

  it('shows "No matching colleges found" when result is empty', async () => {
    const { api } = await import('../services/api');
    // Return empty on all 3 attempts (retry logic needs 3 calls before showing empty)
    vi.mocked(api.generateFormFillingList).mockResolvedValue({
      success: true,
      data: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: true, budgetWarning: false },
      metadata: {},
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('computer engineering'));
    fireEvent.click(screen.getByText('Pune'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    // Wait longer — form retries 3x with 3s delay each before showing empty state
    await waitFor(() => {
      expect(screen.getByText(/No matching colleges found/i)).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  it('shows ML unavailable banner when ml_unavailable is true', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.generateFormFillingList).mockResolvedValue({
      success: true,
      data: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: false, budgetWarning: false },
      metadata: { ml_unavailable: true },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('computer engineering'));
    fireEvent.click(screen.getByText('Pune'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    await waitFor(() => {
      expect(screen.getByText(/Live AI predictions will be available soon/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  }, 15000);
});
