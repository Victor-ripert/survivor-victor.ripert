import type { LabelledCount } from '@profils-actifs/shared';

interface BarListProps {
  items: LabelledCount[];
  emptyLabel: string;
  /** Maps a raw enum value onto the wording shown to the user. */
  formatLabel?: (label: string) => string;
}

/**
 * One measure, one hue, a value written next to every bar: the length carries
 * the comparison and the number carries the precision, so nothing depends on
 * reading a colour.
 */
export const BarList = ({ items, emptyLabel, formatLabel }: BarListProps) => {
  if (items.length === 0) return <p className="panel__subtitle">{emptyLabel}</p>;

  const max = Math.max(...items.map((item) => item.count));

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="bar-row__label" title={formatLabel?.(item.label) ?? item.label}>
            {formatLabel?.(item.label) ?? item.label}
          </span>
          <span className="bar-row__track">
            <span
              className="bar-row__fill"
              style={{ width: `${max === 0 ? 0 : (item.count / max) * 100}%` }}
            />
          </span>
          <span className="bar-row__value">{item.count}</span>
        </div>
      ))}
    </div>
  );
};
