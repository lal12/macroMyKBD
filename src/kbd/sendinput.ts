import koffi from 'koffi';

const user32 = koffi.load('user32.dll');
const kernel32 = koffi.load('kernel32.dll')

// Define constants from the Windows API
const INPUT_MOUSE = 0;
const INPUT_KEYBOARD = 1;
const INPUT_HARDWARE = 2;

export const KEYEVENTF_KEYUP = 0x0002;
export const KEYEVENTF_UNICODE = 0x0004;
export const KEYEVENTF_SCANCODE = 0x0008;
export const KEYEVENTF_EXTENDEDKEY = 0x0001;

const MOUSEEVENTF_MOVE = 0x0001;
const MOUSEEVENTF_LEFTDOWN = 0x0002;
const MOUSEEVENTF_LEFTUP = 0x0004;
const MOUSEEVENTF_RIGHTDOWN = 0x0008;
const MOUSEEVENTF_RIGHTUP = 0x0010;

const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
	wVk: 'WORD',
	wScan: 'WORD',
	dwFlags: 'DWORD',
	time: 'DWORD',
	dwExtraInfo: 'ULONG_PTR'
});
const INPUT_UNION = koffi.union('INPUT_UNION', {
	mi: koffi.struct({
		dx: 'LONG',
		dy: 'LONG',
		mouseData: 'DWORD',
		dwFlags: 'DWORD',
		time: 'DWORD',
		dwExtraInfo: 'ULONG_PTR'
	}),
	ki: KEYBDINPUT,
	hi: koffi.struct({
		uMsg: 'DWORD',
		wParamL: 'WORD',
		wParamH: 'WORD'
	})
});
const INPUT = koffi.struct('INPUT', {
	type: 'DWORD',
	u: INPUT_UNION
});

const SendInput = user32.func('uint __stdcall SendInput(_In_ uint cInputs, _In_ INPUT* pInputs, _In_ int cbSize)');
const GetLastError = kernel32.func('GetLastError', 'uint', []);

export interface KbdInput {
	wVk: number;
	wScan: number;
	dwFlags: number;
	time: number;
	//dwExtraInfo: number;
}

export function sendinputKbd(kbdInputs: KbdInput[]): void {
	if(kbdInputs.length == 0){
		return;
	}
	const inputs = kbdInputs.map(ki => ({ type: INPUT_KEYBOARD, u: { ki: {...ki, dwExtraInfo: 0} } }));
	const result = SendInput(inputs.length, inputs, koffi.sizeof(INPUT));
	const lastErr = GetLastError();
	if (result !== inputs.length) {
		const lastErr = GetLastError();
		throw new Error("SendInput failed: "+lastErr);
	}
}
