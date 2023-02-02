import { Post, Query, Route } from "tsoa";
import Utils from "../../../utils";
import { Stats } from "../../../WordleStatsDBI";
import WordleDBI from "../DBI/DBI";
import { addFriendCode, friendList, getFriendCode } from "../DBI/friends/friends";
import { addPlayerToAuthMap, checkSocialId, getLastLoginTimestamp, getPlayerLimits, getProfile, isAuthIdUsed, resetPlayerLimits, resolvePlayerId, setNick, updateLastLoginTimestamp } from "../DBI/player/player";
import { PlayerLimits } from "../DBI/player/PlayerLimits";
import { getSpellingBeeDuelStats } from "../DBI/spelling_bee/duel/spelling_bee_duel";
import { getSpellingBeeStats } from "../DBI/spelling_bee/spelling_bee";
import { generateFriendCode } from "../friend/friend_controller";

const dbi = new WordleDBI();
const stats:Stats = new Stats();

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

export async function getPlayerProfile(akserId:number, playerId:number):Promise<PlayerProfile|null> {
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


@Route("api/v4/player")
export class PlayerController {
    @Post("register")
    public async register():Promise<RegistrationReply> {
        var authId = makeid();
        while (await isAuthIdUsed(authId, dbi)) {
            authId = makeid();
        }
        const playerId = await dbi.getNextSequenceValue("player_id");
        await addPlayerToAuthMap(authId, playerId, dbi);
        await stats.addRegistrationEvent(authId, playerId);
        return {message:'ok', auth_id: authId}
    }

    @Post("login")
    public async login(@Query() auth_id:string):Promise<LoginReply> {
        const player_id:number = (await resolvePlayerId(auth_id, dbi));
        var last_login_timestamp = (await getLastLoginTimestamp(player_id, dbi));
        var last_midnight = new Date();
        last_midnight.setHours(0,0,0,0);
        var player_limits:PlayerLimits|null = null;
        if (last_login_timestamp === null || last_login_timestamp.timestamp < (last_midnight.getTime()/1000)) {
            player_limits = await resetPlayerLimits(player_id, dbi)
        }
        else {
            player_limits = await getPlayerLimits(player_id, dbi)
        }
        const timestamp = Date.now() / 1000;
        const now = new Date()    
        await updateLastLoginTimestamp(timestamp, player_id, dbi);
        await stats.addLoginEvent(player_id);
        return {'message':'ok', 'player_id':player_id, player_limits:player_limits!}
    }

    @Post("setNick")
    public async setNick(@Query() auth_id:string, @Query() nick:string):Promise<NickSetReply> {
        console.log(auth_id)
        const player_id:number = (await resolvePlayerId(auth_id, dbi));
        await setNick(player_id, nick, dbi);
        await stats.addSetNickEvent(player_id, nick);
        return {message:'ok', profile: {nick: nick}}
    }

    @Post("getNick")
    public async getNick(@Query() auth_id:string):Promise<NickGetReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        const profile = await getProfile(player_id, dbi)
        return {message:"ok", nick:profile?.nick}
    }

    @Post("setSocialId")
    public async setSocialId(@Query() auth_id:string, @Query() socialId:string):Promise<SetSocialIdReply> {
        const social_to_auth = await checkSocialId(auth_id, socialId, dbi);
        console.log(social_to_auth)
        return {message:'ok', authId:social_to_auth!.authId}
    }

    @Post("getProfile")
    public async getProfile(@Query() auth_id:string, @Query() player_id:number):Promise<PlayerProfileReply> {
        const id = await resolvePlayerId(auth_id, dbi);
        console.log("Getting profile for player: " + player_id)

        return {message: 'ok', profile: await getPlayerProfile(id, player_id)}
    }

    @Post("getMyProfile")
    public async getMyProfile(@Query() auth_id:string):Promise<MyProfileReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        const profile = await getProfile(player_id, dbi);
        const spelling_bee_stats = await getSpellingBeeStats(player_id, dbi)
        if (profile === null) {
            return {message: "no player", profile:null};
        }
        return {message: 'ok', profile: {nick: profile.nick, spelling_bee_stats:spelling_bee_stats}}
    }
}