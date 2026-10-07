const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-admin-token'
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'test-verify-token'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(baseUrl, { method, path, body, headers = {}, raw = false }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (raw) {
    return {
      status: response.status,
      text: await response.text(),
    }
  }

  return {
    status: response.status,
    json: await response.json(),
  }
}

function buildInboundPayload({
  from = '923001122334',
  text = 'Hello, I need WhatsApp CRM pricing. Budget $8000.',
  messageId = `wamid.test.${Date.now()}`,
  name = 'Hassan Raza',
} = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550001111',
                phone_number_id: 'PHONE_NUMBER_ID',
              },
              contacts: [
                {
                  profile: { name },
                  wa_id: from,
                },
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp: `${Math.floor(Date.now() / 1000)}`,
                  text: { body: text },
                  type: 'text',
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

async function run() {
  // Set env BEFORE importing app/env modules.
  process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'mock'
  process.env.WHATSAPP_MOCK = 'true'
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN
  process.env.WHATSAPP_WEBHOOK_SYNC = 'true'

  const { default: app } = await import('../src/app.js')

  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const passed = []

  try {
    const verifyFail = await request(baseUrl, {
      method: 'GET',
      path: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123`,
      raw: true,
    })
    assert(verifyFail.status === 403, 'Invalid verify token should fail')
    passed.push('GET /api/whatsapp/webhook rejects bad token')

    const verifyOk = await request(baseUrl, {
      method: 'GET',
      path: `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=challenge-token-99`,
      raw: true,
    })
    assert(verifyOk.status === 200, 'Webhook verification failed')
    assert(verifyOk.text === 'challenge-token-99', 'Challenge mismatch')
    passed.push('GET /api/whatsapp/webhook verification')

    const inboundId = `wamid.test.inbound.${Date.now()}`
    const inbound = await request(baseUrl, {
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: { 'x-webhook-sync': 'true' },
      body: buildInboundPayload({ messageId: inboundId }),
    })
    assert(inbound.status === 200, `Inbound webhook failed: ${inbound.json?.message}`)
    assert(inbound.json.success === true, 'Inbound webhook success=false')
    assert(inbound.json.data.processedMessages === 1, 'Expected 1 processed message')
    const messageResult = inbound.json.data.results.find((item) => item.type === 'message')
    assert(messageResult?.outboundMessageId, 'AI outbound message missing')
    assert(messageResult?.whatsappMessageId, 'WhatsApp message id missing')
    passed.push('POST /api/whatsapp/webhook inbound + AI reply')

    const duplicate = await request(baseUrl, {
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: { 'x-webhook-sync': 'true' },
      body: buildInboundPayload({ messageId: inboundId }),
    })
    assert(duplicate.status === 200, 'Duplicate webhook failed')
    const dupResult = duplicate.json.data.results.find((item) => item.type === 'message')
    assert(dupResult?.duplicate === true, 'Duplicate inbound not detected')
    passed.push('Duplicate inbound ignored')

    const statusId = messageResult.whatsappMessageId
    const statusWebhook = await request(baseUrl, {
      method: 'POST',
      path: '/api/whatsapp/webhook',
      headers: { 'x-webhook-sync': 'true' },
      body: {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15550001111',
                    phone_number_id: 'PHONE_NUMBER_ID',
                  },
                  statuses: [
                    {
                      id: statusId,
                      status: 'delivered',
                      timestamp: `${Math.floor(Date.now() / 1000)}`,
                      recipient_id: '923001122334',
                    },
                    {
                      id: statusId,
                      status: 'read',
                      timestamp: `${Math.floor(Date.now() / 1000) + 1}`,
                      recipient_id: '923001122334',
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    })
    assert(statusWebhook.status === 200, 'Status webhook failed')
    assert(statusWebhook.json.data.processedStatuses === 2, 'Expected 2 status events')
    passed.push('Delivery/read status handling')

    const send = await request(baseUrl, {
      method: 'POST',
      path: '/api/whatsapp/send',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: {
        conversation_id: messageResult.conversationId,
        to: '+923001122334',
        message: 'Manual agent follow-up from API test',
      },
    })
    assert(send.status === 201, `Send API failed: ${send.json?.message}`)
    assert(send.json.data.whatsapp_message_id, 'Send API missing wamid')
    assert(send.json.data.mock === true, 'Expected mock send in test mode')
    passed.push('POST /api/whatsapp/send')

    const unauthorized = await request(baseUrl, {
      method: 'POST',
      path: '/api/whatsapp/send',
      body: {
        to: '+923001122334',
        message: 'should fail',
      },
    })
    assert(unauthorized.status === 401, 'Send should require auth')
    passed.push('Send endpoint auth guard')

    console.log('\nWhatsApp integration test suite passed\n')
    for (const item of passed) console.log(`✔ ${item}`)
  } catch (error) {
    console.error('\nWhatsApp integration test suite failed')
    console.error(error.message)
    console.error('Passed before failure:', passed)
    process.exitCode = 1
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

run()
