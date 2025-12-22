import { Link } from 'react-router-dom';
import type { Show } from '../types';
import { formatDate, formatTime } from '../utils/format';

interface Props {
  show: Show;
}

function availability(show: Show) {
  if (typeof show.availableSeats === 'number') return show.availableSeats;
  if (show.bookings?.length) {
    const confirmed = show.bookings.filter((b) => b.status === 'confirmed');
    const used = confirmed.reduce((sum, b) => sum + (b.numSeats || 0), 0);
    return Math.max(0, show.totalSeats - used);
  }
  return show.totalSeats;
}

export function ShowCard({ show }: Props) {
  const available = availability(show);
  const isSoldOut = available === 0;

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-surface border border-border rounded-lg hover:border-primary/50 transition-all duration-300 mb-4">
      {/* Date & Time */}
      <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 min-w-[120px] mb-4 sm:mb-0">
        <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
          {formatDate(show.startTime)}
        </span>
        <span className="text-sm text-text-secondary">
          {formatTime(show.startTime)}
        </span>
      </div>

      {/* Show Details */}
      <div className="flex-1 sm:px-8 mb-4 sm:mb-0">
        <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
          {show.name}
        </h3>
        {show.description && (
          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
            {show.description}
          </p>
        )}
      </div>

      {/* Price & Availability */}
      <div className="flex items-center gap-6 sm:gap-8 min-w-[200px] justify-between sm:justify-end">
        <div className="text-right">
          <div className="text-sm font-medium text-text-primary">
            ₹{Number(show.price || 0).toFixed(2)}
          </div>
          <div className={`text-xs font-medium uppercase tracking-wide mt-1 ${isSoldOut ? 'text-red-400' : 'text-emerald-400'
            }`}>
            {isSoldOut ? 'Sold Out' : `${available} seats`}
          </div>
        </div>

        <Link
          to={`/booking/${show.id}`}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isSoldOut
              ? 'bg-surface border border-border text-text-secondary cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark shadow-[0_0_15px_rgba(99,102,241,0.3)]'
            }`}
          onClick={(e) => isSoldOut && e.preventDefault()}
        >
          {isSoldOut ? 'Unavailable' : 'Book'}
        </Link>
      </div>
    </div>
  );
}
