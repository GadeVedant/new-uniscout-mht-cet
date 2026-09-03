/**
 * Unit tests for PreferenceEntryCard.
 *
 * Feature: smart-form-filling
 * Task: 16.2
 * Requirements: 8.2, 6.6
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PreferenceEntryCard } from '../components/PreferenceEntryCard';
import type { PreferenceEntry } from '../services/api';

function makeEntry(overrides: Partial<PreferenceEntry> = {}): PreferenceEntry {
  return {
    rank: 1,
    collegeName: 'Test College',
    branchName: 'Computer Engineering',
    entryReason: 'Strong admission probability and college prestige',
    cutoffPercentile: 85.3,
    admissionBand: 'Safe',
    admissionProbability: 75,
    fees: '₹50,000',
    ...overrides,
  };
}

// Wrap with router since PreferenceEntryCard uses useNavigate
function renderCard(entry: PreferenceEntry, tierAccent: 'safe' | 'target' | 'dream') {
  return render(
    <MemoryRouter>
      <PreferenceEntryCard entry={entry} tierAccent={tierAccent} />
    </MemoryRouter>,
  );
}

describe('PreferenceEntryCard', () => {
  it('renders rank number', () => {
    renderCard(makeEntry({ rank: 5 }), 'safe');
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders college name', () => {
    renderCard(makeEntry(), 'safe');
    expect(screen.getByText('Test College')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    renderCard(makeEntry(), 'safe');
    expect(screen.getByText('Computer Engineering')).toBeInTheDocument();
  });

  it('renders cutoff percentile with 1 decimal', () => {
    renderCard(makeEntry({ cutoffPercentile: 85.3 }), 'safe');
    expect(screen.getByText(/85\.3/)).toBeInTheDocument();
  });

  it('renders admission band label', () => {
    renderCard(makeEntry({ admissionBand: 'Moderate' }), 'target');
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders admission probability', () => {
    renderCard(makeEntry({ admissionProbability: 75 }), 'safe');
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('renders fees', () => {
    renderCard(makeEntry({ fees: '₹50,000' }), 'safe');
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('renders entryReason as italic subtitle', () => {
    renderCard(makeEntry(), 'safe');
    expect(screen.getByText(/Strong admission probability/)).toBeInTheDocument();
  });

  it('does NOT render raw weightedScore text', () => {
    renderCard(makeEntry(), 'safe');
    expect(screen.queryByText(/weightedScore/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.\d{3,}/)).not.toBeInTheDocument();
  });

  it('Safe band gets emerald colour class', () => {
    const { container } = renderCard(makeEntry({ admissionBand: 'Safe' }), 'safe');
    expect(container.innerHTML).toContain('emerald');
  });

  it('Moderate band gets amber colour class', () => {
    const { container } = renderCard(makeEntry({ admissionBand: 'Moderate' }), 'target');
    expect(container.innerHTML).toContain('amber');
  });

  it('Risky band gets red colour class', () => {
    const { container } = renderCard(makeEntry({ admissionBand: 'Risky' }), 'dream');
    expect(container.innerHTML).toContain('red');
  });
});
