def get_database():
    from pymongo import MongoClient
    import pymongo

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = "localhost"

    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    from pymongo import MongoClient
    client = MongoClient(CONNECTION_STRING)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client['wordle']
    
# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":    
    
    # Get the database
    dbname = get_database()

    # Create a new collection
    possible_words_db = dbname["possible_words"]
    possible_words_db.drop()
    possible_words_db.create_index('word', unique = True)

    f = open("possible_words.txt", "r")
    lines = f.readlines()

    for line in lines:
        word = line.strip()
        possible_words_db.insert_one({'word': word})
        
