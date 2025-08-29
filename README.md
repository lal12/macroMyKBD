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

**v0.2 is currently in development and not compatible with v0.1**

See here for [v0.1](https://github.com/lal12/macroMyKBD/tree/c7ca3ced647493e85fcb48c120f07e45c6c5cac0)

A macro (in context of this document) is an action deployed on a keystroke. 
Currently this can only be a batch command, however support for custom scripting with javascript is planned.

## TODO v0.2
- GUI completion
- Add a toolbar icon
- Script actions
- Repeat keys on passthrough
- install driver automatically, so the manual driver installation via zadig isn't needed anymore
- Bundling for lesser files
