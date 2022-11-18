import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { Bee } from "./Bee";

export async function getBeeById(bee_model_id:number, dbi:WordleDBI):Promise<FindOneResult<Bee>> {
    return dbi.bees().findOne({id:bee_model_id});
}

export async function isBeeWordOnExtraList(word:string, dbi:WordleDBI):Promise<boolean> {
    return dbi.extra_bee_words().findOne({word:word}).then(value => {return value != null});
}

export async function wordExists(word:string, bee_model_id:number, dbi:WordleDBI) {
    var bee_words:string[] = (await dbi.bees().findOne({id: bee_model_id}))!.words;
    var wordOnList:boolean = bee_words.includes(word);
    return wordOnList || isBeeWordOnExtraList(word, dbi);
}

export async function getBeeWords(bee_model_id:number, dbi:WordleDBI):Promise<String[]> {
    return (await dbi.bees().findOne({id: bee_model_id}))!.words
}

export async function getRandomBee(dbi:WordleDBI):Promise<Bee> {
    return (await dbi.bees().aggregate([{ $sample: { size: 1 } }]))[0]
}