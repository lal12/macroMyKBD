import React from "react";
import { msg, sendMsg, setConfig, useData } from "./ws";
import { 
	Button, Dialog, DialogActions, DialogBody, DialogSurface, Field, Input, List, ListItem,
	Table, TableHeader, TableRow, TableCell, TableHeaderCell, TableBody, Switch, Combobox, Option
} from "@fluentui/react-components";
import { ActionType } from "../../events/events.js";
import type { Data } from "../packets";
import {hid2codes} from "../../kbd/hid_ps2.js";

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
type TriggerConf = ActionEntry['conf']['triggers'][number];


//TODO add tooltips to keys
export const KeyIcon = ({keyCode}: { keyCode: number }) => {
	const info = hid2codes(keyCode);
	let text = keyCode.toString(16).toUpperCase().padStart(4, '0');
	let subtext = '';
	if(info?.desc3 && info?.desc3.length <= 2){
		text = info.desc3[0]!;
		if(!info.desc2.startsWith('KEY_')){
			subtext = info.desc3[1]!;
		}else{
			text = text.toUpperCase();
		}
		return <div style={{
			border: '1px solid #888',
			borderRadius: 4,
			padding: '2px 6px',
			margin: '0 2px',
			backgroundColor: '#eee',
			// make square: same width as height
			width: '40px',
			height: '44px',
			textAlign: 'center',
			// make every icon a fixed height so those without subtext match ones with it
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			fontWeight: 'bold',
			wordBreak: 'break-word',
			overflowWrap: 'break-word',
			whiteSpace: 'normal',
			boxSizing: 'border-box',
		}}>
			<div style={{ lineHeight: 1, fontSize: '1.2em' }}>{text}</div>
			<div style={{
				fontSize: '0.75em',
				lineHeight: 1,
				fontWeight: 'normal',
				marginTop: 4,
				visibility: subtext ? 'visible' : 'hidden',
				height: '0.9em'
			}}>
				{subtext || '\u00A0'}
			</div>
		</div>;
	}else if(info?.desc2){
		text = info.desc2;
	}
	return <div style={{
		border: '1px solid #888',
		borderRadius: 4,
		padding: '2px 6px',
		margin: '0 2px',
		backgroundColor: '#eee',
		// make square: same width as height
		width: '40px',
		height: '44px',
		textAlign: 'center',
		// make every icon a fixed height so those without subtext match ones with it
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		fontWeight: text.length > 5 ? 'normal' : 'bold',
		wordBreak: 'break-word',
		overflowWrap: 'break-word',
		whiteSpace: 'normal',
		boxSizing: 'border-box',
		fontSize: 1.2 - text.length * 0.045 + 'em',
		lineHeight: '1em',
	}}>
		<div>{text}</div>
	</div>;
};

export const KeysRow = ({keys}: { keys: number[] }) => {
	return <div style={{ display: 'flex', alignItems: 'stretch', flexWrap: 'wrap',}} >
		{keys.map(k => <KeyIcon keyCode={k} key={k} />)}
	</div>;
};

export const KeysInput = ({keys, keyboard, onChange}: { keys: number[], keyboard?: string, onChange: (keys: number[]) => void }) => {
	const [curKeys, setCurKeys] = React.useState<number[]>(keys);
	const [active, setActive] = React.useState<boolean>(false);
	React.useEffect(() => {
		if(!keyboard){
			return;
		}
		if(active){
			setCurKeys([]);
			const off = msg.subscribe(pkt => {
				if(pkt.type === 'key-evt'){
					setCurKeys(k => Array.from(new Set([...k, ...pkt.event.downs])).sort());
				}
			});
			sendMsg({type: 'sub-kbd', id: 0, keyboard});
			return () => off();
		}else{
			onChange(curKeys);
			sendMsg({type: 'unsub-kbd', id: 0, keyboard});
		}
	}, [active, keyboard]);
	const reallyActive = active && !!keyboard;
	return <div onFocus={() => setActive(true)} onBlur={() => setActive(false)} tabIndex={0} style={{ 
		border: reallyActive ? '2px solid #06f' : '2px solid #888', borderRadius: 4, padding: '4px 6px', minWidth: '100px', backgroundColor: '#fff', cursor: 'text',
		minHeight: '35px', display: 'flex', alignItems: 'center', flexWrap: 'wrap',
	}} >
		<KeysRow keys={curKeys} />
	</div>
};

export const TriggerDialog = ({trigger, onClose, onSave}: { trigger: TriggerConf, onClose: () => void, onSave: (trig: TriggerConf) => void }) => {
	const usedKbds = useData('used-kbds');
	const [trig, setTrig] = React.useState<TriggerConf>(trigger);
	return <Dialog open={true}>
		<DialogSurface>
			<DialogBody><div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
				<Field label="Keyboard" required>
					<Combobox placeholder="Select keyboard" value={trig.keyboard} onOptionSelect={(_, data) => setTrig({...trig, keyboard: data.optionValue as string})} style={{marginTop: 10}}>
						{usedKbds ? Object.keys(usedKbds).map((kbd, idx) => (
							<Option key={idx} value={kbd}>{kbd}</Option>
						)) : null}
					</Combobox>
				</Field>
				<Field label="Exact" required>
					<Switch checked={trig.exact} onChange={e=>setTrig({...trig, exact: e.target.checked})} label="Exact" />
				</Field>
				<Field label="Keyboard Shortcut" required>
					<KeysInput keyboard={trig.keyboard} keys={trig.keys} onChange={keys => setTrig({...trig, keys})} />
				</Field>
				<Field label="Trigger On" required>
					<Combobox value={trig.on}  onOptionSelect={(_, data) => setTrig({...trig, on: data.optionValue as 'down'|'up'})}>
						<Option value="down">Key Down</Option>
						<Option value="up">Key Up</Option>
					</Combobox>
				</Field>
			</div></DialogBody>
			<DialogActions>
				<Button onClick={() => onClose()}>Cancel</Button>
				<Button disabled={!trig.keyboard || !trig.keys.length} onClick={() => onSave(trig)}>Save</Button>
			</DialogActions>
		</DialogSurface>
	</Dialog>;
};

export const ActionForm = ({action, isNew, onSave}: { action: ActionEntry, isNew: boolean, onSave: (act: ActionEntry) => void }) => {
	const [act, setAct] = React.useState<ActionEntry>(JSON.parse(JSON.stringify(action)));
	React.useEffect(() => {
		setAct(JSON.parse(JSON.stringify(action)));
	}, [action]);
	const [editTrigger, setEditTrigger] = React.useState<number|'new'|null>(null);
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
		{editTrigger !== null ? <TriggerDialog trigger={editTrigger == 'new' ? { keyboard: '', keys: [], exact: false, on: 'up' } : act.conf.triggers[editTrigger]!} onClose={() => setEditTrigger(null)} onSave={trig => {
			setAct(act => {
				if(editTrigger === 'new'){
					act.conf.triggers.push(trig);
				}else{
					act.conf.triggers[editTrigger] = trig;
				}
				return {...act};
			});
			setEditTrigger(null);
		}} /> : null}
		<Button onClick={()=>{
			setEditTrigger('new');
		}}>Add Trigger</Button>
		<Table style={{paddingTop: 10}}><TableBody>
			{act.conf.triggers.map((trig, idx: number) => (
				<TableRow key={idx}>
					<TableCell>{trig.keyboard}</TableCell>
					<TableCell>{trig.on}</TableCell>
					<TableCell><KeysRow keys={trig.keys} /></TableCell>
					<TableCell>{trig.exact ? 'exact' : ''}</TableCell>
					<TableCell>
						<Button onClick={() => setEditTrigger(idx)}>Edit</Button>
						<Button onClick={() => {
							setAct({...act, conf: {...act.conf, triggers: act.conf.triggers.filter((_, i) => i != idx)}});
						}}>Delete</Button>
					</TableCell>
				</TableRow>
			))}
		</TableBody></Table>
		<hr />
		<br />
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
			{realSelAction ? <ActionForm action={realSelAction} isNew={newAction != null} onSave={act => {
				setNewAction(null);
				setSelActionName(act.name);
			}} /> : null}
		</div>
	</div>;
};
