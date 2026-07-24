interface MiniDonutProps {
  percentage: number; // 0-100 achievement
  color: string; // ring color (matches the card's status color)
  notReported?: boolean;
  size?: number;
}

/**
 * Small self-contained SVG ring showing an achievement %. Hand-rolled (no
 * chart lib) to match the SVG-arc approach used by GaugeChart, just as a
 * full circle. The arc starts at 12 o'clock and fills clockwise.
 */
export default function MiniDonut({ percentage, color, notReported = false, size = 76 }: MiniDonutProps) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const arc = notReported ? 0 : (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        {/* Value arc */}
        {!notReported && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            className="transition-all duration-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {notReported ? (
          <span className="text-xs font-medium text-gray-400">—</span>
        ) : (
          <span className="text-base font-bold" style={{ color }}>
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  );
}
