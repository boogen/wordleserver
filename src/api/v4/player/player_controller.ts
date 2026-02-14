import { Post, BodyProp, Route } from "tsoa";
import Utils from "../../../utils";
import { Stats } from "../../../WordleStatsDBI";
import WordleDBI from "../DBI/DBI";
import { addFriendCode, friendList, getFriendCode } from "../DBI/friends/friends";
import { addPlayerToAuthMap, checkSocialId, getLastLoginTimestamp, getPlayerLimits, getProfile, isAuthIdUsed, resetPlayerLimits, resolvePlayerId, setNick, updateLastLoginTimestamp } from "../DBI/player/player";
import { PlayerLimits } from "../DBI/player/PlayerLimits";
import { getSpellingBeeDuelStats } from "../DBI/spelling_bee/duel/spelling_bee_duel";
import { getSpellingBeeStats } from "../DBI/spelling_bee/spelling_bee";
import { generateFriendCode } from "../friend/friend_controller";
import { inject, injectable } from "inversify";
import { Logger } from "../../../logger";

interface RegistrationReply {
    message:string;
    auth_id:string;
}

interface PlayerProfile {
    nick:string;
    duel_stats:any;
    spelling_bee_stats:number[];
    friend_code:string;
    is_friend:boolean;
}

interface LoginReply {
    message:string;
    player_id:number;
    player_limits:PlayerLimits
}

interface NickReplyProfile {
    nick:string;
}

interface NickSetReply {
    message:string;
    profile:NickReplyProfile;
}

interface NickGetReply {
    message:string;
    nick?:string;
}

interface SetSocialIdReply {
    message:string;
    authId:string;
}

interface PlayerProfileReply {
    message:string;
    profile:PlayerProfile|null;
}


interface MyProfile {
    nick:string;
    spelling_bee_stats:number[];
}

interface MyProfileReply {
    message:string;
    profile:MyProfile|null;
}

function makeid():string {
    return Utils.randomString(36);
}

export async function getPlayerProfile(akserId:number, playerId:number, dbi:WordleDBI):Promise<PlayerProfile|null> {
    const profile = await getProfile(playerId, dbi);
    const duel_stats = await getSpellingBeeDuelStats(akserId, playerId, dbi)
    const spelling_bee_stats = await getSpellingBeeStats(playerId, dbi)
    if (profile === null) {
        return null;
    }
    var friendCode = await getFriendCode(playerId, dbi);
    while (!friendCode) {
        var generated_friend_code = generateFriendCode(7);
        friendCode = await addFriendCode(playerId, generated_friend_code, dbi);
    }
    var isFriend = (await friendList(akserId, dbi)).includes(playerId)
    return {nick: profile.nick, duel_stats:Object.fromEntries(duel_stats.entries()), spelling_bee_stats:spelling_bee_stats, friend_code: friendCode.friend_code, is_friend:isFriend};
}

@injectable()
@Route("api/v4/player")
export class PlayerController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Stats) private stats: Stats,
        @inject(Logger) private logger: Logger
    ) {
        logger.setContext("PlayerController");
    }
    @Post("register")
    public async register():Promise<RegistrationReply> {
        var authId = makeid();
        while (await isAuthIdUsed(authId, this.dbi)) {
            authId = makeid();
        }
        const playerId = await this.dbi.getNextSequenceValue("player_id");
        await addPlayerToAuthMap(authId, playerId, this.dbi);
        await this.stats.addRegistrationEvent(authId, playerId);
        return {message:'ok', auth_id: authId}
    }

    @Post("login")
    public async login(@BodyProp() auth_id:string):Promise<LoginReply> {
        this.logger.info("Logging in auth_id: %s", auth_id)
        const player_id:number = (await resolvePlayerId(auth_id, this.dbi));
        var last_login_timestamp = (await getLastLoginTimestamp(player_id, this.dbi));
        var last_midnight = new Date();
        last_midnight.setHours(0,0,0,0);
        var player_limits:PlayerLimits|null = null;
        if (last_login_timestamp === null || last_login_timestamp.timestamp < (last_midnight.getTime()/1000)) {
            player_limits = await resetPlayerLimits(player_id, this.dbi)
        }
        else {
            player_limits = await getPlayerLimits(player_id, this.dbi)
        }
        const timestamp = Date.now() / 1000;
        const now = new Date()    
        await updateLastLoginTimestamp(timestamp, player_id, this.dbi);
        await this.stats.addLoginEvent(player_id);
        return {'message':'ok', 'player_id':player_id, player_limits:player_limits!}
    }

    @Post("setNick")
    public async setNick(@BodyProp() auth_id:string, @BodyProp() nick:string):Promise<NickSetReply> {
        this.logger.info("Setting nick for auth_id: %s to %s", auth_id, nick)
        const player_id:number = (await resolvePlayerId(auth_id, this.dbi));
        await setNick(player_id, nick, this.dbi);
        await this.stats.addSetNickEvent(player_id, nick);
        return {message:'ok', profile: {nick: nick}}
    }

    @Post("getNick")
    public async getNick(@BodyProp() auth_id:string):Promise<NickGetReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const profile = await getProfile(player_id, this.dbi)
        return {message:"ok", nick:profile?.nick}
    }

    @Post("setSocialId")
    public async setSocialId(@BodyProp() auth_id:string, @BodyProp() socialId:string):Promise<SetSocialIdReply> {
        const social_to_auth = await checkSocialId(auth_id, socialId, this.dbi);
        this.logger.info("Social to auth: %s", JSON.stringify(social_to_auth));
        return {message:'ok', authId:social_to_auth!.authId}
    }

    @Post("getProfile")
    public async getProfile(@BodyProp() auth_id:string, @BodyProp() player_id:number):Promise<PlayerProfileReply> {
        const id = await resolvePlayerId(auth_id, this.dbi);
        this.logger.info("Getting profile for player: %s", player_id)

        return {message: 'ok', profile: await getPlayerProfile(id, player_id, this.dbi)}
    }

    @Post("getMyProfile")
    public async getMyProfile(@BodyProp() auth_id:string):Promise<MyProfileReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const profile = await getProfile(player_id, this.dbi);
        const spelling_bee_stats = await getSpellingBeeStats(player_id, this.dbi)
        if (profile === null) {
            return {message: "no player", profile:null};
        }
        return {message: 'ok', profile: {nick: profile.nick, spelling_bee_stats:spelling_bee_stats}}
    }
}