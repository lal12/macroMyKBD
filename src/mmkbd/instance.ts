import { createAction, type Action } from "../events/action.js";
import { Keyboard } from "../kbd/keyboard.js";
import { Trigger } from '../events/trigger.js';
import {AsyncLocalStorage} from 'node:async_hooks'
import type { MMKBDConfig } from "./config.js";

const mmkbdInst = new AsyncLocalStorage<MMKBDInstance>();
export const getMMKBDInstance = () => mmkbdInst.getStore() as MMKBDInstance;

export class MMKBDInstance implements AsyncDisposable{
	private _kbds = new Map<string, Keyboard>();
	getKeyboard(name: string){
		return this._kbds.get(name);
	}
	public get keyboards(): ReadonlyMap<string, Keyboard> {
		return this._kbds;
	}

	private _actions: Array<{action: Action, triggers: Trigger[]}> = [];

	private _pausedKbd = new Set<string>();
	public pauseKbd(kbdId: string){
		const kbd = this._kbds.get(kbdId);
		if(!kbd) return;
		kbd.stopPassthrough();
		this._pausedKbd.add(kbdId);
	}
	public resumeKbd(kbdId: string){
		const kbd = this._kbds.get(kbdId);
		if(kbd && kbd.cfg.passthrough){
			kbd.startPassthrough();
		}
		this._pausedKbd.delete(kbdId);
	}

	private constructor(private _cfg: MMKBDConfig) {}
	public get cfg(): MMKBDConfig {
		return this._cfg;
	}
	private async _init(){
		mmkbdInst.run(this, async () => {
			for (const [name, { id, conf }] of Object.entries(this._cfg.keyboards)) {
				try{
					const kbd = await Keyboard.create(id, conf);
					this._kbds.set(name, kbd);
				}catch(e){
					console.error(`Failed to initialize keyboard ${name}`, e);
				}
			}
			for (const { action, triggers: triggerCfgs } of Object.values(this._cfg.actions)) {
				const act = createAction(action);
				const triggers: Trigger[] = triggerCfgs.map(cfg => {
					const kbd = this.getKeyboard(cfg.keyboard);
					if(!kbd){
						console.error(`Keyboard specified in trigger not found: ${cfg.keyboard}`);
						return null;
					}
					const trig = new Trigger(cfg, kbd);
					trig.evt.subscribe(evt => {
						console.debug('Trigger fired', {cfg, evt});
						if(this._pausedKbd.has(cfg.keyboard)){
							console.debug('... but keyboard is paused, ignoring');
							return;
						}
						act.execute(kbd, evt);
					});
					return trig;
				}).filter((t): t is Trigger => t !== null);
				this._actions.push({ action: act, triggers });
			}
		});
	}
	public static create(cfg: MMKBDConfig): MMKBDInstance {
		const instance = new MMKBDInstance(cfg);
		instance._init();
		return instance;
	}

	async [Symbol.asyncDispose](){
		for(const act of this._actions){
			for(const trig of act.triggers){
				trig[Symbol.dispose]();
			}
			act.action[Symbol.dispose]();
		}
		await Promise.all(Array.from(this._kbds.values()).map(kbd => kbd[Symbol.asyncDispose]()));
		this._pausedKbd.clear();
	}
};
