import React, { useState, useEffect, useRef } from 'react'

export default function SliderRow({ label, min, max, step, value, onChange, format, editParse, editSerialize }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const trackBg = `linear-gradient(var(--teal), var(--teal)) 0/${pct}% 100% no-repeat, #3a3a3a`

  const beginEdit = () => {
    setDraft(editSerialize ? editSerialize(value) : String(value))
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = editParse ? editParse(draft) : parseFloat(draft)
    if (parsed != null && !Number.isNaN(parsed)) onChange(parsed)
    setEditing(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') commit()
    else if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="input-row">
      <div className="input-label">{label}</div>
      <input
        type="range"
        className="slider"
        min={min} max={max} step={step}
        value={Math.max(min, Math.min(max, value))}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ background: trackBg }}
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="input-value-edit"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <div
          className="input-value editable"
          onClick={beginEdit}
          title="Click to type an exact value"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beginEdit() } }}
        >
          {format(value)}
        </div>
      )}
    </div>
  )
}
