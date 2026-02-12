import { Post, BodyProp, Route } from "tsoa";
import WordleDBI from "../DBI/DBI";
import { addFriend, addFriendCode, friendList } from "../DBI/friends/friends";
import { getProfile, resolvePlayerId } from "../DBI/player/player";
import { inject, injectable } from "inversify";

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

@injectable()
@Route("api/v4/friend")
export class FriendController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
    ) {

    }

    @Post("code")
    public async getCode(@BodyProp() auth_id:string):Promise<FriendCodeReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = generateFriendCode(7);
            console.log(generated_friend_code)
        } while (!(friend_code = await addFriendCode(player_id, generated_friend_code, this.dbi)));
        return{
            status: "ok",
            friendCode: friend_code.friend_code
        }
    }

    @Post("add")
    public async addFriend(@BodyProp() auth_id:string, @BodyProp() friend_code:string):Promise<FriendAddReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        if (await addFriend(player_id, friend_code, this.dbi)) {
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
    public async friendList(@BodyProp() auth_id:string):Promise<FriendList> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var playerFriendList = await friendList(player_id, this.dbi);

        return {
            status: "ok",
            friend_list: await Promise.all(playerFriendList.map(async (friendId) => { return { player_id: friendId, nick: (await getProfile(friendId, this.dbi))!.nick }; }))
        }
    }
}