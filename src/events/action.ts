import { Keyboard } from "../kbd/keyboard.js";
import type { KeyboardEvent } from "../kbd/types.js";
import { ActionType, type ActionCfg } from "./events.js";


export class Action implements Disposable{
	constructor(private _cfg: ActionCfg) {
	}

	public execute(kbd: Keyboard, evt: KeyboardEvent){
		switch(this._cfg.type){
			case ActionType.Cmd:
				console.log(`Executing command: ${this._cfg.cmd}`);
				break;
		}
	}

	[Symbol.dispose](): void {}
}
