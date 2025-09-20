import CProc from 'child_process';
import { webPort } from '../web/server/webserver.js';

export function launchSettingsWindow(){
	const url = `http://localhost:${webPort}`;
	CProc.exec(`start ${url}`);
}