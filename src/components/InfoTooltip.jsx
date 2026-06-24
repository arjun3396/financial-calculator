import React, { useState, useRef, useEffect } from 'react'

export default function InfoTooltip({ text }) {
  const [show, setShow]   = useState(false)
  // 'center' | 'left' | 'right'  — which edge to anchor the tooltip to
  const [align, setAlign] = useState('center')
  const iconRef           = useRef(null)

  const computeAlign = () => {
    if (!iconRef.current) return 'center'
    const rect = iconRef.current.getBoundingClientRect()
    if (window.innerWidth - rect.right < 260) return 'right'
    if (rect.left < 120) return 'left'
    return 'center'
  }

  const open = () => { setAlign(computeAlign()); setShow(true) }

  // Click/tap: toggle; also used by keyboard (Enter/Space via onFocus)
  const handleClick = (e) => {
    e.stopPropagation()
    if (show) setShow(false)
    else open()
  }

  // Close when the user taps/clicks anywhere outside
  useEffect(() => {
    if (!show) return
    const handler = () => setShow(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [show])

  // Tooltip position styles based on alignment
  const posStyle =
    align === 'right' ? { right: 0 }
    : align === 'left' ? { left: 0 }
    : { left: '50%', transform: 'translateX(-50%)' }

  // Arrow position to match
  const arrowPos =
    align === 'right' ? { right: 6, left: 'auto', transform: 'rotate(45deg)' }
    : align === 'left' ? { left: 6, transform: 'rotate(45deg)' }
    : { left: '50%', transform: 'translateX(-50%) rotate(45deg)' }

  return (
    <span
      ref={iconRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5, verticalAlign: 'middle' }}
      onMouseEnter={open}
      onMouseLeave={() => setShow(false)}
      onFocus={open}
      onBlur={() => setShow(false)}
      onClick={handleClick}
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
          position:      'absolute',
          bottom:        'calc(100% + 8px)',
          ...posStyle,
          width:         240,
          background:    '#111',
          border:        '1px solid #3a3a3a',
          borderRadius:  8,
          padding:       '10px 13px',
          fontSize:      12,
          lineHeight:    1.55,
          color:         '#b8b8b8',
          zIndex:        9999,
          pointerEvents: 'none',
          boxShadow:     '0 6px 24px rgba(0,0,0,0.5)',
          whiteSpace:    'normal',
          fontStyle:     'normal',
          fontWeight:    'normal',
          letterSpacing: 'normal',
        }}>
          {/* Arrow */}
          <span style={{
            position:   'absolute',
            bottom:     -5,
            ...arrowPos,
            width:      9, height: 9,
            background: '#111',
            border:     '1px solid #3a3a3a',
            borderTop:  'none', borderLeft: 'none',
          }} />
          {text}
        </span>
      )}
    </span>
  )
}
