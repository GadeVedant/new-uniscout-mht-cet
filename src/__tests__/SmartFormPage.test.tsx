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

  it('default CAP round is "I"', () => {
    renderPage();
    const select = screen.getByLabelText(/CAP Round/i) as HTMLSelectElement;
    expect(select.value).toBe('I');
  });

  it('progress indicator shows 2/4 initially (category and capRound have defaults)', () => {
    renderPage();
    expect(screen.getByText(/2\/4 required/i)).toBeInTheDocument();
  });

  it('progress indicator updates to 3/4 when percentile is filled', async () => {
    renderPage();
    const input = screen.getByPlaceholderText('95.50');
    fireEvent.change(input, { target: { value: '85' } });
    await waitFor(() => {
      expect(screen.getByText(/3\/4 required/i)).toBeInTheDocument();
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
    const branches = ['Artificial Intelligence and Data Science', 'Artificial Intelligence and Machine Learning', 'Civil Engineering', 'Computer Engineering', 'Computer Science and Engineering', 'Electrical Engineering'];
    for (const b of branches.slice(0, 5)) {
      fireEvent.click(screen.getByText(b));
    }
    // Try to select 6th
    fireEvent.click(screen.getByText(branches[5]));
    await waitFor(() => {
      expect(screen.getByText(/You can select up to 5 branches/i)).toBeInTheDocument();
    });
  });

  it('prevents 4th district selection and shows inline message', async () => {
    renderPage();
    const districts = ['Thane', 'Pune', 'Ahmednagar', 'Sangli'];
    for (const d of districts.slice(0, 3)) {
      fireEvent.click(screen.getByText(d));
    }
    fireEvent.click(screen.getByText(districts[3]));
    await waitFor(() => {
      expect(screen.getByText(/You can select up to 3 districts/i)).toBeInTheDocument();
    });
  });

  it('submit button is disabled during loading', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.generateFormFillingList).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 5000)),
    );
    renderPage();
    // Fill required fields
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('Computer Engineering'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    await waitFor(() => {
      const btn = screen.getByText(/Generating your personalised preference list/i);
      expect(btn.closest('button')).toBeDisabled();
    });
  });

  it('shows "No matching colleges found" when result is empty', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.generateFormFillingList).mockResolvedValue({
      success: true,
      data: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: true, budgetWarning: false },
      metadata: {},
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('Computer Engineering'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    await waitFor(() => {
      expect(screen.getByText(/No matching colleges found/i)).toBeInTheDocument();
    });
  });

  it('shows ML unavailable banner when ml_unavailable is true', async () => {
    const { api } = await import('../services/api');
    vi.mocked(api.generateFormFillingList).mockResolvedValue({
      success: true,
      data: { safePicks: [], targetPicks: [], dreamPicks: [], mlAvailable: false, budgetWarning: false },
      metadata: { ml_unavailable: true },
    });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText('95.50'), { target: { value: '85' } });
    fireEvent.click(screen.getByText('Computer Engineering'));
    fireEvent.click(screen.getByText('Generate Form Filling List'));
    await waitFor(() => {
      expect(screen.getByText(/AI predictions are temporarily unavailable/i)).toBeInTheDocument();
    });
  });
});
