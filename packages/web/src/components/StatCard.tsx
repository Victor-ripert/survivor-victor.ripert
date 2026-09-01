interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
}

export const StatCard = ({ label, value, hint }: StatCardProps) => (
  <div className="card stat-card">
    <span className="stat-card__label">{label}</span>
    <span className="stat-card__value">{value}</span>
    {hint && <span className="stat-card__hint">{hint}</span>}
  </div>
);
