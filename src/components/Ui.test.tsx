import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Modal, ProgressBar } from './Ui'

describe('shared UI accessibility', () => {
  it('provides valid finite progress values for malformed or out-of-range input', () => {
    for (const [value, expected] of [[-10, 0], [150, 100], [Number.NaN, 0], [Number.POSITIVE_INFINITY, 0], [42.5, 42.5]]) {
      const markup = renderToStaticMarkup(createElement(ProgressBar, { value, label: 'Опыт героя' }))
      expect(markup).toContain('role="progressbar"')
      expect(markup).toContain(`aria-valuenow="${expected}"`)
      expect(markup).toContain(`width:${expected}%`)
      expect(markup).not.toContain('NaN')
      expect(markup).not.toContain('Infinity')
    }
  })

  it('leaves semantics to an existing progress wrapper when no label is supplied', () => {
    const markup = renderToStaticMarkup(createElement('span', { role: 'progressbar', 'aria-label': 'Навык', 'aria-valuenow': 25 }, createElement(ProgressBar, { value: 25, compact: true })))
    expect(markup.match(/role="progressbar"/g)).toHaveLength(1)
    expect(markup).toContain('progress-track--compact')
  })

  it('links the dialog title and optional description to visible content', () => {
    const markup = renderToStaticMarkup(createElement(Modal, { title: 'Ревью недели', subtitle: 'Понедельник — воскресенье', onClose: () => undefined, children: createElement('p', null, 'Итоги') }))
    const titleId = markup.match(/aria-labelledby="([^"]+)"/)?.[1]
    const descriptionId = markup.match(/aria-describedby="([^"]+)"/)?.[1]
    expect(titleId).toBeTruthy()
    expect(descriptionId).toBeTruthy()
    expect(markup).toContain(`id="${titleId}">Ревью недели</h2>`)
    expect(markup).toContain(`id="${descriptionId}">Понедельник — воскресенье</p>`)
    expect(markup).toContain('tabindex="-1"')
  })
})
