/// <reference types="node" />

import { Device } from "usb";

type IfaceType = 'generic'|'keyboard'|'numpad'|'mouse'|'touchpad'|'presenter';

interface SupportedDevice{
	vendorId: number; productId: number; type: IfaceType|{[iface: number]: IfaceType}, name?: string
}

interface Options{
	supportedDevices: SupportedDevice|Array<SupportedDevice>; 
	keyLayouts?: LayoutConfig;
}

interface EventHandlerClass{
	toString?(): string;
	parseData(): void;
	emit(sources: string[]): void;
}

interface LayoutConfig{
	baseDir: string;
	layouts: any;
}

interface BaseEvent{
	ifaceIndex: number;
	inEndpointIndex: number;
	deviceType:{
		value: IfaceType
	},
	hid:{
		deviceKey: {
			vendorId: string;
			productId: string;
			toString(): string;
		};
		device: Device;
		ee: NodeJS.EventEmitter;
	},
	data: Buffer;
}

interface KBDEvent extends BaseEvent{
	modifiers: string[];
	padding: number;
	scancodes: number[];
	keycodes: string[];
}

export function init(opt: Options): void; 
export function isStarted(): boolean;
	/**
	 * Starts hid handler and returns a promise.
	 * If init(opt) was not called before, start() will call it if.
	 * Warning : all handled devices will be detached from the kernel and reattached to it when stop() is called
	 * @param opts options
	 */
export function start(opts: Options): Promise<void>;
	/**
	 * Starts hid handler and returns a promise.
	 * Call init(opts) first!
	 * Warning : all handled devices will be detached from the kernel and reattached to it when stop() is called
	 * @param opt options
	 */
export function start(): Promise<void>;
	/**
	 * Starts hid handler and calls the given callback
	 * If init(opts) was not called before, start() will call it.
	 * Warning : all handled devices will be detached from the kernel and reattached to it when stop() is called
	 * @param opts options
	 * @param cb callback
	 */
export function start(opts: Options, cb: ()=>void): void;
	/**
	 * Starts hid handler and calls the given callback
	 * Call init(opts) first!
	 * Warning : all handled devices will be detached from the kernel and reattached to it when stop() is called
	 * @param cb 
	 */
export function start(cb: ()=>void): void;
export function stop(): void;
	/**
	 * Returns supported device matching vendorId and productId, or null if not found.
	 * The supported devices are specified at init() invocation, by default all connected devices are supported.
	 * @param vendorId 
	 * @param productId 
	 */
export function getSupportedDevice(vendorId: number, productId: number): any;
export function getRegisteredDevices(): Array<{deviceKey: string, product: number, manufacturer: number}>;
export function getRegisteredHid(vendorId: number, productId: number): null|any;
export function getRegisteredHidKeys(): Array<any>;
	/**
	 * Registers an event handler class. Useful to add a custom event handler for a device that's not supported.
	 * @param eventHandlerClass 
	 */
export function registerEventHandler(eventHandlerClass: EventHandlerClass): any;
export const keyLayouts: {config: LayoutConfig};
export const util: number;

export function on(event: 'event', cb: (evt: KBDEvent|BaseEvent)=>void): void;
export function on(event: 'move', cb: (evt: BaseEvent)=>void): void;
export function on(event: 'key', cb: (evt: KBDEvent)=>void): void;
export function on(event: 'wheel', cb: (evt: BaseEvent)=>void): void;
export function on(event: 'click', cb: (evt: BaseEvent)=>void): void;
export function on(event: string, cb: (evt: BaseEvent)=>void): void;
