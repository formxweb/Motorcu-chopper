type P = { size?: number; className?: string };

const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const IconBag = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 8h14l-1.2 12H6.2z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const IconUser = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);

export const IconHeart = ({ size, className, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

export const IconSearch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
);

export const IconMenu = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconShield = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const IconTruck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const IconReturn = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 7L4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
  </svg>
);

export const IconNeedle = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 5L7 17" />
    <path d="M16 4l4 4" />
    <path d="M4 20c2-1 3-1 4-3" />
  </svg>
);

export const IconChat = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 18.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8z" />
  </svg>
);

export const IconStar = ({ size = 16, filled = true }: P & { filled?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden focusable={false} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);

export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
