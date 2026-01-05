'use client'

/**
 * Thought Pockets - Event Screen
 * Random mystery encounters with choices
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '@/lib/games/thought-pockets/store/gameStore'
import { cn } from '@/lib/utils'

// =============================================================================
// EVENT DATA
// =============================================================================

interface EventChoice {
  text: string
  effect: () => void
  preview: string
}

interface GameEvent {
  id: string
  title: string
  icon: string
  description: string
  getChoices: (
    heal: (amount: number) => void,
    damage: (amount: number) => void,
    addGold: (amount: number) => void,
    spendGold: (amount: number) => boolean,
    gold: number,
    coherence: number,
    maxCoherence: number
  ) => EventChoice[]
}

const EVENTS: GameEvent[] = [
  {
    id: 'thought_experiment',
    title: 'The Thought Experiment',
    icon: '💭',
    description:
      'You encounter a curious philosopher who presents you with a challenging thought experiment. "Consider this," they say, "Would you trade temporary pain for lasting insight?"',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Embrace the challenge',
        effect: () => {
          damage(5)
          addGold(30)
        },
        preview: 'Lose 5 Coherence, gain 30 Gold',
      },
      {
        text: 'Politely decline',
        effect: () => {},
        preview: 'Nothing happens',
      },
    ],
  },
  {
    id: 'ancient_library',
    title: 'The Ancient Library',
    icon: '📚',
    description:
      'You stumble upon a hidden library filled with dusty tomes. A librarian offers you a choice: pay for access or risk taking forbidden knowledge.',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Pay for proper access',
        effect: () => {
          if (gold >= 25) {
            spendGold(25)
            heal(15)
          }
        },
        preview: gold >= 25 ? 'Pay 25 Gold, heal 15 Coherence' : '(Need 25 Gold)',
      },
      {
        text: 'Take the forbidden path',
        effect: () => {
          damage(10)
          addGold(50)
        },
        preview: 'Lose 10 Coherence, gain 50 Gold',
      },
      {
        text: 'Leave respectfully',
        effect: () => {},
        preview: 'Nothing happens',
      },
    ],
  },
  {
    id: 'wandering_sage',
    title: 'The Wandering Sage',
    icon: '🧙',
    description:
      'An old sage sits by the roadside, offering wisdom to those who seek it. "I can teach you," they say, "but knowledge has its price."',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Accept their teaching',
        effect: () => {
          if (gold >= 40) {
            spendGold(40)
            heal(20)
          }
        },
        preview: gold >= 40 ? 'Pay 40 Gold, heal 20 Coherence' : '(Need 40 Gold)',
      },
      {
        text: 'Offer a trade instead',
        effect: () => {
          damage(8)
          addGold(35)
        },
        preview: 'Lose 8 Coherence, gain 35 Gold',
      },
      {
        text: 'Simply converse',
        effect: () => {
          heal(5)
        },
        preview: 'Heal 5 Coherence',
      },
    ],
  },
  {
    id: 'mirror_of_truth',
    title: 'The Mirror of Truth',
    icon: '🪞',
    description:
      'You find a strange mirror that shows not your reflection, but your cognitive biases. Gazing into it is enlightening, but disturbing.',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Gaze deeply',
        effect: () => {
          damage(15)
          addGold(75)
        },
        preview: 'Lose 15 Coherence, gain 75 Gold',
      },
      {
        text: 'A brief glance',
        effect: () => {
          damage(5)
          addGold(25)
        },
        preview: 'Lose 5 Coherence, gain 25 Gold',
      },
      {
        text: 'Avert your eyes',
        effect: () => {},
        preview: 'Nothing happens',
      },
    ],
  },
  {
    id: 'paradox_pool',
    title: 'The Paradox Pool',
    icon: '🌊',
    description:
      'A shimmering pool reflects impossible geometries. Drinking from it could grant clarity... or confusion.',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Drink deeply',
        effect: () => {
          // 50/50 chance
          if (Math.random() < 0.5) {
            heal(20)
          } else {
            damage(10)
          }
        },
        preview: '50% chance: Heal 20 OR Lose 10 Coherence',
      },
      {
        text: 'Just a sip',
        effect: () => {
          heal(5)
        },
        preview: 'Heal 5 Coherence (safe)',
      },
      {
        text: 'Walk away',
        effect: () => {},
        preview: 'Nothing happens',
      },
    ],
  },
  {
    id: 'merchants_gambit',
    title: 'The Merchant\'s Gambit',
    icon: '🎲',
    description:
      'A traveling merchant offers you a peculiar wager. "Double or nothing," they grin. "What say you?"',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Accept the gamble',
        effect: () => {
          if (Math.random() < 0.5) {
            addGold(gold)
          } else {
            spendGold(Math.floor(gold / 2))
          }
        },
        preview: '50% double your gold, 50% lose half',
      },
      {
        text: 'Negotiate fairly',
        effect: () => {
          addGold(15)
        },
        preview: 'Gain 15 Gold (safe)',
      },
      {
        text: 'Decline politely',
        effect: () => {},
        preview: 'Nothing happens',
      },
    ],
  },
  {
    id: 'shrine_of_rest',
    title: 'The Shrine of Rest',
    icon: '⛩️',
    description:
      'A peaceful shrine emanates a calming aura. You feel your worries lifting as you approach.',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Meditate fully',
        effect: () => {
          heal(Math.floor((maxCoherence - coherence) * 0.5))
        },
        preview: `Heal 50% of missing Coherence`,
      },
      {
        text: 'Brief prayer',
        effect: () => {
          heal(8)
        },
        preview: 'Heal 8 Coherence',
      },
      {
        text: 'Leave an offering',
        effect: () => {
          if (gold >= 20) {
            spendGold(20)
            heal(25)
          }
        },
        preview: gold >= 20 ? 'Pay 20 Gold, heal 25 Coherence' : '(Need 20 Gold)',
      },
    ],
  },
  {
    id: 'devils_advocate',
    title: 'The Devil\'s Advocate',
    icon: '😈',
    description:
      'A figure challenges every statement you make, forcing you to defend your beliefs. Annoying, but potentially valuable.',
    getChoices: (heal, damage, addGold, spendGold, gold, coherence, maxCoherence) => [
      {
        text: 'Engage in debate',
        effect: () => {
          damage(8)
          addGold(45)
        },
        preview: 'Lose 8 Coherence, gain 45 Gold',
      },
      {
        text: 'Listen silently',
        effect: () => {
          addGold(15)
        },
        preview: 'Gain 15 Gold',
      },
      {
        text: 'Walk away frustrated',
        effect: () => {
          damage(3)
        },
        preview: 'Lose 3 Coherence',
      },
    ],
  },
]

// =============================================================================
// EVENT SCREEN
// =============================================================================

export function EventScreen() {
  const gameState = useGameStore((state) => state.gameState)
  const heal = useGameStore((state) => state.heal)
  const damage = useGameStore((state) => state.damage)
  const addGold = useGameStore((state) => state.addGold)
  const spendGold = useGameStore((state) => state.spendGold)
  const setScreen = useGameStore((state) => state.setScreen)
  const completeNode = useGameStore((state) => state.completeNode)

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [choiceMade, setChoiceMade] = useState(false)
  const [outcome, setOutcome] = useState<string>('')

  // Select a random event based on seed
  const event = useMemo(() => {
    const seed = gameState.seed + gameState.currentFloor * 300
    const index = Math.abs(seed % EVENTS.length)
    return EVENTS[index]
  }, [gameState.seed, gameState.currentFloor])

  const choices = useMemo(
    () =>
      event.getChoices(
        heal,
        damage,
        addGold,
        spendGold,
        gameState.gold,
        gameState.coherence,
        gameState.maxCoherence
      ),
    [event, heal, damage, addGold, spendGold, gameState.gold, gameState.coherence, gameState.maxCoherence]
  )

  const handleChoice = (index: number) => {
    const choice = choices[index]
    setSelectedChoice(index)
    choice.effect()
    setOutcome(choice.preview)
    setChoiceMade(true)
  }

  const handleContinue = () => {
    completeNode()
    setScreen('map')
  }

  return (
    <div className="min-h-screen bg-[#2D2A26] text-[#F7F3EB] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Event Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{event.icon}</div>
          <h1 className="font-serif text-3xl mb-2">{event.title}</h1>
        </div>

        {/* Event Description */}
        <div className="bg-[#1a1917] rounded-xl p-6 mb-6 border border-[#D4C9B5]/20">
          <p className="text-lg text-[#D4C9B5] leading-relaxed">{event.description}</p>
        </div>

        {/* Choices */}
        {!choiceMade ? (
          <div className="space-y-3">
            {choices.map((choice, index) => {
              const isDisabled = choice.preview.includes('(Need')

              return (
                <button
                  key={index}
                  onClick={() => !isDisabled && handleChoice(index)}
                  disabled={isDisabled}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-amber-400',
                    isDisabled
                      ? 'border-[#5A5550]/30 bg-[#1a1917]/50 cursor-not-allowed opacity-50'
                      : 'border-[#D4C9B5]/30 bg-[#1a1917] hover:border-amber-500 cursor-pointer'
                  )}
                >
                  <p className="font-serif text-lg mb-1">{choice.text}</p>
                  <p className={cn(
                    'text-sm',
                    choice.preview.includes('Lose')
                      ? 'text-red-400'
                      : choice.preview.includes('Heal') || choice.preview.includes('Gain')
                      ? 'text-emerald-400'
                      : 'text-[#8A847A]'
                  )}>
                    {choice.preview}
                  </p>
                </button>
              )
            })}
          </div>
        ) : (
          /* Outcome */
          <div className="text-center">
            <div className="bg-[#1a1917] rounded-xl p-6 mb-6 border border-amber-600/30">
              <p className="text-lg text-[#D4C9B5] mb-2">You chose:</p>
              <p className="font-serif text-xl text-amber-400 mb-4">
                {choices[selectedChoice!].text}
              </p>
              <p className="text-[#8A847A]">{outcome}</p>
            </div>

            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-serif font-bold
                       text-[#2D2A26] transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              Continue
            </button>
          </div>
        )}

        {/* Current Stats */}
        <div className="mt-8 text-center text-sm text-[#5A5550]">
          <p>
            Coherence: {gameState.coherence}/{gameState.maxCoherence} |
            Gold: {gameState.gold}
          </p>
        </div>
      </div>
    </div>
  )
}
