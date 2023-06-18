import { FindOneResult } from "monk";
import { StatsDBI } from "../../../../StatsDBI";
import WordleDBI from "../DBI";
import { PlayerLastLogin } from "./PlayerLastLogin";
import { PlayerLimits } from "./PlayerLimits";
import { PlayerProfile } from "./PlayerProfile";
import { SocialToAuth } from "./SocialToAuth";

export async function checkSocialId(authId:string, socialId:string, dbi:WordleDBI):Promise<FindOneResult<SocialToAuth>> {
    var result = await dbi.social_to_auth().findOneAndUpdate({socialId:socialId}, {$setOnInsert:{authId:authId, socialId:socialId}}, {upsert:true})
    if (result?.authId === null) {
        return dbi.social_to_auth().findOneAndUpdate({socialId:socialId}, {$set:{authId:authId, socialId:socialId}}, {upsert:true})
    }
    return result;
}
export async function addPlayerToAuthMap(authId:string, playerId:number, dbi:WordleDBI) {
    return await dbi.player_auth().insert({auth_id: authId, player_id: playerId});
}

export async function resolvePlayerId(auth_id:string, dbi:WordleDBI):Promise<number> {
    const authEntry = await dbi.player_auth().findOne({auth_id: auth_id});
    return authEntry!.player_id;
}

export async function isAuthIdUsed(auth_id:string, dbi:WordleDBI):Promise<boolean> {
    const authEntry = await dbi.player_auth().findOne({auth_id:auth_id})
    return authEntry !== null
}

export async function setNick(playerId:number, nick:string, dbi:WordleDBI) {
    dbi.player_profile().findOneAndUpdate({id: playerId},  {$set:{nick: nick}}, {upsert: true});
}

export async function getProfile(playerId:number, dbi:WordleDBI):Promise<PlayerProfile|null> {
    return dbi.player_profile().findOne({id: playerId});
}

export async function getLastLoginTimestamp(player_id:number, dbi:WordleDBI):Promise<PlayerLastLogin | null> {
    return dbi.player_login_timestamp().findOne({player_id:player_id})
}

export async function updateLastLoginTimestamp(timestamp:number, player_id:number, dbi:WordleDBI) {
    dbi.player_login_timestamp().findOneAndUpdate({player_id: player_id}, {$set:{timestamp: timestamp}}, {upsert:true})
}

export async function resetPlayerLimits(player_id:number, dbi:WordleDBI):Promise<PlayerLimits|null> {
    return null;
    // const new_limits = await dbi.limits_model().findOne({player_category:"free"});
    // return dbi.player_limits().findOneAndUpdate({player_id:player_id}, {$set:{limits:new_limits!.limits}},
    //     {upsert:true})
}

export async function getPlayerLimits(player_id:number, dbi:WordleDBI):Promise<PlayerLimits|null> {
    return dbi.player_limits().findOne({player_id:player_id});
}

export async function checkLimit(limitName:string, player_id:number, dbi:WordleDBI):Promise<boolean> {
    // var playerLimits = await getPlayerLimits(player_id, dbi)

    // if (playerLimits === null) {
    //     return false;
    // }
    // var limit = playerLimits.limits.find(limit => limit.name === limitName);
    // if (limit!.limitless) {
    //     return true;
    // }
    // if (limit!.limit <= 0) {
    //     return false;
    // }
    // limit!.limit -= 1;
    // dbi.player_limits().findOneAndUpdate({player_id:player_id}, {$set: playerLimits}, {upsert:false})
    return true;
}