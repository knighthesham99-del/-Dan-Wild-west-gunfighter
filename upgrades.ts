import { WEAPONS } from './stages';
import { PlayerLoadout } from './types';

export const DEFAULT_LOADOUT: PlayerLoadout = {
  revolverDamageLevel: 0,
  revolverReloadLevel: 0,
  revolverAccuracyLevel: 0,
  winchesterDamageLevel: 0,
  winchesterReloadLevel: 0,
  winchesterAccuracyLevel: 0,
  sniperDamageLevel: 0,
  sniperReloadLevel: 0,
  sniperScopeLevel: 0,
  maximDamageLevel: 0,
  maximFireRateLevel: 0,
  maximReloadLevel: 0,
  shotgunDamageLevel: 0,
  shotgunReloadLevel: 0,
  shotgunChokeLevel: 0,
  dualDamageLevel: 0,
  dualFireRateLevel: 0,
  dualReloadLevel: 0,
  bowDamageLevel: 0,
  bowDrawLevel: 0,
  bowVelocityLevel: 0,
  posseCountLevel: 0,
  posseGearLevel: 0,
  posseWeaponLevel: 0,
  dynamiteDamageLevel: 0,
  healthLevel: 0,
  vitalityRegenLevel: 0,
  vestLevel: 0,
  bootsLevel: 0,
  watchLevel: 0,
  bandolierLevel: 0,
  tonicsCount: 1,
  dynamiteCount: 3,
};

export type UpgradeKey = Exclude<
  keyof PlayerLoadout,
  'tonicsCount' | 'dynamiteCount'
>;

export interface UpgradeDefinition {
  key: UpgradeKey;
  category:
    | 'revolver'
    | 'winchester'
    | 'sniper'
    | 'maxim'
    | 'shotgun'
    | 'dual_pistols'
    | 'bow'
    | 'posse'
    | 'health'
    | 'gear';
  titleAr: string;
  descAr: string;
  maxLevel: number;
  costs: [number, number, number];
  formatEffect: (level: number) => string;
}

export const UPGRADE_DEFS: UpgradeDefinition[] = [
  // Revolver
  {
    key: 'revolverDamageLevel',
    category: 'revolver',
    titleAr: 'سبطانة مقوّاة للضرر',
    descAr: 'يزيد قوة اختراق وضرر طلقات المسدس الدوّار .45',
    maxLevel: 3,
    costs: [180, 320, 520],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.revolver.damage * (1 + lvl * 0.22))} ضرر`,
  },
  {
    key: 'revolverReloadLevel',
    category: 'revolver',
    titleAr: 'ملقم دوّار سريع',
    descAr: 'يختصر زمن إعادة تعبئة الأسطوانة السداسية',
    maxLevel: 3,
    costs: [160, 280, 450],
    formatEffect: (lvl) =>
      `${(WEAPONS.revolver.reloadDuration * (1 - lvl * 0.16)).toFixed(2)} ث`,
  },
  {
    key: 'revolverAccuracyLevel',
    category: 'revolver',
    titleAr: 'موازن الزناد والدقة',
    descAr: 'يقلل تشتت الطلقات السريعة أثناء الحركة',
    maxLevel: 3,
    costs: [150, 260, 420],
    formatEffect: (lvl) => `تشتت ${Math.round((1 - lvl * 0.24) * 100)}%`,
  },

  // Winchester 1873
  {
    key: 'winchesterDamageLevel',
    category: 'winchester',
    titleAr: 'ذخيرة عيار ثقيل .44-40',
    descAr: 'يرفع ضرر بندقية وينشستر ويحطم الدروع بسرعة',
    maxLevel: 3,
    costs: [220, 380, 600],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.winchester.damage * (1 + lvl * 0.2))} ضرر`,
  },
  {
    key: 'winchesterReloadLevel',
    category: 'winchester',
    titleAr: 'رافعة تلقيم مصقولة',
    descAr: 'يسرّع تلقيم مخزن وينشستر الأنبوبي وإيقاع الرافعة',
    maxLevel: 3,
    costs: [190, 340, 520],
    formatEffect: (lvl) =>
      `${(WEAPONS.winchester.reloadDuration * (1 - lvl * 0.16)).toFixed(2)} ث`,
  },
  {
    key: 'winchesterAccuracyLevel',
    category: 'winchester',
    titleAr: 'منظار حديدي دقيق',
    descAr: 'دقة قنص فائقة وسرعة مقذوف أعلى لبندقية وينشستر',
    maxLevel: 3,
    costs: [180, 300, 480],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.winchester.projectileSpeed * (1 + lvl * 0.12))} م/ث`,
  },

  // Sharps 1874 Sniper Rifle
  {
    key: 'sniperDamageLevel',
    category: 'sniper',
    titleAr: 'ذخيرة صيد الجاموس .50-90',
    descAr: 'يرفع ضرر بندقية القناص الخارقة لإسقاط الزعماء بطلقات أقل',
    maxLevel: 3,
    costs: [240, 420, 650],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.sniper.damage * (1 + lvl * 0.22))} ضرر`,
  },
  {
    key: 'sniperReloadLevel',
    category: 'sniper',
    titleAr: 'مغلاق سريع التلقيم',
    descAr: 'يسرّع تعبئة بندقية القنص ومعدل الإطلاق بين الطلقات',
    maxLevel: 3,
    costs: [200, 350, 540],
    formatEffect: (lvl) =>
      `${(WEAPONS.sniper.reloadDuration * (1 - lvl * 0.16)).toFixed(2)} ث`,
  },
  {
    key: 'sniperScopeLevel',
    category: 'sniper',
    titleAr: 'منظار نحاسي طويل المدى',
    descAr: 'يزيد عدد الأهداف المخترقة ومدى الرؤية أثناء التصويب بالقناص',
    maxLevel: 3,
    costs: [210, 360, 560],
    formatEffect: (lvl) => `اختراق ${3 + lvl} أهداف`,
  },

  // Maxim Machine Gun (ساقية مكسيم)
  {
    key: 'maximDamageLevel',
    category: 'maxim',
    titleAr: 'سبطانة مكسيم المبرّدة الثقيلة',
    descAr: 'يزيد ضرر كل طلقة في حزام ساقية مكسيم مع تقليل الارتداد',
    maxLevel: 3,
    costs: [230, 400, 620],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.maxim.damage * (1 + lvl * 0.22))} ضرر`,
  },
  {
    key: 'maximFireRateLevel',
    category: 'maxim',
    titleAr: 'تروس دوران مكسيم السريعة',
    descAr: 'يزيد سرعة إطلاق الرصاص المتواصل في ساقية مكسيم',
    maxLevel: 3,
    costs: [210, 360, 560],
    formatEffect: (lvl) =>
      `${Math.round(1 / (WEAPONS.maxim.fireInterval * (1 - lvl * 0.14)))} طلقة/ث`,
  },
  {
    key: 'maximReloadLevel',
    category: 'maxim',
    titleAr: 'ملقم حزام سريع',
    descAr: 'يختصر زمن تبديل شريط الذخيرة سعة 40 طلقة',
    maxLevel: 3,
    costs: [190, 330, 510],
    formatEffect: (lvl) =>
      `${(WEAPONS.maxim.reloadDuration * (1 - lvl * 0.16)).toFixed(2)} ث`,
  },

  // Double-Barrel Coach Shotgun
  {
    key: 'shotgunDamageLevel',
    category: 'shotgun',
    titleAr: 'خرطوش صيد ثقيل العيار',
    descAr: 'يرفع ضرر كل شظية في طلقة بندقية الخرطوش المزدوجة',
    maxLevel: 3,
    costs: [210, 360, 560],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.shotgun.damage * (1 + lvl * 0.22))} × شظية`,
  },
  {
    key: 'shotgunReloadLevel',
    category: 'shotgun',
    titleAr: 'مفصل كسر سريع التعبئة',
    descAr: 'يسرّع فتح الماسورتين وإعادة تلقيم الخرطوش',
    maxLevel: 3,
    costs: [180, 310, 480],
    formatEffect: (lvl) =>
      `${(WEAPONS.shotgun.reloadDuration * (1 - lvl * 0.17)).toFixed(2)} ث`,
  },
  {
    key: 'shotgunChokeLevel',
    category: 'shotgun',
    titleAr: 'خانق فوهة متعدد الشظايا',
    descAr: 'يضيّق زاوية الانتشار ويزيد عدد الشظايا في كل طلقة',
    maxLevel: 3,
    costs: [220, 380, 580],
    formatEffect: (lvl) => `${7 + lvl} شظايا`,
  },

  // Dual Colt Peacemakers
  {
    key: 'dualDamageLevel',
    category: 'dual_pistols',
    titleAr: 'رصاص فضي مزدوج العيار',
    descAr: 'يزيد ضرر طلقة كل من المسدسين التوأم دون فقدان الخفة',
    maxLevel: 3,
    costs: [200, 350, 540],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.dual_pistols.damage * (1 + lvl * 0.22))} ضرر`,
  },
  {
    key: 'dualFireRateLevel',
    category: 'dual_pistols',
    titleAr: 'تبديل زناد خاطف باليدين',
    descAr: 'يرفع معدل إطلاق النار المتناوب بين المسدسين',
    maxLevel: 3,
    costs: [190, 330, 510],
    formatEffect: (lvl) =>
      `${Math.round(1 / (WEAPONS.dual_pistols.fireInterval * (1 - lvl * 0.13)))} طلقة/ث`,
  },
  {
    key: 'dualReloadLevel',
    category: 'dual_pistols',
    titleAr: 'ملقم مزدوج متزامن',
    descAr: 'يختصر زمن تعبئة الـ 12 طلقة في الأسطوانتين معاً',
    maxLevel: 3,
    costs: [170, 300, 470],
    formatEffect: (lvl) =>
      `${(WEAPONS.dual_pistols.reloadDuration * (1 - lvl * 0.16)).toFixed(2)} ث`,
  },

  // Silent Hunting Bow
  {
    key: 'bowDamageLevel',
    category: 'bow',
    titleAr: 'نصال صيد فولاذية حادة',
    descAr: 'يزيد ضرر السهام الصامتة للصيد النظيف والقنص الخفي',
    maxLevel: 3,
    costs: [185, 325, 500],
    formatEffect: (lvl) =>
      `${Math.round(WEAPONS.bow.damage * (1 + lvl * 0.22))} ضرر`,
  },
  {
    key: 'bowDrawLevel',
    category: 'bow',
    titleAr: 'وتر مشدود سريع الإطلاق',
    descAr: 'يسرّع سحب السهام من الجعبة ومعدل الرمي المتواصل',
    maxLevel: 3,
    costs: [170, 295, 460],
    formatEffect: (lvl) =>
      `${(WEAPONS.bow.fireInterval * (1 - lvl * 0.14)).toFixed(2)} ث`,
  },
  {
    key: 'bowVelocityLevel',
    category: 'bow',
    titleAr: 'ريش متوازن واختراق مضاعف',
    descAr: 'يرفع سرعة السهم وقدرته على اختراق أكثر من هدف بصمت تام',
    maxLevel: 3,
    costs: [195, 340, 530],
    formatEffect: (lvl) => `اختراق ${2 + lvl} أهداف`,
  },

  // Allied Posse (فريق الفرسان المساعد)
  {
    key: 'posseCountLevel',
    category: 'posse',
    titleAr: 'تجنيد فرسان إضافيين للفريق',
    descAr: 'يضم رفاقاً مسلحين يقاتلون العصابات معك (من 1 حتى 4 فرسان)',
    maxLevel: 3,
    costs: [250, 440, 690],
    formatEffect: (lvl) => `${1 + lvl} فرسان`,
  },
  {
    key: 'posseGearLevel',
    category: 'posse',
    titleAr: 'دروع وسروج فريق الفرسان',
    descAr: 'يرفع نقاط صحة أفراد الفريق المساعد وسرعتهم ومقاومتهم للرصاص',
    maxLevel: 3,
    costs: [190, 340, 520],
    formatEffect: (lvl) => `${120 + lvl * 45} صحة للفارس`,
  },
  {
    key: 'posseWeaponLevel',
    category: 'posse',
    titleAr: 'تسليح وذخيرة متطورة للفريق',
    descAr: 'يزيد ضرر طلقات الفريق المساعد وسرعة تصويبهم على العصابة',
    maxLevel: 3,
    costs: [210, 370, 580],
    formatEffect: (lvl) => `+${lvl * 28}% قوة نارية`,
  },

  // Health & Protective Armor
  {
    key: 'healthLevel',
    category: 'health',
    titleAr: 'تطوير الصحة القصوى',
    descAr: 'يزيد الحد الأقصى لنقاط الصحة (HP) لتصمد أمام موجات الأعداء والزعماء',
    maxLevel: 3,
    costs: [140, 270, 440],
    formatEffect: (lvl) => `${100 + lvl * 35} صحة`,
  },
  {
    key: 'vitalityRegenLevel',
    category: 'health',
    titleAr: 'التعافي القتالي وقوة الترياق',
    descAr: 'يرفع علاج الترياق (E) ويفعّل التجدد التلقائي للصحة عند تجنب الطلقات',
    maxLevel: 3,
    costs: [160, 300, 480],
    formatEffect: (lvl) =>
      `+${45 + lvl * 15} ترياق · ${lvl > 0 ? `${(lvl * 1.8).toFixed(1)}/ث` : 'بلا تجدد'}`,
  },
  {
    key: 'vestLevel',
    category: 'health',
    titleAr: 'سترة الفولاذ الواقية',
    descAr: 'تمتص 75% من ضرر الرصاص والانفجارات قبل المساس بالصحة',
    maxLevel: 3,
    costs: [240, 420, 680],
    formatEffect: (lvl) => `${lvl * 45} درع`,
  },

  // Tactical Gear & Dynamite
  {
    key: 'dynamiteDamageLevel',
    category: 'gear',
    titleAr: 'بارود ديناميت مضاعف',
    descAr: 'يزيد ضرر ونطاق انفجار أصابع الديناميت التي ترميها (G)',
    maxLevel: 3,
    costs: [180, 310, 490],
    formatEffect: (lvl) => `${Math.round(180 * (1 + lvl * 0.25))} ضرر`,
  },
  {
    key: 'bandolierLevel',
    category: 'gear',
    titleAr: 'حزام الذخيرة المزدوج',
    descAr: 'يزيد مخزون الذخيرة الاحتياطية لجميع الأسلحة بما فيها ساقية مكسيم',
    maxLevel: 3,
    costs: [150, 260, 400],
    formatEffect: (lvl) => `+${lvl * 40} طلقة`,
  },
  {
    key: 'bootsLevel',
    category: 'gear',
    titleAr: 'مهاميز الفارس السريعة',
    descAr: 'تزيد سرعة الجري وتقلص زمن تجهيز التدحرج (Space)',
    maxLevel: 3,
    costs: [170, 310, 480],
    formatEffect: (lvl) => `+${lvl * 10}% سرعة`,
  },
  {
    key: 'watchLevel',
    category: 'gear',
    titleAr: 'ساعة عين الصقر الذهبية',
    descAr: 'تطيل زمن إبطاء الوقت (Shift) وتسرّع شحن التركيز',
    maxLevel: 3,
    costs: [200, 350, 550],
    formatEffect: (lvl) => `شحن +${lvl * 30}%`,
  },
];

export const TONIC_COST = 110;
export const MAX_TONICS = 3;
export const DYNAMITE_COST = 85;
export const MAX_DYNAMITE = 6;

export function computeEffectiveStats(loadout: PlayerLoadout) {
  return {
    revolverDamage: Math.round(
      WEAPONS.revolver.damage * (1 + loadout.revolverDamageLevel * 0.22)
    ),
    revolverReload:
      WEAPONS.revolver.reloadDuration *
      (1 - loadout.revolverReloadLevel * 0.16),
    revolverSpread:
      WEAPONS.revolver.spreadRad * (1 - loadout.revolverAccuracyLevel * 0.24),

    winchesterDamage: Math.round(
      WEAPONS.winchester.damage * (1 + loadout.winchesterDamageLevel * 0.2)
    ),
    winchesterReload:
      WEAPONS.winchester.reloadDuration *
      (1 - loadout.winchesterReloadLevel * 0.16),
    winchesterSpread:
      WEAPONS.winchester.spreadRad *
      (1 - loadout.winchesterAccuracyLevel * 0.25),
    winchesterSpeed:
      WEAPONS.winchester.projectileSpeed *
      (1 + loadout.winchesterAccuracyLevel * 0.12),
    winchesterFireInterval:
      WEAPONS.winchester.fireInterval *
      (1 - loadout.winchesterReloadLevel * 0.08),

    sniperDamage: Math.round(
      WEAPONS.sniper.damage * (1 + loadout.sniperDamageLevel * 0.22)
    ),
    sniperReload:
      WEAPONS.sniper.reloadDuration * (1 - loadout.sniperReloadLevel * 0.16),
    sniperFireInterval:
      WEAPONS.sniper.fireInterval * (1 - loadout.sniperReloadLevel * 0.1),
    sniperPenetration: WEAPONS.sniper.penetration + loadout.sniperScopeLevel,
    sniperSpeed:
      WEAPONS.sniper.projectileSpeed * (1 + loadout.sniperScopeLevel * 0.1),
    sniperCameraLookahead: 0.16 + loadout.sniperScopeLevel * 0.06,

    maximDamage: Math.round(
      WEAPONS.maxim.damage * (1 + loadout.maximDamageLevel * 0.22)
    ),
    maximFireInterval:
      WEAPONS.maxim.fireInterval * (1 - loadout.maximFireRateLevel * 0.14),
    maximReload:
      WEAPONS.maxim.reloadDuration * (1 - loadout.maximReloadLevel * 0.16),
    maximSpread:
      WEAPONS.maxim.spreadRad * (1 - loadout.maximDamageLevel * 0.14),

    shotgunDamage: Math.round(
      WEAPONS.shotgun.damage * (1 + loadout.shotgunDamageLevel * 0.22)
    ),
    shotgunReload:
      WEAPONS.shotgun.reloadDuration * (1 - loadout.shotgunReloadLevel * 0.17),
    shotgunSpread:
      WEAPONS.shotgun.spreadRad * (1 - loadout.shotgunChokeLevel * 0.16),
    shotgunPellets: (WEAPONS.shotgun.pellets ?? 7) + loadout.shotgunChokeLevel,

    dualDamage: Math.round(
      WEAPONS.dual_pistols.damage * (1 + loadout.dualDamageLevel * 0.22)
    ),
    dualFireInterval:
      WEAPONS.dual_pistols.fireInterval * (1 - loadout.dualFireRateLevel * 0.13),
    dualReload:
      WEAPONS.dual_pistols.reloadDuration * (1 - loadout.dualReloadLevel * 0.16),
    dualSpread:
      WEAPONS.dual_pistols.spreadRad * (1 - loadout.dualDamageLevel * 0.14),

    bowDamage: Math.round(
      WEAPONS.bow.damage * (1 + loadout.bowDamageLevel * 0.22)
    ),
    bowFireInterval:
      WEAPONS.bow.fireInterval * (1 - loadout.bowDrawLevel * 0.14),
    bowReload:
      WEAPONS.bow.reloadDuration * (1 - loadout.bowDrawLevel * 0.15),
    bowSpeed:
      WEAPONS.bow.projectileSpeed * (1 + loadout.bowVelocityLevel * 0.14),
    bowPenetration: WEAPONS.bow.penetration + loadout.bowVelocityLevel,

    dynamiteDamage: Math.round(180 * (1 + loadout.dynamiteDamageLevel * 0.25)),
    dynamiteRadius: 118 + loadout.dynamiteDamageLevel * 16,

    maxHp: 100 + loadout.healthLevel * 35,
    tonicHeal: 45 + loadout.vitalityRegenLevel * 15,
    waveHeal: 15 + loadout.vitalityRegenLevel * 10,
    hpRegenRate: loadout.vitalityRegenLevel * 1.8,

    maxArmor: loadout.vestLevel * 45,
    extraRevolverReserve: loadout.bandolierLevel * 24,
    extraWinchesterReserve: loadout.bandolierLevel * 16,
    extraSniperReserve: loadout.bandolierLevel * 10,
    extraMaximReserve: loadout.bandolierLevel * 60,
    extraShotgunReserve: loadout.bandolierLevel * 10,
    extraDualReserve: loadout.bandolierLevel * 36,
    extraBowReserve: loadout.bandolierLevel * 14,
    speedMultiplier: 1 + loadout.bootsLevel * 0.1,
    dodgeCooldownBase: 0.95 * (1 - loadout.bootsLevel * 0.15),
    deadeyeDrainRate: 28 * (1 - loadout.watchLevel * 0.15),
    deadeyeRegenRate: 5.5 * (1 + loadout.watchLevel * 0.3),

    posseCount: 1 + loadout.posseCountLevel,
    posseHp: 120 + loadout.posseGearLevel * 45,
    posseSpeedMult: 1 + loadout.posseGearLevel * 0.1,
    posseDamageMult: 1 + loadout.posseWeaponLevel * 0.28,
    posseFireRateMult: 1 - loadout.posseWeaponLevel * 0.12,
  };
}
