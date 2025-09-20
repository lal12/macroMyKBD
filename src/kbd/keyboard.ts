import { HidDev } from "./hid-handler.js";
import { createPassthrough } from "./passthrough.js";
import { createSingleEvent } from "../lib/single-event.js";
import type { KeyboardConf, KeyboardEvent, KeyboardIdentifier, KeyboardState } from "./types.js";


export class Keyboard implements Disposable{
	private _dev!: HidDev;
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

	private _passthrough: null | ReturnType<typeof createPassthrough> = null;
	public get passthroughActive(){
		return this._passthrough != null;
	}
	public stopPassthrough(){
		console.info('Stop passthrough for', this.id);
		if(!this._passthrough){
			return false;
		}
		this._passthrough.close();
		this._passthrough = null;
		return true;
	}
	public startPassthrough(){
		console.info('Start passthrough for', this.id);
		if(this._passthrough){
			return false;
		}
		this._passthrough = createPassthrough(this);
		return true;
	}

	private _cfg!: KeyboardConf;
	public get cfg(){
		return this._cfg;
	}

	public static async create(id: KeyboardIdentifier, cfg: KeyboardConf){
		const kbd = new Keyboard();
		kbd._cfg = cfg;
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
			kbd.startPassthrough();
		}
		return kbd;
	}

	public close(){
		this._dev.stop();
	}

	[Symbol.dispose](){
		this.close();
		this.stopPassthrough();
		for(const cleanup of this._cleanup){
			cleanup();
		}
	}
}
