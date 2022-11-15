import joi from '@hapi/joi';

const fixedPointsSchema = joi.object({length: joi.number(), points: joi.number()})
const multiplierSchema = joi.object({length: joi.number(), value: joi.number()})
const penaltiesSchema = joi.object({length: joi.number(), points: joi.number()})

const profileSchema = joi.object({
    fixedPoints: joi.array().items(fixedPointsSchema),
    multipliers: joi.array().items(multiplierSchema),
    penaltiesSchema: joi.array().items(penaltiesSchema),
    noOfLetters: joi.number(),
    addBlank: joi.boolean()
});

export class SeasonRules {
    public fixedPoints:Map<number, number> = new Map();
    public multiplier:Map<number, number> = new Map();
    public penalties:Map<string, number> = new Map();
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
