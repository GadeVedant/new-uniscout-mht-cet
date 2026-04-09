/**
 * SimilarColleges — internal linking section shown on CollegeDetailPage.
 * Surfaces colleges with similar cutoff range, boosting crawl depth and
 * time-on-site. Links use <a href> (not just navigate) so bots can follow them.
 */
import { useNavigate } from 'react-router-dom';
import { CollegeRecommendation } from '../services/api';

interface SimilarCollegesProps {
  current: CollegeRecommendation;
  all: CollegeRecommendation[];
}

const CUTOFF_WINDOW = 5; // ±5 percentile points
const MAX_SHOWN = 4;

export function SimilarColleges({ current, all }: SimilarCollegesProps) {
  const navigate = useNavigate();

  const similar = all
    .filter(
      (c) =>
        c.id !== current.id &&
        c.branch === current.branch &&
        Math.abs(c.cutoffPercentile - current.cutoffPercentile) <= CUTOFF_WINDOW,
    )
    .sort((a, b) => Math.abs(a.cutoffPercentile - current.cutoffPercentile) - Math.abs(b.cutoffPercentile - current.cutoffPercentile))
    .slice(0, MAX_SHOWN);

  if (similar.length === 0) return null;

  return (
    <section aria-label="Similar colleges" className="mt-6">
      <h2 className="text-lg font-semibold text-white/80 mb-3">Students also viewed</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {similar.map((college) => (
          <li key={college.id}>
            {/* Use <a> so Googlebot can follow the link without JS */}
            <a
              href={`/college/${college.id}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/college/${college.id}`);
              }}
              className="flex flex-col justify-between h-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
            >
              <div>
                <p className="text-sm font-semibold text-white leading-snug">{college.name}</p>
                <p className="text-xs text-cyan-300 mt-0.5">{college.branch}</p>
                <p className="text-xs text-white/50 mt-1">
                  Cutoff: {college.cutoffPercentile} · {college.location}
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                View Details →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
