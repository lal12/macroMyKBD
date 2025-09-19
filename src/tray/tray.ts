import koffi from 'koffi';
import '../lib/ffi-types.js';
import { iconBuf } from './icon.js';

// --- Win32 API Constants ---
const WM_DESTROY = 0x0002;
const WM_COMMAND = 0x0111;
const WM_LBUTTONUP = 0x0202;
const WM_RBUTTONUP = 0x0205;
const WM_CREATE = 0x0001;
const WM_CLOSE = 0x0010;
const WM_APP = 0x8000;
const WM_TRAYICON = WM_APP + 1;
const WM_UNINITMENUPOPUP = 0x0125;

const WS_OVERLAPPEDWINDOW = 0x00CF0000;
const CW_USEDEFAULT = 0x80000000;

const NIM_ADD = 0x00000000;
const NIM_DELETE = 0x00000002;
const NIF_MESSAGE = 0x00000001;
const NIF_ICON = 0x00000002;
const NIF_TIP = 0x00000004;

const PM_REMOVE = 0x0001;

const MF_STRING = 0x00000000;
const TPM_BOTTOMALIGN = 0x0020;
const TPM_LEFTALIGN = 0x0000;

koffi.struct('POINT', {
	x: 'long',
	y: 'long'
});
koffi.proto('LRESULT WNDPROC(HWND, uint, WPARAM, LPARAM)');
koffi.struct('WNDCLASSW', {
	style: 'uint',
	lpfnWndProc: 'WNDPROC*', // Callback pointer
	cbClsExtra: 'int',
	cbWndExtra: 'int',
	hInstance: 'HINSTANCE',
	hIcon: 'HICON',
	hCursor: 'HCURSOR',
	hbrBackground: 'HBRUSH',
	lpszMenuName: 'LPCWSTR',
	lpszClassName: 'LPCWSTR'
});

const NOTIFYICONDATAW = koffi.struct('NOTIFYICONDATAW', {
	cbSize: 'DWORD',
	hWnd: 'void *',
	uID: 'uint',
	uFlags: 'uint',
	uCallbackMessage: 'uint',
	hIcon: 'void *',
	szTip: koffi.array('uint16', 128), // WCHAR szTip[128]
	dwState: 'DWORD',
	dwStateMask: 'DWORD',
	szInfo: koffi.array('uint16', 256),
	uVersion: 'uint',
	szInfoTitle: koffi.array('uint16', 64),
	dwInfoFlags: 'DWORD',
	guidItem: 'void *', // Not used in this example
	hBalloonIcon: 'void *'
});

const user32 = koffi.load('user32.dll');
const RegisterClassW = user32.func('ATOM RegisterClassW(_In_ const WNDCLASSW *lpWndClass)');
const CreateWindowExW = user32.func(`HWND CreateWindowExW(
	_In_ DWORD dwExStyle, _In_ LPCWSTR lpClassName, _In_ LPCWSTR lpWindowName, _In_ DWORD dwStyle, _In_ int X, _In_ int Y,
	_In_ int nWidth, _In_ int nHeight, _In_ HWND hWndParent, _In_ HMENU hMenu, _In_ HINSTANCE hInstance, _In_ LPVOID lpParam
)`);
const PostQuitMessage = user32.func('void PostQuitMessage(_In_ int nExitCode)');
const PostMessageW = user32.func('bool PostMessageW(_In_ HWND hWnd, _In_ uint Msg, _In_ WPARAM wParam, _In_ LPARAM lParam)');
const DefWindowProcW = user32.func('LRESULT DefWindowProcW(_In_ HWND hWnd, _In_ uint Msg, _In_ WPARAM wParam, _In_ LPARAM lParam)');
const DestroyWindow = user32.func('bool DestroyWindow(HWND hWnd)');
const UpdateWindow = user32.func('bool UpdateWindow(HWND hWnd)');
const CreateIconFromResourceEx = user32.func('HICON CreateIconFromResourceEx(_In_ unsigned char* presbits, _In_ DWORD dwResSize, _In_ bool fIcon, _In_ DWORD dwVer,_In_ int cxDesired, _In_ int  cyDesired, _In_ uint Flags)');
const LookupIconIdFromDirectoryEx = user32.func('int LookupIconIdFromDirectoryEx(_In_ unsigned char* presbits, _In_ bool fIcon, _In_ int cxDesired, _In_ int cyDesired, _In_ uint Flags)');
const DestroyIcon = user32.func('bool DestroyIcon(HICON hIcon)');
koffi.disposable('HICON', ic => {console.log('asdasd'); ic ? DestroyIcon(ic) : null});

koffi.struct('MSG', {
	hwnd: 'HWND',
	message: 'uint',
	wParam: 'WPARAM',
	lParam: 'LPARAM',
	time: 'DWORD',
	pt: 'POINT',
	lPrivate: 'DWORD'
});
const PeekMessageW = user32.func('bool PeekMessageW(_Out_ MSG* lpMsg, _In_ HWND hWnd, _In_ uint wMsgFilterMin, _In_ uint wMsgFilterMax, _In_ uint wRemoveMsg)');
const TranslateMessage = user32.func('bool TranslateMessage(const MSG* lpMsg)');
const DispatchMessageW = user32.func('LRESULT DispatchMessageW(const MSG* lpMsg)');

const CreatePopupMenu = user32.func('HMENU* CreatePopupMenu()');
const AppendMenuW = user32.func('bool AppendMenuW(HMENU* hMenu, uint uFlags, uintptr_t uIDNewItem, str16 lpNewItem)');
const GetCursorPos = user32.func('bool GetCursorPos(_Out_ POINT* lpPoint)');
const SetForegroundWindow = user32.func('bool SetForegroundWindow(HWND* hWnd)');
const TrackPopupMenu = user32.func('bool TrackPopupMenu(HMENU* hMenu, uint uFlags, int x, int y, int nReserved, HWND* hWnd, const void * prcRect)');
const DestroyMenu = user32.func('bool DestroyMenu(HMENU* hMenu)');

// kernel32.dll
const kernel32 = koffi.load('kernel32.dll');
const GetLastError = kernel32.func('DWORD GetLastError()');
const GetModuleHandleW = kernel32.func('HMODULE GetModuleHandleW(LPCWSTR lpModuleName)');

// shell32.dll
const shell32 = koffi.load('shell32.dll');
const Shell_NotifyIconW = shell32.func('bool Shell_NotifyIconW(DWORD dwMessage, NOTIFYICONDATAW* lpData)');

const menuEntries = [
	{ title: 'Settings' },
	{ title: 'Exit' },
]

export class TrayIcon implements Disposable {
	private _className = 'NodeKoffiTrayWindowClass';
	private hwnd: any;
	private nid: any = {};

	constructor(private tooltip: string = 'Node.js Tray Icon') {}	
	private _createWindow(){
		const hInstance = GetModuleHandleW(null);
	
		// The Window Procedure (message handler) needs to be a callback Koffi understands.
		const windowProc = koffi.register((hwnd: Buffer, uMsg: number, wParam: number, lParam: number) => {
			switch (uMsg) {
				case WM_CREATE:{
					return 0;
				}
				
				case WM_TRAYICON:
					if(lParam == WM_RBUTTONUP){
						this._showContextMenu(hwnd);
					}
					return 0;
				case WM_COMMAND:
					if(menuEntries[wParam - 1]){
						console.log('menu item clicked:', menuEntries[wParam - 1]);
					}
					return 0;
				case WM_UNINITMENUPOPUP:
					if(this._menu){
						DestroyMenu(this._menu);
						this._menu = null;
					}
					return 0;
				case WM_CLOSE:
					DestroyWindow(hwnd);
					return 0;

				case WM_DESTROY:
					PostQuitMessage(0); // Exit the message loop
					this.hwnd = null;
					return 0;
				default:
					//console.log('unknown window message', uMsg.toString(16), wParam, lParam);
			}
			return DefWindowProcW(hwnd, uMsg, wParam, lParam);
		}, 'WNDPROC*');

		const wc = {
			lpszClassName: this._className,
			hInstance: hInstance,
			lpfnWndProc: windowProc
		};

		const wclass = RegisterClassW(wc);
		if (wclass == 0) {
			throw new Error('Failed to register window class: ' + GetLastError());
		}
		console.log('registered class');

		this.hwnd = CreateWindowExW(
			0,
			this._className,
			'Node.js Tray Window',
			WS_OVERLAPPEDWINDOW,
			CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
			null, null, hInstance, null
		);

		if(!this.hwnd) {
			throw new Error('Failed to create hidden window.');
		}

		console.log('created window', this.hwnd);

		return this.hwnd!;
	}

	private _ival?: NodeJS.Timeout;
	public async create(): Promise<void> {
		this._createWindow();
		if(!UpdateWindow(this.hwnd!)){
			throw new Error('Failed to update window: ' + GetLastError());
		}

		this.nid.cbSize = koffi.sizeof(NOTIFYICONDATAW);
		this.nid.hWnd = this.hwnd;
		this.nid.uID = 100;
		this.nid.uFlags = NIF_MESSAGE | NIF_ICON;
		this.nid.uCallbackMessage = WM_TRAYICON;
		const offset = LookupIconIdFromDirectoryEx(iconBuf, true, 0, 0, 0);
		if(offset <= 0){
			throw new Error('Failed to lookup icon: ' + GetLastError());
		}
		const iconSub = iconBuf.subarray(offset);
		this.nid.hIcon = CreateIconFromResourceEx(iconSub, iconSub.length, true, 0x00030000, 0, 0, 0);
		if(!this.nid.hIcon){
			throw new Error('Failed to create icon: ' + GetLastError());
		}
		if(!Shell_NotifyIconW(NIM_ADD, this.nid)){
			throw new Error('Failed to add tray icon');
		}
		this._ival = setInterval(() => {
			const msg = {} as any;
			if(PeekMessageW(msg, this.hwnd, 0, 0, PM_REMOVE)){
				// TODO: calling those does not seem to be necessary?
				TranslateMessage(msg);
				DispatchMessageW(msg);
			}
		}, 50);
	}

	[Symbol.dispose](): void {
		this.destroy();
	}

	public destroy(): void {
		if (this.hwnd) {
			DestroyWindow(this.hwnd);
			this.hwnd = null;
		}
		if(this._ival){
			this._ival.close();
			this._ival = undefined;
		}
		if(this._menu){
			DestroyMenu(this._menu);
			this._menu = null;
		}
	}

	private _menu: any;
	private _showContextMenu(hwnd: Buffer): void {
		if(this._menu){ // destroy old menu
			DestroyMenu(this._menu);
			this._menu = null;
		}
		this._menu = CreatePopupMenu();
		if(!this._menu){
			throw new Error('Failed to create popup menu: ' + GetLastError());
		}
		for(let i = 0; i < menuEntries.length; i++){
			AppendMenuW(this._menu, MF_STRING, i + 1, menuEntries[i]!.title);
		}

		const pt = {x: 0, y: 0};
		if(!GetCursorPos(pt)){
			throw new Error('Failed to get cursor position: ' + GetLastError());
		}
		console.log('cursor pos', pt);
		
		if(!SetForegroundWindow(hwnd)){
			throw new Error('Failed to set foreground window: ' + GetLastError());
		}

		if(!TrackPopupMenu(
			this._menu,
			TPM_BOTTOMALIGN | TPM_LEFTALIGN,
			pt.x,
			pt.y,
			0,
			hwnd,
			null
		)){
			throw new Error('Failed to track popup menu: ' + GetLastError());
		}
		PostMessageW(hwnd, 0, 0, 0);
	}
}
