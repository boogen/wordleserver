import { FindOneResult } from "monk";
import { SeasonRules } from "../../season_rules";
import WordleDBI from "../DBI";
import { Bee } from "./Bee";

export async function getBeeById(bee_model_id:number, dbi:WordleDBI):Promise<FindOneResult<Bee>> {
    for (var i = 0; i < 4; i ++) {
        var candidate = await dbi.bees(i).findOne({id:bee_model_id});
        if (candidate) {
            return candidate;
        }
    }
    return null;
}

export async function isBeeWordOnExtraList(word:string, dbi:WordleDBI):Promise<boolean> {
    return dbi.extra_bee_words().findOne({word:word}).then(value => {return value != null});
}

export async function wordExists(word:string, dbi:WordleDBI) {
    return isBeeWordOnExtraList(word, dbi);
}

export async function getRandomBee(dbi:WordleDBI, season_rules:SeasonRules|null):Promise<Bee> {
    return (await dbi.bees(season_rules?.noOfRequiredLetters || 1).aggregate([{ $sample: { size: 1 } }]))[0]
}