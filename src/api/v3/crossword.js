const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');

const dbi = require('../../DBI.js').createDBI();

router.post('/mock', async (req, res, next) => {
    const crossword = await dbi.getFirstCrossword();
    letterList = new Set(crossword.word_list.join(""))
    console.log(crossword.letter_grid)
    grid = []
    for(var i = 0; i < crossword.letter_grid.length; i++) {
        var result = []
        for (var j = 0; j < crossword.letter_grid[i].length; j++) {
            if (crossword.letter_grid[i][j] != null) {
                result.push("-")
            }
            else {
                result.push(" ");
            }
        }
        grid.push(result)
    }
    res.json({
        message:'ok',
        letters:Array.from(letterList),
        grid: [].concat.apply([], grid),
        height: grid.length,
        width: grid[0].length

    })
});

module.exports = router;