import type { ExamConfig } from './ExamLandingPage';

export const JEE_CONFIG: ExamConfig = {
  exam: 'JEE Main & Advanced',
  slug: 'jee-college-predictor',
  shortName: 'JEE',
  title: 'JEE College Predictor 2024 – Find IITs, NITs & GFTIs | UniScout',
  description: 'Predict your JEE Main and JEE Advanced college using your rank and category. Find IITs, NITs, IIITs, and GFTIs with cutoff trends, branch-wise analysis, and admission probability.',
  canonical: 'https://uniscout.in/jee-college-predictor',
  h1: 'JEE College Predictor – Find IITs, NITs & GFTIs',
  subheading: 'Enter your JEE Main or Advanced rank to discover which IITs, NITs, IIITs, and GFTIs you can get into. Cutoff trends, branch-wise analysis, and admission probability — all in one place.',
  colleges: [
    'IIT Bombay – Computer Science',
    'IIT Delhi – Electrical Engineering',
    'NIT Trichy – Mechanical Engineering',
    'NIT Surathkal – Computer Science',
    'IIIT Hyderabad – Computer Science',
    'BITS Pilani – Computer Science',
    'NIT Warangal – Electronics Engineering',
    'IIT Madras – Aerospace Engineering',
  ],
  features: [
    'JEE Main & Advanced rank-based predictions',
    'IIT, NIT, IIIT, and GFTI cutoff trends (3 years)',
    'Branch-wise opening and closing ranks',
    'Home state vs other state quota analysis',
    'Category-wise cutoff (General, OBC, SC, ST, EWS)',
    'Admission probability bands (Safe / Likely / Moderate / Risky)',
  ],
  faqs: [
    {
      q: 'How does the JEE college predictor work?',
      a: 'Enter your JEE Main or Advanced rank and category. UniScout analyzes 3 years of JoSAA cutoff data to predict your admission probability at each IIT, NIT, IIIT, and GFTI.',
    },
    {
      q: 'What is the difference between JEE Main and JEE Advanced cutoffs?',
      a: 'JEE Main cutoffs apply to NITs, IIITs, and GFTIs through JoSAA counseling. JEE Advanced cutoffs apply to IITs. UniScout covers both.',
    },
    {
      q: 'Can I compare colleges across different branches?',
      a: 'Yes. UniScout lets you compare colleges side-by-side across branches, fees, placement packages, and cutoff trends.',
    },
  ],
};

export const NEET_CONFIG: ExamConfig = {
  exam: 'NEET',
  slug: 'neet-college-predictor',
  shortName: 'NEET',
  title: 'NEET College Predictor 2024 – Find MBBS, BDS & AYUSH Colleges | UniScout',
  description: 'Predict your NEET college using your score and rank. Find the best MBBS, BDS, and AYUSH colleges with state-wise cutoffs, fees, and admission probability bands.',
  canonical: 'https://uniscout.in/neet-college-predictor',
  h1: 'NEET College Predictor – Find MBBS & BDS Colleges',
  subheading: 'Enter your NEET score and rank to discover MBBS, BDS, and AYUSH colleges you can get into. State-wise cutoffs, fees, and admission probability — all in one place.',
  colleges: [
    'AIIMS New Delhi – MBBS',
    'JIPMER Puducherry – MBBS',
    'Maulana Azad Medical College – MBBS',
    'Grant Medical College Mumbai – MBBS',
    'BJ Medical College Pune – MBBS',
    'Seth GS Medical College Mumbai – MBBS',
    'AFMC Pune – MBBS',
    'Kasturba Medical College Manipal – MBBS',
  ],
  features: [
    'NEET score and rank-based predictions',
    'State quota vs All India quota cutoffs',
    'MBBS, BDS, and AYUSH college coverage',
    'Government vs private college comparison',
    'Category-wise cutoffs (General, OBC, SC, ST, EWS)',
    'Fees and bond policy information',
  ],
  faqs: [
    {
      q: 'How does the NEET college predictor work?',
      a: 'Enter your NEET score, rank, and category. UniScout analyzes previous year cutoffs to predict your admission chances at government and private medical colleges.',
    },
    {
      q: 'What is the difference between state quota and All India quota for NEET?',
      a: '15% of seats in government medical colleges are filled through All India Quota (AIQ) counseling. The remaining 85% are filled through state quota counseling. Cutoffs differ significantly between the two.',
    },
    {
      q: 'Does UniScout cover deemed universities for NEET?',
      a: 'Yes. UniScout covers government colleges, private colleges, and deemed universities accepting NEET scores.',
    },
  ],
};

export const CAT_CONFIG: ExamConfig = {
  exam: 'CAT',
  slug: 'cat-college-predictor',
  shortName: 'CAT',
  title: 'CAT College Predictor 2024 – Find IIMs & Top MBA Colleges | UniScout',
  description: 'Predict your CAT college using your percentile and profile. Find IIMs, FMS, XLRI, and top MBA colleges with cutoff percentiles, fees, and admission probability.',
  canonical: 'https://uniscout.in/cat-college-predictor',
  h1: 'CAT College Predictor – Find IIMs & Top MBA Colleges',
  subheading: 'Enter your CAT percentile to discover IIMs, FMS, XLRI, and other top MBA colleges you can target. Cutoff percentiles, fees, placement packages, and admission probability.',
  colleges: [
    'IIM Ahmedabad – MBA',
    'IIM Bangalore – MBA',
    'IIM Calcutta – MBA',
    'FMS Delhi – MBA',
    'XLRI Jamshedpur – PGDM',
    'MDI Gurgaon – PGDM',
    'IIM Lucknow – MBA',
    'SPJIMR Mumbai – PGDM',
  ],
  features: [
    'CAT percentile-based college predictions',
    'IIM, FMS, XLRI, and top B-school coverage',
    'Cutoff percentile trends (3 years)',
    'Profile-based shortlisting (academics + work experience)',
    'Category-wise cutoffs (General, NC-OBC, SC, ST, EWS, PWD)',
    'Fees and average placement package comparison',
  ],
  faqs: [
    {
      q: 'How does the CAT college predictor work?',
      a: 'Enter your CAT percentile, academic profile, and work experience. UniScout analyzes previous year cutoffs and shortlisting criteria to predict your chances at IIMs and top B-schools.',
    },
    {
      q: 'Does CAT percentile alone determine admission?',
      a: 'No. Most IIMs and top B-schools use a composite score including CAT percentile, academic performance (10th, 12th, graduation), work experience, and diversity factors.',
    },
    {
      q: 'Which MBA colleges accept CAT scores?',
      a: 'All 20 IIMs, FMS Delhi, MDI Gurgaon, SPJIMR Mumbai, XLRI (via XAT), and 100+ other B-schools accept CAT scores.',
    },
  ],
};
