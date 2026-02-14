import { inject, injectable } from "inversify";
import { WordExplainer } from "./word_explainer";
import WordleDBI from "../api/v4/DBI/DBI";
import { getBeeState, getLettersForBee } from "../api/v4/DBI/spelling_bee/spelling_bee";
import { GlobalBee } from "../api/v4/DBI/spelling_bee/GlobalBee";
import { GuessedWordsBee } from "../api/v4/DBI/spelling_bee/GuessedWordsBee";
import { GeminiExplanationGetter } from "../gemini/gemini_explanation_getter";
import { Logger } from "../logger";

@injectable()
export class GeminiSpellingBeeWordExplainer extends WordExplainer {
    constructor(
        @inject(WordleDBI) dbi: WordleDBI,
        @inject(GeminiExplanationGetter) private explanationGetter: GeminiExplanationGetter,
        @inject(Logger) logger: Logger
    ) {
        super(dbi, logger);
        logger.setContext("GeminiSpellingBeeWordExplainer");
    }
    
    async doGetExplanation(player_id:number, word: string, skipValidation:boolean): Promise<string | null> {
        if (!skipValidation && !await this.validate(player_id, word)) {
            this.logger.info(`Player ${player_id} asked for explanation for word ${word} which they haven't guessed yet, skipping explanation`);
            return null;
        }
        return await this.explanationGetter.getExplanation(word);
    }

    private async validate(player_id:number, word: string):Promise<boolean> {
        const timestamp = Date.now() / 1000;
        var letters:GlobalBee|null = await getLettersForBee(timestamp, this.dbi);
        var state:GuessedWordsBee|null = await getBeeState(player_id, letters!.bee_id, this.dbi);
        return state?.guesses.includes(word) ?? false;
    }

}