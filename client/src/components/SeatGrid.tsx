interface SeatGridProps {
  total: number;
  booked: Set<number>;
  selected: number[];
  onToggle: (seat: number) => void;
}

export function SeatGrid({ total, booked, selected, onToggle }: SeatGridProps) {
  const seats = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 sm:gap-3">
      {seats.map((seat) => {
        const isBooked = booked.has(seat);
        const isSelected = selected.includes(seat);

        let seatClass =
          "aspect-square rounded-md text-xs font-bold transition-all duration-200 border flex items-center justify-center ";

        if (isBooked) {
          seatClass += "bg-surface border-border text-text-secondary opacity-50 cursor-not-allowed";
        } else if (isSelected) {
          seatClass += "bg-primary border-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.4)] scale-105";
        } else {
          seatClass += "bg-surface border-border text-text-secondary hover:border-primary hover:text-primary hover:scale-105";
        }

        return (
          <button
            key={seat}
            className={seatClass}
            onClick={() => !isBooked && onToggle(seat)}
            disabled={isBooked}
            aria-pressed={isSelected}
            aria-label={`Seat ${seat}${isBooked ? ' booked' : ''}`}
          >
            {seat}
          </button>
        );
      })}
    </div>
  );
}
