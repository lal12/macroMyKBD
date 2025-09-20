import { createWebserver } from "../web/server/webserver.js";
import { MMKBDInstance } from "./instance.js";
import type { MMKBDConfig } from "./config.js";
import Path from "node:path";
import FS from "node:fs/promises";
import { TrayIcon } from "../tray/tray.js";

const configPath = Path.join(process.env.APPDATA!, 'mmkbd', 'config.json');

export class MMKBDMain{
	private _instance!: MMKBDInstance;
	public get instance(): MMKBDInstance {
		return this._instance;
	}
	private _webserver = createWebserver();
	private _tray = new TrayIcon('MMKBD');

	private constructor() {
		this._tray.addMenuEntry('Settings', () => {
			console.info('User requested settings via tray menu');
			//TODO
		});
		this._tray.addMenuEntry('Exit', () => {
			console.info('User ended process via tray menu');
			process.exit(0);
		});
	}
	private async _init(){
		let conf: MMKBDConfig;
		try{
			const json = await FS.readFile(configPath, 'utf-8');
			conf = JSON.parse(json);
			console.info('Loaded config from ' + configPath);
		}catch(e){
			console.error('failed to load config, creating new one in ' + configPath);
			try{
				await FS.rename(configPath, configPath+'.broken'); // if there is an old but broken config, move it for backup
			}catch{}
			conf = {
				ver: 1,
				keyboards: {},
				actions: {}
			};
			await FS.mkdir(Path.dirname(configPath), { recursive: true });
			await FS.writeFile(configPath, JSON.stringify(conf, null, 2));
		}
		console.debug('config', conf);
		if(this._instance){
			this._instance[Symbol.dispose]();
			this._instance = undefined!;
		}
		this._instance = MMKBDInstance.create(conf);
		this._tray.create();
	}
	public static async create(): Promise<MMKBDMain> {
		const inst = new MMKBDMain();
		await inst._init();
		return inst;
	}

	public async saveConfig(conf: MMKBDConfig){
		await FS.copyFile(configPath, configPath + '.bak');
		await FS.writeFile(configPath+'.new', JSON.stringify(conf, null, 2));
		await FS.rename(configPath+'.new', configPath);
		await this._init();
	}
}
