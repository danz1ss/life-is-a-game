import { useEffect, useRef } from 'react'
import { backgroundThemes, type BackgroundTheme } from '../lib/appearance'
import { Modal } from './Ui'

export function AppearanceModal({ selected, onChange, onClose }: {
  selected: BackgroundTheme
  onChange: (theme: BackgroundTheme) => void
  onClose: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dialog = contentRef.current?.closest('[role="dialog"]')
    dialog?.querySelector<HTMLInputElement>('input:checked')?.focus()
  }, [])

  return <Modal title="Фоновое оформление" subtitle="Выберите фон и подходящие к нему панели. Цвета навыков сохраняются." onClose={onClose} wide>
    <div ref={contentRef}>
      <fieldset className="background-options" aria-label="Фон приложения">
        {backgroundThemes.map((theme) => <label className="background-option" key={theme.id}>
          <span className="background-preview" data-background={theme.id} aria-hidden="true">
            <span className="background-preview__sidebar" />
            <span className="background-preview__panel" />
            <span className="background-preview__hero" />
            <span className="background-preview__tasks"><i /><i /><i /></span>
          </span>
          <span className="background-option__title"><input type="radio" name="app-background" value={theme.id} checked={selected === theme.id} onChange={() => onChange(theme.id)} /><strong>{theme.name}</strong></span>
          <span className="background-option__description">{theme.description}</span>
        </label>)}
      </fieldset>
      <footer className="appearance-footer"><span>Фон применяется сразу и сохраняется автоматически.</span><button className="button button--primary" onClick={onClose}>Готово</button></footer>
    </div>
  </Modal>
}
