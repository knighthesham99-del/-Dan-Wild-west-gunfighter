import { LegendsRecord, StageId } from './types';

export const DEFAULT_LEGENDS_RECORD: LegendsRecord = {
  totalOutlawsDefeated: 0,
  totalStealthSniperKills: 0,
  totalAnimalsHunted: 0,
  rareAnimalsHunted: 0,
  legendaryAnimalsHunted: 0,
  fastestBossDuelSeconds: null,
  fastestSniperHuntSeconds: null,
  bestCombo: 0,
  highestSingleStageBounty: 0,
  totalBountyEarnedLifetime: 0,
  stagesCompleted: [],
  bossDefeatedCount: 0,
};

export interface LegendAchievementDef {
  id: string;
  titleAr: string;
  descAr: string;
  badgeLabelAr: string;
  evaluate: (rec: LegendsRecord) => {
    unlocked: boolean;
    progressTextAr: string;
    progressPct: number;
  };
}

export const LEGEND_ACHIEVEMENTS: LegendAchievementDef[] = [
  {
    id: 'rare_hunter',
    titleAr: 'صائد الوحوش النادرة',
    descAr: 'اصطد 5 حيوانات صعبة أو أسطورية (كوجر، ثور بيسون، أو دب عملاق) في سهول الصيد',
    badgeLabelAr: 'وسام الصياد الأسطوري',
    evaluate: (rec) => {
      const target = 5;
      const cur = rec.rareAnimalsHunted;
      return {
        unlocked: cur >= target,
        progressTextAr: `${Math.min(cur, target)} / ${target} طرائد نادرة`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'legendary_beast',
    titleAr: 'قاهر البيسون والدب العملاق',
    descAr: 'أسقط 3 وحوش من الفئة الأسطورية في سهول الصيد البرية',
    badgeLabelAr: 'وسام الفئة الأسطورية',
    evaluate: (rec) => {
      const target = 3;
      const cur = rec.legendaryAnimalsHunted;
      return {
        unlocked: cur >= target,
        progressTextAr: `${Math.min(cur, target)} / ${target} وحش أسطوري`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'lightning_duel',
    titleAr: 'برق الغروب (أسرع نزال فردي)',
    descAr: 'اهزم المارشال كويرفو في نزال الغروب الفردي خلال 50 ثانية أو أقل',
    badgeLabelAr: 'أسرع زناد في الغرب',
    evaluate: (rec) => {
      const best = rec.fastestBossDuelSeconds;
      const unlocked = best !== null && best <= 50;
      return {
        unlocked,
        progressTextAr:
          best !== null ? `أسرع زمن: ${best} ثانية` : 'لم يُحسم النزال بعد',
        progressPct: unlocked ? 100 : best !== null ? 65 : 0,
      };
    },
  },
  {
    id: 'canyon_ghost',
    titleAr: 'شبح الأخاديد (قناص خفي)',
    descAr: 'اقنص 12 خارجاً عن القانون خفياً بالمنظار أو القوس دون أن يكتشفوك',
    badgeLabelAr: 'وسام القنص الصامت',
    evaluate: (rec) => {
      const target = 12;
      const cur = rec.totalStealthSniperKills;
      return {
        unlocked: cur >= target,
        progressTextAr: `${Math.min(cur, target)} / ${target} قنص خفي`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'posse_marshal',
    titleAr: 'قائد الفرسان وصائد العصابات',
    descAr: 'اقضِ على 60 من قطاع الطرق وأفراد العصابات عبر المراحل',
    badgeLabelAr: 'نجمة المارشال الذهبية',
    evaluate: (rec) => {
      const target = 60;
      const cur = rec.totalOutlawsDefeated;
      return {
        unlocked: cur >= target,
        progressTextAr: `${Math.min(cur, target)} / ${target} عدو`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'combo_legend',
    titleAr: 'إعصار الرصاص (أعلى تتابع)',
    descAr: 'حقق سلسلة إصابات متتالية تصل إلى ×10 أو أكثر',
    badgeLabelAr: 'تتابع أسطوري',
    evaluate: (rec) => {
      const target = 10;
      const cur = rec.bestCombo;
      return {
        unlocked: cur >= target,
        progressTextAr: `أعلى تتابع: ×${cur}`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
  {
    id: 'frontier_conqueror',
    titleAr: 'فاتح الغرب الأمريكي',
    descAr: 'أكمل جميع مراحل الحملة السبع من معسكر التدريب حتى نزال الغروب',
    badgeLabelAr: 'أسطورة الغرب الكاملة',
    evaluate: (rec) => {
      const target = 7;
      const cur = rec.stagesCompleted.length;
      return {
        unlocked: cur >= target,
        progressTextAr: `${cur} / ${target} مراحل مكتملة`,
        progressPct: Math.min(100, Math.round((cur / target) * 100)),
      };
    },
  },
];

export function mergeStageResultIntoLegends(
  prev: LegendsRecord,
  stageId: StageId,
  cleared: boolean,
  stats: {
    kills: number;
    stealthKills: number;
    maxCombo: number;
    timeSeconds: number;
    bountyEarned: number;
    goldLooted: number;
  }
): LegendsRecord {
  const completedSet = new Set<StageId>(prev.stagesCompleted);
  if (cleared) {
    completedSet.add(stageId);
  }

  let fastestBossDuel = prev.fastestBossDuelSeconds;
  if (cleared && stageId === 'boss_duel') {
    fastestBossDuel =
      fastestBossDuel === null
        ? stats.timeSeconds
        : Math.min(fastestBossDuel, stats.timeSeconds);
  }

  let fastestSniperHunt = prev.fastestSniperHuntSeconds;
  if (cleared && stageId === 'sniper_hunt') {
    fastestSniperHunt =
      fastestSniperHunt === null
        ? stats.timeSeconds
        : Math.min(fastestSniperHunt, stats.timeSeconds);
  }

  return {
    ...prev,
    totalOutlawsDefeated: prev.totalOutlawsDefeated + stats.kills,
    totalStealthSniperKills: prev.totalStealthSniperKills + stats.stealthKills,
    fastestBossDuelSeconds: fastestBossDuel,
    fastestSniperHuntSeconds: fastestSniperHunt,
    bestCombo: Math.max(prev.bestCombo, stats.maxCombo),
    highestSingleStageBounty: Math.max(
      prev.highestSingleStageBounty,
      stats.bountyEarned
    ),
    totalBountyEarnedLifetime:
      prev.totalBountyEarnedLifetime + stats.goldLooted + stats.kills * 15,
    stagesCompleted: Array.from(completedSet),
    bossDefeatedCount:
      prev.bossDefeatedCount + (cleared && stageId === 'boss_duel' ? 1 : 0),
  };
}
