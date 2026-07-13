import type { SyncStatus } from '../types';
import { formatDateTime } from '../data/mockData';

interface FreshnessIndicatorProps {
  status: SyncStatus;
  asOf?: string;
  lastSync?: string;
  compact?: boolean;
}

const labels: Record<SyncStatus, string> = {
  ok: 'Verified',
  stale: 'Stale — last verified',
  error: 'Sync error',
};

export default function FreshnessIndicator({ status, asOf, lastSync, compact }: FreshnessIndicatorProps) {
  const timestamp = asOf || lastSync;
  return (
    <span className={`freshness ${status}`} title={timestamp ? formatDateTime(timestamp) : undefined}>
      <span className="dot" />
      {!compact && (timestamp ? `${labels[status]} ${formatDateTime(timestamp)}` : labels[status])}
      {compact && labels[status]}
    </span>
  );
}
