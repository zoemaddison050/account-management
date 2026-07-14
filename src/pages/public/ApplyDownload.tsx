import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import SignaturePad, { type SignaturePadHandle } from '../../components/SignaturePad';
import { getApplicationDraft } from '../../lib/applicationFlow';
import { downloadApplicationPdf } from '../../lib/applicationPdf';
import { loadSignatureImage, COMPANY_SIGNATURE_URL, MANAGER_SIGNATURE_URL } from '../../lib/signatureImage';
import { useManagers } from '../../hooks/useManagers';
import type { AccountManager } from '../../types';
import { isApiConfigured } from '../../lib/api';

async function downloadBlob(url: string, method: 'GET' | 'POST', body?: any, filename?: string) {
  const options: RequestInit = {
    method,
    headers: {
      'Accept': 'application/pdf',
    },
  };
  if (body) {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'Application.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function ApplyDownload() {
  const draft = getApplicationDraft();
  const { managers, error: managersError } = useManagers();
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [sigEmpty, setSigEmpty] = useState(true);
  const [sigDate, setSigDate] = useState('');
  const sigPadRef = useRef<SignaturePadHandle>(null);

  // Static signature images for company and account manager (loaded from public/signatures/)
  const [companySig, setCompanySig] = useState<{ dataUrl: string; aspectRatio: number } | null>(null);
  const [managerSig, setManagerSig] = useState<{ dataUrl: string; aspectRatio: number } | null>(null);

  // Load the real signature PNGs on mount. These are static images provided by
  // the business — the company signature and a representative manager signature.
  useEffect(() => {
    let cancelled = false;
    loadSignatureImage(COMPANY_SIGNATURE_URL).then((result) => {
      if (cancelled || !result) return;
      setCompanySig(result);
    });
    loadSignatureImage(MANAGER_SIGNATURE_URL).then((result) => {
      if (cancelled || !result) return;
      setManagerSig(result);
    });
    return () => { cancelled = true; };
  }, []);

  if (!draft) {
    return (
      <div className="fade-in">
        <section className="section">
          <div className="container-narrow" style={{ textAlign: 'center' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Application Centre · Protected step</p>
            <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>A personalised form has not been prepared</h1>
            <p className="text-soft" style={{ maxWidth: '52ch', margin: '0 auto var(--space-6)' }}>
              This route is unavailable until the short application-details form has been completed.
            </p>
            <Link to="/apply/online" className="btn btn-primary btn-lg">Complete your details</Link>
          </div>
        </section>
      </div>
    );
  }

  // Resolve the selected manager from the API-fetched roster
  const isNoPreference = draft.preferredManager === 'No preference';
  const selectedManager: AccountManager | undefined = isNoPreference
    ? undefined
    : managers.find((m) => m.name === draft.preferredManager);
  const managerDisplayName = isNoPreference ? 'Prime Exchanges' : (selectedManager?.name ?? draft.preferredManager);
  const managerRoleLabel = isNoPreference ? 'Account Management Team' : (selectedManager?.title ?? 'Account Manager');

  const canDownloadSigned = !sigEmpty && sigDate.trim() !== '';

  const handleDownload = async () => {
    setDownloadError(null);
    const signatureDataUrl = sigPadRef.current?.toDataURL() ?? null;
    const dims = sigPadRef.current?.getDimensions() ?? null;
    const aspectRatio = dims && dims.height > 0 ? dims.width / dims.height : undefined;

    const useApi = isApiConfigured && draft.pdfToken;

    if (useApi) {
      try {
        const base = isApiConfigured ? (import.meta.env.VITE_API_BASE_URL || '/api') : '/api';
        const url = `${base}/applications/pdf/${encodeURIComponent(draft.pdfToken || '')}`;
        const filename = `PrimeXchanges-Application-${draft.reference}.pdf`;
        if (canDownloadSigned) {
          await downloadBlob(url, 'POST', { signature: signatureDataUrl, date: sigDate.trim() }, filename);
        } else {
          await downloadBlob(url, 'GET', undefined, filename);
        }
        setDownloaded(true);
      } catch (err) {
        console.error(err);
        setDownloadError('Could not download the server-generated PDF. Please try again.');
      }
    } else {
      downloadApplicationPdf(draft, {
        applicantSignatureDataUrl: signatureDataUrl,
        applicantDate: sigDate.trim() || undefined,
        applicantSignatureAspectRatio: aspectRatio,
        managers,
        companySignatureImage: companySig?.dataUrl ?? null,
        companySignatureAspectRatio: companySig?.aspectRatio,
        managerSignatureImage: managerSig?.dataUrl ?? null,
        managerSignatureAspectRatio: managerSig?.aspectRatio,
      });
      setDownloaded(true);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <div className="fade-in">
      <section className="section">
        <div className="container-narrow">
          <PageHeader
            eyebrow="Application Centre · Form issued"
            title="Your personalised application PDF"
            subtitle="The document below has your submitted name and chosen account manager included. Sign digitally below, then download the completed PDF — no printing or scanning required."
          />

          <div className="card application-document-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="application-document-icon" aria-hidden>
              <span>PDF</span>
            </div>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <span className="badge badge-info" style={{ marginBottom: 'var(--space-3)' }}>
                Application form · v1.0
              </span>
              <h3 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-2)' }}>Account Management Application Worksheet</h3>
              <p className="text-soft" style={{ fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                Prepared for <strong>{draft.firstName} {draft.lastName}</strong> with <strong>{draft.preferredManager}</strong> as the selected account manager.
              </p>
              <p className="mono text-muted" style={{ fontSize: '0.8rem' }}>Reference: {draft.reference}</p>
            </div>
            <button type="button" className="btn btn-primary btn-lg" onClick={handleDownload}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
              {canDownloadSigned ? 'Download signed PDF' : 'Download PDF preview'}
            </button>
          </div>

          {/* Signature overview card */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderTop: '4px solid var(--brand-blue)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Three signatures on this form</h3>
            <p className="text-soft" style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
              The PDF includes three signature areas. The company and your selected account manager signatures are already applied. You only need to add your own signature below — it will be embedded directly into the PDF.
            </p>
            <div className="signature-preview-grid">
              <div className="signature-preview-card signature-prefilled">
                <span className="badge badge-success" style={{ marginBottom: 'var(--space-3)' }}>Signed</span>
                <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>For the company</p>
                {companySig ? (
                  <img
                    src={companySig.dataUrl}
                    alt="Prime Exchanges company signature"
                    className="signature-preview-img"
                    style={{ aspectRatio: companySig.aspectRatio }}
                  />
                ) : (
                  <p style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--navy-800)', marginBottom: 'var(--space-1)' }}>Prime Exchanges</p>
                )}
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>Prime Exchanges Ltd.</p>
                <p className="text-muted" style={{ fontSize: '0.78rem' }}>support@primexchanges.com</p>
              </div>
              <div className="signature-preview-card signature-prefilled">
                <span className="badge badge-success" style={{ marginBottom: 'var(--space-3)' }}>Signed</span>
                <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Account manager</p>
                {managerSig ? (
                  <img
                    src={managerSig.dataUrl}
                    alt={`${managerDisplayName} signature`}
                    className="signature-preview-img"
                    style={{ aspectRatio: managerSig.aspectRatio }}
                  />
                ) : (
                  <p style={{ fontFamily: "'Times New Roman', serif", fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--navy-800)', marginBottom: 'var(--space-1)' }}>{managerDisplayName}</p>
                )}
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>{managerRoleLabel}</p>
              </div>
              <div className={`signature-preview-card ${sigEmpty ? 'signature-blank' : 'signature-signed'}`}>
                <span className={`badge ${sigEmpty ? 'badge-warning' : 'badge-success'}`} style={{ marginBottom: 'var(--space-3)' }}>
                  {sigEmpty ? 'To be signed' : 'Signed ✓'}
                </span>
                <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Applicant (you)</p>
                {sigEmpty ? (
                  <>
                    <div className="signature-blank-line" aria-hidden />
                    <p className="text-muted" style={{ fontSize: '0.82rem' }}>{draft.firstName} {draft.lastName}</p>
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>Sign using the pad below</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '1.15rem', color: 'var(--navy-800)', marginBottom: 'var(--space-1)' }}>✓ Signature captured</p>
                    <p className="text-muted" style={{ fontSize: '0.82rem' }}>{draft.firstName} {draft.lastName}</p>
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>{sigDate || 'Date pending'}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Digital signature pad card */}
          <div className="card signature-pad-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="signature-pad-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-1)' }}>Sign your application</h3>
                <p className="text-soft" style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
                  Draw your signature in the box below using your mouse or finger (on touch devices). When you're ready, enter today's date and download your signed PDF.
                </p>
              </div>
              <span className={`badge ${canDownloadSigned ? 'badge-success' : 'badge-info'}`} style={{ flexShrink: 0 }}>
                {canDownloadSigned ? 'Ready to download' : 'Awaiting signature'}
              </span>
            </div>

            <SignaturePad ref={sigPadRef} onChange={setSigEmpty} height={200} />

            <div className="signature-pad-actions">
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label className="form-label" htmlFor="sigDate">Date of signature <span className="req">*</span></label>
                <input
                  id="sigDate"
                  type="date"
                  className="form-control"
                  value={sigDate}
                  max={todayISO}
                  onChange={(e) => setSigDate(e.target.value)}
                />
                <p className="form-hint">Select the date you are signing this application.</p>
              </div>
              <button
                type="button"
                className={`btn btn-primary btn-lg ${canDownloadSigned ? 'btn-pulse' : ''}`}
                onClick={handleDownload}
                disabled={!canDownloadSigned}
                style={{ alignSelf: 'flex-end' }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
                {canDownloadSigned ? 'Download signed PDF' : 'Sign first to download'}
              </button>
            </div>

            {!sigEmpty && !sigDate && (
              <p className="form-error" style={{ marginTop: 'var(--space-3)' }}>Please enter the date of your signature to download the signed PDF.</p>
            )}
          </div>

          {downloadError && (
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-5)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong>Download failed.</strong> {downloadError}
              </div>
            </div>
          )}

          {managersError && (
            <div className="alert alert-warning" style={{ marginBottom: 'var(--space-5)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong>Manager data unavailable.</strong> Your selected account manager's details could not be loaded from the server. The PDF will use a generic label. You can still download and sign the form.
              </div>
            </div>
          )}

          {downloaded && (
            <div className="alert alert-success" style={{ marginBottom: 'var(--space-5)' }} role="status">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden><path d="M5 13l4 4L19 7" /></svg>
              <div>
                <strong>{canDownloadSigned ? 'Signed PDF created.' : 'PDF preview created.'}</strong>
                {canDownloadSigned
                  ? <> Your signature has been embedded. Email the file to <a href="mailto:support@primexchanges.com" style={{ fontWeight: 600 }}>support@primexchanges.com</a> with your reference number <span className="mono" style={{ fontWeight: 600 }}>{draft.reference}</span>.</>
                  : ' Sign above to generate a signed version.'}
              </div>
            </div>
          )}

          {/* Return instructions */}
          <div className="card" style={{ marginBottom: 'var(--space-6)', borderTop: '4px solid var(--gold-500)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>How to return your signed form</h3>
            {canDownloadSigned ? (
              <ol className="numbered-list" style={{ marginBottom: 'var(--space-5)' }}>
                <li>Click <strong>Download signed PDF</strong> above — your signature is already embedded.</li>
                <li>Save the PDF file to your device.</li>
                <li>Email the signed PDF to <a href="mailto:support@primexchanges.com" style={{ fontWeight: 600 }}>support@primexchanges.com</a> with your reference number <span className="mono" style={{ fontWeight: 600 }}>{draft.reference}</span>.</li>
              </ol>
            ) : (
              <>
                <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0111-18 0 9 9 0 0118 0z" /></svg>
                  <div><strong>Digital signing:</strong> Draw your signature in the pad above and enter the date. The signature will be embedded directly into the PDF — no printing or scanning needed.</div>
                </div>
                <ol className="numbered-list" style={{ marginBottom: 'var(--space-5)' }}>
                  <li>Draw your signature in the signature pad above.</li>
                  <li>Enter the date and click <strong>Download signed PDF</strong>.</li>
                  <li>Email the signed PDF to <a href="mailto:support@primexchanges.com" style={{ fontWeight: 600 }}>support@primexchanges.com</a> with your reference number <span className="mono" style={{ fontWeight: 600 }}>{draft.reference}</span>.</li>
                </ol>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 'var(--space-4)' }}>
                  Prefer to sign by hand? Download the preview, print it, sign the applicant area, scan it, and email it to the address above.
                </p>
              </>
            )}
            <div className="alert alert-danger" style={{ marginBottom: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong>Do not include:</strong> passwords, account credentials, card details, wallet recovery phrases, API keys, or identity documents in your email. A secure upload request is required for sensitive documentation.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link to="/apply/online" className="btn btn-secondary">Edit details</Link>
            <Link to="/apply" className="btn btn-ghost">Back to Application Centre</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
