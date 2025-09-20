import type { ActionCfg, TriggerConf } from "../events/events.ts";
import type { KeyboardConf, KeyboardIdentifier } from "../kbd/types.js";

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
