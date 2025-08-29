import { Keyboard, KeyboardEvent } from '../kbd/keyboard';
import { createSingleEvent } from '../lib/single-event';
import { getMMKBDInstance } from '../mmkbd/instance';

export interface TriggerConf{
	keyboard: string;
	keys: number[];
	on: 'up'|'down';
	exact: boolean;
};

export class Trigger implements Disposable{
	private _cleanup: Array<() => void> = [];
	private _evt = createSingleEvent<KeyboardEvent>();
	public get evt(){
		return this._evt.pub;
	}
	constructor(private _conf: TriggerConf, kbd: Keyboard) {
		const off = kbd.keystate.subscribe(st => {
			if(this.check(st)){
				this._evt.emit(st);
			}
		});
		this._cleanup.push(off);
	}

	private _match(st: KeyboardEvent){
		let cmpKeys = new Set<number>();
		switch(this._conf.on){
			case 'down':
				cmpKeys = new Set(Array.from(st.pressed.keys()));
				break;
			case 'up':
				cmpKeys = new Set([...Array.from(st.ups.keys()), ...Array.from(st.pressed.keys())]);
		}
		if(this._conf.exact && this._conf.keys.length !== cmpKeys.size){
			return false;
		}
		for(const k of this._conf.keys){
			if(!cmpKeys.has(k)){
				return false;
			}
		}
		switch(this._conf.on){
			case 'down':
				return this._conf.keys.some(k => st.downs.has(k));
			case 'up':
				return this._conf.keys.some(k => st.ups.has(k));
		}
	}

	public check(st: KeyboardEvent){
		if(!this._match(st)){
			return false;
		}
		return true;
	}

	[Symbol.dispose](){
		this._evt[Symbol.dispose]();
		for(const cleanup of this._cleanup){
			cleanup();
		}
	}
}
