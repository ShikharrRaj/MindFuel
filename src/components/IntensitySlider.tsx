/**
 * IntensitySlider — a 0–10 distress rating ("how strong is it?"). A native
 * range input, so it is keyboard- and screen-reader-operable for free; the
 * value text gives the number meaning ("7 · strong").
 */

import { intensityWord } from '../lib/calm'

interface Props {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

export default function IntensitySlider({ id, label, value, onChange }: Props) {
  const valueText = `${value} out of 10, ${intensityWord(value)}`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="intensity">
        <input
          id={id}
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          aria-valuetext={valueText}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {/* Visual only: the slider's aria-valuetext already speaks the value. */}
        <output htmlFor={id} className="intensity__value" aria-hidden="true">
          {value}
          <span className="intensity__word"> · {intensityWord(value)}</span>
        </output>
      </div>
      <div className="intensity__scale" aria-hidden="true">
        <span>0 · calm</span>
        <span>10 · worst</span>
      </div>
    </div>
  )
}
