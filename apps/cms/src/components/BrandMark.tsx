// The brand mark in the admin's Root System colorway (GDW-058): verdigris
// branches, ember circuit-roots, currentColor trunk so it reads on both
// themes. The public site keeps the Cedar & Circuitry original.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 180 220"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gdw-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4C897E" />
          <stop offset="0.55" stopColor="#E08D4D" />
          <stop offset="1" stopColor="#4C897E" />
        </linearGradient>
      </defs>
      <g transform="translate(18 16)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M72 0 L72 142" stroke="currentColor" strokeWidth="6" />
        <path
          d="M72 10 C55 29 46 40 28 50 M72 10 C89 29 98 40 116 50"
          stroke="#4C897E"
          strokeWidth="5"
        />
        <path
          d="M72 35 C50 55 36 68 12 80 M72 35 C94 55 108 68 132 80"
          stroke="#4C897E"
          strokeWidth="5"
        />
        <path
          d="M72 65 C48 86 31 101 4 115 M72 65 C96 86 113 101 140 115"
          stroke="#4C897E"
          strokeWidth="5"
        />
        <path
          d="M72 96 C51 113 34 124 15 135 M72 96 C93 113 110 124 129 135"
          stroke="#4C897E"
          strokeWidth="5"
        />
        <path
          d="M72 142 L72 172 M72 172 H38 V196 M72 172 H106 V196 M54 156 H18 V180 H0 M90 156 H126 V180 H144"
          stroke="url(#gdw-mark-gradient)"
          strokeWidth="4"
        />
        <circle cx="0" cy="180" r="5" fill="#4C897E" stroke="none" />
        <circle cx="38" cy="196" r="5" fill="#E08D4D" stroke="none" />
        <circle cx="106" cy="196" r="5" fill="#E08D4D" stroke="none" />
        <circle cx="144" cy="180" r="5" fill="#4C897E" stroke="none" />
        <circle cx="72" cy="172" r="5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
