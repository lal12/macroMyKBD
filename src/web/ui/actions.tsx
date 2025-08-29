import React from "react";
import { setConfig, useData } from "./ws";
import { Button, Dialog, DialogActions, DialogBody, DialogSurface, Field, Input, List, ListItem } from "@fluentui/react-components";
import { ActionType } from "../../events/action";
import { Data } from "../packets";

function isDeepEqual<T>(a: T, b: T): boolean {
	if (a === b) return true;
	if (typeof a !== 'object' || typeof b !== 'object' || a == null || b == null) return false;
	const aKeys = Object.keys(a) as (keyof T)[];
	const bKeys = Object.keys(b) as (keyof T)[];
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false;
		if (!isDeepEqual(a[key], b[key])) return false;
	}
	return true;
}

type ActionEntry = {name: string, conf: Data['config']['actions'][string]};

export const ActionDialog = ({action, isNew, onSave}: { action: ActionEntry, isNew: boolean, onSave: (act: ActionEntry) => void }) => {
	const [act, setAct] = React.useState<ActionEntry>(JSON.parse(JSON.stringify(action)));
	React.useEffect(() => {
		setAct(JSON.parse(JSON.stringify(action)));
	}, [action]);
	const changed = isNew || !isDeepEqual(act, action);
	const onSaveCb = () => {
		setConfig(cfg => {
			act.name = act.name.trim();
			cfg = JSON.parse(JSON.stringify(cfg));
			if(!isNew){
				delete cfg.actions[action.name];
			}
			cfg.actions[act.name] = act.conf;
			return cfg;
		});
		onSave(act);
	};
	const valid = act.name.trim().length > 0;
	return <div>
		
		<Field label="Name" required
			validationState={act.name.trim() ? undefined : 'error'}
			validationMessage={act.name.trim() ? undefined : 'Name is required'}
		>
			<Input value={act.name} onChange={(_, data) => setAct({...act, name: data.value})} />
		</Field>
		<Field label="Command">
			<Input value={act.conf.action.cmd} onChange={(_, data) => setAct({...act, conf: {...act.conf, action: {...act.conf.action, cmd: data.value}}})} />
		</Field>
		<Button disabled={!changed || !valid} onClick={() => onSaveCb()}>Save</Button>
	</div>;
};

export const ActionTab = () => {
	const config = useData('config');
	const actions = config?.actions ?? {};
	const [newAction, setNewAction] = React.useState<ActionEntry | null>(null);
	const actionsArr: ActionEntry[] = Object.entries(actions).map(([name, conf]) => ({name, conf}));
	const [selActionName, setSelActionName] = React.useState<string | null>(actionsArr[0]?.name ?? null);
	const realSelAction = newAction ?? actionsArr.find(a => a.name == selActionName);
	if(newAction){
		actionsArr.unshift(newAction);
	}
	return <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', padding: 24 }} >
		<div style={{ width: '25%', minWidth: '300px'}} >
			<Button onClick={() => setNewAction({name: 'New Action', conf: {action: {type: ActionType.Cmd, cmd: ''}, triggers: []}})} disabled={newAction != null}>Add Action</Button>
			<List style={{paddingTop: 10}}>
				{actionsArr.map((act, idx: number) => (
					<ListItem value={act.name} key={idx} onClick={() => setSelActionName(act.name)}
						style={{cursor: 'pointer', backgroundColor: realSelAction == act ? '#bbb' : undefined, padding: 7}}
					>
						{act.name}: {act.conf.action.type}: {act.conf.action.cmd}
					</ListItem>
				))}
			</List>
		</div>
		<div style={{ flex: 1, paddingLeft: '16px' }}>
			{realSelAction ? <ActionDialog action={realSelAction} isNew={newAction != null} onSave={act => {
				setNewAction(null);
				setSelActionName(act.name);
			}} /> : null}
		</div>
	</div>;
};
