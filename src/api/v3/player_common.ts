import WordleDBI from "../../DBI";

const POSSIBLE_BOT_NICKS:string[] = ["Krysia", "Zdzichu", "srebrny_puchacz", "123456", "cybertouch", "shockwave", "rockstar"]

class PlayerNick {
    nick:string = ""
    constructor(public player_id:number, _nick?:string) {
        if (_nick) {
            this.nick = _nick
        }
    }
}

export async function get_nick(player_id:number, dbi:WordleDBI):Promise<PlayerNick> {
    if (player_id === -1) {
        return new PlayerNick(player_id, POSSIBLE_BOT_NICKS[Math.floor(Math.random() * POSSIBLE_BOT_NICKS.length)])
    }
    return dbi.getProfile(player_id).then(profile => new PlayerNick(player_id, profile?.nick));
}