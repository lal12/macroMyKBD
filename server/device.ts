import * as hidHandler from 'hid-handler';
import { Action } from './action';
import { SendInput } from 'sendinput';
import { GetKeyStateByScancode } from 'getkeystatebyscancode';
import { hid2codes, KeyCodes } from './hid_ps2';
import { EventEmitter } from 'events';
import { number } from 'joi';


type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export enum EventCond {
    down=0,up=1,press=2
}

export interface KBDEvent{
    action: Action;
    keys: number[];
    only: boolean;
    on: EventCond;    
}

enum Contains{
    no = 0,
    matches = 1,
    containes = 2,
}

export class Device{
    private _events: KBDEvent[] = [];

    public get events(){
        return this._events.map(e=>({...e, action: this}))
    }
    addEvent(keys: number[], only: boolean, on: EventCond, action: Action){
        this._events.push({ keys, only, on, action });
    }

    private ee = new EventEmitter();
    private _vendor: number;
    private _prod: number;
    private _name: string;
    private _sn?: string;
    private _passthrough: boolean;
    public get vendor(){return this._vendor;}
    public get prod(){return this._prod;}
    public get sn(){return this._sn;}
    public get name(){return this._name}
    public get passthrough(){return this._passthrough}
    public constructor(config: {
        vendor: number,
        prod: number,
        name: string,
        sn?: string,
        passthrough: boolean
    }){
        this._vendor = config.vendor;
             this._prod = config.prod;
        this._name = config.name;
        this._sn = config.sn;
        this._passthrough = config.passthrough;

        if(this.passthrough){
            this.ee.on("up-down", (up, down)=>this.passthroughKeys(up, down));
        }
    }

    /**
     * 
     * @param part 
     * @param whole 
     */
    public checkContains(part: number[], whole: number[]): Contains{
        if(!part.every(e=>whole.indexOf(e)>-1))
            return Contains.no;
        return part.length == whole.length ? Contains.matches : Contains.containes;
    }
    private eventsMatching(pressed: number[], ups: number[], downs: number[]){
        return this._events.filter(e=>{
            let c = Contains.no;
            switch(e.on){
                case EventCond.down:
                    c = this.checkContains(e.keys, pressed);
                    if(c == Contains.no || !e.keys.some(k=>downs.indexOf(k) > -1)) // If not all keys are pressed or no key was pressed down this event 
                        return false;
                    return e.only ?  c == Contains.matches : true;
                case EventCond.up:
                    c = this.checkContains(e.keys, [...pressed, ...ups]);
                    if(c == Contains.no || !e.keys.some(k=>ups.indexOf(k) > -1)) // If not all keys are pressed (or release this event) or no key was released this event
                        return false;
                    return e.only ?  c == Contains.matches : true;
                case EventCond.press:
                    c = this.checkContains(e.keys, pressed);
                    if(c == Contains.no)
                        return false;
                    return e.only ?  c == Contains.matches : true;
            }
        })
    }

    private lastDataError: null|number = null;
    public KBDEvent2Scancodes(event: hidHandler.KBDEvent): number[]|null{
        let modByte = event.data.readUInt8(0);
        let modifiers: number[] = [];
        for(let i = 0; i<8; i++){
            if( (modByte>>i) & 1 )
                modifiers.push(0xe0 + i);
        }
        if(event.scancodes.length == 6 && event.scancodes[0] < 4 && event.scancodes.every(k=>k==event.scancodes[0])){
            if(event.scancodes[0] != this.lastDataError){ // only log one time
                if(event.scancodes[0] == 1)
                    console.info("Keyboard reports: Too many keys pressed");
                else 
                    console.info("Keyboard sent errorcode", event.scancodes);
            }
            this.lastDataError = event.scancodes[0];
            return null;
        }
        this.lastDataError = null;
        return [...modifiers, ...event.scancodes];
    }

    private lastKeys: number[] = [];
    public KBDEventIn(event: hidHandler.KBDEvent){
        let keys = this.KBDEvent2Scancodes(event);
        if(keys == null)
            return;
        let pressed = keys;
        let ups  : number[] = this.lastKeys.filter(k=>(pressed).indexOf(k) == -1);
        let downs: number[] = pressed.filter(k=>this.lastKeys.indexOf(k) == -1);
        

        // emit events
        this.ee.emit("pressed", pressed, ups, downs, event);
        if(ups.length > 0)
            this.ee.emit("up", ups, event);
        if(downs.length > 0)
            this.ee.emit("down", downs, event);
        if(ups.length + downs.length > 0)
            this.ee.emit("up-down", ups, downs, event);
        
        // Run user actions
        if(pressed.length + ups.length > 0){
            let evts = this.eventsMatching(pressed, ups, downs);
            for(let e of evts){
                e.action.run(e, pressed);
            }
        }
        
        this.lastKeys = pressed;

        // echo ups and downs
        if(ups.length > 0)
            console.log("up", ups);
        if(downs.length > 0)
            console.log("down", downs);
    }

    private hid2ps2(k: number[]){
        return k.map(hid=>{
            let c = hid2codes(hid);
            if(!c)
                console.warn("Unknown key: ", k);
            else if(!c.win)
                console.warn("Cannot convert 2 win: ", k)
            if(c && c.win != null)
                return c.win;
            else
                return null;
        }).filter(k=>k!=null) as number[];
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    async handleSendInput(ups: number[], downs: number[]) {
        var continueTheLoop:Boolean=true;
        var loopfirstrun:Boolean=true;
        SendInput([
            ...ups.map(k=>({type: 1 as 1, val: k, up: true})),
            ...downs.map(k=>({type: 1 as 1, val: k}))
        ])
        var handled=downs[0];
        if(handled>0){
            while((GetKeyStateByScancode(handled)<0)){
                if(loopfirstrun){
                    await this.delay(420);
                    loopfirstrun=false;
                }
                else
                    await this.delay(40);

                if(GetKeyStateByScancode(handled)<0){
                    SendInput({type:1 as 1,val:handled,up:false});
                }
            }
        }
        
    }

    private passthroughKeys(ups: number[], downs: number[]){
        ups = this.hid2ps2(ups);
        downs = this.hid2ps2(downs);

        this.handleSendInput(ups,downs);
    }
}

   
