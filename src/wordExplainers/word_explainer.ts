import WordleDBI from "../api/v4/DBI/DBI";
import { Logger } from "../logger";

export abstract class WordExplainer {
    constructor(
        protected dbi: WordleDBI,
        protected logger: Logger
    ) {
    }

    public async getExplanation(playerId:number, word:string):Promise<string|null> {
        var explanation = await this.dbi.getWordExplanation(word);
        if (explanation !== null) {
            return Promise.resolve(explanation);
        }
        this.logger.info("No cached explanation for word '" + word + "', fetching new one");
        explanation = await this.doGetExplanation(playerId, word, false);
        if (explanation !== null) {
            this.dbi.saveWordExplanation(word, explanation);
        }
        return explanation;
    }

    getDebugExplanation(password: string, word: string): Promise<string | null>  {
        if (password !== process.env.EXPLAINER_DEBUG_PASSWORD) {
            return Promise.resolve(null);
        }
        return this.doGetExplanation(-1, word, true);
    }

    protected abstract doGetExplanation(playerId:number, word: string, skipValidation:boolean):Promise<string|null>;
}