import "reflect-metadata";
import { Container } from 'inversify';
import { IocContainer } from '@tsoa/runtime'; // Importujemy interfejs z tsoa
import WordleDBI from './api/v4/DBI/DBI';
import { Stats } from './WordleStatsDBI';
import { PlayerController } from './api/v4/player/player_controller';
import { WordleController } from './api/v4/wordle/wordle_controller';
import { SpellingBeeController } from './api/v4/spelling_bee/spelling_bee_controller';
import { SpellingBeeDuelController } from './api/v4/spelling_bee/duel/spelling_bee_duel_controller';
import { CrosswordController } from './api/v4/crossword/crossword_controller';
import { CrosswordController_v3 } from './api/v4/crossword_v3/crossword_controller';
import { FriendController } from './api/v4/friend/friend_controller';
import { ExplainerController } from './api/v4/explainer/explainer_controller';
import { GeminiSpellingBeeWordExplainer } from './wordExplainers/gemini_spelling_bee_word_explainer';
import { WordExplainer } from './wordExplainers/word_explainer';
import { GeminiExplanationGetter } from './gemini/gemini_explanation_getter';
import { GeminiClient } from './gemini/gemini_client';
import { WordleChallengeController } from './api/v4/wordle/wordle_challenge/wordle_challenge_controller';
import { SpellingBeeSeasonManager } from './spelling_bee_season_manager';
import { SeasonRulesService } from './api/v4/season_rules';
import { RankingController } from './api/v4/ranking_controller';
import { CronService } from './cron';
import { Logger } from './logger';

const container = new Container();

container.bind<WordleDBI>(WordleDBI).toSelf().inSingletonScope();
container.bind<Stats>(Stats).toSelf().inSingletonScope();
container.bind<Logger>(Logger).toSelf().inTransientScope();
container.bind<SpellingBeeSeasonManager>(SpellingBeeSeasonManager).toSelf().inSingletonScope();
container.bind<SeasonRulesService>(SeasonRulesService).toSelf().inSingletonScope();


container.bind<PlayerController>(PlayerController).toSelf().inSingletonScope();
container.bind<WordleController>(WordleController).toSelf().inSingletonScope();
container.bind<WordleChallengeController>(WordleChallengeController).toSelf().inSingletonScope();
container.bind<SpellingBeeController>(SpellingBeeController).toSelf().inSingletonScope();
container.bind<SpellingBeeDuelController>(SpellingBeeDuelController).toSelf().inSingletonScope();
container.bind<CrosswordController>(CrosswordController).toSelf().inSingletonScope();
container.bind<CrosswordController_v3>(CrosswordController_v3).toSelf().inSingletonScope();
container.bind<FriendController>(FriendController).toSelf().inSingletonScope();
container.bind<ExplainerController>(ExplainerController).toSelf().inSingletonScope();
container.bind<GeminiClient>(GeminiClient).toSelf().inSingletonScope();
container.bind<GeminiExplanationGetter>(GeminiExplanationGetter).toSelf().inSingletonScope();
container.bind<WordExplainer>(WordExplainer).to(GeminiSpellingBeeWordExplainer).inSingletonScope();
container.bind<RankingController>(RankingController).toSelf().inSingletonScope();
container.bind<CronService>(CronService).toSelf().inSingletonScope();
container.get(CronService); 



const iocContainer: IocContainer = {
    get: <T>(key: { prototype: T } | any): T => {
        return container.get<T>(key);
    }
};

export { iocContainer };