import { useState } from 'react';
import type { DailyCount } from '@profils-actifs/shared';

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 150;
const AXIS_HEIGHT = 20;
const LABEL_HEADROOM = 20;
const BASELINE_Y = VIEW_HEIGHT - AXIS_HEIGHT;
const PLOT_HEIGHT = BASELINE_Y - LABEL_HEADROOM;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 2;

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const formatDay = (isoDay: string): string => dayFormatter.format(new Date(`${isoDay}T00:00:00Z`));

interface TrendChartProps {
  points: DailyCount[];
  /** Names the single series; used by the tooltip and the table alternative. */
  unitLabel: string;
  emptyLabel: string;
}

/**
 * Daily counts as columns. A single series needs no legend — the panel title
 * names it — and only the peak is labelled directly, the rest being available
 * on hover and in the table alternative below.
 */
export const TrendChart = ({ points, unitLabel, emptyLabel }: TrendChartProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...points.map((point) => point.count), 0);

  if (points.length === 0 || max === 0) return <p className="panel__subtitle">{emptyLabel}</p>;

  const slotWidth = VIEW_WIDTH / points.length;
  const barWidth = Math.max(slotWidth - BAR_GAP, 1);
  const peakIndex = points.findIndex((point) => point.count === max);
  const first = points[0];
  const last = points[points.length - 1];
  const active = hovered === null ? null : points[hovered];
  const tooltipLeft = hovered === null ? 0 : ((hovered + 0.5) / points.length) * 100;

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={`${unitLabel} par jour sur ${points.length} jours, maximum ${max}`}
        onMouseLeave={() => setHovered(null)}
      >
        <line className="chart__grid" x1="0" y1={BASELINE_Y} x2={VIEW_WIDTH} y2={BASELINE_Y} />
        {points.map((point, index) => {
          const height =
            point.count === 0 ? 0 : Math.max((point.count / max) * PLOT_HEIGHT, MIN_BAR_HEIGHT);
          const x = index * slotWidth;

          return (
            <g key={point.date}>
              <rect
                className={
                  hovered === null || hovered === index
                    ? 'chart__bar'
                    : 'chart__bar chart__bar--muted'
                }
                x={x}
                y={BASELINE_Y - height}
                width={barWidth}
                height={height}
                rx={Math.min(2, barWidth / 2)}
              />
              <rect
                className="chart__hit"
                x={x}
                y={0}
                width={slotWidth}
                height={BASELINE_Y}
                onMouseEnter={() => setHovered(index)}
              >
                <title>{`${formatDay(point.date)} : ${point.count} ${unitLabel}`}</title>
              </rect>
            </g>
          );
        })}
        {peakIndex >= 0 && (
          <text
            className="chart__value"
            x={Math.min(peakIndex * slotWidth + barWidth / 2, VIEW_WIDTH - 12)}
            y={BASELINE_Y - PLOT_HEIGHT - 6}
            textAnchor="middle"
          >
            {max}
          </text>
        )}
        <text className="chart__label" x="0" y={VIEW_HEIGHT - 4}>
          {formatDay(first.date)}
        </text>
        <text className="chart__label" x={VIEW_WIDTH} y={VIEW_HEIGHT - 4} textAnchor="end">
          {formatDay(last.date)}
        </text>
      </svg>

      {active && (
        <div className="chart-tooltip" style={{ left: `${tooltipLeft}%`, top: 2 }}>
          {formatDay(active.date)} — {active.count} {unitLabel}
        </div>
      )}

      {/* Wrapped in a div: `.visually-hidden` cannot clip a table box on its
          own, and the table would stretch the document past the footer. */}
      <div className="visually-hidden">
        <table>
          <caption>{`${unitLabel} par jour`}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">{unitLabel}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatDay(point.date)}</th>
                <td>{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
