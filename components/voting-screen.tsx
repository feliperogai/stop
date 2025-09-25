"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock } from "lucide-react"
import { getGameParticipants, getPlayerAnswers, voteOnAnswer, getVotingResults, markPlayerReadyForNextCategory, getPlayersReadyForCategory, saveRoundScore, updatePlayerScore, markAnswerAsDuplicate, getUserVotes } from "@/lib/api-client"
import { getUserSession } from "@/lib/session"
import { calculateRoundScores } from "@/lib/scoring"
import { toast } from "sonner"

interface VotingScreenProps {
  readonly gameId: number
  readonly roundId: number
  readonly letter: string
  readonly onVotingComplete: () => void
}

interface PlayerAnswer {
  id: number
  player_name: string
  category_name: string
  answer: string
  votes_for: number
  votes_against: number
  is_valid: boolean | null
}

interface VotingData {
  answers: PlayerAnswer[]
  currentCategory: string
  categoryIndex: number
  totalCategories: number
  votingComplete: boolean
}

export default function VotingScreen({ gameId, roundId, letter, onVotingComplete }: VotingScreenProps) {
  const [votingData, setVotingData] = useState<VotingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null)
  const [currentAnswers, setCurrentAnswers] = useState<PlayerAnswer[]>([])
  const [currentCategory, setCurrentCategory] = useState("")
  const [totalCategories, setTotalCategories] = useState(0)
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [playersReady, setPlayersReady] = useState<any[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [isReadyForNext, setIsReadyForNext] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [playerVotes, setPlayerVotes] = useState<{ [answerId: number]: boolean }>({})
  const [duplicateAnswers, setDuplicateAnswers] = useState<{ [answerId: number]: boolean }>({})
  const [userVotes, setUserVotes] = useState<{ [answerId: number]: { is_valid: boolean | null, is_duplicate: boolean | null } }>({})

  useEffect(() => {
    const session = getUserSession()
    if (session) {
      setCurrentPlayerId(session.playerId)
    }
    
    // Resetar estado quando o roundId muda (nova rodada)
    setCurrentCategoryIndex(0)
    setIsReadyForNext(false)
    setIsTransitioning(false)
    setPlayersReady([])
    
    fetchVotingData()
  }, [gameId, roundId])

  // Verificar se todos já estão prontos quando os dados carregam (apenas uma vez)
  useEffect(() => {
    if (totalPlayers > 0 && currentCategoryIndex >= 0 && !isReadyForNext && !loading && !isTransitioning) {
      console.log("🔍 Verificando se todos já estão prontos na categoria:", currentCategoryIndex)
      // Verificar uma única vez quando os dados carregam
      const timeout = setTimeout(() => {
        checkAllPlayersReady()
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [totalPlayers, currentCategoryIndex, loading, isTransitioning])

  // Verificar periodicamente se todos estão prontos (apenas quando necessário)
  useEffect(() => {
    if (isReadyForNext && totalPlayers > 0) {
      console.log("Iniciando verificação periódica de jogadores prontos")
      const interval = setInterval(() => {
        console.log("Verificando jogadores prontos...")
        checkAllPlayersReady()
      }, 5000) // Verificar a cada 5 segundos
      return () => {
        console.log("Parando verificação periódica")
        clearInterval(interval)
      }
    }
  }, [isReadyForNext, totalPlayers])

  const fetchVotingDataWithCategory = async (forcedCategoryIndex: number) => {
    try {
      setLoading(true)
      console.log("🔄 fetchVotingDataWithCategory chamado para roundId:", roundId, "categoria forçada:", forcedCategoryIndex)
      
      const [answers, results, participants] = await Promise.all([
        getPlayerAnswers(roundId),
        getVotingResults(roundId),
        getGameParticipants(gameId)
      ])
      
      console.log("Participantes do jogo:", participants)
      setTotalPlayers(participants.length)
      
      console.log("Dados de votação recebidos:", { answers, results })
      console.log("Número de respostas:", answers.length)
      console.log("Número de resultados:", results.length)
      
      // Organizar respostas por categoria (agora com dados corretos)
      const answersByCategory: { [key: string]: PlayerAnswer[] } = {}
      answers.forEach(answer => {
        console.log("Processando resposta:", answer)
        const categoryName = answer.category_name || `Categoria ${answer.category_id}`
        if (!answersByCategory[categoryName]) {
          answersByCategory[categoryName] = []
        }
        answersByCategory[categoryName].push(answer)
      })
      
      console.log("Respostas organizadas por categoria:", answersByCategory)
      console.log("Categorias encontradas:", Object.keys(answersByCategory))

      // Organizar categorias pela posição (não alfabeticamente)
      const categoriesWithPosition = Object.keys(answersByCategory).map(categoryName => {
        const firstAnswer = answersByCategory[categoryName][0]
        return {
          name: categoryName,
          position: firstAnswer.position || 0
        }
      }).sort((a, b) => a.position - b.position)
      
      const categories = categoriesWithPosition.map(cat => cat.name)
      console.log("Categorias ordenadas por posição:", categories)
      let currentCategory = ""
      let categoryIndex = 0
      let votingComplete = true

      console.log("Categorias disponíveis:", categories)

      if (categories.length > 0) {
        // Usar a categoria forçada
        const targetIndex = Math.min(forcedCategoryIndex, categories.length - 1)
        currentCategory = categories[targetIndex]
        categoryIndex = targetIndex
        votingComplete = false
        
        console.log("Categoria forçada selecionada:", currentCategory)
        console.log("Índice da categoria forçada:", categoryIndex)
        console.log("Respostas para esta categoria:", answersByCategory[currentCategory])
      } else {
        console.log("Nenhuma categoria encontrada!")
      }

      const votingDataToSet = {
        answers: answersByCategory[currentCategory] || [],
        currentCategory,
        categoryIndex,
        totalCategories: categories.length,
        votingComplete
      }
      
      console.log("Definindo votingData:", votingDataToSet)
      console.log("Respostas para categoria atual:", answersByCategory[currentCategory])
      
      // Definir dados para a nova UI
      console.log("Definindo dados da UI:", {
        currentCategory,
        categoryIndex,
        totalCategories: categories.length,
        answersForCategory: answersByCategory[currentCategory] || []
      })
      
      setCurrentAnswers(answersByCategory[currentCategory] || [])
      setCurrentCategory(currentCategory)
      setTotalCategories(categories.length)
      console.log("🎯 Definindo currentCategoryIndex como:", categoryIndex, "para categoria:", currentCategory)
      setCurrentCategoryIndex(categoryIndex)
      
      setVotingData(votingDataToSet)

      if (votingComplete) {
        onVotingComplete()
      }
    } catch (error) {
      console.error("Erro ao buscar dados de votação:", error)
      toast.error("Erro ao carregar dados de votação")
    } finally {
      setLoading(false)
      setIsTransitioning(false)
    }
  }

  const loadUserVotes = async () => {
    if (!currentPlayerId) return
    
    try {
      console.log("🔄 Carregando votos do usuário atual:", currentPlayerId)
      const votes = await getUserVotes(roundId, currentPlayerId)
      console.log("Votos do usuário carregados:", votes)
      
      // Mesclar com estado local existente para não sobrescrever mudanças recentes
      setUserVotes(prev => {
        const merged = { ...prev, ...votes }
        console.log("Estado mesclado:", merged)
        return merged
      })
    } catch (error) {
      console.error("Erro ao carregar votos do usuário:", error)
    }
  }

  const fetchVotingData = async () => {
    try {
      setLoading(true)
      console.log("🔄 fetchVotingData chamado para roundId:", roundId, "categoria:", currentCategoryIndex)
      
      const [answers, results, participants] = await Promise.all([
        getPlayerAnswers(roundId),
        getVotingResults(roundId),
        getGameParticipants(gameId)
      ])
      
      // Carregar votos do usuário atual
      await loadUserVotes()
      
      console.log("Participantes do jogo:", participants)
      setTotalPlayers(participants.length)
      
      console.log("Dados de votação recebidos:", { answers, results })
      console.log("Número de respostas:", answers.length)
      console.log("Número de resultados:", results.length)
      
      // Organizar respostas por categoria (agora com dados corretos)
      const answersByCategory: { [key: string]: PlayerAnswer[] } = {}
      answers.forEach(answer => {
        console.log("Processando resposta:", answer)
        const categoryName = answer.category_name || `Categoria ${answer.category_id}`
        if (!answersByCategory[categoryName]) {
          answersByCategory[categoryName] = []
        }
        answersByCategory[categoryName].push(answer)
      })
      
      console.log("Respostas organizadas por categoria:", answersByCategory)
      console.log("Categorias encontradas:", Object.keys(answersByCategory))

      // Organizar categorias pela posição (não alfabeticamente)
      const categoriesWithPosition = Object.keys(answersByCategory).map(categoryName => {
        const firstAnswer = answersByCategory[categoryName][0]
        return {
          name: categoryName,
          position: firstAnswer.position || 0
        }
      }).sort((a, b) => a.position - b.position)
      
      const categories = categoriesWithPosition.map(cat => cat.name)
      console.log("Categorias ordenadas por posição:", categories)
      let currentCategory = ""
      let categoryIndex = 0
      let votingComplete = true

      console.log("Categorias disponíveis:", categories)

      if (categories.length > 0) {
        // Usar a categoria baseada no índice atual
        const targetIndex = Math.min(currentCategoryIndex, categories.length - 1)
        currentCategory = categories[targetIndex]
        categoryIndex = targetIndex
        votingComplete = false
        
        console.log("Categoria selecionada:", currentCategory)
        console.log("Índice da categoria:", categoryIndex)
        console.log("Respostas para esta categoria:", answersByCategory[currentCategory])
      } else {
        console.log("Nenhuma categoria encontrada!")
      }

      const votingDataToSet = {
        answers: answersByCategory[currentCategory] || [],
        currentCategory,
        categoryIndex,
        totalCategories: categories.length,
        votingComplete
      }
      
      console.log("Definindo votingData:", votingDataToSet)
      console.log("Respostas para categoria atual:", answersByCategory[currentCategory])
      
      // Definir dados para a nova UI
      console.log("Definindo dados da UI:", {
        currentCategory,
        categoryIndex,
        totalCategories: categories.length,
        answersForCategory: answersByCategory[currentCategory] || []
      })
      
          setCurrentAnswers(answersByCategory[currentCategory] || [])
          setCurrentCategory(currentCategory)
          setTotalCategories(categories.length)
          console.log("🎯 Definindo currentCategoryIndex como:", categoryIndex, "para categoria:", currentCategory)
          setCurrentCategoryIndex(categoryIndex)
      
      setVotingData(votingDataToSet)

      if (votingComplete) {
        onVotingComplete()
      }
    } catch (error) {
      console.error("Erro ao buscar dados de votação:", error)
      toast.error("Erro ao carregar dados de votação")
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (answerId: number, isValid: boolean) => {
    if (!currentPlayerId) {
      console.log("❌ handleVote: currentPlayerId não definido")
      return
    }
    
    console.log("🗳️ Iniciando voto:", { answerId, isValid, playerId: currentPlayerId })
    
    try {
      setVoting(true)
      console.log("🗳️ Chamando voteOnAnswer...")
      await voteOnAnswer(answerId, currentPlayerId, isValid)
      console.log("🗳️ voteOnAnswer concluído com sucesso")
      
      // Atualizar estado local imediatamente para feedback visual
      setUserVotes(prev => ({
        ...prev,
        [answerId]: {
          ...prev[answerId],
          is_valid: isValid,
          is_duplicate: false
        }
      }))
      
      console.log("🗳️ Estado local atualizado:", { answerId, isValid })
      
      // Recarregar votos do usuário para manter consistência (em background)
      setTimeout(() => {
        loadUserVotes()
      }, 1000)
      
      // Marcar jogador como pronto para esta categoria
      console.log("🗳️ Marcando jogador como pronto...")
      await markPlayerReadyForNextCategory(gameId, currentPlayerId, currentCategoryIndex)
      setIsReadyForNext(true)
      console.log("🗳️ Jogador marcado como pronto")
      
      console.log("🗳️ Voto registrado com sucesso")
      
      // Verificar se todos votaram para avançar automaticamente
      console.log("🗳️ Verificando se todos estão prontos...")
      await checkAllPlayersReady()
      console.log("🗳️ Verificação de jogadores prontos concluída")
      
    } catch (error) {
      console.error("Erro ao votar:", error)
      toast.error("Erro ao registrar voto")
    } finally {
      setVoting(false)
    }
  }

  const handleMarkDuplicate = async (answerId: number) => {
    if (!currentPlayerId) {
      console.log("❌ handleMarkDuplicate: currentPlayerId não definido")
      return
    }
    
    console.log("📋 Iniciando marcação como duplicada:", { answerId, playerId: currentPlayerId })
    
    try {
      setVoting(true)
      console.log("📋 Chamando markAnswerAsDuplicate...")
      await markAnswerAsDuplicate(answerId, currentPlayerId)
      console.log("📋 markAnswerAsDuplicate concluído com sucesso")
      
      // Atualizar estado local imediatamente para feedback visual
      setUserVotes(prev => ({
        ...prev,
        [answerId]: {
          ...prev[answerId],
          is_valid: null,
          is_duplicate: true
        }
      }))
      
      console.log("📋 Estado local atualizado (duplicada):", { answerId, is_duplicate: true })
      
      // Recarregar votos do usuário para manter consistência (em background)
      setTimeout(() => {
        loadUserVotes()
      }, 1000)
      
      // Marcar jogador como pronto para esta categoria
      console.log("📋 Marcando jogador como pronto...")
      await markPlayerReadyForNextCategory(gameId, currentPlayerId, currentCategoryIndex)
      setIsReadyForNext(true)
      console.log("📋 Jogador marcado como pronto")
      
      console.log("📋 Resposta marcada como duplicada com sucesso")
      
      // Verificar se todos votaram para avançar automaticamente
      console.log("📋 Verificando se todos estão prontos...")
      await checkAllPlayersReady()
      console.log("📋 Verificação de jogadores prontos concluída")
      
      toast.success("Resposta marcada como duplicada (5 pontos)")
      
    } catch (error) {
      console.error("Erro ao marcar como duplicada:", error)
      toast.error("Erro ao marcar resposta como duplicada")
    } finally {
      setVoting(false)
    }
  }

  
  const calculateAndSaveScores = async () => {
    try {
      console.log("Calculando pontuações da rodada...")
      
      // Buscar todas as respostas da rodada com pontos já calculados
      const allAnswers = await getPlayerAnswers(roundId)
      console.log("Respostas encontradas:", allAnswers.length)
      
      if (allAnswers.length === 0) {
        console.log("Nenhuma resposta encontrada para calcular pontos")
        return
      }
      
      // Buscar participantes do jogo
      const participants = await getGameParticipants(gameId)
      console.log("Participantes:", participants.length)
      
      // Agrupar respostas por jogador e somar pontos
      const playerScores: { [playerId: string]: { totalPoints: number, validAnswers: number } } = {}
      
      for (const answer of allAnswers) {
        if (!playerScores[answer.player_id]) {
          playerScores[answer.player_id] = { totalPoints: 0, validAnswers: 0 }
        }
        
        // Usar os pontos já calculados pela API
        const points = answer.points || 0
        playerScores[answer.player_id].totalPoints += points
        
        if (answer.is_valid && points > 0) {
          playerScores[answer.player_id].validAnswers++
        }
      }
      
      // Calcular bônus por completar todas as categorias
      const totalCategories = new Set(allAnswers.map(a => a.category_id)).size
      
      // Salvar pontuações no banco
      for (const [playerId, score] of Object.entries(playerScores)) {
        const bonusPoints = score.validAnswers === totalCategories ? 5 : 0
        const finalScore = score.totalPoints + bonusPoints
        
        console.log(`Salvando pontos para jogador ${playerId}: ${score.totalPoints} + ${bonusPoints} bônus = ${finalScore} pts`)
        
        await saveRoundScore(
          roundId,
          parseInt(playerId),
          score.totalPoints,
          bonusPoints,
          1 // posição temporária
        )
        
        // Atualizar pontuação total do jogador
        const participant = participants.find(p => p.id === parseInt(playerId))
        if (participant) {
          const newTotalScore = participant.total_score + finalScore
          console.log(`Atualizando pontuação total do jogador ${participant.player_name}: ${participant.total_score} + ${finalScore} = ${newTotalScore}`)
          await updatePlayerScore(gameId, parseInt(playerId), newTotalScore)
        }
      }
      
      console.log("Pontuações calculadas e salvas com sucesso!")
      
    } catch (error) {
      console.error("Erro ao calcular pontuações:", error)
      toast.error("Erro ao calcular pontuações")
    }
  }

  const checkAllWordsVoted = async () => {
    try {
      // Verificar se todos os jogadores votaram em todas as palavras desta categoria
      const allAnswers = await getPlayerAnswers(roundId)
      console.log("🔍 Todas as respostas do round:", allAnswers)
      
      const categoryAnswers = allAnswers.filter(answer => 
        answer.category_name === currentCategory || answer.category_id === currentCategory
      )
      
      console.log("🔍 Verificando votos - Categoria atual:", currentCategory)
      console.log("🔍 Respostas da categoria atual:", categoryAnswers.length)
      console.log("🔍 Respostas encontradas:", categoryAnswers.map(a => ({ id: a.id, answer: a.answer, category_name: a.category_name })))
      console.log("🔍 Total de jogadores:", totalPlayers)
      
      if (categoryAnswers.length === 0) {
        console.log("❌ Nenhuma resposta encontrada para esta categoria")
        return false
      }
      
      // Verificar se todos os jogadores votaram em todas as palavras
      for (const answer of categoryAnswers) {
        console.log(`🔍 Verificando palavra ${answer.id} (${answer.answer})`)
        // Verificar se todos os jogadores votaram nesta palavra
        const allPlayersVoted = await checkAllPlayersVotedOnAnswer(answer.id)
        console.log(`🔍 Palavra ${answer.id}: todos votaram = ${allPlayersVoted}`)
        if (!allPlayersVoted) {
          console.log(`❌ Palavra ${answer.id} não foi votada por todos os jogadores`)
          return false
        }
      }
      
      console.log("✅ Todas as palavras foram votadas por todos os jogadores")
      return true
    } catch (error) {
      console.error("❌ Erro ao verificar se todas as palavras foram votadas:", error)
      return false
    }
  }

  const checkAllPlayersVotedOnAnswer = async (answerId: number) => {
    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'checkAllPlayersVotedOnAnswer', 
          params: { answerId, totalPlayers } 
        }),
      })
      
      const result = await response.json()
      return result.success ? result.data : false
    } catch (error) {
      console.error("Erro ao verificar votos na palavra:", error)
      return false
    }
  }

  const recalculateCategoryPoints = async () => {
    try {
      // Buscar a categoria atual
      const allAnswers = await getPlayerAnswers(roundId)
      const categoryAnswers = allAnswers.filter(answer => 
        answer.category_name === currentCategory || answer.category_id === currentCategory
      )
      
      if (categoryAnswers.length === 0) {
        console.log("Nenhuma resposta encontrada para recalcular")
        return
      }
      
      const categoryId = categoryAnswers[0].category_id
      
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'recalculateCategoryPoints', 
          params: { roundId, categoryId } 
        }),
      })
      
      const result = await response.json()
      if (result.success) {
        console.log("Pontos da categoria recalculados com sucesso")
        // Atualizar pontos dos jogadores em tempo real
        await updatePlayerScoresRealtime()
      } else {
        console.error("Erro ao recalcular pontos:", result.error)
      }
    } catch (error) {
      console.error("Erro ao recalcular pontos da categoria:", error)
    }
  }

  const updatePlayerScoresRealtime = async () => {
    try {
      // Buscar todos os participantes do jogo
      const participants = await getGameParticipants(gameId)
      
      // Para cada participante, calcular pontos totais
      for (const participant of participants) {
        const response = await fetch('/api/database', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            action: 'getPlayerTotalScore', 
            params: { gameId, playerId: participant.id } 
          }),
        })
        
        const result = await response.json()
        if (result.success) {
          const totalScore = result.data || 0
          console.log(`Atualizando pontuação do jogador ${participant.player_name}: ${totalScore} pts`)
          await updatePlayerScore(gameId, participant.id, totalScore)
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar pontuações em tempo real:", error)
    }
  }

  const checkAllPlayersReady = async () => {
    try {
      console.log("🚀 Iniciando verificação de jogadores prontos...")
      console.log("🚀 Parâmetros:", { gameId, currentCategoryIndex, totalPlayers })
      
      const readyPlayers = await getPlayersReadyForCategory(gameId, currentCategoryIndex)
      console.log("🚀 Jogadores prontos recebidos:", readyPlayers)
      
      setPlayersReady(readyPlayers)
      
      // Verificar se todos estão prontos
      const readyCount = readyPlayers.filter(player => player.is_ready === true).length
      const allReady = readyCount === totalPlayers && totalPlayers > 0
      
      console.log("🚀 Análise de jogadores prontos:")
      console.log("  - Jogadores prontos:", readyCount)
      console.log("  - Total de jogadores:", totalPlayers)
      console.log("  - Todos prontos:", allReady)
      console.log("  - Categoria atual:", currentCategoryIndex)
      
      // Verificar se todos votaram em todas as palavras desta categoria
      console.log("🚀 Verificando se todas as palavras foram votadas...")
      const allWordsVoted = await checkAllWordsVoted()
      
      console.log("🚀 Resultado final da verificação:")
      console.log("  - Todos prontos:", allReady)
      console.log("  - Todas as palavras votadas:", allWordsVoted)
      console.log("  - Pode avançar:", allReady && allWordsVoted)
      
      if (allReady && allWordsVoted) {
        console.log("🎉 CONDIÇÃO ATENDIDA! Todos votaram em todas as palavras! Recalculando pontos e avançando...")
        
        // Recalcular pontos da categoria atual baseado na maioria
        await recalculateCategoryPoints()
        
        // Parar verificação periódica imediatamente
        setIsReadyForNext(false)
        
        // Todos votaram, avançar para próxima categoria
        if (currentCategoryIndex < totalCategories - 1) {
          const nextIndex = currentCategoryIndex + 1
          console.log("Avançando para categoria:", nextIndex, "de", totalCategories)
          
          // Marcar como em transição para evitar conflitos
          setIsTransitioning(true)
          
          // Atualizar categoria
          console.log("Atualizando currentCategoryIndex de", currentCategoryIndex, "para", nextIndex)
          setCurrentCategoryIndex(nextIndex)
          
          // Aguardar mais tempo antes de recarregar para evitar conflitos
          setTimeout(() => {
            console.log("Recarregando dados para categoria:", nextIndex)
            console.log("Chamando fetchVotingData...")
            // Forçar a atualização imediata do currentCategoryIndex
            fetchVotingDataWithCategory(nextIndex)
          }, 1000)
        } else {
          console.log("🏁 Todas as categorias foram votadas!")
          // Todas as categorias foram votadas - calcular pontos
          await calculateAndSaveScores()
          onVotingComplete()
        }
      } else {
        console.log("⏳ Aguardando outros jogadores votarem em todas as palavras:", readyCount, "de", totalPlayers)
      }
    } catch (error) {
      console.error("Erro ao verificar jogadores prontos:", error)
      // Se houver erro de conexão, parar as tentativas
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.log("Servidor não está respondendo, parando verificação...")
        setIsReadyForNext(false)
        return
      }
    }
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--game-teal)]" />
                <p>Carregando votação...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!votingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <p>Erro ao carregar dados de votação</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-7xl mx-auto pt-20">
        <Card className="game-card">
          <CardHeader>
            <div className="text-center">
              <CardTitle className="text-3xl font-bold text-[var(--game-teal)] mb-2">
                Votação - Letra {letter}
              </CardTitle>
              <div className="flex items-center justify-center gap-4 mb-4">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Categoria {currentCategoryIndex + 1} de {totalCategories}
                </Badge>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {currentCategory}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {currentAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground">Nenhuma resposta encontrada para esta categoria.</p>
                </div>
              ) : (
                currentAnswers.map((answer) => {
                  console.log(`Renderizando resposta ${answer.id}:`, userVotes[answer.id])
                  return (
                  <Card 
                    key={answer.id} 
                    className={`border-2 transition-all duration-200 ${
                      userVotes[answer.id]?.is_valid === true 
                        ? 'border-green-500 bg-green-50 shadow-lg' 
                        : userVotes[answer.id]?.is_valid === false 
                        ? 'border-red-500 bg-red-50 shadow-lg' 
                        : userVotes[answer.id]?.is_duplicate === true
                        ? 'border-orange-500 bg-orange-50 shadow-lg'
                        : 'border-gray-300'
                    }`}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-[var(--game-teal)] text-white">
                              {getPlayerInitials(answer.player_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            {answer.answer && answer.answer.trim() && (
                              <h3 className="font-semibold text-lg">{answer.player_name}</h3>
                            )}
                            <p className={`text-2xl font-bold ${
                              userVotes[answer.id]?.is_valid === true 
                                ? 'text-green-600' 
                                : userVotes[answer.id]?.is_valid === false 
                                ? 'text-red-600' 
                                : userVotes[answer.id]?.is_duplicate === true
                                ? 'text-orange-600'
                                : 'text-[var(--game-pink)]'
                            }`}>
                              {answer.answer || "Sem resposta"}
                            </p>
                            {answer.is_duplicate && (
                              <div className="text-sm text-orange-600 font-medium flex items-center gap-1">
                                📋 Marcada como duplicada (5 pontos)
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Botões de ação */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={userVotes[answer.id]?.is_valid === true ? "default" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log("Clique CERTO - Estado atual:", userVotes[answer.id])
                                handleVote(answer.id, true)
                              }}
                              className={`transition-all duration-200 ${
                                userVotes[answer.id]?.is_valid === true 
                                  ? "bg-green-600 text-white border-green-600 shadow-lg scale-105" 
                                  : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                              }`}
                              disabled={voting}
                            >
                              ✓ CERTO
                            </Button>
                            <Button
                              size="sm"
                              variant={userVotes[answer.id]?.is_valid === false ? "destructive" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log("Clique ERRADO - Estado atual:", userVotes[answer.id])
                                handleVote(answer.id, false)
                              }}
                              className={`transition-all duration-200 ${
                                userVotes[answer.id]?.is_valid === false 
                                  ? "bg-red-600 text-white border-red-600 shadow-lg scale-105" 
                                  : "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                              }`}
                              disabled={voting}
                            >
                              ✗ ERRADO
                            </Button>
                            <Button
                              size="sm"
                              variant={userVotes[answer.id]?.is_duplicate === true ? "secondary" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log("Clique IGUAL - Estado atual:", userVotes[answer.id])
                                handleMarkDuplicate(answer.id)
                              }}
                              className={`transition-all duration-200 ${
                                userVotes[answer.id]?.is_duplicate === true 
                                  ? "bg-orange-600 text-white border-orange-600 shadow-lg scale-105" 
                                  : "bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100"
                              }`}
                              disabled={voting}
                            >
                              📋 IGUAL
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )
                })
              )}
            </div>
            
            {/* Status de Votação */}
            <div className="mt-8 text-center space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {currentCategoryIndex >= totalCategories - 1 
                    ? "Última categoria - vote nas respostas para finalizar"
                    : "Vote nas respostas para avançar para próxima categoria"
                  }
                </p>
                <div className="flex justify-center gap-2">
                  {playersReady.map((player, index) => (
                    <Badge 
                      key={player.player_id}
                      variant={player.is_ready ? "default" : "outline"}
                      className={player.is_ready ? "bg-green-600" : ""}
                    >
                      {player.player_name}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {playersReady.filter(p => p.is_ready).length} de {totalPlayers} jogadores votaram
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
