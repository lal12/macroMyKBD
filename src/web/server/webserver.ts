import Path from 'node:path';
import FS from 'node:fs';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { ClientPacket, ServerPacket } from '../packets';
import { handleWsMsg } from './ws-handling';


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
		ws.on('message', (message) => {
			handleWsMsg(ws, JSON.parse(message.toString()) as ClientPacket);
		});
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
