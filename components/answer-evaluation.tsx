"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  CheckCircle, 
  XCircle, 
  Users, 
  Clock, 
  Trophy,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import { 
  getRoundAnswers,
  getGameParticipants,
  getGameCategories,
  getGameStats,
  evaluateAnswer,
  getAnswerEvaluations,
  saveRoundScore,
  updatePlayerScore
} from "@/lib/api-client"
import { calculateRoundScores } from "@/lib/scoring"
import { toast } from "sonner"

interface AnswerEvaluationProps {
  gameId: number
  roundId: number
  playerId: number
  playerName: string
  currentLetter: string
  onEvaluationComplete: () => void
}

interface PlayerAnswer {
  id: number
  player_id: number
  category_id: number
  answer: string
  submitted_at: string
}

interface Category {
  id: number
  name: string
  position: number
}

interface Participant {
  id: number
  player_name: string
  total_score: number
}

interface Evaluation {
  id: number
  evaluator_player_id: number
  is_valid: boolean
  evaluation_reason?: string
}

export function AnswerEvaluation({ 
  gameId, 
  roundId, 
  playerId, 
  playerName, 
  currentLetter,
  onEvaluationComplete 
}: AnswerEvaluationProps) {
  const [answers, setAnswers] = useState<PlayerAnswer[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [evaluations, setEvaluations] = useState<{ [answerId: number]: Evaluation[] }>({})
  const [currentEvaluations, setCurrentEvaluations] = useState<{ [answerId: number]: boolean }>({})
  const [evaluationReasons, setEvaluationReasons] = useState<{ [answerId: number]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const [answersData, categoriesData, participantsData] = await Promise.all([
        getRoundAnswers(roundId),
        getGameCategories(gameId),
        getGameParticipants(gameId)
      ])

      setAnswers(answersData)
      setCategories(categoriesData.sort((a, b) => a.position - b.position))
      setParticipants(participantsData)

      // Buscar avaliações existentes
      const evaluationsMap: { [answerId: number]: Evaluation[] } = {}
      for (const answer of answersData) {
        const answerEvaluations = await getAnswerEvaluations(answer.id)
        evaluationsMap[answer.id] = answerEvaluations
      }
      setEvaluations(evaluationsMap)

      setIsLoading(false)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      toast.error("Erro ao carregar dados de avaliação")
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [roundId, gameId])

  const handleEvaluation = (answerId: number, isValid: boolean) => {
    setCurrentEvaluations(prev => ({
      ...prev,
      [answerId]: isValid
    }))
  }

  const handleReasonChange = (answerId: number, reason: string) => {
    setEvaluationReasons(prev => ({
      ...prev,
      [answerId]: reason
    }))
  }

  const submitEvaluations = async () => {
    setIsSubmitting(true)
    try {
      // Submeter todas as avaliações
      for (const [answerId, isValid] of Object.entries(currentEvaluations)) {
        if (isValid !== undefined) {
          await evaluateAnswer(
            parseInt(answerId),
            playerId,
            isValid,
            evaluationReasons[parseInt(answerId)] || undefined
          )
        }
      }

      // Verificar se todos os jogadores avaliaram
      const allEvaluated = await checkAllPlayersEvaluated()
      if (allEvaluated) {
        await calculateAndSaveScores()
        toast.success("Avaliação concluída! Calculando pontuações...")
        onEvaluationComplete()
      } else {
        toast.success("Suas avaliações foram salvas!")
      }
    } catch (error) {
      console.error("Erro ao submeter avaliações:", error)
      toast.error("Erro ao submeter avaliações")
    } finally {
      setIsSubmitting(false)
    }
  }

  const checkAllPlayersEvaluated = async (): Promise<boolean> => {
    // Esta função verificaria se todos os jogadores avaliaram todas as respostas
    // Por simplicidade, vamos assumir que sim após um tempo
    return true
  }

  const calculateAndSaveScores = async () => {
    try {
      // Agrupar respostas por jogador
      const playersAnswers: { [playerId: string]: { [categoryId: string]: string } } = {}
      
      for (const answer of answers) {
        if (!playersAnswers[answer.player_id]) {
          playersAnswers[answer.player_id] = {}
        }
        playersAnswers[answer.player_id][answer.category_id] = answer.answer
      }

      // Calcular pontuações usando a lógica existente
      const results = calculateRoundScores(playersAnswers, categories, currentLetter)

      // Salvar pontuações no banco
      for (const result of results) {
        await saveRoundScore(
          roundId,
          parseInt(result.playerId),
          result.totalPoints,
          result.bonusPoints,
          results.indexOf(result) + 1
        )

        // Atualizar pontuação total do jogador
        const participant = participants.find(p => p.id === parseInt(result.playerId))
        if (participant) {
          await updatePlayerScore(gameId, parseInt(result.playerId), participant.total_score + result.finalScore)
        }
      }
    } catch (error) {
      console.error("Erro ao calcular pontuações:", error)
    }
  }

  const getPlayerName = (playerId: number) => {
    return participants.find(p => p.id === playerId)?.player_name || `Jogador ${playerId}`
  }

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || `Categoria ${categoryId}`
  }

  const getPlayerInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const isAnswerEvaluated = (answerId: number) => {
    return evaluations[answerId]?.some(e => e.evaluator_player_id === playerId) || false
  }

  const getAnswerEvaluationCount = (answerId: number) => {
    return evaluations[answerId]?.length || 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-7xl mx-auto pt-20">
          <Card className="game-card">
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[var(--game-teal)]" />
                <p>Carregando avaliação...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="game-card mb-6">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Avaliação de Respostas
            </CardTitle>
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-3 py-1">
                Letra: {currentLetter}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Instruções */}
        <Card className="game-card mb-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-yellow-500" />
              <h3 className="text-lg font-semibold">Avalie as respostas dos outros jogadores</h3>
              <p className="text-muted-foreground">
                Marque como válida (✓) se a resposta começa com a letra "{currentLetter}" e é apropriada para a categoria.
                Marque como inválida (✗) caso contrário.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Respostas para Avaliar */}
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryAnswers = answers.filter(a => a.category_id === category.id)
            
            return (
              <Card key={category.id} className="game-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-[var(--game-pink)] shadow-lg" />
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      {category.position}
                    </Badge>
                    <span>{category.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryAnswers.map((answer) => {
                      const isEvaluated = isAnswerEvaluated(answer.id)
                      const evaluationCount = getAnswerEvaluationCount(answer.id)
                      const isCurrentPlayer = answer.player_id === playerId
                      
                      return (
                        <div
                          key={answer.id}
                          className={`p-4 rounded-lg border ${
                            isCurrentPlayer ? 'bg-[var(--game-pink)]/10 border-[var(--game-pink)]' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-[var(--game-pink)] text-white">
                                {getPlayerInitials(getPlayerName(answer.player_id))}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">
                                  {getPlayerName(answer.player_id)}
                                </span>
                                {isCurrentPlayer && (
                                  <Badge variant="secondary" className="text-xs">Você</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {evaluationCount} avaliações
                                </Badge>
                              </div>
                              
                              <div className="text-lg font-medium mb-3">
                                "{answer.answer}"
                              </div>
                              
                              {!isCurrentPlayer && !isEvaluated && (
                                <div className="space-y-3">
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant={currentEvaluations[answer.id] === true ? "default" : "outline"}
                                      onClick={() => handleEvaluation(answer.id, true)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Válida
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={currentEvaluations[answer.id] === false ? "destructive" : "outline"}
                                      onClick={() => handleEvaluation(answer.id, false)}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Inválida
                                    </Button>
                                  </div>
                                  
                                  <Textarea
                                    placeholder="Motivo da avaliação (opcional)"
                                    value={evaluationReasons[answer.id] || ""}
                                    onChange={(e) => handleReasonChange(answer.id, e.target.value)}
                                    className="text-sm"
                                    rows={2}
                                  />
                                </div>
                              )}
                              
                              {isEvaluated && (
                                <div className="text-sm text-muted-foreground">
                                  ✓ Você já avaliou esta resposta
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Botão de Submissão */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <Button
                onClick={submitEvaluations}
                disabled={isSubmitting || Object.keys(currentEvaluations).length === 0}
                size="lg"
                className="bg-[var(--game-teal)] hover:bg-[var(--game-teal)]/80 text-white px-8 py-3 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Submetendo...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Submeter Avaliações
                  </>
                )}
              </Button>
              
              {Object.keys(currentEvaluations).length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Avalie pelo menos uma resposta para continuar
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
