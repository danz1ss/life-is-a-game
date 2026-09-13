import { Activity, CheckCircle2, Flame, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import { SkillIcon } from '../components/SkillIcon'
import { PageHeader, ProgressBar } from '../components/Ui'
import { calculateStreak, dateKey, levelProgress, skillLevel } from '../lib/game'
import { useStore } from '../lib/store'

const chartDateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })
const historyDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function ProgressPage() {
  const { state, today } = useStore()
  const profile = levelProgress(state.profile.totalXp)
  const activity = useMemo(() => {
    const days = new Map<string, { xp: number; count: number }>()
    let count = 0
    for (const event of state.history) {
      if (event.type !== 'quest') continue
      count++
      const day = days.get(event.date) ?? { xp: 0, count: 0 }
      day.xp += event.xp
      day.count++
      days.set(event.date, day)
    }
    return { days, count }
  }, [state.history])
  const todayXp = activity.days.get(today)?.xp ?? 0
  const chartData = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${today}T12:00:00`)
    date.setDate(date.getDate() - (13 - index))
    const key = dateKey(date)
    return {
      date: chartDateFormat.format(date),
      xp: activity.days.get(key)?.xp ?? 0,
    }
  }), [activity, today])
  const rankedSkills = useMemo(() => [...state.skills].sort((a, b) => b.xp - a.xp), [state.skills])

  return <div className="page">
    <PageHeader eyebrow="Хроника героя" title="Прогресс" description="Опыт показывает не намерения, а уже выполненные реальные действия." />
    <section className="stats-grid">
      <StatCard icon={<Zap />} label="Общий опыт" value={`${state.profile.totalXp} XP`} hint={`Уровень ${profile.level}`} tone="violet" />
      <StatCard icon={<Activity />} label="Сегодня" value={`+${todayXp} XP`} hint={`${activity.days.get(today)?.count ?? 0} выполнено`} tone="blue" />
      <StatCard icon={<CheckCircle2 />} label="Всего квестов" value={String(activity.count)} hint="завершено" tone="green" />
      <StatCard icon={<Flame />} label="Текущая серия" value={`${calculateStreak(state.profile.activeDays)} дн.`} hint="без штрафов" tone="orange" />
    </section>
    <section className="progress-layout">
      <article className="panel chart-panel">
        <div className="panel-title"><span><TrendingUp size={17} /> Активность за 14 дней</span><small>Опыт за выполненные квесты</small></div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42}/><stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="var(--line-soft)" strokeDasharray="4 6" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-2)" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis stroke="var(--muted-2)" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12 }} labelStyle={{ color: 'var(--muted)' }} />
              <Area type="monotone" dataKey="xp" stroke="var(--accent)" strokeWidth={2.5} fill="url(#xpGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
      <article className="panel skill-ranking-panel">
        <div className="panel-title"><span><Sparkles size={17} /> Навыки</span><small>{state.skills.length} всего</small></div>
        <div className="ranking-list">{rankedSkills.map((skill, index) => {
          const progress = skillLevel(skill)
          return <div className="ranking-row" key={skill.id}><b>{String(index + 1).padStart(2, '0')}</b><span className="ranking-row__icon" style={{ color: skill.color, background: `${skill.color}18` }}><SkillIcon icon={skill.icon} /></span><div><span><strong>{skill.name}</strong><small>Ур. {progress.level}</small></span><ProgressBar value={progress.percent} color={skill.color} compact /></div><em>{skill.xp} XP</em></div>
        })}</div>
      </article>
    </section>
    <section className="panel history-panel">
      <div className="panel-title"><span>Последние события</span><small>Локальная история</small></div>
      {state.history.length === 0 ? <div className="history-empty">Выполните первый квест — здесь появится запись о прогрессе.</div> : <div className="history-list">{state.history.slice(-12).reverse().map((event) => <div key={event.id}><span className={`history-icon history-icon--${event.type}`}>{event.type === 'quest' ? '✓' : event.type === 'goal' ? '♛' : '★'}</span><div><strong>{event.title}</strong><small>{event.type === 'goal' ? 'Достигнута главная цель · ' : ''}{historyDateFormat.format(new Date(event.createdAt))}</small></div><em>{event.xp > 0 ? `+${event.xp} XP` : `${event.gold > 0 ? '+' : ''}${event.gold} золота`}</em></div>)}</div>}
    </section>
  </div>
}

function StatCard({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) {
  return <article className={`stat-card stat-card--${tone}`}><span className="stat-card__icon">{icon}</span><div><small>{label}</small><strong>{value}</strong><span>{hint}</span></div></article>
}
