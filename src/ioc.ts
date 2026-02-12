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

const container = new Container();

container.bind<WordleDBI>(WordleDBI).toSelf().inSingletonScope();
container.bind<Stats>(Stats).toSelf().inSingletonScope();


container.bind<PlayerController>(PlayerController).toSelf().inSingletonScope();
container.bind<WordleController>(WordleController).toSelf().inSingletonScope();
container.bind<SpellingBeeController>(SpellingBeeController).toSelf().inSingletonScope();
container.bind<SpellingBeeDuelController>(SpellingBeeDuelController).toSelf().inSingletonScope();
container.bind<CrosswordController>(CrosswordController).toSelf().inSingletonScope();
container.bind<CrosswordController_v3>(CrosswordController_v3).toSelf().inSingletonScope();
container.bind<FriendController>(FriendController).toSelf().inSingletonScope();


const iocContainer: IocContainer = {
    get: <T>(key: { prototype: T } | any): T => {
        return container.get<T>(key);
    }
};

export { iocContainer };