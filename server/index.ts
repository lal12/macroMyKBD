import YAML from 'yamljs';
import * as FS from 'fs';
import * as Util from 'util';
import * as JOI from 'joi';
import { Device, EventCond } from './device';
import { Action, Command } from './action';
import { MacroMyKBD } from './macroMyKBD';


interface EventConf{
	keys: number[],
	on: 'down'|'up'|'press',
	only: boolean,
	device: number|string,
}
interface ActionBase {
	events: Array<EventConf>;
}
interface CMDAction extends ActionBase {
	cmd: string;
}
interface ScriptAction extends ActionBase {
	script: string;
}
type ActionConf = CMDAction | ScriptAction;

interface DeviceConfig {
	name: string;
	sn?: string;
	vendor: number;
	prod: number;
	passthrough: boolean;
}

console.debug = ()=>{};



async function loadConf(path: string = "./actions.yml"): Promise<{devices: Array<DeviceConfig>, actions: Array<ActionConf>}> {
	const yamltext = (await Util.promisify(FS.readFile)(path)).toString();
	let conf: any;
	try{
		conf = YAML.parse(yamltext);
	}catch(e){
		console.error("error parsing actions.yml: ", e)
		process.exit(-1);
	}
	const evtSchema = JOI.object({
		keys: JOI.array().items(JOI.number().integer().min(0)).required(),
		on: JOI.string().only('down','up','press').required(),
		only: JOI.bool().required(),
		device: JOI.alternatives(
			JOI.number().integer().min(1), 
			JOI.string().min(1)
		).required()
	})
	const cmdSchema = JOI.object({
		cmd: JOI.string().min(1).required(),
		events: JOI.array().items(JOI.alternatives(evtSchema))
	});
	const schema = JOI.object({
		devices: JOI.array().items(JOI.object({
			name: JOI.string().min(2).required(),
			sn: JOI.string().min(5).optional(),
			vendor: JOI.number().integer().min(0).required(),
			prod: JOI.number().integer().min(0).required(),
			passthrough: JOI.bool().optional().default(false),
		})),
		actions: JOI.array().required().items(JOI.alternatives(cmdSchema))
	})
	const { error, value } = schema.validate(conf);
	if (error) {
		console.error(error);
		process.exit(-1);
	}
	return value;
}


async function main(){
	try{
		const conf = await loadConf();
		console.debug(conf);
		let mmkbd = new MacroMyKBD();
		for(let d of conf.devices){
			d.name = d.name.trim();
			if(mmkbd.devices.some(e=>e.name == d.name)){
				console.log("Devices have to have unique names: ", d.name)
				process.exit(-1);
			}
			mmkbd.addDevice(new Device(d))
		}

		function isCMD(a: ActionConf): a is CMDAction{
			return (<CMDAction>a).cmd !== undefined;
		}
		for(let a of conf.actions){
			let action : Action;
			if(isCMD(a)){
				action = new Command(a.cmd);
			}else{
				console.error("Unknown action type!");
				process.exit(-1);
				return;
			}
			mmkbd.addAction(action);
			for(let e of a.events){
				let device : Device|undefined;
				if(typeof e.device == "number"){
					device = mmkbd.devices[e.device-1];
					if(device == undefined)
						console.error("There is no device with index", e.device);
				}else{
					device = mmkbd.devices.find(d=>d.name == e.device);
					if(device == undefined)
						console.error("There is no device with name", e.device);
				}
				if(device == undefined){
					process.exit(-1);
					return; // to recognize type guard
				}
				device.addEvent(e.keys, e.only, EventCond[e.on], action);
			}
		}
		process.on('SIGINT', function () { // properly stop the handler in a simple main app
			mmkbd.stop();
			//TODO: check which handles are keeping the process open
			process.exit(0);
		});	

		mmkbd.start();
	}catch(e){
		console.error(e)
		return;
	}
}
main();

