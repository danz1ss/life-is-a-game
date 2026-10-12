import { ArrowRight, CircleAlert } from 'lucide-react'

export function overdueQuestLabel(count: number) {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} квестов требуют решения`
  if (last === 1) return `${count} квест требует решения`
  return `${count} ${last >= 2 && last <= 4 ? 'квеста' : 'квестов'} требуют решения`
}

export function OverdueQuestNotice({ count, onResolve }: { count: number; onResolve: () => void }) {
  if (count <= 0) return null
  return <section className="g-unresolved" aria-label="Незавершённые квесты">
    <span className="g-unresolved-icon" aria-hidden="true"><CircleAlert size={24} /></span>
    <div className="g-unresolved-copy">
      <h2 role="status" aria-live="polite" aria-atomic="true">{overdueQuestLabel(count)}</h2>
      <p>В закрытых или прошедших днях остались незавершённые квесты. Отметьте выполненные, перенесите остальные или откажитесь от них — без штрафов.</p>
    </div>
    <button type="button" className="g-unresolved-action" onClick={onResolve}>Разобрать квесты <ArrowRight size={17} aria-hidden="true" /></button>
  </section>
}
