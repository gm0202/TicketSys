import { useShows } from '../hooks/useShows';
import { ShowCard } from '../components/ShowCard';

export function HomePage() {
  const { data, isLoading, isError, error } = useShows();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-text-secondary text-sm font-medium uppercase tracking-widest">Loading Shows...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
        {error instanceof Error ? error.message : 'Failed to load shows'}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 border-b border-border pb-6">
        <h1 className="text-3xl font-bold text-text-primary">Upcoming Events</h1>
        <p className="mt-2 text-text-secondary">Select an event to proceed with booking.</p>
      </div>

      <div className="space-y-4">
        {data?.length === 0 && (
          <div className="text-center py-12 text-text-secondary bg-surface rounded-lg border border-border">
            No shows available at this time.
          </div>
        )}
        {data?.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>
    </div>
  );
}
