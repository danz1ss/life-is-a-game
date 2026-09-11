import { BookOpen, BriefcaseBusiness, Diamond, Code2, Dumbbell, GraduationCap, Heart, Languages, Moon, Sparkles, Brain, Camera, Music, Palette, PenTool, Coffee, CookingPot, Bike, Footprints, Mountain, Leaf, Sun, BedDouble, Apple, GlassWater, Laptop, ChartNoAxesCombined, Wallet, Handshake, Presentation, Microscope, Calculator, Globe, Headphones, Puzzle, Target, Trophy, Swords, Users, Plane, type LucideIcon } from 'lucide-react'

export const skillIcons: { id: string; name: string; group: string; component: LucideIcon }[] = [
  { id: '❤', name: 'Здоровье', group: 'Здоровье', component: Heart },
  { id: '⚡', name: 'Спорт', group: 'Здоровье', component: Dumbbell },
  { id: '☾', name: 'Сон', group: 'Здоровье', component: Moon },
  { id: 'bike', name: 'Велосипед', group: 'Здоровье', component: Bike },
  { id: 'walk', name: 'Прогулки', group: 'Здоровье', component: Footprints },
  { id: 'apple', name: 'Питание', group: 'Здоровье', component: Apple },
  { id: 'water', name: 'Вода', group: 'Здоровье', component: GlassWater },
  { id: 'rest', name: 'Отдых', group: 'Здоровье', component: BedDouble },
  { id: '✦', name: 'Развитие', group: 'Развитие', component: Sparkles },
  { id: '▤', name: 'Чтение', group: 'Развитие', component: BookOpen },
  { id: 'A', name: 'Языки', group: 'Развитие', component: Languages },
  { id: 'brain', name: 'Мышление', group: 'Развитие', component: Brain },
  { id: 'science', name: 'Наука', group: 'Развитие', component: Microscope },
  { id: 'math', name: 'Математика', group: 'Развитие', component: Calculator },
  { id: 'puzzle', name: 'Логика', group: 'Развитие', component: Puzzle },
  { id: 'globe', name: 'Мир', group: 'Развитие', component: Globe },
  { id: '◆', name: 'Карьера', group: 'Карьера', component: BriefcaseBusiness },
  { id: '</>', name: 'Программирование', group: 'Карьера', component: Code2 },
  { id: '♟', name: 'Обучение', group: 'Карьера', component: GraduationCap },
  { id: 'laptop', name: 'Технологии', group: 'Карьера', component: Laptop },
  { id: 'chart', name: 'Аналитика', group: 'Карьера', component: ChartNoAxesCombined },
  { id: 'wallet', name: 'Финансы', group: 'Карьера', component: Wallet },
  { id: 'handshake', name: 'Переговоры', group: 'Карьера', component: Handshake },
  { id: 'presentation', name: 'Выступления', group: 'Карьера', component: Presentation },
  { id: 'camera', name: 'Фотография', group: 'Творчество', component: Camera },
  { id: 'music', name: 'Музыка', group: 'Творчество', component: Music },
  { id: 'palette', name: 'Рисование', group: 'Творчество', component: Palette },
  { id: 'pen', name: 'Письмо', group: 'Творчество', component: PenTool },
  { id: 'headphones', name: 'Аудио', group: 'Творчество', component: Headphones },
  { id: 'cooking', name: 'Кулинария', group: 'Творчество', component: CookingPot },
  { id: '◈', name: 'Мастерство', group: 'Жизнь', component: Diamond },
  { id: 'target', name: 'Цели', group: 'Жизнь', component: Target },
  { id: 'trophy', name: 'Достижения', group: 'Жизнь', component: Trophy },
  { id: 'swords', name: 'Испытания', group: 'Жизнь', component: Swords },
  { id: 'users', name: 'Общение', group: 'Жизнь', component: Users },
  { id: 'plane', name: 'Путешествия', group: 'Жизнь', component: Plane },
  { id: 'mountain', name: 'Походы', group: 'Жизнь', component: Mountain },
  { id: 'leaf', name: 'Природа', group: 'Жизнь', component: Leaf },
  { id: 'sun', name: 'Утро', group: 'Жизнь', component: Sun },
  { id: 'coffee', name: 'Ритуалы', group: 'Жизнь', component: Coffee },
]

const icons: Record<string, LucideIcon> = Object.fromEntries(skillIcons.map((icon) => [icon.id, icon.component]))
icons['❤️'] = Heart

export function canonicalSkillIcon(icon: string) { return icon === '❤️' ? '❤' : icon }

export function SkillIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const Icon = icons[icon]
  return Icon ? <Icon size={size} aria-hidden="true" /> : <span aria-hidden="true">{icon}</span>
}
