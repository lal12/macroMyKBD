import esbuild from 'esbuild';
import CProc from 'child_process';
import FS from 'fs/promises';
import Path from 'path';

async function runCmd(cmd, args, shell = true) {
	return new Promise((resolve, reject) => {
		const proc = CProc.spawn(cmd, args, { shell, stdio: 'inherit' });

		proc.on('close', (code) => {
			if (code !== 0) {
				return reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`));
			}
			resolve({ stdout: '', stderr: '', code });
		});
	});
}

const __dirname = import.meta.url.replace('file:///', '').replace(/\//g, '\\').replace(/\\/g, '/').replace(/\/[^\/]*$/, '');

await runCmd('npm', ['run', 'build-ui']);

const ignoreNode = {
	name: 'ignore-node',
	setup(build) {
		build.onResolve({ filter: /\.node$/ }, args => {
			if(args.path.endsWith('/win32_x64/koffi.node')){
				return {path: './koffi.node', external: true};
			}else if(args.path.match(/usb.node$/)){
				return {path: './usb.node', external: true};
			}
			return {path: args.path, namespace: 'ignore-node',};
		});

		build.onLoad({ filter: /.*/, namespace: 'ignore-node' }, args => {
			return { contents: '', loader: 'empty' };
		});

		build.onLoad({ filter: /node_modules\\usb\\dist\\usb\\bindings.js$/ }, args => {
			return { contents: 'module.exports = require("./usb.node")', loader: 'js' };
		});
	},
};

const res = await esbuild.build({
	entryPoints: ['src/main.ts'],
	bundle: true,
	platform: 'node',
	target: 'node24',
	format: 'cjs',
	outdir: 'dist',
	treeShaking: true,
	minify: false,
	plugins: [ignoreNode],
	define: {
		'_BUNDLE_': 'true'
	}
});

const exePath = __dirname + '/dist/node.exe';
await FS.copyFile(process.execPath, exePath);
await FS.copyFile(Path.join(__dirname, 'node_modules/koffi/build/koffi/win32_x64/koffi.node'), __dirname + '/dist/koffi.node');
await FS.copyFile(Path.join(__dirname, 'node_modules/koffi/build/koffi/win32_x64/koffi.lib'), __dirname + '/dist/koffi.lib');
await FS.copyFile(Path.join(__dirname, 'node_modules/koffi/build/koffi/win32_x64/koffi.exp'), __dirname + '/dist/koffi.exp');
await FS.copyFile(Path.join(__dirname, 'node_modules/usb/prebuilds/win32-x64/node.napi.node'), __dirname + '/dist/usb.node');
await FS.writeFile(__dirname + '/dist/package.json', `{"type": "commonjs"}`);
await FS.writeFile(__dirname + '/dist/start.bat', `@echo off
start node.exe main.js
`);

const version = process.argv[2] || 'dev';
await runCmd('Compress-Archive', ['-Path', __dirname + '/dist/*', '-DestinationPath', __dirname + '/mmkbd-' + version + '.zip'], "powershell.exe");

