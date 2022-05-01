const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');

const dbi = require('../../DBI.js').createDBI();

router.post('/mock', async (req, res, next) => {
    const crossword = await dbi.getFirstCrossword();
    letterList = new Set(crossword.word_list.join(""))
    console.log(letterList)
    grid = []
    for(var i = 0; i < crossword.letter_grid.length; i++) {
        var result = []
        for (var j = 0; j < crossword.letter_grid[i].length; j++) {
            if (crossword.letter_grid[i][j] != null) {
                result.push("-")
            }
            else {
                result.push(null);
            }
        }
        grid.push(result)
    }
    res.json({
        message:'ok',
        letterList:Array.from(letterList),
        grid: grid
    })
});

module.exports = router;