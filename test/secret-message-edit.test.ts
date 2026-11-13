import { strict as assert } from 'node:assert';
import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';

import { proto } from 'baileys';

import { decryptSecretMessageEdit } from '../src/api/integrations/channel/whatsapp/secret-message-edit';

test('decrypts an authenticated edit using the original secret and alternate LID', () => {
  const id = 'original-id';
  const jid = '123456@lid';
  const secret = randomBytes(32);
  const iv = randomBytes(12);
  const info = Buffer.concat([Buffer.from(id), Buffer.from(jid), Buffer.from(jid), Buffer.from('Message Edit'), Buffer.from([1])]);
  const prk = createHmac('sha256', Buffer.alloc(32)).update(secret).digest();
  const key = createHmac('sha256', prk).update(info).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = proto.Message.encode({ conversation: 'corrected text' }).finish();
  const payload = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  const message = {
    key: { id: 'edit-id', remoteJid: '5511999999999@s.whatsapp.net', remoteJidAlt: jid, fromMe: false },
    message: { secretEncryptedMessage: { targetMessageKey: { id }, encPayload: payload, encIv: iv, secretEncType: 2 } },
  };
  const original = { messageContextInfo: { messageSecret: secret } };
  const result = decryptSecretMessageEdit(message, original, []);
  assert.equal(result?.editedMessage?.conversation, 'corrected text');
  assert.equal(result?.key?.id, id);
  const jsonStored = JSON.parse(JSON.stringify({ messageContextInfo: { messageSecret: new Uint8Array(secret) } }));
  assert.equal(decryptSecretMessageEdit(message, jsonStored, [])?.editedMessage?.conversation, 'corrected text');
  assert.equal(decryptSecretMessageEdit(message, { messageContextInfo: { messageSecret: randomBytes(32) } }, []), null);
  assert.equal(decryptSecretMessageEdit(message, {}, []), null);
});
