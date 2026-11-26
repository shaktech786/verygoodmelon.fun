import { STORAGE_KEY as HARD_TALK_KEY } from '@/lib/games/hard-talk/session'
import { DRAFT_KEY } from '@/lib/games/worry-capsule/draft'
import { STORAGE_KEY as KEEPER_KEY } from '@/lib/games/worry-capsule/persistence'
import { INSIGHT_KEY, RUN_KEY } from '@/lib/games/thought-pockets/store/keys'

/** The browser keys that make a game open on something other than its first screen, by game. */
const KEPT_KEYS = {
  'hard-talk': [HARD_TALK_KEY],
  keeper: [KEEPER_KEY, DRAFT_KEY],
  'thought-pockets': [RUN_KEY, INSIGHT_KEY],
}

/**
 * These games are drawn on the server as a new visitor first sees them, and saved progress is read once the page has
 * hydrated. A visitor who has kept something would see that first screen for a moment, so this runs before first paint
 * and marks <html data-kept="…">; globals.css hides a game's `data-booting` view for the games listed there.
 * Storage that cannot be read marks every game, since none can know yet which screen it will open on.
 */
export const KEPT_BOOT_SCRIPT = `(function(){var k=${JSON.stringify(KEPT_KEYS)},o=[];try{for(var g in k)for(var i=0;i<k[g].length;i++)if(localStorage.getItem(k[g][i])!==null){o.push(g);break}}catch(e){o=Object.keys(k)}if(o.length)document.documentElement.setAttribute('data-kept',o.join(' '))})()`
