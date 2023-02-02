import { Post, Query, Route } from "tsoa";
import WordleDBI from "../DBI/DBI";
import { addFriend, addFriendCode, friendList } from "../DBI/friends/friends";
import { getProfile, resolvePlayerId } from "../DBI/player/player";

const dbi = new WordleDBI();

interface FriendCodeReply {
    status:string;
    friendCode:string;
}

interface FriendAddReply {
    status:string;
}

interface Friend {
    player_id:number;
    nick:string;
}

interface FriendList {
    status:string;
    friend_list: Friend[]
}

export function generateFriendCode(length:number):string {
    var text = "";
    var possible = "0123456789";

    for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

@Route("api/v4/friend")
export class FriendController {

    @Post("code")
    public async getCode(@Query() auth_id:string):Promise<FriendCodeReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = generateFriendCode(7);
            console.log(generated_friend_code)
        } while (!(friend_code = await addFriendCode(player_id, generated_friend_code, dbi)));
        return{
            status: "ok",
            friendCode: friend_code.friend_code
        }
    }

    @Post("add")
    public async addFriend(@Query() auth_id:string, @Query() friend_code:string):Promise<FriendAddReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        if (await addFriend(player_id, friend_code, dbi)) {
            return {
                status: "ok"
            }
        }
        else {
            return {
                status: "failed"
            }
        }
    }

    @Post("list")
    public async friendList(@Query() auth_id:string):Promise<FriendList> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        var playerFriendList = await friendList(player_id, dbi);

        return {
            status: "ok",
            friend_list: await Promise.all(playerFriendList.map(async (friendId) => { return { player_id: friendId, nick: (await getProfile(friendId, dbi))!.nick }; }))
        }
    }
}