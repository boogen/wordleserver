import joi from '@hapi/joi';

const fixedPointsSchema = joi.object({length: joi.number(), points: joi.number()})
const multiplierSchema = joi.object({length: joi.number(), value: joi.number()})
const penaltiesSchema = joi.object({length: joi.number(), points: joi.number()})

const profileSchema = joi.object({
    fixedPoints: joi.array().items(fixedPointsSchema),
    multipliers: joi.array().items(multiplierSchema),
    penaltiesSchema: joi.array().items(penaltiesSchema),
    noOfLetters: joi.number()
});

export class SeasonRules {
    fixedPoints:Map<number, number> = new Map();
    multiplier:Map<number, number> = new Map();
    penalties:Map<string, number> = new Map();
    noOfLetters:number;
    constructor(json:string) {
        profileSchema.validate(json);
        this.noOfLetters = 7;
        JSON.parse(json, this.reviver)
    }

    reviver(key:string, value:any):void {
        switch(key) {
            case "fixedPoints": this.addFixedPoints(value); break;
            case "multiplier": this.addMultipliers(value); break;
            case "penalties": this.addPenalties(value); break;
            case "noOfLetters": this.noOfLetters = Number.parseInt(value)
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

    addPenalties(penalties:any[]) {
        for (var penalty of penalties) {
            this.penalties.set(penalty.length, penalty.value);
        }
    }
}
