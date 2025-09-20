export interface DeviceIdentifier{
	vendor: number;
	product: number;
	serial?: string;
}

export type KeyboardIdentifier = DeviceIdentifier;

export interface KeyboardConf{
	passthrough: boolean;
}

type KeyboardState = Map<number, {since: number}>;

export interface KeyboardEvent{
	ts: number;
	downs: Set<number>;
	pressed: KeyboardState;
	ups: Set<number>;
}
