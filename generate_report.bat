@echo off
REM Retirement Planning Word Document Generator
REM This script generates a comprehensive Word document from exported JSON data

echo ============================================
echo Retirement Planning Document Generator
echo ============================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from python.org
    pause
    exit /b 1
)

REM Check if python-docx is installed
python -c "import docx" >nul 2>&1
if errorlevel 1 (
    echo Installing python-docx...
    pip install python-docx
    if errorlevel 1 (
        echo ERROR: Failed to install python-docx
        pause
        exit /b 1
    )
)

REM Check for input file
if "%~1"=="" (
    echo.
    echo USAGE: generate_report.bat ^<json-file^>
    echo.
    echo Example: generate_report.bat retirement-data-2026-02-06.json
    echo.
    echo This will create: retirement-plan-2026-02-06.docx
    echo.
    pause
    exit /b 1
)

REM Check if input file exists
if not exist "%~1" (
    echo ERROR: File not found: %~1
    pause
    exit /b 1
)

REM Generate output filename
set INPUT=%~1
set OUTPUT=%~n1.docx
set OUTPUT=%OUTPUT:data=plan%

echo.
echo Input:  %INPUT%
echo Output: %OUTPUT%
echo.
echo Generating Word document...
echo.

REM Run the Python script
python scripts\generate_retirement_docx.py "%INPUT%" "%OUTPUT%"

if errorlevel 1 (
    echo.
    echo ERROR: Document generation failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS! Document generated: %OUTPUT%
echo ============================================
echo.
echo Opening document...
start "" "%OUTPUT%"

pause
