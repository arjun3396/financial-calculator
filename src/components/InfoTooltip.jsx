import React, { useState, useRef } from 'react'

export default function InfoTooltip({ text }) {
  const [show, setShow]   = useState(false)
  const iconRef           = useRef(null)
  const [flip, setFlip]   = useState(false) // flip left when near right edge

  const handleEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      // If less than 260px to the right of the icon, anchor right instead of centering
      setFlip(window.innerWidth - rect.right < 260)
    }
    setShow(true)
  }

  return (
    <span
      ref={iconRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, verticalAlign: 'middle' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
      onFocus={handleEnter}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label="More information"
    >
      {/* Icon */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
        style={{ cursor: 'help', display: 'block', flexShrink: 0, opacity: show ? 1 : 0.5, transition: 'opacity .15s' }}>
        <circle cx="7" cy="7" r="6.25" stroke={show ? '#888' : '#666'} strokeWidth="1.2" />
        <text x="7" y="10.5" textAnchor="middle" fontSize="8.5"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fill={show ? '#b8b8b8' : '#8a8a8a'} fontWeight="600" fontStyle="italic">
          i
        </text>
      </svg>

      {/* Tooltip */}
      {show && (
        <span style={{
          position:     'absolute',
          bottom:       'calc(100% + 8px)',
          ...(flip ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
          width:        240,
          background:   '#111',
          border:       '1px solid #3a3a3a',
          borderRadius: 8,
          padding:      '10px 13px',
          fontSize:     12,
          lineHeight:   1.55,
          color:        '#b8b8b8',
          zIndex:       9999,
          pointerEvents:'none',
          boxShadow:    '0 6px 24px rgba(0,0,0,0.5)',
          whiteSpace:   'normal',
          fontStyle:    'normal',
          fontWeight:   'normal',
          letterSpacing: 'normal',
        }}>
          {/* Arrow */}
          <span style={{
            position:   'absolute',
            bottom:     -5,
            ...(flip ? { right: 6 } : { left: '50%', transform: 'translateX(-50%)' }),
            width:      9, height: 9,
            background: '#111',
            border:     '1px solid #3a3a3a',
            borderTop:  'none', borderLeft: 'none',
            transform:  flip ? 'rotate(45deg)' : 'translateX(-50%) rotate(45deg)',
          }} />
          {text}
        </span>
      )}
    </span>
  )
}
