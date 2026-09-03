import { useCallback } from 'react';
import { BarList } from '../../components/BarList.js';
import { StatCard } from '../../components/StatCard.js';
import { TrendChart } from '../../components/TrendChart.js';
import { ErrorNotice, LoadingRow } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { fetchAdminDashboard } from '../../services/admin.js';
import {
  CERTIFICATION_LABELS,
  formatCount,
  formatPercent,
  INTERACTION_LABELS,
  ROLE_LABELS,
  translate,
} from '../../utils/format.js';

export const AdminDashboardPage = () => {
  const load = useCallback((signal: AbortSignal) => fetchAdminDashboard(signal), []);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  if (isLoading && !data) return <LoadingRow label="Chargement des statistiques…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tableau de bord administrateur</h1>
          <p className="page-header__subtitle">
            État de la plateforme et activité des 30 derniers jours.
          </p>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard label="Profils publiés" value={formatCount(data.totals.totalProfiles)} />
        <StatCard label="Candidats actifs" value={formatCount(data.totals.activeApplicants)} />
        <StatCard label="Recruteurs actifs" value={formatCount(data.totals.totalRecruiters)} />
        <StatCard label="Interactions" value={formatCount(data.totals.totalInteractions)} />
        <StatCard
          label="Taux de certification"
          value={formatPercent(data.certificationRate)}
          hint="Profils ayant terminé le questionnaire"
        />
        <StatCard
          label="En attente de modération"
          value={formatCount(data.totals.pendingModeration)}
          hint="Profils à examiner"
        />
      </div>

      <div className="panel-grid">
        <section className="card panel panel--wide">
          <h2 className="panel__title">Inscriptions par jour</h2>
          <TrendChart
            points={data.signupsLast30Days}
            unitLabel="inscriptions"
            emptyLabel="Aucune inscription sur les 30 derniers jours."
          />
        </section>

        <section className="card panel panel--wide">
          <h2 className="panel__title">Interactions par jour</h2>
          <TrendChart
            points={data.interactionsLast30Days}
            unitLabel="interactions"
            emptyLabel="Aucune interaction sur les 30 derniers jours."
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Comptes par rôle</h2>
          <BarList
            items={data.usersByRole}
            emptyLabel="Aucun compte."
            formatLabel={(label) => translate(ROLE_LABELS, label)}
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Avancement des certifications</h2>
          <BarList
            items={data.profilesByCertificationStatus}
            emptyLabel="Aucun profil."
            formatLabel={(label) => translate(CERTIFICATION_LABELS, label)}
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Types d’interactions</h2>
          <BarList
            items={data.interactionsByType}
            emptyLabel="Aucune interaction."
            formatLabel={(label) => translate(INTERACTION_LABELS, label)}
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Secteurs représentés</h2>
          <BarList items={data.topSectors} emptyLabel="Aucun profil." />
        </section>
      </div>
    </>
  );
};
