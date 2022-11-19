import joi, { required } from '@hapi/joi';
import * as fs from 'fs';
import { getSpellingBeeSeasonManager } from '../../spelling_bee_season_manager';
//import { file } from 'googleapis/build/src/apis/file';

const fixedPointsSchema = joi.object({length: joi.number().required(), points: joi.number().required()})
const multiplierSchema = joi.object({length: joi.number().required(), value: joi.number().required()})

const pointsForLetterSchema = joi.object({letter:joi.string().trim().required(), points: joi.number().required()})
const letterUsageSchema = joi.object({letter:joi.string().trim().required(), limit: joi.number().required()})
const letterToBuySchema = joi.object({price: joi.number().required(), useLimit: joi.number().required()})


const profileSchema = joi.object({
    fixedPoints: joi.array().items(fixedPointsSchema),
    multipliers: joi.array().items(multiplierSchema),
    panagramsOnly: joi.boolean().default(false),
    noOfLetters: joi.number(),
    addBlank: joi.boolean(),
    pointsForLetters: joi.array().items(pointsForLetterSchema),
    letterUsage: joi.array().items(letterUsageSchema),
    lettersToBuy: joi.array().items(letterToBuySchema)
});

export async function getDuelSeasonRules():Promise<SeasonRules> {
    return await getSpellingBeeSeasonManager().getCurrentDuelSeason();
}

export async function getSeasonRules():Promise<SeasonRules> {
    return await getSpellingBeeSeasonManager().getCurrentSeason();
}

export class LetterToBuy {
    constructor(public price:number, public useLimit:number) {}
}

export class SeasonRules {
    public fixedPoints:Map<number, number> = new Map();
    public multiplier:Map<number, number> = new Map();
    public pointsForLetters:Map<string, number> = new Map();
    public letterUsage:Map<String, number> = new Map();
    public panagramsOnly:boolean = false;
    public lettersToBuy:LetterToBuy[];

    public noOfLetters:number;
    public addBlank:boolean;
    public noOfRequiredLetters:number;
    public duelTag:string|undefined;
    public id:string;
    public season_title:string;
    public rules:string;
    public endTime:Date|null;

    constructor(seasonData:any, id:string, season_title:string, rules:string, endTime:Date|null) {
        this.endTime = endTime;
        this.noOfLetters = 7;
        this.addBlank = false;
        this.id = id;
        this.season_title = season_title
        this.rules = rules
        if (seasonData.noOfLetters != undefined) {
            this.noOfLetters = Number.parseInt(seasonData.noOfLetters);
        }
        if (seasonData.addBlank != undefined) {
            this.addBlank = Boolean(seasonData.addBlank)
        }
        if (seasonData.fixedPoints) {
            this.addFixedPoints(seasonData.fixedPoints);
        }
        if (seasonData.multipliers) {
            this.addMultipliers(seasonData.multipliers);
        }
        if (seasonData.pointsForLetters) {
            this.addPointsForLetters(seasonData.pointsForLetters);
        }
        if (seasonData.letterUsage) {
            this.addLetterUsage(seasonData.letterUsage);
        }
        if (seasonData.panagramsOnly) {
            this.panagramsOnly = seasonData.panagramsOnly;
        }
        if (seasonData.noOfRequiredLetters) {
            this.noOfRequiredLetters = seasonData.noOfRequiredLetters;
        }
        else {
            this.noOfRequiredLetters = 1;
        }
        if (seasonData.duelTag) {
            this.duelTag = seasonData.duelTag;
        }
        else {
            this.duelTag = undefined;
        }
        this.lettersToBuy = seasonData.lettersToBuy?.map((letter: LetterToBuy) => new LetterToBuy(letter.price, letter.useLimit))
    }

    addFixedPoints(fixedPoints:any[]) {
        for (var fixedPoint of fixedPoints) {
            this.fixedPoints.set(fixedPoint.length, fixedPoint.points);
        }
    }

    addMultipliers(multipliers:any[]) {
        for (var multiplier of multipliers) {
            this.multiplier.set(multiplier.length, multiplier.value);
        }
    }

    addPointsForLetters(pointsForLetters:any[]) {
        for (var pfl of pointsForLetters) {
            this.pointsForLetters.set(pfl.letter, pfl.points);
        }
    }

    addLetterUsage(letterUsage:any[]) {
        for (var lu of letterUsage) {
            this.letterUsage.set(lu.letter, lu.limit);
        }
    }

    getUsageLimit(letter:string):number {
        if (!this.letterUsage.has(letter)) {
            return -1;
        }
        return this.letterUsage.get(letter)!;
    }

    getPointsForLetter(letter:string):number {
        if (!this.pointsForLetters.has(letter)) {
            return 0;
        }
        return this.pointsForLetters.get(letter)!;
    }

    getSecondsToEnd():number {
        if (this.endTime === null) {
            return -1;
        }
        console.log(this.endTime)
        console.log(new Date())
        return (this.endTime!.getMilliseconds() - new Date().getMilliseconds())/1000;
    }
}
