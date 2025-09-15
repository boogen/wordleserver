# find all sets of 7 letters and generate all possible words from them
import itertools
from collections import defaultdict

ALPHABET = ['a','ą','b','c','ć','d','e','ę','f','g','h','i','j','k','l','ł','m','n','ń','o','ó','p','r','s','ś','t','u','w','y','z','ż','ź']
INDEX = {letter: i for i, letter in enumerate(ALPHABET)}

def word_mask(word: str) -> int:
    """Generate a bitmask for the given word."""
    mask = 0
    for letter in word:
        if letter in INDEX:  # Ensure the letter is in the defined alphabet
            mask |= (1 << INDEX[letter])
    return mask

def read_dictionary(path='slownik', min_len=4, max_letters=7):
    words = []
    with open(path, 'r', encoding='utf-8') as f:
        for raw in f:
            raw = raw.strip()
            if not raw or '=' not in raw:
                continue
            word, score = raw.split('=')
            word = word.strip()
            try:
                score = int(score.strip())
            except ValueError:
                continue
            if len(word) < min_len or len(set(word)) > max_letters:
                continue
            words.append(word)
    return words

def mask_from_tuple(tup):
    m = 0
    for ch in tup:
        m |= (1 << INDEX[ch])
    return m

def iter_submasks(mask: int):
    s = mask
    while s:
        yield s
        s = (s - 1) & mask

def generate_combinations():
    all_word_masks = list(by_mask.keys())
    results = []

    for i, rack in enumerate(itertools.combinations(ALPHABET, 7), 1):
        if i % 1000 == 0:
            print(f"Processed {i:,} racks", end='\r')
        rmask = mask_from_tuple(rack)
        found = []

        # visit ONLY submasks of rmask (<= 127 of them)
        for s in iter_submasks(rmask):
            lst = by_mask.get(s)
            if lst:
                found.extend(lst)

        if not found:
            continue

        deduped = sorted(set(found), key=lambda x: (-len(x), x ))
        results.append((rack, deduped))

    results.sort(key=lambda x: len(x[1]), reverse=True)
    return results

words = read_dictionary()
by_mask = defaultdict(list)

for w in words:
    m = word_mask(w)
    if m == 0:
        continue
    by_mask[m].append(w)

combinations = generate_combinations()
with open('combinations.txt', 'w', encoding='utf-8') as result_file:
    for rack, words in combinations:
        if len(words) >= 8:
            result_file.write(' '.join(words) + '\n')