import { C } from './UI'

export default function PlayMoreGamesSheet({ open, onClose, onNavigate, qCount = 0, quizCount = 0, rank = null }) {
  if (!open) return null

  const games = [
    {
      id: 'predict',
      icon: '🎯',
      title: 'Predict',
      sub: 'Win XP + badges',
      badge: qCount > 0 ? `${qCount} OPEN` : 'SOON',
      badgeColor: C.blue,
      glow: C.blue,
    },
    {
      id: 'players',
      icon: '🏆',
      title: 'Player Picks',
      sub: 'MOTM & more',
      badge: 'NEW',
      badgeColor: C.yellow,
      glow: C.yellow,
    },
    {
      id: 'quiz',
      icon: '📝',
      title: 'Quiz',
      sub: 'Test your knowledge',
      badge: quizCount > 0 ? `${quizCount} Q` : 'PLAY',
      badgeColor: C.purple,
      glow: C.purple,
    },
    {
      id: 'ranks',
      icon: '🏆',
      title: 'Ranks',
      sub: rank ? `You are #${rank}` : 'Top fans',
      badge: 'LIVE',
      badgeColor: C.green,
      glow: C.green,
    },
  ]

  function go(destination) {
    onClose?.()
    onNavigate?.(destination)
  }

  return (
    <div className="hub-games-backdrop" onClick={onClose}>
      <section className="hub-games-sheet" onClick={e => e.stopPropagation()}>
        <div className="hub-games-handle" />
        <div className="hub-section-head">
          <h3>More games</h3>
          <button type="button" className="hub-link" onClick={onClose}>Close</button>
        </div>
        <div className="hub-grid">
          {games.map(game => (
            <button
              key={game.id}
              type="button"
              className="hub-card"
              onClick={() => go(game.id)}
              style={{ '--hub-glow': game.glow }}
            >
              <div className="hub-card-icon">{game.icon}</div>
              <div className="hub-card-title">{game.title}</div>
              <div className="hub-card-sub">{game.sub}</div>
              <span
                className="hub-card-badge"
                style={{
                  background: `${game.badgeColor}25`,
                  color: game.badgeColor,
                  borderColor: `${game.badgeColor}50`,
                }}
              >
                {game.badge}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
