/**
 * Unit tests for PreferenceEntryCard.
 *
 * Feature: smart-form-filling
 * Task: 16.2
 * Requirements: 8.2, 6.6
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('PreferenceEntryCard', () => {
  it('renders rank number', () => {
    render(<PreferenceEntryCard entry={makeEntry({ rank: 5 })} tierAccent="safe" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders college name', () => {
    render(<PreferenceEntryCard entry={makeEntry()} tierAccent="safe" />);
    expect(screen.getByText('Test College')).toBeInTheDocument();
  });

  it('renders branch name', () => {
    render(<PreferenceEntryCard entry={makeEntry()} tierAccent="safe" />);
    expect(screen.getByText('Computer Engineering')).toBeInTheDocument();
  });

  it('renders cutoff percentile with 1 decimal', () => {
    render(<PreferenceEntryCard entry={makeEntry({ cutoffPercentile: 85.3 })} tierAccent="safe" />);
    expect(screen.getByText(/85\.3/)).toBeInTheDocument();
  });

  it('renders admission band label', () => {
    render(<PreferenceEntryCard entry={makeEntry({ admissionBand: 'Moderate' })} tierAccent="target" />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders admission probability', () => {
    render(<PreferenceEntryCard entry={makeEntry({ admissionProbability: 75 })} tierAccent="safe" />);
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it('renders fees', () => {
    render(<PreferenceEntryCard entry={makeEntry({ fees: '₹50,000' })} tierAccent="safe" />);
    expect(screen.getByText(/₹50,000/)).toBeInTheDocument();
  });

  it('renders entryReason as italic subtitle', () => {
    render(<PreferenceEntryCard entry={makeEntry()} tierAccent="safe" />);
    expect(screen.getByText(/Strong admission probability/)).toBeInTheDocument();
  });

  it('does NOT render raw weightedScore text', () => {
    render(<PreferenceEntryCard entry={makeEntry()} tierAccent="safe" />);
    expect(screen.queryByText(/weightedScore/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.\d{3,}/)).not.toBeInTheDocument();
  });

  it('Safe band gets emerald colour class', () => {
    const { container } = render(<PreferenceEntryCard entry={makeEntry({ admissionBand: 'Safe' })} tierAccent="safe" />);
    expect(container.innerHTML).toContain('emerald');
  });

  it('Moderate band gets amber colour class', () => {
    const { container } = render(<PreferenceEntryCard entry={makeEntry({ admissionBand: 'Moderate' })} tierAccent="target" />);
    expect(container.innerHTML).toContain('amber');
  });

  it('Risky band gets red colour class', () => {
    const { container } = render(<PreferenceEntryCard entry={makeEntry({ admissionBand: 'Risky' })} tierAccent="dream" />);
    expect(container.innerHTML).toContain('red');
  });
});
