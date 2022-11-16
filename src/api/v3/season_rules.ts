import joi, { required } from '@hapi/joi';
import * as fs from 'fs';

const fixedPointsSchema = joi.object({length: joi.number().required(), points: joi.number().required()})
const multiplierSchema = joi.object({length: joi.number().required(), value: joi.number().required()})

const pointsForLetterSchema = joi.object({letter:joi.string().trim().required(), points: joi.number().required()})
const letterUsageSchema = joi.object({letter:joi.string().trim().required(), limit: joi.number().required()})


const profileSchema = joi.object({
    fixedPoints: joi.array().items(fixedPointsSchema),
    multipliers: joi.array().items(multiplierSchema),
    noOfLetters: joi.number(),
    addBlank: joi.boolean(),
    pointsForLetters: joi.array().items(pointsForLetterSchema),
    letterUsage: joi.array().items(letterUsageSchema)
});

export function getSeasonRules():SeasonRules {
    if (fs.existsSync('model/season.json')) {
        return new SeasonRules(fs.readFileSync('model/season.json','utf8'))
    }
    return new SeasonRules('{}');
}

export class SeasonRules {
    public fixedPoints:Map<number, number> = new Map();
    public multiplier:Map<number, number> = new Map();
    public pointsForLetters:Map<string, number> = new Map();
    public letterUsage:Map<String, number> = new Map();

    public noOfLetters:number;
    public addBlank:boolean;
    constructor(json:string) {
        profileSchema.validate(json);
        this.noOfLetters = 7;
        this.addBlank = false;
        var seasonData = JSON.parse(json)
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
}
