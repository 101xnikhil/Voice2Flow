import React, { useState } from 'react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/auth.js';
import { Sparkles, Info } from 'lucide-react';

interface ConfidencePillProps {
  confidence: number;
  assumptions?: string[];
  className?: string;
}

export const ConfidencePill: React.FC<ConfidencePillProps> = ({
  confidence,
  assumptions = [],
  className,
}) => {
  const { settings } = useAuthStore();
  const [showTooltip, setShowTooltip] = useState(false);

  // If user disabled confidence indicator in settings, do not render
  if (settings?.showConfidence === false) {
    return null;
  }

  const percentage = Math.round(confidence * 100);

  // Styling based on confidence level
  const isHigh = percentage >= 85;
  const isMedium = percentage >= 60 && percentage < 85;

  const colorClass = isHigh
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    : isMedium
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer',
          colorClass,
          className
        )}
        title="Confidence level"
      >
        <Sparkles className="w-3 h-3" />
        <span>{percentage}% confidence</span>
        {assumptions.length > 0 && <Info className="w-2.5 h-2.5 opacity-70 ml-0.5" />}
      </button>

      {/* Assumptions tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl shadow-xl text-xs z-50 pointer-events-none">
          <div className="font-semibold text-[var(--text)] mb-1 flex items-center justify-between">
            <span>Confidence Assessment</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">{percentage}%</span>
          </div>
          {assumptions.length > 0 ? (
            <div>
              <p className="text-[11px] text-[var(--text-muted)] mb-1">Inferred assumptions:</p>
              <ul className="list-disc list-inside text-[11px] text-[var(--text)] space-y-0.5">
                {assumptions.map((a, i) => (
                  <li key={i} className="truncate">
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">
              {isHigh ? 'High confidence match.' : 'Moderate confidence match.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
