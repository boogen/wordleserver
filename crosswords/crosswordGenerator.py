#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Crossword generator for lines of words.
- Input file: each line is a space-separated list of words (letters only).
- For each line, the script generates one crossword that fits in a grid.
- By default grid is 15x15; change via --width/--height.

Usage:
    python crossword.py input.txt --width 15 --height 15

Notes:
- Words are treated case-insensitively and normalized to uppercase.
- The algorithm uses backtracking with MRV (minimum remaining valid placements),
  connectivity & adjacency constraints, and simple branch-and-bound scoring.
"""

import sys
import argparse
import time
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional

EMPTY = "."

HORIZONTAL = 0
VERTICAL = 1

@dataclass
class Placement:
    word: str
    r: int
    c: int
    dir: int

@dataclass
class Solution:
    placements: List[Placement]
    crossings: int
    filled_cells: int

    @property
    def count(self):
        return len(self.placements)

    def score_tuple(self):
        # Maximize: #words, crossings, filled cells
        return (self.count, self.crossings, self.filled_cells)

class Board:
    def __init__(self, H: int, W: int):
        self.H = H
        self.W = W
        self.grid = [[EMPTY for _ in range(W)] for _ in range(H)]
        self.filled = 0
        self.crossings = 0  # letters placed on an already filled cell (match)
        # track how many words cover each cell for quick crossing count
        self.cover_count = [[0 for _ in range(W)] for _ in range(H)]

    def in_bounds(self, r, c):
        return 0 <= r < self.H and 0 <= c < self.W

    def cell(self, r, c):
        return self.grid[r][c]

    def _neighbors_perp(self, r, c, dir_):
        """Cells perpendicular to dir_ from (r, c)."""
        if dir_ == HORIZONTAL:
            return [(r - 1, c), (r + 1, c)]
        else:
            return [(r, c - 1), (r, c + 1)]

    def _ahead(self, r, c, dir_, step=1):
        return (r, c + step) if dir_ == HORIZONTAL else (r + step, c)

    def can_place(self, word: str, r: int, c: int, dir_: int, require_cross=True) -> bool:
        n = len(word)

        # Bounds
        if dir_ == HORIZONTAL:
            if c < 0 or c + n > self.W or r < 0 or r >= self.H:
                return False
        else:
            if r < 0 or r + n > self.H or c < 0 or c >= self.W:
                return False

        has_cross = False

        # Check boundary cells (before and after the word)
        br, bc = self._ahead(r, c, dir_, -1)
        ar, ac = self._ahead(r, c, dir_, n)
        if self.in_bounds(br, bc) and self.cell(br, bc) != EMPTY:
            return False
        if self.in_bounds(ar, ac) and self.cell(ar, ac) != EMPTY:
            return False

        # Check each letter placement
        rr, cc = r, c
        for i, ch in enumerate(word):
            if not self.in_bounds(rr, cc):
                return False
            cell = self.cell(rr, cc)
            if cell != EMPTY and cell != ch:
                return False
            # adjacency (perpendicular neighbors) must be empty unless this cell will be a crossing
            # If this cell matches an existing letter, it's a crossing and side neighbors can be anything (they might be part of the other word)
            crossing_here = (cell == ch)
            if not crossing_here:
                for nr, nc in self._neighbors_perp(rr, cc, dir_):
                    if self.in_bounds(nr, nc) and self.cell(nr, nc) != EMPTY:
                        # If neighbor is filled and this cell isn't a crossing, illegal side-touch
                        return False
            else:
                has_cross = True
            rr, cc = self._ahead(rr, cc, dir_, 1)

        # Connectivity: after first word placed, require at least one crossing
        if require_cross and self.filled > 0 and not has_cross:
            return False
        return True

    def place(self, word: str, r: int, c: int, dir_: int):
        """
        Place word; returns a delta object for fast undo:
        (list of (r,c,prev_char,prev_cover), crossings_added, filled_added)
        """
        delta = []
        rr, cc = r, c
        crossings_added = 0
        filled_added = 0
        for ch in word:
            prev_char = self.grid[rr][cc]
            prev_cover = self.cover_count[rr][cc]
            if prev_char == EMPTY:
                # fresh fill
                self.grid[rr][cc] = ch
                self.filled += 1
                filled_added += 1
            else:
                # crossing (must match ch)
                crossings_added += 1
            self.cover_count[rr][cc] = prev_cover + 1
            delta.append((rr, cc, prev_char, prev_cover))
            rr, cc = self._ahead(rr, cc, dir_, 1)
        self.crossings += crossings_added
        return delta, crossings_added, filled_added

    def undo(self, delta, crossings_added, filled_added):
        for (r, c, prev_char, prev_cover) in delta:
            self.grid[r][c] = prev_char
            self.cover_count[r][c] = prev_cover
        self.crossings -= crossings_added
        self.filled -= filled_added

    def render(self) -> str:
        lines = []
        for r in range(self.H):
            lines.append("".join(self.grid[r]))
        return "\n".join(lines)

def enumerate_candidates(board: Board, word: str) -> List[Tuple[int, int, int]]:
    cands = []
    if board.filled == 0:
        # Seed placements: try center-ish positions, both orientations
        midr, midc = board.H // 2, board.W // 2
        # Small radius to avoid huge branching
        for dir_ in (HORIZONTAL, VERTICAL):
            L = len(word)
            if dir_ == HORIZONTAL:
                r = midr
                for c in range(max(0, midc - L), min(board.W - L, midc + 1)):
                    if board.can_place(word, r, c, HORIZONTAL, require_cross=False):
                        cands.append((r, c, HORIZONTAL))
            else:
                c = midc
                for r in range(max(0, midr - L), min(board.H - L, midr + 1)):
                    if board.can_place(word, r, c, VERTICAL, require_cross=False):
                        cands.append((r, c, VERTICAL))
        # If none center-ish, fall back to full scan (still without cross requirement)
        if not cands:
            for dir_ in (HORIZONTAL, VERTICAL):
                R = board.H if dir_ == HORIZONTAL else board.H - len(word) + 1
                C = board.W - len(word) + 1 if dir_ == HORIZONTAL else board.W
                for r in range(max(0, R)):
                    for c in range(max(0, C)):
                        if board.can_place(word, r, c, dir_, require_cross=False):
                            cands.append((r, c, dir_))
    else:
        # Normal placements: full scan, crossings required
        for dir_ in (HORIZONTAL, VERTICAL):
            R = board.H if dir_ == HORIZONTAL else board.H - len(word) + 1
            C = board.W - len(word) + 1 if dir_ == HORIZONTAL else board.W
            for r in range(max(0, R)):
                for c in range(max(0, C)):
                    if board.can_place(word, r, c, dir_, require_cross=True):
                        cands.append((r, c, dir_))
    return cands

def choose_word_mrv(unplaced: List[str], candidates: Dict[str, List[Tuple[int,int,int]]]) -> Optional[str]:
    if not unplaced:
        return None
    # Sort by fewest candidates (MRV), tie-break: longer word first, then lexicographic
    return min(
        unplaced,
        key=lambda w: (len(candidates.get(w, [])), -len(w), w)
    )

def optimistic_upper_bound(unplaced: List[str], candidates: Dict[str, List[Tuple[int,int,int]]]) -> int:
    # Cheap bound: how many words have at least 1 candidate
    return sum(1 for w in unplaced if candidates.get(w))

def order_placements(plist: List[Tuple[int,int,int]], board: Board) -> List[Tuple[int,int,int]]:
    # Heuristic: favor placements closer to center, to increase future crossing density
    midr, midc = board.H / 2.0, board.W / 2.0
    def center_dist(p):
        r, c, d = p
        return (r - midr) ** 2 + (c - midc) ** 2
    return sorted(plist, key=center_dist)

def update_best_if_improved(board: Board, placed: List[Placement], best: Solution):
    s = Solution(placements=placed[:], crossings=board.crossings, filled_cells=board.filled)
    if s.score_tuple() > best.score_tuple():
        best.placements = s.placements
        best.crossings = s.crossings
        best.filled_cells = s.filled_cells

def dfs(board: Board,
        placed: List[Placement],
        unplaced: List[str],
        candidates: Dict[str, List[Tuple[int,int,int]]],
        best: Solution,
        deadline: Optional[float]):
    update_best_if_improved(board, placed, best)

    if deadline and time.time() > deadline:
        return

    optimistic = len(placed) + optimistic_upper_bound(unplaced, candidates)
    if optimistic <= best.count:
        return

    target = choose_word_mrv(unplaced, candidates)
    if target is None:
        return

    plist = candidates.get(target, [])
    if not plist:
        # Try skipping this word (since we don't need to use all)
        next_unplaced = [w for w in unplaced if w != target]
        next_candidates = dict(candidates)
        next_candidates.pop(target, None)
        dfs(board, placed, next_unplaced, next_candidates, best, deadline)
        return

    for (r, c, dir_) in order_placements(plist, board):
        delta, c_add, f_add = board.place(target, r, c, dir_)
        p = Placement(word=target, r=r, c=c, dir=dir_)
        next_placed = placed + [p]
        next_unplaced = [w for w in unplaced if w != target]

        # Incrementally update candidates (recompute only for remaining words)
        next_candidates = dict(candidates)
        next_candidates.pop(target, None)
        for w in next_unplaced:
            next_candidates[w] = enumerate_candidates(board, w)

        dfs(board, next_placed, next_unplaced, next_candidates, best, deadline)
        board.undo(delta, c_add, f_add)

def generate_crossword(words: List[str], height: int, width: int, time_limit_s: float = 2.0) -> Solution:
    # Normalize
    vocab = []
    for w in words:
        w = "".join(ch for ch in w.upper() if ch.isalpha())
        if len(w) >= 2:
            vocab.append(w)
    # Deduplicate; longer words first often help initial seeding
    vocab = sorted(set(vocab), key=lambda w: (-len(w), w))
    board = Board(height, width)
    best = Solution(placements=[], crossings=0, filled_cells=0)

    if not vocab:
        return best

    # Initial candidates for all words (seed logic inside enumerate)
    candidates = {w: enumerate_candidates(board, w) for w in vocab}
    deadline = time.time() + time_limit_s if time_limit_s else None
    dfs(board, placed=[], unplaced=vocab, candidates=candidates, best=best, deadline=deadline)
    return best

def apply_solution_to_board(sol: Solution, height: int, width: int) -> Board:
    b = Board(height, width)
    # Place in order
    for p in sol.placements:
        b.place(p.word, p.r, p.c, p.dir)
    return b

def main():
    parser = argparse.ArgumentParser(description="Generate crosswords per line of an input file.")
    parser.add_argument("file", help="Path to input text file; each line is a list of words (space-separated).")
    parser.add_argument("--width", type=int, default=15, help="Grid width (default: 15)")
    parser.add_argument("--height", type=int, default=15, help="Grid height (default: 15)")
    parser.add_argument("--time-per-line", type=float, default=2.0, help="Time limit in seconds per line (default: 2.0)")
    args = parser.parse_args()

    try:
        with open(args.file, "r", encoding="utf-8") as f:
            lines = [ln.strip() for ln in f if ln.strip()]
    except Exception as e:
        print(f"ERROR: failed to read file: {e}", file=sys.stderr)
        sys.exit(1)

    for idx, line in enumerate(lines, 1):
        words = line.split()
        sol = generate_crossword(words, args.height, args.width, time_limit_s=args.time_per_line)
        board = apply_solution_to_board(sol, args.height, args.width)
        print(f"=== Crossword {idx} ===")
        print(board.render())
        print()
        if sol.placements:
            print("Placed words:")
            for p in sol.placements:
                orient = "ACROSS" if p.dir == HORIZONTAL else "DOWN"
                print(f"  - {p.word:>12} @ ({p.r},{p.c}) {orient}")
        else:
            print("No words could be placed within constraints.")
        print(f"Score: words={sol.count}, crossings={sol.crossings}, filled={sol.filled_cells}")
        print()

if __name__ == "__main__":
    main()
