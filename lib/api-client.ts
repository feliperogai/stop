// Cliente para comunicação com a API do banco de dados

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

async function apiCall(action: string, params: any = {}): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, params }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Erro na chamada da API:', error)
    return { success: false, error: 'Erro de conexão' }
  }
}

// Funções de Player
export async function createPlayer(name: string, sessionId: string) {
  const result = await apiCall('createPlayer', { name, sessionId })
  return result.success ? result.data : null
}

export async function getPlayer(id: number) {
  const result = await apiCall('getPlayer', { id })
  return result.success ? result.data : null
}

export async function getPlayerBySessionId(sessionId: string) {
  const result = await apiCall('getPlayerBySessionId', { sessionId })
  return result.success ? result.data : null
}

// Funções de Game Room
export async function createGameRoom(name: string, createdBySessionId: string, maxPlayers = 8) {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
  const result = await apiCall('createGameRoom', { roomCode, name, maxPlayers, createdBySessionId })
  return result.success ? result.data : null
}

export async function getGameRoom(roomCode: string) {
  const result = await apiCall('getGameRoom', { roomCode })
  return result.success ? result.data : null
}

export async function joinGameRoom(roomCode: string, playerId: number, playerName: string) {
  const result = await apiCall('joinGameRoom', { roomCode, playerId, playerName })
  return result.success ? result.data : null
}

// Funções de Game
export async function createGame(roomId: number, maxRounds = 10) {
  const result = await apiCall('createGame', { roomId, maxRounds })
  return result.success ? result.data : null
}

export async function getGame(id: number) {
  const result = await apiCall('getGame', { id })
  return result.success ? result.data : null
}

export async function updateGameStatus(gameId: number, status: string) {
  const result = await apiCall('updateGameStatus', { gameId, status })
  return result.success
}

// Funções de Game Participants
export async function addGameParticipant(gameId: number, playerId: number, playerName: string) {
  const result = await apiCall('addGameParticipant', { gameId, playerId, playerName })
  return result.success ? result.data : null
}

export async function getGameParticipants(gameId: number) {
  const result = await apiCall('getGameParticipants', { gameId })
  return result.success ? result.data : []
}

// Funções de Room Participants
export async function getRoomParticipants(roomId: number) {
  const result = await apiCall('getRoomParticipants', { roomId })
  return result.success ? result.data : []
}

export async function addRoomParticipant(roomId: number, playerId: number, playerName: string) {
  const result = await apiCall('addRoomParticipant', { roomId, playerId, playerName })
  return result.success ? result.data : null
}

export async function updateRoomParticipantReady(roomId: number, playerId: number, isReady: boolean) {
  const result = await apiCall('updateRoomParticipantReady', { roomId, playerId, isReady })
  return result.success ? result.data : null
}

export async function removeRoomParticipant(roomId: number, playerId: number) {
  const result = await apiCall('removeRoomParticipant', { roomId, playerId })
  return result.success
}

export async function updatePlayerStopStatus(gameId: number, playerId: number, hasStopped: boolean) {
  const result = await apiCall('updatePlayerStopStatus', { gameId, playerId, hasStopped })
  return result.success
}

// Funções de Round
export async function createRound(gameId: number, roundNumber: number, letter: string) {
  const result = await apiCall('createRound', { gameId, roundNumber, letter })
  return result.success ? result.data : null
}

export async function startRound(roundId: number) {
  const result = await apiCall('startRound', { roundId })
  return result.success
}

export async function endRound(roundId: number) {
  const result = await apiCall('endRound', { roundId })
  return result.success
}

export async function getCurrentRound(gameId: number) {
  const result = await apiCall('getCurrentRound', { gameId })
  return result.success ? result.data : null
}

// Funções de Player Answers
export async function savePlayerAnswer(roundId: number, playerId: number, playerName: string, categoryId: number, answer: string) {
  const result = await apiCall('savePlayerAnswer', { roundId, playerId, playerName, categoryId, answer })
  return result.success ? result.data : null
}

export async function getRoundAnswers(roundId: number) {
  const result = await apiCall('getRoundAnswers', { roundId })
  return result.success ? result.data : []
}

// Funções de Categorias
export async function getGameCategories(gameId: number) {
  const result = await apiCall('getGameCategories', { gameId })
  return result.success ? result.data : []
}

// Funções de Estatísticas
export async function getGameStats(gameId: number) {
  const result = await apiCall('getGameStats', { gameId })
  return result.success ? result.data : null
}

export async function checkAllPlayersStopped(gameId: number) {
  const result = await apiCall('checkAllPlayersStopped', { gameId })
  return result.success ? result.data : false
}

// Funções de Answer Evaluation
export async function evaluateAnswer(playerAnswerId: number, evaluatorPlayerId: number, isValid: boolean, reason?: string) {
  const result = await apiCall('evaluateAnswer', { playerAnswerId, evaluatorPlayerId, isValid, reason })
  return result.success ? result.data : null
}

export async function getAnswerEvaluations(playerAnswerId: number) {
  const result = await apiCall('getAnswerEvaluations', { playerAnswerId })
  return result.success ? result.data : []
}

// Funções de Round Scores
export async function saveRoundScore(roundId: number, playerId: number, basePoints: number, bonusPoints: number, position: number) {
  const result = await apiCall('saveRoundScore', { roundId, playerId, basePoints, bonusPoints, position })
  return result.success ? result.data : null
}

export async function updatePlayerScore(gameId: number, playerId: number, score: number) {
  const result = await apiCall('updatePlayerScore', { gameId, playerId, score })
  return result.success
}

// Funções de Limpeza
export async function cleanupExpiredData() {
  const result = await apiCall('cleanupExpiredData')
  return result.success
}

// Função de teste
export async function testCategories() {
  console.log("testCategories chamada")
  const result = await apiCall('testCategories')
  console.log("Resultado da API:", result)
  return result.success ? result.data : []
}

// Função para limpar categorias duplicadas
export async function cleanupDuplicateCategories() {
  const result = await apiCall('cleanupDuplicateCategories')
  return result.success
}

// Função para limpeza forçada de categorias
export async function forceCleanupCategories() {
  const result = await apiCall('forceCleanupCategories')
  return result.success
}

// Funções para sistema de votação
export async function getPlayerAnswers(roundId: number) {
  const result = await apiCall('getPlayerAnswers', { roundId })
  return result.success ? result.data : []
}

export async function voteOnAnswer(answerId: number, playerId: number, isValid: boolean) {
  const result = await apiCall('voteOnAnswer', { answerId, playerId, isValid })
  return result.success
}

export async function getVotingResults(roundId: number) {
  const result = await apiCall('getVotingResults', { roundId })
  return result.success ? result.data : []
}

export async function stopGameForAll(gameId: number) {
  const result = await apiCall('stopGameForAll', { gameId })
  return result.success
}

export async function markPlayerReadyForNextCategory(gameId: number, playerId: number, categoryIndex: number) {
  const result = await apiCall('markPlayerReadyForNextCategory', { gameId, playerId, categoryIndex })
  return result.success
}

export async function getPlayersReadyForCategory(gameId: number, categoryIndex: number) {
  const result = await apiCall('getPlayersReadyForCategory', { gameId, categoryIndex })
  return result.success ? result.data : []
}
