// A small set of line icons drawn on a 24px grid (1.8px strokes, round caps), so the app needs no icon package.
import type { SVGProps } from 'react'

const PATHS = {
  home: (
    <>
      <path d="M3.5 10.6 12 3.8l8.5 6.8" />
      <path d="M5.8 9v9.4c0 .9.7 1.6 1.6 1.6h3.1v-5.2c0-.6.5-1 1-1h1c.6 0 1 .4 1 1V20h3.1c.9 0 1.6-.7 1.6-1.6V9" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3.2" height="6.5" rx="1.1" />
      <rect x="10.4" y="6.5" width="3.2" height="11" rx="1.1" />
      <rect x="15.3" y="13.5" width="3.2" height="4" rx="1.1" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.4C10.3 5 7.9 4.4 4.5 4.5v13.6c3.4-.1 5.8.5 7.5 1.9 1.7-1.4 4.1-2 7.5-1.9V4.5c-3.4-.1-5.8.5-7.5 1.9Z" />
      <path d="M12 6.4V20" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.6-2-3.4-2.4.9c-.8-.6-1.6-1.1-2.6-1.4L14 2.5h-4l-.4 2.5c-1 .3-1.8.8-2.6 1.4l-2.4-.9-2 3.4 2 1.6c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.6 2 3.4 2.4-.9c.8.6 1.6 1.1 2.6 1.4l.4 2.5h4l.4-2.5c1-.3 1.8-.8 2.6-1.4l2.4.9 2-3.4-2-1.6Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  flame: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.4 2.6-5.3 3.6-8.4.3 1.7 1 2.8 2.1 3.4.4-2.9 1.9-5.3 4-6.9-.3 2.6.7 4.4 2 6.1 1 1.4 1.8 3 1.8 5.1 0 4.5-3.1 6.8-7 6.8Z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 4.8-13.6 15-14-.2 10-5.6 15-13 15-.7 0-1.4-.4-2-1Z" />
      <path d="M5 19c3-4 6-6.5 10-8.5" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13c0-3.8-2.5-6-7-6 0 3.8 2.6 6 7 6Z" />
      <path d="M12 11c0-3.6 2.4-6.4 7-6.4 0 3.9-2.6 6.4-7 6.4Z" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.6 2.6 5-5.3" />
    </>
  ),
  arrowRight: <path d="M5 12h14m-5.5-6 6 6-6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  play: <path d="M8 5.8v12.4c0 .8.9 1.3 1.6.8l9.3-6.2c.6-.4.6-1.2 0-1.6L9.6 5C8.9 4.5 8 5 8 5.8Z" />,
  drop: <path d="M12 3.5s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  volume: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3z" />
      <path d="m16 9.5 5 5m0-5-5 5" />
    </>
  ),
  expand: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
  shrink: <path d="M9 4.5V9H4.5M19.5 9H15V4.5M15 19.5V15h4.5M4.5 15H9v4.5" />,
  cloud: <path d="M7.5 18.5a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.4 3.3 3.3 0 0 1-.5 6.6Z" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  cards: (
    <>
      <rect x="3.5" y="7" width="12" height="13" rx="2.2" />
      <path d="M8.5 4h9.8c1.2 0 2.2 1 2.2 2.2V16" />
    </>
  ),
  swap: <path d="M4.5 8.5h14m-4-4 4 4-4 4M19.5 15.5h-14m4-4-4 4 4 4" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" />
      <circle cx="12" cy="17" r=".4" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r=".4" fill="currentColor" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  sparkle: <path d="M12 3.5c.6 4.4 2.6 6.9 7.5 8.5-4.9 1.6-6.9 4.1-7.5 8.5-.6-4.4-2.6-6.9-7.5-8.5 4.9-1.6 6.9-4.1 7.5-8.5Z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  trend: <path d="m4 16.5 5-5 3.5 3.5L20 7.5M15 7.5h5v5" />,
}

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 22, strokeWidth = 1.8, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
