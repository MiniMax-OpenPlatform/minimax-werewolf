import { type Player } from "./Player";

export interface Client {
    id: number;
    url: string;
    personality?: string;
    voiceId?: string;
    player?: Player;
}
