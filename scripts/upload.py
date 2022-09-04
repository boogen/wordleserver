from crosswordsGenerator import generate_crosswords, placeWord
from pymongo import MongoClient
from argparse import ArgumentParser
import pymongo

def get_database(db):

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = "localhost"

    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    from pymongo import MongoClient
    client = MongoClient(CONNECTION_STRING)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client[db]

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
    bees_db = dbname["bees"]
    bees_db.drop()
    bees_db.create_index('id', unique = True)

    f = open(bees_file, "r")
    lines = f.readlines()

    id = 1
    for line in lines:
        print("Uploading bees: " + str(id) + "/" + str(len(lines)), end="\r")
        line = line.strip()
        words = line.split(" ")
        unique_letters = list(set(''.join(words)))
        main_letter = None
        for letter in unique_letters:
            if all(map(lambda w: letter in w, words)):
                main_letter = letter
                unique_letters.remove(main_letter)
                continue
        if main_letter is None:
            raise "Couldn't find main letter"
        bees_db.insert_one({'id': id, 'words':words, 'main_letter': main_letter, 'other_letters': unique_letters})
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

    args = argParser.parse_args()

    db = get_database(args.db_name)
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
        generate_crosswords(args.crosswords_file, db)
    if args.wordle_possible_words_file is not None:
        upload_possible_words(args.wordle_possible_words_file, db)
    if args.wordle_words_file is not None:
        upload_words(args.wordle_words_file, db)
    if args.bees_file is not None:
        upload_bees(args.bees_file, db)
    if args.fallback_bees_file is not None:
        upload_fallback_bees(args.fallback_bees_file, db)
