import itertools

f = open('slownik', 'r')
lines = f.readlines()

dictionary = {}

for line in lines:
    line = line.strip()
    word, score = line.split('=')
    if int(score) < 50:
        continue
    sorted_letters = sorted(word)
    unique_letters = set(sorted_letters)
    if len(unique_letters) != len(sorted_letters):
        continue
    sorted_word = ''.join(sorted_letters)
    if sorted_word not in dictionary:
        dictionary[sorted_word] = []
    dictionary[sorted_word].append(word)
    

letters = ['a','ą','b','c','ć','d','e','ę','f','g','h','i','j','k','l','ł','m','n','ń','o','ó','p','r','s','ś','t','u','w','y','z','ż','ź']


combinations = list(itertools.combinations((letters), 6))
crosswords = []

avg = 0

for c in combinations:
    result = []
    four_letters = list(itertools.combinations(c, 4))
    five_letters = list(itertools.combinations(c, 5))

    all_combinations = four_letters + five_letters + [c]

    for combination in all_combinations:
        joined = ''.join(combination)
        if joined in dictionary:
            for word in dictionary[joined]:
                result.append(word)

    if len(result) >= 8:
        avg += len(result)
        crosswords.append(result)


sorted_crosswords = sorted(crosswords, key=len, reverse=True)
        
result_file = open('result.txt', 'w')

avg = avg / len(crosswords)
print("average crossword length: " + str(avg))

for crossword in sorted_crosswords:
    result_file.write(' '.join(crossword))
    result_file.write('\n');
    
    
         

