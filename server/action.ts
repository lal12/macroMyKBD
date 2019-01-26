import * as CProc from 'child_process';
import { KBDEvent, EventCond } from './device';



export abstract class Action{
    abstract run(evt: KBDEvent, pressed: number[]): void;
}

export class Command extends Action{
    public get cmd(){return this._cmd;}
    constructor(private _cmd: string){
        super();
    }

    run(evt: KBDEvent, pressed: number[]){
        let on = "__ERROR__";
        for(let i in EventCond){
            if(EventCond[i] as any == evt.on){
                on = i;
                break;
            }
        }
        console.log("Running", this._cmd)
        let p = CProc.spawn(this._cmd, {
            shell: true,
            env: {
                "PRESSED": pressed.join(" "),
                "EVENT_KEYS": evt.keys.join(" "),
                "EVENT_ONLY": evt.only.toString(),
                "EVENT_ON": on
            },
            detached: true,
        });
        p.unref();
    }
}