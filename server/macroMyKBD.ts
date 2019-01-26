import { Action } from "./action";
import { Device } from "./device";
import * as hidHandler from 'hid-handler';

export class MacroMyKBD{
    private _actions: Action[] = [];
    private _devices: Device[] = [];
    public get actions(){return [...this._actions]}
    public get devices(){return [...this._devices]}

    public addAction(a: Action){
        this._actions.push(a);
    }
    public addDevice(d: Device){
        this._devices.push(d);
    }
    public findDevice(vendor: number, prod: number, sn?: string){
        return this.devices.find(d=>d.vendor == vendor && d.prod == prod && (!sn || d.sn == sn));
    }

    public handleKey(e: hidHandler.KBDEvent){
        let {vendorId, productId} = e.hid.deviceKey;
        let device = this.findDevice(parseInt(vendorId, 16), parseInt(productId, 16));
        if(device){
            device.KBDEventIn(e);
        }
    }

    public constructor(){
        hidHandler.on('key', (e: hidHandler.KBDEvent)=>this.handleKey(e));
    }

    public async start(){
        hidHandler.init({
            //keyLayouts: {
            //    baseDir: "",
            //    layouts: null
            //},
            supportedDevices: this.devices.map(d=>({
                name: d.name, 
                type: 'keyboard' as 'keyboard', 
                vendorId: d.vendor, 
                productId: d.prod
            }))
        })
        await hidHandler.start()
    }
    public get running(){
        return hidHandler.isStarted();
    }
    public stop(){
        hidHandler.stop();
    }
}