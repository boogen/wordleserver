def get_database():
    from pymongo import MongoClient
    import pymongo

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = "localhost"

    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    from pymongo import MongoClient
    client = MongoClient(CONNECTION_STRING)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client['wordle_dev']

# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":

    # Get the database
    dbname = get_database()

    # Create a new collection
    bees_db = dbname["bees"]
    bees_db.drop()
    bees_db.create_index('id', unique = True)

    f = open("spelling_bee", "r")
    lines = f.readlines()

    id = 1
    for line in lines:
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
