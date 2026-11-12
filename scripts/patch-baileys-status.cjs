const fs = require('fs');
const path = require('path');

const baileysPath = path.join(__dirname, '..', 'node_modules', 'baileys');
const packagePath = path.join(baileysPath, 'package.json');
const messagesReceivePath = path.join(baileysPath, 'lib', 'Socket', 'messages-recv.js');
const expectedVersion = '7.0.0-rc.9';

if (!fs.existsSync(packagePath) || !fs.existsSync(messagesReceivePath)) {
  throw new Error('Baileys is not installed; cannot apply the status stanza acknowledgement patch.');
}

const baileysPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (baileysPackage.version !== expectedVersion) {
  throw new Error(`Expected baileys@${expectedVersion}, found ${baileysPackage.version}. Refusing to patch an unknown version.`);
}

let source = fs.readFileSync(messagesReceivePath, 'utf8');
const patchMarker = "ws.on('CB:status', async (node) =>";

if (source.includes(patchMarker)) {
  process.exit(0);
}

const handlerAnchor = '    /// processes a node with the given function\n';
const offlineMapAnchor = "            ['notification', handleNotification]\n";
const listenerAnchor = `    ws.on('CB:notification', async (node) => {
        await processNode('notification', node, 'handling notification', handleNotification);
    });
`;

if (!source.includes(handlerAnchor) || !source.includes(offlineMapAnchor) || !source.includes(listenerAnchor)) {
  throw new Error('The expected Baileys rc.9 anchors were not found; refusing to apply an unsafe patch.');
}

const handleStatus = `    const handleStatus = async (node) => {
        try {
            await sendMessageAck(node);
        }
        catch (error) {
            onUnexpectedError(error, 'acking status stanza');
        }
    };
`;

source = source.replace(handlerAnchor, `${handleStatus}${handlerAnchor}`);
source = source.replace(offlineMapAnchor, "            ['notification', handleNotification],\n            ['status', handleStatus]\n");
source = source.replace(
  listenerAnchor,
  `${listenerAnchor}    ws.on('CB:status', async (node) => {
        await processNode('status', node, 'acking status stanza', handleStatus);
    });
`,
);

fs.writeFileSync(messagesReceivePath, source);
console.log(`Applied top-level status stanza acknowledgement patch to baileys@${expectedVersion}.`);
