import { hid2codes } from "./hid_ps2.js";
import { Keyboard } from "./keyboard.js";
import { KEYEVENTF_EXTENDEDKEY, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, sendinputKbd } from "./sendinput.js";
import type { KbdInput } from "./sendinput.js";

export function createPassthrough(kbd: Keyboard) {
	const off = kbd.keystate.subscribe(evt => {
		const send: KbdInput[] = [];
		const addSend = (k: number, up: boolean) => {
			const vk = hid2codes(k);
			if(!vk || !vk.win){
				console.warn(`No VK mapping found for HID ${k}`);
				return;
			}
			send.push({
				wVk: 0,
				wScan: vk.win,
				dwFlags: KEYEVENTF_SCANCODE | (up ? KEYEVENTF_KEYUP : 0) | ((vk.win & 0xFF00) == 0xE000 ? KEYEVENTF_EXTENDEDKEY : 0),
				time: 0
			});
		}
		for (const k of evt.downs) {
			addSend(k, false);
		}
		for (const k of evt.ups) {
			addSend(k, true);
		}
		if (send.length > 0) {
			sendinputKbd(send);
		}
	});
	return {
		close: () => off()
	}
}
