"use client"

import { useState, useEffect, useCallback } from "react"

interface UseTimerProps {
  initialTime: number
  onTimeUp?: () => void
  onTick?: (timeLeft: number) => void
}

interface UseTimerReturn {
  timeLeft: number
  isRunning: boolean
  isPaused: boolean
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: (newTime?: number) => void
  setTime: (time: number) => void
}

export function useTimer({ initialTime, onTimeUp, onTick }: UseTimerProps): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(initialTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const start = useCallback(() => {
    setIsRunning(true)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
    setIsPaused(false)
  }, [])

  const reset = useCallback(
    (newTime?: number) => {
      setTimeLeft(newTime ?? initialTime)
      setIsRunning(false)
      setIsPaused(false)
    },
    [initialTime],
  )

  const setTime = useCallback((time: number) => {
    setTimeLeft(time)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1
          onTick?.(newTime)
          return newTime
        })
      }, 1000)
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      setIsPaused(false)
      onTimeUp?.()
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isRunning, isPaused, timeLeft, onTimeUp, onTick])

  return {
    timeLeft,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    stop,
    reset,
    setTime,
  }
}
