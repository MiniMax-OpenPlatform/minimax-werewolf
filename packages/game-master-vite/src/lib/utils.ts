import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type PlayerInfo } from "@ai-werewolf/types"
import { type Player } from "./Player"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function playersToInfo(players: Player[]): PlayerInfo[] {
  return players.map(player => ({
    id: player.id,
    isAlive: player.isAlive
  }))
}
