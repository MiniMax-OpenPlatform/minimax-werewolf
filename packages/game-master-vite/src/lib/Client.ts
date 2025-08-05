import { type Player } from "./Player";

export interface Client {
    id: number;
    url: string;
    player?: Player;
}
