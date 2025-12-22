import type { BookingStatus } from '../types';

const statusStyles = {
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  expired: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function BookingStatusBadge({ status }: { status: BookingStatus | 'failed' }) {
  const style = statusStyles[status as BookingStatus] || statusStyles.expired;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} uppercase tracking-wide`}>
      {status}
    </span>
  );
}
