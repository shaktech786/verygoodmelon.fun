export function HandDrawnDivider({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      height="8"
      viewBox="0 0 400 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M 0 4 Q 20 2 40 4 T 80 4 T 120 4 T 160 4 T 200 4 T 240 4 T 280 4 T 320 4 T 360 4 T 400 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
        className="text-card-border"
      />
    </svg>
  )
}
