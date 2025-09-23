export interface ScoringRules {
  uniqueAnswer: number
  duplicateAnswer: number
  invalidAnswer: number
  emptyAnswer: number
  bonusCompleteRound: number
}

export interface PlayerAnswer {
  playerId: string
  categoryId: string
  answer: string
  isValid: boolean
  points: number
}

export interface RoundResult {
  playerId: string
  answers: PlayerAnswer[]
  totalPoints: number
  bonusPoints: number
  finalScore: number
}

export const defaultScoringRules: ScoringRules = {
  uniqueAnswer: 10, // Resposta única (só você respondeu)
  duplicateAnswer: 5, // Resposta duplicada (outros também responderam)
  invalidAnswer: 0, // Resposta inválida (não começa com a letra)
  emptyAnswer: 0, // Resposta em branco
  bonusCompleteRound: 5, // Bônus por completar todas as categorias
}

export function validateAnswer(answer: string, letter: string, category: string): boolean {
  if (!answer || answer.trim().length === 0) return false

  const normalizedAnswer = answer.trim().toLowerCase()
  const normalizedLetter = letter.toLowerCase()

  // Verifica se a resposta começa com a letra correta
  if (!normalizedAnswer.startsWith(normalizedLetter)) return false

  // Validações específicas por categoria (opcional)
  switch (category.toLowerCase()) {
    case "cor":
      // Lista básica de cores válidas
      const validColors = [
        "azul",
        "amarelo",
        "verde",
        "vermelho",
        "roxo",
        "rosa",
        "preto",
        "branco",
        "laranja",
        "marrom",
        "cinza",
        "violeta",
        "turquesa",
        "dourado",
        "prateado",
      ]
      return validColors.some((color) => normalizedAnswer.includes(color))

    default:
      return true
  }
}

export function calculateRoundScores(
  playersAnswers: { [playerId: string]: { [categoryId: string]: string } },
  categories: { id: string; name: string }[],
  currentLetter: string,
  rules: ScoringRules = defaultScoringRules,
): RoundResult[] {
  const results: RoundResult[] = []
  const playerIds = Object.keys(playersAnswers)

  // Agrupa respostas por categoria para detectar duplicatas
  const answersByCategory: { [categoryId: string]: { [answer: string]: string[] } } = {}

  categories.forEach((category) => {
    answersByCategory[category.id] = {}

    playerIds.forEach((playerId) => {
      const answer = playersAnswers[playerId]?.[category.id]?.trim().toLowerCase()
      if (answer) {
        if (!answersByCategory[category.id][answer]) {
          answersByCategory[category.id][answer] = []
        }
        answersByCategory[category.id][answer].push(playerId)
      }
    })
  })

  // Calcula pontuação para cada jogador
  playerIds.forEach((playerId) => {
    const playerAnswers: PlayerAnswer[] = []
    let totalPoints = 0
    let validAnswersCount = 0

    categories.forEach((category) => {
      const rawAnswer = playersAnswers[playerId]?.[category.id] || ""
      const answer = rawAnswer.trim()
      const normalizedAnswer = answer.toLowerCase()

      let points = 0
      let isValid = false

      if (!answer) {
        // Resposta em branco
        points = rules.emptyAnswer
      } else if (!validateAnswer(answer, currentLetter, category.name)) {
        // Resposta inválida
        points = rules.invalidAnswer
      } else {
        isValid = true
        validAnswersCount++

        // Verifica se é resposta única ou duplicada
        const playersWithSameAnswer = answersByCategory[category.id][normalizedAnswer] || []
        if (playersWithSameAnswer.length === 1) {
          points = rules.uniqueAnswer
        } else {
          points = rules.duplicateAnswer
        }
      }

      totalPoints += points

      playerAnswers.push({
        playerId,
        categoryId: category.id,
        answer,
        isValid,
        points,
      })
    })

    // Bônus por completar todas as categorias
    const bonusPoints = validAnswersCount === categories.length ? rules.bonusCompleteRound : 0
    const finalScore = totalPoints + bonusPoints

    results.push({
      playerId,
      answers: playerAnswers,
      totalPoints,
      bonusPoints,
      finalScore,
    })
  })

  return results
}

export function getScoreBreakdown(result: RoundResult, categories: { id: string; name: string }[]) {
  const breakdown = {
    uniqueAnswers: 0,
    duplicateAnswers: 0,
    invalidAnswers: 0,
    emptyAnswers: 0,
    totalAnswers: categories.length,
    completionRate: 0,
  }

  result.answers.forEach((answer) => {
    if (!answer.answer.trim()) {
      breakdown.emptyAnswers++
    } else if (!answer.isValid) {
      breakdown.invalidAnswers++
    } else if (answer.points === defaultScoringRules.uniqueAnswer) {
      breakdown.uniqueAnswers++
    } else if (answer.points === defaultScoringRules.duplicateAnswer) {
      breakdown.duplicateAnswers++
    }
  })

  breakdown.completionRate = Math.round(
    ((breakdown.totalAnswers - breakdown.emptyAnswers) / breakdown.totalAnswers) * 100,
  )

  return breakdown
}
