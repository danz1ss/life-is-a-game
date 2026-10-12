import type { CharacterAppearance } from './types'

export const defaultCharacter: CharacterAppearance = {
  gender: 'boy', skin: 'medium', hair: 'short', outfit: 'casual', weapon: 'none', accent: 'azure', pet: 'fox',
}

export const normalizeCharacter = (appearance?: Partial<CharacterAppearance>): CharacterAppearance => ({ ...defaultCharacter, ...appearance })

export const genderOptions = [
  { id: 'boy', label: 'Мальчик' },
  { id: 'girl', label: 'Девочка' },
] as const

export const accentColors: Record<CharacterAppearance['accent'], string> = {
  azure: '#5ddcff', violet: '#b998ff', amber: '#ffd078', emerald: '#69e9bd', rose: '#ff91bd', gold: '#ffdc80',
}

export const skinColors: Record<CharacterAppearance['skin'], string> = {
  light: '#f5c4a7', medium: '#e7a476', dark: '#a96f54',
}

export const characterOptions = {
  skin: [
    { id: 'light', label: 'Светлая', level: 1 },
    { id: 'medium', label: 'Средняя', level: 1 },
    { id: 'dark', label: 'Тёмная', level: 1 },
  ],
  hair: [
    { id: 'short', label: 'Короткие', level: 1 },
    { id: 'long', label: 'Длинные', level: 1 },
    { id: 'hood', label: 'Капюшон', level: 3 },
    { id: 'wind', label: 'Вихрь', level: 12 },
    { id: 'crown', label: 'Корона', level: 50 },
  ],
  outfit: [
    { id: 'casual', label: 'Обычная одежда', level: 1 },
    { id: 'traveler', label: 'Путник', level: 2 },
    { id: 'guardian', label: 'Страж', level: 3 },
    { id: 'mage', label: 'Маг', level: 8 },
    { id: 'ranger', label: 'Следопыт', level: 12 },
    { id: 'champion', label: 'Чемпион', level: 25 },
    { id: 'celestial', label: 'Звёздный', level: 60 },
  ],
  weapon: [
    { id: 'none', label: 'Без оружия', level: 1 },
    { id: 'shield', label: 'Щит', level: 2 },
    { id: 'sword', label: 'Меч', level: 4 },
    { id: 'staff', label: 'Посох', level: 6 },
    { id: 'bow', label: 'Лук', level: 10 },
    { id: 'twin', label: 'Два клинка', level: 20 },
    { id: 'crystal', label: 'Кристальный меч', level: 100 },
  ],
  accent: [
    { id: 'azure', label: 'Лазурный', level: 1 },
    { id: 'violet', label: 'Фиолетовый', level: 1 },
    { id: 'amber', label: 'Янтарный', level: 1 },
    { id: 'emerald', label: 'Изумрудный', level: 15 },
    { id: 'rose', label: 'Розовый', level: 30 },
    { id: 'gold', label: 'Золотой', level: 75 },
  ],
  pet: [
    { id: 'fox', label: 'Лисёнок', level: 1 },
    { id: 'owl', label: 'Совёнок', level: 12 },
    { id: 'dragon', label: 'Дракончик', level: 100 },
  ],
} satisfies { [K in Exclude<keyof Required<CharacterAppearance>, 'gender'>]: Array<{ id: NonNullable<CharacterAppearance[K]>; label: string; level: number }> }

type ChoiceCopy = { label: string; detail: string }

// Both paths earn the same equipment at the same levels. Their names and outfit
// descriptions reflect the chosen hero, while saved IDs remain interchangeable.
const genderedChoiceCopy = {
  boy: {
    hair: {
      short: { label: 'Короткая стрижка', detail: 'Аккуратные волосы для первых приключений' },
      long: { label: 'Средняя стрижка', detail: 'Естественная стрижка для первых приключений' },
      hood: { label: 'Капюшон искателя', detail: 'Укрывает от дождя и ветра' },
      wind: { label: 'Взъерошенные волосы', detail: 'Новая причёска подростка' },
      crown: { label: 'Корона героя', detail: 'Знак опыта, открывается позже' },
    },
    outfit: {
      casual: { label: 'Куртка новичка', detail: 'Куртка, брюки и кроссовки без брони' },
      traveler: { label: 'Куртка путника', detail: 'Лёгкий дорожный наряд' },
      guardian: { label: 'Доспех стража', detail: 'Первая настоящая броня героя' },
      mage: { label: 'Мантия мага', detail: 'Образ для изучения новых знаний' },
      ranger: { label: 'Плащ следопыта', detail: 'Удобный наряд для дальних дорог' },
      champion: { label: 'Броня чемпиона', detail: 'Снаряжение молодого героя' },
      celestial: { label: 'Звёздный доспех', detail: 'Редкий доспех опытного героя' },
    },
    weapon: {
      none: { label: 'Без оружия', detail: 'Первый уровень: только начало пути' },
      shield: { label: 'Щит защитника', detail: 'Первое защитное снаряжение' },
      sword: { label: 'Меч героя', detail: 'Первый клинок героя' },
      staff: { label: 'Посох мага', detail: 'Снаряжение для новых образов' },
      bow: { label: 'Лук следопыта', detail: 'Новый способ сражаться' },
      twin: { label: 'Парные клинки героя', detail: 'Два клинка для опытного бойца' },
      crystal: { label: 'Кристальный меч', detail: 'Последняя награда на 100-м уровне' },
    },
  },
  girl: {
    hair: {
      short: { label: 'Короткая стрижка', detail: 'Удобная причёска для первых приключений' },
      long: { label: 'Длинные волосы', detail: 'Свободная причёска юной героини' },
      hood: { label: 'Капюшон искательницы', detail: 'Укрывает от дождя и ветра' },
      wind: { label: 'Волосы на ветру', detail: 'Новая причёска девушки-подростка' },
      crown: { label: 'Корона героини', detail: 'Знак опыта, открывается позже' },
    },
    outfit: {
      casual: { label: 'Туника путешественницы', detail: 'Туника, леггинсы и ботинки без брони' },
      traveler: { label: 'Куртка путешественницы', detail: 'Лёгкий дорожный наряд' },
      guardian: { label: 'Доспех стражницы', detail: 'Первая настоящая броня героини' },
      mage: { label: 'Мантия волшебницы', detail: 'Образ для изучения новых знаний' },
      ranger: { label: 'Плащ следопытки', detail: 'Удобный наряд для дальних дорог' },
      champion: { label: 'Броня чемпионки', detail: 'Снаряжение молодой героини' },
      celestial: { label: 'Звёздная броня', detail: 'Редкий доспех опытной героини' },
    },
    weapon: {
      none: { label: 'Без оружия', detail: 'Первый уровень: только начало пути' },
      shield: { label: 'Щит защитницы', detail: 'Первое защитное снаряжение' },
      sword: { label: 'Меч героини', detail: 'Первый клинок героини' },
      staff: { label: 'Посох волшебницы', detail: 'Снаряжение для новых образов' },
      bow: { label: 'Лук следопытки', detail: 'Новый способ сражаться' },
      twin: { label: 'Парные клинки героини', detail: 'Два клинка для опытной воительницы' },
      crystal: { label: 'Кристальный меч', detail: 'Последняя награда на 100-м уровне' },
    },
  },
} satisfies Record<CharacterAppearance['gender'], {
  hair: Record<CharacterAppearance['hair'], ChoiceCopy>
  outfit: Record<CharacterAppearance['outfit'], ChoiceCopy>
  weapon: Record<CharacterAppearance['weapon'], ChoiceCopy>
}>

function withChoiceCopy<T extends { id: string; label: string; level: number }>(items: T[], copy?: Record<string, ChoiceCopy>) {
  return items.map((item) => ({ ...item, label: copy?.[item.id]?.label ?? item.label, detail: copy?.[item.id]?.detail ?? '' }))
}

export function characterOptionsForGender(gender: CharacterAppearance['gender']) {
  const copy = genderedChoiceCopy[gender]
  return {
    skin: withChoiceCopy(characterOptions.skin),
    hair: withChoiceCopy(characterOptions.hair, copy.hair),
    outfit: withChoiceCopy(characterOptions.outfit, copy.outfit),
    weapon: withChoiceCopy(characterOptions.weapon, copy.weapon),
    accent: withChoiceCopy(characterOptions.accent),
    pet: withChoiceCopy(characterOptions.pet),
  }
}

export function availableCharacter(appearance: CharacterAppearance | undefined, level: number): CharacterAppearance {
  const character = normalizeCharacter(appearance)
  const unlocked = (slot: keyof typeof characterOptions, id: string) =>
    (characterOptions[slot] as readonly { id: string; level: number }[]).some((option) => option.id === id && option.level <= level)
  return {
    ...character,
    hair: unlocked('hair', character.hair) ? character.hair : defaultCharacter.hair,
    outfit: unlocked('outfit', character.outfit) ? character.outfit : defaultCharacter.outfit,
    weapon: unlocked('weapon', character.weapon) ? character.weapon : defaultCharacter.weapon,
    accent: unlocked('accent', character.accent) ? character.accent : defaultCharacter.accent,
    pet: character.pet && unlocked('pet', character.pet) ? character.pet : defaultCharacter.pet,
  }
}

// These are visual chapters, not literal years. Shape and facial features continue to
// change on every level between them, while the final portrait is a mature adult.
export const heroStages = [
  { level: 1, id: 'child', label: 'Малыш', detail: 'Первые шаги без доспехов', visualAge: 8 },
  { level: 10, id: 'teen', label: 'Подросток', detail: 'Обретает уверенность и собственный стиль', visualAge: 13 },
  { level: 25, id: 'young', label: 'Молодой герой', detail: 'Выбирает свой путь и снаряжение', visualAge: 20 },
  { level: 50, id: 'adult', label: 'Взрослый герой', detail: 'Опыт читается в осанке и взгляде', visualAge: 28 },
  { level: 75, id: 'veteran', label: 'Опытный герой', detail: 'Уверенный, спокойный и сильный', visualAge: 34 },
  { level: 100, id: 'legend', label: 'Зрелый герой', detail: 'Взрослый герой на вершине пути', visualAge: 39 },
] as const

export function heroStageForLevel(level: number) {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(100, Math.floor(level))) : 1
  let index = 0
  for (let candidate = 1; candidate < heroStages.length; candidate++) {
    if (heroStages[candidate].level > safeLevel) break
    index = candidate
  }
  const stage = heroStages[index]
  const next = heroStages[index + 1]
  const progress = next ? (safeLevel - stage.level) / (next.level - stage.level) : 0
  return {
    ...stage,
    visualAge: next ? stage.visualAge + (next.visualAge - stage.visualAge) * progress : stage.visualAge,
    maturity: (safeLevel - 1) / 99,
    nextLevel: next?.level ?? null,
  }
}

const girlStageCopy = {
  child: { label: 'Малышка', detail: 'Первые шаги без доспехов' },
  teen: { label: 'Юная искательница', detail: 'Обретает уверенность и собственный стиль' },
  young: { label: 'Юная героиня', detail: 'Выбирает свой путь и снаряжение' },
  adult: { label: 'Взрослая героиня', detail: 'Опыт читается в осанке и взгляде' },
  veteran: { label: 'Опытная героиня', detail: 'Уверенная, спокойная и сильная' },
  legend: { label: 'Зрелая героиня', detail: 'Взрослая героиня на вершине пути' },
} satisfies Record<(typeof heroStages)[number]['id'], { label: string; detail: string }>

export function heroStageForGender(level: number, gender: CharacterAppearance['gender']) {
  const stage = heroStageForLevel(level)
  return gender === 'girl' ? { ...stage, ...girlStageCopy[stage.id] } : stage
}

export const petStages = [
  { level: 1, label: 'Малыш' },
  { level: 5, label: 'Искатель' },
  { level: 15, label: 'Смельчак' },
  { level: 30, label: 'Хранитель' },
  { level: 50, label: 'Мифический' },
  { level: 100, label: 'Легенда' },
] as const

export function petStageForLevel(level: number) {
  return petStages.reduce((stage, candidate) => level >= candidate.level ? candidate : stage, petStages[0])
}

export const characterMilestones = [
  { level: 1, kind: 'hero', title: 'Начало приключения', detail: 'Ребёнок в обычной одежде, без доспехов и оружия' },
  { level: 2, kind: 'hero', title: 'Первый щит', detail: 'Новый выбор снаряжения' },
  { level: 3, kind: 'hero', title: 'Доспех стража', detail: 'Первый защитный комплект' },
  { level: 4, kind: 'hero', title: 'Первый меч', detail: 'Открывается меч героя' },
  { level: 5, kind: 'pet', title: 'Питомец подрастает', detail: 'Стадия «Искатель»' },
  { level: 6, kind: 'hero', title: 'Посох путешественника', detail: 'Новый выбор снаряжения' },
  { level: 8, kind: 'hero', title: 'Образ мага', detail: 'Новый костюм героя' },
  { level: 10, kind: 'hero', title: 'Подросток и лук следопыта', detail: 'Герой взрослеет и открывает новый стиль боя' },
  { level: 12, kind: 'hero', title: 'Образ следопыта', detail: 'Новый костюм героя' },
  { level: 12, kind: 'pet', title: 'Совёнок', detail: 'Новый спутник на выбор' },
  { level: 15, kind: 'pet', title: 'Смелый спутник', detail: 'Третья стадия питомца' },
  { level: 20, kind: 'hero', title: 'Два клинка', detail: 'Новый выбор снаряжения' },
  { level: 25, kind: 'hero', title: 'Молодой герой', detail: 'Взросление и доспех чемпиона' },
  { level: 30, kind: 'pet', title: 'Спутник-хранитель', detail: 'Четвёртая стадия питомца' },
  { level: 50, kind: 'pet', title: 'Мифический спутник', detail: 'Пятая стадия питомца' },
  { level: 50, kind: 'hero', title: 'Взрослый герой', detail: 'Уверенный образ и корона' },
  { level: 60, kind: 'hero', title: 'Звёздный доспех', detail: 'Новый образ героя' },
  { level: 75, kind: 'hero', title: 'Опытный герой', detail: 'Зрелый образ и золотое сияние' },
  { level: 100, kind: 'pet', title: 'Дракончик', detail: 'Новый спутник и финальная стадия питомца' },
  { level: 100, kind: 'hero', title: 'Кристальный меч', detail: 'Зрелый герой получает легендарное оружие' },
] as const

const girlMilestoneCopy: Record<string, { title?: string; detail?: string }> = {
  'Доспех стража': { title: 'Доспех стражницы' },
  'Первый меч': { detail: 'Открывается меч героини' },
  'Посох путешественника': { title: 'Посох путешественницы' },
  'Образ мага': { title: 'Образ волшебницы', detail: 'Новый костюм героини' },
  'Подросток и лук следопыта': { title: 'Юная искательница и лук', detail: 'Героиня взрослеет и открывает новый стиль боя' },
  'Образ следопыта': { title: 'Образ следопытки', detail: 'Новый костюм героини' },
  'Молодой герой': { title: 'Юная героиня', detail: 'Взросление и броня чемпионки' },
  'Взрослый герой': { title: 'Взрослая героиня' },
  'Звёздный доспех': { title: 'Звёздная броня', detail: 'Новый образ героини' },
  'Опытный герой': { title: 'Опытная героиня' },
  'Кристальный меч': { detail: 'Зрелая героиня получает легендарное оружие' },
}

export function characterMilestonesForGender(gender: CharacterAppearance['gender']) {
  return gender === 'girl' ? characterMilestones.map((milestone) => ({ ...milestone, ...girlMilestoneCopy[milestone.title] })) : characterMilestones
}
