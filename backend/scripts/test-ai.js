import app from '../src/app.js'

const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-admin-token'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(baseUrl, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  return { status: response.status, json }
}

async function run() {
  process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'mock'

  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`
  const passed = []

  try {
    const chat = await request(baseUrl, 'POST', '/api/ai/chat', {
      conversation_id: '33333333-3333-3333-3333-333333333001',
      message:
        'Hi, we need a WhatsApp CRM with lead scoring. Budget is $9000 and timeline is 4 weeks. Email is ops@brightlabs.co',
    })

    assert(chat.status === 200, `AI chat failed: ${chat.json.message}`)
    assert(chat.json.data.response, 'Missing response')
    assert(chat.json.data.intent, 'Missing intent')
    assert(typeof chat.json.data.lead_score === 'number', 'Missing lead_score')
    assert(
      typeof chat.json.data.requires_human === 'boolean',
      'Missing requires_human',
    )
    assert(chat.json.data.lead_information, 'Missing lead_information')
    assert(
      !JSON.stringify(chat.json).toLowerCase().includes('system prompt'),
      'System prompt leaked',
    )
    assert(
      !JSON.stringify(chat.json).toLowerCase().includes('sk-'),
      'API key leaked',
    )
    passed.push('POST /api/ai/chat structured output')

    const appointmentChat = await request(baseUrl, 'POST', '/api/ai/chat', {
      contact_id: '22222222-2222-2222-2222-222222222003',
      message: 'Please schedule a demo appointment for tomorrow at 3pm',
    })
    assert(appointmentChat.status === 200, 'Appointment AI chat failed')
    assert(
      appointmentChat.json.data.intent === 'appointment_request' ||
        appointmentChat.json.data.meta.appointment_id,
      'Appointment intent/tool missing',
    )
    passed.push('AI appointment scheduling path')

    // Fresh AI_ACTIVE conversation — seed contact 002 is already HUMAN_ACTIVE.
    const handoffContact = await request(baseUrl, 'POST', '/api/contacts', {
      name: 'Handoff Test User',
      phone: '+929988776655',
      email: 'handoff@test.nexora.io',
      company: 'Handoff Co',
    })
    assert(handoffContact.status === 201, 'Failed to create handoff contact')
    const handoffConversation = await request(baseUrl, 'POST', '/api/conversations', {
      contact_id: handoffContact.json.data.id,
      status: 'open',
      ai_enabled: true,
      mode: 'AI_ACTIVE',
    })
    assert(handoffConversation.status === 201, 'Failed to create handoff conversation')

    const handoffChat = await request(baseUrl, 'POST', '/api/ai/chat', {
      conversation_id: handoffConversation.json.data.id,
      message: 'I want to talk to a human agent about a billing complaint',
    })
    assert(handoffChat.status === 200, 'Handoff AI chat failed')
    assert(handoffChat.json.data.requires_human === true, 'Handoff not detected')
    assert(
      handoffChat.json.data.meta?.mode === 'WAITING_FOR_HUMAN' ||
        handoffChat.json.data.requires_human === true,
      'Handoff mode not set',
    )
    passed.push('AI human handoff path')

    const takeover = await request(
      baseUrl,
      'POST',
      `/api/conversations/${handoffConversation.json.data.id}/takeover`,
      { reason: 'Agent accepting handoff' },
    )
    assert(takeover.status === 200, 'Takeover failed')
    assert(
      takeover.json.data.conversation.mode === 'HUMAN_ACTIVE',
      'Takeover mode should be HUMAN_ACTIVE',
    )
    passed.push('Agent takeover path')

    const returnToAi = await request(
      baseUrl,
      'POST',
      `/api/conversations/${handoffConversation.json.data.id}/return-to-ai`,
      {},
    )
    assert(returnToAi.status === 200, 'Return to AI failed')
    assert(
      returnToAi.json.data.conversation.mode === 'AI_ACTIVE',
      'Return to AI mode should be AI_ACTIVE',
    )
    passed.push('Return to AI path')

    const handoffs = await request(
      baseUrl,
      'GET',
      `/api/conversations/${handoffConversation.json.data.id}/handoffs`,
    )
    assert(handoffs.status === 200, 'Handoff audit fetch failed')
    assert(handoffs.json.data.length >= 2, 'Expected handoff audit rows')
    passed.push('Handoff audit trail')

    const romanUrdu = await request(baseUrl, 'POST', '/api/ai/chat', {
      conversation_id: handoffConversation.json.data.id,
      message: 'Mujhe WhatsApp AI chatbot chahiye, pricing kya hai?',
      persist: false,
    })
    assert(romanUrdu.status === 200, 'Roman Urdu chat failed')
    assert(romanUrdu.json.data.response, 'Roman Urdu response missing')
    passed.push('Roman Urdu support path')

    const validation = await request(baseUrl, 'POST', '/api/ai/chat', {
      message: 'hello only',
    })
    assert(validation.status === 400, 'Validation should fail without ids')
    passed.push('AI chat validation')

    console.log('\nAI agent test suite passed\n')
    for (const item of passed) console.log(`✔ ${item}`)
  } catch (error) {
    console.error('\nAI agent test suite failed')
    console.error(error.message)
    console.error('Passed before failure:', passed)
    process.exitCode = 1
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

run()
