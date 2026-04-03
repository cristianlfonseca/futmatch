// ============================================
// FutMatch - Team Balancing Algorithm
// ============================================

/**
 * Balances confirmed players into N teams using a snake-draft approach.
 * Players are sorted by skill_level DESC and distributed in serpentine order
 * (1→2→...→N→N→...→2→1→...) for fairness.
 *
 * @param {Array} players - Array of player objects with skill_level
 * @param {number} numTeams - Number of teams to create (default 2)
 * @returns {Array<Array>} - Array of team arrays
 */
function balanceTeams(players, numTeams = 2) {
  if (players.length === 0) return Array.from({ length: numTeams }, () => []);
  if (numTeams < 2) numTeams = 2;

  // Sort by skill_level descending (treat null as 3 — average)
  const sorted = [...players].sort((a, b) => {
    const skillA = a.skill_level || 3;
    const skillB = b.skill_level || 3;
    return skillB - skillA;
  });

  // Initialize teams
  const teams = Array.from({ length: numTeams }, () => []);

  // Snake draft: round-robin alternating direction
  let direction = 1; // 1 = forward, -1 = backward
  let teamIndex = 0;

  for (const player of sorted) {
    teams[teamIndex].push(player);

    // Move to next team
    const nextIndex = teamIndex + direction;

    if (nextIndex >= numTeams) {
      // Hit the end, reverse direction
      direction = -1;
    } else if (nextIndex < 0) {
      // Hit the beginning, reverse direction
      direction = 1;
    } else {
      teamIndex = nextIndex;
    }
  }

  return teams;
}

/**
 * Calculates the total skill of a team.
 * Useful for UI display.
 */
function teamSkillTotal(team) {
  return team.reduce((sum, p) => sum + (p.skill_level || 3), 0);
}

module.exports = { balanceTeams, teamSkillTotal };
