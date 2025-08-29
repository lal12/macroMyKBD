import { DeviceIdentifier, HidDev } from "./hid-handler";
import { createPassthrough } from "./passthrough";
import { createSingleEvent } from "../lib/single-event";

export type KeyboardIdentifier = DeviceIdentifier;

export interface KeyboardConf{
	passthrough: boolean;
}

type KeyboardState = Map<number, {since: number}>;

export interface KeyboardEvent{
	ts: number;
	downs: Set<number>;
	pressed: KeyboardState;
	ups: Set<number>;
}

export class Keyboard implements Disposable{
	private _dev: HidDev;
	private _cleanup: Array<() => void> = [];
	private constructor(){}
	private _keystate = createSingleEvent<KeyboardEvent>();
	private _curPressed: KeyboardState = new Map();
	private _lastChg = 0;
	public get keystate(){
		return this._keystate.pub;
	}
	public get id(){
		return this._dev.id;
	}

	public static async create(id: KeyboardIdentifier, cfg: KeyboardConf){
		const kbd = new Keyboard();
		kbd._dev = await HidDev.create(id);
		const off = kbd._dev.subscribe(data => {
			const cur = new Set(data.inputs.filter(k => k > 0));
			const now = Date.now();
			const pressed = new Map(kbd._curPressed);
			const downs = new Set<number>();
			const ups = new Set<number>();
			let change = false;
			for(const k of cur.keys()){
				if(!pressed.has(k)){
					pressed.set(k, {since: now});
					downs.add(k);
					change = true;
				}
			}
			for(const k of pressed.keys()){
				if(!cur.has(k)){
					pressed.delete(k);
					ups.add(k);
					change = true;
				}
			}
			if(change){
				kbd._curPressed = pressed;
				kbd._lastChg = now;
				kbd._keystate.emit({ downs, pressed, ups, ts: now });
			}
		});
		kbd._cleanup.push(off);
		if(cfg.passthrough){
			const h = createPassthrough(kbd);
			kbd._cleanup.push(() => h.close());
		}
		return kbd;
	}

	public close(){
		this._dev.stop();
	}

	[Symbol.dispose](){
		this.close();
		for(const cleanup of this._cleanup){
			cleanup();
		}
	}
}
