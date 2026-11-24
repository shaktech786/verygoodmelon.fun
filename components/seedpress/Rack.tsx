import { SHOWCASE_GROUPS } from '@/lib/games/config'
import { Icon } from './icons/Icon'
import { Packet } from './Packet'
import { SHELF_STYLE } from './shelves'

/** Every game on three shelves, in the one order every listing uses. */
export function Rack() {
  let order = 0
  return (
    <section aria-label="The rack" className="sp-rack">
      {SHOWCASE_GROUPS.map((group) => {
        const style = SHELF_STYLE[group.category]
        const headingId = `shelf-${group.category.toLowerCase()}`
        return (
          <section
            key={group.category}
            aria-labelledby={headingId}
            className="sp-shelf"
            style={{ ['--shelf-ink' as string]: `var(--${style.ink})` }}
          >
            <h2 id={headingId} className="sp-shelf__name">
              <Icon name={style.glyph} size={36} />
              {group.title}
            </h2>
            <p className="sp-shelf__line">{group.description}</p>
            <div className="sp-shelf__edge" aria-hidden="true" />
            <ul className="sp-shelf__packets">
              {group.games.map((game) => (
                <li key={game.id}>
                  <Packet game={game} order={order++} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
