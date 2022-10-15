import { MinMax } from "../../utils";

export const ELO_COEFFICIENT:number = 50;
export const DUEL_DURATION:number = 180;
export const DEFAULT_ELO:number = 1200;
export const MATCH_ELO_DIFF:number = 400;
export const NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE:number = 5;
export const CHANCE_FOR_BOT:number = 0.3;
export const BOT_THRESHOLD:MinMax = new MinMax(0.7, 0.9);
