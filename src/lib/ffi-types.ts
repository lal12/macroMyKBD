import koffi from 'koffi';

koffi.alias('DWORD', 'uint32');
koffi.alias('WORD', 'uint16');
koffi.alias('ATOM', 'WORD');
koffi.alias('LONG', 'int32');
koffi.alias('ULONG_PTR', 'uint64'); // Pointer-sized unsigned integer
koffi.alias('LPCSTR', 'char*'); // Pointer-sized unsigned integer
if (process.arch === 'ia32') {
	koffi.alias('LONG_PTR', 'long');
	koffi.alias('UINT_PTR', 'uint');
} else if (process.arch === 'x64') {
	koffi.alias('LONG_PTR', 'int64');
	koffi.alias('UINT_PTR', 'int64');
} else {
	throw new Error(`Unsupported architecture: ${process.arch}`);
}

koffi.alias('LRESULT', 'LONG_PTR');
koffi.alias('WPARAM', 'UINT_PTR');
koffi.alias('LPARAM', 'LONG_PTR');
koffi.alias('PVOID', 'void*');
koffi.alias('LPVOID', 'void*');
koffi.alias('HANDLE', 'PVOID');
koffi.alias('HWND', 'HANDLE');
koffi.alias('HINSTANCE', 'HANDLE');
koffi.alias('HMODULE', 'HINSTANCE');
koffi.alias('HICON', 'HANDLE');
koffi.alias('HCURSOR', 'HICON');
koffi.alias('HBRUSH', 'HANDLE');
koffi.alias('WCHAR', 'wchar_t');
koffi.alias('LPCWSTR', 'const WCHAR*');
koffi.alias('HMENU', 'HANDLE');
