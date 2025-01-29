export const RAKE_PERCENTAGE = 0.12; // 12% rake

export const calculateRake = (amount: number) => {
  return Math.floor(amount * RAKE_PERCENTAGE);
};