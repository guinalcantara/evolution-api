import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import NodeCache from 'node-cache';

import { BaileysStartupService } from '../src/api/integrations/channel/whatsapp/whatsapp.baileys.service';

type CallSettings = {
  rejectCall?: boolean;
  msgCall?: string;
};

const offer = (overrides: Record<string, unknown> = {}) => ({
  chatId: '5511999999999@s.whatsapp.net',
  from: '5511999999999@s.whatsapp.net',
  id: 'call-1',
  date: new Date(),
  status: 'offer',
  offline: false,
  ...overrides,
});

const createService = (instanceName = 'oesteseguros') => {
  const diagnostics: Array<Record<string, unknown>> = [];
  const rejectedCalls: Array<[string, string]> = [];
  const sentMessages: Array<[string, { text: string }]> = [];
  const emittedMessages: unknown[] = [];

  const service = Object.create(BaileysStartupService.prototype) as any;
  service.instance = { name: instanceName };
  service.instanceId = `${instanceName}-id`;
  service.stateConnection = { state: 'open' };
  service.processedCallActions = new NodeCache({ stdTTL: 300, useClones: false });
  service.logger = {
    info: (entry: Record<string, unknown>) => diagnostics.push(entry),
    error: (entry: Record<string, unknown>) => diagnostics.push(entry),
  };
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

  return { service, diagnostics, rejectedCalls, sentMessages, emittedMessages };
};

describe('Baileys call handler', () => {
  let context: ReturnType<typeof createService>;

  beforeEach(() => {
    context = createService();
  });

  it('rejects an offer and sends the configured message exactly once', async () => {
    const settings: CallSettings = { rejectCall: true, msgCall: 'Automatic reply' };

    await context.service.handleCallEvent(offer(), settings);
    await context.service.handleCallEvent(offer(), settings);

    assert.equal(context.rejectedCalls.length, 1);
    assert.equal(context.sentMessages.length, 1);
    assert.equal(context.emittedMessages.length, 1);
  });

  it('sends the configured message without rejecting when rejectCall is disabled', async () => {
    await context.service.handleCallEvent(offer(), { rejectCall: false, msgCall: 'Automatic reply' });

    assert.equal(context.rejectedCalls.length, 0);
    assert.equal(context.sentMessages.length, 1);
  });

  it('keeps rejection successful when message sending fails', async () => {
    context.service.client.sendMessage = async () => {
      throw new Error('send failed');
    };

    await context.service.handleCallEvent(offer(), { rejectCall: true, msgCall: 'Automatic reply' });

    assert.equal(context.rejectedCalls.length, 1);
    assert.ok(context.diagnostics.some((entry) => entry.event === 'CALL_MESSAGE_ERROR'));
  });

  it('still sends the message when rejection fails', async () => {
    context.service.client.rejectCall = async () => {
      throw new Error('reject failed');
    };

    await context.service.handleCallEvent(offer(), { rejectCall: true, msgCall: 'Automatic reply' });

    assert.equal(context.sentMessages.length, 1);
    assert.ok(context.diagnostics.some((entry) => entry.event === 'CALL_REJECT_ERROR'));
  });

  it('sends to the original LID when no phone-number mapping exists', async () => {
    context.service.client.signalRepository.lidMapping.getPNForLID = async () => undefined;
    const call = offer({ from: '12345@lid' });

    await context.service.handleCallEvent(call, {
      rejectCall: true,
      msgCall: 'Automatic reply',
    });

    assert.equal(context.rejectedCalls.length, 1);
    assert.deepEqual(context.sentMessages, [['12345@lid', { text: 'Automatic reply' }]]);
    assert.equal(call.from, '12345@lid');
    assert.ok(context.diagnostics.some((entry) => entry.event === 'CALL_MESSAGE_COMPLETED'));
  });

  it('ignores non-offer events', async () => {
    await context.service.handleCallEvent(offer({ status: 'terminate' }), {
      rejectCall: true,
      msgCall: 'Automatic reply',
    });

    assert.equal(context.rejectedCalls.length, 0);
    assert.equal(context.sentMessages.length, 0);
  });

  it('keeps duplicate tracking isolated between instances', async () => {
    const second = createService('guilherme');
    const settings = { rejectCall: true, msgCall: 'Automatic reply' };

    await context.service.handleCallEvent(offer(), settings);
    await second.service.handleCallEvent(offer(), settings);

    assert.equal(context.rejectedCalls.length, 1);
    assert.equal(second.rejectedCalls.length, 1);
  });

  it('logs only a hash of the remote JID', async () => {
    await context.service.handleCallEvent(offer(), { rejectCall: true, msgCall: '' });

    const received = context.diagnostics.find((entry) => entry.event === 'CALL_RECEIVED');
    assert.equal(typeof received?.remoteJidHash, 'string');
    assert.equal(JSON.stringify(received).includes('5511999999999'), false);
  });
});
