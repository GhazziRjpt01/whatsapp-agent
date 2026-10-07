export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description:
        'Search company knowledge base for pricing, services, policies, and FAQs.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_contact_details',
      description:
        'Create or update the customer contact with collected personal/company details.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_or_update_lead',
      description:
        'Create or update a lead record after collecting qualification fields.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          service: { type: 'string' },
          budget: { type: 'string' },
          timeline: { type: 'string' },
          lead_score: { type: 'number' },
          status: {
            type: 'string',
            enum: [
              'new',
              'contacted',
              'qualified',
              'proposal',
              'won',
              'lost',
              'nurture',
            ],
          },
          notes: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          company: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_appointment',
      description: 'Schedule a discovery call or product demo for the customer.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          appointment_date: {
            type: 'string',
            description: 'YYYY-MM-DD',
          },
          appointment_time: {
            type: 'string',
            description: 'HH:MM or HH:MM:SS',
          },
          notes: { type: 'string' },
        },
        required: ['title', 'appointment_date', 'appointment_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_human_handoff',
      description:
        'Escalate to a human agent and stop AI auto-replies. Use when the customer asks for a human, you cannot answer confidently, there is a complaint, sensitive business info is requested, or the lead shows high purchase intent.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          reason: { type: 'string' },
          reason_code: {
            type: 'string',
            enum: [
              'customer_request',
              'low_confidence',
              'complaint',
              'sensitive_info',
              'high_intent',
            ],
          },
        },
        required: ['reason', 'reason_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finalize_response',
      description:
        'Required final step. Submit the customer-facing response and structured analysis.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          response: { type: 'string' },
          intent: {
            type: 'string',
            enum: [
              'greeting',
              'service_inquiry',
              'pricing',
              'lead_qualification',
              'appointment_request',
              'support',
              'complaint',
              'human_handoff',
              'other',
            ],
          },
          lead_information: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: ['string', 'null'] },
              email: { type: ['string', 'null'] },
              phone: { type: ['string', 'null'] },
              company: { type: ['string', 'null'] },
              service: { type: ['string', 'null'] },
              budget: { type: ['string', 'null'] },
              timeline: { type: ['string', 'null'] },
              notes: { type: ['string', 'null'] },
            },
          },
          lead_score: { type: 'number' },
          requires_human: { type: 'boolean' },
          suggested_service: { type: ['string', 'null'] },
        },
        required: [
          'response',
          'intent',
          'lead_information',
          'lead_score',
          'requires_human',
          'suggested_service',
        ],
      },
    },
  },
]
