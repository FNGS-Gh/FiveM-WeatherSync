export const genChance = (amplifier = 1.0): number => 
  amplifier * Math.random();

export const getRandomRng = (min: number, max: number) => {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil) + minCeil);
};

export const getRandomRngInc = (min: number, max: number) => {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1) + minCeil);
};

export const getChanceBag = (
  chance: number,
  bagSize = 100
): (() => boolean) => {
  const validChance = chance > 0 && chance <= 1 ? chance : 0.01;
  const length = bagSize >= 10 && Number.isInteger(Math.log10(bagSize))
    ? bagSize : 100;
  const successQty = Math.round(validChance * length);

  const refillBag = (): boolean[] => {
    const bag = Array.from({ length }, (_, i) => i < successQty);

    for (let i = bag.length - 1; i > 0; i--) {
      const j = getRandomRng(0, i + 1);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    return bag;
  };

  let bag = refillBag();

  return () => {
    if (bag.length === 0) bag = refillBag();
    return bag.pop() as boolean;
  };
};