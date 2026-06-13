/**
 * Tabs — an accessible ARIA tablist for switching between the app's surfaces.
 * Generic over the caller's tab id union so it stays type-safe.
 */

export interface TabItem<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: Props<T>) {
  return (
    <nav className="tabs" aria-label="Sections">
      <div role="tablist" style={{ display: 'contents' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            className="tab"
            id={`tab-${id}`}
            role="tab"
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
