import { any, string } from "@hapi/joi";

export default class Utils {
    static randomString(length:number):string {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
        for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    
        return text;
    }
}

export class MinMax {
    constructor(public min:number, public max:number){}

    get_random():number {
        return Math.random() * (this.max - this.min) + this.max
    }
}
