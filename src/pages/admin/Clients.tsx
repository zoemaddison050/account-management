import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import type { Client, AccountManager, Portfolio, Holding, ClientDocument, ActivityEvent, SupportMessage } from '../../types';
import {
  getAdminClients,
  getAdminManagers,
  deleteAdminClient,
  getAdminClientDetail,
  updateAdminClientPortfolioData,
  getAdminClientSupportMessages,
  type AdminClientDetail
} from '../../lib/api';
import { formatCurrency, formatDate } from '../../data/mockData';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('All');
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Drawer & detail states
  const [selected, setSelected] = useState<Client | null>(null);
  const [details, setDetails] = useState<AdminClientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolios' | 'documents' | 'activity' | 'messages'>('portfolios');
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);

  // Local state copy for editing
  const [localPortfolios, setLocalPortfolios] = useState<Portfolio[]>([]);
  const [localDocuments, setLocalDocuments] = useState<ClientDocument[]>([]);
  const [localActivities, setLocalActivities] = useState<ActivityEvent[]>([]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      getAdminClients(),
      getAdminManagers()
    ])
      .then(([clientData, managerData]) => {
        setClients(clientData);
        setManagers(managerData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load data.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (details) {
      try {
        setLocalPortfolios(JSON.parse(details.portfoliosJson));
        setLocalDocuments(JSON.parse(details.documentsJson));
        setLocalActivities(JSON.parse(details.activityJson));
      } catch (e) {
        setLocalPortfolios([]);
        setLocalDocuments([]);
        setLocalActivities([]);
      }
    } else {
      setLocalPortfolios([]);
      setLocalDocuments([]);
      setLocalActivities([]);
    }
  }, [details]);

  const handleSelectClient = async (client: Client) => {
    setSelected(client);
    setDetails(null);
    setSupportMessages([]);
    setError('');
    setActiveTab('portfolios');
    try {
      const [data, msgs] = await Promise.all([
        getAdminClientDetail(client.id),
        getAdminClientSupportMessages(client.id)
      ]);
      setDetails(data);
      setSupportMessages(msgs);
    } catch (err) {
      setError('Unable to load client details.');
    }
  };

  const handleDeleteClient = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to delete client "${selected.name}"? This will permanently delete their access and data.`)) {
      return;
    }
    setSaving(true);
    try {
      await deleteAdminClient(selected.id);
      setSelected(null);
      setDetails(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete client.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!selected || !details) return;
    setSaving(true);
    setError('');
    try {
      await updateAdminClientPortfolioData(
        details.id,
        JSON.stringify(localPortfolios),
        JSON.stringify(localDocuments),
        JSON.stringify(localActivities)
      );
      // Refresh list to update counts/values
      await loadData();
      // Re-load detail to sync JSON strings
      const updatedDetails = await getAdminClientDetail(details.id);
      setDetails(updatedDetails);
      alert('Client data saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Portfolio actions
  const addPortfolio = () => {
    const newPort: Portfolio = {
      id: `P-${Date.now()}`,
      externalAccountId: `ACC-${Math.floor(100000 + Math.random() * 900000)}`,
      name: 'New Custom Portfolio',
      currency: 'USD',
      totalValue: 0,
      valuationBasis: 'Closing price',
      asOf: new Date().toISOString(),
      syncStatus: 'ok',
      lastSync: new Date().toISOString(),
      holdings: []
    };
    setLocalPortfolios([...localPortfolios, newPort]);
  };

  const updatePortfolioField = (portId: string, field: keyof Portfolio, value: any) => {
    setLocalPortfolios(prev =>
      prev.map(p => {
        if (p.id !== portId) return p;
        const updated = { ...p, [field]: value };
        if (field === 'holdings') {
          // Re-calculate totalValue based on holdings sum
          const sum = (value as Holding[]).reduce((s, h) => s + (Number(h.value) || 0), 0);
          updated.totalValue = sum;
        }
        return updated;
      })
    );
  };

  const deletePortfolio = (portId: string) => {
    if (window.confirm('Delete this portfolio and all its holdings?')) {
      setLocalPortfolios(prev => prev.filter(p => p.id !== portId));
    }
  };

  // Holdings actions
  const addHolding = (portId: string) => {
    const newHolding: Holding = {
      id: `H-${Date.now()}`,
      instrument: 'Stocks (AAPL)',
      type: 'Equity',
      quantity: 0,
      value: 0,
      allocationPct: 0,
      currency: 'USD'
    };
    const p = localPortfolios.find(port => port.id === portId);
    if (!p) return;
    const updatedHoldings = [...p.holdings, newHolding];
    updatePortfolioField(portId, 'holdings', updatedHoldings);
  };

  const updateHoldingField = (portId: string, holdingId: string, field: keyof Holding, value: any) => {
    const p = localPortfolios.find(port => port.id === portId);
    if (!p) return;
    const updatedHoldings = p.holdings.map(h => {
      if (h.id !== holdingId) return h;
      return { ...h, [field]: value };
    });
    updatePortfolioField(portId, 'holdings', updatedHoldings);
  };

  const deleteHolding = (portId: string, holdingId: string) => {
    const p = localPortfolios.find(port => port.id === portId);
    if (!p) return;
    const updatedHoldings = p.holdings.filter(h => h.id !== holdingId);
    updatePortfolioField(portId, 'holdings', updatedHoldings);
  };

  // Documents actions
  const addDocument = () => {
    const newDoc: ClientDocument = {
      id: `DOC-${Date.now()}`,
      name: 'Statement_Q2_2026.pdf',
      type: 'Statement',
      version: '1.0',
      publishedAt: new Date().toISOString(),
      sizeLabel: '1.2 MB'
    };
    setLocalDocuments([...localDocuments, newDoc]);
  };

  const updateDocumentField = (docId: string, field: keyof ClientDocument, value: any) => {
    setLocalDocuments(prev => prev.map(d => d.id === docId ? { ...d, [field]: value } : d));
  };

  const deleteDocument = (docId: string) => {
    setLocalDocuments(prev => prev.filter(d => d.id !== docId));
  };

  // Activity actions
  const addActivity = () => {
    const newAct: ActivityEvent = {
      id: `ACT-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'Valuation',
      description: 'Quarterly portfolio valuation updated',
      amount: undefined
    };
    setLocalActivities([...localActivities, newAct]);
  };

  const updateActivityField = (actId: string, field: keyof ActivityEvent, value: any) => {
    setLocalActivities(prev => prev.map(a => a.id === actId ? { ...a, [field]: value } : a));
  };

  const deleteActivity = (actId: string) => {
    setLocalActivities(prev => prev.filter(a => a.id !== actId));
  };

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.reference.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesManager = managerFilter === 'All' || c.managerName === managerFilter;
    return matchesSearch && matchesManager;
  });

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Clients"
        title="Approved Clients"
        subtitle="Directory of approved clients. Access is permission-controlled — an account manager only sees clients explicitly assigned to them."
      />

      {/* Access notice */}
      <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div><strong>RBAC enforced:</strong> This view shows all clients for administrators. Account managers see only their assigned clients. Permission checks happen server-side on every request.</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <input
          type="text"
          id="clientSearch"
          name="clientSearch"
          className="form-control"
          style={{ maxWidth: '300px' }}
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
        <select className="form-control" style={{ maxWidth: '220px' }} value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
          <option value="All">All account managers</option>
          {managers.filter((m) => m.status !== 'inactive').map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>Loading client directory…</p>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Client</th>
                    <th>Account Manager</th>
                    <th>Since</th>
                    <th>Status</th>
                    <th>Portfolios</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleSelectClient(c)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectClient(c); }}
                    >
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--navy-700)' }}>{c.reference}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.78rem', flexShrink: 0 }}>
                            {c.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, color: 'var(--navy-800)' }}>{c.name}</p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{c.managerName}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{formatDate(c.since)}</td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                          {c.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{c.portfolios && c.portfolios.length > 0 ? `${c.portfolios.length} portfolio${c.portfolios.length > 1 ? 's' : ''}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>No clients match your filters.</p>
            )}
          </>
        )}
      </div>

      {/* Edit Client Drawer */}
      {selected && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,48,0.5)', zIndex: 200, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' }}
          onClick={() => { setSelected(null); setDetails(null); }}
        >
          <div
            style={{ width: '800px', maxWidth: '100%', background: 'var(--white)', height: '100%', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', flexShrink: 0 }}>
              <div>
                <p className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-600)' }}>{selected.reference}</p>
                <h2 style={{ fontSize: '1.4rem', marginTop: 'var(--space-1)' }}>Edit Client: {selected.name}</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem' }}>{selected.email}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setDetails(null); }} className="btn btn-ghost" style={{ padding: '0.3rem' }} aria-label="Close panel">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)', flexShrink: 0 }}>
                {error}
              </div>
            )}

            {!details ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', flex: 1 }}>
                <p className="text-muted">Loading client details and portfolio structures...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-4)', flexShrink: 0 }}>
                  {[
                    { id: 'portfolios', label: 'Portfolios & Holdings' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'activity', label: 'Activity Timeline' },
                    { id: 'messages', label: 'Support Messages' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id as any)}
                      style={{
                        padding: '0.6rem 1rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === t.id ? '2px solid var(--navy-800)' : '2px solid transparent',
                        color: activeTab === t.id ? 'var(--navy-800)' : 'var(--ink-soft)',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content area */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  {/* TAB 1: Portfolios */}
                  {activeTab === 'portfolios' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Client Investment Portfolios</h3>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={addPortfolio}>
                          + Add Portfolio
                        </button>
                      </div>

                      {localPortfolios.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-6)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                          <p className="text-muted" style={{ fontSize: '0.9rem' }}>No portfolios exist for this client. Click "+ Add Portfolio" to allocate holdings.</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                          {localPortfolios.map((port) => (
                            <div key={port.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', background: 'var(--navy-50)' }}>
                              {/* Portfolio attributes */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <label className="form-group">
                                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Portfolio Name</span>
                                  <input className="form-control" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }} value={port.name} onChange={(e) => updatePortfolioField(port.id, 'name', e.target.value)} />
                                </label>
                                <label className="form-group">
                                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Account ID</span>
                                  <input className="form-control" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }} value={port.externalAccountId} onChange={(e) => updatePortfolioField(port.id, 'externalAccountId', e.target.value)} />
                                </label>
                                <label className="form-group">
                                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Currency</span>
                                  <select className="form-control" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }} value={port.currency} onChange={(e) => updatePortfolioField(port.id, 'currency', e.target.value)}>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="AUD">AUD</option>
                                    <option value="JPY">JPY</option>
                                  </select>
                                </label>
                                <label className="form-group">
                                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Valuation Basis</span>
                                  <input className="form-control" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }} value={port.valuationBasis} onChange={(e) => updatePortfolioField(port.id, 'valuationBasis', e.target.value)} />
                                </label>
                                <label className="form-group">
                                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Sync Status</span>
                                  <select className="form-control" style={{ fontSize: '0.85rem', padding: '0.35rem 0.6rem' }} value={port.syncStatus} onChange={(e) => updatePortfolioField(port.id, 'syncStatus', e.target.value)}>
                                    <option value="ok">ok (Synched)</option>
                                    <option value="stale">stale (Lagging)</option>
                                    <option value="error">error (Failed)</option>
                                  </select>
                                </label>
                              </div>

                              {/* Holdings Table */}
                              <div style={{ marginBottom: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-800)' }}>Holdings / Allocations</span>
                                  <button type="button" className="btn btn-ghost" style={{ fontSize: '0.78rem', color: 'var(--navy-700)', padding: '2px 8px' }} onClick={() => addHolding(port.id)}>
                                    + Add Holding
                                  </button>
                                </div>

                                <div className="table-wrap" style={{ background: '#fff' }}>
                                  <table className="data" style={{ fontSize: '0.82rem' }}>
                                    <thead>
                                      <tr>
                                        <th>Instrument</th>
                                        <th>Type</th>
                                        <th>Value ({port.currency})</th>
                                        <th>Allocation %</th>
                                        <th></th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {port.holdings.map((hold) => (
                                        <tr key={hold.id}>
                                          <td>
                                            <input className="form-control" style={{ fontSize: '0.8rem', padding: '2px 6px', margin: 0 }} value={hold.instrument} onChange={(e) => updateHoldingField(port.id, hold.id, 'instrument', e.target.value)} />
                                          </td>
                                          <td>
                                            <select className="form-control" style={{ fontSize: '0.8rem', padding: '2px 6px', margin: 0 }} value={hold.type} onChange={(e) => updateHoldingField(port.id, hold.id, 'type', e.target.value)}>
                                              <option value="Equity">Equity</option>
                                              <option value="Bond">Bond</option>
                                              <option value="Fund">Fund</option>
                                              <option value="Cash">Cash</option>
                                              <option value="Commodity">Commodity</option>
                                              <option value="Crypto">Crypto</option>
                                              <option value="Forex">Forex</option>
                                              <option value="Other">Other</option>
                                            </select>
                                          </td>
                                          <td>
                                            <input type="number" className="form-control" style={{ fontSize: '0.8rem', padding: '2px 6px', margin: 0, textAlign: 'right' }} value={hold.value} onChange={(e) => updateHoldingField(port.id, hold.id, 'value', Number(e.target.value))} />
                                          </td>
                                          <td>
                                            <input type="number" className="form-control" style={{ fontSize: '0.8rem', padding: '2px 6px', margin: 0, textAlign: 'right' }} value={hold.allocationPct} onChange={(e) => updateHoldingField(port.id, hold.id, 'allocationPct', Number(e.target.value))} />
                                          </td>
                                          <td className="text-center">
                                            <button type="button" className="btn" style={{ padding: '2px 6px', background: 'var(--danger)', color: 'white', fontSize: '0.75rem', border: 'none' }} onClick={() => deleteHolding(port.id, hold.id)}>
                                              Remove
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                      {port.holdings.length === 0 && (
                                        <tr>
                                          <td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-3)' }}>No assets in this portfolio. Click "+ Add Holding" to add one.</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Sum values and warning if allocation isn't 100% */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '0.8rem' }}>
                                  <span>Total Portfolio Value: <strong>{formatCurrency(port.totalValue, port.currency)}</strong></span>
                                  {port.holdings.length > 0 && (() => {
                                    const sumPct = port.holdings.reduce((s, h) => s + (Number(h.allocationPct) || 0), 0);
                                    const warningColor = Math.abs(sumPct - 100) > 0.01 ? 'var(--danger)' : 'var(--success)';
                                    return (
                                      <span style={{ color: warningColor, fontWeight: 600 }}>
                                        Allocation Sum: {sumPct.toFixed(1)}% {Math.abs(sumPct - 100) > 0.01 && '(Must be 100%)'}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Delete portfolio button */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
                                <button type="button" className="btn" style={{ fontSize: '0.78rem', background: '#e11d48', color: '#fff', border: 'none', padding: '0.35rem 0.75rem' }} onClick={() => deletePortfolio(port.id)}>
                                  Delete Portfolio Roster
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Documents */}
                  {activeTab === 'documents' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Client Published Documents</h3>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={addDocument}>
                          + Add Document
                        </button>
                      </div>

                      <div className="table-wrap">
                        <table className="data" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Document Name</th>
                              <th>Type</th>
                              <th>Version</th>
                              <th>Size Label</th>
                              <th>Published Date</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {localDocuments.map((doc) => (
                              <tr key={doc.id}>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={doc.name} onChange={(e) => updateDocumentField(doc.id, 'name', e.target.value)} />
                                </td>
                                <td>
                                  <select className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={doc.type} onChange={(e) => updateDocumentField(doc.id, 'type', e.target.value)}>
                                    <option value="Statement">Statement</option>
                                    <option value="Report">Report</option>
                                    <option value="Agreement">Agreement</option>
                                    <option value="Policy">Policy</option>
                                    <option value="Tax">Tax</option>
                                  </select>
                                </td>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px', maxWidth: '60px' }} value={doc.version} onChange={(e) => updateDocumentField(doc.id, 'version', e.target.value)} />
                                </td>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px', maxWidth: '80px' }} value={doc.sizeLabel} onChange={(e) => updateDocumentField(doc.id, 'sizeLabel', e.target.value)} />
                                </td>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={doc.publishedAt} onChange={(e) => updateDocumentField(doc.id, 'publishedAt', e.target.value)} />
                                </td>
                                <td className="text-center">
                                  <button type="button" className="btn" style={{ padding: '4px 8px', background: 'var(--danger)', color: 'white', fontSize: '0.78rem', border: 'none' }} onClick={() => deleteDocument(doc.id)}>
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {localDocuments.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--space-4)' }}>No documents published to this client yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Activity */}
                  {activeTab === 'activity' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Client Activity Timeline</h3>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={addActivity}>
                          + Add Activity Event
                        </button>
                      </div>

                      <div className="table-wrap">
                        <table className="data" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Type</th>
                              <th>Amount (Optional)</th>
                              <th>Timestamp</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {localActivities.map((act) => (
                              <tr key={act.id}>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={act.description} onChange={(e) => updateActivityField(act.id, 'description', e.target.value)} />
                                </td>
                                <td>
                                  <select className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={act.type} onChange={(e) => updateActivityField(act.id, 'type', e.target.value)}>
                                    <option value="Valuation">Valuation</option>
                                    <option value="Statement">Statement</option>
                                    <option value="Allocation change">Allocation change</option>
                                    <option value="Dividend">Dividend</option>
                                    <option value="Fee">Fee</option>
                                    <option value="Sync">Sync</option>
                                  </select>
                                </td>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={act.amount || ''} placeholder="e.g. +$1,420.50" onChange={(e) => updateActivityField(act.id, 'amount', e.target.value || undefined)} />
                                </td>
                                <td>
                                  <input className="form-control" style={{ fontSize: '0.8rem', padding: '4px 8px' }} value={act.date} onChange={(e) => updateActivityField(act.id, 'date', e.target.value)} />
                                </td>
                                <td className="text-center">
                                  <button type="button" className="btn" style={{ padding: '4px 8px', background: 'var(--danger)', color: 'white', fontSize: '0.78rem', border: 'none' }} onClick={() => deleteActivity(act.id)}>
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {localActivities.length === 0 && (
                              <tr>
                                <td colSpan={5} className="text-center text-muted" style={{ padding: 'var(--space-4)' }}>No activities logged for this client yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Support Messages */}
                  {activeTab === 'messages' && (
                    <div>
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Client Support Messages</h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                          These are the messages sent by this client to their assigned account manager. These messages are sent as alerts to <strong>support@primexchanges.com</strong>.
                        </p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {supportMessages.length === 0 ? (
                          <div style={{ padding: 'var(--space-6)', textAlign: 'center', background: 'var(--navy-50)', borderRadius: 'var(--radius)', color: 'var(--ink-muted)' }}>
                            No support messages received from this client.
                          </div>
                        ) : (
                          supportMessages.map((msg) => (
                            <div key={msg.id} style={{ padding: 'var(--space-4)', background: 'var(--navy-50)', borderLeft: '4px solid var(--navy-600)', borderRadius: 'var(--radius)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                <span style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{msg.subject}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{new Date(msg.sentAt).toLocaleString()}</span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{msg.messageBody}</p>
                              <div style={{ marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--ink-muted)', display: 'flex', gap: '12px' }}>
                                <span>Sent To: {msg.managerName || 'Account Manager'}</span>
                                <span>·</span>
                                <span>Status: Forwarded to Support Email</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)', flexShrink: 0 }}>
                  <button type="button" className="btn" style={{ background: 'var(--danger)', color: '#fff', border: 'none', fontSize: '0.88rem' }} onClick={handleDeleteClient} disabled={saving}>
                    Delete Client Record
                  </button>

                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setSelected(null); setDetails(null); }} disabled={saving}>
                      Cancel
                    </button>
                    <button type="button" className="btn btn-primary" onClick={handleSaveChanges} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
