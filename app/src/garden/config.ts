// All tunable numbers for the garden in one place. Tuned with scripts/simulate-activity.ts.
export const GARDEN = {
  /** A word counts as "learned" once its best card has at least this stability (days). */
  learnedStabilityDays: 7,

  /** Study days in the last 7 that count as full engagement (5 of 7 = full marks). */
  fullEngagementDays: 5,
  /** Memory loss at which the memory score reaches zero (fraction of cards expected forgotten). */
  forgottenRatioAtZero: 0.5,
  /** Days of absence over which the recency score fades (exp(-days/tau)). */
  recencyTauDays: 4,

  weights: { engagement: 0.4, memory: 0.3, recency: 0.3 },

  /** Activity score thresholds for weather. Below `overcast` is drought. */
  weather: { sunny: 0.8, partlyCloudy: 0.55, overcast: 0.22 },
  /** This many days with no study forces drought no matter the score. */
  droughtAfterDays: 10,

  health: {
    studyGain: 0.12,
    /** daily loss on a day with no study, by weather of that day */
    decay: { sunny: 0.005, 'partly-cloudy': 0.02, overcast: 0.04, drought: 0.07 },
    /** consecutive days at zero health before the plant dies */
    deadAfterZeroDays: 14,
  },

  /** Progress fraction of the goal at which each stage 2..10 starts. */
  stageStarts: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.55, 0.75, 0.95],
  goalOptions: [50, 100, 250, 500],
} as const
