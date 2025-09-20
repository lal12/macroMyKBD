import React from 'react';
import { setConfig, useData } from './ws';
import {
	Button,
	Dialog,
	DialogSurface,
	DialogBody,
	DialogTitle,
	DialogActions,
	Field,
	Input,
	Combobox,
	Option,
	makeStyles,
	shorthands,
	tokens,
	Switch,
	Table,
	TableHeader,
	TableRow,
	TableCell,
	TableHeaderCell,
	TableBody,
} from '@fluentui/react-components';
import type { Data } from '../packets';

const toHex16 = (n: number) => `0x${Math.max(0, Math.min(0xffff, n | 0)).toString(16).toUpperCase().padStart(4, '0')}`;
const parseNum = (val: string) => {
	const s = val.trim();
	if (!s) return NaN;
	if (/^0x/i.test(s)) return parseInt(s, 16);
	return parseInt(s, 10);
};

const useStyles = makeStyles({
	warning: {
		...shorthands.borderRadius(tokens.borderRadiusMedium),
		...shorthands.border('1px', 'solid', tokens.colorStatusWarningBorder2),
		backgroundColor: tokens.colorStatusWarningBackground2,
		color: tokens.colorStatusWarningForeground2,
		...shorthands.padding('8px', '12px'),
		marginTop: '4px',
	},
	warningRow: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: '8px',
	},
	warningIcon: {
		width: '20px',
		height: '20px',
		flex: '0 0 auto',
		color: tokens.colorStatusWarningForeground2,
	},
});

export const KeyboardTab = () => {
	const availKeyboards = useData('avail-kbds');
	const config = useData('config');
	const [editKbd, setEditKbd] = React.useState<null|'new'|Data['avail-kbds'][string]>(null);
	const [selAvailId, setSelAvailId] = React.useState<string | undefined>(undefined);
	const [comboText, setComboText] = React.useState('');
	const [name, setName] = React.useState('');
	const [vendor, setVendor] = React.useState('');
	const [product, setProduct] = React.useState('');
	const [serial, setSerial] = React.useState('');
	const [passthrough, setPassthrough] = React.useState(false);

	const availList = React.useMemo(() => {
		const obj = (availKeyboards || {}) as Record<string, { name: string; vendor: number; product: number; serial?: string }>;
		return Object.entries(obj).map(([id, k]) => ({ id, ...k }));
	}, [availKeyboards]);

	const fillFromAvail = (id?: string) => {
		if (!id) return;
		const found = availList.find(k => k.id === id);
		if (found) {
			setName(found.name || name);
			setVendor(toHex16(found.vendor));
			setProduct(toHex16(found.product));
			setSerial(found.serial || '');
			setComboText(found.name || '');
		}
	};

	const onHexInputChangeEvent = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.currentTarget.value ?? '';
		if (!val) {
			setter('');
			if (selAvailId) {
				setSelAvailId(undefined);
				setComboText('');
			}
			return;
		}
		const n = parseNum(val);
		if (Number.isNaN(n)) {
			setter('');
			if (selAvailId) {
				setSelAvailId(undefined);
				setComboText('');
			}
			return;
		}
		const clamped = Math.max(0, Math.min(0xFFFF, n | 0));
		setter(toHex16(clamped));
		if (selAvailId) {
			setSelAvailId(undefined);
			setComboText('');
		}
	};

	const onSubmit = () => {
		setConfig(cfg => {
			if(editKbd && typeof editKbd === 'object'){
				delete cfg.keyboards[editKbd.name];
			}
			cfg.keyboards[name.trim()] = { 
				id: { vendor: parseNum(vendor), product: parseNum(product), serial: serial.trim() || undefined },
				conf: {
					passthrough
				}
			};
			return cfg;
		});
		setEditKbd(null);
		setSelAvailId(undefined);
		setComboText('');
	};

	const vendorValid = !Number.isNaN(parseNum(vendor));
	const productValid = !Number.isNaN(parseNum(product));

	const keyboards = config ? Object.entries(config.keyboards).map(([name, kbd]) => ({
		name,
		vendor: kbd.id.vendor,
		product: kbd.id.product,
		serial: kbd.id.serial ?? '',
		conf: kbd.conf
	})) : [];

	const styles = useStyles();

	return <div style={{ padding: 24 }}>
		<Button onClick={() => setEditKbd('new')}>Add Keyboard</Button>
		<Table>
			<TableHeader>
				<TableRow>
					<TableHeaderCell>Name</TableHeaderCell>
					<TableHeaderCell>Vendor ID</TableHeaderCell>
					<TableHeaderCell>Product ID</TableHeaderCell>
					<TableHeaderCell>Serial</TableHeaderCell>
					<TableHeaderCell></TableHeaderCell>
					<TableHeaderCell></TableHeaderCell>
				</TableRow>
			</TableHeader>
			<TableBody>{keyboards.map(kbd => 
				<TableRow key={kbd.name}>
					<TableCell>{kbd.name}</TableCell>
					<TableCell>{toHex16(kbd.vendor)}</TableCell>
					<TableCell>{toHex16(kbd.product)}</TableCell>
					<TableCell>{kbd.serial}</TableCell>
					<TableCell>Passthrough {kbd.conf.passthrough ? 'on' : 'off'}</TableCell>
					<TableCell>
						<Button onClick={() => {
							setEditKbd(kbd);
							setName(kbd.name);
							setVendor(toHex16(kbd.vendor));
							setProduct(toHex16(kbd.product));
							setSerial(kbd.serial || '');
							setPassthrough(kbd.conf.passthrough);
						}}>Edit</Button>
						<Button onClick={() => {
							setConfig(cfg => {
								delete cfg.keyboards[kbd.name];
								return cfg;
							})
						}}>Delete</Button>
					</TableCell>
				</TableRow>
			)}</TableBody>
		</Table>

		<Dialog open={editKbd !== null} onOpenChange={e=>setEditKbd(null)}>
			<DialogSurface>
				<DialogBody>
					<DialogTitle>{editKbd === 'new' ? 'Add' : 'Edit'} Keyboard</DialogTitle>
					<div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
						<Field
							label="Name"
							required
							validationState={name.trim() ? undefined : 'error'}
							validationMessage={name.trim() ? undefined : 'Name is required'}
						>
							<Input
								value={name}
								onChange={e => {
									const val = (e.currentTarget as HTMLInputElement).value;
									setName(val);
								}}
								placeholder="My Keyboard"
							/>
						</Field>

						<Field label="Select from available (optional)">
							<Combobox
								value={comboText}
								selectedOptions={selAvailId ? [selAvailId] : []}
								onOptionSelect={(_, data) => {
									const id = data.optionValue || data.optionText;
									setSelAvailId(id);
									fillFromAvail(id);
									setComboText(data.optionText || '');
								}}
								onChange={(data) => {
									setComboText(data.target.value);
									if (selAvailId) {
										setSelAvailId(undefined);
									}
								}}
								placeholder={availList.length ? 'Choose a connected keyboard…' : 'No keyboards detected'}
							>
								{availList.map(k => (
									<Option key={k.id} value={k.id} text={k.name}>
										{k.name} — vendor:{toHex16(k.vendor)} product:{toHex16(k.product)}
										{k.serial ? ` serial:${k.serial}` : ''}
									</Option>
								))}
							</Combobox>
						</Field>
						<Field label="Vendor ID (hex)">
							<Input value={vendor} onChange={onHexInputChangeEvent(setVendor)} placeholder="0x0000 - 0xFFFF" />
						</Field>
						<Field label="Product ID (hex)">
							<Input value={product} onChange={onHexInputChangeEvent(setProduct)} placeholder="0x0000 - 0xFFFF" />
						</Field>
						<Field label="Serial (optional)">
							<Input
								value={serial}
								onChange={e => {
									const val = (e.currentTarget as HTMLInputElement).value;
									setSerial(val);
									if (selAvailId) {
										setSelAvailId(undefined);
										setComboText('');
									}
								}}
								placeholder="Serial number (if applicable)"
							/>
						</Field>
						{!serial.trim() && vendorValid && productValid && (
							<div className={styles.warning}>
								Warning: No serial number specified. The first available keyboard matching the vendor/product IDs will be used.
								<br />
								Unfortunately many inexpensive USB keyboards don’t provide a serial number.
							</div>
						)}
						<Field>
							<Switch checked={passthrough} onChange={e=>setPassthrough(e.target.checked)} label="Passthrough" />
						</Field>
					</div>
					<DialogActions>
						<Button appearance="secondary" onClick={() => setEditKbd(null)}>
							Cancel
						</Button>
						<Button
							appearance="primary"
							onClick={onSubmit}
							disabled={!name.trim() || Number.isNaN(parseNum(vendor)) || Number.isNaN(parseNum(product))}
						>
							{editKbd === 'new' ? 'Add' : 'Save'}
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	</div>;
};
