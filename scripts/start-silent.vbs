' ========================================================
' FilePe Print Station - Silent Background Launcher
' Runs the print station without opening a command window.
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
bridgeScript = scriptDir & "\pos-print-bridge.js"

WshShell.Run "node """ & bridgeScript & """", 0, False
Set WshShell = Nothing
Set fso = Nothing

