# macroMyKBD

macroMyKBD is a tool, which enables you too add macro functionality to your keyboard on Windows (7, 8 & 10). 
It supports multiple keyboards, each keyboard can have its own macros assigned.

It uses the libusb/winusb driver + library to directly access the USB protocol, which gives it full control over the device, 
therefore Windows cannot access it at as a keyboard anymore. 
Unfortunately every keyboard of the same vendor and model will now use winusb instead of its normal keyboard driver, 
so your normal keyboard may not be the same model as the one you use for macros.
Since it possible to passthrough either a specific or unconfigured keystroke, in theory it is possible to also use this software with your main keyboard, however this hasn't been thorougly tested, so it is not recommend at this time.

So who needs this software then? Every PC power user who wishes to use a second keyboard as a board for "special function" keys.

**!!!This software is currently only in alpha stage, still many features are missing, and it has not been thoroughly tested!!!**

A macro (in context of this document) is an action deployed on a keystroke. 
Currently this can only be a batch command, however support for custom scripting with javascript is planned.

## Installation & Setup

1. Install NodeJS **v10**: Download it [here](https://nodejs.org/en/download/). Afterwards just install it, the installer should be self explanatory.
2. Install macroMyKBD: Download the newest release from the [Release Page](http://github.com/lal12/macromykbd/releases) and unzip it whereever you like. For the next step open the folder containing the unzipped files.
3. Download [Zadig](https://zadig.akeo.ie/) and execute it.
    - a. Plugin the keyboard you wish to configure, if it isn't already configured.
    - b. Click on Options->List All Devices
    - c. Choose your keyboard from the dropdown menu. If you are not sure which one is the right one, try to unplug it an see which one disappears.
    - d. Use the small arrows, to change the driver to be installed, you have to use `WinUSB`.
    - e. Click on install driver. 
    - f. The first field next to `USB ID` is the vendor ID, the second one the product ID. You will need them when configuring, so write them down or just keep Zadig open.
4. Now you should start to configure your actions: See section [action.yml](#action.yml) for more info on that. 
5. Check if the `action.yml` works fine, by executing the `start.bat`, if no errors occur the config file is fine. Now you can test if it works as intended.
6. Usually you want macroMyKBD to start when the system starts. There are several ways to do this, and there are plenty tutorials for this online. The easiest way is to create a shortcut to `start.bat` in the autostart folder.

## action.yml

The action.yml is the file containing the configuration, it is written in a format called YAML. 
How YAML exactly works can be read in many online tutorials, an example file is included.

If macroMyKBD is running, while editing `action.yml`, it needs to be restarted.

The action.yml containes one or multiple devices, each device has a name, a vendor id (`vendor`) and a product id (`prod`).
You can define multiple macros (actions), a macro contains a command (`cmd`) just a string you also could execute on a command prompt.
Each command can have multiple events on which it is executed.

Optionally `passthrough: true` can be specified on a device, this will passthrough all keys pressed. However passthrough is yet experimental, e.g. holding down a letter won't lead to multiple characters being typed in, also some special keys (like volume up/down), might not be working.

### Events

An event has the following settings:
- `device`: Specify either the name of the device as a string or the position (starting with 1) of the device in the `actions.yml` as a number.
- `only`: Specify either `true` for events which should not occur if any other key than configured is pressed, else `false`.
- `keys`: Specify the key codes of the keys the event should occur on. Prepend `[` and append `]`, in between write the key codes, seperated by comma. The keycodes will be printed out, if macroMyKBD is started and you press it on you keyboard.
- `on`: Specify the timing an event should occur: `up`, `down` or `press`. More details below:

A **key down** (`down`) event happens everytime a key is pressed down, you can specify keys which need to be pressed. If you want an event to happen on the pressing of `a`, `b` and `ctrl`, it will occur as soon as the last of thoose keys is pressed down, no matter which keys might be pressed else or have been pressed in between of pressing `a`,`b` and `ctrl`. The order also does not matter. It is planned to add more options like "only in that order".

A **key up** (`up`) events happens everytime a key is released. If you specify multiple keys, the event will occur if the first of the configured keys is released. Everything else is the same as in the key down event.

A **key press** (`press`) event does occur every time the keyboard is sending data. The events occurs as soon as the specified keys are pressed, and will repeat while all conditions are met.

## Console output

macroMyKBD will write some messages to the terminal window:
- `up [ x ]`, will be printed any time a key is released `xxx` represents the key code.
- `down [ x ]`, same as above for pressing down a key.
- `Running `..., is printed when a macro is executed.
- `WARN - index:56 `..., can be ignored and will be removed at a later time.


## TODO
- GUI
    - Manage actions and events
    - Manage Devices
- Add a toolbar icon
- Script actions
- ordered key events
- install driver automatically, so the manual driver installation via zadig isn't needed anymore
- install as a service by itself, also start in background
- device differentiation by serial number
- Bundling for lesser files
