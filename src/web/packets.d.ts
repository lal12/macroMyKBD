import type { KeyboardIdentifier } from "../kbd/types.d.ts";
import type { MMKBDConfig } from "../mmkbd/config.d.ts";

export interface Data{
	'used-kbds': {
		[name: string]: KeyboardIdentifier
	};
	'avail-kbds': {
		[id: string]: {
			name: string;
		} & KeyboardIdentifier
	};
	'config': MMKBDConfig;
}

export interface PacketBase{
	type: string;
	id: number;
	respTo?: number;
}
export type ServerPacketData<T extends keyof Data = keyof Data> = PacketBase & {
	type: 'data';
	key: T;
	data: Data[T];
}
export interface ServerPacketKeyEvt extends PacketBase{
	type: 'key-evt';
	keyboard: string;
	event: {
		ts: number;
		downs: number[];
		pressed: Record<number, {since: number}>;
		ups: number[];
	};
}

export type ServerPacket = ServerPacketKeyEvt | ServerPacketData;

export interface ClientPacketGetData extends PacketBase{
	type: 'get';
	key: keyof Data;
}

export interface ClientPacketSetConfig extends PacketBase{
	type: 'set';
	key: 'config';
	data: Data['config'];
}

export interface ClientPacketSubKbd extends PacketBase{
	type: 'sub-kbd';
	keyboard: string;
}

export interface ClientPacketUnsubKbd extends PacketBase{
	type: 'unsub-kbd';
	keyboard: string;
}
export type ClientPacket = ClientPacketGetData | ClientPacketSetConfig | ClientPacketSubKbd | ClientPacketUnsubKbd;
