import { Keyboard, KeyboardEvent } from "../kbd/keyboard";

export enum ActionType {
	Cmd = 'cmd'
}

interface ActionCfgBase{
	type: ActionType;
}

export interface ActionCfgCmd extends ActionCfgBase{
	cmd: string;
}

export type ActionCfg = ActionCfgCmd;

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
