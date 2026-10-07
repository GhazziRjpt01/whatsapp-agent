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
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  const results = []

  try {
    const health = await request(baseUrl, 'GET', '/api/health')
    assert(health.status === 200 && health.json.success, 'GET /api/health failed')
    results.push('GET /api/health')

    const unauthorized = await fetch(`${baseUrl}/api/contacts`)
    assert(unauthorized.status === 401, 'Unauthenticated request should be 401')
    results.push('Auth guard')

    const me = await request(baseUrl, 'GET', '/api/auth/me')
    assert(me.status === 200 && me.json.data?.email, 'GET /api/auth/me failed')
    results.push('GET /api/auth/me')

    const meUnauthorized = await fetch(`${baseUrl}/api/auth/me`)
    assert(meUnauthorized.status === 401, '/api/auth/me should require auth')
    results.push('Auth me guard')

    const contacts = await request(baseUrl, 'GET', '/api/contacts')
    assert(contacts.status === 200, 'GET /api/contacts failed')
    results.push('GET /api/contacts')

    const createdContact = await request(baseUrl, 'POST', '/api/contacts', {
      name: 'Test Contact',
      phone: '+929900011122',
      email: 'test.contact@example.com',
      company: 'Test Co',
    })
    assert(createdContact.status === 201, 'POST /api/contacts failed')
    const contactId = createdContact.json.data.id
    results.push('POST /api/contacts')

    const contactById = await request(baseUrl, 'GET', `/api/contacts/${contactId}`)
    assert(contactById.status === 200, 'GET /api/contacts/:id failed')
    results.push('GET /api/contacts/:id')

    const updatedContact = await request(
      baseUrl,
      'PUT',
      `/api/contacts/${contactId}`,
      { company: 'Updated Co' },
    )
    assert(
      updatedContact.status === 200 &&
        updatedContact.json.data.company === 'Updated Co',
      'PUT /api/contacts/:id failed',
    )
    results.push('PUT /api/contacts/:id')

    const conversations = await request(baseUrl, 'GET', '/api/conversations')
    assert(conversations.status === 200, 'GET /api/conversations failed')
    results.push('GET /api/conversations')

    const createdConversation = await request(
      baseUrl,
      'POST',
      '/api/conversations',
      { contact_id: contactId, status: 'open', ai_enabled: true },
    )
    assert(createdConversation.status === 201, 'POST /api/conversations failed')
    const conversationId = createdConversation.json.data.id
    results.push('POST /api/conversations')

    const conversationById = await request(
      baseUrl,
      'GET',
      `/api/conversations/${conversationId}`,
    )
    assert(conversationById.status === 200, 'GET /api/conversations/:id failed')
    results.push('GET /api/conversations/:id')

    const updatedConversation = await request(
      baseUrl,
      'PUT',
      `/api/conversations/${conversationId}`,
      { status: 'pending' },
    )
    assert(updatedConversation.status === 200, 'PUT /api/conversations/:id failed')
    results.push('PUT /api/conversations/:id')

    const createdMessage = await request(
      baseUrl,
      'POST',
      `/api/conversations/${conversationId}/messages`,
      {
        sender_type: 'agent',
        message: 'Hello from API test',
        message_type: 'text',
      },
    )
    assert(createdMessage.status === 201, 'POST /api/conversations/:id/messages failed')
    results.push('POST /api/conversations/:id/messages')

    const messages = await request(
      baseUrl,
      'GET',
      `/api/conversations/${conversationId}/messages`,
    )
    assert(messages.status === 200 && messages.json.data.length >= 1, 'GET messages failed')
    results.push('GET /api/conversations/:id/messages')

    const leads = await request(baseUrl, 'GET', '/api/leads')
    assert(leads.status === 200, 'GET /api/leads failed')
    results.push('GET /api/leads')

    const createdLead = await request(baseUrl, 'POST', '/api/leads', {
      contact_id: contactId,
      service: 'API Test Service',
      budget: '$1,000',
      timeline: '2 weeks',
      lead_score: 70,
      status: 'new',
    })
    assert(createdLead.status === 201, 'POST /api/leads failed')
    const leadId = createdLead.json.data.id
    results.push('POST /api/leads')

    const leadById = await request(baseUrl, 'GET', `/api/leads/${leadId}`)
    assert(leadById.status === 200, 'GET /api/leads/:id failed')
    results.push('GET /api/leads/:id')

    const updatedLead = await request(baseUrl, 'PUT', `/api/leads/${leadId}`, {
      status: 'qualified',
      lead_score: 80,
    })
    assert(updatedLead.status === 200, 'PUT /api/leads/:id failed')
    results.push('PUT /api/leads/:id')

    const appointments = await request(baseUrl, 'GET', '/api/appointments')
    assert(appointments.status === 200, 'GET /api/appointments failed')
    results.push('GET /api/appointments')

    const createdAppointment = await request(baseUrl, 'POST', '/api/appointments', {
      contact_id: contactId,
      title: 'API Test Meeting',
      appointment_date: '2026-10-10',
      appointment_time: '15:30',
      status: 'scheduled',
    })
    assert(createdAppointment.status === 201, 'POST /api/appointments failed')
    const appointmentId = createdAppointment.json.data.id
    results.push('POST /api/appointments')

    const updatedAppointment = await request(
      baseUrl,
      'PUT',
      `/api/appointments/${appointmentId}`,
      { status: 'confirmed' },
    )
    assert(updatedAppointment.status === 200, 'PUT /api/appointments/:id failed')
    results.push('PUT /api/appointments/:id')

    const knowledge = await request(baseUrl, 'GET', '/api/knowledge')
    assert(knowledge.status === 200, 'GET /api/knowledge failed')
    results.push('GET /api/knowledge')

    const createdKnowledge = await request(baseUrl, 'POST', '/api/knowledge', {
      title: 'API Test Article',
      content: 'This article was created by the API test suite.',
      category: 'Testing',
    })
    assert(createdKnowledge.status === 201, 'POST /api/knowledge failed')
    const knowledgeId = createdKnowledge.json.data.id
    results.push('POST /api/knowledge')

    const updatedKnowledge = await request(
      baseUrl,
      'PUT',
      `/api/knowledge/${knowledgeId}`,
      { title: 'API Test Article Updated' },
    )
    assert(updatedKnowledge.status === 200, 'PUT /api/knowledge/:id failed')
    results.push('PUT /api/knowledge/:id')

    const aiSettings = await request(baseUrl, 'GET', '/api/ai/settings')
    assert(aiSettings.status === 200, 'GET /api/ai/settings failed')
    results.push('GET /api/ai/settings')

    const updatedAi = await request(baseUrl, 'PUT', '/api/ai/settings', {
      agent_name: 'Nexora Test Agent',
      temperature: 0.35,
    })
    assert(updatedAi.status === 200, 'PUT /api/ai/settings failed')
    results.push('PUT /api/ai/settings')

    const analytics = await request(baseUrl, 'GET', '/api/analytics/overview')
    assert(analytics.status === 200, 'GET /api/analytics/overview failed')
    results.push('GET /api/analytics/overview')

    const deletedLead = await request(baseUrl, 'DELETE', `/api/leads/${leadId}`)
    assert(deletedLead.status === 200, 'DELETE /api/leads/:id failed')
    results.push('DELETE /api/leads/:id')

    const deletedAppointment = await request(
      baseUrl,
      'DELETE',
      `/api/appointments/${appointmentId}`,
    )
    assert(deletedAppointment.status === 200, 'DELETE /api/appointments/:id failed')
    results.push('DELETE /api/appointments/:id')

    const deletedKnowledge = await request(
      baseUrl,
      'DELETE',
      `/api/knowledge/${knowledgeId}`,
    )
    assert(deletedKnowledge.status === 200, 'DELETE /api/knowledge/:id failed')
    results.push('DELETE /api/knowledge/:id')

    const deletedContact = await request(
      baseUrl,
      'DELETE',
      `/api/contacts/${contactId}`,
    )
    assert(deletedContact.status === 200, 'DELETE /api/contacts/:id failed')
    results.push('DELETE /api/contacts/:id')

    const validationFail = await request(baseUrl, 'POST', '/api/contacts', {
      name: '',
      phone: '1',
    })
    assert(validationFail.status === 400, 'Validation should return 400')
    results.push('Validation error handling')

    console.log('\nAPI test suite passed\n')
    for (const item of results) {
      console.log(`✔ ${item}`)
    }
    console.log(`\nTotal checks: ${results.length}`)
  } catch (error) {
    console.error('\nAPI test suite failed')
    console.error(error.message)
    console.error('Passed before failure:', results)
    process.exitCode = 1
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

run()
