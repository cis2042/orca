import crypto from 'node:crypto'

export function verifySignature(body, signature, channelSecret) {
  if (!channelSecret) {
    return true
  }
  const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64')
  return hash === signature
}

export function stripAnsi(str) {
  if (!str) {
    return ''
  }
  const esc = String.fromCharCode(27)
  return str.replaceAll(new RegExp(`${esc}\\[[0-9;]*[a-zA-Z]`, 'g'), '')
}

export async function sendLineReply(channelAccessToken, replyToken, messages, logs = []) {
  logs.push({ replyToken, messages, timestamp: Date.now() })
  if (!channelAccessToken) {
    return { ok: true, mocked: true }
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({ replyToken, messages })
    })
    if (!res.ok) {
      const errText = await res.text()
      console.log(`[LINE Reply] 失敗 (${res.status}):`, errText)
    } else {
      console.log(`[LINE Reply] 成功送達 (${res.status})`)
    }
    return { ok: res.ok, status: res.status }
  } catch (e) {
    console.log('[LINE Reply] 連線異常:', e.message)
    return { ok: false, error: e.message }
  }
}

export async function sendLinePush(channelAccessToken, to, messages, logs = []) {
  logs.push({ to, messages, timestamp: Date.now() })
  if (!channelAccessToken) {
    return { ok: true, mocked: true }
  }
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({ to, messages })
    })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export function createGroupTicketManager(allowedGroups) {
  const groupTickets = new Map()

  function generateTicket(groupId) {
    const ticket = crypto.randomBytes(16).toString('hex')
    groupTickets.set(ticket, {
      groupId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    })
    return ticket
  }

  function validateTicket(ticket) {
    if (!ticket) {
      return false
    }
    const record = groupTickets.get(ticket)
    if (!record) {
      return false
    }
    if (Date.now() > record.expiresAt) {
      groupTickets.delete(ticket)
      return false
    }
    if (allowedGroups.size > 0 && record.groupId && !allowedGroups.has(record.groupId)) {
      return false
    }
    return true
  }

  return { generateTicket, validateTicket }
}

export function createDefaultContentFetcher(channelAccessToken, customFetcher) {
  if (customFetcher) {
    return customFetcher
  }
  return async (messageId) => {
    if (!channelAccessToken) {
      return Buffer.from('')
    }
    try {
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
        headers: { Authorization: `Bearer ${channelAccessToken}` }
      })
      if (!res.ok) {
        return Buffer.from('')
      }
      const arr = await res.arrayBuffer()
      return Buffer.from(arr)
    } catch {
      return Buffer.from('')
    }
  }
}
