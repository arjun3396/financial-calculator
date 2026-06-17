import React from 'react'
import SWPCalculator from './calculators/swp/SWPCalculator'

const NAV_ITEMS = [
  { id: 'swp', label: 'SWP', ready: true },
  { id: 'sip', label: 'SIP', ready: false },
  { id: 'fire', label: 'FIRE', ready: false },
  { id: 'emi', label: 'EMI', ready: false },
]

export default function App() {
  return (
    <div className="page">
      <header className="site-header">
        <div className="brand">
          <div className="brand-mark">FC</div>
          <div className="brand-text">
            <div className="brand-name">Financial calculators</div>
            <div className="brand-sub">Plain‑english tools for money decisions</div>
          </div>
        </div>
        <nav className="site-nav">
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              className={'nav-item' + (item.id === 'swp' ? ' active' : '') + (!item.ready ? ' disabled' : '')}
              href={'#' + item.id}
              title={!item.ready ? 'Coming soon' : undefined}
            >
              {item.label}
              {!item.ready && <span className="soon">soon</span>}
            </a>
          ))}
        </nav>
      </header>

      <main>
        <SWPCalculator />
      </main>
    </div>
  )
}
