import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { PlayerProfile } from "./PlayerProfile";
import { SocialToAuth } from "./SocialToAuth";

export async function checkSocialId(authId:string, socialId:string, dbi:WordleDBI):Promise<FindOneResult<SocialToAuth>> {
    var result = await dbi.social_to_auth().findOneAndUpdate({socialId:socialId}, {$setOnInsert:{authId:authId, socialId:socialId}}, {upsert:true})
    if (result?.authId === "") {
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

export async function setNick(playerId:number, nick:string, callback:CallableFunction, dbi:WordleDBI) {
    dbi.player_profile().findOneAndUpdate({id: playerId},  {$set:{nick: nick}}, {upsert: true}).then(profile => callback(profile!.nick));
}

export async function getProfile(playerId:number, dbi:WordleDBI):Promise<PlayerProfile|null> {
    return dbi.player_profile().findOne({id: playerId});
}