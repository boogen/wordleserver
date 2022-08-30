import WordleDBI from "../../DBI";

class PlayerNick {
    nick:string = ""
    constructor(public player_id:number, _nick?:string) {
        if (_nick) {
            this.nick = _nick
        }
    }
}

export async function get_nick(player_id:number, dbi:WordleDBI):Promise<PlayerNick> {
    return dbi.getProfile(player_id).then(profile => new PlayerNick(player_id, profile?.nick));
}