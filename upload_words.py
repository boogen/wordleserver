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
    words_db = dbname["words"]
    words_db.drop()
    words_db.create_index('word', unique = True)

    f = open("words.txt", "r")
    lines = f.readlines()

    for line in lines:
        word = line.strip()
        words_db.insert_one({'word': word})
        
