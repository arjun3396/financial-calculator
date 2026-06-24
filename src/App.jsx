import React, { useState } from 'react'
import SWPCalculator from './calculators/swp/SWPCalculator'
import SIPCalculator from './calculators/sip/SIPCalculator'
import FIRECalculator from './calculators/fire/FIRECalculator'
import EMICalculator from './calculators/emi/EMICalculator'
import LVICalculator from './calculators/lvi/LVICalculator'

const NAV_ITEMS = [
  { id: 'swp',  label: 'SWP',  ready: true },
  { id: 'sip',  label: 'SIP',  ready: true },
  { id: 'fire', label: 'FIRE', ready: true },
  { id: 'emi',  label: 'EMI',  ready: true },
  { id: 'lvi',  label: 'Loan vs Invest', ready: true },
]

const CALCULATORS = {
  swp: SWPCalculator,
  sip: SIPCalculator,
  fire: FIRECalculator,
  emi: EMICalculator,
  lvi: LVICalculator,
}

export default function App() {
  const [active, setActive] = useState('swp')
  const ActiveCalc = CALCULATORS[active]

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
              className={
                'nav-item' +
                (active === item.id ? ' active' : '') +
                (!item.ready    ? ' disabled' : '')
              }
              href={'#' + item.id}
              title={!item.ready ? 'Coming soon' : undefined}
              onClick={e => {
                e.preventDefault()
                if (item.ready) setActive(item.id)
              }}
            >
              {item.label}
              {!item.ready && <span className="soon">soon</span>}
            </a>
          ))}
        </nav>
      </header>

      <main>
        {ActiveCalc && <ActiveCalc />}
      </main>
    </div>
  )
}
