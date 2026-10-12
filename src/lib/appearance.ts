export type BackgroundTheme = 'minimalism' | 'texture' | 'night-sky'

export const backgroundThemes: { id: BackgroundTheme; name: string; description: string }[] = [
  { id: 'texture', name: 'Текстура', description: 'Глубокий тёмный фон с деликатной зернистостью.' },
  { id: 'night-sky', name: 'Ночное небо', description: 'Синие туманности, звёзды и глубокие тёмно-синие панели.' },
  { id: 'minimalism', name: 'Минимализм', description: 'Спокойный графитовый фон без фактуры.' },
]

export function normalizeBackground(value: unknown): BackgroundTheme {
  return backgroundThemes.some((theme) => theme.id === value) ? value as BackgroundTheme : 'minimalism'
}
