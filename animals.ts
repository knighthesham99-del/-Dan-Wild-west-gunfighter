import { AnimalSpeciesId, AnimalTier, HuntingBag } from './types';

export interface AnimalSpec {
  id: AnimalSpeciesId;
  nameAr: string;
  lootNameAr: string;
  tier: AnimalTier;
  tierLabelAr: string;
  tierColor: string;
  behavior: 'flee' | 'predator' | 'charger';
  hp: number;
  speed: number;
  fleeSpeed: number;
  chargeDamage: number;
  radius: number;
  sellPrice: number;
  descAr: string;
}

export const ANIMAL_SPECIES: Record<AnimalSpeciesId, AnimalSpec> = {
  rabbit: {
    id: 'rabbit',
    nameAr: 'أرنب بري',
    lootNameAr: 'فراء أرنب بري',
    tier: 'easy',
    tierLabelAr: 'سهل',
    tierColor: '#34D399',
    behavior: 'flee',
    hp: 35,
    speed: 75,
    fleeSpeed: 235,
    chargeDamage: 0,
    radius: 12,
    sellPrice: 45,
    descAr: 'هدف صغير وسريع الهرب فور سماع إطلاق النار.',
  },
  coyote: {
    id: 'coyote',
    nameAr: 'ذئب البراري (قيوط)',
    lootNameAr: 'جلد قيوط الصحراء',
    tier: 'easy',
    tierLabelAr: 'سهل',
    tierColor: '#34D399',
    behavior: 'predator',
    hp: 70,
    speed: 120,
    fleeSpeed: 205,
    chargeDamage: 12,
    radius: 15,
    sellPrice: 85,
    descAr: 'يتجول في مجموعات ويهاجم عند الاقتراب الشديد.',
  },
  deer: {
    id: 'deer',
    nameAr: 'أيل الجبال ذو القرون',
    lootNameAr: 'قرون وفراء أيل',
    tier: 'medium',
    tierLabelAr: 'متوسط',
    tierColor: '#FBBF24',
    behavior: 'flee',
    hp: 120,
    speed: 95,
    fleeSpeed: 265,
    chargeDamage: 0,
    radius: 18,
    sellPrice: 145,
    descAr: 'حذر جداً وينطلق كالسهم إن لم تسقطه بطلقة دقيقة.',
  },
  boar: {
    id: 'boar',
    nameAr: 'خنزير بري شرس',
    lootNameAr: 'أنياب ولحم خنزير بري',
    tier: 'medium',
    tierLabelAr: 'متوسط',
    tierColor: '#FBBF24',
    behavior: 'charger',
    hp: 175,
    speed: 110,
    fleeSpeed: 215,
    chargeDamage: 22,
    radius: 18,
    sellPrice: 195,
    descAr: 'جلده سميك ويندفع بقوة لنطحك فور إصابته.',
  },
  cougar: {
    id: 'cougar',
    nameAr: 'أسد الجبال (كوجر)',
    lootNameAr: 'فراء كوجر نادر',
    tier: 'hard',
    tierLabelAr: 'صعب',
    tierColor: '#FB923C',
    behavior: 'predator',
    hp: 235,
    speed: 145,
    fleeSpeed: 255,
    chargeDamage: 28,
    radius: 19,
    sellPrice: 290,
    descAr: 'مفترس خفي فائق السرعة ينقض عليك من بين الصخور.',
  },
  bison: {
    id: 'bison',
    nameAr: 'ثور البيسون الضخم',
    lootNameAr: 'قرون وفراء بيسون',
    tier: 'legendary',
    tierLabelAr: 'أسطوري',
    tierColor: '#F87171',
    behavior: 'charger',
    hp: 430,
    speed: 85,
    fleeSpeed: 225,
    chargeDamage: 38,
    radius: 26,
    sellPrice: 460,
    descAr: 'عملاق السهول المدرّع، يحتاج قناصاً أو ساقية مكسيم لإيقافه.',
  },
  grizzly: {
    id: 'grizzly',
    nameAr: 'الدب الرمادي العملاق',
    lootNameAr: 'فراء الدب الأسطوري',
    tier: 'legendary',
    tierLabelAr: 'أسطوري',
    tierColor: '#F87171',
    behavior: 'charger',
    hp: 600,
    speed: 95,
    fleeSpeed: 230,
    chargeDamage: 46,
    radius: 27,
    sellPrice: 680,
    descAr: 'أخطر وحوش البرية وأغلاها ثمناً في متجر الصيد.',
  },
};

export const ANIMAL_SPECIES_LIST: AnimalSpec[] = Object.values(ANIMAL_SPECIES);

export const DEFAULT_HUNTING_BAG: HuntingBag = {
  rabbit: 0,
  coyote: 0,
  deer: 0,
  boar: 0,
  cougar: 0,
  bison: 0,
  grizzly: 0,
};

export function getHuntingBagCount(bag: HuntingBag): number {
  return Object.values(bag).reduce((sum, n) => sum + n, 0);
}

export function getHuntingBagTotalValue(bag: HuntingBag): number {
  return ANIMAL_SPECIES_LIST.reduce(
    (sum, spec) => sum + (bag[spec.id] || 0) * spec.sellPrice,
    0
  );
}
