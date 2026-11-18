/**
 * DataAction — one tile in "Your data": an icon, a short title (the button's
 * name) and a line saying what it does (read as its description).
 */

import { type ReactNode, useId } from 'react'

const ICONS: Record<string, ReactNode> = {
  download: <path d="M12 4v10m0 0-4-4m4 4 4-4M5 19h14" />,
  restore: <path d="M12 15V5m0 0L8 9m4-4 4 4M5 19h14" />,
  'ai-off': (
    <>
      <path d="M12 4.5 13.6 8.4 17.5 10l-3.9 1.6L12 15.5l-1.6-3.9L6.5 10l3.9-1.6z" />
      <path d="M4 4l16 16" />
    </>
  ),
  delete: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />,
}

interface Props {
  icon: keyof typeof ICONS
  title: string
  hint: string
  danger?: boolean
  onClick: () => void
}

export default function DataAction({
  icon,
  title,
  hint,
  danger = false,
  onClick,
}: Props) {
  const id = useId()
  return (
    <button
      type="button"
      className={danger ? 'data-action data-action--danger' : 'data-action'}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-hint`}
      onClick={onClick}
    >
      <span className="data-action__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ICONS[icon]}
        </svg>
      </span>
      <span id={`${id}-title`} className="data-action__title">
        {title}
      </span>
      <span id={`${id}-hint`} className="data-action__hint">
        {hint}
      </span>
    </button>
  )
}
