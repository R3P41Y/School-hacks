:: CMD Bypass By NRFC
:: Github: github.com/Danny0408
color 3

@echo off


:main
echo.
set /p command="%cd%> "
cmd.exe /c %command%
goto main
