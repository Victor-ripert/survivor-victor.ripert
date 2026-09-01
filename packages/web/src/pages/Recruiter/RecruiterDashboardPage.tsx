import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarList } from '../../components/BarList.js';
import { StatCard } from '../../components/StatCard.js';
import { TrendChart } from '../../components/TrendChart.js';
import { ErrorNotice, LoadingRow } from '../../components/StatusMessages.js';
import { useAsyncResource } from '../../hooks/useAsyncResource.js';
import { fetchRecruiterDashboard } from '../../services/recruiter.js';
import {
  formatCount,
  formatDate,
  formatPercent,
  INTERACTION_LABELS,
  translate,
} from '../../utils/format.js';

export const RecruiterDashboardPage = () => {
  const load = useCallback((signal: AbortSignal) => fetchRecruiterDashboard(signal), []);
  const { data, error, isLoading, reload } = useAsyncResource(load);

  if (isLoading && !data) return <LoadingRow label="Chargement du tableau de bord…" />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tableau de bord recruteur</h1>
          <p className="page-header__subtitle">Votre activité des 30 derniers jours.</p>
        </div>
        <Link className="button button--primary" to="/recruteur/catalogue">
          Parcourir le catalogue
        </Link>
      </header>

      <div className="stat-grid">
        <StatCard
          label="Profils consultés"
          value={formatCount(data.totals.profilesViewed)}
          hint="Candidats distincts, pas nombre de vues"
        />
        <StatCard label="Prises de contact" value={formatCount(data.totals.contactsSent)} />
        <StatCard label="Profils en favori" value={formatCount(data.totals.favorites)} />
        <StatCard
          label="Candidats certifiés"
          value={formatPercent(data.certifiedShare)}
          hint={`Sur ${formatCount(data.totals.applicantsReached)} candidat(s) contacté(s)`}
        />
      </div>

      <div className="panel-grid">
        <section className="card panel panel--wide">
          <h2 className="panel__title">Activité par jour</h2>
          <p className="panel__subtitle">
            Toutes interactions confondues : consultations, favoris et messages.
          </p>
          <TrendChart
            points={data.activityLast30Days}
            unitLabel="interactions"
            emptyLabel="Aucune activité sur les 30 derniers jours."
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Répartition des interactions</h2>
          <BarList
            items={data.interactionsByType}
            emptyLabel="Aucune interaction enregistrée."
            formatLabel={(label) => translate(INTERACTION_LABELS, label)}
          />
        </section>

        <section className="card panel">
          <h2 className="panel__title">Secteurs contactés</h2>
          <BarList
            items={data.topSectorsReached}
            emptyLabel="Vous n'avez encore contacté personne."
          />
        </section>

        <section className="card panel panel--wide">
          <h2 className="panel__title">Derniers messages envoyés</h2>
          {data.recentContacts.length === 0 ? (
            <p className="panel__subtitle">
              Aucun message envoyé pour l’instant.{' '}
              <Link to="/recruteur/catalogue">Trouvez un premier profil</Link>.
            </p>
          ) : (
            <ul className="contact-list">
              {data.recentContacts.map((contact) => (
                <li key={contact.id}>
                  <span className="contact-list__name">
                    {contact.counterpart.firstName} {contact.counterpart.lastName}
                  </span>
                  <span className="contact-list__date">{formatDate(contact.createdAt)}</span>
                  {contact.message && (
                    <span className="contact-list__message">{contact.message}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
};
