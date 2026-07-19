export function Logo({ className = "brand-mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="34" height="34" rx="8" fill="#fff" stroke="#d5dde8" />
      {/* paper-edge lines */}
      <path d="M10 12h14M10 17h11M10 22h13" stroke="#d5dde8" strokeWidth="1.5" strokeLinecap="round" />
      <text
        x="12"
        y="30"
        fontFamily="Fraunces, Georgia, serif"
        fontSize="16"
        fontWeight="700"
        fill="#1a2332"
      >
        D
      </text>
      {/* teal check wedge */}
      <path
        d="M26 12l5 5-9 9-5-5 2.2-2.2 2.8 2.8L28.8 14.2 26 12z"
        fill="#0f6e56"
      />
    </svg>
  );
}
