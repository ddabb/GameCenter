@echo off
chcp 65001 >nul
taskkill /f /im "微信开发者工具.exe" 2>nul
taskkill /f /im "WeChatDeveloperTools.exe" 2>nul
echo IDE closed
