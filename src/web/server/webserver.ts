import Path from 'node:path';
import FS from 'node:fs';
import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { ClientPacket, ServerPacket } from '../packets.js';
import { mmkbdMain } from '../../main.js';
import { listAvailableKeyboards } from '../../kbd/hid-handler.js';


const __dirname = Path.resolve(decodeURIComponent(new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')));
const publicPath = Path.join(__dirname, '../../../dist');

const bundleJs = FS.readFileSync(Path.join(publicPath, 'bundle.js'), 'utf-8');
const indexHtml = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>MacroMyKBD</title>
		<script src="bundle.js"></script>
		<style>
		html, body, #root{padding: 0; margin: 0; width: 100vw; height: 100vh;}
		</style>
	</head>
	<body>
		<div id="root"></div>
	</body>
</html>`;



export function createWebserver(){
	const app = express();

	app.get('/', (req, res) => {
		res.header('Content-Type', 'text/html').send(indexHtml);
	});
	app.get('/bundle.js', (req, res) => {
		if(import.meta.url.endsWith('.ts')){
			const bundleJs2 = FS.readFileSync(Path.join(publicPath, 'bundle.js'), 'utf-8');
			res.header('Content-Type', 'application/javascript').send(bundleJs2);
		}else{
			res.header('Content-Type', 'application/javascript').send(bundleJs);
		}
	});

	const server = http.createServer(app);

	const wss = new WebSocketServer({ server, path: '/ws' });

	wss.on('connection', (ws) => {
		const ctx: WSCtx = {
			handles: new Map()
		};
		new ConHandler(ws);
	});

	server.listen(3000, '127.0.0.1', () => {
		console.log('Server listening on http://localhost:3000');
	});

	return {
		app,
		server,
		wss,
		[Symbol.dispose](){
			wss.close();
			server.close();
		}
	};
}

interface WSCtx{
	handles: Map<string, ()=>void>;
}

class ConHandler implements Disposable{
	private _kbdSubs = new Map<string, () => void>();

	constructor(private _con: WebSocket) {
		_con.on('close', () => this[Symbol.dispose]());
		_con.on('message', (message) => {
			this.handleWsMsg(JSON.parse(message.toString()) as ClientPacket);
		});
	}
	[Symbol.dispose](): void {
		for(const off of this._kbdSubs.values()){
			off();
		}
		this._kbdSubs.clear();
	}

	private _nextid = 0;
	private sendMsg(msg: ServerPacket){
		msg.id = this._nextid++;
		this._con.send(JSON.stringify(msg));
	}

	private async handleWsMsg(msg: ClientPacket){
		switch(msg.type){
			case 'get':
				switch(msg.key){
					case 'config':
						if(mmkbdMain.instance){
							this.sendMsg({
								type: 'data',
								key: 'config',
								id: 0,
								respTo: msg.id,
								data: mmkbdMain.instance.cfg
							});
						}
						break;
					case 'avail-kbds':
						this.sendMsg({
							type: 'data',
							key: 'avail-kbds',
							id: 0,
							respTo: msg.id,
							data: Object.fromEntries((await listAvailableKeyboards()).map(dev => [(dev.manufacturerName + ' ' + dev.productName).trim(), {
								vendor: dev.vendorId, product: dev.productId, serial: dev.serialNumber
							}]))
						});
					break;
					case 'used-kbds':
						if(mmkbdMain.instance){
							this.sendMsg({
								type: 'data',
								key: 'used-kbds',
								id: 0,
								respTo: msg.id,
								data: Object.fromEntries(Array.from(mmkbdMain.instance.keyboards.entries()).map(([name, kbd]) => [name, kbd.id]))
							});
						}
						break;
					default:
						console.error(`Unknown key: ${(msg as any).key}`);
						break;
				}
				break;
			case 'set':
				switch(msg.key){
					case 'config':
						if(mmkbdMain.instance){
							console.info('saving config...')
							await mmkbdMain.saveConfig(msg.data);
							this.sendMsg({
								type: 'data',
								key: 'config',
								id: 0,
								respTo: msg.id,
								data: mmkbdMain.instance.cfg
							});
						}
						break;
					default:
						console.error(`Unknown key: ${(msg as any).key}`);
				}
				break;
			case 'sub-kbd':
				if(mmkbdMain.instance){
					const kbd = mmkbdMain.instance.keyboards.get(msg.keyboard);
					if(kbd){
						const off = kbd.keystate.subscribe(evt => {
							this.sendMsg({
								type: 'key-evt',
								id: 0,
								keyboard: msg.keyboard,
								event: {
									ts: evt.ts,
									downs: Array.from(evt.downs),
									pressed: Object.fromEntries(evt.pressed.entries()),
									ups: Array.from(evt.ups),
								}
							});
						});
						this._kbdSubs.set(msg.keyboard, off);
					}
				}
				break;
			case 'unsub-kbd':
				if(this._kbdSubs.has(msg.keyboard)){
					this._kbdSubs.get(msg.keyboard)!();
					this._kbdSubs.delete(msg.keyboard);
				}
				break;
			default:
				console.error(`Unknown action: ${(msg as any).type}`);
		}
	}
}
