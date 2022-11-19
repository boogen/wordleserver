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
    public fixedPoints:any = {};
    public multiplier:any = {};
    public pointsForLetters:any = {};
    public letterUsage:any = {};
    public panagramsOnly:boolean = false;
    public lettersToBuy:LetterToBuy[];

    public noOfLetters:number;
    public addBlank:boolean;
    public noOfRequiredLetters:number;
    public duelTag:string|null;
    public id:string;
    public season_title:string;
    public rules:string;
    public endTime:Date|null;
    public points:string;

    constructor(seasonData:any, id:string, season_title:string, rules:string, points:string, endTime:Date|null, duelTag:string|null) {
        this.points = points;
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
            this.fixedPoints = seasonData.fixedPoints;
        }
        if (seasonData.multipliers) {
            this.multiplier = seasonData.multpliers;
        }
        if (seasonData.pointsForLetters) {
            this.pointsForLetters = seasonData.pointsForLetters;
        }
        if (seasonData.letterUsage) {
            this.letterUsage = seasonData.letterUsage;
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
        this.duelTag = duelTag;
        this.lettersToBuy = seasonData.lettersToBuy?.map((letter: LetterToBuy) => new LetterToBuy(letter.price, letter.useLimit)) ?? []
    }


    getUsageLimit(letter:string):number {
        var letterUsage = new Map(Object.entries(this.letterUsage))
        if (!letterUsage.has(letter)) {
            return -1;
        }
        return letterUsage.get(letter)! as number;
    }

    getPointsForLetter(letter:string):number {
        var pointsForLetters = new Map(Object.entries(this.pointsForLetters))
        if (!pointsForLetters.has(letter)) {
            return 0;
        }
        return pointsForLetters.get(letter)! as number;
    }

    getSecondsToEnd():number {
        if (this.endTime === null) {
            return -1;
        }
        return (this.endTime!.getTime() - new Date().getTime())/1000;
    }
}
