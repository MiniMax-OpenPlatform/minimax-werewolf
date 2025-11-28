import { type Player } from "./Player";

export interface Client {
    id: number;
    url: string;
    personality?: string;
    player?: Player;
}
