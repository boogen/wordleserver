import { FindOneResult, IMonkManager } from "monk";
import WordleDBI from "../DBI";
import { FriendCode } from "./FriendCode";

export async function addFriend(player_id:number, friend_code:string, dbi:WordleDBI):Promise<boolean> {
    const friend_id = (await dbi.friend_codes().findOne({friend_code: friend_code}))?.player_id;
    if (friend_id === undefined || player_id === friend_id) {
        return false;
    }
    async function addFriendToList(id:number, friendId:number, db:IMonkManager) {
        const friends =  db.get("friends.plr#" + id);
        friends.createIndex({id:1}, {unique: true})
        const friendOnList = await friends.findOne({id: friendId});
        if (friendOnList == null) {
            friends.insert({id: friendId});
        }
    }
    addFriendToList(player_id, friend_id, dbi.db())
    //addFriendToList(friend_id, player_id, this.db())
    return true;
}

export async function checkIfFriends(player_id:number, potential_friend_id:number, dbi:WordleDBI):Promise<boolean> {
    const friends =  dbi.db().get("friends.plr#" + player_id);
    var filteredFriendList = await friends.find({id:potential_friend_id});
    console.log("Player " + player_id + " potential friend " + potential_friend_id + " on list " + filteredFriendList.map(o => o.id).includes(potential_friend_id))
    return filteredFriendList.map(o => o.id).includes(potential_friend_id);
}

export async function friendList(player_id:number, dbi:WordleDBI):Promise<number[]> {
    const friends =  dbi.db().get("friends.plr#" + player_id);
    return (await friends.find()).map(f => f.id)
}

export async function getFriendCode(playerId:number, dbi:WordleDBI):Promise<FindOneResult<FriendCode>> {
    return dbi.friend_codes().findOne({player_id:playerId});
}

export async function addFriendCode(player_id:number, friend_code:string, dbi:WordleDBI):Promise<FindOneResult<FriendCode>> {
    try {
        return dbi.friend_codes().findOneAndUpdate({player_id: player_id}, {$setOnInsert:{player_id: player_id, friend_code: friend_code}}, {upsert:true});
    }
    catch(error) {
        console.log(error)
        return null;
    }
}