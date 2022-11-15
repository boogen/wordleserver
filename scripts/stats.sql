CREATE OR REPLACE DATABASE wordle_stats;
use wordle_stats;
CREATE OR REPLACE TABLE registration_event ( authId tinytext,  playerId int,  timestamp timestamp);

CREATE OR REPLACE TABLE login_event ( playerId int,  timestamp timestamp);

CREATE OR REPLACE TABLE nick_set_event ( playerId int,  nick tinytext,  timestamp timestamp);

CREATE OR REPLACE TABLE wordle_init_event ( playerId int,  wordle_id int,  timestamp timestamp);

CREATE OR REPLACE TABLE wordle_guess_event ( playerId int,  tryNo int,  isGuessed boolean,  timestamp timestamp);

CREATE OR REPLACE TABLE crossword_init ( playerId int,  crosswordId int,  timestamp timestamp);

CREATE OR REPLACE TABLE crossword_guess ( playerId int,  noOfGuessedWords int,  noOfGuesses int,  isFinished boolean,  isWord boolean,  timestamp timestamp);

CREATE OR REPLACE TABLE spelling_bee_guess ( playerId int,  pointsForGuess int, word tinytext, isWord boolean, pointsAfterGuess int,  timestamp timestamp);

CREATE OR REPLACE TABLE spelling_bee_duel_prematch ( playerId int,  opponentId int,  timestamp timestamp);

CREATE OR REPLACE TABLE spelling_bee_duel_start_event ( player_id int,  opponent_id int,  bee_id int,  duel_id int,  timestamp timestamp);

CREATE OR REPLACE TABLE spelling_bee_duel_guess_event ( playerId int,  duel_id int,  pointsForGuess int,  pointsAfterGuess int,  timestamp timestamp);

CREATE OR REPLACE TABLE spelling_bee_duel_end_event ( player_id int,  duel_id int,  result tinytext,  previous_elo int,  new_elo int,  timestamp timestamp);
