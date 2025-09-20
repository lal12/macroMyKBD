import { WebUSB, WebUSBDevice } from 'usb';
import { HidParser } from './hid-parser.js';
import type { ParsedReportData } from './hid-parser.js';
import { createSingleEvent } from '../lib/single-event.js';
import type { SingleEvent } from '../lib/single-event.js';
import type { DeviceIdentifier } from './types.js';


export const HID_CLASS = 0x03;
export const BOOT_INTERFACE = 0x01;
export const KEYBOARD_PROTOCOL = 0x01;
export const GET_DESCRIPTOR = 0x06;
export const HID_REPORT_DESCRIPTOR = 0x2200;


const webusb = new WebUSB({allowAllDevices: true})

function findKeyboardCfg(dev: WebUSBDevice){
	for(const cfg of dev.configurations){
		for(const ifc of cfg.interfaces){
			for(const alt of ifc.alternates){
				if (alt.interfaceClass === HID_CLASS && alt.interfaceProtocol === KEYBOARD_PROTOCOL && alt.interfaceSubclass === BOOT_INTERFACE) {
					return [cfg.configurationValue, ifc.interfaceNumber, alt.alternateSetting];
				}
			}
		}
	}
	return null;
}

export async function listAvailableKeyboards() {
	const devices = await webusb.getDevices();
	return devices.filter(dev => findKeyboardCfg(dev as WebUSBDevice));
}

interface HidDevCfg{
	indexes: [number, number, number, number];
	hidReport: DataView<ArrayBufferLike>
}

export async function initKeyboardDev(dev: WebUSBDevice): Promise<HidDevCfg>{
	await dev.open();
	const [cfgI, ifcI, altI] = findKeyboardCfg(dev) || [];
	if (cfgI === undefined || ifcI === undefined || altI === undefined) {
		throw new Error('Keyboard configuration not found');
	}
	if(dev.configuration !== dev.configurations[cfgI]){
		await dev.selectConfiguration(cfgI);
	}
	await dev.claimInterface(ifcI);
	await dev.selectAlternateInterface(ifcI, altI);

	const result = await dev.controlTransferIn({
		requestType: 'standard',
		recipient: 'interface',
		request: GET_DESCRIPTOR,
		value: HID_REPORT_DESCRIPTOR,
		index: ifcI
	}, 255);
	if(!result || result.status !== "ok" || result.data === undefined){
		dev.close();
		throw new Error('Failed to retrieve HID report descriptor');
	}
	const desc = result.data;
	if(desc.byteLength < 8){
		dev.close();
		throw new Error('Invalid HID report descriptor');
	}
	if(desc.getUint16(0) != 0x0501 || desc.getUint16(2) != 0x0906 || desc.getUint16(4) != 0xA101){
		dev.close();
		throw new Error('Invalid HID report descriptor');
	}

	//TODO actually evaluate the keyboard hid descriptor here...

	const alt = dev.configuration!.interfaces[ifcI].alternates[altI];
	const inEndpoint = alt.endpoints.find(e => e.direction === 'in');
	if (!inEndpoint) {
		throw new Error('No IN endpoint found for keyboard');
	}
	return {
		indexes: [cfgI, ifcI, altI, inEndpoint.endpointNumber],
		hidReport: desc
	};
}

export class HidDev implements SingleEvent<ParsedReportData>, Disposable{
	private _usb!: WebUSBDevice;
	private _cfg: HidDevCfg['indexes'] | null = null;
	private _parser!: HidParser;
	public get id(): DeviceIdentifier{
		return {
			vendor: this._usb.vendorId,
			product: this._usb.productId,
			serial: this._usb.serialNumber
		}
	}

	public get subscribe(){
		return this._dataEvt.pub.subscribe;
	}
	private _dataEvt = createSingleEvent<ParsedReportData>();

	private async _init(id: DeviceIdentifier){
		const dev = await webusb.requestDevice({
			filters: [{
				vendorId: id.vendor,
				productId: id.product,
				serialNumber: id.serial,
			}]
		}) as WebUSBDevice;
		this._usb = dev;
		const {indexes, hidReport} = await initKeyboardDev(dev);
		this._cfg = indexes;
		this._parser = new HidParser(hidReport);
		this._pollKeyboard();
	}

	private _pollIval = 50;
	private _run = true;
	public stop(){
		this._run = false;
	}
	public resume(){
		this._run = true;
		this._pollKeyboard();
	}

	private async _pollKeyboard(){
		const [cfgI, ifcI, altI, inEndI] = this._cfg!;
		try {
			const result = await this._usb.transferIn(inEndI, 8); // 8 bytes for keyboard report
			if (result.data) {
				this._handleHidData(result.data);
			}
		} catch (err) {
			console.error('Polling error:', err);
		}
		if(this._run){
			setTimeout(this._pollKeyboard.bind(this), this._pollIval);
		}
	}

	private _handleHidData(data: DataView<ArrayBufferLike>){
		// TODO check if complex parsing is worth it or if we just can assume first byte is modifiers, 1b reserved and rest is keycodes
		//if(new Uint8Array(data.buffer).some(b => b > 0)){
		//	console.log(data.buffer);
		//}
		const parsed = this._parser.parseInputReport(data);
		this._dataEvt.emit(parsed);
	}

	public getFields(id: number) {
		return this._parser.getFields(id);
	}

	private constructor(){}
	public static async create(id: DeviceIdentifier){
		const instance = new HidDev();
		await instance._init(id);
		return instance;
	}

	[Symbol.dispose](){
		this.stop();
		this._usb.close();
	}
}
