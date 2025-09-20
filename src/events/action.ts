import { Keyboard } from "../kbd/keyboard.js";
import type { KeyboardEvent } from "../kbd/types.js";
import { ActionType, type ActionCfg } from "./events.js";
import * as CProc from 'node:child_process';

export interface Action extends Disposable{
	readonly type: ActionType;
	execute(kbd: Keyboard, evt: KeyboardEvent): void;
}

export class CmdAction implements Action{
	readonly type = ActionType.Cmd;
	execute(kbd: Keyboard, evt: KeyboardEvent): void {
		const env: Record<string, string|undefined> = {
			MMKBD_TS: evt.ts.toString(),
			MMKBD_PRESSED: Array.from(evt.pressed).map(k=>k.toString()).join(','),
			MMKBD_UPS: Array.from(evt.ups).map(k=>k.toString()).join(','),
			MMKBD_DOWNS: Array.from(evt.downs).map(k=>k.toString()).join(','),
			MMKBD_KBD_PROD: kbd.id.product.toString(),
			MMKBD_KBD_VEND: kbd.id.vendor.toString(),
			MMKBD_KBD_SERIAL: kbd.id.serial,
		};
		console.info(`Executing command: ${this.type}`);
		const p = CProc.spawn(this._cfg.cmd, { env, stdio: 'inherit', shell: true });
		p.on('exit', (code, signal) => {
			console.info(`Command "${this._cfg.cmd}" exited with code ${code} signal ${signal}`);
		})
		p.on('error', (err) => {
			console.error(`Command "${this._cfg.cmd}" failed: ${err}`);	
		});
	}

	constructor(private _cfg: ActionCfg){}

	[Symbol.dispose](): void {}
}

export function createAction(cfg: ActionCfg): Action {
	switch(cfg.type){
		case ActionType.Cmd:
			return new CmdAction(cfg);
		default:
			throw new Error(`Unknown action type: ${cfg.type}`);
	}
}
