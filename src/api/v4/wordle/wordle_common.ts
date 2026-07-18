export interface GuessValidation {
    isWord:boolean;
    word:string;
    answer:number[];
    isGuessed:boolean;
    correctWord?:string;
}
