export interface GuessValidation {
    isWord:boolean;
    guess:string;
    answer:number[];
    isGuessed:boolean;
    correctWord?:string;
}
