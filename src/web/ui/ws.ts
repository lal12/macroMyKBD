import { useEffect, useState } from 'react';
import { createSingleEvent } from '../../lib/single-event';
import type { ClientPacket, Data, ServerPacket } from '../packets';

const msgHdl = createSingleEvent<ServerPacket>()
export const msg = msgHdl.pub;
const con = new WebSocket('/ws');
con.onmessage = (event) => {
	const msg = JSON.parse(event.data);
	msgHdl.emit(msg);
	console.debug('msg in', msg);
};
export const connected = new Promise((resolve) => {
	con.onopen = () => {
		resolve(con);
	};
});

let nextId = 1;
export function sendMsg<T extends ClientPacket>(pkt: T){
	const msg = {
		...pkt,
		id: nextId++
	};
	con.send(JSON.stringify(msg));
	console.debug('msg out', msg);
}

const dataStore: Partial<Data> = {};
const pendingReq = new Set<string>();

const dataEvt = createSingleEvent<keyof Data>();

msg.subscribe(pkt => {
	if(pkt.type === 'data'){
		dataStore[pkt.key] = pkt.data as any;
		pendingReq.delete(pkt.key);
		dataEvt.emit(pkt.key);
	}
});

function reqData(key: keyof Data){
	if(pendingReq.has(key)){
		return;
	}
	sendMsg({
		type: 'get',
		id: 0,
		key
	});
	pendingReq.add(key);
}

export function useData(key: keyof Data){
	const [data, setData] = useState<Data[keyof Data] | undefined>(dataStore[key]);
	useEffect(() => {
		if(!dataStore[key]){
			reqData(key);
		}
		dataEvt.pub.subscribe(k => {
			if(k === key){
				setData(dataStore[key]);
			}
		});
	}, [key]);
	return data;
}

export function setConfig(conf: Data['config'] | ((old: Data['config']) => Data['config'])) {
	if (typeof conf === 'function') {
		conf = conf(dataStore.config!);
	}
	sendMsg({
		type: 'set',
		id: 0,
		key: 'config',
		data: conf
	});
}
