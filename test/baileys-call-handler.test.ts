import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

const offer = (from = '5511999999999@s.whatsapp.net') => ({
  chatId: from,
  from,
  id: 'call-1',
  date: new Date(),
  status: 'offer',
  offline: false,
});

const createService = () => {
  const rejectedCalls: Array<[string, string]> = [];
  const sentMessages: Array<[string, { text: string }]> = [];
  const emittedMessages: unknown[] = [];
  const errors: unknown[] = [];

  const service = Object.create(BaileysStartupService.prototype) as any;
  service.logger = { error: (entry: unknown) => errors.push(entry) };
  service.client = {
    rejectCall: async (id: string, from: string) => rejectedCalls.push([id, from]),
    sendMessage: async (to: string, content: { text: string }) => {
      sentMessages.push([to, content]);
      return { key: { id: 'message-1' } };
    },
    signalRepository: {
      lidMapping: {
        getPNForLID: async () => '5511999999999@s.whatsapp.net',
      },
    },
    ev: {
      emit: (_event: string, payload: unknown) => emittedMessages.push(payload),
    },
  };

  return { service, rejectedCalls, sentMessages, emittedMessages, errors };
};

describe('Baileys call handler', () => {
  let context: ReturnType<typeof createService>;

  beforeEach(() => {
    context = createService();
  });

  it('uses the mapped phone-number JID without changing the call payload', async () => {
    const call = offer('12345@lid');

    await context.service.handleCallEvent(call, { rejectCall: true, msgCall: 'Automatic reply' });

    assert.deepEqual(context.sentMessages, [['5511999999999@s.whatsapp.net', { text: 'Automatic reply' }]]);
    assert.equal(call.from, '12345@lid');
  });

  it('uses the original LID when no phone-number mapping exists', async () => {
    context.service.client.signalRepository.lidMapping.getPNForLID = async () => undefined;
    const call = offer('12345@lid');

    await context.service.handleCallEvent(call, { rejectCall: true, msgCall: 'Automatic reply' });

    assert.deepEqual(context.sentMessages, [['12345@lid', { text: 'Automatic reply' }]]);
    assert.equal(call.from, '12345@lid');
    assert.equal(context.emittedMessages.length, 1);
  });

  it('isolates message failures so event processing can continue', async () => {
    context.service.client.sendMessage = async () => {
      throw new Error('send failed');
    };

    await assert.doesNotReject(
      context.service.handleCallEvent(offer('12345@lid'), { rejectCall: true, msgCall: 'Automatic reply' }),
    );
    assert.equal(context.errors.length, 1);
  });

  it('keeps msgCall independent from call rejection', async () => {
    await context.service.handleCallEvent(offer(), { rejectCall: false, msgCall: 'Automatic reply' });

    assert.equal(context.rejectedCalls.length, 0);
    assert.equal(context.sentMessages.length, 1);
  });
});
