export const TAKE_HOME_SUPPORTED_YEARS = [2026] as const;

export const DEFAULT_TAKE_HOME_SUPPORTED_YEAR = TAKE_HOME_SUPPORTED_YEARS[0];

export function isTakeHomeSupportedYear(year: number): boolean {
  return (TAKE_HOME_SUPPORTED_YEARS as readonly number[]).includes(year);
}
