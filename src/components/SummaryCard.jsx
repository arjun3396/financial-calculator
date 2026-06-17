import React from 'react'

export default function SummaryCard({ label, value, tone }) {
  return (
    <div className="summary-card">
      <div className="summary-label">{label}</div>
      <div className={'summary-value' + (tone ? ' ' + tone : '')}>{value}</div>
    </div>
  )
}
