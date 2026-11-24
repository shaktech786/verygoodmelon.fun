'use client'

import { useId, useState } from 'react'
import { Go } from '@/components/seedpress/Go'
import { Icon } from '@/components/seedpress/icons/Icon'

/** The page's one live Go, and what it says when pressed. */
export function LiveGo() {
  const [pressed, setPressed] = useState(false)
  return (
    <div className="sp-state">
      <Go onward onClick={() => setPressed(true)}>
        Press the slice
      </Go>
      <p role="status" className="sp-reason">
        {pressed ? 'Pressed. This is the only go on the page.' : ''}
      </p>
    </div>
  )
}

/** A pull-tab switch: the word On or Off is printed on the tab, so it never depends on colour or place. It plays nothing. */
export function ExampleSwitch() {
  const [on, setOn] = useState(false)
  return (
    <button type="button" role="switch" aria-checked={on} className="sp-switch" onClick={() => setOn(!on)}>
      <span className="sp-switch__slot" aria-hidden="true">
        <span className="sp-switch__tab">{on ? 'On' : 'Off'}</span>
      </span>
      <Icon name={on ? 'sound-on' : 'sound-off'} />
      Sound
    </button>
  )
}

const THEMES = ['Light', 'Dark', 'Match my device'] as const

/** A stamp row: native radios, so arrow keys move between them. */
export function ExampleStampRow() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>('Match my device')
  const name = useId()
  return (
    <fieldset className="sp-dial">
      <legend className="sp-dial__legend">Theme</legend>
      <div className="sp-stamp-row">
        {THEMES.map((option) => (
          <label key={option} className="sp-choice">
            <input type="radio" name={name} value={option} checked={theme === option} onChange={() => setTheme(option)} />
            <span className="sp-choice__face">
              {theme === option && <Icon name="done" />}
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
