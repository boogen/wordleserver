/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { Controller, ValidationService, FieldErrors, ValidateError, TsoaRoute, HttpStatusCodeLiteral, TsoaResponse, fetchMiddlewares } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CrosswordController_v3 } from './api/v4/crossword_v3/crossword_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CrosswordController } from './api/v4/crossword/crossword_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { ExplainerController } from './api/v4/explainer/explainer_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { FriendController } from './api/v4/friend/friend_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { PlayerController } from './api/v4/player/player_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { RankingController } from './api/v4/ranking_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SpellingBeeDuelController } from './api/v4/spelling_bee/duel/spelling_bee_duel_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { SpellingBeeController } from './api/v4/spelling_bee/spelling_bee_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WordleChallengeController } from './api/v4/wordle/wordle_challenge/wordle_challenge_controller';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WordleController } from './api/v4/wordle/wordle_controller';
import { iocContainer } from './ioc';
import type { IocContainer, IocContainerFactory } from '@tsoa/runtime';
import type { RequestHandler, Router } from 'express';

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "GridCoordinates": {
        "dataType": "refObject",
        "properties": {
            "column": {"dataType":"double","required":true},
            "row": {"dataType":"double","required":true},
            "direction": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ClueState": {
        "dataType": "refObject",
        "properties": {
            "description": {"dataType":"string","required":true},
            "coordinates": {"ref":"GridCoordinates","required":true},
            "length": {"dataType":"double","required":true},
            "letters": {"dataType":"array","array":{"dataType":"string"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CrosswordState": {
        "dataType": "refObject",
        "properties": {
            "grid": {"dataType":"array","array":{"dataType":"string"},"required":true},
            "clues": {"dataType":"array","array":{"dataType":"refObject","ref":"ClueState"},"required":true},
            "height": {"dataType":"double","required":true},
            "width": {"dataType":"double","required":true},
            "completed": {"dataType":"boolean","required":true},
            "revision": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CrosswordInitReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "state": {"ref":"CrosswordState"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompletionEntry": {
        "dataType": "refObject",
        "properties": {
            "player_id": {"dataType":"double","required":true},
            "nick": {"dataType":"string","required":true},
            "finished_at": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CompletionsReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "completions": {"dataType":"array","array":{"dataType":"refObject","ref":"CompletionEntry"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LeaderboardEntry": {
        "dataType": "refObject",
        "properties": {
            "player_id": {"dataType":"double","required":true},
            "nick": {"dataType":"string","required":true},
            "count": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LeaderboardReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "leaderboard": {"dataType":"array","array":{"dataType":"refObject","ref":"LeaderboardEntry"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CrosswordGuessReply": {
        "dataType": "refObject",
        "properties": {
            "isWord": {"dataType":"boolean","required":true},
            "guessed_word": {"dataType":"boolean","required":true},
            "state": {"ref":"CrosswordState","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ExplainReply": {
        "dataType": "refObject",
        "properties": {
            "explanation": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FriendCodeReply": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"string","required":true},
            "friendCode": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FriendAddReply": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Friend": {
        "dataType": "refObject",
        "properties": {
            "player_id": {"dataType":"double","required":true},
            "nick": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "FriendList": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"string","required":true},
            "friend_list": {"dataType":"array","array":{"dataType":"refObject","ref":"Friend"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RegistrationReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "auth_id": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "Limit": {
        "dataType": "refObject",
        "properties": {
            "name": {"dataType":"string","required":true},
            "limit": {"dataType":"double","required":true},
            "limitless": {"dataType":"boolean","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "ObjectId": {
        "dataType": "refObject",
        "properties": {
            "generationTime": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerLimits": {
        "dataType": "refObject",
        "properties": {
            "player_id": {"dataType":"double","required":true},
            "limits": {"dataType":"array","array":{"dataType":"refObject","ref":"Limit"},"required":true},
            "_id": {"ref":"ObjectId"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LoginReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "player_id": {"dataType":"double","required":true},
            "player_limits": {"ref":"PlayerLimits","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NickReplyProfile": {
        "dataType": "refObject",
        "properties": {
            "nick": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NickSetReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "profile": {"ref":"NickReplyProfile","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "NickGetReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "nick": {"dataType":"string"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SetSocialIdReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "authId": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerProfile": {
        "dataType": "refObject",
        "properties": {
            "nick": {"dataType":"string","required":true},
            "duel_stats": {"dataType":"any","required":true},
            "spelling_bee_stats": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "friend_code": {"dataType":"string","required":true},
            "is_friend": {"dataType":"boolean","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PlayerProfileReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "profile": {"dataType":"union","subSchemas":[{"ref":"PlayerProfile"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyProfile": {
        "dataType": "refObject",
        "properties": {
            "nick": {"dataType":"string","required":true},
            "spelling_bee_stats": {"dataType":"array","array":{"dataType":"double"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "MyProfileReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "profile": {"dataType":"union","subSchemas":[{"ref":"MyProfile"},{"dataType":"enum","enums":[null]}],"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PositionInRank": {
        "dataType": "refObject",
        "properties": {
            "position": {"dataType":"double","required":true},
            "score": {"dataType":"double","required":true},
            "player": {"dataType":"string","required":true},
            "player_id": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "RankingReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","default":"ok"},
            "myInfo": {"dataType":"union","subSchemas":[{"ref":"PositionInRank"},{"dataType":"undefined"}],"required":true},
            "ranking": {"dataType":"array","array":{"dataType":"refObject","ref":"PositionInRank"},"required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelPrematchPlayerInfo": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"double","required":true},
            "player": {"dataType":"string","required":true},
            "elo": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelSeasonInfo": {
        "dataType": "refObject",
        "properties": {
            "season_title": {"dataType":"string","required":true},
            "seconds_to_end": {"dataType":"double","required":true},
            "rules": {"dataType":"string","required":true},
            "point_rules": {"dataType":"string","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelPrematchReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "player": {"ref":"SpellingBeeDuelPrematchPlayerInfo"},
            "opponent": {"ref":"SpellingBeeDuelPrematchPlayerInfo"},
            "season_info": {"ref":"SpellingBeeDuelSeasonInfo"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuellGuessMessage": {
        "dataType": "refObject",
        "properties": {
            "word": {"dataType":"string","required":true},
            "seconds": {"dataType":"double","required":true},
            "points": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LetterState": {
        "dataType": "refObject",
        "properties": {
            "letter": {"dataType":"string","required":true},
            "usageLimit": {"dataType":"double","required":true},
            "pointsForLetter": {"dataType":"double","required":true},
            "required": {"dataType":"boolean","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "LetterToBuy": {
        "dataType": "refObject",
        "properties": {
            "price": {"dataType":"double","required":true},
            "useLimit": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelStateReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "letters": {"dataType":"array","array":{"dataType":"refObject","ref":"LetterState"}},
            "guessed_words": {"dataType":"array","array":{"dataType":"string"}},
            "player_points": {"dataType":"double"},
            "time_left": {"dataType":"double"},
            "round_time": {"dataType":"double"},
            "letters_to_buy": {"dataType":"array","array":{"dataType":"refObject","ref":"LetterToBuy"}},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelStart": {
        "dataType": "refObject",
        "properties": {
            "opponent_nick": {"dataType":"string","required":true},
            "opponent_moves": {"dataType":"array","array":{"dataType":"refObject","ref":"SpellingBeeDuellGuessMessage"},"required":true},
            "state": {"ref":"SpellingBeeDuelStateReply","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeReplyEnum": {
        "dataType": "refEnum",
        "enums": ["ok","already_guessed","wrong_word","no_main_letter","invalid_letter_used","no letters to buy","not_enough_points"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelGuessReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"ref":"SpellingBeeReplyEnum","required":true},
            "state": {"ref":"SpellingBeeDuelStateReply","required":true},
            "points": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "DuelResult": {
        "dataType": "refEnum",
        "enums": ["win","lose","draw","error"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeDuelEnd": {
        "dataType": "refObject",
        "properties": {
            "result": {"ref":"DuelResult","required":true},
            "player_points": {"dataType":"double","required":true},
            "opponent_points": {"dataType":"double","required":true},
            "new_player_elo": {"dataType":"double","required":true},
            "player_elo_diff": {"dataType":"double","required":true},
            "time_left": {"dataType":"double"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SpellingBeeStateReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"ref":"SpellingBeeReplyEnum","required":true},
            "letters": {"dataType":"array","array":{"dataType":"refObject","ref":"LetterState"}},
            "guessed_words": {"dataType":"array","array":{"dataType":"string"}},
            "player_points": {"dataType":"double"},
            "max_points": {"dataType":"double"},
            "points": {"dataType":"double"},
            "letters_to_buy_prices": {"dataType":"array","array":{"dataType":"double"}},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "SeasonInfo": {
        "dataType": "refObject",
        "properties": {
            "season_id": {"dataType":"string","required":true},
            "season_title": {"dataType":"string","required":true},
            "rules": {"dataType":"string","required":true},
            "points_rules": {"dataType":"string","required":true},
            "seconds_to_end": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "GuessValidation": {
        "dataType": "refObject",
        "properties": {
            "isWord": {"dataType":"boolean","required":true},
            "word": {"dataType":"string","required":true},
            "answer": {"dataType":"array","array":{"dataType":"double"},"required":true},
            "isGuessed": {"dataType":"boolean","required":true},
            "correctWord": {"dataType":"string"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WordleChallengeStateReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "guesses": {"dataType":"array","array":{"dataType":"refObject","ref":"GuessValidation"}},
            "finished": {"dataType":"boolean"},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "WordleStateReply": {
        "dataType": "refObject",
        "properties": {
            "message": {"dataType":"string","required":true},
            "guesses": {"dataType":"array","array":{"dataType":"refObject","ref":"GuessValidation"}},
            "finished": {"dataType":"boolean"},
            "timeToNext": {"dataType":"double","required":true},
        },
        "additionalProperties": true,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const validationService = new ValidationService(models);

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function RegisterRoutes(app: Router) {
    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################
        app.post('/api/v4/crossword_v3/init',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.init)),

            async function CrosswordController_v3_init(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    mode: {"default":"adult","in":"body-prop","name":"mode","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.init.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/save',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.save)),

            async function CrosswordController_v3_save(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    mode: {"default":"adult","in":"body-prop","name":"mode","dataType":"string"},
                    row: {"in":"body-prop","name":"row","required":true,"dataType":"double"},
                    column: {"in":"body-prop","name":"column","required":true,"dataType":"double"},
                    letter: {"in":"body-prop","name":"letter","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.save.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/save_state',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.saveState)),

            async function CrosswordController_v3_saveState(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    grid: {"in":"body-prop","name":"grid","required":true,"dataType":"string"},
                    revision: {"in":"body-prop","name":"revision","required":true,"dataType":"double"},
                    mode: {"default":"adult","in":"body-prop","name":"mode","dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.saveState.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/completions',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.completions)),

            async function CrosswordController_v3_completions(request: any, response: any, next: any) {
            const args = {
                    crossword_id: {"in":"body-prop","name":"crossword_id","required":true,"dataType":"double"},
                    crossword_serial: {"in":"body-prop","name":"crossword_serial","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.completions.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/completions/friends',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.completionsFriends)),

            async function CrosswordController_v3_completionsFriends(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    crossword_id: {"in":"body-prop","name":"crossword_id","required":true,"dataType":"double"},
                    crossword_serial: {"in":"body-prop","name":"crossword_serial","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.completionsFriends.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/global_leaderboard',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.globalLeaderboard)),

            async function CrosswordController_v3_globalLeaderboard(request: any, response: any, next: any) {
            const args = {
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.globalLeaderboard.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword_v3/global_leaderboard/friends',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController_v3.prototype.globalLeaderboardFriends)),

            async function CrosswordController_v3_globalLeaderboardFriends(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController_v3>(CrosswordController_v3);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.globalLeaderboardFriends.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword/init',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController.prototype.init)),

            async function CrosswordController_init(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController>(CrosswordController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.init.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword/mock',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController.prototype.mock)),

            async function CrosswordController_mock(request: any, response: any, next: any) {
            const args = {
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController>(CrosswordController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.mock.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/crossword/guess',
            ...(fetchMiddlewares<RequestHandler>(CrosswordController)),
            ...(fetchMiddlewares<RequestHandler>(CrosswordController.prototype.guess)),

            async function CrosswordController_guess(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<CrosswordController>(CrosswordController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.guess.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/explainer/explain',
            ...(fetchMiddlewares<RequestHandler>(ExplainerController)),
            ...(fetchMiddlewares<RequestHandler>(ExplainerController.prototype.explain)),

            async function ExplainerController_explain(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ExplainerController>(ExplainerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.explain.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/explainer/debug_explain',
            ...(fetchMiddlewares<RequestHandler>(ExplainerController)),
            ...(fetchMiddlewares<RequestHandler>(ExplainerController.prototype.debugExplain)),

            async function ExplainerController_debugExplain(request: any, response: any, next: any) {
            const args = {
                    password: {"in":"body-prop","name":"password","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<ExplainerController>(ExplainerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.debugExplain.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/friend/code',
            ...(fetchMiddlewares<RequestHandler>(FriendController)),
            ...(fetchMiddlewares<RequestHandler>(FriendController.prototype.getCode)),

            async function FriendController_getCode(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FriendController>(FriendController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getCode.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/friend/add',
            ...(fetchMiddlewares<RequestHandler>(FriendController)),
            ...(fetchMiddlewares<RequestHandler>(FriendController.prototype.addFriend)),

            async function FriendController_addFriend(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    friend_code: {"in":"body-prop","name":"friend_code","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FriendController>(FriendController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.addFriend.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/friend/list',
            ...(fetchMiddlewares<RequestHandler>(FriendController)),
            ...(fetchMiddlewares<RequestHandler>(FriendController.prototype.friendList)),

            async function FriendController_friendList(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<FriendController>(FriendController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.friendList.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/register',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.register)),

            async function PlayerController_register(request: any, response: any, next: any) {
            const args = {
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.register.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/login',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.login)),

            async function PlayerController_login(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.login.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/setNick',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.setNick)),

            async function PlayerController_setNick(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    nick: {"in":"body-prop","name":"nick","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.setNick.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/getNick',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.getNick)),

            async function PlayerController_getNick(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getNick.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/setSocialId',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.setSocialId)),

            async function PlayerController_setSocialId(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    socialId: {"in":"body-prop","name":"socialId","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.setSocialId.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/getProfile',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.getProfile)),

            async function PlayerController_getProfile(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    player_id: {"in":"body-prop","name":"player_id","required":true,"dataType":"double"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getProfile.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/player/getMyProfile',
            ...(fetchMiddlewares<RequestHandler>(PlayerController)),
            ...(fetchMiddlewares<RequestHandler>(PlayerController.prototype.getMyProfile)),

            async function PlayerController_getMyProfile(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<PlayerController>(PlayerController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getMyProfile.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/spelling_bee_duel/global',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.spellingBeeDuelGlobal)),

            async function RankingController_spellingBeeDuelGlobal(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.spellingBeeDuelGlobal.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/spelling_bee_duel/friends',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.spellingBeeDuelFriends)),

            async function RankingController_spellingBeeDuelFriends(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.spellingBeeDuelFriends.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/spelling_bee/global',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.spellingBeeGlobal)),

            async function RankingController_spellingBeeGlobal(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.spellingBeeGlobal.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/spelling_bee/friends',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.spellingBeeFriends)),

            async function RankingController_spellingBeeFriends(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.spellingBeeFriends.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/wordle_daily_challenge/global',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.wordleDailyChallengeGlobal)),

            async function RankingController_wordleDailyChallengeGlobal(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.wordleDailyChallengeGlobal.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/ranking/wordle_daily_challenge/friends',
            ...(fetchMiddlewares<RequestHandler>(RankingController)),
            ...(fetchMiddlewares<RequestHandler>(RankingController.prototype.wordleDailyChallengeFriends)),

            async function RankingController_wordleDailyChallengeFriends(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<RankingController>(RankingController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.wordleDailyChallengeFriends.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee_duel/prematch',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController.prototype.prematch)),

            async function SpellingBeeDuelController_prematch(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeDuelController>(SpellingBeeDuelController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.prematch.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee_duel/start',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController.prototype.start)),

            async function SpellingBeeDuelController_start(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeDuelController>(SpellingBeeDuelController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.start.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee_duel/guess',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController.prototype.guess)),

            async function SpellingBeeDuelController_guess(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeDuelController>(SpellingBeeDuelController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.guess.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee_duel/end',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController.prototype.end)),

            async function SpellingBeeDuelController_end(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeDuelController>(SpellingBeeDuelController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.end.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee_duel/buy_letter',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeDuelController.prototype.buy_letter)),

            async function SpellingBeeDuelController_buy_letter(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeDuelController>(SpellingBeeDuelController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.buy_letter.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee/getState',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController.prototype.getState)),

            async function SpellingBeeController_getState(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeController>(SpellingBeeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getState.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee/guess',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController.prototype.guess)),

            async function SpellingBeeController_guess(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    guess: {"in":"body-prop","name":"guess","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeController>(SpellingBeeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.guess.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee/buy_letter',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController.prototype.buy_letter)),

            async function SpellingBeeController_buy_letter(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeController>(SpellingBeeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.buy_letter.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/spelling_bee/season_info',
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController)),
            ...(fetchMiddlewares<RequestHandler>(SpellingBeeController.prototype.getSeasonRules)),

            async function SpellingBeeController_getSeasonRules(request: any, response: any, next: any) {
            const args = {
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<SpellingBeeController>(SpellingBeeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getSeasonRules.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/classic/getState',
            ...(fetchMiddlewares<RequestHandler>(WordleChallengeController)),
            ...(fetchMiddlewares<RequestHandler>(WordleChallengeController.prototype.getState)),

            async function WordleChallengeController_getState(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<WordleChallengeController>(WordleChallengeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getState.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/classic/validate',
            ...(fetchMiddlewares<RequestHandler>(WordleChallengeController)),
            ...(fetchMiddlewares<RequestHandler>(WordleChallengeController.prototype.validate)),

            async function WordleChallengeController_validate(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<WordleChallengeController>(WordleChallengeController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.validate.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/wordle/getState',
            ...(fetchMiddlewares<RequestHandler>(WordleController)),
            ...(fetchMiddlewares<RequestHandler>(WordleController.prototype.getState)),

            async function WordleController_getState(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<WordleController>(WordleController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.getState.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        app.post('/api/v4/wordle/validate',
            ...(fetchMiddlewares<RequestHandler>(WordleController)),
            ...(fetchMiddlewares<RequestHandler>(WordleController.prototype.validateGuess)),

            async function WordleController_validateGuess(request: any, response: any, next: any) {
            const args = {
                    auth_id: {"in":"body-prop","name":"auth_id","required":true,"dataType":"string"},
                    word: {"in":"body-prop","name":"word","required":true,"dataType":"string"},
            };

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = getValidatedArgs(args, request, response);

                const container: IocContainer = typeof iocContainer === 'function' ? (iocContainer as IocContainerFactory)(request) : iocContainer;

                const controller: any = await container.get<WordleController>(WordleController);
                if (typeof controller['setStatus'] === 'function') {
                controller.setStatus(undefined);
                }


              const promise = controller.validateGuess.apply(controller, validatedArgs as any);
              promiseHandler(controller, promise, response, undefined, next);
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function isController(object: any): object is Controller {
        return 'getHeaders' in object && 'getStatus' in object && 'setStatus' in object;
    }

    function promiseHandler(controllerObj: any, promise: any, response: any, successStatus: any, next: any) {
        return Promise.resolve(promise)
            .then((data: any) => {
                let statusCode = successStatus;
                let headers;
                if (isController(controllerObj)) {
                    headers = controllerObj.getHeaders();
                    statusCode = controllerObj.getStatus() || statusCode;
                }

                // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

                returnHandler(response, statusCode, data, headers)
            })
            .catch((error: any) => next(error));
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function returnHandler(response: any, statusCode?: number, data?: any, headers: any = {}) {
        if (response.headersSent) {
            return;
        }
        Object.keys(headers).forEach((name: string) => {
            response.set(name, headers[name]);
        });
        if (data && typeof data.pipe === 'function' && data.readable && typeof data._read === 'function') {
            response.status(statusCode || 200)
            data.pipe(response);
        } else if (data !== null && data !== undefined) {
            response.status(statusCode || 200).json(data);
        } else {
            response.status(statusCode || 204).end();
        }
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function responder(response: any): TsoaResponse<HttpStatusCodeLiteral, unknown>  {
        return function(status, data, headers) {
            returnHandler(response, status, data, headers);
        };
    };

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    function getValidatedArgs(args: any, request: any, response: any): any[] {
        const fieldErrors: FieldErrors  = {};
        const values = Object.keys(args).map((key) => {
            const name = args[key].name;
            switch (args[key].in) {
                case 'request':
                    return request;
                case 'query':
                    return validationService.ValidateParam(args[key], request.query[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                case 'queries':
                    return validationService.ValidateParam(args[key], request.query, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                case 'path':
                    return validationService.ValidateParam(args[key], request.params[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                case 'header':
                    return validationService.ValidateParam(args[key], request.header(name), name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                case 'body':
                    return validationService.ValidateParam(args[key], request.body, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                case 'body-prop':
                    return validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, 'body.', {"noImplicitAdditionalProperties":"ignore"});
                case 'formData':
                    if (args[key].dataType === 'file') {
                        return validationService.ValidateParam(args[key], request.file, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                    } else if (args[key].dataType === 'array' && args[key].array.dataType === 'file') {
                        return validationService.ValidateParam(args[key], request.files, name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                    } else {
                        return validationService.ValidateParam(args[key], request.body[name], name, fieldErrors, undefined, {"noImplicitAdditionalProperties":"ignore"});
                    }
                case 'res':
                    return responder(response);
            }
        });

        if (Object.keys(fieldErrors).length > 0) {
            throw new ValidateError(fieldErrors, '');
        }
        return values;
    }

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
