import { Action, ActionCfg } from "../events/action";
import { Keyboard, KeyboardConf, KeyboardEvent, KeyboardIdentifier } from "../kbd/keyboard";
import { Trigger, TriggerConf } from '../events/trigger';
import {AsyncLocalStorage} from 'node:async_hooks'

export interface MMKBDConfig{
	ver: 1,
	keyboards: {
		[name: string]: {
			id: KeyboardIdentifier;
			conf: KeyboardConf;
		}
	};
	actions: {
		[id: string]: {
			triggers: TriggerConf[];
			action: ActionCfg;
		}
	};
};

const mmkbdInst = new AsyncLocalStorage<MMKBDInstance>();
export const getMMKBDInstance = () => mmkbdInst.getStore() as MMKBDInstance;

export class MMKBDInstance implements Disposable{
	private _kbds = new Map<string, Keyboard>();
	getKeyboard(name: string){
		return this._kbds.get(name);
	}
	public get keyboards(): ReadonlyMap<string, Keyboard> {
		return this._kbds;
	}

	private _actions: Array<{action: Action, triggers: Trigger[]}> = [];

	private constructor(private _cfg: MMKBDConfig) {}
	public get cfg(): MMKBDConfig {
		return this._cfg;
	}
	private async _init(){
		mmkbdInst.run(this, async () => {
			for (const [name, { id, conf }] of Object.entries(this._cfg.keyboards)) {
				const kbd = await Keyboard.create(id, conf);
				this._kbds.set(name, kbd);
			}
			for (const { action, triggers: triggerCfgs } of Object.values(this._cfg.actions)) {
				const act = new Action(action);
				const triggers: Trigger[] = triggerCfgs.map(cfg => {
					const kbd = this.getKeyboard(cfg.keyboard);
					if(!kbd){
						throw new Error(`Keyboard not found: ${cfg.keyboard}`);
					}
					const trig = new Trigger(cfg, kbd);
					trig.evt.subscribe(evt => {
						act.execute(kbd, evt);
					});
					return trig;
				});
				this._actions.push({ action: act, triggers });
			}
		});
	}
	public static create(cfg: MMKBDConfig): MMKBDInstance {
		const instance = new MMKBDInstance(cfg);
		instance._init();
		return instance;
	}

	[Symbol.dispose](){
		for(const act of this._actions){
			for(const trig of act.triggers){
				trig[Symbol.dispose]();
			}
			act.action[Symbol.dispose]();
		}
		for(const kbd of this._kbds.values()){
			kbd[Symbol.dispose]();
		}
	}
};
