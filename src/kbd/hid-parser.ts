// Define interfaces for a structured representation of the parsed descriptor.
export interface HidReportField {
	usagePage: number;
	usage: number[];
	logicalMin: number;
	logicalMax: number;
	reportSize: number;
	reportCount: number;
	reportId?: number;
	type: 'Input' | 'Output' | 'Feature';
	flags: {
		dataOrConstant: 'Data' | 'Constant';
		arrayOrVariable: 'Array' | 'Variable';
		absoluteOrRelative: 'Absolute' | 'Relative';
	};
}

interface HidCollection {
	usagePage: number;
	usage: number;
	type: 'Application' | 'Physical' | 'Logical';
	children: (HidReportField | HidCollection)[];
	reportId?: number;
}

type ParsedHidDescriptor = HidCollection[];

// Interface for the parsed data from an input report
export interface ParsedReportData {
	reportId?: number;
	/*fields: {
		usagePage: number;
		usage: number;
		value: number;
		parsedValue: number | boolean;
	}[];*/
	inputs: number[];
}

interface HidGlobalState {
	usagePage: number;
	logicalMin: number;
	logicalMax: number;
	physicalMin: number;
	physicalMax: number;
	unitExponent: number;
	unit: number;
	reportSize: number;
	reportId: number;
	reportCount: number;
}

interface HidLocalState {
	usages: number[];
	usageMin: number;
	usageMax: number;
}

export class HidParser {
	private descriptorView: DataView;
	private offset: number = 0;
	private inputFieldsByReportId: Map<number, HidReportField[]> = new Map();

	public getFields(reportId: number){
		return this.inputFieldsByReportId.get(reportId) || [];
	}

	// Global items state (persists across main items)
	private globalStateStack: HidGlobalState[] = [];
	private globals!: HidGlobalState; // Initialized in constructor via resetGlobals

	// Local items state (reset after each main item)
	private locals!: HidLocalState; // Initialized in constructor via resetLocals

	constructor(descriptor: DataView<ArrayBufferLike>) {
		this.descriptorView = descriptor;
		this.resetGlobals();
		this.resetLocals();
		this.parseDescriptor();
	}

	private resetGlobals(): void {
		this.globals = {
			usagePage: 0, logicalMin: 0, logicalMax: 0,
			physicalMin: 0, physicalMax: 0, unitExponent: 0,
			unit: 0, reportSize: 0, reportId: 0, reportCount: 0,
		};
	}

	private resetLocals(): void {
		this.locals = { usages: [], usageMin: 0, usageMax: 0 };
	}

	private pushGlobalState(): void {
		this.globalStateStack.push(JSON.parse(JSON.stringify(this.globals)));
	}

	private popGlobalState(): void {
		if (this.globalStateStack.length > 0) {
			this.globals = this.globalStateStack.pop()!;
		}
	}

	private readItem() {
		if (this.offset >= this.descriptorView.byteLength) return null;

		const prefix = this.descriptorView.getUint8(this.offset++);
		const size = prefix & 0x03; // bits 0-1: size
		const type = (prefix >> 2) & 0x03; // bits 2-3: type
		const tag = prefix & 0xFC; // bits 2-7: tag (top 6 bits)

		let data = 0;
		switch (size) {
			case 0: data = 0; break;
			case 1: data = this.descriptorView.getUint8(this.offset); this.offset += 1; break;
			case 2: data = this.descriptorView.getUint16(this.offset, true); this.offset += 2; break;
			case 3: data = this.descriptorView.getUint32(this.offset, true); this.offset += 4; break;
		}

		if (tag === 0x14 || tag === 0x24) { // Logical Min/Max are signed
			if (size === 1 && (data & 0x80)) data -= 0x100;
			if (size === 2 && (data & 0x8000)) data -= 0x10000;
			if (size === 3 && (data & 0x80000000)) data -= 0x100000000;
		}

		return { tag, type, data };
	}

	/**
	 * Parses the HID descriptor into a structured tree.
	 * This must be called before parsing any report data.
	 */
	private parseDescriptor(): ParsedHidDescriptor {
		const root: ParsedHidDescriptor = [];
		const collectionStack: HidCollection[] = [];
		this.offset = 0; // Reset offset for parsing

		while (this.offset < this.descriptorView.byteLength) {
			const item = this.readItem();
			if (!item) break;

			switch (item.type) {
				case 0: // Main
					switch (item.tag) {
						case 0xA0: // Collection
							const newCollection: HidCollection = {
								usagePage: this.globals.usagePage,
								usage: this.locals.usages.length > 0 ? this.locals.usages[0]! : 0,
								type: this.getCollectionType(item.data),
								children: [],
								reportId: this.globals.reportId
							};
							const parent = collectionStack[collectionStack.length - 1];
							if (parent) parent.children.push(newCollection);
							else root.push(newCollection);
							collectionStack.push(newCollection);
							this.resetLocals();
							break;
						case 0xC0: collectionStack.pop(); break; // End Collection
						case 0x80: // Input
						case 0x90: // Output
						case 0xB0: // Feature
							const field = this.createReportField(item.tag, item.data);
							const currentCollection = collectionStack[collectionStack.length - 1];
							if (currentCollection) currentCollection.children.push(field);

							if (field.type === 'Input') {
								if (!this.inputFieldsByReportId.has(field.reportId || 0)) {
									this.inputFieldsByReportId.set(field.reportId || 0, []);
								}
								this.inputFieldsByReportId.get(field.reportId || 0)!.push(field);
							}
							this.resetLocals();
							break;
					}
					break;
				case 1: // Global
					switch (item.tag) {
						case 0x04: this.globals.usagePage = item.data; break;
						case 0x14: this.globals.logicalMin = item.data; break;
						case 0x24: this.globals.logicalMax = item.data; break;
						case 0x74: this.globals.reportSize = item.data; break;
						case 0x94: this.globals.reportCount = item.data; break;
						case 0x84: this.globals.reportId = item.data; break;
						case 0xA4: this.pushGlobalState(); break;
						case 0xB4: this.popGlobalState(); break;
					}
					break;
				case 2: // Local
					switch (item.tag) {
						case 0x08: this.locals.usages.push(item.data); break;
						case 0x18: this.locals.usageMin = item.data; break;
						case 0x28: this.locals.usageMax = item.data; break;
					}
					break;
			}
		}
		return root;
	}

	/**
	 * Parses raw HID input report data based on the previously parsed descriptor.
	 * @param reportData The raw ArrayBuffer from the HID device.
	 */
	public parseInputReport(reportView: DataView<ArrayBufferLike>): ParsedReportData {
		let reportId = 0;
		let bitOffset = 0;

		// Check if the descriptor uses report IDs. If so, the first byte is the ID.
		if (this.inputFieldsByReportId.size > 1 || !this.inputFieldsByReportId.has(0)) {
			reportId = reportView.getUint8(0);
			bitOffset = 8; // Start reading data from the second byte
		}

		const fieldsToParse = this.inputFieldsByReportId.get(reportId);
		if (!fieldsToParse) {
			throw new Error(`No input report definition found for Report ID: ${reportId}`);
		}

		const parsedData: ParsedReportData = { reportId, /*fields: [],*/ inputs: [] };
		for (const field of fieldsToParse) {
			if (field.flags.dataOrConstant === 'Constant') {
				// Skip constant/padding fields
				bitOffset += field.reportSize * field.reportCount;
				continue;
			}

			for (let i = 0; i < field.reportCount; i++) {
				const value = this.readBits(reportView, bitOffset, field.reportSize);
				if(field.reportSize > 1){
				}
				bitOffset += field.reportSize;
				/*parsedData.fields.push({
					usagePage: field.usagePage,
					usage: field.usage[i],
					value: value,
					parsedValue: (field.logicalMax === 1 && field.logicalMin === 0 && field.reportSize === 1) ? (value === 1): value
				});*/
				parsedData.inputs.push(field.usage.length > 0 ? (value > 0 ? field.usage[i]! : 0) : value);
			}
		}
		return parsedData;
	}

	// Helper to read a specific number of bits from a DataView at a given bit offset.
	private readBits(view: DataView, bitOffset: number, numBits: number): number {
		let value = 0;
		for (let i = 0; i < numBits; i++) {
			const currentBit = bitOffset + i;
			const byteIndex = Math.floor(currentBit / 8);
			const bitIndexInByte = (currentBit % 8); // Read from LSB to MSB
			if (byteIndex < view.byteLength) {
				const byte = view.getUint8(byteIndex);
				if ((byte >> bitIndexInByte) & 1) {
					// Bits are reconstructed in little-endian order within the value
					value |= (1 << i);
				}
			}
		}
		return value;
	}

	private getCollectionType = (data: number): HidCollection['type'] =>
		(data === 0x00) ? 'Physical' : (data === 0x01) ? 'Application' : 'Logical';

	private createReportField(tag: number, data: number): HidReportField {
		const usages: number[] = [];
		if (this.locals.usages.length > 0) usages.push(...this.locals.usages);
		if (this.locals.usageMin && this.locals.usageMax) {
			for (let i = this.locals.usageMin; i <= this.locals.usageMax; i++) usages.push(i);
		}

		return {
			usagePage: this.globals.usagePage,
			usage: usages,
			logicalMin: this.globals.logicalMin,
			logicalMax: this.globals.logicalMax,
			reportSize: this.globals.reportSize,
			reportCount: this.globals.reportCount,
			reportId: this.globals.reportId,
			type: tag === 0x80 ? 'Input' : (tag === 0x90 ? 'Output' : 'Feature'),
			flags: {
				dataOrConstant: (data & 1) ? 'Constant' : 'Data',
				arrayOrVariable: (data & 2) ? 'Variable' : 'Array',
				absoluteOrRelative: (data & 4) ? 'Relative' : 'Absolute',
			}
		};
	}
}
