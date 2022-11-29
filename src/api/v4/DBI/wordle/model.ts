import WordleDBI from "../DBI";

export async function getWord(dbi:WordleDBI) {
    return dbi.words().aggregate([{ $sample: { size: 1 } }]);
}

export async function isWordValid(word:string, dbi:WordleDBI):Promise<boolean> {
    return dbi.possible_words().findOne({word:word}).then(value => {return value != null});
}