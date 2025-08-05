import { test, expect, describe } from 'bun:test';
import { RoleAssignment, type RoleConfig } from '../roleAssignment';
import { Role } from '@ai-werewolf/types';

describe('RoleAssignment', () => {
  describe('getDefaultRoleConfig()', () => {
    describe('Error Cases', () => {
      test('should throw error for less than 6 players', () => {
        expect(() => RoleAssignment.getDefaultRoleConfig(5))
          .toThrow('Minimum 6 players required');
        
        expect(() => RoleAssignment.getDefaultRoleConfig(4))
          .toThrow('Minimum 6 players required');
        
        expect(() => RoleAssignment.getDefaultRoleConfig(0))
          .toThrow('Minimum 6 players required');
        
        expect(() => RoleAssignment.getDefaultRoleConfig(-1))
          .toThrow('Minimum 6 players required');
      });
    });

    describe('6-Player Special Configuration', () => {
      test('should return correct roles for 6 players', () => {
        const config = RoleAssignment.getDefaultRoleConfig(6);
        
        expect(config).toHaveLength(4);
        expect(config).toContainEqual({ role: Role.WEREWOLF, count: 2 });
        expect(config).toContainEqual({ role: Role.SEER, count: 1 });
        expect(config).toContainEqual({ role: Role.WITCH, count: 1 });
        expect(config).toContainEqual({ role: Role.VILLAGER, count: 2 });
      });

      test('should total exactly 6 players for 6-player config', () => {
        const config = RoleAssignment.getDefaultRoleConfig(6);
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        
        expect(totalPlayers).toBe(6);
      });

      test('should have correct role distribution for 6 players', () => {
        const config = RoleAssignment.getDefaultRoleConfig(6);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        expect(roleMap.get(Role.WEREWOLF)).toBe(2);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(2);
      });
    });

    describe('Standard Configuration (7+ Players)', () => {
      test('should configure 7 players correctly', () => {
        const config = RoleAssignment.getDefaultRoleConfig(7);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 7 players: floor(7/3) = 2 werewolves, 1 seer, no witch, 4 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(2);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBeUndefined(); // No witch for 7 players
        expect(roleMap.get(Role.VILLAGER)).toBe(4);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(7);
      });

      test('should configure 8 players correctly', () => {
        const config = RoleAssignment.getDefaultRoleConfig(8);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 8 players: floor(8/3) = 2 werewolves, 1 seer, 1 witch, 4 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(2);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(4);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(8);
      });

      test('should configure 9 players correctly', () => {
        const config = RoleAssignment.getDefaultRoleConfig(9);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 9 players: floor(9/3) = 3 werewolves, 1 seer, 1 witch, 4 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(3);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(4);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(9);
      });

      test('should configure 12 players correctly', () => {
        const config = RoleAssignment.getDefaultRoleConfig(12);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 12 players: floor(12/3) = 4 werewolves, 1 seer, 1 witch, 6 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(4);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(6);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(12);
      });

      test('should configure 15 players correctly', () => {
        const config = RoleAssignment.getDefaultRoleConfig(15);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 15 players: floor(15/3) = 5 werewolves, 1 seer, 1 witch, 8 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(5);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(8);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(15);
      });
    });

    describe('Werewolf Count Calculation', () => {
      test('should calculate werewolf count as floor(playerCount/3)', () => {
        const testCases = [
          { players: 7, expectedWerewolves: 2 },
          { players: 8, expectedWerewolves: 2 },
          { players: 9, expectedWerewolves: 3 },
          { players: 10, expectedWerewolves: 3 },
          { players: 11, expectedWerewolves: 3 },
          { players: 12, expectedWerewolves: 4 },
          { players: 18, expectedWerewolves: 6 },
          { players: 20, expectedWerewolves: 6 }
        ];

        testCases.forEach(({ players, expectedWerewolves }) => {
          const config = RoleAssignment.getDefaultRoleConfig(players);
          const werewolfConfig = config.find(c => c.role === Role.WEREWOLF);
          
          expect(werewolfConfig?.count).toBe(expectedWerewolves);
        });
      });
    });

    describe('Special Roles Rules', () => {
      test('should always include exactly 1 seer for any player count >= 6', () => {
        const playerCounts = [6, 7, 8, 9, 10, 11, 12, 15, 20];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const seerConfig = config.find(c => c.role === Role.SEER);
          
          expect(seerConfig?.count).toBe(1);
        });
      });

      test('should include witch only for 8+ players (except 6-player special case)', () => {
        // Should NOT have witch
        const configSeven = RoleAssignment.getDefaultRoleConfig(7);
        const witchConfigSeven = configSeven.find(c => c.role === Role.WITCH);
        expect(witchConfigSeven).toBeUndefined();
        
        // Should have witch
        const playerCountsWithWitch = [6, 8, 9, 10, 11, 12, 15];
        playerCountsWithWitch.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const witchConfig = config.find(c => c.role === Role.WITCH);
          
          expect(witchConfig?.count).toBe(1);
        });
      });

      test('should calculate villager count as remainder after other roles', () => {
        const testCases = [
          { players: 7, expectedVillagers: 4 }, // 7 - 2(werewolf) - 1(seer) = 4
          { players: 8, expectedVillagers: 4 }, // 8 - 2(werewolf) - 1(seer) - 1(witch) = 4
          { players: 9, expectedVillagers: 4 }, // 9 - 3(werewolf) - 1(seer) - 1(witch) = 4
          { players: 12, expectedVillagers: 6 }, // 12 - 4(werewolf) - 1(seer) - 1(witch) = 6
        ];

        testCases.forEach(({ players, expectedVillagers }) => {
          const config = RoleAssignment.getDefaultRoleConfig(players);
          const villagerConfig = config.find(c => c.role === Role.VILLAGER);
          
          expect(villagerConfig?.count).toBe(expectedVillagers);
        });
      });
    });

    describe('Configuration Validation', () => {
      test('should ensure total players match input for various counts', () => {
        const playerCounts = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 20, 24];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
          
          expect(totalPlayers).toBe(playerCount);
        });
      });

      test('should ensure at least 1 werewolf for any valid player count', () => {
        const playerCounts = [6, 7, 8, 9, 10, 12, 15, 18, 21];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const werewolfConfig = config.find(c => c.role === Role.WEREWOLF);
          
          expect(werewolfConfig?.count).toBeGreaterThanOrEqual(1);
        });
      });

      test('should ensure villagers are never negative', () => {
        const playerCounts = [6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 30];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const villagerConfig = config.find(c => c.role === Role.VILLAGER);
          
          expect(villagerConfig?.count).toBeGreaterThanOrEqual(0);
        });
      });

      test('should never have more werewolves than good players', () => {
        const playerCounts = [6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 30];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const roleMap = new Map(config.map(c => [c.role, c.count]));
          
          const werewolves = roleMap.get(Role.WEREWOLF) || 0;
          const villagers = roleMap.get(Role.VILLAGER) || 0;
          const seer = roleMap.get(Role.SEER) || 0;
          const witch = roleMap.get(Role.WITCH) || 0;
          
          const goodPlayers = villagers + seer + witch;
          
          expect(werewolves).toBeLessThan(goodPlayers);
        });
      });
    });

    describe('Edge Cases', () => {
      test('should handle exactly minimum player count', () => {
        const config = RoleAssignment.getDefaultRoleConfig(6);
        
        expect(config).toBeDefined();
        expect(Array.isArray(config)).toBe(true);
        expect(config.length).toBeGreaterThan(0);
      });

      test('should handle large player counts', () => {
        const config = RoleAssignment.getDefaultRoleConfig(50);
        const roleMap = new Map(config.map(c => [c.role, c.count]));
        
        // 50 players: floor(50/3) = 16 werewolves, 1 seer, 1 witch, 32 villagers
        expect(roleMap.get(Role.WEREWOLF)).toBe(16);
        expect(roleMap.get(Role.SEER)).toBe(1);
        expect(roleMap.get(Role.WITCH)).toBe(1);
        expect(roleMap.get(Role.VILLAGER)).toBe(32);
        
        const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
        expect(totalPlayers).toBe(50);
      });

      test('should handle unusual player counts', () => {
        const unusualCounts = [23, 29, 31, 37, 41];
        
        unusualCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          
          expect(config).toBeDefined();
          expect(Array.isArray(config)).toBe(true);
          
          const totalPlayers = config.reduce((sum, role) => sum + role.count, 0);
          expect(totalPlayers).toBe(playerCount);
          
          // Ensure all counts are positive
          config.forEach(roleConfig => {
            expect(roleConfig.count).toBeGreaterThan(0);
          });
        });
      });
    });

    describe('Role Distribution Balance', () => {
      test('should maintain reasonable balance across different player counts', () => {
        const playerCounts = [8, 12, 16, 20];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const roleMap = new Map(config.map(c => [c.role, c.count]));
          
          const werewolves = roleMap.get(Role.WEREWOLF) || 0;
          const totalGood = playerCount - werewolves;
          
          // Werewolves should be approximately 25-35% of total players
          const werewolfRatio = werewolves / playerCount;
          expect(werewolfRatio).toBeGreaterThanOrEqual(0.2);
          expect(werewolfRatio).toBeLessThanOrEqual(0.4);
        });
      });

      test('should ensure good players always outnumber werewolves', () => {
        const playerCounts = [6, 8, 10, 12, 15, 18, 21, 24, 30];
        
        playerCounts.forEach(playerCount => {
          const config = RoleAssignment.getDefaultRoleConfig(playerCount);
          const roleMap = new Map(config.map(c => [c.role, c.count]));
          
          const werewolves = roleMap.get(Role.WEREWOLF) || 0;
          const goodPlayers = playerCount - werewolves;
          
          expect(goodPlayers).toBeGreaterThan(werewolves);
        });
      });
    });

    describe('Return Value Structure', () => {
      test('should return array of RoleConfig objects', () => {
        const config = RoleAssignment.getDefaultRoleConfig(8);
        
        expect(Array.isArray(config)).toBe(true);
        
        config.forEach(roleConfig => {
          expect(roleConfig).toHaveProperty('role');
          expect(roleConfig).toHaveProperty('count');
          expect(Object.values(Role)).toContain(roleConfig.role);
          expect(typeof roleConfig.count).toBe('number');
          expect(roleConfig.count).toBeGreaterThan(0);
        });
      });

      test('should have unique roles in configuration', () => {
        const config = RoleAssignment.getDefaultRoleConfig(12);
        const roles = config.map(c => c.role);
        const uniqueRoles = [...new Set(roles)];
        
        expect(uniqueRoles.length).toBe(roles.length);
      });

      test('should include all expected role types', () => {
        const config = RoleAssignment.getDefaultRoleConfig(10);
        const roles = config.map(c => c.role);
        
        expect(roles).toContain(Role.WEREWOLF);
        expect(roles).toContain(Role.SEER);
        expect(roles).toContain(Role.VILLAGER);
        // Witch should be included for 10 players
        expect(roles).toContain(Role.WITCH);
      });
    });
  });
});