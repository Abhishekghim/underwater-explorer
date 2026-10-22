@echo off
title Underwater Explorer - AI Asset Studio
cd /d "%~dp0"
start "" "%APPDATA%\uv\tools\withoutbg\Scripts\pythonw.exe" "scripts\bg_remover_gui.py"
exit

