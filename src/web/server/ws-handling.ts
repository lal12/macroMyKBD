import { WebSocket } from "ws";
import { listAvailableKeyboards } from "../../kbd/hid-handler.js";
import { mmkbdMain } from "../../main.js";
import type { ServerPacket, ClientPacket } from "../packets.js";

let nextid = 0;
function sendMsg(cl: WebSocket, msg: ServerPacket){
	msg.id = nextid++;
	cl.send(JSON.stringify(msg));
}
export async function handleWsMsg(cl: WebSocket, msg: ClientPacket){
	switch(msg.type){
		case 'get':
			switch(msg.key){
				case 'config':
					if(mmkbdMain.instance){
						sendMsg(cl, {
							type: 'data',
							key: 'config',
							id: 0,
							respTo: msg.id,
							data: mmkbdMain.instance.cfg
						});
					}
					break;
				case 'avail-kbds':
					sendMsg(cl, {
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
						sendMsg(cl, {
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
						sendMsg(cl, {
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
		default:
			console.error(`Unknown action: ${msg.type}`);
	}
}