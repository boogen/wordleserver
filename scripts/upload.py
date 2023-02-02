from crosswordsGenerator import generate_crosswords, placeWord
from pymongo import MongoClient
from argparse import ArgumentParser
import pymongo

def get_database(db, host):
    from pymongo import MongoClient
    client = MongoClient(host)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client[db]

def upload_model(db):
    player_limits = db["player_limits_models"]
    player_limits.drop()
    player_limits.insert_one ({'player_category':'free', 'limits':[{'name':'wordle_challenge_limit', 'limit':-1, 'limitless':True}, {'name':'crosswords_limit', 'limit':-1}, {'name':'spelling_bee_duel_limit', 'limit':-1}]})

def upload_possible_words(words_file, dbname):
    possible_words_db = dbname["possible_words"]
    possible_words_db.drop()
    possible_words_db.create_index('word', unique = True)

    f = open(words_file, "r")
    lines = f.readlines()

    counting_index = 1
    for line in lines:
        print("Uploading possible words: " + str(counting_index) + "/" + str(len(lines)), end="\r")
        counting_index += 1
        word = line.strip()
        possible_words_db.insert_one({'word': word})
    print()


def upload_bees(bees_file, dbname):
    single_bees_db = dbname["bees_v2_1"]
    single_bees_db.drop()
    single_bees_db.create_index('id', unique = True)

    double_bees_db = dbname["bees_v2_2"]
    double_bees_db.drop()
    double_bees_db.create_index('id', unique = True)

    f = open(bees_file, "r")
    lines = f.readlines()

    id = 1
    for line in lines:
        print("Uploading bees: " + str(id) + "/" + str(len(lines)), end="\r")
        line = line.strip()
        parts = line.split(",")
        required_letters = list(parts[0])
        insert = {'id':id, 'max_points':int(parts[2]), 'required_letters':required_letters, 'other_letters':list(parts[1])}
        if len(required_letters) == 2:
            double_bees_db.insert_one(insert)
        else:
            single_bees_db.insert_one(insert)
        id += 1
    print()

def upload_words(words_file, dbname):
    words_db = dbname["words"]
    words_db.drop()
    words_db.create_index('word', unique = True)

    f = open(words_file, "r")
    lines = f.readlines()

    counting_index = 1
    for line in lines:
        print("Uploading wordle words: " + str(counting_index) + "/" + str(len(lines)), end="\r")
        counting_index += 1
        word = line.strip()
        words_db.insert_one({'word': word})
    print()

def upload_fallback_bees(fallback_bee_file, dbname):
    f = open(fallback_bee_file, "r")
    fallback_db = dbname["bees_fallback"]
    fallback_db.drop()
    counting_index = 1
    lines = f.readlines()
    for line in lines:
        print("Uploading fallback bees: " + str(counting_index) + "/" + str(len(lines)), end="\r")
        counting_index += 1
        line = line.strip()
        fallback_db.insert_one({'word': line})
    print()


# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":
    argParser = ArgumentParser(prog="Slowka model uploader")
    argParser.add_argument("-d", "--db-name", required=True)
    argParser.add_argument("-c", "--crosswords-file")
    argParser.add_argument("-p", "--wordle-possible-words-file")
    argParser.add_argument("-w", "--wordle-words-file")
    argParser.add_argument("-b", "--bees-file")
    argParser.add_argument("-f", "--fallback-bees-file")
    argParser.add_argument("-s", "--skip-confirmation", action='store_true')
    argParser.add_argument("-m", "--upload-model", action='store_true')
    argParser.add_argument("-dh", "--database-host", default="localhost")

    args = argParser.parse_args()

    db = get_database(args.db_name, args.database_host)
    if not args.skip_confirmation:
        print("Uploading to db: " + args.db_name + ". Is it correct?")
        answer = None
        if answer not in ["Y", "N"]:
            answer = input("[Y]es or [N]o")
            if answer != "Y":
                answer = "N"
        if answer == "N":
            print("No confirmation, aborting...")
            exit(-1)

    if args.crosswords_file is not None:
        print("Preparing crosswords")
        generate_crosswords(args.crosswords_file, db)
    if args.wordle_possible_words_file is not None:
        print("Preparing possible words")
        upload_possible_words(args.wordle_possible_words_file, db)
    if args.wordle_words_file is not None:
        print("Preparing wordle words")
        upload_words(args.wordle_words_file, db)
    if args.bees_file is not None:
        print("Preparing bees")
        upload_bees(args.bees_file, db)
    if args.upload_model:
        print("Uploading model")
        upload_model(db)
    if args.fallback_bees_file is not None:
        print("Preparing fallback bees")
        upload_fallback_bees(args.fallback_bees_file, db)
