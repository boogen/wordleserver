import { FindOneResult } from "monk";
import { StatsDBI } from "../../../../StatsDBI";
import WordleDBI from "../DBI";
import { PlayerLastLogin } from "./PlayerLastLogin";
import { PlayerLimits } from "./PlayerLimits";
import { PlayerProfile } from "./PlayerProfile";
import { SocialToAuth } from "./SocialToAuth";

export async function checkSocialId(authId:string, socialId:string, dbi:WordleDBI):Promise<FindOneResult<SocialToAuth>> {
    var result = await dbi.socialToAuth().findOneAndUpdate({socialId:socialId}, {$setOnInsert:{authId:authId, socialId:socialId}}, {upsert:true})
    if (result?.authId === null) {
        return dbi.socialToAuth().findOneAndUpdate({socialId:socialId}, {$set:{authId:authId, socialId:socialId}}, {upsert:true})
    }
    return result;
}
export async function addPlayerToAuthMap(authId:string, playerId:number, dbi:WordleDBI) {
    return await dbi.playerAuth().insert({auth_id: authId, player_id: playerId});
}

export async function resolvePlayerId(auth_id:string, dbi:WordleDBI):Promise<number> {
    const authEntry = await dbi.playerAuth().findOne({auth_id: auth_id});
    if (!authEntry) {
        throw new Error(`Unknown auth_id`);
    }
    return authEntry.player_id;
}

export async function isAuthIdUsed(auth_id:string, dbi:WordleDBI):Promise<boolean> {
    const authEntry = await dbi.playerAuth().findOne({auth_id:auth_id})
    return authEntry !== null
}

export async function setNick(playerId:number, nick:string, dbi:WordleDBI) {
    await dbi.playerProfile().findOneAndUpdate({id: playerId},  {$set:{nick: nick}}, {upsert: true});
}

export async function getProfile(playerId:number, dbi:WordleDBI):Promise<PlayerProfile|null> {
    return dbi.playerProfile().findOne({id: playerId});
}

export async function getLastLoginTimestamp(player_id:number, dbi:WordleDBI):Promise<PlayerLastLogin | null> {
    return dbi.playerLoginTimestamp().findOne({player_id:player_id})
}

export async function updateLastLoginTimestamp(timestamp:number, player_id:number, dbi:WordleDBI) {
    await dbi.playerLoginTimestamp().findOneAndUpdate({player_id: player_id}, {$set:{timestamp: timestamp}}, {upsert:true})
}

export async function resetPlayerLimits(player_id:number, dbi:WordleDBI):Promise<PlayerLimits|null> {
    return null;
    // const new_limits = await dbi.limitsModel().findOne({player_category:"free"});
    // return dbi.playerLimits().findOneAndUpdate({player_id:player_id}, {$set:{limits:new_limits!.limits}},
    //     {upsert:true})
}

export async function getPlayerLimits(player_id:number, dbi:WordleDBI):Promise<PlayerLimits|null> {
    return dbi.playerLimits().findOne({player_id:player_id});
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
    // dbi.playerLimits().findOneAndUpdate({player_id:player_id}, {$set: playerLimits}, {upsert:false})
    return true;
}