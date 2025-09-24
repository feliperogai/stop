"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle, XCircle, Users, Clock, ThumbsUp, ThumbsDown } from "lucide-react"
import { getGameParticipants, getPlayerAnswers, voteOnAnswer, getVotingResults, markPlayerReadyForNextCategory, getPlayersReadyForCategory } from "@/lib/api-client"
import { getUserSession } from "@/lib/session"
import { toast } from "sonner"

interface VotingScreenProps {
  gameId: number
  roundId: number
  letter: string
  onVotingComplete: () => void
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
  const [currentAnswers, setCurrentAnswers] = useState<Answer[]>([])
  const [currentCategory, setCurrentCategory] = useState("")
  const [totalCategories, setTotalCategories] = useState(0)
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [playerVotes, setPlayerVotes] = useState<{ [answerId: number]: boolean }>({})
  const [playersReady, setPlayersReady] = useState<any[]>([])
  const [totalPlayers, setTotalPlayers] = useState(0)
  const [isReadyForNext, setIsReadyForNext] = useState(false)

  useEffect(() => {
    const session = getUserSession()
    if (session) {
      setCurrentPlayerId(session.playerId)
    }
    fetchVotingData()
  }, [gameId, roundId])

  // Verificar se todos já estão prontos quando os dados carregam (apenas uma vez)
  useEffect(() => {
    if (totalPlayers > 0 && currentCategoryIndex >= 0 && !isReadyForNext) {
      console.log("🔍 Verificando se todos já estão prontos na categoria:", currentCategoryIndex)
      // Verificar uma única vez quando os dados carregam
      const timeout = setTimeout(() => {
        checkAllPlayersReady()
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [totalPlayers, currentCategoryIndex])

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
        votingComplete = true
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

  const fetchVotingData = async () => {
    try {
      setLoading(true)
      console.log("🔄 fetchVotingData chamado para roundId:", roundId, "categoria:", currentCategoryIndex)
      
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
        votingComplete = true
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
    if (!currentPlayerId) return
    
    console.log("Votando:", { answerId, isValid, playerId: currentPlayerId })
    
    try {
      setVoting(true)
      await voteOnAnswer(answerId, currentPlayerId, isValid)
      
      // Atualizar votos locais
      setPlayerVotes(prev => ({
        ...prev,
        [answerId]: isValid
      }))
      
      // Atualizar respostas locais para mostrar a cor
      setCurrentAnswers(prev => 
        prev.map(answer => 
          answer.id === answerId 
            ? { ...answer, is_valid: isValid }
            : answer
        )
      )
      
      console.log("Voto registrado com sucesso")
      
    } catch (error) {
      console.error("Erro ao votar:", error)
      toast.error("Erro ao registrar voto")
    } finally {
      setVoting(false)
    }
  }

  const handleNextCategory = async () => {
    if (!currentPlayerId) return
    
    console.log("Avançando categoria:", { 
      currentCategoryIndex, 
      totalCategories, 
      playerId: currentPlayerId 
    })
    
    try {
      // Marcar jogador como pronto para próxima categoria
      await markPlayerReadyForNextCategory(gameId, currentPlayerId, currentCategoryIndex)
      setIsReadyForNext(true)
      
      console.log("Jogador marcado como pronto para categoria:", currentCategoryIndex)
      
      // Verificar se todos estão prontos
      const readyPlayers = await getPlayersReadyForCategory(gameId, currentCategoryIndex)
      const readyCount = readyPlayers.filter(player => player.is_ready === true).length
      const allReady = readyCount === totalPlayers && totalPlayers > 0
      
      console.log("Jogadores prontos:", readyCount, "de", totalPlayers, "Todos prontos:", allReady)
      console.log("currentCategoryIndex:", currentCategoryIndex, "totalCategories:", totalCategories)
      
      if (allReady) {
        console.log("🎉 Todos estão prontos! Avançando categoria...")
        
        // Parar verificação periódica imediatamente
        setIsReadyForNext(false)
        
        // Todos estão prontos, avançar para próxima categoria
        if (currentCategoryIndex < totalCategories - 1) {
          const nextIndex = currentCategoryIndex + 1
          console.log("Avançando para categoria:", nextIndex, "de", totalCategories)
          
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
          // Todas as categorias foram votadas
          onVotingComplete()
        }
      } else {
        console.log("⏳ Ainda aguardando outros jogadores:", readyCount, "de", totalPlayers)
        // Aguardar um pouco antes de verificar para evitar conflitos
        setTimeout(() => {
          checkAllPlayersReady()
        }, 1000)
      }
      
    } catch (error) {
      console.error("Erro ao marcar como pronto:", error)
      toast.error("Erro ao avançar categoria")
    }
  }
  
  const checkAllPlayersReady = async () => {
    try {
      const readyPlayers = await getPlayersReadyForCategory(gameId, currentCategoryIndex)
      console.log("Jogadores prontos:", readyPlayers)
      console.log("Total de jogadores:", totalPlayers)
      console.log("Categoria atual:", currentCategoryIndex)
      
      setPlayersReady(readyPlayers)
      
      // Verificar se todos estão prontos
      const readyCount = readyPlayers.filter(player => player.is_ready === true).length
      const allReady = readyCount === totalPlayers && totalPlayers > 0
      
      console.log("Jogadores prontos:", readyCount, "de", totalPlayers, "Todos prontos:", allReady)
      
      // NÃO avançar automaticamente - apenas mostrar status
      if (allReady) {
        console.log("🎉 Todos estão prontos! Aguardando clique em 'Continuar'...")
        // Parar verificação periódica imediatamente
        setIsReadyForNext(false)
      } else {
        console.log("⏳ Ainda aguardando jogadores:", readyCount, "de", totalPlayers)
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
              <p className="text-muted-foreground">
                Clique nas respostas para votar como inválidas (vermelho). Clique em Continuar para avançar.
              </p>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {currentAnswers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground">Nenhuma resposta encontrada para esta categoria.</p>
                </div>
              ) : (
                currentAnswers.map((answer) => (
                  <Card 
                    key={answer.id} 
                    className={`border-2 cursor-pointer transition-all duration-200 ${
                      answer.is_valid === true 
                        ? 'border-green-500 bg-green-50' 
                        : answer.is_valid === false 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300 hover:border-[var(--game-teal)]'
                    }`}
                    onClick={() => {
                      if (answer.is_valid === null) {
                        // Se ainda não foi votado, votar como inválido (vermelho)
                        handleVote(answer.id, false)
                      }
                    }}
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
                            <h3 className="font-semibold text-lg">{answer.player_name}</h3>
                            <p className={`text-2xl font-bold ${
                              answer.is_valid === true 
                                ? 'text-green-600' 
                                : answer.is_valid === false 
                                ? 'text-red-600' 
                                : 'text-[var(--game-pink)]'
                            }`}>
                              {answer.answer}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Mostrar votos atuais */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium">{answer.votes_for}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsDown className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-medium">{answer.votes_against}</span>
                            </div>
                          </div>
                          
                          {/* Status do voto */}
                          {answer.is_valid === null ? (
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              Clique para votar
                            </Badge>
                          ) : answer.is_valid ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Válido
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              <XCircle className="w-4 h-4 mr-1" />
                              Inválido
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Botão Continuar e Status */}
            <div className="mt-8 text-center space-y-4">
              {isReadyForNext ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Aguardando outros jogadores clicarem em "Continuar"...
                  </p>
                  <div className="flex justify-center gap-2">
                    {playersReady.map((player, index) => (
                      <Badge 
                        key={index}
                        variant={player.is_ready ? "default" : "outline"}
                        className={player.is_ready ? "bg-green-600" : ""}
                      >
                        {player.player_name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {playersReady.filter(p => p.is_ready).length} de {totalPlayers} jogadores prontos
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleNextCategory}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  Continuar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
