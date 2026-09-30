/**
 * [OAGENT A2A WORK-PKG #801]
 * Interface Definition: Distributed Token Bucket Protocol
 * Model: Claude 3.7 Sonnet & GPT-4.5 Ultra
 */

export type TokenBucketConfig = {
  readonly capacity: number
  readonly refillRatePerSecond: number
  readonly initialTokens?: number
}

export type ConsumptionResult = {
  readonly accepted: boolean
  readonly remainingTokens: number
  readonly retryAfterMs?: number
  readonly nodeSignature: string
}

export class DistributedTokenBucket {
  private tokens: number
  private lastRefill: number

  constructor(private readonly config: TokenBucketConfig) {
    if (config.capacity <= 0 || config.refillRatePerSecond <= 0) {
      throw new Error('Capacity and refill rate must be strictly positive.')
    }
    this.tokens = config.initialTokens ?? config.capacity
    this.lastRefill = Date.now()
  }

  public consume(tokens: number = 1): ConsumptionResult {
    if (tokens <= 0) {
      return { accepted: false, remainingTokens: this.tokens, nodeSignature: 'SIG_INVALID_COST' }
    }
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.config.capacity,
      this.tokens + elapsed * this.config.refillRatePerSecond
    )
    this.lastRefill = now

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return {
        accepted: true,
        remainingTokens: Math.floor(this.tokens),
        nodeSignature: `SIG_ACCEPTED_${Math.random().toString(36).substring(2, 9)}`
      }
    }

    const deficit = tokens - this.tokens
    return {
      accepted: false,
      remainingTokens: this.tokens,
      retryAfterMs: Math.ceil((deficit / this.config.refillRatePerSecond) * 1000),
      nodeSignature: 'SIG_RATE_EXCEEDED'
    }
  }
}
