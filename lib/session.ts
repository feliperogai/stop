// Sistema de sessão com localStorage para persistir usuário

export interface UserSession {
  playerId: number
  playerName: string
  sessionId: string
  roomCode?: string
  gameId?: number
  isHost?: boolean
  createdAt: number
}

const SESSION_KEY = 'stop-game-session'

export function saveUserSession(session: UserSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.error('Erro ao salvar sessão:', error)
  }
}

export function getUserSession(): UserSession | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY)
    if (!sessionData) return null
    
    const session = JSON.parse(sessionData) as UserSession
    
    // Verificar se a sessão não expirou (24 horas)
    const now = Date.now()
    const sessionAge = now - session.createdAt
    const maxAge = 24 * 60 * 60 * 1000 // 24 horas
    
    if (sessionAge > maxAge) {
      clearUserSession()
      return null
    }
    
    return session
  } catch (error) {
    console.error('Erro ao recuperar sessão:', error)
    return null
  }
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.error('Erro ao limpar sessão:', error)
  }
}

export function updateUserSession(updates: Partial<UserSession>): void {
  const currentSession = getUserSession()
  if (currentSession) {
    const updatedSession = { ...currentSession, ...updates }
    saveUserSession(updatedSession)
  }
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function isSessionValid(): boolean {
  const session = getUserSession()
  return session !== null
}
