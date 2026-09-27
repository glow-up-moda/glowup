@echo off
title MAREA - panel local
node "%~dp0panel-local.mjs"
if errorlevel 1 pause
