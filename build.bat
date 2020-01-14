rmdir /S /Q dist
del release.zip

mkdir dist
copy package.json dist
copy actions.yml dist
copy start.bat dist
copy LICENSE.txt dist
copy README.md dist

robocopy node-getkeystatebyscancode dist\node-getkeystatebyscancode /E

cd server
call tsc
cd ..\ui
call tsc
cd ..\dist

@echo off
    setlocal enableextensions disabledelayedexpansion
    set "search=file:hid-handler"
    set "replace=file:../hid-handler"
    set "textFile=package.json"
    for /f "delims=" %%i in ('type "%textFile%" ^& break ^> "%textFile%" ') do (
        set "line=%%i"
        setlocal enabledelayedexpansion
        >>"%textFile%" echo(!line:%search%=%replace%!
        endlocal
    )

call npm install --dev
call npm prune --production

del package.json
del package-lock.json
cd ..

powershell.exe -nologo -noprofile -command "& { Add-Type -A 'System.IO.Compression.FileSystem'; [IO.Compression.ZipFile]::CreateFromDirectory('dist', 'release.zip'); }"
