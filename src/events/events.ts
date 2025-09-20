export interface TriggerConf{
	keyboard: string;
	keys: number[];
	on: 'up'|'down';
	exact: boolean;
};

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
