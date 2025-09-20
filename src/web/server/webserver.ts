import Path from 'node:path';
import FS, { glob } from 'node:fs';
import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { ClientPacket, ServerPacket } from '../packets.js';
import { listAvailableKeyboards } from '../../kbd/hid-handler.js';
import { MMKBDMain } from '../../mmkbd/mmkbd.js';

export const webPort = 17654;

declare const _BUNDLE_: boolean;
const bundlejsPath = Path.join(__dirname, _BUNDLE_ ? '.' : '../../../dist', 'bundle.js');
const bundleJs = FS.readFileSync(bundlejsPath, 'utf-8');
const randomCRSF = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const indexHtml = `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>MacroMyKBD</title>
		<script>
			document.cookie = "csrf=${randomCRSF}; SameSite=Strict";
		</script>
		<script src="bundle.js"></script>
		<style>
		html, body, #root{padding: 0; margin: 0; width: 100vw; height: 100vh;}
		</style>
	</head>
	<body>
		<div id="root"></div>
	</body>
</html>`;



export function createWebserver(main: MMKBDMain){
	const app = express();

	app.get('/', (req, res) => {
		res.header('Content-Type', 'text/html').send(indexHtml);
	});
	app.get('/bundle.js', (req, res) => {
		if(__filename.endsWith('.ts')){
			const bundleJs2 = FS.readFileSync(bundlejsPath, 'utf-8');
			res.header('Content-Type', 'application/javascript').send(bundleJs2);
		}else{
			res.header('Content-Type', 'application/javascript').send(bundleJs);
		}
	});

	const server = http.createServer(app);

	const wss = new WebSocketServer({ server, path: '/ws' });

	wss.on('connection', (ws, req) => {
		if(!req.headers['cookie']?.includes(`csrf=${randomCRSF}`)){
			console.warn('Connection rejected due to missing or invalid CSRF cookie');
			ws.close();
			return;
		}
		const ctx: WSCtx = {
			handles: new Map()
		};
		new ConHandler(ws, main);
	});

	server.listen(webPort, '127.0.0.1', () => {
		console.info('Server listening on http://localhost:' + webPort);
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

	constructor(private _con: WebSocket, private _main: MMKBDMain) {
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
						if(this._main.instance){
							this.sendMsg({
								type: 'data',
								key: 'config',
								id: 0,
								respTo: msg.id,
								data: this._main.instance.cfg
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
						if(this._main.instance){
							this.sendMsg({
								type: 'data',
								key: 'used-kbds',
								id: 0,
								respTo: msg.id,
								data: Object.fromEntries(Array.from(this._main.instance.keyboards.entries()).map(([name, kbd]) => [name, kbd.id]))
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
						if(this._main.instance){
							console.info('saving config...')
							await this._main.saveConfig(msg.data);
							this.sendMsg({
								type: 'data',
								key: 'config',
								id: 0,
								respTo: msg.id,
								data: this._main.instance.cfg
							});
						}
						break;
					default:
						console.error(`Unknown key: ${(msg as any).key}`);
				}
				break;
			case 'sub-kbd':
				if(this._main.instance){
					const kbd = this._main.instance.keyboards.get(msg.keyboard);
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
						this._main.instance.pauseKbd(msg.keyboard);
						this._kbdSubs.set(msg.keyboard, () => {
							this._main.instance?.resumeKbd(msg.keyboard);
							off();
						});
					}
				}
				break;
			case 'unsub-kbd':{
				const off = this._kbdSubs.get(msg.keyboard);
				if(off){
					off();
					this._kbdSubs.delete(msg.keyboard);
				}
			}
				break;
			default:
				console.error(`Unknown action: ${(msg as any).type}`);
		}
	}
}
