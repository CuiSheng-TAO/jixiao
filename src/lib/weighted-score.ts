export type WeightedScoreDimensions = {
  performanceStars: number | null;
  comprehensiveStars: number | null;
  learningStars: number | null;
  adaptabilityStars: number | null;
  candidStars: number | null;
  progressStars: number | null;
  altruismStars: number | null;
  rootStars: number | null;
};

export function roundToOneDecimal(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
}

export function computeAbilityAverage(
  comprehensiveStars: number | null,
  learningStars: number | null,
  adaptabilityStars: number | null,
): number | null {
  if (comprehensiveStars == null || learningStars == null || adaptabilityStars == null) return null;
  return roundToOneDecimal((comprehensiveStars + learningStars + adaptabilityStars) / 3);
}

export function computeValuesAverage(
  candidStars: number | null,
  progressStars: number | null,
  altruismStars: number | null,
  rootStars: number | null,
): number | null {
  if (candidStars == null || progressStars == null || altruismStars == null || rootStars == null) return null;
  return roundToOneDecimal((candidStars + progressStars + altruismStars + rootStars) / 4);
}

export function computeRoundedAbilityStars(
  comprehensiveStars: number | null,
  learningStars: number | null,
  adaptabilityStars: number | null,
): number | null {
  const average = computeAbilityAverage(comprehensiveStars, learningStars, adaptabilityStars);
  return average == null ? null : Math.round(average);
}

export function computeRoundedValuesStars(
  candidStars: number | null,
  progressStars: number | null,
  altruismStars: number | null,
  rootStars: number | null,
): number | null {
  const average = computeValuesAverage(candidStars, progressStars, altruismStars, rootStars);
  return average == null ? null : Math.round(average);
}

export function computeWeightedScore(
  performanceStars: number | null,
  abilityStars: number | null,
  valuesStars: number | null,
): number | null {
  if (performanceStars == null || abilityStars == null || valuesStars == null) return null;
  return roundToOneDecimal(performanceStars * 0.5 + abilityStars * 0.3 + valuesStars * 0.2);
}

export function computeWeightedScoreFromDimensions(dimensions: WeightedScoreDimensions): number | null {
  const abilityAverage = computeAbilityAverage(
    dimensions.comprehensiveStars,
    dimensions.learningStars,
    dimensions.adaptabilityStars,
  );
  const valuesAverage = computeValuesAverage(
    dimensions.candidStars,
    dimensions.progressStars,
    dimensions.altruismStars,
    dimensions.rootStars,
  );

  return computeWeightedScore(dimensions.performanceStars, abilityAverage, valuesAverage);
}
