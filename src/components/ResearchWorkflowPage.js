import React, { useEffect, useMemo, useState } from 'react';
import { Button, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AnalyticsPanel from './analytics/AnalyticsPanel';
import AnalyticsSummaryCard from './analytics/AnalyticsSummaryCard';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
import { downloadCsv } from '../utils/analytics';
import { loadRecentViews } from '../utils/recentViews';
import {
  addResearchWatchlistItem,
  downloadJson,
  loadResearchWatchlist,
  loadSavedResearchViews,
  removeResearchView,
  removeResearchWatchlistItem,
  saveResearchView,
} from '../utils/researchWorkspace';
import { getAllTeamMetadata } from '../utils/teamMetadata';
import './styles/ResearchWorkflowPage.css';

function ResearchWorkflowPage() {
  const [savedViews, setSavedViews] = useState(() => loadSavedResearchViews());
  const [watchlist, setWatchlist] = useState(() => loadResearchWatchlist());
  const [recentViews] = useState(() => loadRecentViews());
  const [watchType, setWatchType] = useState('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [playerOptions, setPlayerOptions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      apiService.getPlayerBatting(SEASONS.CURRENT, { limit: 500 }),
      apiService.getPlayerPitching(SEASONS.CURRENT, { limit: 500 }),
    ]).then(([battingRows, pitchingRows]) => {
      if (cancelled) {
        return;
      }

      const deduped = new Map();
      [...(battingRows || []), ...(pitchingRows || [])].forEach((player) => {
        if (!player?.playerId || deduped.has(player.playerId)) {
          return;
        }

        deduped.set(player.playerId, {
          id: `player:${player.playerId}`,
          label: player.Name,
          subtitle: player.Team,
          path: `/player/${player.playerId}`,
          type: 'player',
        });
      });

      setPlayerOptions(Array.from(deduped.values()).sort((left, right) => left.label.localeCompare(right.label)));
    }).catch(() => {
      if (!cancelled) {
        setPlayerOptions([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const teamOptions = useMemo(
    () =>
      Object.values(getAllTeamMetadata()).map((team) => ({
        id: `team:${team.abbreviation}`,
        label: team.name,
        subtitle: team.abbreviation,
        path: `/team/${team.abbreviation}`,
        type: 'team',
      })),
    []
  );

  const searchableOptions = watchType === 'team' ? teamOptions : playerOptions;
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return searchableOptions.slice(0, 12);
    }

    const normalized = searchTerm.trim().toLowerCase();
    return searchableOptions
      .filter((option) => `${option.label} ${option.subtitle}`.toLowerCase().includes(normalized))
      .slice(0, 12);
  }, [searchTerm, searchableOptions]);

  const handleSaveRecentView = (view) => {
    setSavedViews(saveResearchView(view));
  };

  const exportSavedViewsCsv = () => {
    downloadCsv(
      'research-saved-views.csv',
      [
        { label: 'Label', value: (row) => row.label },
        { label: 'Hint', value: (row) => row.hint || '' },
        { label: 'Category', value: (row) => row.category || '' },
        { label: 'Path', value: (row) => row.path || '' },
        { label: 'Saved At', value: (row) => row.savedAt || '' },
      ],
      savedViews
    );
  };

  const exportWatchlistCsv = () => {
    downloadCsv(
      'research-watchlist.csv',
      [
        { label: 'Type', value: (row) => row.type },
        { label: 'Label', value: (row) => row.label },
        { label: 'Subtitle', value: (row) => row.subtitle || '' },
        { label: 'Path', value: (row) => row.path || '' },
        { label: 'Saved At', value: (row) => row.savedAt || '' },
      ],
      watchlist
    );
  };

  return (
    <Container fluid="xl" className="research-workflow-page py-4 px-3 px-md-4">
      <div className="research-workflow-header mb-4">
        <div>
          <div className="research-workflow-eyebrow">Analytics workspace</div>
          <h2 className="mb-1">Research Workflow</h2>
          <p className="text-muted mb-0">
            Save analysis views, maintain a watchlist, and export notebook-friendly research artifacts.
          </p>
        </div>
        <div className="research-workflow-actions">
          <Button as={Link} to="/scenario-simulator" variant="outline-secondary" size="sm">
            Back to Simulator
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={() => downloadJson('research-saved-views.json', savedViews)}>
            Export views JSON
          </Button>
          <Button variant="primary" size="sm" onClick={() => downloadJson('research-watchlist.json', watchlist)}>
            Export watchlist JSON
          </Button>
        </div>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <AnalyticsSummaryCard
            label="Saved views"
            value={savedViews.length}
            meta="Pinned research routes"
            accent="blue"
          />
        </Col>
        <Col xs={12} md={4}>
          <AnalyticsSummaryCard
            label="Watchlist items"
            value={watchlist.length}
            meta="Teams and players under review"
            accent="green"
          />
        </Col>
        <Col xs={12} md={4}>
          <AnalyticsSummaryCard
            label="Recent views"
            value={recentViews.length}
            meta="Available to promote into research"
            accent="gold"
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <AnalyticsPanel
            title="Saved research views"
            subtitle="One-click snapshots from the analyst modules."
            actions={
              <Button variant="outline-secondary" size="sm" onClick={exportSavedViewsCsv} disabled={!savedViews.length}>
                Export CSV
              </Button>
            }
          >
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>View</th>
                    <th>Category</th>
                    <th>Saved</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {savedViews.length ? savedViews.map((view) => (
                    <tr key={view.id}>
                      <td>
                        <div className="fw-semibold">{view.label}</div>
                        <div className="text-muted small">{view.hint || view.path}</div>
                      </td>
                      <td>{view.category}</td>
                      <td>{view.savedAt ? new Date(view.savedAt).toLocaleString() : '—'}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <Button as={Link} to={view.path} variant="outline-primary" size="sm">Open</Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setSavedViews(removeResearchView(view.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-muted text-center py-4">No saved views yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </AnalyticsPanel>
        </Col>
        <Col xl={5}>
          <AnalyticsPanel
            title="Recent views"
            subtitle="Promote recently visited routes into your saved research stack."
          >
            <div className="research-workflow-list">
              {recentViews.length ? recentViews.map((view) => (
                <div key={view.path} className="research-workflow-list-item">
                  <div>
                    <div className="fw-semibold">{view.icon} {view.label}</div>
                    <div className="text-muted small">{view.hint}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button as={Link} to={view.path} variant="outline-primary" size="sm">Open</Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleSaveRecentView(view)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-muted">No recent views available yet.</div>
              )}
            </div>
          </AnalyticsPanel>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <AnalyticsPanel
            title="Watchlist builder"
            subtitle="Add teams or players you want to keep in the active research loop."
          >
            <div className="research-workflow-builder">
              <Form.Select value={watchType} onChange={(event) => setWatchType(event.target.value)}>
                <option value="team">Team</option>
                <option value="player">Player</option>
              </Form.Select>
              <Form.Control
                type="search"
                placeholder={watchType === 'team' ? 'Search team' : 'Search player or club'}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="research-workflow-list mt-3">
              {filteredOptions.map((option) => (
                <div key={option.id} className="research-workflow-list-item">
                  <div>
                    <div className="fw-semibold">{option.label}</div>
                    <div className="text-muted small">{option.subtitle}</div>
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setWatchlist(addResearchWatchlistItem(option))}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </AnalyticsPanel>
        </Col>
        <Col xl={6}>
          <AnalyticsPanel
            title="Research watchlist"
            subtitle="Pinned entities for team pages, player pages, and follow-up analysis."
            actions={
              <Button variant="outline-secondary" size="sm" onClick={exportWatchlistCsv} disabled={!watchlist.length}>
                Export CSV
              </Button>
            }
          >
            <div className="research-workflow-list">
              {watchlist.length ? watchlist.map((item) => (
                <div key={item.id} className="research-workflow-list-item">
                  <div>
                    <div className="fw-semibold">{item.label}</div>
                    <div className="text-muted small">{item.subtitle}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button as={Link} to={item.path} variant="outline-primary" size="sm">Open</Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setWatchlist(removeResearchWatchlistItem(item.id))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="text-muted">No watchlist items yet.</div>
              )}
            </div>
          </AnalyticsPanel>
        </Col>
      </Row>
    </Container>
  );
}

export default ResearchWorkflowPage;
