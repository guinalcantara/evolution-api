import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

import { CacheService } from '../src/api/services/cache.service';
import { ChatwootService } from '../src/api/integrations/chatbot/chatwoot/services/chatwoot.service';
import { ChatwootMessageNormalizer } from '../src/api/integrations/chatbot/chatwoot/services/chatwoot-message-normalizer';

const fixtures = JSON.parse(
  readFileSync(path.join(__dirname, 'fixtures', 'chatwoot', 'interactive-messages.json'), 'utf8'),
) as Record<string, any>;
const normalizer = new ChatwootMessageNormalizer();

test('normalizes legacy buttons and preserves numeric presentation', () => {
  const message = normalizer.normalize(fixtures.buttons);

  assert.equal(message.family, 'buttonsMessage');
  assert.deepEqual(
    message.options.map((option) => [option.index, option.id, option.label]),
    [
      [1, 'confirm', 'Confirmar'],
      [2, 'cancel', 'Cancelar'],
    ],
  );
  assert.match(normalizer.renderForChatwoot(message) ?? '', /1 - Confirmar/);
});

test('normalizes hydrated templates without numbering external actions', () => {
  const message = normalizer.normalize(fixtures.hydratedTemplate);

  assert.equal(message.variant, 'hydratedTemplate');
  assert.equal(message.options.length, 1);
  assert.equal(message.options[0].id, 'morning');
  assert.equal(message.actions[0].type, 'url');
  assert.equal(message.media[0].type, 'imageMessage');
  assert.doesNotMatch(normalizer.renderForChatwoot(message) ?? '', /2 - Ver agenda/);
});

test('normalizes structured interactive templates through the native-flow path', () => {
  const message = normalizer.normalize(fixtures.interactiveTemplate);

  assert.equal(message.variant, 'interactiveMessageTemplate');
  assert.equal(message.options[0].id, 'telemedicine');
  assert.equal(message.options[0].label, 'Teleconsulta');
  assert.equal(message.media.length, 0);
});

test('normalizes four-row templates with highly structured text', () => {
  const message = normalizer.normalize(fixtures.fourRowTemplate);

  assert.equal(message.title, 'Agendamento');
  assert.equal(message.body, 'Escolha uma especialidade');
  assert.equal(message.footer, 'Atendimento sujeito a confirmação');
  assert.equal(message.options[0].label, 'Cardiologia');
  assert.equal(message.actions[0].type, 'call');
});

test('keeps list section identity when labels repeat', () => {
  const message = normalizer.normalize(fixtures.list);

  assert.equal(message.options.length, 2);
  assert.equal(message.options[0].id, 'consult-1');
  assert.equal(message.options[1].id, 'return-1');
  assert.notEqual(message.options[0].sectionTitle, message.options[1].sectionTitle);
});

test('classifies native flow actions and carousel cards', () => {
  const nativeFlow = normalizer.normalize(fixtures.nativeFlow);
  const carousel = normalizer.normalize(fixtures.carousel);

  assert.equal(nativeFlow.options[0].id, 'approve');
  assert.deepEqual(
    nativeFlow.actions.map((action) => action.type),
    ['url', 'payment'],
  );
  assert.equal(carousel.options[0].cardIndex, 0);
  assert.equal(carousel.options[1].cardIndex, 1);
  assert.equal(carousel.cards[0].title, 'Plano Básico');
  assert.equal(carousel.cards[1].body, 'Com mais recursos');
  assert.equal(carousel.media[0].cardIndex, 1);
  assert.match(normalizer.renderForChatwoot(carousel) ?? '', /Cartão 1/);
});

test('keeps every supported selectable template option addressable by its number', () => {
  const selectableTemplates = [
    fixtures.buttons,
    fixtures.hydratedTemplate,
    fixtures.interactiveTemplate,
    fixtures.fourRowTemplate,
    fixtures.list,
    fixtures.nativeFlow,
    fixtures.carousel,
  ];

  for (const template of selectableTemplates) {
    const options = normalizer.getSelectableOptions(template);

    assert.ok(options.length > 0);
    assert.deepEqual(
      options.map((option) => option.index),
      options.map((_, index) => index + 1),
    );
  }
});

test('extracts all supported interactive response families', () => {
  const responses = fixtures.responses;

  assert.equal(normalizer.normalize(responses.buttons).response?.id, 'confirm');
  assert.equal(normalizer.normalize(responses.template).response?.cardIndex, 1);
  assert.equal(normalizer.normalize(responses.list).response?.id, 'consult-1');

  const nativeValid = normalizer.normalize(responses.nativeValid).response;
  assert.equal(nativeValid?.flowName, 'galaxy_message');
  assert.deepEqual(nativeValid?.params, { appointment_id: 'anonymous-123', choice: 'morning' });

  const nativeInvalid = normalizer.normalize(responses.nativeInvalid).response;
  assert.equal(nativeInvalid?.rawParamsJson, '{invalid');
  assert.equal(nativeInvalid?.paramsParseError, 'invalid_json');

  assert.equal(normalizer.normalize(responses.nativeEmpty).response?.rawParamsJson, '');
  const nativeMissing = normalizer.normalize(responses.nativeMissing).response;
  assert.equal(nativeMissing?.id, undefined);
  assert.equal(nativeMissing?.flowName, undefined);
  assert.equal(nativeMissing?.params, undefined);
});

test('opens nested wrappers and preserves an unknown-content fallback', () => {
  const wrapped = normalizer.normalize(fixtures.wrapped);
  const unknown = normalizer.normalize(fixtures.unknown);

  assert.deepEqual(wrapped.wrapperPath, ['ephemeralMessage', 'viewOnceMessageV2Extension']);
  assert.equal(wrapped.options[0].id, 'wrapped');
  assert.equal(unknown.fallbackType, 'futureCommerceMessage');
  assert.equal(
    normalizer.renderForChatwoot(unknown),
    '[Mensagem do WhatsApp com formato ainda não suportado: futureCommerceMessage]',
  );
});

test('keeps menu state scoped by conversation and removes only the consumed source', async () => {
  const records = new Map<string, unknown>();
  const ttlByKey = new Map<string, number | undefined>();
  const cache = new CacheService({
    get: async (key: string) => records.get(key),
    has: async (key: string) => records.has(key),
    set: (key: string, value: unknown, ttl?: number) => {
      records.set(key, value);
      ttlByKey.set(key, ttl);
    },
  } as any);
  const service = new ChatwootService({} as any, {} as any, {} as any, cache) as any;
  const instance = { instanceName: 'fixture-instance' } as any;
  const firstMenu = {
    sourceMessageId: 'menu-a',
    sourceMessageType: 'buttonsMessage',
    remoteJid: '5511999999999@s.whatsapp.net',
    expectedReplyDirection: 'incoming',
    buttons: [{ index: 1, id: 'a', label: 'Opção A', actionType: 'select' }],
    updatedAt: 10,
  };
  const secondMenu = {
    ...firstMenu,
    sourceMessageId: 'menu-b',
    buttons: [{ index: 1, id: 'b', label: 'Opção B', actionType: 'select' }],
    updatedAt: 20,
  };

  await service.setConversationState(instance, 10, firstMenu);
  await service.setConversationState(instance, 10, secondMenu);
  await service.setConversationState(instance, 11, { ...secondMenu, sourceMessageId: 'menu-c' });

  const state = await service.getConversationState(instance, 10);
  assert.equal(ttlByKey.get('fixture-instance:chatwoot:conversation-state:10'), 1800);
  assert.equal(state.version, 1);
  assert.equal(state.instanceName, 'fixture-instance');
  assert.equal(state.conversationId, 10);
  assert.equal(service.getConversationMenu(state, 'incoming', firstMenu.remoteJid)?.sourceMessageId, 'menu-b');
  assert.equal(
    service.getConversationMenu(state, 'incoming', firstMenu.remoteJid, 'menu-a')?.sourceMessageId,
    'menu-a',
  );
  assert.equal(service.getNumericButtonSelection('2', secondMenu.buttons), null);

  await service.clearConversationState(instance, 10, 'incoming', 'menu-a');

  assert.equal((await service.getConversationState(instance, 10)).menus[0].sourceMessageId, 'menu-b');
  assert.equal(
    service.getConversationMenu(await service.getConversationState(instance, 11), 'incoming', firstMenu.remoteJid)
      ?.sourceMessageId,
    'menu-c',
  );
});

test('matches an LID-backed menu to the Chatwoot phone identifier', async () => {
  const records = new Map<string, unknown>();
  const cache = new CacheService({
    get: async (key: string) => records.get(key),
    has: async (key: string) => records.has(key),
    set: (key: string, value: unknown) => records.set(key, value),
  } as any);
  const service = new ChatwootService({} as any, {} as any, {} as any, cache) as any;
  const instance = { instanceName: 'fixture-instance' } as any;

  await service.setConversationState(instance, 12, {
    sourceMessageId: 'lid-menu',
    sourceMessageType: 'buttonsMessage',
    remoteJid: '241265559994537@lid',
    remoteJidAlt: '551130039303@s.whatsapp.net',
    expectedReplyDirection: 'outgoing',
    buttons: [
      { index: 1, id: 'yes', label: 'Sim', actionType: 'select' },
      { index: 2, id: 'no', label: 'Não', actionType: 'select' },
      { index: 3, id: 'back', label: 'Voltar', actionType: 'select' },
    ],
    updatedAt: 30,
  });

  const menu = service.getConversationMenu(
    await service.getConversationState(instance, 12),
    'outgoing',
    '551130039303',
  );

  assert.equal(menu?.sourceMessageId, 'lid-menu');
  assert.equal(service.getNumericButtonSelection('3', menu.buttons)?.label, 'Voltar');
});

test('formats concurrent interactive and common replies without mutating the provider signature', async () => {
  const service = new ChatwootService({} as any, {} as any, {} as any, new CacheService(undefined as any)) as any;
  service.provider = { signMsg: true, signDelimiter: '\\n--\\n' };

  const [interactiveReply, commonReply] = await Promise.all([
    Promise.resolve(service.formatOutgoingText('*Ana:*\nConfirmar', 'Ana', true)),
    Promise.resolve(service.formatOutgoingText('Mensagem comum', 'Ana', false)),
  ]);

  assert.equal(interactiveReply, 'Confirmar');
  assert.equal(commonReply, '*Ana:*\n--\nMensagem comum');
  assert.deepEqual(service.provider, { signMsg: true, signDelimiter: '\\n--\\n' });
});
