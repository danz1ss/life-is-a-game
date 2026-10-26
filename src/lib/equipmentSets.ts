import type { CharacterAppearance } from './types'

export type EquipmentSet = {
  id: string
  label: string
  detail: string
  outfit: CharacterAppearance['outfit']
  weapon: CharacterAppearance['weapon']
  level: number
}

// Shared by the wardrobe, artwork mapping and level announcements.
// The old slot definitions remain intact for reading existing saves.
export const equipmentSets: readonly EquipmentSet[] = [
  { id: 'casual', label: 'Образ этапа', detail: 'Обычный наряд героя · без оружия', outfit: 'casual', weapon: 'none', level: 1 },
  { id: 'traveler', label: 'Путник', detail: 'Дорожный наряд · без оружия', outfit: 'traveler', weapon: 'none', level: 2 },
  { id: 'guardian', label: 'Страж', detail: 'Доспехи · щит', outfit: 'guardian', weapon: 'shield', level: 3 },
  { id: 'mage', label: 'Маг', detail: 'Мантия · посох', outfit: 'mage', weapon: 'staff', level: 8 },
  { id: 'ranger', label: 'Следопыт', detail: 'Плащ и кожаный наряд · лук', outfit: 'ranger', weapon: 'bow', level: 12 },
  { id: 'champion', label: 'Чемпион', detail: 'Доспехи · два клинка', outfit: 'champion', weapon: 'twin', level: 25 },
  { id: 'celestial', label: 'Звёздный', detail: 'Звёздные доспехи · стальной меч', outfit: 'celestial', weapon: 'sword', level: 60 },
  { id: 'crystal', label: 'Кристальная легенда', detail: 'Легендарные доспехи · кристальный меч', outfit: 'celestial', weapon: 'crystal', level: 100 },
]
