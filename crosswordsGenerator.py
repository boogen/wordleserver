#!/usr/bin/python3

import sys

grid = []
processedWords = dict()
directions = dict()

def get_database():
    from pymongo import MongoClient
    import pymongo

    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = "localhost"

    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    from pymongo import MongoClient
    client = MongoClient(CONNECTION_STRING)

    # Create the database for our example (we will use the same database throughout the tutorial
    return client[sys.argv[2]]

def placeWord(word, coords, direction):
    try:
        (x, y) = coords
        dx = dy = 0
        correct = False
        if direction == 1:
            dy = 1
            dx = 0
        else:
            dx = 1
            dy = 0
        if grid[x-dx][y-dy] is not None:
            return False
        if grid[x + len(word) * dx][y + len(word) * dy] is not None:
            return False
        for letter in word:
            if grid[x][y] is None:
                if direction == 1:
                    if grid[x - 1][y] is not None or grid[x+1][y] is not None:
                        return False
                else:
                    if grid[x][y - 1] is not None or grid[x][y + 1] is not None:
                        return False
                correct = True
            else:
                if grid[x][y] != letter:
                    return False
            x += dx
            y += dy
        if not correct:
            return False
        (x, y) = coords
        for letter in word:
            grid[x][y] = letter
            x += dx
            y += dy
        directions[word] = direction
        processedWords[word] = coords
        return True
    except IndexError:
        return False


file1 = open(sys.argv[1], 'r')
lines = file1.readlines()
dbname = get_database()
possible_crosswords_db = dbname["possible_crosswords"]
possible_crosswords_db.drop()
for line in lines:
    grid = []
    processedWords = dict()
    directions = dict()
    wordList = line.rstrip("\n").split(" ")
    wordList.sort(reverse=True, key=len)

    for i in range(0, 100):
        grid.append([])
        for j in range(0, 100):
            grid[i].append(None)

    placeWord(wordList[0], (47, 47), 0)

    for word in wordList[1:]:
        placed = False
        for letter in word:
            for (word2, c) in processedWords.items():
                (x, y) = c
                if letter not in word2:
                    continue
                direction = directions[word2]
                if direction == 1:
                    dy = 1
                    dx = 0
                else:
                    dx = 1
                    dy = 0
                letterIndex = word2.index(letter)
                cross = (x + letterIndex * dx, y + letterIndex * dy)
                letterIndex2 = word.index(letter)
                newDirection = (direction + 1) % 2
                if newDirection == 1:
                    dy = -1
                    dx = 0
                else:
                    dy = 0
                    dx = -1
                newCoords = (cross[0] + letterIndex2 * dx, cross[1] + letterIndex2 * dy)
                if placeWord(word, newCoords, (direction + 1) % 2):
                    placed = True
                    break
            if placed:
                break
        if placed:
            continue
    minMeaningful = 0
    for i in range(0, len(grid)):
        if any(grid[i]):
            minMeaningful = i
            break
    grid = grid[minMeaningful:]


    maxMeaningful = len(grid)
    for i in range(len(grid) -1, -1, -1):
        if any(grid[i]):
            maxMeaningful = i + 1
            break
    grid = grid[:maxMeaningful]


    minMeaningful = 1000;
    for i in range(0, len(grid)):
        minMeaningful = min(next(index for index in range(0, len(grid[i])) if grid[i][index] is not None), minMeaningful)
    for i in range(0, len(grid)):
        grid[i] = grid[i][minMeaningful:]

    maxMeaningful = 0;
    for i in range(0, len(grid)):
        maxMeaningful = max(next(index for index in range(len(grid[i]) - 1, -1, -1) if grid[i][index] is not None), maxMeaningful)
    for i in range(0, len(grid)):
        grid[i] = grid[i][:maxMeaningful + 1]

    valid = False
    if len(grid) < 11:
        valid = len(grid[0]) < 15
    if len(grid) < 15:
        valid = len(grid[0]) < 11

    if len(processedWords) > 4 and valid:
        # for i in range(0, len(grid)):
        #     lineString = ""
        #     shouldPrint = False
        #     for j in range(0, len(grid[i])):

        #         if grid[i][j] is None:
        #             lineString += " "
        #         else:
        #             shouldPrint = True
        #             lineString += grid[i][j]
        #     if shouldPrint:
        #         print(lineString)
        possible_crosswords_db.insert_one({'word_list': list(processedWords.keys()), 'letter_grid': grid})
