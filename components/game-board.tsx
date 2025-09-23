"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Category {
  id: string
  name: string
  color: string
}

interface GameBoardProps {
  categories: Category[]
  currentLetter: string
  isPlaying: boolean
  isPaused: boolean
  playerAnswers: { [categoryId: string]: string }
  onAnswerChange: (categoryId: string, value: string) => void
}

export function GameBoard({
  categories,
  currentLetter,
  isPlaying,
  isPaused,
  playerAnswers,
  onAnswerChange,
}: GameBoardProps) {
  return (
    <Card className="game-card mb-8">
      <CardHeader>
        <CardTitle className="text-2xl text-center text-balance">
          {currentLetter ? (
            <>
              Palavras com a letra{" "}
              <span className="text-primary text-4xl bg-primary/10 px-4 py-2 rounded-full border-2 border-primary">
                {currentLetter}
              </span>
            </>
          ) : (
            "Aguardando início do jogo..."
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full ${category.color} shadow-lg`} />
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {index + 1}
                </Badge>
                <label className="font-semibold text-lg text-foreground">{category.name}</label>
              </div>
              <Input
                placeholder={
                  currentLetter ? `${category.name} com ${currentLetter}...` : "Aguardando início do jogo..."
                }
                value={playerAnswers[category.id] || ""}
                onChange={(e) => onAnswerChange(category.id, e.target.value)}
                disabled={!isPlaying || isPaused}
                className="category-input text-lg h-12 focus:scale-105 transition-transform duration-200"
              />
              {playerAnswers[category.id] && (
                <div className="text-sm text-muted-foreground pl-2">{playerAnswers[category.id].length} caracteres</div>
              )}
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progresso das respostas:</span>
            <span>
              {Object.values(playerAnswers).filter(Boolean).length} / {categories.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-[var(--game-pink)] to-[var(--game-teal)] h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(Object.values(playerAnswers).filter(Boolean).length / categories.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
