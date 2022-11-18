export class CrosswordWord {
    constructor(public word: string, public coordinates: GridCoordinates) { }
}

export class GridCoordinates {
    constructor(public column: number, public row: number) { }
}