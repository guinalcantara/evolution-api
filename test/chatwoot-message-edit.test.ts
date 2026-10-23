import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';

import { ChatwootService } from '../src/api/integrations/chatbot/chatwoot/services/chatwoot.service';
import { CacheService } from '../src/api/services/cache.service';

test('edits the mapped WhatsApp message once for a Chatwoot edit', async () => {
  const sent: unknown[] = [];
  const records = new Map<string, unknown>();
  const cache = new CacheService({
    has: async (key: string) => records.has(key),
    set: async (key: string, value: unknown) => { records.set(key, value); },
  } as any);
  const key = { id: 'original-id', remoteJid: '5511999999999@s.whatsapp.net', fromMe: true };
  const waInstance = {
    instanceId: 'instance-id',
    client: { sendMessage: async (...args: unknown[]) => { sent.push(args); return { key: { id: 'edit-id' } }; } },
  };
  let originalText = '*Test Agent:*\n--\nOriginal text';
  const service = new ChatwootService(
    { waInstances: { fixture: waInstance } } as any,
    {} as any,
    { message: { findFirst: async () => ({ key, message: { conversation: originalText }, chatwootConversationId: 2, chatwootMessageId: 10 }) } } as any,
    cache,
  ) as any;
  service.clientCw = async () => ({});
  service.provider = { reopenConversation: true, url: 'https://chatwoot.example.com', accountId: 1, token: 'test-token', signMsg: false, signDelimiter: '\\n--\\n' };
  const body = {
    event: 'message_updated', id: 10, message_type: 'outgoing', content: 'Corrected text', content_changed: true,
    content_attributes: { edited: true, edit_request_id: 'request-1' },
    sender: { name: 'Test Agent' },
    conversation: { meta: { sender: { identifier: '5511999999999' } }, messages: [] },
  };

  await service.receiveWebhook({ instanceName: 'fixture' }, body);
  await service.receiveWebhook({ instanceName: 'fixture' }, body);
  await service.receiveWebhook({ instanceName: 'fixture' }, { ...body, content_changed: false });

  assert.deepEqual(sent, [[key.remoteJid, { text: '*Test Agent:*\n--\nCorrected text', edit: key }]]);

  originalText = '*Notice:*\nOriginal text without signature';
  service.provider.signMsg = true;
  await service.receiveWebhook({ instanceName: 'fixture' }, {
    ...body,
    content_attributes: { edited: true, edit_request_id: 'request-unsigned' },
  });
  assert.deepEqual(sent[1], [key.remoteJid, { text: 'Corrected text', edit: key }]);

  const reports: unknown[] = [];
  const originalPatch = axios.patch;
  axios.patch = (async (...args: unknown[]) => { reports.push(args); return {}; }) as typeof axios.patch;
  waInstance.client.sendMessage = async () => { throw new Error('remote rejection'); };
  try {
    await service.receiveWebhook({ instanceName: 'fixture' }, {
      ...body,
      content_attributes: { edited: true, edit_request_id: 'request-2' },
    });
  } finally {
    axios.patch = originalPatch;
  }

  assert.equal(records.has('fixture:edited:request-2'), false);
  assert.equal(reports.length, 1);
  assert.deepEqual((reports[0] as unknown[])[1], { edit_error: 'WhatsApp rejected the message edit' });
});
