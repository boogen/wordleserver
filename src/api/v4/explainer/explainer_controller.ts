import { inject, injectable } from "inversify";
import { BodyProp, Route, Post } from "tsoa";
import WordleDBI from "../DBI/DBI";
import { WordExplainer } from "../../../wordExplainers/word_explainer";
import { resolvePlayerId } from "../DBI/player/player";

interface ExplainReply {
    explanation:string|null
}


@injectable()
@Route("api/v4/explainer")
export class ExplainerController {

    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(WordExplainer) private explanationProvider: WordExplainer
    ) {
    }


    @Post("/explain")
    public async explain(@BodyProp() auth_id: string, @BodyProp() word: string): Promise<ExplainReply> {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var explanation:string|null = await this.explanationProvider.getExplanation(playerId, word);
        return {explanation: explanation};
    }

    @Post("/debug_explain")
    public async debugExplain(@BodyProp() password:string, @BodyProp() word: string): Promise<ExplainReply> {
        var explanation:string|null = await this.explanationProvider.getDebugExplanation(password, word);
        return {explanation: explanation};
    }
}