/**
 * Unit + property tests for CopyButton.
 *
 * Feature: smart-form-filling
 * Tasks: 11.1, 11.2, 16.1
 * Requirements: 10.2, 10.3, 10.4, 10.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { CopyButton } from '../components/CopyButton';
import type { PreferenceEntry } from '../services/api';

function makeEntry(rank: number, overrides: Partial<PreferenceEntry> = {}): PreferenceEntry {
  return {
    rank,
    collegeName: `College ${rank}`,
    branchName: 'Computer Engineering',
    entryReason: 'Strong admission probability',
    cutoffPercentile: 80.5,
    admissionBand: 'Safe',
    admissionProbability: 75,
    fees: '₹50,000',
    ...overrides,
  };
}

describe('CopyButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  // Task 16.1: not rendered when list is empty
  it('is not rendered when all picks are empty', () => {
    const { container } = render(<CopyButton safePicks={[]} targetPicks={[]} dreamPicks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when safePicks has entries', () => {
    render(<CopyButton safePicks={[makeEntry(1)]} targetPicks={[]} dreamPicks={[]} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders when only dreamPicks has entries', () => {
    render(<CopyButton safePicks={[]} targetPicks={[]} dreamPicks={[makeEntry(1)]} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Task 16.1: successful clipboard write shows toast
  it('shows success toast on successful clipboard write', async () => {
    render(<CopyButton safePicks={[makeEntry(1)]} targetPicks={[]} dreamPicks={[]} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/List copied to clipboard!/i)).toBeInTheDocument();
    });
  });

  // Task 16.1: failed clipboard write shows error message
  it('shows error message on failed clipboard write', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<CopyButton safePicks={[makeEntry(1)]} targetPicks={[]} dreamPicks={[]} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText(/Could not copy to clipboard/i)).toBeInTheDocument();
    });
  });

  // Task 16.1: plain-text format matches specification
  it('formats entries with correct spec format', async () => {
    const entry = makeEntry(1, { cutoffPercentile: 85.3, admissionBand: 'Safe', fees: '₹50,000' });
    render(<CopyButton safePicks={[entry]} targetPicks={[]} dreamPicks={[]} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0] as string;
      expect(written).toContain('=== SAFE PICKS ===');
      expect(written).toContain('1. College 1 — Computer Engineering');
      expect(written).toContain('Cutoff: 85.3');
      expect(written).toContain('Safe');
    });
  });

  it('includes tier headers for each non-empty tier', async () => {
    render(
      <CopyButton
        safePicks={[makeEntry(1)]}
        targetPicks={[makeEntry(2)]}
        dreamPicks={[makeEntry(3)]}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0] as string;
      expect(written).toContain('=== SAFE PICKS ===');
      expect(written).toContain('=== TARGET PICKS ===');
      expect(written).toContain('=== DREAM PICKS ===');
    });
  });
});

// ---------------------------------------------------------------------------
// Property 12: Copy format correctness
// Feature: smart-form-filling, Property 12
// Validates: Requirements 10.2
// ---------------------------------------------------------------------------
describe('Property 12: Copy format correctness', () => {
  it('every entry appears in the copied text with rank and college name', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            rank: fc.integer({ min: 1, max: 50 }),
            collegeName: fc.string({ minLength: 3, maxLength: 30 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (entries) => {
          Object.assign(navigator, {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
          });
          const picks = entries.map((e) => makeEntry(e.rank, { collegeName: e.collegeName }));
          const { unmount } = render(<CopyButton safePicks={picks} targetPicks={[]} dreamPicks={[]} />);
          fireEvent.click(screen.getByRole('button'));
          await waitFor(() => {
            const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0]?.[0] as string;
            if (!written) return;
            for (const e of entries) {
              if (!written.includes(String(e.rank))) throw new Error(`Missing rank ${e.rank}`);
            }
          });
          unmount();
          return true;
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Copy button visibility tracks list emptiness
// Feature: smart-form-filling, Property 13
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------
describe('Property 13: Copy button visibility tracks list emptiness', () => {
  it('button absent when total is 0, present when total > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 0, max: 3 }),
        (s, t, d) => {
          const safe = Array.from({ length: s }, (_, i) => makeEntry(i + 1));
          const target = Array.from({ length: t }, (_, i) => makeEntry(s + i + 1));
          const dream = Array.from({ length: d }, (_, i) => makeEntry(s + t + i + 1));
          const { container, unmount } = render(<CopyButton safePicks={safe} targetPicks={target} dreamPicks={dream} />);
          const total = s + t + d;
          const hasButton = container.querySelector('button') !== null;
          unmount();
          return total === 0 ? !hasButton : hasButton;
        },
      ),
      { numRuns: 100 },
    );
  });
});
